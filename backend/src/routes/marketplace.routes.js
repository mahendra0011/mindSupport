export function registerMarketplaceRoutes(app, context) {
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
  "/api/counsellors",
  asyncRoute(async (_req, res) => {
    const counsellors = await User.find({ role: "counsellor", status: { $in: approvedCounsellorStatuses } }).sort({ name: 1 });
    res.json(
      counsellors.map((user) => ({
        id: String(user._id),
        name: user.name,
        email: user.email,
        specialization: user.specialization,
        bio: user.bio,
        counsellorType: user.counsellorType || "professional",
        badge: user.verificationBadge || badgeForCounsellorType(user.counsellorType),
        experience: user.experience,
        languages: user.languages,
        sessionPricing: user.sessionPricing,
        categories: user.categories,
        rating: user.rating,
        reviews: user.reviews,
        responseTime: user.responseTime,
        availability: user.availability,
      }))
    );
  })
);

app.get(
  "/api/appointments/my",
  asyncRoute(authRequired),
  asyncRoute(async (req, res) => {
    const filter = req.user.role === "counsellor" ? { counsellor: req.user._id } : { student: req.user._id };
    const appointments = await Appointment.find(filter).sort({ date: 1, time: 1 }).populate("student counsellor");
    res.json(await normalizeAppointmentsWithReviewStatus(appointments, req.user));
  })
);

