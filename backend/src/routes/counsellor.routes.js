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
        .limit(10)
        .populate("from to appointment"),
      Notification.find({ $or: [{ user: req.user._id }, { audienceRole: { $in: ["counsellor", "all"] } }] }).sort({ createdAt: -1 }).limit(8),
    ]);
    const today = todayYMD();
    const studentIds = new Set(appointments.map((a) => String(a.student?._id || a.student)));
    const activeAppointments = appointments.filter((a) => activeStatuses.includes(a.status));
    const sessionRevenue = appointments
      .filter((appointment) => appointment.status === "completed")
      .reduce((sum) => sum + (Number(req.user.sessionPricing) || 700), 0);
    res.json({
      profile: publicUser(req.user),
      stats: {
        todaySessions: appointments.filter((a) => a.date === today && activeStatuses.includes(a.status)).length,
        pendingRequests: appointments.filter((a) => a.status === "pending").length,
        activeClients: studentIds.size,
        googleMeetReady: Boolean(req.user.meetLink || process.env.GOOGLE_MEET_DEFAULT_LINK),
        earnings: sessionRevenue,
        pendingPayouts: Math.round(sessionRevenue * 0.2),
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
        total: sessionRevenue,
        sessionRevenue,
        pendingPayouts: Math.round(sessionRevenue * 0.2),
        monthly: [
          { month: "Jan", revenue: 6200 },
          { month: "Feb", revenue: 8100 },
          { month: "Mar", revenue: 9300 },
          { month: "Apr", revenue: 11200 },
          { month: "May", revenue: sessionRevenue || 13500 },
        ],
      },
      reviews: approvedReviews.map((review) => normalizeReview(review, req.user)),
      notifications: notifications.length
        ? notifications.map((notification) => `${notification.title}: ${notification.message}`)
        : ["New booking request received", "Session reminder in 30 minutes", "Emergency alert protocol updated"],
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
    req.user.meetLink = typeof req.body?.meetLink === "string" ? req.body.meetLink : req.user.meetLink;
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
    appointment.mode = "google-meet";
    appointment.meetingProvider = "google-meet";
    appointment.meetingLink = req.user.meetLink || buildMeetLink();
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
