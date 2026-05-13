export function registerAuthRoutes(app, context) {
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
    MONGODB_DATABASE,
    MONGODB_URI,
    maskMongoUri,
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
    makeUniqueUsername,
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

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "MindSupport Express API",
    database: isDatabaseReady() ? "connected" : "disconnected",
    databaseName: MONGODB_DATABASE,
    mongoUri: maskMongoUri ? maskMongoUri(MONGODB_URI) : MONGODB_URI.replace(/\/\/.*@/, "//***@"),
    timestamp: new Date().toISOString(),
  });
});

app.post(
  "/api/auth/register",
  asyncRoute(async (req, res) => {
    const { name, email, password, phone } = req.body || {};
    const requestedRole = normalizeRole(req.body?.role || req.body?.accountType || "user");
    if (!["user", "counsellor"].includes(requestedRole)) {
      res.status(400).json({ error: "Signup allows only user or counsellor accounts" });
      return;
    }
    if (!name || !email || !password) {
      res.status(400).json({ error: "Name, email and password are required" });
      return;
    }
    if (String(password).length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }
    const requestedUsername = await makeUniqueUsername(req.body?.username || name || email);
    const existing = await User.findOne({ email: String(email).toLowerCase() });
    if (existing) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }
    const requestedType = req.body?.requestedType === "professional" ? "professional" : "mentor";
    const fullName = String(req.body?.fullName || name || "").trim();
    const bio = String(req.body?.bio || "").trim();
    const specialization = String(req.body?.specialization || "").trim();
    const experience = String(req.body?.experience || "").trim();
    const idDocumentNumber = String(req.body?.idDocumentNumber || "").trim();
    if (requestedRole === "counsellor") {
      if (!fullName || !bio || !specialization || !experience || !idDocumentNumber) {
        res.status(400).json({ error: "Counsellor signup requires full name, bio, specialization, experience, and ID verification" });
        return;
      }
      if (requestedType === "professional" && !String(req.body?.licenseNumber || "").trim()) {
        res.status(400).json({ error: "Professional counsellor signup requires a license or registration number" });
        return;
      }
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name: fullName || name,
      username: requestedUsername,
      email,
      passwordHash,
      role: requestedRole,
      status: requestedRole === "counsellor" ? "pending" : "active",
      phone: phone || "",
      specialization: requestedRole === "counsellor" ? specialization : "",
      bio: requestedRole === "counsellor" ? bio : "",
      counsellorType: requestedRole === "counsellor" ? requestedType : "",
      verificationStatus: requestedRole === "counsellor" ? "pending" : "none",
      experience: requestedRole === "counsellor" ? experience : "",
      languages: requestedRole === "counsellor" ? listFromInput(req.body?.languages) : [],
      sessionPricing: requestedRole === "counsellor" ? Number(req.body?.sessionPricing) || 0 : 0,
      profilePhotoUrl: requestedRole === "counsellor" ? String(req.body?.profilePhotoUrl || "").trim() : "",
      certificateLinks: requestedRole === "counsellor" ? listFromInput(req.body?.certificateLinks) : [],
      linkedin: requestedRole === "counsellor" ? String(req.body?.linkedin || "").trim() : "",
      licenseNumber: requestedRole === "counsellor" ? String(req.body?.licenseNumber || "").trim() : "",
      idVerification: requestedRole === "counsellor" ? `${String(req.body?.idDocumentType || "Government ID").trim()}: ${idDocumentNumber}` : "",
      categories: requestedRole === "counsellor" ? listFromInput(req.body?.categories) : [],
      availability: requestedRole === "counsellor" ? listFromInput(req.body?.availability) : [],
    });
    let application = null;
    if (requestedRole === "counsellor") {
      application = await CounsellorApplication.create({
        user: user._id,
        status: "pending",
        requestedType,
        fullName,
        bio,
        specialization,
        experience,
        languages: listFromInput(req.body?.languages),
        sessionPricing: Number(req.body?.sessionPricing) || 0,
        profilePhotoUrl: String(req.body?.profilePhotoUrl || "").trim(),
        certificateLinks: listFromInput(req.body?.certificateLinks),
        linkedin: String(req.body?.linkedin || "").trim(),
        idDocumentType: String(req.body?.idDocumentType || "Government ID").trim(),
        idDocumentNumber,
        licenseNumber: String(req.body?.licenseNumber || "").trim(),
        education: String(req.body?.education || "").trim(),
        categories: listFromInput(req.body?.categories),
        availability: listFromInput(req.body?.availability),
        approach: String(req.body?.approach || "").trim(),
        emergencyTraining: String(req.body?.emergencyTraining || "").trim(),
        referenceContact: String(req.body?.referenceContact || "").trim(),
        verificationNotes: String(req.body?.verificationNotes || "").trim(),
      });
      await createNotification({
        audienceRole: "admin",
        type: "application",
        title: "New counsellor application",
        message: `${fullName} submitted a counsellor verification request.`,
        metadata: { applicationId: String(application._id), userId: String(user._id) },
      });
    }
    res.status(201).json({
      token: signToken(user),
      user: publicUser(user),
      application: normalizeApplication(application),
      approvalPending: requestedRole === "counsellor",
    });
  })
);

