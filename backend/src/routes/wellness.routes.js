export function registerWellnessRoutes(app, context) {
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
  "/api/wellness/profile",
  asyncRoute(authOptional),
  asyncRoute(async (req, res) => {
    res.json({
      user: req.user ? publicUser(req.user) : { id: "guest_user", name: "Guest User" },
      privacy: "Your wellness data is visible only to you and authorized care staff.",
    });
  })
);

app.post(
  "/api/wellness/mood",
  asyncRoute(authOptional),
  asyncRoute(async (req, res) => {
    const mood = Number(req.body?.mood);
    if (mood < 1 || mood > 5) {
      res.status(400).json({ error: "Mood must be between 1 and 5" });
      return;
    }
    const entry = await MoodEntry.create({
      user: req.user?._id,
      userKey: req.user ? undefined : req.body?.user_id || "guest_user",
      mood,
      note: req.body?.note || "",
      date: req.body?.date || todayYMD(),
    });
    res.status(201).json(entry);
  })
);

app.get(
  "/api/wellness/mood",
  asyncRoute(authOptional),
  asyncRoute(async (req, res) => {
    const query = req.user ? { user: req.user._id } : { userKey: req.query.user_id || "guest_user" };
    const entries = await MoodEntry.find(query).sort({ date: 1 }).limit(60);
    res.json(entries);
  })
);

app.post(
  "/api/wellness/assessment",
  asyncRoute(authOptional),
  asyncRoute(async (req, res) => {
    const type = req.body?.type === "gad7" ? "gad7" : "phq9";
    const responses = req.body?.responses || {};
    const result = scoreAssessment(type, responses);
    const assessment = await Assessment.create({
      user: req.user?._id,
      userKey: req.user ? undefined : req.body?.user_id || "guest_user",
      type,
      responses,
      ...result,
    });
    res.status(201).json(assessment);
  })
);

app.get(
  "/api/wellness/assessment",
  asyncRoute(authOptional),
  asyncRoute(async (req, res) => {
    const query = req.user ? { user: req.user._id } : { userKey: req.query.user_id || "guest_user" };
    const assessment = await Assessment.findOne(query).sort({ createdAt: -1 });
    res.json(assessment || null);
  })
);

app.post(
  "/api/wellness/emergency",
  asyncRoute(async (req, res) => {
    res.status(201).json({
      success: true,
      message: "Emergency support request recorded.",
      request: {
        id: new mongoose.Types.ObjectId().toString(),
        type: req.body?.type || "support",
        createdAt: new Date().toISOString(),
      },
      contacts: [
        { label: "India Kiran Mental Health Helpline", value: "1800-599-0019" },
        { label: "Emergency services", value: "Call your local emergency number" },
      ],
    });
  })
);

app.post(
  "/api/wellness/notification",
  asyncRoute(async (req, res) => {
    res.status(201).json({
      success: true,
      notification: {
        id: new mongoose.Types.ObjectId().toString(),
        type: req.body?.type || "reminder",
        message: req.body?.message || "Time for your daily wellness check.",
        delivered: true,
        channel: "in-app",
        timestamp: new Date().toISOString(),
      },
    });
  })
);
}
