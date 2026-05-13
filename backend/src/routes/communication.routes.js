export function registerCommunicationRoutes(app, context) {
  const {
    Appointment,
    Assessment,
    CounsellorApplication,
    Journal,
    Message,
    MoodEntry,
    Notification,
    OtpVerification,
    Payment,
    PeerComment,
    PeerPost,
    PeerReport,
    Resource,
    Review,
    User,
    MONGODB_URI,
    activeStatuses,
    approvedCounsellorStatuses,
    asyncRoute,
    authOptional,
    authRequired,
    badgeForCounsellorType,
    bcrypt,
    buildMeetLink,
    canAccessAppointment,
    canMessageUser,
    createNotification,
    crisisRegex,
    findCounsellor,
    findUserByIdentifier,
    generateOtpCode,
    hasAppointmentConflict,
    io,
    isDatabaseReady,
    listFromInput,
    mongoose,
    normalizeRole,
    clampRating,
    normalizeApplication,
    normalizeAppointment,
    normalizeAppointmentsWithReviewStatus,
    normalizeJournal,
    normalizeMessage,
    normalizeNotification,
    normalizePayment,
    normalizeReview,
    publicUser,
    refreshCounsellorRating,
    requireRoles,
    scoreAssessment,
    signToken,
    todayYMD,
  } = context;

app.get(
  "/api/messages",
  asyncRoute(authRequired),
  asyncRoute(async (req, res) => {
    const query = { $or: [{ from: req.user._id }, { to: req.user._id }] };
    if (req.query.peer) {
      const peer = await findUserByIdentifier(req.query.peer);
      if (peer) {
        query.$or = [
          { from: req.user._id, to: peer._id },
          { from: peer._id, to: req.user._id },
        ];
      }
    }
    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(80)
      .populate("from to appointment")
      .populate({ path: "replyTo", populate: { path: "from", select: "name username" } });
    res.json(messages.map((message) => normalizeMessage(message, req.user)));
  })
);

app.post(
  "/api/messages",
  asyncRoute(authRequired),
  asyncRoute(async (req, res) => {
    const recipient = await findUserByIdentifier(req.body?.to);
    if (!recipient) {
      res.status(404).json({ error: "Recipient not found" });
      return;
    }
    if (!(await canMessageUser(req.user, recipient))) {
      res.status(403).json({ error: "You do not have messaging access to this account" });
      return;
    }
    const text = String(req.body?.text || "").trim();
    if (!text) {
      res.status(400).json({ error: "Message text is required" });
      return;
    }
    const appointmentId = req.body?.appointmentId && mongoose.isValidObjectId(req.body.appointmentId) ? req.body.appointmentId : undefined;
    let replyTo = null;
    if (req.body?.replyTo && mongoose.isValidObjectId(req.body.replyTo)) {
      replyTo = await Message.findOne({
        _id: req.body.replyTo,
        $or: [
          { from: req.user._id, to: recipient._id },
          { from: recipient._id, to: req.user._id },
        ],
      });
    }
    const message = await Message.create({
      from: req.user._id,
      to: recipient._id,
      appointment: appointmentId,
      replyTo: replyTo?._id,
      subject: String(req.body?.subject || "Message").trim().slice(0, 100) || "Message",
      text: text.slice(0, 2000),
      fileName: String(req.body?.fileName || "").trim().slice(0, 120),
      fileUrl: String(req.body?.fileUrl || "").trim().slice(0, 500),
      task: String(req.body?.task || "").trim().slice(0, 500),
      readBy: [req.user._id],
    });
    const populatedMessage = await message.populate("from to appointment replyTo");
    io.to(`user:${recipient._id}`).emit("message:new", normalizeMessage(populatedMessage, recipient));
    io.to(`user:${req.user._id}`).emit("message:new", normalizeMessage(populatedMessage, req.user));
    await createNotification({
      user: recipient._id,
      type: "message",
      title: "New secure message",
      message: `${req.user.name} sent: ${message.subject}`,
      metadata: { messageId: String(message._id) },
    });
    res.status(201).json(normalizeMessage(populatedMessage, req.user));
  })
);

app.patch(
  "/api/messages/:id/read",
  asyncRoute(authRequired),
  asyncRoute(async (req, res) => {
    const message = await Message.findOne({ _id: req.params.id, $or: [{ from: req.user._id }, { to: req.user._id }] });
    if (!message) {
      res.status(404).json({ error: "Message not found" });
      return;
    }
    if (!message.readBy.map(String).includes(String(req.user._id))) {
      message.readBy.push(req.user._id);
      await message.save();
    }
    res.json(normalizeMessage(await message.populate("from to appointment replyTo"), req.user));
  })
);

app.patch(
  "/api/messages/:id",
  asyncRoute(authRequired),
  asyncRoute(async (req, res) => {
    const message = await Message.findOne({ _id: req.params.id, from: req.user._id });
    if (!message || message.deletedAt) {
      res.status(404).json({ error: "Message not found" });
      return;
    }
    const text = String(req.body?.text || "").trim();
    if (!text) {
      res.status(400).json({ error: "Message text is required" });
      return;
    }
    message.text = text.slice(0, 2000);
    if ("task" in req.body) message.task = String(req.body.task || "").trim().slice(0, 500);
    message.editedAt = new Date();
    await message.save();
    const fromId = String(message.from);
    const toId = String(message.to);
    const populated = await message.populate("from to appointment replyTo");
    io.to(`user:${toId}`).emit("message:new", normalizeMessage(populated, { _id: toId }));
    io.to(`user:${fromId}`).emit("message:new", normalizeMessage(populated, req.user));
    res.json(normalizeMessage(populated, req.user));
  })
);

app.delete(
  "/api/messages/:id",
  asyncRoute(authRequired),
  asyncRoute(async (req, res) => {
    const message = await Message.findOne({ _id: req.params.id, $or: [{ from: req.user._id }, { to: req.user._id }] });
    if (!message || message.deletedAt) {
      res.status(404).json({ error: "Message not found" });
      return;
    }
    message.deletedAt = new Date();
    message.deletedBy = req.user._id;
    await message.save();
    const fromId = String(message.from);
    const toId = String(message.to);
    const populated = await message.populate("from to appointment replyTo");
    io.to(`user:${toId}`).emit("message:new", normalizeMessage(populated, { _id: toId }));
    io.to(`user:${fromId}`).emit("message:new", normalizeMessage(populated, { _id: fromId }));
    res.json(normalizeMessage(populated, req.user));
  })
);

app.post(
  "/api/messages/:id/reactions",
  asyncRoute(authRequired),
  asyncRoute(async (req, res) => {
    const emoji = String(req.body?.emoji || "").trim().slice(0, 16);
    if (!emoji) {
      res.status(400).json({ error: "Reaction emoji is required" });
      return;
    }
    const message = await Message.findOne({ _id: req.params.id, $or: [{ from: req.user._id }, { to: req.user._id }] });
    if (!message || message.deletedAt) {
      res.status(404).json({ error: "Message not found" });
      return;
    }
    const existingIndex = (message.reactions || []).findIndex((reaction) => String(reaction.user) === String(req.user._id) && reaction.emoji === emoji);
    if (existingIndex >= 0) {
      message.reactions.splice(existingIndex, 1);
    } else {
      message.reactions.push({ user: req.user._id, emoji });
    }
    await message.save();
    const fromId = String(message.from);
    const toId = String(message.to);
    const populated = await message.populate("from to appointment replyTo");
    io.to(`user:${toId}`).emit("message:new", normalizeMessage(populated, { _id: toId }));
    io.to(`user:${fromId}`).emit("message:new", normalizeMessage(populated, { _id: fromId }));
    res.json(normalizeMessage(populated, req.user));
  })
);
}
