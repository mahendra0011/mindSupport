import "dotenv/config";
import bcrypt from "bcryptjs";
import cors from "cors";
import express from "express";
import fs from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { CLIENT_ORIGIN, JWT_EXPIRES_IN, JWT_SECRET, MONGODB_URI, PORT } from "./config/env.js";
import { connectDatabase, isDatabaseReady } from "./database/connect.js";
import {
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
  normalizeRole,
} from "./models/index.js";
import { createRealtimeServer } from "./realtime/socket.js";
import { registerRoutes } from "./routes/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = createRealtimeServer(httpServer);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || origin === CLIENT_ORIGIN || process.env.CORS_ORIGIN === "*") {
        callback(null, true);
        return;
      }
      const extra = (process.env.CORS_ORIGIN || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      callback(null, extra.includes(origin));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));

const activeStatuses = ["pending", "confirmed"];
const approvedCounsellorStatuses = ["active", "approved"];

const crisisRegex = /\b(suicide|suicidal|kill myself|self[-\s]?harm|hurt myself|want to die|no way out|ending it all|panic attack|abuse|abused|abusive)\b/i;

function todayYMD() {
  return new Date().toISOString().slice(0, 10);
}

function buildMeetLink() {
  return process.env.GOOGLE_MEET_DEFAULT_LINK?.trim() || "https://meet.google.com/new";
}

function publicUser(user) {
  if (!user) return null;
  const raw = user.toJSON ? user.toJSON() : user;
  delete raw.passwordHash;
  return raw;
}

