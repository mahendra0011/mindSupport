export function registerUserRoutes(app, context) {
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
  "/api/user/dashboard",
  asyncRoute(authRequired),
  requireRoles("user"),
  asyncRoute(async (req, res) => {
    const [appointments, moods, latestAssessment, resources, counsellors, journals, messages, payments, notifications] = await Promise.all([
      Appointment.find({ student: req.user._id }).sort({ date: 1, time: 1 }).populate("counsellor", "name email specialization"),
      MoodEntry.find({ user: req.user._id }).sort({ date: -1 }).limit(14),
      Assessment.findOne({ user: req.user._id }).sort({ createdAt: -1 }),
      Resource.find().sort({ createdAt: -1 }).limit(6),
      User.find({ role: "counsellor", status: { $in: approvedCounsellorStatuses } }).sort({ name: 1 }).limit(8),
      Journal.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(8),
      Message.find({ $or: [{ from: req.user._id }, { to: req.user._id }] })
        .sort({ createdAt: -1 })
        .limit(80)
        .populate("from to appointment")
        .populate({ path: "replyTo", populate: { path: "from", select: "name username" } }),
      Payment.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(8),
      Notification.find({ $or: [{ user: req.user._id }, { audienceRole: { $in: ["user", "all"] } }] }).sort({ createdAt: -1 }).limit(8),
    ]);
    const upcoming = appointments.filter((a) => !["cancelled", "completed", "declined"].includes(a.status));
    const today = todayYMD();
    const wellnessStreak = Math.max(3, Math.min(21, moods.length + upcoming.length + 2));
    const bookedCounsellorIds = new Set(
      appointments
        .filter((appointment) => !["cancelled", "declined"].includes(appointment.status))
        .map((appointment) => String(appointment.counsellor?._id || appointment.counsellor || ""))
        .filter(Boolean)
    );
    const normalizedMessages = messages
      .map((message) => normalizeMessage(message, req.user))
      .filter((message) => bookedCounsellorIds.has(message.fromId) || bookedCounsellorIds.has(message.toId));
    const normalizedPayments = payments.map(normalizePayment);
    const chatCounsellors = counsellors.filter((counsellor) => bookedCounsellorIds.has(String(counsellor._id)));
    res.json({
      profile: publicUser(req.user),
      stats: {
        upcomingSessions: upcoming.length,
        completedSessions: appointments.filter((a) => a.status === "completed").length,
        moodEntries: moods.length,
        latestRiskLevel: latestAssessment?.level || "not-started",
        moodScore: moods[0]?.mood || 4,
        wellnessStreak,
        unreadMessages: normalizedMessages.filter((message) => message.unread).length,
        dailyTip: "Take two minutes today to breathe slowly and name one thing you handled well.",
      },
      appointments: await normalizeAppointmentsWithReviewStatus(appointments, req.user),
      moodEntries: moods,
      latestAssessment,
      recommendedResources: resources,
      therapists: chatCounsellors.map((counsellor, index) => ({
        id: String(counsellor._id),
        name: counsellor.name,
        specialization: counsellor.specialization || "General counselling",
        counsellorType: counsellor.counsellorType || "professional",
        badge: counsellor.verificationBadge || badgeForCounsellorType(counsellor.counsellorType),
        profilePhotoUrl: counsellor.profilePhotoUrl || "",
        location: counsellor.location || "India - online and in-person support",
        education: counsellor.education || "",
        bio: counsellor.bio || "",
        consultationModes: counsellor.consultationModes?.length ? counsellor.consultationModes : ["google-meet", "in-person", "voice-call"],
        responseTime: counsellor.responseTime || "Within 24 hours",
        sessionPricing: counsellor.sessionPricing || 0,
        languages: counsellor.languages || [],
        experience: counsellor.experience || "",
        rating: counsellor.rating || [4.9, 4.8, 4.7, 4.9][index % 4],
        reviews: counsellor.reviews || 42 + index * 17,
        availability: counsellor.availability || ["Mon 10:00-14:00", "Wed 12:00-16:00"],
        categories: counsellor.categories?.length
          ? counsellor.categories
          : ["Anxiety", "Depression", "Stress", "PTSD", "Addiction", "Relationship issues", "Career pressure"].slice(index, index + 4),
        nextSlot: `${today} ${index % 2 === 0 ? "15:00" : "17:30"}`,
      })),
      analytics: {
        weeklyMood: [
          { label: "Mon", mood: 3, sleep: 6, anxiety: 5 },
          { label: "Tue", mood: 4, sleep: 7, anxiety: 4 },
          { label: "Wed", mood: 3, sleep: 5, anxiety: 6 },
          { label: "Thu", mood: 4, sleep: 7, anxiety: 3 },
          { label: "Fri", mood: moods[0]?.mood || 4, sleep: 8, anxiety: 3 },
        ],
        emotionalStability: 78,
        therapyProgress: 64,
        sleepQuality: 72,
      },
      journal: journals.map(normalizeJournal),
      habits: [
        { name: "Sleep", value: "7h 20m", progress: 74 },
        { name: "Meditation", value: "4 days", progress: 57 },
        { name: "Exercise", value: "3 sessions", progress: 60 },
        { name: "Hydration", value: "6 glasses", progress: 75 },
      ],
      messages: normalizedMessages,
      notifications: notifications.map(normalizeNotification),
      payments: {
        summary: "One-time counselling package payments only",
        invoices: normalizedPayments.filter((payment) => payment.kind === "session"),
      },
      emergency: {
        sosReady: true,
        helpline: "1800-599-0019",
        contact: req.user.emergencyContactPhone || req.user.phone || "Emergency contact not added",
        contactName: req.user.emergencyContactName || "",
        contactRelation: req.user.emergencyContactRelation || "",
      },
      quickActions: [
        { label: "Find a counsellor", href: "/counselling" },
        { label: "Open wellness resources", href: "/resources" },
        { label: "Track today's mood", href: "/wellness" },
      ],
    });
  })
);

