import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  Bell,
  CalendarCheck,
  CalendarX,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Clock,
  CreditCard,
  FileText,
  IndianRupee,
  Link as LinkIcon,
  Lock,
  MessageCircle,
  MessageSquareText,
  NotebookPen,
  Pencil,
  PlusCircle,
  Power,
  Reply,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  SmilePlus,
  Trash2,
  UserCheck,
  Users,
  Video,
} from "lucide-react";
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";
import GlowPanel from "@/components/reactbits/GlowPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { getRealtimeSocket } from "@/lib/socket";

const fallback = {
  profile: {},
  stats: {
    todaySessions: 0,
    pendingRequests: 0,
    activeClients: 0,
    googleMeetReady: false,
    earnings: 0,
    pendingPayouts: 0,
    rating: 0,
    unreadMessages: 0,
  },
  appointments: [],
  patients: [],
  progress: [],
  messages: [],
  earnings: { total: 0, sessionRevenue: 0, pendingPayouts: 0, monthly: [] },
  reviews: [],
  notifications: [],
  actions: [],
};

const NOTIFICATION_HTTP_POLL_MS = 30000;

const noteTemplates = [
  "Client appeared stable. Continued grounding practice and daily mood tracking recommended.",
  "Discussed stress triggers, sleep routine, and one small action before next session.",
  "Reviewed safety plan, support contacts, and escalation steps if risk increases.",
  "Created weekly wellness task: breathing practice, hydration, and journaling check-in.",
];

const statusTone = {
  upcoming: "bg-blue-500/15 text-blue-600 border-blue-500/20",
  pending: "bg-amber-500/15 text-amber-600 border-amber-500/20",
  confirmed: "bg-blue-500/15 text-blue-600 border-blue-500/20",
  completed: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
  cancelled: "bg-rose-500/15 text-rose-600 border-rose-500/20",
  declined: "bg-rose-500/15 text-rose-600 border-rose-500/20",
};

const riskTone = {
  low: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
  moderate: "bg-amber-500/15 text-amber-600 border-amber-500/20",
  high: "bg-rose-500/15 text-rose-600 border-rose-500/20",
};

const defaultPrivacySettings = {
  showOnlineStatus: true,
  allowMessages: true,
  shareProgressWithCounsellor: true,
  anonymousDisplayName: "",
};

const defaultNotificationSettings = {
  session: true,
  messages: true,
  payments: true,
  platform: true,
  emergency: true,
};

const dayOptions = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const packagePricePlans = [
  {
    key: "shortTerm",
    title: "Short-Term Support",
    detail: "4-8 sessions, every two days",
    hint: "Stress, anxiety, exams, loneliness",
    fallback: 1499,
  },
  {
    key: "mediumTerm",
    title: "Medium-Term Support",
    detail: "8-15 sessions, weekly or bi-weekly",
    hint: "Mild depression, relationships, healing",
    fallback: 2499,
  },
  {
    key: "longTerm",
    title: "Long-Term Therapy",
    detail: "3-6+ months, weekly or bi-weekly",
    hint: "Trauma, severe anxiety, chronic depression",
    fallback: 3999,
  },
];

const defaultPackagePrices = packagePricePlans.reduce((acc, plan) => ({ ...acc, [plan.key]: String(plan.fallback) }), {});

function newAvailabilityRow(day = "Monday", start = "10:00", end = "16:00") {
  return { id: `${day}-${Date.now()}-${Math.random().toString(16).slice(2)}`, day, start, end };
}

function parseAvailabilityRows(items = []) {
  if (!items.length) return [newAvailabilityRow("Monday", "10:00", "16:00")];
  return items.map((item, index) => {
    const text = String(item || "");
    const match = text.match(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s*:?\s*(\d{1,2}:?\d{0,2})\s*(?:-|–|to)\s*(\d{1,2}:?\d{0,2})/i);
    const dayMap = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };
    const normalizeTime = (value, fallback) => {
      const raw = String(value || "").replace(/[^0-9:]/g, "");
      if (!raw) return fallback;
      if (raw.includes(":")) return raw.length === 4 ? `0${raw}` : raw;
      return `${raw.padStart(2, "0")}:00`;
    };
    if (!match) return newAvailabilityRow(dayOptions[index % dayOptions.length], "10:00", "16:00");
    const key = match[1].slice(0, 3).toLowerCase();
    return {
      id: `${index}-${text}`,
      day: dayMap[key] || match[1],
      start: normalizeTime(match[2], "10:00"),
      end: normalizeTime(match[3], "16:00"),
    };
  });
}

function serializeAvailabilityRows(rows = []) {
  return rows
    .filter((row) => row.day && row.start && row.end)
    .map((row) => `${row.day}: ${row.start}-${row.end}`);
}