function listFromInput(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeApplication(application) {
  if (!application) return null;
  const raw = application.toJSON ? application.toJSON() : application;
  const user = raw.user && typeof raw.user === "object" ? raw.user : null;
  return {
    ...raw,
    userId: user?.id || user?._id || raw.user,
    userName: user?.name || "",
    userEmail: user?.email || "",
    userRole: user?.role || "",
    userStatus: user?.status || "",
  };
}

function clampRating(value) {
  const rating = Number(value);
  if (!Number.isFinite(rating)) return 5;
  return Math.min(5, Math.max(1, Math.round(rating)));
}

function badgeForCounsellorType(type) {
  return type === "professional" ? "Verified Professional" : "Community Mentor";
}

function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function signToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function asyncRoute(handler) {
  return async (req, res, next) => {
    if (!isDatabaseReady()) {
      res.status(503).json({
        error: "Database unavailable",
        detail: "MongoDB is not connected. Check MONGODB_URI and start MongoDB.",
      });
      return;
    }
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

async function authOptional(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    next();
    return;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (user && user.status !== "suspended") req.user = user;
  } catch {
    // Optional auth intentionally ignores bad tokens.
  }
  next();
}

async function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user || user.status === "suspended") {
      res.status(401).json({ error: "Invalid or suspended account" });
      return;
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

function requireRoles(...allowed) {
  return (req, res, next) => {
    if (!req.user || !allowed.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    if (req.user.role === "counsellor" && allowed.includes("counsellor") && !approvedCounsellorStatuses.includes(req.user.status)) {
      res.status(403).json({ error: "Counsellor account is pending admin approval" });
      return;
    }
    next();
  };
}

function normalizeAppointment(appointment, viewer) {
  const raw = appointment.toObject ? appointment.toObject({ virtuals: true }) : appointment;
  const student = raw.student && typeof raw.student === "object" ? raw.student : null;
  const counsellor = raw.counsellor && typeof raw.counsellor === "object" ? raw.counsellor : null;
  const hideStudent = raw.isAnonymous && viewer?.role === "counsellor";
  return {
    id: String(raw._id || raw.id),
    studentId: student?.email || raw.studentEmail || String(raw.student || ""),
    studentEmail: hideStudent ? "Hidden by anonymous mode" : raw.studentEmail || student?.email || "",
    studentName: hideStudent ? raw.anonymousAlias || "Anonymous user" : student?.name || "",
    counsellorId: counsellor?._id ? String(counsellor._id) : String(raw.counsellor || ""),
    counsellorName: raw.counsellorName || counsellor?.name || "",
    date: raw.date,
    time: raw.time,
    mode: raw.mode,
    status: raw.status,
    concern: raw.concern || "",
    notes: raw.notes || "",
    isAnonymous: Boolean(raw.isAnonymous),
    anonymousAlias: raw.anonymousAlias || "Anonymous user",
    meetingProvider: raw.meetingProvider || "",
    meetingLink: raw.meetingLink || "",
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

async function normalizeAppointmentsWithReviewStatus(appointments, viewer) {
  const base = appointments.map((appointment) => normalizeAppointment(appointment, viewer));
  if (!viewer || viewer.role !== "user" || appointments.length === 0) return base;
  const appointmentIds = appointments.map((appointment) => appointment._id || appointment.id);
  const reviews = await Review.find({ appointment: { $in: appointmentIds }, student: viewer._id }).select("appointment status");
  const reviewed = new Set(reviews.map((review) => String(review.appointment)));
  return base.map((appointment) => ({
    ...appointment,
    reviewSubmitted: reviewed.has(String(appointment.id)),
  }));
}

function normalizeReview(review, viewer) {
  if (!review) return null;
  const raw = review.toObject ? review.toObject({ virtuals: true }) : review;
  const student = raw.student && typeof raw.student === "object" ? raw.student : null;
  const counsellor = raw.counsellor && typeof raw.counsellor === "object" ? raw.counsellor : null;
  const hiddenStudent = raw.anonymous && viewer?.role !== "admin";
  return {
    id: String(raw._id || raw.id),
    appointmentId: raw.appointment?._id ? String(raw.appointment._id) : String(raw.appointment || ""),
    studentId: student?._id ? String(student._id) : String(raw.student || ""),
    studentName: hiddenStudent ? "Anonymous user" : student?.name || "User",
    studentEmail: hiddenStudent ? "Hidden" : student?.email || "",
    counsellorId: counsellor?._id ? String(counsellor._id) : String(raw.counsellor || ""),
    counsellor: counsellor?.name || "",
    professionalism: raw.professionalism,
    helpfulness: raw.helpfulness,
    communication: raw.communication,
    rating: raw.averageRating,
    comment: raw.comment || "",
    anonymous: Boolean(raw.anonymous),
    status: raw.status,
    needsModeration: raw.status === "flagged" || Number(raw.averageRating) <= 2,
    adminNotes: raw.adminNotes || "",
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function normalizeJournal(entry) {
  if (!entry) return null;
  const raw = entry.toObject ? entry.toObject({ virtuals: true }) : entry;
  return {
    id: String(raw._id || raw.id),
    title: raw.title || "Private journal entry",
    content: raw.content || "",
    excerpt: String(raw.content || "").slice(0, 120),
    mood: raw.mood || "",
    gratitude: raw.gratitude || "",
    trigger: raw.trigger || "",
    shared: Boolean(raw.sharedWithCounsellor),
    sharedAt: raw.sharedAt,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function normalizeMessage(message, viewer) {
  if (!message) return null;
  const raw = message.toObject ? message.toObject({ virtuals: true }) : message;
  const from = raw.from && typeof raw.from === "object" ? raw.from : null;
  const to = raw.to && typeof raw.to === "object" ? raw.to : null;
  const viewerId = viewer?._id ? String(viewer._id) : "";
  const readBy = (raw.readBy || []).map((item) => String(item?._id || item));
  return {
    id: String(raw._id || raw.id),
    fromId: from?._id ? String(from._id) : String(raw.from || ""),
    toId: to?._id ? String(to._id) : String(raw.to || ""),
    from: from?.name || "User",
    to: to?.name || "User",
    subject: raw.subject || "Message",
    text: raw.text || "",
    task: raw.task || "",
    fileName: raw.fileName || "",
    fileUrl: raw.fileUrl || "",
    unread: viewerId ? !readBy.includes(viewerId) && String(raw.to?._id || raw.to) === viewerId : false,
    direction: viewerId && String(raw.from?._id || raw.from) === viewerId ? "sent" : "received",
    createdAt: raw.createdAt,
    time: raw.createdAt ? new Date(raw.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "",
  };
}

function normalizePayment(payment) {
  if (!payment) return null;
  const raw = payment.toObject ? payment.toObject({ virtuals: true }) : payment;
  return {
    id: raw.invoiceNumber || String(raw._id || raw.id),
    paymentId: String(raw._id || raw.id),
    appointmentId: raw.appointment?._id ? String(raw.appointment._id) : String(raw.appointment || ""),
    amount: raw.amount || 0,
    currency: raw.currency || "INR",
    kind: raw.kind || "session",
    plan: raw.plan || "Session",
    description: raw.description || "",
    status: raw.status || "paid",
    date: raw.paidAt ? new Date(raw.paidAt).toISOString().slice(0, 10) : raw.createdAt ? new Date(raw.createdAt).toISOString().slice(0, 10) : "",
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function normalizeNotification(notification) {
  if (!notification) return null;
  const raw = notification.toObject ? notification.toObject({ virtuals: true }) : notification;
  return {
    id: String(raw._id || raw.id),
    type: raw.type || "system",
    title: raw.title || "",
    message: raw.message || "",
    read: Boolean(raw.read),
    createdAt: raw.createdAt,
    time: raw.createdAt ? new Date(raw.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "",
  };
}

async function refreshCounsellorRating(counsellorId) {
  if (!counsellorId) return;
  const objectId = new mongoose.Types.ObjectId(String(counsellorId));
  const [summary] = await Review.aggregate([
    { $match: { counsellor: objectId, status: "approved" } },
    { $group: { _id: "$counsellor", average: { $avg: "$averageRating" }, count: { $sum: 1 } } },
  ]);
  await User.findByIdAndUpdate(counsellorId, {
    rating: summary ? Number(summary.average.toFixed(1)) : 4.8,
    reviews: summary?.count || 0,
  });
}

async function createNotification({ user, audienceRole = "", type = "system", title, message, metadata = {} }) {
  if (!title || !message) return null;
  const notification = await Notification.create({
    user,
    audienceRole,
    type,
    title,
    message,
    metadata,
  });
  const payload = normalizeNotification(notification);
  if (user) io.to(`user:${user}`).emit("notification:new", payload);
  if (audienceRole) io.to(`role:${audienceRole}`).emit("notification:new", payload);
  if (audienceRole === "all") io.emit("notification:new", payload);
  return notification;
}

async function canMessageUser(sender, recipient) {
  if (!sender || !recipient) return false;
  if (sender.role === "admin") return true;
  if (recipient.role === "admin") return true;
  if (sender.role === "user") {
    return recipient.role === "counsellor" && approvedCounsellorStatuses.includes(recipient.status);
  }
  if (sender.role === "counsellor") {
    if (recipient.role !== "user") return false;
    const appointment = await Appointment.exists({
      counsellor: sender._id,
      student: recipient._id,
      status: { $in: ["pending", "confirmed", "completed"] },
    });
    return Boolean(appointment);
  }
  return false;
}

async function findUserByIdentifier(identifier) {
  const value = String(identifier || "").trim();
  if (!value) return null;
  if (mongoose.isValidObjectId(value)) return User.findById(value);
  return User.findOne({ email: value.toLowerCase() });
}

async function findCounsellor(counsellorId) {
  if (!counsellorId || counsellorId === "first_available") {
    const counsellors = await User.find({ role: "counsellor", status: { $in: approvedCounsellorStatuses } }).sort({ createdAt: 1 });
    if (counsellors.length === 0) return null;
    const loads = await Promise.all(
      counsellors.map(async (counsellor) => ({
        counsellor,
        count: await Appointment.countDocuments({
          counsellor: counsellor._id,
          status: { $in: activeStatuses },
        }),
      }))
    );
    loads.sort((a, b) => a.count - b.count);
    return loads[0].counsellor;
  }
  if (mongoose.isValidObjectId(counsellorId)) {
    return User.findOne({ _id: counsellorId, role: "counsellor", status: { $in: approvedCounsellorStatuses } });
  }
  return User.findOne({ email: String(counsellorId).toLowerCase(), role: "counsellor", status: { $in: approvedCounsellorStatuses } });
}

async function hasAppointmentConflict(counsellorId, date, time, excludeId) {
  const query = {
    counsellor: counsellorId,
    date,
    time,
    status: { $in: activeStatuses },
  };
  if (excludeId) query._id = { $ne: excludeId };
  return Appointment.exists(query);
}

function canAccessAppointment(user, appt) {
  if (user.role === "admin") return true;
  if (user.role === "counsellor" && String(appt.counsellor) === String(user._id)) return true;
  if (user.role === "user" && String(appt.student) === String(user._id)) return true;
  return false;
}

function scoreAssessment(type, responses) {
  const values = Object.values(responses || {}).map((value) => Number(value) || 0);
  const score = values.reduce((sum, value) => sum + value, 0);
  const highThreshold = type === "gad7" ? 15 : 20;
  const moderateThreshold = type === "gad7" ? 10 : 10;
  const level = score >= highThreshold ? "high" : score >= moderateThreshold ? "moderate" : "low";
  const recommendations = {
    low: [
      "Keep tracking your mood and sleep for early pattern awareness.",
      "Use a short breathing or grounding exercise when stress rises.",
    ],
    moderate: [
      "Consider booking a counselling session for extra support.",
      "Create a simple support plan with one trusted person and one daily routine.",
    ],
    high: [
      "Please reach out to a counsellor or trusted adult as soon as you can.",
      "If you feel unsafe, contact emergency services or a crisis helpline immediately.",
    ],
  }[level];
  return { score, level, recommendations };
}


registerRoutes(app, {
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
});

const distPath = path.join(__dirname, "..", "..", "dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.use((error, _req, res, _next) => {
  console.error(error);
  if (error?.code === 11000) {
    res.status(409).json({ error: "Duplicate record" });
    return;
  }
  res.status(500).json({ error: error?.message || "Server error" });
});

export { app, connectDatabase, httpServer, PORT };