app.get(
  "/api/journals",
  asyncRoute(authRequired),
  requireRoles("user", "admin"),
  asyncRoute(async (req, res) => {
    const userId = req.user.role === "admin" && req.query.userId ? req.query.userId : req.user._id;
    const journals = await Journal.find({ user: userId }).sort({ createdAt: -1 });
    res.json(journals.map(normalizeJournal));
  })
);

app.post(
  "/api/journals",
  asyncRoute(authRequired),
  requireRoles("user"),
  asyncRoute(async (req, res) => {
    const content = String(req.body?.content || "").trim();
    if (!content) {
      res.status(400).json({ error: "Journal content is required" });
      return;
    }
    const sharedWithCounsellor = Boolean(req.body?.sharedWithCounsellor);
    const entry = await Journal.create({
      user: req.user._id,
      title: String(req.body?.title || "Private journal entry").trim().slice(0, 80) || "Private journal entry",
      content,
      mood: String(req.body?.mood || "").trim(),
      gratitude: String(req.body?.gratitude || "").trim(),
      trigger: String(req.body?.trigger || "").trim(),
      sharedWithCounsellor,
      sharedAt: sharedWithCounsellor ? new Date() : undefined,
    });
    if (sharedWithCounsellor) {
      await createNotification({
        audienceRole: "counsellor",
        type: "journal",
        title: "Shared journal entry",
        message: `${req.user.name} shared a journal entry for counsellor review.`,
      });
    }
    res.status(201).json(normalizeJournal(entry));
  })
);

app.patch(
  "/api/journals/:id",
  asyncRoute(authRequired),
  requireRoles("user", "admin"),
  asyncRoute(async (req, res) => {
    const query = req.user.role === "admin" ? { _id: req.params.id } : { _id: req.params.id, user: req.user._id };
    const entry = await Journal.findOne(query);
    if (!entry) {
      res.status(404).json({ error: "Journal entry not found" });
      return;
    }
    if ("sharedWithCounsellor" in (req.body || {})) {
      entry.sharedWithCounsellor = Boolean(req.body.sharedWithCounsellor);
      entry.sharedAt = entry.sharedWithCounsellor ? new Date() : undefined;
    }
    for (const key of ["title", "content", "mood", "gratitude", "trigger"]) {
      if (key in (req.body || {})) entry[key] = String(req.body[key] || "").trim();
    }
    await entry.save();
    res.json(normalizeJournal(entry));
  })
);
}
