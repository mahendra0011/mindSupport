export function registerAdminRoutes(app, context) {
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

app.post(
  "/api/admin/notifications",
  asyncRoute(authRequired),
  requireRoles("admin"),
  asyncRoute(async (req, res) => {
    const message = String(req.body?.message || "").trim();
    if (!message) {
      res.status(400).json({ error: "Announcement message is required" });
      return;
    }
    const audienceRole = ["user", "counsellor", "admin", "all"].includes(req.body?.audienceRole) ? req.body.audienceRole : "all";
    const notification = await createNotification({
      audienceRole,
      type: "announcement",
      title: String(req.body?.title || "MindSupport announcement").trim(),
      message,
    });
    res.status(201).json(normalizeNotification(notification));
  })
);

app.get(
  "/api/admin/dashboard",
  asyncRoute(authRequired),
  requireRoles("admin"),
  asyncRoute(async (req, res) => {
    const [
      roleAgg,
      statusAgg,
      appointmentAgg,
      modeAgg,
      openReports,
      resources,
      recentUsers,
      counsellors,
      totalSessions,
      activeCounsellors,
      counsellorApplications,
      pendingApplications,
      reviews,
      lowRatedCounsellors,
    ] =
      await Promise.all([
        User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
        User.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
        Appointment.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
        Appointment.aggregate([{ $group: { _id: "$mode", count: { $sum: 1 } } }]),
        PeerReport.countDocuments({ status: { $ne: "closed" } }),
        Resource.countDocuments(),
        User.find().sort({ createdAt: -1 }).limit(8),
        User.find({ role: "counsellor" }).sort({ name: 1 }),
        Appointment.countDocuments(),
        User.countDocuments({ role: "counsellor", status: { $in: approvedCounsellorStatuses } }),
        CounsellorApplication.find().sort({ createdAt: -1 }).limit(20).populate("user", "name email role status"),
        CounsellorApplication.countDocuments({ status: { $in: ["pending", "reviewing"] } }),
        Review.find().sort({ createdAt: -1 }).limit(30).populate("student counsellor appointment"),
        User.find({ role: "counsellor", reviews: { $gte: 1 }, rating: { $lt: 3.5 } }).sort({ rating: 1 }).limit(8),
      ]);
    const toMap = (items) => Object.fromEntries(items.map((item) => [item._id || "unknown", item.count]));
    const usersByRole = toMap(roleAgg);
    res.json({
      stats: {
        usersByRole,
        usersByStatus: toMap(statusAgg),
        appointmentsByStatus: toMap(appointmentAgg),
        appointmentsByMode: toMap(modeAgg),
        openReports,
        resources,
        totalUsers: Object.values(usersByRole).reduce((sum, value) => sum + value, 0),
        activeCounsellors,
        pendingApplications,
        totalSessions,
        revenue: 186400,
        emergencyAlerts: openReports,
        reviewModeration: reviews.filter((review) => review.status === "flagged" || Number(review.averageRating) <= 2).length,
        lowRatedCounsellors: lowRatedCounsellors.length,
      },
      recentUsers: recentUsers.map(publicUser),
      counsellors: counsellors.map(publicUser),
      counsellorApplications: counsellorApplications.map(normalizeApplication),
      lowRatedCounsellors: lowRatedCounsellors.map(publicUser),
      analytics: {
        userGrowth: [
          { month: "Jan", value: 28 },
          { month: "Feb", value: 45 },
          { month: "Mar", value: 63 },
          { month: "Apr", value: 91 },
          { month: "May", value: 124 },
        ],
        sessionTrends: [
          { month: "Jan", value: 18 },
          { month: "Feb", value: 29 },
          { month: "Mar", value: 44 },
          { month: "Apr", value: 58 },
          { month: "May", value: totalSessions || 72 },
        ],
        revenueTrends: [
          { month: "Jan", value: 42000 },
          { month: "Feb", value: 58000 },
          { month: "Mar", value: 73400 },
          { month: "Apr", value: 121000 },
          { month: "May", value: 186400 },
        ],
        demand: [
          { category: "Anxiety", value: 36 },
          { category: "Stress", value: 31 },
          { category: "Depression", value: 18 },
          { category: "Career pressure", value: 15 },
        ],
      },
      revenue: {
        platformRevenue: 186400,
        counsellorPayouts: 112300,
        subscriptionIncome: 74100,
        refundRequests: 3,
      },
      emergency: [
        { id: "SOS-1001", user: "Anonymous user", status: "reviewing", time: "Today 09:30" },
        { id: "CR-8842", user: "Peer support report", status: "open", time: "Yesterday" },
      ],
      reviews: reviews.map((review) => normalizeReview(review, req.user)),
      activityLogs: [
        "Admin login verified with JWT",
        "Counsellor license reviewed",
        "User account activated",
        "System announcement queued",
      ],
      insights: [
        "Review suspended or pending accounts before peak counselling hours.",
        "Keep at least one counsellor available for Google Meet sessions each day.",
        "Open peer reports should be resolved before they age beyond 24 hours.",
      ],
    });
  })
);

app.get(
  "/api/admin/users",
  asyncRoute(authRequired),
  requireRoles("admin"),
  asyncRoute(async (req, res) => {
    const query = {};
    if (req.query.role) query.role = normalizeRole(req.query.role);
    if (req.query.status) query.status = String(req.query.status);
    const users = await User.find(query).sort({ createdAt: -1 });
    res.json(users.map(publicUser));
  })
);

app.post(
  "/api/admin/users",
  asyncRoute(authRequired),
  requireRoles("admin"),
  asyncRoute(async (req, res) => {
    const { name, email, password = "password123", specialization } = req.body || {};
    const role = normalizeRole(req.body?.role);
    if (!["user", "counsellor"].includes(role)) {
      res.status(400).json({ error: "Admin accounts must be created manually outside public/admin forms" });
      return;
    }
    if (!name || !email) {
      res.status(400).json({ error: "Name and email are required" });
      return;
    }
    const status = req.body?.status || (role === "counsellor" ? "approved" : "active");
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email,
      passwordHash,
      role,
      status,
      specialization: role === "counsellor" ? specialization || "General counselling" : "",
      meetLink: role === "counsellor" ? buildMeetLink() : "",
      verificationStatus: role === "counsellor" ? "approved" : "none",
      verificationBadge: role === "counsellor" ? "Verified Professional" : "",
      counsellorType: role === "counsellor" ? "professional" : "",
    });
    res.status(201).json(publicUser(user));
  })
);

