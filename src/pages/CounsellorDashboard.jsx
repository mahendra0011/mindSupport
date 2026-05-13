import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  Bell,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Clock,
  CreditCard,
  FileText,
  MessageSquareText,
  Star,
  Timer,
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

const CounsellorDashboard = () => {
  const { toast } = useToast();
  const [data, setData] = useState(fallback);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState({});
  const [availability, setAvailability] = useState("");
  const [messageRecipient, setMessageRecipient] = useState("");
  const [messageText, setMessageText] = useState("");
  const [messageFileUrl, setMessageFileUrl] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiFetch("/api/counsellor/dashboard");
      setData({ ...fallback, ...result });
      setAvailability((result.profile?.availability || []).join(", "));
      if (!messageRecipient && result.patients?.[0]?.id) setMessageRecipient(result.patients[0].id);
    } catch (error) {
      toast({ variant: "destructive", title: "Unable to load dashboard", description: error?.message || "" });
    } finally {
      setLoading(false);
    }
  }, [messageRecipient, toast]);

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

  const updateAppointment = async (appointmentId, payload) => {
    try {
      await apiFetch(`/api/appointments/${appointmentId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      toast({ title: "Session updated" });
      await load();
    } catch (error) {
      toast({ variant: "destructive", title: "Update failed", description: error?.message || "" });
    }
  };

  const createMeet = async (appointmentId) => {
    try {
      const response = await apiFetch(`/api/meet/create`, {
        method: "POST",
        body: JSON.stringify({ appointmentId }),
      });
      toast({ title: "Google Meet ready", description: response.meetingLink });
      await load();
    } catch (error) {
      toast({ variant: "destructive", title: "Meet link failed", description: error?.message || "" });
    }
  };

  const saveAvailability = async () => {
    try {
      await apiFetch("/api/counsellor/availability", {
        method: "PUT",
        body: JSON.stringify({
          availability: availability.split(",").map((item) => item.trim()).filter(Boolean),
        }),
      });
      toast({ title: "Availability updated" });
      await load();
    } catch (error) {
      toast({ variant: "destructive", title: "Availability update failed", description: error?.message || "" });
    }
  };

  const sendCounsellorMessage = async () => {
    if (!messageRecipient || !messageText.trim()) {
      toast({ variant: "destructive", title: "Message is incomplete", description: "Choose a user and write a message." });
      return;
    }
    try {
      await apiFetch("/api/messages", {
        method: "POST",
        body: JSON.stringify({
          to: messageRecipient,
          subject: "Counsellor follow-up",
          text: messageText,
          task: messageText,
          fileUrl: messageFileUrl,
          fileName: messageFileUrl ? "Shared resource" : "",
        }),
      });
      toast({ title: "Message sent", description: "The user will see it in their secure dashboard." });
      setMessageText("");
      setMessageFileUrl("");
      await load();
    } catch (error) {
      toast({ variant: "destructive", title: "Message failed", description: error?.message || "" });
    }
  };

  const pending = data.appointments.filter((item) => item.status === "pending");
  const schedule = data.appointments.filter((item) => ["pending", "confirmed"].includes(item.status));

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-16">
        <section className="dashboard-motion py-6 md:py-10 bg-gradient-to-br from-primary/8 via-background via-secondary/8 to-accent/5">
          <div className="dashboard-shell max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <GlowPanel className="dashboard-panel p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <Badge className="bg-secondary/15 text-secondary border border-secondary/25">Counsellor dashboard</Badge>
                  <h1 className="text-3xl sm:text-4xl font-bold mt-3">{data.profile?.name || "Counsellor workspace"}</h1>
                  <p className="text-foreground/70 mt-2">
                    Manage patients, sessions, notes, communication, analytics, earnings, and reviews.
                  </p>
                </div>
                <Button variant="outline" onClick={load} disabled={loading}>
                  Refresh
                </Button>
              </div>
            </GlowPanel>

            <div className="dashboard-stagger grid md:grid-cols-2 xl:grid-cols-5 gap-4">
              <Metric title="Today's sessions" value={data.stats.todaySessions} icon={Clock} />
              <Metric title="Active patients" value={data.stats.activeClients} icon={Users} />
              <Metric title="Earnings" value={`₹${data.stats.earnings}`} icon={CreditCard} />
              <Metric title="Pending requests" value={data.stats.pendingRequests} icon={ClipboardList} />
              <Metric title="Rating" value={data.stats.rating} icon={Star} />
            </div>

            <Tabs defaultValue="home">
              <TabsList className="dashboard-panel flex h-auto flex-wrap justify-start gap-2 bg-muted/60 p-2">
                <TabsTrigger value="home">Home</TabsTrigger>
                <TabsTrigger value="patients">Patients</TabsTrigger>
                <TabsTrigger value="sessions">Sessions</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="progress">Progress</TabsTrigger>
                <TabsTrigger value="chat">Chat</TabsTrigger>
                <TabsTrigger value="earnings">Earnings</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
              </TabsList>

              <TabsContent value="home" className="dashboard-tab-motion space-y-6">
                <div className="grid lg:grid-cols-[1fr_0.9fr] gap-6">
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CalendarCheck className="h-5 w-5 text-primary" />
                        Recent Activity
                      </CardTitle>
                      <CardDescription>Bookings, reminders, emergency notices, and messages</CardDescription>
                    </CardHeader>
                    <CardContent className="grid sm:grid-cols-2 gap-3">
                      {data.notifications.map((item) => (
                        <PanelText key={item}>{item}</PanelText>
                      ))}
                      <PanelText>Unread messages: {data.stats.unreadMessages}</PanelText>
                    </CardContent>
                  </Card>

                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5 text-secondary" />
                        Daily Care Checklist
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {data.actions.map((action) => (
                        <PanelText key={action}>{action}</PanelText>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="patients" className="dashboard-tab-motion space-y-6">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserCheck className="h-5 w-5 text-primary" />
                      Patient Management
                    </CardTitle>
                    <CardDescription>Assigned users, therapy history, mood reports, and progress signals</CardDescription>
                  </CardHeader>
                  <CardContent className="grid md:grid-cols-2 gap-4">
                    {data.patients.map((patient) => (
                      <div key={patient.id} className="rounded-lg border border-glass-border/40 bg-background/60 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold">{patient.name}</div>
                            <div className="text-sm text-foreground/70">{patient.email}</div>
                          </div>
                          <Badge variant={patient.risk === "high" ? "destructive" : "secondary"}>{patient.risk}</Badge>
                        </div>
                        <div className="mt-3 text-sm text-foreground/75">{patient.therapyHistory} - {patient.moodReport}</div>
                        <div className="mt-3">
                          <ProgressRow label="Recovery progress" value={patient.progress} />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="sessions" className="dashboard-tab-motion space-y-6">
                <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-6">
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ClipboardList className="h-5 w-5 text-primary" />
                        Booking Requests
                      </CardTitle>
                      <CardDescription>Accept, reject, reschedule, or create a Google Meet session</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {pending.length === 0 ? (
                        <PanelText>No pending requests right now.</PanelText>
                      ) : (
                        pending.map((appointment) => (
                          <SessionCard
                            key={appointment.id}
                            appointment={appointment}
                            onConfirm={() => updateAppointment(appointment.id, { status: "confirmed" })}
                            onDecline={() => updateAppointment(appointment.id, { status: "declined" })}
                            onMeet={() => createMeet(appointment.id)}
                          />
                        ))
                      )}
                    </CardContent>
                  </Card>

                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle>Schedule & Availability</CardTitle>
                      <CardDescription>Manage your active schedule and available windows</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-2">
                        <Input value={availability} onChange={(event) => setAvailability(event.target.value)} placeholder="Mon 10:00-14:00, Wed 12:00-17:00" />
                        <Button onClick={saveAvailability}>Save</Button>
                      </div>
                      {schedule.map((appointment) => (
                        <div key={appointment.id} className="rounded-lg border border-glass-border/40 bg-background/60 p-4">
                          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                            <div>
                              <div className="font-semibold">{appointment.studentName || appointment.studentEmail}</div>
                              <div className="text-sm text-foreground/70">
                                {appointment.date} at {appointment.time}
                              </div>
                              <div className="flex flex-wrap gap-2 mt-2">
                                <Badge variant="secondary">{appointment.status}</Badge>
                                <Badge className="bg-foreground/10 text-foreground">{appointment.mode}</Badge>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {appointment.meetingLink ? (
                                <Button asChild size="sm" variant="outline">
                                  <a href={appointment.meetingLink} target="_blank" rel="noreferrer">Open Meet</a>
                                </Button>
                              ) : (
                                <Button size="sm" variant="outline" onClick={() => createMeet(appointment.id)}>Add Meet</Button>
                              )}
                              <Button size="sm" variant="outline" onClick={() => updateAppointment(appointment.id, { status: "completed", notes: notes[appointment.id] || appointment.notes || "" })}>
                                Complete
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="notes" className="dashboard-tab-motion space-y-6">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Session Notes & Treatment Plans
                    </CardTitle>
                    <CardDescription>Confidential notes, recommendations, and care plans after each session</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {schedule.map((appointment) => (
                      <div key={appointment.id} className="rounded-lg border border-glass-border/40 bg-background/60 p-4">
                        <div className="font-semibold">{appointment.studentName || appointment.studentEmail}</div>
                        <Textarea
                          rows={4}
                          className="mt-3"
                          value={notes[appointment.id] ?? appointment.notes ?? ""}
                          onChange={(event) => setNotes((prev) => ({ ...prev, [appointment.id]: event.target.value }))}
                          placeholder="Write confidential session notes, recommendations, and treatment plan..."
                        />
                        <Button className="mt-3" onClick={() => updateAppointment(appointment.id, { notes: notes[appointment.id] || "" })}>
                          Save notes
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="progress" className="dashboard-tab-motion space-y-6">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      Therapy Progress Tracking
                    </CardTitle>
                    <CardDescription>Mood improvement, anxiety reduction, attendance, and recovery progress</CardDescription>
                  </CardHeader>
                  <CardContent className="grid md:grid-cols-2 gap-5">
                    {data.progress.map((item) => (
                      <ProgressRow key={item.label} label={item.label} value={item.value} />
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="chat" className="dashboard-tab-motion space-y-6">
                <div className="grid lg:grid-cols-[1fr_0.85fr] gap-6">
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquareText className="h-5 w-5 text-primary" />
                        Chat & Communication
                      </CardTitle>
                      <CardDescription>Chat with users, share resources, and send wellness tasks</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {data.messages.length === 0 ? (
                        <PanelText>No messages yet.</PanelText>
                      ) : data.messages.map((message) => (
                        <div key={message.id || `${message.from}-${message.text}`} className="rounded-lg bg-foreground/5 p-3 flex items-center justify-between">
                          <div>
                            <div className="font-medium">{message.direction === "sent" ? `To ${message.to}` : message.from}</div>
                            <div className="text-sm text-foreground/70">{message.subject}: {message.text}</div>
                            {message.task && <div className="text-xs text-secondary mt-1">Task: {message.task}</div>}
                            {message.fileUrl && <a className="text-xs text-primary hover:underline" href={message.fileUrl} target="_blank" rel="noreferrer">Open shared resource</a>}
                          </div>
                          {message.unread && <Badge>Unread</Badge>}
                        </div>
                      ))}
                      <div className="rounded-lg border border-glass-border/40 bg-background/60 p-3 space-y-3">
                        <div className="grid md:grid-cols-[220px_1fr] gap-3">
                          <Select value={messageRecipient} onValueChange={setMessageRecipient}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose user" />
                            </SelectTrigger>
                            <SelectContent>
                              {data.patients.map((patient) => (
                                <SelectItem key={patient.id} value={patient.id}>
                                  {patient.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input value={messageFileUrl} onChange={(event) => setMessageFileUrl(event.target.value)} placeholder="Optional resource or file URL" />
                        </div>
                        <Textarea rows={3} value={messageText} onChange={(event) => setMessageText(event.target.value)} placeholder="Send a wellness task, resource, or follow-up..." />
                        <Button onClick={sendCounsellorMessage}>Send</Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Video className="h-5 w-5 text-secondary" />
                        Google Meet Session Tools
                      </CardTitle>
                      <CardDescription>Use session cards to create or open Google Meet links without in-app call controls.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <PanelText><Timer className="inline h-4 w-4 mr-2" />Session history and live timer</PanelText>
                      <PanelText><Video className="inline h-4 w-4 mr-2" />Create or open Google Meet from booking requests and schedule cards.</PanelText>
                      <PanelText><FileText className="inline h-4 w-4 mr-2" />Save meeting notes and treatment plans after each session.</PanelText>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="earnings" className="dashboard-tab-motion space-y-6">
                <div className="grid md:grid-cols-3 gap-4">
                  <Metric title="Total earnings" value={`₹${data.earnings.total}`} icon={CreditCard} />
                  <Metric title="Session revenue" value={`₹${data.earnings.sessionRevenue}`} icon={CalendarCheck} />
                  <Metric title="Pending payouts" value={`₹${data.earnings.pendingPayouts}`} icon={Clock} />
                </div>
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle>Monthly Analytics</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-5 gap-2">
                    {data.earnings.monthly.map((item) => (
                      <MiniBar key={item.month} label={item.month} value={Math.min(100, item.revenue / 150)} />
                    ))}
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
                    <CardDescription>Monitor ratings and respond to feedback professionally</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {data.reviews.length === 0 ? (
                      <PanelText>No session reviews yet.</PanelText>
                    ) : data.reviews.map((review) => (
                      <div key={review.id || `${review.user}-${review.text}`} className="rounded-lg border border-glass-border/40 bg-background/60 p-4">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold">{review.studentName || review.user || "Anonymous user"}</div>
                          <Badge className="bg-amber-500/15 text-amber-500">{review.rating} stars</Badge>
                        </div>
                        <p className="text-sm text-foreground/70 mt-2">{review.comment || review.text || "No written comment."}</p>
                        <Button size="sm" variant="outline" className="mt-3">Respond</Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

function Metric({ title, value, icon: Icon }) {
  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold capitalize">{value}</div>
      </CardContent>
    </Card>
  );
}

function PanelText({ children }) {
  return <div className="rounded-lg border border-glass-border/40 bg-background/60 p-3 text-sm text-foreground/75">{children}</div>;
}

function ProgressRow({ label, value }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2 text-sm">
        <span className="text-foreground/75">{label}</span>
        <span className="font-semibold">{value}%</span>
      </div>
      <Progress value={value} />
    </div>
  );
}

function MiniBar({ label, value }) {
  return (
    <div className="h-36 rounded-lg bg-foreground/5 p-2 flex flex-col justify-end">
      <div className="rounded-md bg-primary/70" style={{ height: `${Math.max(12, value)}%` }} />
      <div className="text-center text-xs text-foreground/60 mt-2">{label}</div>
    </div>
  );
}

function SessionCard({ appointment, onConfirm, onDecline, onMeet }) {
  return (
    <div className="rounded-lg border border-glass-border/40 p-4 bg-background/60">
      <div className="font-semibold">{appointment.studentName || appointment.studentEmail}</div>
      <div className="text-sm text-foreground/70">
        {appointment.date} at {appointment.time}
      </div>
      {appointment.concern && <p className="text-sm mt-2 text-foreground/80">{appointment.concern}</p>}
      <div className="flex flex-wrap gap-2 mt-4">
        <Button size="sm" onClick={onConfirm}>Accept</Button>
        <Button size="sm" variant="outline" onClick={onMeet}>
          <Video className="h-4 w-4 mr-1" />
          Start Meet
        </Button>
        <Button size="sm" variant="outline" onClick={onDecline}>Reject</Button>
      </div>
    </div>
  );
}

export default CounsellorDashboard;