app.get(
  "/api/appointments/student/:student_id",
  asyncRoute(authRequired),
  asyncRoute(async (req, res) => {
    const studentId = String(req.params.student_id).toLowerCase();
    if (req.user.role === "user" && studentId !== req.user.email && studentId !== String(req.user._id)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const student = mongoose.isValidObjectId(studentId)
      ? await User.findById(studentId)
      : await User.findOne({ email: studentId });
    const query = student ? { student: student._id } : { studentEmail: studentId };
    const appointments = await Appointment.find(query).sort({ date: 1, time: 1 }).populate("student counsellor");
    res.json(await normalizeAppointmentsWithReviewStatus(appointments, req.user));
  })
);

app.get(
  "/api/appointments/counsellor/:counsellor_id",
  asyncRoute(authRequired),
  asyncRoute(async (req, res) => {
    const counsellorId = req.params.counsellor_id;
    if (req.user.role === "counsellor" && counsellorId !== String(req.user._id) && counsellorId !== req.user.email) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const counsellor = await findCounsellor(counsellorId);
    if (!counsellor) {
      res.status(404).json({ error: "Counsellor not found" });
      return;
    }
    const appointments = await Appointment.find({ counsellor: counsellor._id }).sort({ date: 1, time: 1 }).populate("student counsellor");
    res.json(await normalizeAppointmentsWithReviewStatus(appointments, req.user));
  })
);

app.post(
  "/api/appointments",
  asyncRoute(authRequired),
  requireRoles("user", "admin"),
  asyncRoute(async (req, res) => {
    const student =
      req.user.role === "user"
        ? req.user
        : await User.findOne({ email: String(req.body?.studentEmail || "").toLowerCase(), role: "user" });
    if (!student) {
      res.status(400).json({ error: "Student user not found" });
      return;
    }
    const counsellor = await findCounsellor(req.body?.counsellorId);
    if (!counsellor) {
      res.status(400).json({ error: "No active counsellor is available" });
      return;
    }
    const { date, time } = req.body || {};
    if (!date || !time) {
      res.status(400).json({ error: "Date and time are required" });
      return;
    }
    if (await hasAppointmentConflict(counsellor._id, date, time)) {
      res.status(409).json({ error: "This counsellor already has a session at that time" });
      return;
    }
    const mode = req.body?.mode === "in-person" ? "in-person" : req.body?.mode === "online" ? "online" : "google-meet";
    const appointment = await Appointment.create({
      student: student._id,
      studentEmail: student.email,
      counsellor: counsellor._id,
      counsellorName: counsellor.name,
      date,
      time,
      mode,
      status: "pending",
      concern: req.body?.concern || "",
      isAnonymous: Boolean(req.body?.isAnonymous),
      anonymousAlias: String(req.body?.anonymousAlias || "Anonymous user").trim().slice(0, 60) || "Anonymous user",
      meetingProvider: mode === "in-person" ? "" : "google-meet",
      meetingLink: mode === "in-person" ? "" : counsellor.meetLink || buildMeetLink(),
    });
    res.status(201).json(normalizeAppointment(await appointment.populate("student counsellor"), req.user));
  })
);

app.put(
  "/api/appointments/:id",
  asyncRoute(authRequired),
  asyncRoute(async (req, res) => {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      res.status(404).json({ error: "Appointment not found" });
      return;
    }
    if (!canAccessAppointment(req.user, appointment)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const payload = req.body || {};
    if (req.user.role === "user" && payload.status && payload.status !== "cancelled") {
      res.status(403).json({ error: "Students can only cancel their own session status" });
      return;
    }
    if (payload.counsellorId && req.user.role !== "user") {
      const counsellor = await findCounsellor(payload.counsellorId);
      if (!counsellor) {
        res.status(400).json({ error: "Counsellor not found" });
        return;
      }
      appointment.counsellor = counsellor._id;
      appointment.counsellorName = counsellor.name;
    }
    for (const key of ["date", "time", "mode", "status", "concern", "notes"]) {
      if (key in payload) appointment[key] = payload[key];
    }
    if (appointment.mode !== "in-person" && !appointment.meetingLink) {
      appointment.meetingProvider = "google-meet";
      appointment.meetingLink = req.user.meetLink || buildMeetLink();
    }
    if (await hasAppointmentConflict(appointment.counsellor, appointment.date, appointment.time, appointment._id)) {
      res.status(409).json({ error: "This counsellor already has a session at that time" });
      return;
    }
    await appointment.save();
    res.json(normalizeAppointment(await appointment.populate("student counsellor"), req.user));
  })
);

app.delete(
  "/api/appointments/:id",
  asyncRoute(authRequired),
  asyncRoute(async (req, res) => {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      res.status(404).json({ error: "Appointment not found" });
      return;
    }
    if (!canAccessAppointment(req.user, appointment)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    appointment.status = "cancelled";
    await appointment.save();
    res.json({ success: true, appointment: normalizeAppointment(appointment, req.user) });
  })
);

app.get(
  "/api/reviews/counsellor/:id",
  asyncRoute(async (req, res) => {
    const counsellor = await findCounsellor(req.params.id);
    if (!counsellor) {
      res.status(404).json({ error: "Counsellor not found" });
      return;
    }
    const reviews = await Review.find({ counsellor: counsellor._id, status: "approved" })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("student counsellor appointment");
    res.json(reviews.map((review) => normalizeReview(review, req.user)));
  })
);

app.post(
  "/api/reviews",
  asyncRoute(authRequired),
  requireRoles("user"),
  asyncRoute(async (req, res) => {
    const appointment = await Appointment.findById(req.body?.appointmentId).populate("student counsellor");
    if (!appointment) {
      res.status(404).json({ error: "Appointment not found" });
      return;
    }
    if (String(appointment.student?._id || appointment.student) !== String(req.user._id)) {
      res.status(403).json({ error: "You can only review your own session" });
      return;
    }
    if (appointment.status !== "completed") {
      res.status(400).json({ error: "Reviews are available after a session is marked completed" });
      return;
    }
    const exists = await Review.findOne({ appointment: appointment._id, student: req.user._id });
    if (exists) {
      res.status(409).json({ error: "You already reviewed this session" });
      return;
    }
    const professionalism = clampRating(req.body?.professionalism);
    const helpfulness = clampRating(req.body?.helpfulness);
    const communication = clampRating(req.body?.communication);
    const averageRating = Number(((professionalism + helpfulness + communication) / 3).toFixed(1));
    const comment = String(req.body?.comment || "").trim().slice(0, 1000);
    const status = averageRating <= 2 || /\b(abuse|abusive|threat|harass|unsafe|scam|fake)\b/i.test(comment) ? "flagged" : "approved";
    const review = await Review.create({
      appointment: appointment._id,
      student: req.user._id,
      counsellor: appointment.counsellor?._id || appointment.counsellor,
      professionalism,
      helpfulness,
      communication,
      averageRating,
      comment,
      anonymous: req.body?.anonymous !== false,
      status,
    });
    await refreshCounsellorRating(review.counsellor);
    res.status(201).json(normalizeReview(await review.populate("student counsellor appointment"), req.user));
  })
);
}