function todayYMD() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(value) {
  return `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;
}

function normalizePackagePrices(profile = {}) {
  const source = profile.supportPlanPrices || {};
  const basePrice = Number(profile.sessionPricing) || 0;
  return packagePricePlans.reduce((acc, plan) => {
    const saved = Number(source[plan.key]);
    const fallback = saved || (basePrice ? Math.round((basePrice * (plan.key === "shortTerm" ? 3 : plan.key === "mediumTerm" ? 5 : 8)) / 50) * 50 - 1 : plan.fallback);
    acc[plan.key] = String(saved > 0 ? saved : fallback || plan.fallback);
    return acc;
  }, {});
}

function fallbackBaseSessionPrice(profile = {}) {
  return Number(profile.sessionPricing) || (profile.counsellorType === "mentor" ? 299 : 599);
}

function counsellorPayout(value, commissionRate = 20) {
  return Math.max(0, Math.round(Number(value || 0) * ((100 - Number(commissionRate || 20)) / 100)));
}

function sessionStatusLabel(status = "") {
  if (["pending", "confirmed"].includes(status)) return "Upcoming";
  if (status === "completed") return "Completed";
  if (["cancelled", "declined"].includes(status)) return "Cancelled";
  return status || "Upcoming";
}

function counsellingModeLabel(mode = "") {
  const labels = {
    "google-meet": "Google Meet",
    "voice-call": "Voice Call",
    "in-person": "In-person",
    online: "Google Meet",
  };
  return labels[mode] || mode || "Google Meet";
}

function initials(name = "MS") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function normalizeNotification(item) {
  if (typeof item === "string") return { title: item.split(":")[0] || "Notice", message: item.split(":").slice(1).join(":").trim() || item };
  return item || { title: "Notice", message: "" };
}

const CounsellorDashboard = () => {
  const { toast } = useToast();
  const [data, setData] = useState(fallback);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState({});
  const [availabilityRows, setAvailabilityRows] = useState(() => parseAvailabilityRows([]));
  const [unavailableDates, setUnavailableDates] = useState([]);
  const [unavailableDateDraft, setUnavailableDateDraft] = useState("");
  const [bookingEnabled, setBookingEnabled] = useState(true);
  const [meetLink, setMeetLink] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [activeConversationId, setActiveConversationId] = useState("");
  const [sessionFilter, setSessionFilter] = useState("all");
  const [sessionSearch, setSessionSearch] = useState("");
  const [sessionDrafts, setSessionDrafts] = useState({});
  const [patientChatSearch, setPatientChatSearch] = useState("");
  const [messageText, setMessageText] = useState("");
  const [messageFileUrl, setMessageFileUrl] = useState("");
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState("");
  const [editingMessageText, setEditingMessageText] = useState("");
  const [usernameDraft, setUsernameDraft] = useState("");
  const [profileDraft, setProfileDraft] = useState({
    specialization: "",
    location: "",
    education: "",
    responseTime: "",
    bio: "",
  });
  const [packagePrices, setPackagePrices] = useState(defaultPackagePrices);
  const [baseSessionPrice, setBaseSessionPrice] = useState("");
  const [privacySettings, setPrivacySettings] = useState(defaultPrivacySettings);
  const [notificationSettings, setNotificationSettings] = useState(defaultNotificationSettings);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiFetch("/api/counsellor/dashboard");
      const next = { ...fallback, ...result };
      setData(next);
      setAvailabilityRows(parseAvailabilityRows(next.profile?.availability || []));
      setUnavailableDates(next.profile?.unavailableDates || []);
      setBookingEnabled(next.profile?.bookingEnabled !== false);
      setMeetLink(next.profile?.meetLink || "");
      setUsernameDraft(next.profile?.username || "");
      setProfileDraft({
        specialization: next.profile?.specialization || "",
        location: next.profile?.location || "",
        education: next.profile?.education || "",
        responseTime: next.profile?.responseTime || "",
        bio: next.profile?.bio || "",
      });
      setBaseSessionPrice(String(fallbackBaseSessionPrice(next.profile)));
      setPackagePrices(normalizePackagePrices(next.profile));
      setPrivacySettings({ ...defaultPrivacySettings, ...(next.profile?.privacySettings || {}) });
      setNotificationSettings({ ...defaultNotificationSettings, ...(next.profile?.notificationSettings || {}) });
      setSelectedPatientId((current) => current || next.patients?.[0]?.id || "");
      setActiveConversationId((current) => current || next.patients?.[0]?.id || "");
    } catch (error) {
      toast({ variant: "destructive", title: "Unable to load dashboard", description: error?.message || "" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let active = true;
    const pollNotifications = async () => {
      try {
        const list = await apiFetch("/api/notifications/my");
        if (active && Array.isArray(list)) {
          setData((current) => ({ ...current, notifications: list }));
        }
      } catch {
        // Keep the latest dashboard notifications if a background poll fails.
      }
    };
    const timer = window.setInterval(pollNotifications, NOTIFICATION_HTTP_POLL_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const socket = getRealtimeSocket();
    if (!socket) return undefined;
    const refresh = () => {
      void load();
    };
    socket.on("message:new", refresh);
    return () => {
      socket.off("message:new", refresh);
    };
  }, [load]);

  const appointments = useMemo(() => data.appointments || [], [data.appointments]);
  const patients = useMemo(() => data.patients || [], [data.patients]);
  const messages = useMemo(() => (data.messages || []).filter((message) => !message.deleted).reverse(), [data.messages]);
  const today = todayYMD();

  const pending = appointments.filter((item) => item.status === "pending");
  const activeSessions = appointments.filter((item) => ["pending", "confirmed"].includes(item.status));
  const completedSessions = appointments.filter((item) => item.status === "completed");
  const todaySessions = appointments.filter((item) => item.date === today && ["pending", "confirmed"].includes(item.status));
  const upcomingAppointments = useMemo(
    () =>
      appointments
        .filter((item) => ["pending", "confirmed"].includes(item.status))
        .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)),
    [appointments]
  );
  const selectedPatient = patients.find((patient) => patient.id === selectedPatientId) || patients[0];
  const activePatient = patients.find((patient) => patient.id === activeConversationId) || patients[0];

  const filteredSessions = useMemo(() => {
    const query = sessionSearch.trim().toLowerCase();
    return appointments.filter((appointment) => {
      const statusOk = sessionFilter === "all" || appointment.status === sessionFilter;
      const text = `${appointment.studentName} ${appointment.studentEmail} ${appointment.concern} ${appointment.date} ${appointment.time}`.toLowerCase();
      return statusOk && (!query || text.includes(query));
    });
  }, [appointments, sessionFilter, sessionSearch]);

  const selectedPatientSessions = useMemo(() => {
    if (!selectedPatient) return [];
    return appointments.filter(
      (appointment) =>
        appointment.studentEmail === selectedPatient.email ||
        appointment.studentName === selectedPatient.name ||
        appointment.studentId === selectedPatient.id
    );
  }, [appointments, selectedPatient]);

  const conversationMessages = useMemo(() => {
    if (!activePatient) return [];
    return messages.filter(
      (message) =>
        message.fromId === activePatient.id ||
        message.toId === activePatient.id ||
        message.from === activePatient.name ||
        message.to === activePatient.name
    );
  }, [activePatient, messages]);

  const chatPatients = useMemo(() => {
    const query = patientChatSearch.trim().toLowerCase();
    return patients
      .map((patient) => {
        const thread = messages.filter(
          (message) =>
            message.fromId === patient.id ||
            message.toId === patient.id ||
            message.from === patient.name ||
            message.to === patient.name
        );
        const lastMessage = thread[thread.length - 1];
        return {
          patient,
          thread,
          lastMessage,
          unreadCount: thread.filter((message) => message.unread).length,
        };
      })
      .filter(({ patient, lastMessage }) => {
        if (!query) return true;
        const text = `${patient.name} ${patient.email} ${patient.moodReport} ${patient.risk} ${lastMessage?.text || ""}`.toLowerCase();
        return text.includes(query);
      })
      .sort((a, b) => {
        if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
        const aTime = new Date(a.lastMessage?.createdAt || 0).getTime();
        const bTime = new Date(b.lastMessage?.createdAt || 0).getTime();
        return bTime - aTime;
      });
  }, [messages, patientChatSearch, patients]);

  const unreadCount = messages.filter((message) => message.unread).length;
  const averageAttendance = appointments.length ? Math.round((completedSessions.length / appointments.length) * 100) : 0;
  const reviewScore = Number(data.stats.rating || 0).toFixed(1);

  const updateAppointment = async (appointmentId, payload, successTitle = "Session updated") => {
    try {
      await apiFetch(`/api/appointments/${appointmentId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      toast({ title: successTitle });
      await load();
    } catch (error) {
      toast({ variant: "destructive", title: "Update failed", description: error?.message || "" });
    }
  };

  const createMeet = async (appointmentId, sharedLink = "") => {
    try {
      const response = await apiFetch("/api/meet/create", {
        method: "POST",
        body: JSON.stringify({ appointmentId, meetingLink: sharedLink }),
      });
      toast({ title: "Shared Google Meet ready", description: "User Join and counsellor Open Meet now use the same room." });
      await load();
    } catch (error) {
      toast({ variant: "destructive", title: "Meet link failed", description: error?.message || "" });
    }
  };

  const saveProfileTools = async () => {
    const cleanedBasePrice = Number(baseSessionPrice);
    const cleanedPackagePrices = packagePricePlans.reduce((acc, plan) => {
      acc[plan.key] = Number(packagePrices[plan.key]);
      return acc;
    }, {});
    if (!Number.isFinite(cleanedBasePrice) || cleanedBasePrice < 1) {
      toast({ variant: "destructive", title: "Add a valid base price", description: "Base session price must be at least Rs. 1." });
      return;
    }
    const invalidPlan = packagePricePlans.find((plan) => !Number.isFinite(cleanedPackagePrices[plan.key]) || cleanedPackagePrices[plan.key] < 1);
    if (invalidPlan) {
      toast({ variant: "destructive", title: "Package price missing", description: `Enter a valid price for ${invalidPlan.title}.` });
      return;
    }
    try {
      await Promise.all([
        apiFetch("/api/users/me", {
          method: "PUT",
          body: JSON.stringify({
            username: usernameDraft.trim(),
            ...profileDraft,
            sessionPricing: cleanedBasePrice,
            supportPlanPrices: cleanedPackagePrices,
            privacySettings,
            notificationSettings,
          }),
        }),
        apiFetch("/api/counsellor/availability", {
          method: "PUT",
          body: JSON.stringify({
            availability: serializeAvailabilityRows(availabilityRows),
            unavailableDates,
            bookingEnabled,
            meetLink: meetLink.trim(),
            privacySettings,
            notificationSettings,
          }),
        }),
      ]);
      toast({ title: "Profile tools updated" });
      await load();
    } catch (error) {
      toast({ variant: "destructive", title: "Update failed", description: error?.message || "" });
    }
  };

  const sendCounsellorMessage = async () => {
    if (!activePatient?.id || !messageText.trim()) {
      toast({ variant: "destructive", title: "Message is incomplete", description: "Choose a user and write a message." });
      return;
    }
    try {
      await apiFetch("/api/messages", {
        method: "POST",
        body: JSON.stringify({
          to: activePatient.id,
          subject: "Counsellor follow-up",
          text: messageText,
          task: messageText,
          replyTo: replyToMessage?.id,
          fileUrl: messageFileUrl.trim(),
          fileName: messageFileUrl.trim() ? "Shared resource" : "",
        }),
      });
      toast({ title: "Message sent", description: "The user will see it in secure chat." });
      setMessageText("");
      setMessageFileUrl("");
      setReplyToMessage(null);
      await load();
    } catch (error) {
      toast({ variant: "destructive", title: "Message failed", description: error?.message || "" });
    }
  };

  const startEditMessage = (message) => {
    setEditingMessageId(message.id);
    setEditingMessageText(message.text || "");
  };

  const saveEditedMessage = async () => {
    if (!editingMessageId || !editingMessageText.trim()) return;
    try {
      await apiFetch(`/api/messages/${editingMessageId}`, {
        method: "PATCH",
        body: JSON.stringify({ text: editingMessageText, task: editingMessageText }),
      });
      toast({ title: "Message edited" });
      setEditingMessageId("");
      setEditingMessageText("");
      await load();
    } catch (error) {
      toast({ variant: "destructive", title: "Edit failed", description: error?.message || "" });
    }
  };

  const deleteMessage = async (message) => {
    try {
      await apiFetch(`/api/messages/${message.id}`, { method: "DELETE" });
      toast({ title: "Message deleted" });
      if (replyToMessage?.id === message.id) setReplyToMessage(null);
      if (editingMessageId === message.id) {
        setEditingMessageId("");
        setEditingMessageText("");
      }
      await load();
    } catch (error) {
      toast({ variant: "destructive", title: "Delete failed", description: error?.message || "" });
    }
  };

  const reactToMessage = async (message, emoji) => {
    try {
      await apiFetch(`/api/messages/${message.id}/reactions`, {
        method: "POST",
        body: JSON.stringify({ emoji }),
      });
      await load();
    } catch (error) {
      toast({ variant: "destructive", title: "Reaction failed", description: error?.message || "" });
    }
  };

  const updateDraft = (appointmentId, key, value) => {
    setSessionDrafts((current) => ({
      ...current,
      [appointmentId]: {
        ...current[appointmentId],
        [key]: value,
      },
    }));
  };

  const updateAvailabilityRow = (id, key, value) => {
    setAvailabilityRows((current) => current.map((row) => (row.id === id ? { ...row, [key]: value } : row)));
  };

  const addAvailabilityRow = () => {
    setAvailabilityRows((current) => [...current, newAvailabilityRow(dayOptions[current.length % dayOptions.length], "10:00", "16:00")]);
  };

  const removeAvailabilityRow = (id) => {
    setAvailabilityRows((current) => (current.length > 1 ? current.filter((row) => row.id !== id) : current));
  };

  const addUnavailableDate = () => {
    if (!unavailableDateDraft || unavailableDates.includes(unavailableDateDraft)) return;
    setUnavailableDates((current) => [...current, unavailableDateDraft].sort());
    setUnavailableDateDraft("");
  };

  const removeUnavailableDate = (date) => {
    setUnavailableDates((current) => current.filter((item) => item !== date));
  };

  const rescheduleAppointment = async (appointment) => {
    const draft = sessionDrafts[appointment.id] || {};
    if (!draft.date && !draft.time) {
      toast({ variant: "destructive", title: "Choose a new date or time" });
      return;
    }
    await updateAppointment(
      appointment.id,
      {
        date: draft.date || appointment.date,
        time: draft.time || appointment.time,
        status: appointment.status === "pending" ? "confirmed" : appointment.status,
      },
      "Session rescheduled"
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-16">
        <section className="dashboard-motion bg-gradient-to-br from-primary/8 via-background via-secondary/8 to-accent/5 py-6 md:py-10">
          <div className="dashboard-shell mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
            <GlowPanel className="dashboard-panel overflow-hidden p-0">
              <div className="grid gap-6 p-5 md:p-6 lg:grid-cols-[1.25fr_0.75fr]">
                <div className="flex gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground shadow-lg shadow-primary/20">
                    {initials(data.profile?.name || "Counsellor")}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="border-secondary/25 bg-secondary/15 text-secondary">Counsellor dashboard</Badge>
                      <Badge className="border-emerald-500/20 bg-emerald-500/15 text-emerald-600">
                        <BadgeCheck className="mr-1 h-3.5 w-3.5" />
                        {data.profile?.verificationBadge || "Approved"}
                      </Badge>
                    </div>
                    <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{data.profile?.name || "Counsellor workspace"}</h1>
                    <p className="mt-2 max-w-2xl text-sm text-foreground/70 sm:text-base">
                      {data.profile?.specialization || "Manage care sessions, patient progress, notes, chat, earnings, reviews, and Google Meet consultations."}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-foreground/65">
                      {(data.profile?.languages || []).slice(0, 4).map((language) => (
                        <span key={language} className="rounded-full bg-foreground/5 px-3 py-1">{language}</span>
                      ))}
                      {data.profile?.experience && <span className="rounded-full bg-foreground/5 px-3 py-1">{data.profile.experience}</span>}
                      {data.profile?.responseTime && <span className="rounded-full bg-foreground/5 px-3 py-1">{data.profile.responseTime}</span>}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-glass-border/50 bg-background/70 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-foreground/55">Today</p>
                      <p className="mt-1 text-2xl font-bold">{todaySessions.length} sessions</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={load} disabled={loading}>
                      <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                      Refresh
                    </Button>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <QuickStat label="Pending" value={pending.length} />
                    <QuickStat label="Unread" value={unreadCount} />
                    <QuickStat label="Rating" value={reviewScore} />
                  </div>
                </div>
              </div>
            </GlowPanel>

            <div className="dashboard-stagger grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <Metric title="Today's sessions" value={data.stats.todaySessions} icon={Clock} tone="text-blue-500" />
              <Metric title="Active patients" value={data.stats.activeClients} icon={Users} tone="text-emerald-500" />
              <Metric title="Session revenue" value={formatMoney(data.stats.earnings)} icon={IndianRupee} tone="text-primary" />
              <Metric title="Pending requests" value={data.stats.pendingRequests} icon={ClipboardList} tone="text-amber-500" />
              <Metric title="Average rating" value={reviewScore} icon={Star} tone="text-amber-500" />
            </div>

            <Tabs defaultValue="overview" className="space-y-5">
              <TabsList className="dashboard-panel flex h-auto flex-wrap justify-start gap-2 bg-muted/60 p-2">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="sessions">Sessions</TabsTrigger>
                <TabsTrigger value="patients">Patients</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="chat">Chat</TabsTrigger>
                <TabsTrigger value="earnings">Earnings</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="dashboard-tab-motion space-y-6">
                <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CalendarCheck className="h-5 w-5 text-primary" />
                        Care Command Center
                      </CardTitle>
                      <CardDescription>Requests, reminders, follow-ups, and care tasks in one place.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-3 md:grid-cols-3">
                        <StatusTile label="Pending requests" value={pending.length} icon={ClipboardList} />
                        <StatusTile label="Confirmed schedule" value={activeSessions.filter((item) => item.status === "confirmed").length} icon={CheckCircle2} />
                        <StatusTile label="Attendance" value={`${averageAttendance}%`} icon={Activity} />
                      </div>
                      <div className="space-y-3">
                        {pending.slice(0, 3).map((appointment) => (
                          <RequestRow
                            key={appointment.id}
                            appointment={appointment}
                            onConfirm={() => updateAppointment(appointment.id, { status: "confirmed" }, "Request accepted")}
                            onDecline={() => updateAppointment(appointment.id, { status: "declined" }, "Request declined")}
                            onMeet={() => createMeet(appointment.id)}
                          />
                        ))}
                        {pending.length === 0 && <EmptyState icon={ClipboardCheck} title="No pending requests" text="Your booking queue is clear." />}
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-6">
                    <Card className="glass-card">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Bell className="h-5 w-5 text-secondary" />
                          Notifications
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {(data.notifications || []).slice(0, 4).map((item, index) => {
                          const notification = normalizeNotification(item);
                          return (
                            <PanelText key={`${notification.title}-${index}`}>
                              <span className="font-medium text-foreground">{notification.title}</span>
                              <span className="block text-foreground/65">{notification.message}</span>
                            </PanelText>
                          );
                        })}
                      </CardContent>
                    </Card>

                    <Card className="glass-card">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <ShieldCheck className="h-5 w-5 text-emerald-500" />
                          Safety Workflow
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {(data.actions || []).map((action) => (
                          <PanelText key={action}>
                            <CheckCircle2 className="mr-2 inline h-4 w-4 text-emerald-500" />
                            {action}
                          </PanelText>
                        ))}
                        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-600">
                          <AlertTriangle className="mr-2 inline h-4 w-4" />
                          For emergencies, direct users to professional services immediately.
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="sessions" className="dashboard-tab-motion space-y-6">
                <Card className="glass-card border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarCheck className="h-5 w-5 text-primary" />
                      Upcoming Appointments
                    </CardTitle>
                    <CardDescription>User name, session type, date/time, mode, status, and rescheduling controls.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 xl:grid-cols-2">
                    {upcomingAppointments.length ? (
                      upcomingAppointments.map((appointment) => (
                        <UpcomingAppointmentCard
                          key={appointment.id}
                          appointment={appointment}
                          draft={sessionDrafts[appointment.id] || {}}
                          onDraft={(key, value) => updateDraft(appointment.id, key, value)}
                          onReschedule={() => rescheduleAppointment(appointment)}
                          onMeet={() => createMeet(appointment.id, sessionDrafts[appointment.id]?.meetingLink || "")}
                        />
                      ))
                    ) : (
                      <EmptyState icon={CalendarCheck} title="No upcoming appointments" text="Confirmed and pending bookings appear here." />
                    )}
                  </CardContent>
                </Card>

                <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
                  <div className="space-y-6">
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ClipboardList className="h-5 w-5 text-primary" />
                        Booking Requests
                      </CardTitle>
                      <CardDescription>Accept, reject, add Google Meet, or reschedule requests.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {pending.length ? (
                        pending.map((appointment) => (
                          <RequestRow
                            key={appointment.id}
                            appointment={appointment}
                            onConfirm={() => updateAppointment(appointment.id, { status: "confirmed" }, "Request accepted")}
                            onDecline={() => updateAppointment(appointment.id, { status: "declined" }, "Request declined")}
                            onMeet={() => createMeet(appointment.id)}
                          />
                        ))
                      ) : (
                        <EmptyState icon={ClipboardCheck} title="No pending requests" text="New booking requests will appear here." />
                      )}
                    </CardContent>
                  </Card>

                  <AvailabilityManager
                    bookingEnabled={bookingEnabled}
                    setBookingEnabled={setBookingEnabled}
                    rows={availabilityRows}
                    onRowChange={updateAvailabilityRow}
                    onAddRow={addAvailabilityRow}
                    onRemoveRow={removeAvailabilityRow}
                    unavailableDates={unavailableDates}
                    unavailableDateDraft={unavailableDateDraft}
                    setUnavailableDateDraft={setUnavailableDateDraft}
                    onAddUnavailableDate={addUnavailableDate}
                    onRemoveUnavailableDate={removeUnavailableDate}
                    onSave={saveProfileTools}
                  />
                  </div>

                  <Card className="glass-card">
                    <CardHeader>
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <CalendarCheck className="h-5 w-5 text-secondary" />
                            Session Schedule
                          </CardTitle>
                          <CardDescription>Manage confirmed, pending, completed, and cancelled sessions.</CardDescription>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/45" />
                            <Input className="pl-9" value={sessionSearch} onChange={(event) => setSessionSearch(event.target.value)} placeholder="Search sessions" />
                          </div>
                          <Select value={sessionFilter} onValueChange={setSessionFilter}>
                            <SelectTrigger className="w-full sm:w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All status</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="confirmed">Confirmed</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {filteredSessions.length ? (
                        filteredSessions.map((appointment) => (
                          <SessionCard
                            key={appointment.id}
                            appointment={appointment}
                            draft={sessionDrafts[appointment.id] || {}}
                            onDraft={(key, value) => updateDraft(appointment.id, key, value)}
                            onReschedule={() => rescheduleAppointment(appointment)}
                            onComplete={() =>
                              updateAppointment(
                                appointment.id,
                                { status: "completed", notes: notes[appointment.id] || appointment.notes || "" },
                                "Session completed"
                              )
                            }
                            onCancel={() => updateAppointment(appointment.id, { status: "cancelled" }, "Session cancelled")}
                            onMeet={() => createMeet(appointment.id, sessionDrafts[appointment.id]?.meetingLink || "")}
                          />
                        ))
                      ) : (
                        <EmptyState icon={CalendarCheck} title="No sessions found" text="Try another status or search term." />
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="patients" className="dashboard-tab-motion space-y-6">
                <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        Patient List
                      </CardTitle>
                      <CardDescription>Active users assigned through sessions.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {patients.map((patient) => (
                        <button
                          type="button"
                          key={patient.id}
                          onClick={() => setSelectedPatientId(patient.id)}
                          className={`w-full rounded-xl border p-3 text-left transition hover:border-primary/40 hover:bg-primary/5 ${
                            selectedPatient?.id === patient.id ? "border-primary/50 bg-primary/10" : "border-glass-border/40 bg-background/60"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="font-semibold">{patient.name}</div>
                              <div className="text-xs text-foreground/60">{patient.email}</div>
                              <div className="mt-1 text-xs text-foreground/65">{patient.activePlanName || "Counselling sessions"}</div>
                            </div>
                            <Badge className={riskTone[patient.risk] || riskTone.low}>{patient.risk}</Badge>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs">
                            <Badge variant="secondary">{patient.completedSessions || 0}/{patient.totalSessions || 0} completed</Badge>
                            <Badge variant="secondary">{patient.pendingSessions || 0} pending</Badge>
                            <Badge variant="secondary">{patient.confirmedSessions || 0} confirmed</Badge>
                          </div>
                          <Progress className="mt-3" value={patient.progress || 0} />
                        </button>
                      ))}
                      {!patients.length && <EmptyState icon={Users} title="No active patients" text="Patients appear after sessions are booked." />}
                    </CardContent>
                  </Card>

                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <UserCheck className="h-5 w-5 text-secondary" />
                        Patient Overview
                      </CardTitle>
                      <CardDescription>Therapy history, mood reports, risk, and active care progress.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {selectedPatient ? (
                        <div className="space-y-5">
                          <div className="grid gap-3 md:grid-cols-4">
                            <StatusTile label="Total sessions" value={selectedPatient.totalSessions || 0} icon={FileText} />
                            <StatusTile label="Completed" value={selectedPatient.completedSessions || 0} icon={CheckCircle2} />
                            <StatusTile label="Active plan" value={selectedPatient.activePlanName || "Support"} icon={ClipboardCheck} />
                            <StatusTile label="Attendance" value={`${selectedPatient.attendance || 0}%`} icon={BarChart3} />
                          </div>

                          <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
                            <div className="rounded-xl border border-glass-border/40 bg-background/60 p-4">
                              <h3 className="font-semibold">Plan & Session Summary</h3>
                              <div className="mt-3 grid gap-3 md:grid-cols-2">
                                <PatientDetailLine label="Current plan" value={selectedPatient.activePlanName || "Counselling sessions"} />
                                <PatientDetailLine label="Plan duration" value={selectedPatient.activePlanDuration || "Not specified"} />
                                <PatientDetailLine label="Plan interval" value={selectedPatient.activePlanCadence || "Not specified"} />
                                <PatientDetailLine label="Session history" value={selectedPatient.therapyHistory} />
                                <PatientDetailLine
                                  label="Next session"
                                  value={selectedPatient.nextSession ? `${selectedPatient.nextSession.date} at ${selectedPatient.nextSession.time} (${selectedPatient.nextSession.mode})` : "No upcoming session"}
                                />
                                <PatientDetailLine
                                  label="Last session"
                                  value={selectedPatient.lastSession ? `${selectedPatient.lastSession.date} at ${selectedPatient.lastSession.time} (${selectedPatient.lastSession.status})` : "No session yet"}
                                />
                              </div>
                              <div className="mt-4">
                                <div className="text-sm font-medium">Best for</div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {(selectedPatient.activePlanBestFor || []).length ? (
                                    selectedPatient.activePlanBestFor.map((item) => (
                                      <Badge key={item} variant="secondary">{item}</Badge>
                                    ))
                                  ) : (
                                    <Badge variant="secondary">General support</Badge>
                                  )}
                                </div>
                              </div>
                              <div className="mt-4">
                                <div className="text-sm font-medium">Modes used</div>
                                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                                  {(selectedPatient.modeBreakdown || []).map((item) => (
                                    <div key={item.mode} className="rounded-lg border border-glass-border/40 bg-background/70 p-3">
                                      <div className="text-xs capitalize text-foreground/60">{String(item.mode || "").replace("-", " ")}</div>
                                      <div className="text-lg font-semibold">{item.count}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="rounded-xl border border-glass-border/40 bg-background/60 p-4">
                              <h3 className="font-semibold">User Wellness Details</h3>
                              <div className="mt-3 grid gap-3">
                                <PatientDetailLine label="Mood report" value={selectedPatient.moodReport || "Not tracked"} />
                                <PatientDetailLine label="Latest assessment" value={selectedPatient.latestAssessmentLevel ? `${selectedPatient.latestAssessmentLevel} risk (${selectedPatient.latestAssessmentScore || 0})` : selectedPatient.risk} />
                                <PatientDetailLine label="Contact" value={selectedPatient.phone || selectedPatient.email || "Not available"} />
                                <PatientDetailLine label="Shared journals" value={`${selectedPatient.sharedJournalCount || 0} entries`} />
                              </div>
                              {selectedPatient.latestJournalExcerpt ? (
                                <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3">
                                  <div className="text-sm font-medium">{selectedPatient.latestJournalTitle || "Latest shared journal"}</div>
                                  <p className="mt-1 text-sm text-foreground/70">{selectedPatient.latestJournalExcerpt}</p>
                                </div>
                              ) : (
                                <PanelText>No shared journal entries from this user yet.</PanelText>
                              )}
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-xl border border-glass-border/40 bg-background/60 p-4">
                              <h3 className="font-semibold">Session Timeline</h3>
                              <div className="mt-3 space-y-2">
                                {(selectedPatient.sessions?.length ? selectedPatient.sessions : selectedPatientSessions).map((appointment) => (
                                  <TimelineItem key={appointment.id} appointment={appointment} />
                                ))}
                                {!(selectedPatient.sessions?.length || selectedPatientSessions.length) && <PanelText>No sessions found for this patient.</PanelText>}
                              </div>
                            </div>
                            <div className="rounded-xl border border-glass-border/40 bg-background/60 p-4">
                              <h3 className="font-semibold">Care Plan</h3>
                              <div className="mt-3 space-y-3">
                                <div className="h-44 rounded-xl border border-glass-border/30 bg-background/50 p-3">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <RechartsLineChart
                                      data={[
                                        { label: "Start", progress: Math.max(20, (selectedPatient.progress || 0) - 28) },
                                        { label: "Week 2", progress: Math.max(30, (selectedPatient.progress || 0) - 18) },
                                        { label: "Week 4", progress: Math.max(40, (selectedPatient.progress || 0) - 8) },
                                        { label: "Now", progress: selectedPatient.progress || 0 },
                                      ]}
                                      margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                                    >
                                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.45} />
                                      <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                                      <Line type="monotone" dataKey="progress" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4 }} />
                                    </RechartsLineChart>
                                  </ResponsiveContainer>
                                </div>
                                <ProgressRow label="Mood improvement" value={selectedPatient.progress || 0} />
                                <ProgressRow label="Attendance consistency" value={averageAttendance} />
                                <PanelText>Recommended next step: confirm follow-up and send one wellness task.</PanelText>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <EmptyState icon={UserCheck} title="Select a patient" text="Patient details will appear here." />
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="notes" className="dashboard-tab-motion space-y-6">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <NotebookPen className="h-5 w-5 text-primary" />
                      Confidential Session Notes
                    </CardTitle>
                    <CardDescription>Save recommendations, treatment plans, and post-session notes.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-2 md:grid-cols-4">
                      {noteTemplates.map((template) => (
                        <button
                          type="button"
                          key={template}
                          onClick={() => {
                            const target = activeSessions[0] || appointments[0];
                            if (target) setNotes((current) => ({ ...current, [target.id]: template }));
                          }}
                          className="rounded-xl border border-glass-border/40 bg-background/60 p-3 text-left text-xs text-foreground/70 transition hover:border-primary/40 hover:bg-primary/5"
                        >
                          {template}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-4">
                      {(activeSessions.length ? activeSessions : appointments).map((appointment) => (
                        <div key={appointment.id} className="rounded-xl border border-glass-border/40 bg-background/60 p-4">
                          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div>
                              <div className="font-semibold">{appointment.studentName || appointment.studentEmail}</div>
                              <div className="text-sm text-foreground/60">{appointment.date} at {appointment.time}</div>
                            </div>
                            <Badge className={statusTone[appointment.status] || "bg-foreground/10 text-foreground"}>{appointment.status}</Badge>
                          </div>
                          <Textarea
                            rows={4}
                            className="mt-3"
                            value={notes[appointment.id] ?? appointment.notes ?? ""}
                            onChange={(event) => setNotes((current) => ({ ...current, [appointment.id]: event.target.value }))}
                            placeholder="Write confidential notes, recommendations, and treatment plan..."
                          />
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button onClick={() => updateAppointment(appointment.id, { notes: notes[appointment.id] || "" }, "Notes saved")}>
                              Save notes
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() =>
                                updateAppointment(
                                  appointment.id,
                                  { status: "completed", notes: notes[appointment.id] || appointment.notes || "" },
                                  "Session completed"
                                )
                              }
                            >
                              Mark completed
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="chat" className="dashboard-tab-motion space-y-6">
                <Card className="overflow-hidden border border-primary/20 bg-gradient-to-br from-card/95 via-card/90 to-primary/5 shadow-2xl">
                  <div className="grid min-h-[680px] overflow-hidden lg:grid-cols-[320px_minmax(0,1fr)]">
                    <aside className="flex min-h-[240px] flex-col border-b border-glass-border/40 bg-background/95 lg:min-h-[680px] lg:border-b-0 lg:border-r">
                      <div className="border-b border-glass-border/40 bg-gradient-to-br from-background/95 to-primary/5 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h2 className="font-semibold leading-tight">Patient Chat</h2>
                            <p className="text-xs text-foreground/60">{unreadCount} unread secure message{unreadCount === 1 ? "" : "s"}</p>
                          </div>
                          <MessageCircle className="h-5 w-5 text-primary" />
                        </div>
                        <div className="relative mt-4">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/45" />
                          <Input
                            className="h-10 rounded-full border-glass-border/50 bg-background/70 pl-9 shadow-inner"
                            value={patientChatSearch}
                            onChange={(event) => setPatientChatSearch(event.target.value)}
                            placeholder="Search patient or message"
                          />
                        </div>
                      </div>
                      <div className="chat-scrollbar flex-1 space-y-2 overflow-y-auto p-2">
                        {chatPatients.length ? (
                          chatPatients.map(({ patient, lastMessage, unreadCount: patientUnreadCount }) => (
                            <PatientConversationRow
                              key={patient.id}
                              patient={patient}
                              active={activePatient?.id === patient.id}
                              lastMessage={lastMessage}
                              unreadCount={patientUnreadCount}
                              showOnlineStatus={privacySettings.showOnlineStatus}
                              onClick={() => setActiveConversationId(patient.id)}
                            />
                          ))
                        ) : (
                          <div className="p-4">
                            <PanelText>{patients.length ? "No patients match this chat search." : "Patients appear here after users book sessions."}</PanelText>
                          </div>
                        )}
                      </div>
                    </aside>

                    <section className="flex min-h-[680px] flex-col bg-[#08111a] text-slate-50">
                      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-gradient-to-r from-[#202c33] via-[#1c2932] to-[#17232c] p-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="animated-ring relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary via-secondary to-accent text-sm font-bold text-primary-foreground shadow-sm">
                            {initials(activePatient?.name || "User")}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate font-semibold">{activePatient?.name || "Choose a patient"}</div>
                            <div className="truncate text-xs text-slate-300">{activePatient?.email || "Secure follow-up messages"}</div>
                          </div>
                        </div>
                        <Badge className={riskTone[activePatient?.risk] || "bg-slate-700 text-slate-100"}>{activePatient?.risk || "safe"}</Badge>
                      </div>

                      <div className="border-b border-white/10 bg-[#101a22] px-4 py-2 text-center text-xs text-slate-300">
                        <Lock className="mr-1 inline h-3.5 w-3.5 text-emerald-300" />
                        Edit, delete, reply, and reactions are available for secure follow-up messages.
                      </div>

                      <div className="chat-scrollbar flex-1 overflow-y-auto bg-[linear-gradient(135deg,#08111a,#101a22)] p-3 md:p-5">
                        {conversationMessages.length ? (
                          <div className="space-y-3">
                            {conversationMessages.map((message) => (
                              <CounsellorChatBubble
                                key={message.id}
                                message={message}
                                editing={editingMessageId === message.id}
                                editingText={editingMessageText}
                                onEditText={setEditingMessageText}
                                onStartEdit={() => startEditMessage(message)}
                                onSaveEdit={saveEditedMessage}
                                onCancelEdit={() => {
                                  setEditingMessageId("");
                                  setEditingMessageText("");
                                }}
                                onDelete={() => deleteMessage(message)}
                                onReply={() => setReplyToMessage(message)}
                                onReact={(emoji) => reactToMessage(message, emoji)}
                              />
                            ))}
                          </div>
                        ) : (
                          <EmptyState icon={MessageSquareText} title="No conversation yet" text="Send a follow-up, wellness task, or resource." />
                        )}
                      </div>

                      <div className="border-t border-white/10 bg-[#17242d]/95 p-3 shadow-[0_-18px_45px_rgba(0,0,0,0.22)] backdrop-blur">
                        {replyToMessage && (
                          <div className="mb-3 rounded-xl border-l-4 border-emerald-400 bg-[#111b21] p-3 text-xs text-slate-300">
                            <div className="flex items-center justify-between gap-3">
                              <span>Replying to {replyToMessage.direction === "sent" ? "your message" : replyToMessage.from}</span>
                              <button type="button" className="text-slate-400 hover:text-white" onClick={() => setReplyToMessage(null)}>Cancel</button>
                            </div>
                            <div className="mt-1 truncate text-slate-100">{replyToMessage.text}</div>
                          </div>
                        )}
                        <div className="mb-3 flex flex-wrap gap-2">
                          {["Please update your mood tracker", "Try the breathing task today", "Can we review this next session?"].map((reply) => (
                            <button
                              key={reply}
                              type="button"
                              onClick={() => setMessageText((current) => (current ? `${current}\n${reply}` : reply))}
                              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200 hover:bg-white/10"
                            >
                              {reply}
                            </button>
                          ))}
                        </div>
                        <div className="mb-2 grid gap-2 md:grid-cols-[1fr_190px]">
                          <Input className="h-10 rounded-xl border-white/10 bg-[#0f1921] text-slate-100 placeholder:text-slate-400" value={messageFileUrl} onChange={(event) => setMessageFileUrl(event.target.value)} placeholder="Optional resource or file URL" />
                          <Button type="button" variant="outline" onClick={() => setMessageText("Please complete today's breathing exercise and update your mood tracker before our next session.")}>
                            Wellness task
                          </Button>
                        </div>
                        <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-[#0f1921] p-2">
                          <Textarea
                            rows={2}
                            value={messageText}
                            onChange={(event) => setMessageText(event.target.value)}
                            placeholder="Write a secure follow-up message..."
                            className="min-h-[44px] resize-none border-0 bg-transparent text-slate-100 shadow-none placeholder:text-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0"
                          />
                          <Button className="h-11 rounded-full bg-emerald-500 px-4 text-white hover:bg-emerald-600" onClick={sendCounsellorMessage} aria-label="Send message" disabled={!messageText.trim() || !activePatient}>
                            <Send className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                    </section>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="earnings" className="dashboard-tab-motion space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <Metric title="Total earnings" value={formatMoney(data.earnings.total)} icon={CreditCard} tone="text-primary" />
                  <Metric title="Session revenue" value={formatMoney(data.earnings.sessionRevenue)} icon={CalendarCheck} tone="text-emerald-500" />
                  <Metric title="Pending payout" value={formatMoney(data.earnings.pendingPayouts)} icon={Clock} tone="text-amber-500" />
                </div>
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      Monthly Earnings
                    </CardTitle>
                    <CardDescription>Revenue trend, payout status, and platform commission view.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80 rounded-2xl border border-glass-border/40 bg-background/60 p-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart data={data.earnings.monthly || []} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.45} />
                          <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                          <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(value) => `Rs.${Math.round(value / 1000)}k`} />
                          <Tooltip
                            cursor={{ fill: "hsl(var(--primary) / 0.08)" }}
                            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }}
                            formatter={(value) => formatMoney(value)}
                          />
                          <Bar dataKey="payout" name="Counsellor payout" radius={[8, 8, 0, 0]} fill="hsl(var(--primary))" />
                          <Bar dataKey="platformFee" name="Platform fee" radius={[8, 8, 0, 0]} fill="hsl(var(--secondary))" />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                      <PanelText>Platform fee is applied automatically on completed bookings.</PanelText>
                      <PanelText>Counsellor payout: {formatMoney(data.earnings.total)} after platform fee.</PanelText>
                      <PanelText>Pending payout queue: {formatMoney(data.earnings.pendingPayouts)}</PanelText>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reviews" className="dashboard-tab-motion space-y-6">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-amber-500" />
                      Reviews & Ratings
                    </CardTitle>
                    <CardDescription>Monitor professionalism, helpfulness, communication, and written feedback.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {data.reviews.length ? (
                      data.reviews.map((review) => (
                        <div key={review.id} className="rounded-xl border border-glass-border/40 bg-background/60 p-4">
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <div className="font-semibold">{review.studentName || "Anonymous user"}</div>
                              <p className="mt-2 text-sm text-foreground/70">{review.comment || "No written comment."}</p>
                            </div>
                            <Badge className="border-amber-500/20 bg-amber-500/15 text-amber-600">{review.rating} / 5</Badge>
                          </div>
                          <div className="mt-4 grid gap-3 md:grid-cols-3">
                            <ProgressRow label="Professionalism" value={(review.professionalism || 0) * 20} />
                            <ProgressRow label="Helpfulness" value={(review.helpfulness || 0) * 20} />
                            <ProgressRow label="Communication" value={(review.communication || 0) * 20} />
                          </div>
                        </div>
                      ))
                    ) : (
                      <EmptyState icon={Star} title="No reviews yet" text="Reviews appear after users rate completed sessions." />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="dashboard-tab-motion space-y-6">
                <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BadgeCheck className="h-5 w-5 text-primary" />
                        Marketplace Profile
                      </CardTitle>
                      <CardDescription>Keep your public counsellor card accurate for users before they book.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="text-sm font-medium">Specialization</label>
                          <Input
                            className="mt-2"
                            value={profileDraft.specialization}
                            onChange={(event) => setProfileDraft((current) => ({ ...current, specialization: event.target.value }))}
                            placeholder="Relationship Therapist"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Location</label>
                          <Input
                            className="mt-2"
                            value={profileDraft.location}
                            onChange={(event) => setProfileDraft((current) => ({ ...current, location: event.target.value }))}
                            placeholder="Mumbai, IN"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Education / qualification</label>
                          <Input
                            className="mt-2"
                            value={profileDraft.education}
                            onChange={(event) => setProfileDraft((current) => ({ ...current, education: event.target.value }))}
                            placeholder="MA Clinical Psychology"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Response time</label>
                          <Input
                            className="mt-2"
                            value={profileDraft.responseTime}
                            onChange={(event) => setProfileDraft((current) => ({ ...current, responseTime: event.target.value }))}
                            placeholder="Within 24 hours"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium">About / bio</label>
                        <Textarea
                          className="mt-2 min-h-28"
                          value={profileDraft.bio}
                          onChange={(event) => setProfileDraft((current) => ({ ...current, bio: event.target.value }))}
                          placeholder="Describe your care style, approach, and the users you support."
                        />
                      </div>
                      <Button onClick={saveProfileTools}>Save counsellor profile</Button>
                    </CardContent>
                  </Card>

                  <Card className="glass-card overflow-hidden">
                    <CardHeader className="border-b border-glass-border/40 bg-gradient-to-br from-primary/15 via-secondary/10 to-sky-500/10">
                      <CardTitle className="flex items-center gap-2">
                        <IndianRupee className="h-5 w-5 text-secondary" />
                        Package Pricing
                      </CardTitle>
                      <CardDescription>Set one-time prices users pay when booking each support package. Platform fee is handled automatically.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-5">
                      <div>
                        <label className="text-sm font-medium">Base session price</label>
                        <Input
                          className="mt-2"
                          type="number"
                          min="1"
                          value={baseSessionPrice}
                          onChange={(event) => setBaseSessionPrice(event.target.value)}
                          placeholder="599"
                        />
                        <p className="mt-2 text-xs text-foreground/60">Used as fallback pricing reference. Packages below are shown to users.</p>
                      </div>
                      <div className="space-y-3">
                        {packagePricePlans.map((plan) => {
                          const value = Number(packagePrices[plan.key] || 0);
                          const commissionRate = data.earnings.platformCommissionRate || data.profile?.platformCommission || 20;
                          return (
                            <div key={plan.key} className="rounded-2xl border border-glass-border/40 bg-background/65 p-4">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                  <div className="font-semibold">{plan.title}</div>
                                  <p className="text-sm text-foreground/60">{plan.detail}</p>
                                  <p className="mt-1 text-xs text-foreground/50">{plan.hint}</p>
                                </div>
                                <Badge className="border-primary/20 bg-primary/15 text-primary">One-time</Badge>
                              </div>
                              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr]">
                                <div>
                                  <label className="text-xs font-medium uppercase tracking-wide text-foreground/55">User pays</label>
                                  <Input
                                    className="mt-2"
                                    type="number"
                                    min="1"
                                    value={packagePrices[plan.key] || ""}
                                    onChange={(event) => setPackagePrices((current) => ({ ...current, [plan.key]: event.target.value }))}
                                  />
                                </div>
                                <div className="rounded-xl bg-foreground/5 p-3">
                                  <div className="text-xs text-foreground/55">Your payout after platform fee</div>
                                  <div className="mt-1 text-lg font-bold text-emerald-500">{formatMoney(counsellorPayout(value, commissionRate))}</div>
                                  <div className="text-xs text-foreground/55">Platform fee: {formatMoney(Math.max(0, value - counsellorPayout(value, commissionRate)))}</div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <Button className="w-full" onClick={saveProfileTools}>Save package prices</Button>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Video className="h-5 w-5 text-primary" />
                        Availability & Google Meet
                      </CardTitle>
                      <CardDescription>
                        Set working slots and a reusable Google Meet room. User Join and counsellor Open Meet must use the same saved room link.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Secure username</label>
                        <Input
                          className="mt-2"
                          value={usernameDraft}
                          onChange={(event) => setUsernameDraft(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                          placeholder="dr_support_01"
                        />
                        <p className="mt-2 text-xs text-foreground/60">Use 3-24 lowercase letters, numbers, or underscores. Users can sign in with username or email.</p>
                      </div>
                      <div className="rounded-xl border border-glass-border/40 bg-background/60 p-4">
                        <div className="flex items-center gap-2 font-medium">
                          <CalendarCheck className="h-4 w-4 text-primary" />
                          Booking availability
                        </div>
                        <p className="mt-2 text-sm text-foreground/65">
                          {bookingEnabled ? "Bookings are enabled" : "Bookings are paused"} with {availabilityRows.length} weekly slot{availabilityRows.length === 1 ? "" : "s"} and {unavailableDates.length} unavailable date{unavailableDates.length === 1 ? "" : "s"}.
                        </p>
                        <p className="mt-1 text-xs text-foreground/50">Use the Sessions tab to add days, time slots, unavailable dates, and booking availability.</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Default Google Meet link</label>
                        <Input className="mt-2" value={meetLink} onChange={(event) => setMeetLink(event.target.value)} placeholder="https://meet.google.com/abc-defg-hij" />
                        <p className="mt-2 text-xs text-foreground/60">
                          Paste the real room link after creating it in Google Meet. Do not use https://meet.google.com/new because it creates a different room for each person.
                        </p>
                      </div>
                      <Button onClick={saveProfileTools}>Save dashboard settings</Button>
                    </CardContent>
                  </Card>

                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Lock className="h-5 w-5 text-secondary" />
                        Privacy Controls
                      </CardTitle>
                      <CardDescription>Control visibility, messaging, and anonymous display behavior.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <SettingToggle
                        title="Show online status"
                        text="Show a small active indicator in secure chat."
                        checked={privacySettings.showOnlineStatus}
                        onToggle={() => setPrivacySettings((current) => ({ ...current, showOnlineStatus: !current.showOnlineStatus }))}
                      />
                      <SettingToggle
                        title="Allow patient messages"
                        text="Let approved patients send secure follow-up messages."
                        checked={privacySettings.allowMessages}
                        onToggle={() => setPrivacySettings((current) => ({ ...current, allowMessages: !current.allowMessages }))}
                      />
                      <SettingToggle
                        title="Share progress insights"
                        text="Use patient progress signals inside your care planning cards."
                        checked={privacySettings.shareProgressWithCounsellor}
                        onToggle={() => setPrivacySettings((current) => ({ ...current, shareProgressWithCounsellor: !current.shareProgressWithCounsellor }))}
                      />
                      <div>
                        <label className="text-sm font-medium">Anonymous display alias</label>
                        <Input
                          className="mt-2"
                          value={privacySettings.anonymousDisplayName || ""}
                          onChange={(event) => setPrivacySettings((current) => ({ ...current, anonymousDisplayName: event.target.value }))}
                          placeholder="MindSupport Counsellor"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5 text-primary" />
                        Notification Preferences
                      </CardTitle>
                      <CardDescription>Choose which dashboard alerts should stay active.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <SettingToggle title="Session reminders" text="Bookings, reschedules, cancellations, and Google Meet alerts." checked={notificationSettings.session} onToggle={() => setNotificationSettings((current) => ({ ...current, session: !current.session }))} />
                      <SettingToggle title="Chat messages" text="New patient messages, replies, reactions, and shared resources." checked={notificationSettings.messages} onToggle={() => setNotificationSettings((current) => ({ ...current, messages: !current.messages }))} />
                      <SettingToggle title="Payment updates" text="Counsellor payout and platform fee notices." checked={notificationSettings.payments} onToggle={() => setNotificationSettings((current) => ({ ...current, payments: !current.payments }))} />
                      <SettingToggle title="Emergency SOS alerts" text="Urgent alerts from booked users and safety escalation notices." checked={notificationSettings.emergency} onToggle={() => setNotificationSettings((current) => ({ ...current, emergency: !current.emergency }))} />
                      <SettingToggle title="Platform announcements" text="Admin wellness campaigns, moderation alerts, and maintenance notices." checked={notificationSettings.platform} onToggle={() => setNotificationSettings((current) => ({ ...current, platform: !current.platform }))} />
                    </CardContent>
                  </Card>

                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-secondary" />
                        Public Profile Snapshot
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3 md:grid-cols-2">
                      <ProfileLine label="Username" value={usernameDraft ? `@${usernameDraft}` : "Not set"} />
                      <ProfileLine label="Badge" value={data.profile?.verificationBadge || "Verified Professional"} />
                      <ProfileLine label="Type" value={data.profile?.counsellorType || "professional"} />
                      <ProfileLine label="Base price" value={formatMoney(baseSessionPrice)} />
                      <ProfileLine label="Short package" value={formatMoney(packagePrices.shortTerm)} />
                      <ProfileLine label="Medium package" value={formatMoney(packagePrices.mediumTerm)} />
                      <ProfileLine label="Long package" value={formatMoney(packagePrices.longTerm)} />
                      <ProfileLine label="Platform fee" value="Applied automatically" />
                      <ProfileLine label="Categories" value={(data.profile?.categories || []).join(", ") || "General counselling"} />
                      <ProfileLine label="Meet readiness" value={data.stats.googleMeetReady ? "Ready" : "Needs link"} />
                      <ProfileLine label="Reviews" value={`${data.profile?.reviews || data.reviews.length || 0} reviews`} />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

function Metric({ title, value, icon: Icon, tone = "text-primary" }) {
  return (
    <Card className="glass-card dashboard-card-motion">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Icon className={`h-4 w-4 ${tone}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold capitalize">{value}</div>
      </CardContent>
    </Card>
  );
}

function QuickStat({ label, value }) {
  return (
    <div className="rounded-xl bg-foreground/5 px-3 py-2">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[11px] text-foreground/55">{label}</div>
    </div>
  );
}

function StatusTile({ label, value, icon: Icon }) {
  return (
    <div className="rounded-xl border border-glass-border/40 bg-background/60 p-3">
      <Icon className="h-4 w-4 text-primary" />
      <div className="mt-2 text-lg font-bold capitalize">{value}</div>
      <div className="text-xs text-foreground/60">{label}</div>
    </div>
  );
}

function PanelText({ children }) {
  return <div className="rounded-xl border border-glass-border/40 bg-background/60 p-3 text-sm text-foreground/75">{children}</div>;
}

function EmptyState({ icon: Icon, title, text }) {
  return (
    <div className="rounded-2xl border border-dashed border-glass-border/60 bg-background/45 p-6 text-center">
      <Icon className="mx-auto h-8 w-8 text-primary" />
      <div className="mt-3 font-semibold">{title}</div>
      <p className="mt-1 text-sm text-foreground/60">{text}</p>
    </div>
  );
}

function RequestRow({ appointment, onConfirm, onDecline, onMeet }) {
  return (
    <div className="rounded-xl border border-glass-border/40 bg-background/60 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="font-semibold">{appointment.studentName || appointment.studentEmail}</div>
          <div className="text-sm text-foreground/60">{appointment.date} at {appointment.time}</div>
          {appointment.concern && <p className="mt-2 text-sm text-foreground/75">{appointment.concern}</p>}
        </div>
        <Badge className={statusTone[appointment.status] || statusTone.pending}>{appointment.status}</Badge>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" onClick={onConfirm}>
          <CheckCircle2 className="mr-1 h-4 w-4" />
          Accept
        </Button>
        <Button size="sm" variant="outline" onClick={onMeet}>
          <Video className="mr-1 h-4 w-4" />
          Add Meet
        </Button>
        <Button size="sm" variant="outline" onClick={onDecline}>Reject</Button>
      </div>
    </div>
  );
}

function UpcomingAppointmentCard({ appointment, draft, onDraft, onReschedule, onMeet }) {
  const displayStatus = sessionStatusLabel(appointment.status);
  return (
    <div className="dashboard-card-motion rounded-2xl border border-glass-border/40 bg-background/70 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold">{appointment.studentName || appointment.studentEmail || "User"}</h3>
            <Badge className={statusTone[appointment.status] || statusTone.upcoming}>{displayStatus}</Badge>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <AppointmentInfo label="User name" value={appointment.studentName || appointment.studentEmail || "Hidden user"} />
            <AppointmentInfo label="Session type" value={appointment.supportPlanName || "Counselling package"} />
            <AppointmentInfo label="Date & time" value={`${appointment.date} at ${appointment.time}`} />
            <AppointmentInfo label="Counselling mode" value={counsellingModeLabel(appointment.mode)} />
          </div>
        </div>
        <div className="w-full space-y-2 lg:w-56">
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" value={draft.date || ""} onChange={(event) => onDraft("date", event.target.value)} />
            <Input type="time" value={draft.time || ""} onChange={(event) => onDraft("time", event.target.value)} />
          </div>
          <Button size="sm" variant="outline" className="w-full" onClick={onReschedule}>
            Reschedule
          </Button>
          {appointment.meetingLink ? (
            <Button size="sm" className="w-full" asChild>
              <a href={appointment.meetingLink} target="_blank" rel="noreferrer">
                <LinkIcon className="mr-1 h-4 w-4" />
                Open Meet
              </a>
            </Button>
          ) : appointment.mode === "google-meet" || appointment.mode === "online" ? (
            <Button size="sm" className="w-full" onClick={onMeet}>
              <Video className="mr-1 h-4 w-4" />
              Save Meet
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AppointmentInfo({ label, value }) {
  return (
    <div className="rounded-xl border border-glass-border/30 bg-background/60 p-3">
      <div className="text-xs uppercase tracking-wide text-foreground/45">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value || "Not available"}</div>
    </div>
  );
}

function AvailabilityManager({
  bookingEnabled,
  setBookingEnabled,
  rows,
  onRowChange,
  onAddRow,
  onRemoveRow,
  unavailableDates,
  unavailableDateDraft,
  setUnavailableDateDraft,
  onAddUnavailableDate,
  onRemoveUnavailableDate,
  onSave,
}) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarX className="h-5 w-5 text-secondary" />
          Availability Management
        </CardTitle>
        <CardDescription>Set available days, add time slots, mark unavailable dates, and enable or disable bookings.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <button
          type="button"
          onClick={() => setBookingEnabled(!bookingEnabled)}
          className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition ${
            bookingEnabled ? "border-emerald-500/25 bg-emerald-500/10" : "border-rose-500/25 bg-rose-500/10"
          }`}
        >
          <span>
            <span className="block font-semibold">{bookingEnabled ? "Booking availability enabled" : "Booking availability paused"}</span>
            <span className="mt-1 block text-xs text-foreground/60">Users can book only when this is enabled.</span>
          </span>
          <Power className={`h-5 w-5 ${bookingEnabled ? "text-emerald-500" : "text-rose-500"}`} />
        </button>

        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.id} className="grid gap-2 rounded-xl border border-glass-border/40 bg-background/60 p-3 sm:grid-cols-[1fr_90px_90px_36px]">
              <Select value={row.day} onValueChange={(value) => onRowChange(row.id, "day", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dayOptions.map((day) => (
                    <SelectItem key={day} value={day}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input type="time" value={row.start} onChange={(event) => onRowChange(row.id, "start", event.target.value)} />
              <Input type="time" value={row.end} onChange={(event) => onRowChange(row.id, "end", event.target.value)} />
              <Button type="button" variant="outline" size="icon" onClick={() => onRemoveRow(row.id)} aria-label="Remove availability slot">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" className="w-full" onClick={onAddRow}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add available time slot
          </Button>
        </div>

        <div className="rounded-xl border border-glass-border/40 bg-background/60 p-3">
          <div className="text-sm font-semibold">Unavailable dates</div>
          <div className="mt-3 flex gap-2">
            <Input type="date" value={unavailableDateDraft} onChange={(event) => setUnavailableDateDraft(event.target.value)} />
            <Button type="button" variant="outline" onClick={onAddUnavailableDate}>
              Add
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {unavailableDates.length ? (
              unavailableDates.map((date) => (
                <button
                  type="button"
                  key={date}
                  onClick={() => onRemoveUnavailableDate(date)}
                  className="rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs text-rose-500"
                >
                  {date} x
                </button>
              ))
            ) : (
              <span className="text-xs text-foreground/55">No unavailable dates marked.</span>
            )}
          </div>
        </div>

        <Button onClick={onSave} className="w-full">
          Save availability
        </Button>
      </CardContent>
    </Card>
  );
}

function SessionCard({ appointment, draft, onDraft, onReschedule, onComplete, onCancel, onMeet }) {
  const displayStatus = sessionStatusLabel(appointment.status);
  return (
    <div className="rounded-2xl border border-glass-border/40 bg-background/60 p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{appointment.studentName || appointment.studentEmail}</h3>
            <Badge className={statusTone[appointment.status] || statusTone.upcoming}>{displayStatus}</Badge>
            <Badge className="bg-foreground/10 text-foreground">{counsellingModeLabel(appointment.mode)}</Badge>
            <Badge variant="secondary">{appointment.supportPlanName || "Counselling package"}</Badge>
          </div>
          <p className="mt-1 text-sm text-foreground/60">{appointment.date} at {appointment.time}</p>
          {appointment.concern && <p className="mt-2 text-sm text-foreground/75">{appointment.concern}</p>}
          {appointment.notes && <p className="mt-2 rounded-lg bg-primary/5 p-2 text-xs text-foreground/70">Note: {appointment.notes}</p>}
        </div>

        <div className="w-full space-y-3 xl:w-[360px]">
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" value={draft.date || ""} onChange={(event) => onDraft("date", event.target.value)} />
            <Input type="time" value={draft.time || ""} onChange={(event) => onDraft("time", event.target.value)} />
          </div>
          {!appointment.meetingLink && appointment.mode !== "in-person" && (
            <Input
              value={draft.meetingLink || ""}
              onChange={(event) => onDraft("meetingLink", event.target.value)}
              placeholder="Paste shared Google Meet room link"
            />
          )}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={onReschedule}>Reschedule</Button>
            {appointment.meetingLink ? (
              <Button size="sm" variant="outline" asChild>
                <a href={appointment.meetingLink} target="_blank" rel="noreferrer">
                  <LinkIcon className="mr-1 h-4 w-4" />
                  Open same Meet
                </a>
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={onMeet}>
                <Video className="mr-1 h-4 w-4" />
                Save Meet
              </Button>
            )}
            {appointment.status !== "completed" && <Button size="sm" onClick={onComplete}>Complete</Button>}
            {!["cancelled", "completed"].includes(appointment.status) && (
              <Button size="sm" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineItem({ appointment }) {
  return (
    <div className="flex gap-3 rounded-lg bg-foreground/5 p-3">
      <div className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
      <div className="min-w-0">
        <div className="text-sm font-medium">{appointment.date} at {appointment.time}</div>
        <div className="text-xs text-foreground/60">{appointment.status} - {appointment.mode}</div>
        {appointment.supportPlanName && <div className="mt-1 text-xs text-foreground/60">Plan: {appointment.supportPlanName}</div>}
        {appointment.concern && <div className="mt-1 line-clamp-2 text-xs text-foreground/70">{appointment.concern}</div>}
      </div>
    </div>
  );
}

function PatientDetailLine({ label, value }) {
  return (
    <div className="rounded-lg border border-glass-border/40 bg-background/70 p-3">
      <div className="text-xs uppercase tracking-wide text-foreground/50">{label}</div>
      <div className="mt-1 text-sm font-medium">{value || "Not available"}</div>
    </div>
  );
}

function ProgressRow({ label, value }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-foreground/75">{label}</span>
        <span className="font-semibold">{Math.round(value || 0)}%</span>
      </div>
      <Progress value={Math.min(100, Math.max(0, Number(value) || 0))} />
    </div>
  );
}

function PatientConversationRow({ patient, active, lastMessage, unreadCount, showOnlineStatus, onClick }) {
  const time = lastMessage?.createdAt ? new Date(lastMessage.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`chat-row-motion group flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
        active ? "border-primary/35 bg-primary/10 shadow-[0_12px_30px_rgba(0,0,0,0.18)]" : "border-transparent bg-foreground/[0.035] hover:border-glass-border/60 hover:bg-foreground/[0.06]"
      }`}
    >
      <span className="animated-ring relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary via-secondary to-accent text-sm font-bold text-primary-foreground">
        {initials(patient.name)}
        {showOnlineStatus && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-emerald-300" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold">{patient.name}</span>
          <span className="shrink-0 text-[11px] text-foreground/50">{time}</span>
        </span>
        <span className="mt-1 block truncate text-xs text-foreground/55">{lastMessage?.text || patient.moodReport || "No messages yet"}</span>
        <span className="mt-1 flex items-center gap-2 text-[11px] text-foreground/45">
          <span className="capitalize">{patient.risk || "safe"} risk</span>
          {patient.sessionsCompleted !== undefined ? <span>{patient.sessionsCompleted} sessions</span> : null}
        </span>
      </span>
      {unreadCount > 0 ? (
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-2 text-xs font-semibold text-primary-foreground">{unreadCount}</span>
      ) : (
        <ChevronRight className="h-4 w-4 text-foreground/35 transition group-hover:translate-x-0.5" />
      )}
    </button>
  );
}

function CounsellorChatBubble({
  message,
  editing,
  editingText,
  onEditText,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onReply,
  onReact,
}) {
  const sent = message.direction === "sent";
  const timeLabel = message.createdAt
    ? new Date(message.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    : message.time || "";
  const reactions = Object.entries(message.reactionSummary || {});
  const subject = message.subject && !/^chat with/i.test(message.subject) ? message.subject : "";

  return (
    <div className={`group flex ${sent ? "chat-bubble-sent justify-end" : "chat-bubble-received justify-start"}`}>
      <div className={`relative max-w-[min(82%,680px)] rounded-2xl px-4 py-3 shadow-lg ${
        sent ? "rounded-br-md bg-gradient-to-br from-emerald-600 to-teal-700 text-white" : "rounded-bl-md border border-white/10 bg-[#1a2731] text-slate-100"
      }`}>
        {message.replyTo && (
          <div className={`mb-2 rounded-lg border-l-4 p-2 text-xs ${sent ? "border-emerald-200 bg-white/10" : "border-emerald-300 bg-black/15"}`}>
            <div className="font-semibold">{message.replyTo.from}</div>
            <div className="truncate opacity-80">{message.replyTo.text}</div>
          </div>
        )}
        <div className={`mb-1 text-xs font-semibold ${sent ? "text-emerald-100" : "text-slate-300"}`}>
          {sent ? "You" : message.from || "Patient"}
          {message.fromUsername && !sent ? <span className="ml-1 font-normal opacity-70">@{message.fromUsername}</span> : null}
        </div>
        {editing ? (
          <div className="space-y-2">
            <Textarea
              rows={3}
              value={editingText}
              onChange={(event) => onEditText(event.target.value)}
              className="border-white/10 bg-[#111b21] text-slate-100"
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={onCancelEdit}>Cancel</Button>
              <Button size="sm" onClick={onSaveEdit}>Save</Button>
            </div>
          </div>
        ) : (
          <>
            {subject && <div className="mb-1 text-sm font-semibold">{subject}</div>}
            <div className={`whitespace-pre-wrap text-sm leading-relaxed ${message.deleted ? "italic opacity-70" : ""}`}>{message.text}</div>
            {message.task && <div className="mt-2 rounded-xl border border-white/10 bg-white/10 p-2 text-xs">Task: {message.task}</div>}
            {message.fileUrl && (
              <a className={`mt-2 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-xs no-underline transition hover:bg-white/15 ${sent ? "text-emerald-50" : "text-emerald-200"}`} href={message.fileUrl} target="_blank" rel="noreferrer">
                <LinkIcon className="h-3 w-3" />
                {message.fileName || "Open shared file"}
              </a>
            )}
          </>
        )}
        {reactions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {reactions.map(([emoji, count]) => (
              <button key={emoji} type="button" onClick={() => onReact(emoji)} className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-xs hover:bg-white/15">
                {emoji} {count}
              </button>
            ))}
          </div>
        )}
        <div className={`mt-2 flex flex-wrap items-center justify-end gap-2 text-[11px] ${sent ? "text-emerald-100/80" : "text-slate-400"}`}>
          {message.edited && !message.deleted ? <span>edited</span> : null}
          <span>{timeLabel}</span>
          {sent && <CheckCircle2 className="h-3.5 w-3.5 text-sky-300" />}
        </div>
        {!message.deleted && (
          <div className="mt-2 flex flex-wrap justify-end gap-1 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
            <Button size="sm" variant="ghost" className="h-7 rounded-full px-2 text-xs text-slate-100 hover:bg-white/10" onClick={onReply}>
              <Reply className="h-3.5 w-3.5" />
            </Button>
            {["Like", "Care", "Thanks"].map((emoji) => (
              <Button key={emoji} size="sm" variant="ghost" className="h-7 rounded-full px-2 text-xs text-slate-100 hover:bg-white/10" onClick={() => onReact(emoji)}>
                <SmilePlus className="mr-1 h-3.5 w-3.5" />
                {emoji}
              </Button>
            ))}
            {message.canEdit && (
              <Button size="sm" variant="ghost" className="h-7 rounded-full px-2 text-slate-100 hover:bg-white/10" onClick={onStartEdit}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            {message.canDelete && (
              <Button size="sm" variant="ghost" className="h-7 rounded-full px-2 text-rose-200 hover:bg-rose-500/10 hover:text-rose-100" onClick={onDelete}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SettingToggle({ title, text, checked, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-glass-border/40 bg-background/60 p-4 text-left transition hover:border-primary/40"
    >
      <span>
        <span className="block font-medium">{title}</span>
        <span className="mt-1 block text-sm text-foreground/65">{text}</span>
      </span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? "bg-primary" : "bg-foreground/20"}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${checked ? "left-6" : "left-1"}`} />
      </span>
    </button>
  );
}

function ProfileLine({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-glass-border/40 bg-background/60 p-3 text-sm">
      <span className="text-foreground/60">{label}</span>
      <span className="max-w-[65%] text-right font-medium capitalize">{value || "Not set"}</span>
    </div>
  );
}

export default CounsellorDashboard;
