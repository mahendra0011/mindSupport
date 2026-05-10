export function registerResourceRoutes(app, context) {
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
  "/api/resources",
  asyncRoute(async (req, res) => {
    const query = {};
    if (req.query.type) query.type = String(req.query.type);
    if (req.query.category) query.category = new RegExp(String(req.query.category), "i");
    if (req.query.language) query.language = new RegExp(String(req.query.language), "i");
    if (req.query.q) {
      const rx = new RegExp(String(req.query.q), "i");
      query.$or = [{ title: rx }, { description: rx }, { tags: rx }, { category: rx }];
    }
    if (req.query.tags) {
      const tags = String(req.query.tags)
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
      if (tags.length) query.tags = { $in: tags.map((tag) => new RegExp(tag, "i")) };
    }
    const duration = {};
    if (req.query.minDur) duration.$gte = Number(req.query.minDur);
    if (req.query.maxDur) duration.$lte = Number(req.query.maxDur);
    if (Object.keys(duration).length) query.durationMin = duration;
    const resources = await Resource.find(query).sort({ createdAt: -1 });
    res.json(resources);
  })
);

app.post(
  "/api/resources",
  asyncRoute(authRequired),
  requireRoles("admin", "counsellor"),
  asyncRoute(async (req, res) => {
    const resource = await Resource.create({
      title: req.body?.title,
      type: req.body?.type || "article",
      category: req.body?.category || "General",
      language: req.body?.language || "English",
      url: req.body?.url,
      description: req.body?.description || "",
      durationMin: Number(req.body?.durationMin || 5),
      tags: Array.isArray(req.body?.tags) ? req.body.tags : [],
      createdBy: req.user._id,
    });
    res.status(201).json(resource);
  })
);

app.get(
  "/api/resources/youtube",
  asyncRoute(async (req, res) => {
    const q = String(req.query.q || "mental health");
    const max = Math.min(Number(req.query.maxResults || 4), 8);
    const videos = [
      {
        id: "yt:breathing",
        title: `Guided breathing for ${q}`,
        type: "video",
        category: "Stress",
        language: "English",
        url: "https://www.youtube.com/watch?v=tEmt1Znux58",
        description: "Curated YouTube breathing support.",
        durationMin: 4,
        tags: ["breathing", "youtube"],
      },
      {
        id: "yt:mindfulness",
        title: `Mindfulness basics for ${q}`,
        type: "video",
        category: "Anxiety",
        language: "English",
        url: "https://www.youtube.com/watch?v=inpok4MKVLM",
        description: "A simple mindfulness practice.",
        durationMin: 10,
        tags: ["mindfulness", "youtube"],
      },
    ];
    res.json(videos.slice(0, max));
  })
);
}
