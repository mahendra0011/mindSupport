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

const supportPlans = [
  {
    id: "short-term",
    name: "Short-Term Support",
    duration: "4-8 sessions",
    cadence: "One session every two days",
    bestFor: ["Stress", "Anxiety", "Exam pressure", "Loneliness"],
    summary: "Quick emotional support and guidance",
    multiplier: 3,
  },
  {
    id: "medium-term",
    name: "Medium-Term Support",
    duration: "8-15 sessions",
    cadence: "Weekly or bi-weekly",
    bestFor: ["Mild depression", "Relationship issues", "Emotional healing"],
    summary: "Emotional recovery and personal growth",
    multiplier: 5,
  },
  {
    id: "long-term",
    name: "Long-Term Therapy",
    duration: "3-6+ months",
    cadence: "Weekly or bi-weekly sessions",
    bestFor: ["Trauma", "Severe anxiety", "Chronic depression"],
    summary: "Ongoing therapy and steady progress",
    multiplier: 8,
  },
];

function affordableBasePrice(user) {
  const fallback = user.counsellorType === "mentor" ? 299 : 599;
  const raw = Number(user.sessionPricing) || fallback;
  const lower = user.counsellorType === "mentor" ? 199 : 399;
  const upper = user.counsellorType === "mentor" ? 349 : 599;
  return Math.min(upper, Math.max(lower, raw));
}

function supportPlanPriceKey(planId = "") {
  return {
    "short-term": "shortTerm",
    "medium-term": "mediumTerm",
    "long-term": "longTerm",
  }[planId];
}

function planPriceFor(user, plan) {
  const savedPrice = Number(user.supportPlanPrices?.[supportPlanPriceKey(plan.id)]);
  if (user.hasCustomSupportPlanPrices && Number.isFinite(savedPrice) && savedPrice > 0) return Math.round(savedPrice);
  return Math.max(599, Math.round((affordableBasePrice(user) * plan.multiplier) / 50) * 50 - 1);
}

function paymentSplit(amount) {
  const platformFee = Math.round(Number(amount || 0) * 0.2);
  return {
    platformCommissionRate: 20,
    platformFee,
    counsellorPayout: Math.max(0, Number(amount || 0) - platformFee),
  };
}

function publicCounsellorProfile(user) {
  const basePrice = affordableBasePrice(user);
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    specialization: user.specialization,
    bio: user.bio,
    location: user.location || "India - Online and in-person support",
    education: user.education || (user.counsellorType === "mentor" ? "Peer support training" : "Verified professional qualification"),
    profilePhotoUrl: user.profilePhotoUrl,
    counsellorType: user.counsellorType || "professional",
    badge: user.verificationBadge || badgeForCounsellorType(user.counsellorType),
    experience: user.experience,
    languages: user.languages,
    sessionPricing: basePrice,
    categories: user.categories,
    rating: user.rating,
    reviews: user.reviews,
    responseTime: user.responseTime,
    availability: user.availability,
    unavailableDates: user.unavailableDates || [],
    bookingEnabled: user.bookingEnabled !== false,
    consultationModes: user.consultationModes?.length ? user.consultationModes : ["google-meet", "in-person", "voice-call"],
    supportPlans: supportPlans.map((plan) => ({
      ...plan,
      bookingPrice: planPriceFor(user, plan),
      perSessionPrice: planPriceFor(user, plan),
      priceLabel: "One-time package",
    })),
  };
}

app.get(
  "/api/counsellors",
  asyncRoute(async (_req, res) => {
    const counsellors = await User.find({ role: "counsellor", status: { $in: approvedCounsellorStatuses } }).sort({ name: 1 });
    res.json(counsellors.map(publicCounsellorProfile));
  })
);