app.patch(
  "/api/admin/users/:id",
  asyncRoute(authRequired),
  requireRoles("admin"),
  asyncRoute(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const allowed = [
      "name",
      "status",
      "role",
      "specialization",
      "licenseNumber",
      "bio",
      "meetLink",
      "verificationStatus",
      "verificationBadge",
      "counsellorType",
      "sessionPricing",
      "platformCommission",
      "otpVerified",
    ];
    if ("role" in req.body && normalizeRole(req.body.role) === "admin") {
      res.status(400).json({ error: "Admin role changes must be handled manually" });
      return;
    }
    for (const key of allowed) {
      if (key in req.body) user[key] = key === "role" ? normalizeRole(req.body[key]) : req.body[key];
    }
    if ("availability" in req.body) user.availability = listFromInput(req.body.availability);
    if (req.body?.otpVerified === true && !user.otpVerifiedAt) user.otpVerifiedAt = new Date();
    await user.save();
    res.json(publicUser(user));
  })
);

app.delete(
  "/api/admin/users/:id",
  asyncRoute(authRequired),
  requireRoles("admin"),
  asyncRoute(async (req, res) => {
    if (String(req.user._id) === String(req.params.id)) {
      res.status(400).json({ error: "Admins cannot delete their own active account" });
      return;
    }
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const affectedCounsellors = await Review.distinct("counsellor", {
      $or: [{ student: user._id }, { counsellor: user._id }],
    });
    await Promise.all([
      Journal.deleteMany({ user: user._id }),
      Message.deleteMany({ $or: [{ from: user._id }, { to: user._id }] }),
      Payment.deleteMany({ user: user._id }),
      Notification.deleteMany({ user: user._id }),
      OtpVerification.deleteMany({ user: user._id }),
      CounsellorApplication.deleteMany({ user: user._id }),
      Review.deleteMany({ $or: [{ student: user._id }, { counsellor: user._id }] }),
      Appointment.deleteMany({ $or: [{ student: user._id }, { counsellor: user._id }] }),
    ]);
    await User.findByIdAndDelete(user._id);
    await Promise.all(affectedCounsellors.filter((id) => String(id) !== String(user._id)).map(refreshCounsellorRating));
    res.json({ success: true, deletedUserId: String(user._id) });
  })
);