app.post(
  "/api/auth/login",
  asyncRoute(async (req, res) => {
    const { email, password } = req.body || {};
    const identifier = String(email || req.body?.username || "").trim().toLowerCase();
    const user = await User.findOne({ $or: [{ email: identifier }, { username: identifier }] });
    if (!user || !(await bcrypt.compare(String(password || ""), user.passwordHash))) {
      res.status(401).json({ error: "Invalid email, username, or password" });
      return;
    }
    if (user.status === "suspended") {
      res.status(403).json({ error: "Account suspended" });
      return;
    }
    user.lastLoginAt = new Date();
    await user.save();
    res.json({ token: signToken(user), user: publicUser(user) });
  })
);

app.get("/api/auth/me", asyncRoute(authRequired), (req, res) => {
  res.json({ user: publicUser(req.user) });
});

app.post(
  "/api/auth/otp/request",
  asyncRoute(authRequired),
  asyncRoute(async (req, res) => {
    const channel = req.body?.channel === "phone" && req.user.phone ? "phone" : "email";
    const destination = channel === "phone" ? req.user.phone : req.user.email;
    const code = generateOtpCode();
    const codeHash = await bcrypt.hash(code, 10);
    await OtpVerification.updateMany({ user: req.user._id, consumedAt: { $exists: false } }, { consumedAt: new Date() });
    await OtpVerification.create({
      user: req.user._id,
      channel,
      destination,
      codeHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    res.status(201).json({
      message: `OTP sent to your ${channel}.`,
      channel,
      destination,
      expiresInMinutes: 10,
      devOtp: process.env.NODE_ENV === "production" ? undefined : code,
    });
  })
);

app.post(
  "/api/auth/otp/verify",
  asyncRoute(authRequired),
  asyncRoute(async (req, res) => {
    const code = String(req.body?.code || "").trim();
    if (!/^\d{6}$/.test(code)) {
      res.status(400).json({ error: "Enter the 6 digit OTP" });
      return;
    }
    const otp = await OtpVerification.findOne({
      user: req.user._id,
      consumedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });
    if (!otp || !(await bcrypt.compare(code, otp.codeHash))) {
      res.status(400).json({ error: "Invalid or expired OTP" });
      return;
    }
    otp.consumedAt = new Date();
    req.user.otpVerified = true;
    req.user.otpVerifiedAt = new Date();
    await Promise.all([otp.save(), req.user.save()]);
    res.json({ user: publicUser(req.user), message: "Account verified with OTP" });
  })
);

app.put(
  "/api/users/me",
  asyncRoute(authRequired),
  asyncRoute(async (req, res) => {
    const allowed = ["name", "phone", "bio", "specialization", "licenseNumber", "availability", "meetLink", "location", "education"];
    for (const key of allowed) {
      if (key in req.body) req.user[key] = req.body[key];
    }
    if ("username" in req.body) {
      const username = String(req.body.username || "").trim().toLowerCase();
      if (!/^[a-z0-9_]{3,24}$/.test(username)) {
        res.status(400).json({ error: "Username must be 3-24 characters using lowercase letters, numbers, or underscore" });
        return;
      }
      const exists = await User.exists({ username, _id: { $ne: req.user._id } });
      if (exists) {
        res.status(409).json({ error: "Username is already taken" });
        return;
      }
      req.user.username = username;
    }
    if ("privacySettings" in req.body) {
      req.user.privacySettings = { ...(req.user.privacySettings?.toObject?.() || req.user.privacySettings || {}), ...(req.body.privacySettings || {}) };
    }
    if ("notificationSettings" in req.body) {
      req.user.notificationSettings = { ...(req.user.notificationSettings?.toObject?.() || req.user.notificationSettings || {}), ...(req.body.notificationSettings || {}) };
    }
    await req.user.save();
    res.json({ user: publicUser(req.user) });
  })
);
}