app.get(
  "/api/counsellors/:id",
  asyncRoute(async (req, res) => {
    const counsellor = await findCounsellor(req.params.id);
    if (!counsellor) {
      res.status(404).json({ error: "Counsellor not found" });
      return;
    }
    res.json(publicCounsellorProfile(counsellor));
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
    if (counsellor.bookingEnabled === false) {
      res.status(409).json({ error: "This counsellor is not accepting new bookings right now" });
      return;
    }
    const { date, time } = req.body || {};
    if (!date || !time) {
      res.status(400).json({ error: "Date and time are required" });
      return;
    }
    if ((counsellor.unavailableDates || []).includes(date)) {
      res.status(409).json({ error: "This counsellor marked that date unavailable" });
      return;
    }
    const existingBooking = await Appointment.findOne({
      student: student._id,
      counsellor: counsellor._id,
      status: { $in: activeStatuses },
    });
    if (existingBooking) {
      res.status(409).json({ error: "You already have an active booking with this counsellor. Use Session Schedule to manage it." });
      return;
    }
    if (await hasAppointmentConflict(counsellor._id, date, time)) {
      res.status(409).json({ error: "This counsellor already has a session at that time" });
      return;
    }
    const requestedMode = String(req.body?.mode || "google-meet");
    const mode = ["in-person", "online", "google-meet", "voice-call"].includes(requestedMode) ? requestedMode : "google-meet";
    const plan = supportPlans.find((item) => item.id === req.body?.supportPlanId) || supportPlans[0];
    const supportPlanPrice = planPriceFor(counsellor, plan);
    const sharedMeetingLink = mode === "in-person" || mode === "voice-call" ? "" : resolveSharedMeetLink(counsellor.meetLink, buildMeetLink());
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
      supportPlanId: plan.id,
      supportPlanName: plan.name,
      supportPlanDuration: plan.duration,
      supportPlanCadence: plan.cadence,
      supportPlanBestFor: plan.bestFor,
      supportPlanPrice,
      isAnonymous: Boolean(req.body?.isAnonymous),
      anonymousAlias: String(req.body?.anonymousAlias || "Anonymous user").trim().slice(0, 60) || "Anonymous user",
      meetingProvider: mode === "in-person" || mode === "voice-call" ? "" : "google-meet",
      meetingLink: sharedMeetingLink,
    });
    const payment = await Payment.create({
      user: student._id,
      appointment: appointment._id,
      invoiceNumber: `INV-${Date.now().toString().slice(-8)}`,
      amount: supportPlanPrice,
      kind: "session",
      ...paymentSplit(supportPlanPrice),
      plan: `${plan.name} one-time booking`,
      description: `One-time package payment for ${counsellor.name}`,
      status: "pending",
    });
    await createNotification({
      user: counsellor._id,
      type: "booking",
      title: "New counselling request",
      message: `${student.name} requested ${plan.name} on ${date} at ${time}.`,
      metadata: { appointmentId: String(appointment._id) },
    });
    await createNotification({
      user: student._id,
      type: "booking",
      title: "Booking request sent",
      message: `${counsellor.name} will review your ${plan.name} request. One-time package invoice Rs. ${supportPlanPrice} is ready.`,
      metadata: { appointmentId: String(appointment._id), paymentId: String(payment._id) },
    });
    await createNotification({
      audienceRole: "admin",
      type: "booking",
      title: "New session booking",
      message: `${student.email} booked ${counsellor.name} for ${plan.name}.`,
      metadata: { appointmentId: String(appointment._id) },
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
    if ("supportPlanId" in payload) {
      const plan = supportPlans.find((item) => item.id === payload.supportPlanId);
      if (plan) {
        appointment.supportPlanId = plan.id;
        appointment.supportPlanName = plan.name;
        appointment.supportPlanDuration = plan.duration;
        appointment.supportPlanCadence = plan.cadence;
        appointment.supportPlanBestFor = plan.bestFor;
        const pricingCounsellor = await findCounsellor(appointment.counsellor);
        appointment.supportPlanPrice = pricingCounsellor ? planPriceFor(pricingCounsellor, plan) : appointment.supportPlanPrice;
      }
    }
    if ("meetingLink" in payload && req.user.role !== "user") {
      const meetingLink = normalizeMeetLink(payload.meetingLink);
      if (payload.meetingLink && !meetingLink) {
        res.status(400).json({ error: "Use a reusable Google Meet room link, not https://meet.google.com/new." });
        return;
      }
      appointment.meetingLink = meetingLink;
    }
    if (appointment.mode === "in-person" || appointment.mode === "voice-call") {
      appointment.meetingProvider = "";
      appointment.meetingLink = "";
    }
    if (!["in-person", "voice-call"].includes(appointment.mode) && !normalizeMeetLink(appointment.meetingLink)) {
      appointment.meetingProvider = "google-meet";
      appointment.meetingLink = resolveSharedMeetLink(req.user.meetLink, buildMeetLink());
    }
    if (await hasAppointmentConflict(appointment.counsellor, appointment.date, appointment.time, appointment._id)) {
      res.status(409).json({ error: "This counsellor already has a session at that time" });
      return;
    }
    await appointment.save();
    const populated = await appointment.populate("student counsellor");
    await createNotification({
      user: populated.student?._id || appointment.student,
      type: "session",
      title: "Session updated",
      message: `${appointment.counsellorName} updated your session status to ${appointment.status}.`,
      metadata: { appointmentId: String(appointment._id) },
    });
    if (String(populated.counsellor?._id || appointment.counsellor) !== String(req.user._id)) {
      await createNotification({
        user: populated.counsellor?._id || appointment.counsellor,
        type: "session",
        title: "Session updated",
        message: `A session with ${appointment.studentEmail} was updated to ${appointment.status}.`,
        metadata: { appointmentId: String(appointment._id) },
      });
    }
    res.json(normalizeAppointment(populated, req.user));
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
