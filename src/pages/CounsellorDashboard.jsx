import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  Bell,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Clock,
  CreditCard,
  FileText,
  IndianRupee,
  Link as LinkIcon,
  MessageCircle,
  MessageSquareText,
  NotebookPen,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  UserCheck,
  Users,
  Video,
} from "lucide-react";
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

const noteTemplates = [
  "Client appeared stable. Continued grounding practice and daily mood tracking recommended.",
  "Discussed stress triggers, sleep routine, and one small action before next session.",
  "Reviewed safety plan, support contacts, and escalation steps if risk increases.",
  "Created weekly wellness task: breathing practice, hydration, and journaling check-in.",
];

const statusTone = {
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

function todayYMD() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(value) {
  return `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;
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
  const [availability, setAvailability] = useState("");
  const [meetLink, setMeetLink] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [activeConversationId, setActiveConversationId] = useState("");
  const [sessionFilter, setSessionFilter] = useState("all");
  const [sessionSearch, setSessionSearch] = useState("");
  const [sessionDrafts, setSessionDrafts] = useState({});
  const [messageText, setMessageText] = useState("");
  const [messageFileUrl, setMessageFileUrl] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiFetch("/api/counsellor/dashboard");
      const next = { ...fallback, ...result };
      setData(next);
      setAvailability((next.profile?.availability || []).join(", "));
      setMeetLink(next.profile?.meetLink || "");
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
    const socket = getRealtimeSocket();
    if (!socket) return undefined;
    const refresh = () => {
      void load();
    };
    socket.on("message:new", refresh);
    socket.on("notification:new", refresh);
    return () => {
      socket.off("message:new", refresh);
      socket.off("notification:new", refresh);
    };
  }, [load]);

  const appointments = useMemo(() => data.appointments || [], [data.appointments]);
  const patients = useMemo(() => data.patients || [], [data.patients]);
  const messages = useMemo(() => data.messages || [], [data.messages]);
  const today = todayYMD();

  const pending = appointments.filter((item) => item.status === "pending");
  const activeSessions = appointments.filter((item) => ["pending", "confirmed"].includes(item.status));
  const completedSessions = appointments.filter((item) => item.status === "completed");
  const todaySessions = appointments.filter((item) => item.date === today && ["pending", "confirmed"].includes(item.status));
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

  const createMeet = async (appointmentId) => {
    try {
      const response = await apiFetch("/api/meet/create", {
        method: "POST",
        body: JSON.stringify({ appointmentId }),
      });
      toast({ title: "Google Meet ready", description: response.meetingLink });
      await load();
    } catch (error) {
      toast({ variant: "destructive", title: "Meet link failed", description: error?.message || "" });
    }
  };

  const saveProfileTools = async () => {
    try {
      await apiFetch("/api/counsellor/availability", {
        method: "PUT",
        body: JSON.stringify({
          availability: availability
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          meetLink: meetLink.trim(),
        }),
      });
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
          fileUrl: messageFileUrl.trim(),
          fileName: messageFileUrl.trim() ? "Shared resource" : "",
        }),
      });
      toast({ title: "Message sent", description: "The user will see it in secure chat." });
      setMessageText("");
      setMessageFileUrl("");
      await load();
    } catch (error) {
      toast({ variant: "destructive", title: "Message failed", description: error?.message || "" });
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
                <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
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
                            onMeet={() => createMeet(appointment.id)}
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
                            </div>
                            <Badge className={riskTone[patient.risk] || riskTone.low}>{patient.risk}</Badge>
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
                            <StatusTile label="History" value={selectedPatient.therapyHistory} icon={FileText} />
                            <StatusTile label="Mood report" value={selectedPatient.moodReport} icon={Activity} />
                            <StatusTile label="Risk" value={selectedPatient.risk} icon={AlertTriangle} />
                            <StatusTile label="Progress" value={`${selectedPatient.progress}%`} icon={BarChart3} />
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-xl border border-glass-border/40 bg-background/60 p-4">
                              <h3 className="font-semibold">Session Timeline</h3>
                              <div className="mt-3 space-y-2">
                                {selectedPatientSessions.map((appointment) => (
                                  <TimelineItem key={appointment.id} appointment={appointment} />
                                ))}
                                {!selectedPatientSessions.length && <PanelText>No sessions found for this patient.</PanelText>}
                              </div>
                            </div>
                            <div className="rounded-xl border border-glass-border/40 bg-background/60 p-4">
                              <h3 className="font-semibold">Care Plan</h3>
                              <div className="mt-3 space-y-3">
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
                <Card className="glass-card overflow-hidden">
                  <div className="grid min-h-[640px] lg:grid-cols-[340px_1fr]">
                    <aside className="border-b border-glass-border/40 bg-background/60 p-4 lg:border-b-0 lg:border-r">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="font-semibold">Secure Chat</h2>
                          <p className="text-xs text-foreground/60">{unreadCount} unread messages</p>
                        </div>
                        <MessageCircle className="h-5 w-5 text-primary" />
                      </div>
                      <div className="mt-4 space-y-2">
                        {patients.map((patient) => {
                          const lastMessage = messages.find((message) => message.fromId === patient.id || message.toId === patient.id);
                          return (
                            <button
                              type="button"
                              key={patient.id}
                              onClick={() => setActiveConversationId(patient.id)}
                              className={`w-full rounded-xl p-3 text-left transition ${
                                activePatient?.id === patient.id ? "bg-primary text-primary-foreground" : "bg-foreground/5 hover:bg-foreground/10"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background/80 font-semibold text-foreground">
                                  {initials(patient.name)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="truncate font-semibold">{patient.name}</div>
                                  <div className="truncate text-xs opacity-75">{lastMessage?.text || patient.moodReport || "No messages yet"}</div>
                                </div>
                                <ChevronRight className="h-4 w-4 opacity-60" />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </aside>

                    <section className="flex min-h-[640px] flex-col">
                      <div className="flex items-center justify-between border-b border-glass-border/40 bg-background/70 p-4">
                        <div>
                          <h3 className="font-semibold">{activePatient?.name || "Choose a patient"}</h3>
                          <p className="text-xs text-foreground/60">{activePatient?.email || "Secure follow-up messages"}</p>
                        </div>
                        <Badge className={riskTone[activePatient?.risk] || "bg-foreground/10 text-foreground"}>{activePatient?.risk || "safe"}</Badge>
                      </div>

                      <div className="flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-emerald-500/5 to-primary/5 p-4">
                        {conversationMessages.length ? (
                          conversationMessages.map((message) => (
                            <div key={message.id} className={`flex ${message.direction === "sent" ? "justify-end" : "justify-start"}`}>
                              <div
                                className={`chat-panel-pop max-w-[78%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                                  message.direction === "sent"
                                    ? "rounded-br-sm bg-emerald-500 text-white"
                                    : "rounded-bl-sm border border-glass-border/40 bg-background"
                                }`}
                              >
                                <div>{message.text}</div>
                                {message.task && <div className="mt-2 rounded-lg bg-black/10 px-2 py-1 text-xs">Task: {message.task}</div>}
                                {message.fileUrl && (
                                  <a className="mt-2 block text-xs underline" href={message.fileUrl} target="_blank" rel="noreferrer">
                                    {message.fileName || "Open shared resource"}
                                  </a>
                                )}
                                <div className="mt-1 text-[10px] opacity-75">{message.time}</div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <EmptyState icon={MessageSquareText} title="No conversation yet" text="Send a follow-up, wellness task, or resource." />
                        )}
                      </div>

                      <div className="border-t border-glass-border/40 bg-background/75 p-4">
                        <div className="mb-3 grid gap-2 md:grid-cols-[1fr_220px]">
                          <Input value={messageFileUrl} onChange={(event) => setMessageFileUrl(event.target.value)} placeholder="Optional resource or file URL" />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setMessageText("Please complete today's breathing exercise and update your mood tracker before our next session.")}
                          >
                            Wellness task
                          </Button>
                        </div>
                        <div className="flex gap-2">
                          <Textarea
                            rows={2}
                            value={messageText}
                            onChange={(event) => setMessageText(event.target.value)}
                            placeholder="Write a secure follow-up message..."
                          />
                          <Button className="self-stretch px-4" onClick={sendCounsellorMessage} aria-label="Send message">
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
                    <div className="grid h-72 grid-cols-5 items-end gap-3">
                      {(data.earnings.monthly || []).map((item) => (
                        <MiniBar key={item.month} label={item.month} value={item.revenue} max={16000} />
                      ))}
                    </div>
                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                      <PanelText>Platform commission: {data.profile?.platformCommission || 15}%</PanelText>
                      <PanelText>Completed paid sessions: {completedSessions.length}</PanelText>
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
                <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Video className="h-5 w-5 text-primary" />
                        Availability & Google Meet
                      </CardTitle>
                      <CardDescription>Set working slots and a default Google Meet room for online sessions.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Availability</label>
                        <Textarea
                          rows={4}
                          className="mt-2"
                          value={availability}
                          onChange={(event) => setAvailability(event.target.value)}
                          placeholder="Mon 10:00-14:00, Wed 12:00-17:00, Fri 16:00-19:00"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Default Google Meet link</label>
                        <Input className="mt-2" value={meetLink} onChange={(event) => setMeetLink(event.target.value)} placeholder="https://meet.google.com/..." />
                      </div>
                      <Button onClick={saveProfileTools}>Save dashboard settings</Button>
                    </CardContent>
                  </Card>

                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-secondary" />
                        Public Profile Snapshot
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <ProfileLine label="Badge" value={data.profile?.verificationBadge || "Verified Professional"} />
                      <ProfileLine label="Type" value={data.profile?.counsellorType || "professional"} />
                      <ProfileLine label="Pricing" value={formatMoney(data.profile?.sessionPricing)} />
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

function SessionCard({ appointment, draft, onDraft, onReschedule, onComplete, onCancel, onMeet }) {
  return (
    <div className="rounded-2xl border border-glass-border/40 bg-background/60 p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{appointment.studentName || appointment.studentEmail}</h3>
            <Badge className={statusTone[appointment.status] || "bg-foreground/10 text-foreground"}>{appointment.status}</Badge>
            <Badge className="bg-foreground/10 text-foreground">{appointment.mode}</Badge>
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
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={onReschedule}>Reschedule</Button>
            {appointment.meetingLink ? (
              <Button size="sm" variant="outline" asChild>
                <a href={appointment.meetingLink} target="_blank" rel="noreferrer">
                  <LinkIcon className="mr-1 h-4 w-4" />
                  Open Meet
                </a>
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={onMeet}>
                <Video className="mr-1 h-4 w-4" />
                Add Meet
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
      </div>
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

function MiniBar({ label, value, max }) {
  const height = Math.max(10, Math.min(100, ((Number(value) || 0) / max) * 100));
  return (
    <div className="flex h-full flex-col justify-end rounded-xl bg-foreground/5 p-3">
      <div className="rounded-lg bg-gradient-to-t from-primary to-secondary" style={{ height: `${height}%` }} />
      <div className="mt-2 text-center text-xs text-foreground/60">{label}</div>
      <div className="text-center text-xs font-semibold">{formatMoney(value)}</div>
    </div>
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
