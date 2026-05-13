export function registerCounsellorRoutes(app, context) {
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
    normalizeMeetLink,
    resolveSharedMeetLink,
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
  "/api/counsellor/dashboard",
  asyncRoute(authRequired),
  requireRoles("counsellor"),
  asyncRoute(async (req, res) => {
    const [appointments, approvedReviews, messages, notifications] = await Promise.all([
      Appointment.find({ counsellor: req.user._id }).sort({ date: 1, time: 1 }).populate("student", "name email phone"),
      Review.find({ counsellor: req.user._id, status: "approved" }).sort({ createdAt: -1 }).limit(10).populate("student counsellor appointment"),
      Message.find({ $or: [{ from: req.user._id }, { to: req.user._id }] })
        .sort({ createdAt: -1 })
        .limit(80)
        .populate("from to appointment")
        .populate({ path: "replyTo", populate: { path: "from", select: "name username" } }),
      Notification.find({ $or: [{ user: req.user._id }, { audienceRole: { $in: ["counsellor", "all"] } }] }).sort({ createdAt: -1 }).limit(8),
    ]);
    const today = todayYMD();
    const studentIds = new Set(appointments.map((a) => String(a.student?._id || a.student)));
    const activeAppointments = appointments.filter((a) => activeStatuses.includes(a.status));
    const sessionRevenue = appointments
      .filter((appointment) => appointment.status === "completed")
      .reduce((sum) => sum + (Number(req.user.sessionPricing) || 700), 0);
    const platformFee = Math.round(sessionRevenue * 0.2);
    const counsellorPayout = Math.max(0, sessionRevenue - platformFee);
    res.json({
      profile: publicUser(req.user),
      stats: {
        todaySessions: appointments.filter((a) => a.date === today && activeStatuses.includes(a.status)).length,
        pendingRequests: appointments.filter((a) => a.status === "pending").length,
        activeClients: studentIds.size,
        googleMeetReady: Boolean(resolveSharedMeetLink(req.user.meetLink, buildMeetLink())),
        earnings: counsellorPayout,
        pendingPayouts: counsellorPayout,
        rating: req.user.rating || 4.8,
        unreadMessages: messages.map((message) => normalizeMessage(message, req.user)).filter((message) => message.unread).length,
      },
      appointments: await normalizeAppointmentsWithReviewStatus(appointments, req.user),
      patients: activeAppointments.slice(0, 6).map((appointment, index) => ({
        id: String(appointment.student?._id || appointment.student || index),
        name: normalizeAppointment(appointment, req.user).studentName || "Student",
        email: normalizeAppointment(appointment, req.user).studentEmail,
        therapyHistory: `${Math.max(1, index + 2)} sessions`,
        moodReport: ["Stable", "Needs follow-up", "Improving"][index % 3],
        progress: [72, 58, 84, 66][index % 4],
        risk: ["low", "moderate", "low", "high"][index % 4],
      })),
      progress: [
        { label: "Mood improvement", value: 72 },
        { label: "Anxiety reduction", value: 61 },
        { label: "Session attendance", value: 88 },
        { label: "Recovery progress", value: 68 },
      ],
      messages: messages.map((message) => normalizeMessage(message, req.user)),
      earnings: {
        total: counsellorPayout,
        sessionRevenue,
        platformFees: platformFee,
        pendingPayouts: counsellorPayout,
        platformCommissionRate: 20,
        monthly: [
          { month: "Jan", revenue: 6200, payout: 4960, platformFee: 1240 },
          { month: "Feb", revenue: 8100, payout: 6480, platformFee: 1620 },
          { month: "Mar", revenue: 9300, payout: 7440, platformFee: 1860 },
          { month: "Apr", revenue: 11200, payout: 8960, platformFee: 2240 },
          { month: "May", revenue: sessionRevenue || 13500, payout: counsellorPayout || 10800, platformFee: platformFee || 2700 },
        ],
      },
      reviews: approvedReviews.map((review) => normalizeReview(review, req.user)),
      notifications: notifications.length
        ? notifications.map(normalizeNotification)
        : [
            { title: "Booking queue", message: "New booking requests will appear here." },
            { title: "Meet readiness", message: "Add a reusable Google Meet link before online sessions." },
            { title: "Safety", message: "Emergency alert protocol is active." },
          ],
      actions: [
        "Confirm pending requests",
        "Add a Google Meet link before online sessions",
        "Mark completed sessions after follow-up notes are saved",
      ],
    });
  })
);

app.put(
  "/api/counsellor/availability",
  asyncRoute(authRequired),
  requireRoles("counsellor"),
  asyncRoute(async (req, res) => {
    req.user.availability = Array.isArray(req.body?.availability) ? req.body.availability : req.user.availability;
    if (req.body?.privacySettings) {
      req.user.privacySettings = { ...(req.user.privacySettings?.toObject?.() || req.user.privacySettings || {}), ...req.body.privacySettings };
    }
    if (req.body?.notificationSettings) {
      req.user.notificationSettings = { ...(req.user.notificationSettings?.toObject?.() || req.user.notificationSettings || {}), ...req.body.notificationSettings };
    }
    if (typeof req.body?.meetLink === "string") {
      const meetLink = normalizeMeetLink(req.body.meetLink);
      if (req.body.meetLink.trim() && !meetLink) {
        res.status(400).json({ error: "Paste a reusable Google Meet room link, not https://meet.google.com/new." });
        return;
      }
      req.user.meetLink = meetLink;
    }
    await req.user.save();
    res.json({ user: publicUser(req.user) });
  })
);

app.post(
  "/api/meet/create",
  asyncRoute(authRequired),
  requireRoles("counsellor", "admin"),
  asyncRoute(async (req, res) => {
    const appointment = await Appointment.findById(req.body?.appointmentId);
    if (!appointment) {
      res.status(404).json({ error: "Appointment not found" });
      return;
    }
    if (!canAccessAppointment(req.user, appointment)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const meetingLink = resolveSharedMeetLink(appointment.meetingLink, req.body?.meetingLink, req.user.meetLink, buildMeetLink());
    if (!meetingLink) {
      res.status(400).json({
        error: "Add a real Google Meet room link in Settings first. https://meet.google.com/new creates separate rooms.",
      });
      return;
    }
    appointment.mode = "google-meet";
    appointment.meetingProvider = "google-meet";
    appointment.meetingLink = meetingLink;
    if (appointment.status === "pending") appointment.status = "confirmed";
    await appointment.save();
    res.json({
      appointment: normalizeAppointment(await appointment.populate("student counsellor"), req.user),
      meetingLink: appointment.meetingLink,
      provider: "google-meet",
    });
  })
);
}