app.get(
  "/api/admin/counsellor-applications",
  asyncRoute(authRequired),
  requireRoles("admin"),
  asyncRoute(async (_req, res) => {
    const applications = await CounsellorApplication.find().sort({ createdAt: -1 }).populate("user", "name email role status");
    res.json(applications.map(normalizeApplication));
  })
);

app.patch(
  "/api/admin/counsellor-applications/:id",
  asyncRoute(authRequired),
  requireRoles("admin"),
  asyncRoute(async (req, res) => {
    const application = await CounsellorApplication.findById(req.params.id).populate("user");
    if (!application) {
      res.status(404).json({ error: "Application not found" });
      return;
    }
    const nextStatus = ["reviewing", "approved", "rejected"].includes(req.body?.status) ? req.body.status : "reviewing";
    application.status = nextStatus;
    application.adminNotes = String(req.body?.adminNotes || application.adminNotes || "");
    application.reviewedBy = req.user._id;
    application.reviewedAt = new Date();

    const applicant = application.user;
    if (nextStatus === "approved" && applicant) {
      const type = req.body?.requestedType === "professional" ? "professional" : application.requestedType;
      applicant.role = "counsellor";
      applicant.status = "approved";
      applicant.name = application.fullName || applicant.name;
      applicant.bio = application.bio;
      applicant.specialization = application.specialization;
      applicant.experience = application.experience;
      applicant.languages = application.languages;
      applicant.sessionPricing = application.sessionPricing;
      applicant.profilePhotoUrl = application.profilePhotoUrl;
      applicant.certificateLinks = application.certificateLinks;
      applicant.linkedin = application.linkedin;
      applicant.licenseNumber = application.licenseNumber;
      applicant.idVerification = `${application.idDocumentType}: ${application.idDocumentNumber}`;
      applicant.categories = application.categories;
      applicant.availability = application.availability?.length ? application.availability : ["Mon 10:00-13:00", "Wed 14:00-17:00"];
      applicant.counsellorType = type;
      applicant.verificationBadge = badgeForCounsellorType(type);
      applicant.verificationStatus = "approved";
      applicant.meetLink = applicant.meetLink || buildMeetLink();
      applicant.responseTime = type === "professional" ? "Fast Response" : "Within 24 hours";
      applicant.reviews = applicant.reviews || 0;
      await applicant.save();
    }

    if (nextStatus === "rejected" && applicant) {
      applicant.verificationStatus = "rejected";
      if (applicant.role !== "admin") applicant.role = "user";
      if (applicant.status !== "suspended") applicant.status = "active";
      await applicant.save();
    }

    await application.save();
    res.json(normalizeApplication(await application.populate("user", "name email role status")));
  })
);

app.get(
  "/api/admin/appointments",
  asyncRoute(authRequired),
  requireRoles("admin"),
  asyncRoute(async (req, res) => {
    const appointments = await Appointment.find().sort({ date: -1, time: -1 }).populate("student counsellor");
    res.json(await normalizeAppointmentsWithReviewStatus(appointments, req.user));
  })
);

app.get(
  "/api/admin/reviews",
  asyncRoute(authRequired),
  requireRoles("admin"),
  asyncRoute(async (req, res) => {
    const reviews = await Review.find().sort({ createdAt: -1 }).populate("student counsellor appointment");
    res.json(reviews.map((review) => normalizeReview(review, req.user)));
  })
);

app.patch(
  "/api/admin/reviews/:id",
  asyncRoute(authRequired),
  requireRoles("admin"),
  asyncRoute(async (req, res) => {
    const review = await Review.findById(req.params.id).populate("student counsellor appointment");
    if (!review) {
      res.status(404).json({ error: "Review not found" });
      return;
    }
    if (["approved", "flagged", "removed"].includes(req.body?.status)) {
      review.status = req.body.status;
    }
    if ("adminNotes" in (req.body || {})) {
      review.adminNotes = String(req.body.adminNotes || "");
    }
    await review.save();
    await refreshCounsellorRating(review.counsellor?._id || review.counsellor);
    if (req.body?.action === "suspend-counsellor" && review.counsellor) {
      review.counsellor.status = "suspended";
      await review.counsellor.save();
    }
    res.json(normalizeReview(review, req.user));
  })
);
}
