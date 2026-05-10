import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Bell,
  BookOpen,
  CalendarClock,
  CalendarDays,
  Camera,
  CreditCard,
  Droplets,
  Dumbbell,
  EyeOff,
  FileText,
  Heart,
  HeartPulse,
  IdCard,
  LineChart,
  Lock,
  MessageCircle,
  Mic,
  Moon,
  NotebookPen,
  Palette,
  PhoneOff,
  PlayCircle,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Siren,
  Smile,
  Sparkles,
  Star,
  Timer,
  Users,
  Video,
  VideoOff,
  Volume2,
} from "lucide-react";
import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";
import GlowPanel from "@/components/reactbits/GlowPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { getRealtimeSocket } from "@/lib/socket";
import { useAppSelector } from "@/store/hooks";

const categories = ["All", "Anxiety", "Depression", "Stress", "PTSD", "Addiction", "Relationship issues", "Career pressure"];
const themeOptions = [
  { id: "default", name: "Midnight Calm", color: "bg-indigo-500" },
  { id: "lavender", name: "Lavender", color: "bg-violet-300" },
  { id: "sky", name: "Sky Blue", color: "bg-sky-300" },
  { id: "mint", name: "Mint Green", color: "bg-emerald-300" },
  { id: "soft", name: "Soft White", color: "bg-zinc-100" },
];

const emergencyKeywords = ["suicide", "self-harm", "panic attack", "abuse"];

const emptyData = {
  stats: {
    upcomingSessions: 0,
    completedSessions: 0,
    moodEntries: 0,
    latestRiskLevel: "not-started",
    moodScore: 4,
    wellnessStreak: 0,
    unreadMessages: 0,
    dailyTip: "Take a slow breath before your next task.",
  },
  appointments: [],
  moodEntries: [],
  recommendedResources: [],
  therapists: [],
  analytics: { weeklyMood: [], emotionalStability: 0, therapyProgress: 0, sleepQuality: 0 },
  journal: [],
  habits: [],
  messages: [],
  notifications: [],
  payments: { subscription: "Free", invoices: [] },
  emergency: { sosReady: true, helpline: "1800-599-0019", contact: "Not added" },
};

const UserDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const user = useAppSelector((state) => state.auth.user);
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [theme, setTheme] = useState(localStorage.getItem("mindsupport_theme") || "default");
  const [journalText, setJournalText] = useState("");
  const [activeTab, setActiveTab] = useState("home");
  const [messageRecipient, setMessageRecipient] = useState("");
  const [messageText, setMessageText] = useState("");
  const [messageFileUrl, setMessageFileUrl] = useState("");
  const [paying, setPaying] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpHint, setOtpHint] = useState("");

  const loadDashboard = useCallback(() => {
    let active = true;
    setLoading(true);
    apiFetch("/api/user/dashboard")
      .then((result) => {
        if (active) {
          setData({ ...emptyData, ...result });
          if (!messageRecipient && result.therapists?.[0]?.id) setMessageRecipient(result.therapists[0].id);
        }
      })
      .catch(() => {
        if (active) setData(emptyData);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [messageRecipient]);

  useEffect(() => loadDashboard(), [loadDashboard]);

  useEffect(() => {
    const socket = getRealtimeSocket();
    if (!socket) return undefined;
    const refresh = () => loadDashboard();
    socket.on("message:new", refresh);
    socket.on("notification:new", refresh);
    return () => {
      socket.off("message:new", refresh);
      socket.off("notification:new", refresh);
    };
  }, [loadDashboard]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("mindsupport_theme", theme);
  }, [theme]);

  const upcoming = data.appointments.filter((item) => !["cancelled", "completed", "declined"].includes(item.status)).slice(0, 4);
  const filteredTherapists = useMemo(() => {
    const q = search.toLowerCase();
    return data.therapists.filter((therapist) => {
      const matchesSearch =
        therapist.name?.toLowerCase().includes(q) ||
        therapist.specialization?.toLowerCase().includes(q) ||
        therapist.categories?.some((item) => item.toLowerCase().includes(q));
      const matchesCategory = category === "All" || therapist.categories?.includes(category);
      return matchesSearch && matchesCategory;
    });
  }, [category, data.therapists, search]);

  const submitJournal = async (sharedWithCounsellor = false) => {
    if (!journalText.trim()) {
      toast({ variant: "destructive", title: "Journal is empty", description: "Write a thought, trigger, or gratitude note first." });
      return;
    }
    try {
      await apiFetch("/api/journals", {
        method: "POST",
        body: JSON.stringify({
          title: sharedWithCounsellor ? "Shared reflection" : "Private reflection",
          content: journalText,
          sharedWithCounsellor,
        }),
      });
      toast({
        title: sharedWithCounsellor ? "Journal shared" : "Journal saved",
        description: sharedWithCounsellor ? "Your selected entry is available for counsellor review." : "Your private entry is saved securely.",
      });
      setJournalText("");
      loadDashboard();
    } catch (error) {
      toast({ variant: "destructive", title: "Journal save failed", description: error?.message || "" });
    }
  };

  const triggerSOS = async () => {
    try {
      await apiFetch("/api/wellness/emergency", {
        method: "POST",
        body: JSON.stringify({ message: "User dashboard SOS support requested" }),
      });
      toast({
        title: "Emergency support recorded",
        description: `Call ${data.emergency.helpline} or alert ${data.emergency.contact}.`,
      });
    } catch (error) {
      toast({ variant: "destructive", title: "Emergency request failed", description: error?.message || "" });
    }
  };

  const sendUserMessage = async () => {
    if (!messageRecipient || !messageText.trim()) {
      toast({ variant: "destructive", title: "Message is incomplete", description: "Choose a counsellor and write a message." });
      return;
    }
    try {
      await apiFetch("/api/messages", {
        method: "POST",
        body: JSON.stringify({
          to: messageRecipient,
          subject: "Session follow-up",
          text: messageText,
          fileUrl: messageFileUrl,
          fileName: messageFileUrl ? "Shared file" : "",
        }),
      });
      toast({ title: "Message sent", description: "Your counsellor can reply from their dashboard." });
      setMessageText("");
      setMessageFileUrl("");
      loadDashboard();
    } catch (error) {
      toast({ variant: "destructive", title: "Message failed", description: error?.message || "" });
    }
  };

  const payNextSession = async () => {
    setPaying(true);
    try {
      const target = data.appointments.find((appointment) => ["pending", "confirmed", "completed"].includes(appointment.status));
      await apiFetch("/api/payments/session", {
        method: "POST",
        body: JSON.stringify({ appointmentId: target?.id }),
      });
      toast({ title: "Payment confirmed", description: "Invoice added to your payment history." });
      loadDashboard();
    } catch (error) {
      toast({ variant: "destructive", title: "Payment failed", description: error?.message || "" });
    } finally {
      setPaying(false);
    }
  };

  const requestOtp = async () => {
    try {
      const response = await apiFetch("/api/auth/otp/request", {
        method: "POST",
        body: JSON.stringify({ channel: "email" }),
      });
      setOtpHint(response.devOtp ? `Development OTP: ${response.devOtp}` : `OTP sent to ${response.destination}`);
      toast({ title: "OTP sent", description: response.devOtp ? `Development OTP: ${response.devOtp}` : response.message });
    } catch (error) {
      toast({ variant: "destructive", title: "OTP request failed", description: error?.message || "" });
    }
  };

  const verifyOtp = async () => {
    try {
      await apiFetch("/api/auth/otp/verify", {
        method: "POST",
        body: JSON.stringify({ code: otpCode }),
      });
      setOtpCode("");
      setOtpHint("");
      toast({ title: "Account verified", description: "OTP verification is complete." });
      loadDashboard();
    } catch (error) {
      toast({ variant: "destructive", title: "OTP verification failed", description: error?.message || "" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-16">
        <section className="py-6 md:py-10 bg-gradient-to-br from-primary/8 via-background via-secondary/8 to-accent/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <GlowPanel className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                <div>
                  <Badge className="bg-primary/15 text-primary border border-primary/25">User dashboard</Badge>
                  <h1 className="text-3xl sm:text-4xl font-bold mt-3">Hi, {user?.name || "there"}</h1>
                  <p className="text-foreground/70 mt-2 max-w-2xl">
                    Book therapy, track your emotions, journal privately, and keep support close.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => navigate("/book")} className="gap-2">
                    <Video className="h-4 w-4" />
                    Book Session
                  </Button>
                </div>
              </div>
            </GlowPanel>

            <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-4">
              <Metric title="Upcoming sessions" value={data.stats.upcomingSessions} icon={CalendarDays} />
              <Metric title="Mood score" value={`${data.stats.moodScore}/5`} icon={Smile} />
              <Metric title="Wellness streak" value={`${data.stats.wellnessStreak} days`} icon={HeartPulse} />
              <Metric title="Unread messages" value={data.stats.unreadMessages} icon={MessageCircle} />
              <Metric title="Daily tip" value={data.stats.dailyTip} icon={Sparkles} compact />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="flex h-auto flex-wrap justify-start gap-2 bg-muted/60 p-2">
                <TabsTrigger value="home">Home</TabsTrigger>
                <TabsTrigger value="therapists">Therapists</TabsTrigger>
                <TabsTrigger value="sessions">Sessions</TabsTrigger>
                <TabsTrigger value="wellness">Wellness</TabsTrigger>
                <TabsTrigger value="journal">Journal</TabsTrigger>
                <TabsTrigger value="care">Self-care</TabsTrigger>
                <TabsTrigger value="payments">Payments</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="home" className="space-y-6">
                <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-6">
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CalendarClock className="h-5 w-5 text-primary" />
                        Therapy Booking Overview
                      </CardTitle>
                      <CardDescription>{loading ? "Loading your care plan..." : "Upcoming, reschedule-ready, and Meet-enabled sessions"}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {upcoming.length === 0 ? (
                        <PanelText>No upcoming sessions yet. Book a confidential online or offline appointment.</PanelText>
                      ) : (
                        upcoming.map((appointment) => (
                          <div key={appointment.id} className="rounded-lg border border-glass-border/40 bg-background/60 p-4">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div>
                                <div className="font-semibold">{appointment.counsellorName}</div>
                                <div className="text-sm text-foreground/70">
                                  {appointment.date} at {appointment.time}
                                </div>
                                <div className="text-xs text-foreground/60 mt-1 capitalize">{appointment.mode}</div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Badge variant="secondary">{appointment.status}</Badge>
                                {appointment.meetingLink && (
                                  <Button asChild size="sm" variant="outline" className="gap-2">
                                    <a href={appointment.meetingLink} target="_blank" rel="noreferrer">
                                      <Video className="h-4 w-4" />
                                      Join
                                    </a>
                                  </Button>
                                )}
                                <Button size="sm" variant="outline" onClick={() => navigate("/book")}>
                                  Reschedule
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <LineChart className="h-5 w-5 text-secondary" />
                        Personal Analytics
                      </CardTitle>
                      <CardDescription>Mood, stability, therapy progress, and sleep</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ProgressRow label="Emotional stability" value={data.analytics.emotionalStability} />
                      <ProgressRow label="Therapy progress" value={data.analytics.therapyProgress} />
                      <ProgressRow label="Sleep quality" value={data.analytics.sleepQuality} />
                      <div className="grid grid-cols-5 gap-2 pt-2">
                        {data.analytics.weeklyMood.map((entry) => (
                          <MiniBar key={entry.label} label={entry.label} value={entry.mood * 20} />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <FeatureTile icon={EyeOff} title="Anonymous Therapy" text="Use anonymous mode during counselling when privacy matters most." />
                  <FeatureTile icon={ShieldCheck} title="Counsellor Care Plan" text="Keep session notes, wellness tasks, and follow-up reminders in one private place." />
                  <FeatureTile icon={Users} title="Community Support" text="Join anonymous support groups and healing discussions in peer support." />
                </div>

                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5 text-primary" />
                      Notifications
                    </CardTitle>
                    <CardDescription>Session reminders, mood checks, counsellor messages, and payment confirmations</CardDescription>
                  </CardHeader>
                  <CardContent className="grid md:grid-cols-2 gap-3">
                    {(data.notifications || []).length === 0 ? (
                      <PanelText>No notifications yet.</PanelText>
                    ) : (
                      data.notifications.slice(0, 4).map((notification) => (
                        <div key={notification.id} className="rounded-lg bg-foreground/5 p-3">
                          <div className="font-medium">{notification.title}</div>
                          <div className="text-sm text-foreground/70">{notification.message}</div>
                          <div className="text-xs text-foreground/50 mt-1">{notification.time}</div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="therapists" className="space-y-6">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Search className="h-5 w-5 text-primary" />
                      Therapist Discovery
                    </CardTitle>
                    <CardDescription>Search by counsellor, specialization, rating, reviews, or availability.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-[1fr_260px] gap-3">
                      <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search anxiety, depression, career pressure..." />
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((item) => (
                            <SelectItem key={item} value={item}>
                              {item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      {filteredTherapists.map((therapist) => (
                        <div key={therapist.id} className="rounded-lg border border-glass-border/40 bg-background/60 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-semibold">{therapist.name}</div>
                              <div className="text-sm text-foreground/70">{therapist.specialization}</div>
                            </div>
                            <Badge className="bg-amber-500/15 text-amber-500">
                              <Star className="h-3 w-3 mr-1" />
                              {therapist.rating}
                            </Badge>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Badge className={therapist.counsellorType === "mentor" ? "bg-emerald-500/15 text-emerald-600" : "bg-blue-500/15 text-blue-600"}>
                              {therapist.badge || (therapist.counsellorType === "mentor" ? "Community Mentor" : "Verified Professional")}
                            </Badge>
                            {Number(therapist.rating) >= 4.8 && <Badge className="bg-amber-500/15 text-amber-600">Top Rated</Badge>}
                            {therapist.responseTime && <Badge variant="secondary">{therapist.responseTime}</Badge>}
                            {(therapist.categories || []).map((item) => (
                              <Badge key={item} variant="secondary">
                                {item}
                              </Badge>
                            ))}
                          </div>
                          <div className="mt-3 text-xs text-foreground/60">
                            {therapist.reviews} reviews - {therapist.experience || "Experience verified"} - Next slot: {therapist.nextSlot}
                          </div>
                          <div className="mt-1 text-xs text-foreground/60">
                            Languages: {(therapist.languages || []).join(", ") || "English"} - From ₹{therapist.sessionPricing || 500}/session
                          </div>
                          <Button className="mt-4 w-full" onClick={() => navigate("/book")}>
                            Book with counsellor
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="sessions" className="space-y-6">
                <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-6">
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Video className="h-5 w-5 text-primary" />
                        Online Video Session
                      </CardTitle>
                      <CardDescription>Secure session room controls and timer preview</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="rounded-xl border border-glass-border/40 bg-background/70 p-5">
                        <div className="aspect-video rounded-lg bg-foreground/5 flex items-center justify-center">
                          <Video className="h-12 w-12 text-primary" />
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-foreground/70">
                            <Timer className="h-4 w-4" />
                            00:45:00 session timer
                          </div>
                          <Badge>Encrypted</Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <Button variant="outline" className="gap-1">
                          <Mic className="h-4 w-4" /> Audio
                        </Button>
                        <Button variant="outline" className="gap-1">
                          <Camera className="h-4 w-4" /> Video
                        </Button>
                        <Button variant="outline" className="gap-1">
                          <MessageCircle className="h-4 w-4" /> Chat
                        </Button>
                        <Button variant="outline" className="gap-1">
                          <PhoneOff className="h-4 w-4" /> End
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle>Session Booking Tools</CardTitle>
                      <CardDescription>Book, reschedule, cancel, and choose online/offline mode</CardDescription>
                    </CardHeader>
                    <CardContent className="grid sm:grid-cols-2 gap-3">
                      <ActionCard title="Book new session" text="Choose therapist, date, time, and mode." action="Book" onClick={() => navigate("/book")} />
                      <ActionCard title="Reschedule" text="Move an appointment to a better slot." action="Open bookings" onClick={() => navigate("/book")} />
                      <ActionCard title="Cancel session" text="Cancel while keeping your history private." action="Manage" onClick={() => navigate("/book")} />
                      <ActionCard title="Session follow-up" text="View chat, tasks, and counsellor notes." action="Messages" />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="wellness" className="space-y-6">
                <div className="grid lg:grid-cols-[1fr_0.9fr] gap-6">
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Smile className="h-5 w-5 text-primary" />
                        Mood Tracker
                      </CardTitle>
                      <CardDescription>Daily mood, stress, sleep, and anxiety tracking</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid sm:grid-cols-4 gap-3">
                        <Tracker label="Mood emoji" value="🙂 Good" />
                        <Tracker label="Stress level" value="4/10" />
                        <Tracker label="Sleep quality" value="7/10" />
                        <Tracker label="Anxiety level" value="3/10" />
                      </div>
                      <Button onClick={() => navigate("/wellness")}>Open Full Mood Tracker</Button>
                    </CardContent>
                  </Card>

                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-secondary" />
                        Habit Tracking
                      </CardTitle>
                      <CardDescription>Sleep, meditation, exercise, and hydration</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {data.habits.map((habit) => (
                        <ProgressRow key={habit.name} label={`${habit.name} - ${habit.value}`} value={habit.progress} />
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="journal" className="space-y-6">
                <div className="grid lg:grid-cols-[1fr_0.9fr] gap-6">
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <NotebookPen className="h-5 w-5 text-primary" />
                        Private Journal
                      </CardTitle>
                      <CardDescription>Daily thoughts, gratitude notes, and emotional triggers</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Textarea rows={7} value={journalText} onChange={(event) => setJournalText(event.target.value)} placeholder="Write what you noticed today..." />
                      {emergencyKeywords.some((keyword) => journalText.toLowerCase().includes(keyword)) && (
                        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
                          Emergency support is available now: call 1800-599-0019, 988 where available, or local emergency services.
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Button onClick={() => submitJournal(false)}>Save private entry</Button>
                        <Button variant="outline" onClick={() => submitJournal(true)}>Share selected entry</Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle>Recent Entries</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {data.journal.map((entry) => (
                        <div key={entry.id} className="rounded-lg border border-glass-border/40 bg-background/60 p-3">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{entry.title}</div>
                            <Badge variant="secondary">{entry.shared ? "Shared" : "Private"}</Badge>
                          </div>
                          <p className="text-sm text-foreground/70 mt-2">{entry.excerpt}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="care" className="space-y-6">
                <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
                  <ResourceTile icon={Volume2} title="Meditation Audios" text="Guided grounding and body-scan audios." />
                  <ResourceTile icon={PlayCircle} title="Breathing Exercises" text="Box breathing and 4-7-8 calm routines." />
                  <ResourceTile icon={FileText} title="Motivation Articles" text="Self-help, confidence, and study pressure reads." />
                  <ResourceTile icon={VideoOff} title="Wellness Videos" text="Mental wellness videos and therapy homework." />
                </div>
                <div className="grid lg:grid-cols-2 gap-6">
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageCircle className="h-5 w-5 text-primary" />
                        Secure Chat System
                      </CardTitle>
                      <CardDescription>User to counsellor messaging, files, and session follow-up</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {data.messages.length === 0 ? (
                        <PanelText>No messages yet. Send a follow-up when you book a counsellor.</PanelText>
                      ) : data.messages.map((message) => (
                        <div key={message.id || `${message.from}-${message.subject}`} className="rounded-lg bg-foreground/5 p-3 flex items-center justify-between">
                          <div>
                            <div className="font-medium">{message.direction === "sent" ? `To ${message.to}` : message.from}</div>
                            <div className="text-sm text-foreground/70">{message.subject}: {message.text}</div>
                            {message.fileUrl && <a className="text-xs text-primary hover:underline" href={message.fileUrl} target="_blank" rel="noreferrer">Open shared file</a>}
                          </div>
                          {message.unread && <Badge>Unread</Badge>}
                        </div>
                      ))}
                      <div className="rounded-lg border border-glass-border/40 bg-background/60 p-3 space-y-3">
                        <div className="grid md:grid-cols-[220px_1fr] gap-3">
                          <Select value={messageRecipient} onValueChange={setMessageRecipient}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose counsellor" />
                            </SelectTrigger>
                            <SelectContent>
                              {data.therapists.map((therapist) => (
                                <SelectItem key={therapist.id} value={therapist.id}>
                                  {therapist.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input value={messageFileUrl} onChange={(event) => setMessageFileUrl(event.target.value)} placeholder="Optional file or resource URL" />
                        </div>
                        <Textarea rows={3} value={messageText} onChange={(event) => setMessageText(event.target.value)} placeholder="Write a secure message or follow-up question..." />
                        <Button onClick={sendUserMessage}>Send secure message</Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="glass-card border-emergency/30">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Siren className="h-5 w-5 text-emergency" />
                        Emergency Support
                      </CardTitle>
                      <CardDescription>SOS, crisis helpline, and emergency contact alert</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <PanelText>Helpline: {data.emergency.helpline}</PanelText>
                      <PanelText>Emergency contact: {data.emergency.contact}</PanelText>
                      <Button onClick={triggerSOS} className="w-full bg-emergency text-emergency-foreground hover:bg-emergency/90">
                        SOS Support
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="payments" className="space-y-6">
                <div className="grid lg:grid-cols-[0.85fr_1.15fr] gap-6">
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-primary" />
                        Payments & Subscription
                      </CardTitle>
                      <CardDescription>Pay for sessions, buy subscriptions, and view invoices</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <PanelText>Plan: {data.payments.subscription}</PanelText>
                      <PanelText>Next billing: {data.payments.nextBillingDate || "Not scheduled"}</PanelText>
                      <Button onClick={payNextSession} disabled={paying}>{paying ? "Processing..." : "Pay for next session"}</Button>
                    </CardContent>
                  </Card>
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle>Invoices</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {(data.payments.invoices || []).map((invoice) => (
                        <div key={invoice.id} className="rounded-lg bg-foreground/5 p-3 flex items-center justify-between">
                          <div>
                            <div className="font-medium">{invoice.id}</div>
                            <div className="text-sm text-foreground/70">{invoice.date}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">₹{invoice.amount}</div>
                            <Badge variant="secondary">{invoice.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-6">
                <div className="grid lg:grid-cols-[1fr_0.8fr] gap-6">
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Palette className="h-5 w-5 text-primary" />
                        Theme Settings
                      </CardTitle>
                      <CardDescription>Choose a calm, safe, minimal, emotionally comforting dashboard theme.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
                      {themeOptions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setTheme(option.id)}
                          className={`rounded-lg border p-4 text-left transition ${
                            theme === option.id ? "border-primary bg-primary/10" : "border-glass-border/40 bg-background/60"
                          }`}
                        >
                          <span className={`block h-8 w-8 rounded-full ${option.color} mb-3 border border-white/30`} />
                          <span className="font-medium">{option.name}</span>
                        </button>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <IdCard className="h-5 w-5 text-primary" />
                        OTP Verification
                      </CardTitle>
                      <CardDescription>Verify your account with a six digit OTP.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <PanelText>Status: {data.profile?.otpVerified ? "Verified" : "Not verified"}</PanelText>
                      {!data.profile?.otpVerified && (
                        <>
                          <div className="flex gap-2">
                            <Input value={otpCode} onChange={(event) => setOtpCode(event.target.value)} placeholder="6 digit OTP" maxLength={6} />
                            <Button variant="outline" onClick={requestOtp}>Send OTP</Button>
                          </div>
                          {otpHint && <PanelText>{otpHint}</PanelText>}
                          <Button onClick={verifyOtp} disabled={otpCode.length !== 6}>Verify OTP</Button>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <FeatureTile icon={Lock} title="Security" text="JWT authentication, role-based access, and login tracking are enabled." />
                  <FeatureTile icon={Bell} title="Notifications" text="Session reminders, mood checks, counsellor messages, and payment alerts." />
                  <FeatureTile icon={Shield} title="Privacy" text="Journal and session data remain private unless you choose to share." />
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

function Metric({ title, value, icon: Icon, compact = false }) {
  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={compact ? "text-sm font-medium leading-snug" : "text-2xl font-bold capitalize"}>{value}</div>
      </CardContent>
    </Card>
  );
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
    <div className="h-28 rounded-lg bg-foreground/5 p-2 flex flex-col justify-end">
      <div className="rounded-md bg-primary/70" style={{ height: `${Math.max(12, value)}%` }} />
      <div className="text-center text-[10px] text-foreground/60 mt-2">{label}</div>
    </div>
  );
}

function PanelText({ children }) {
  return <div className="rounded-lg border border-glass-border/40 bg-background/60 p-3 text-sm text-foreground/75">{children}</div>;
}

function FeatureTile({ icon: Icon, title, text }) {
  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <Icon className="h-5 w-5 text-primary mb-3" />
        <div className="font-semibold">{title}</div>
        <p className="text-sm text-foreground/70 mt-1">{text}</p>
      </CardContent>
    </Card>
  );
}

function ResourceTile({ icon: Icon, title, text }) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-foreground/70">{text}</CardContent>
    </Card>
  );
}

function ActionCard({ title, text, action, onClick }) {
  return (
    <div className="rounded-lg border border-glass-border/40 bg-background/60 p-4">
      <div className="font-semibold">{title}</div>
      <p className="text-sm text-foreground/70 mt-1 min-h-10">{text}</p>
      <Button size="sm" variant="outline" className="mt-3" onClick={onClick}>
        {action}
      </Button>
    </div>
  );
}

function Tracker({ label, value }) {
  return (
    <div className="rounded-lg border border-glass-border/40 bg-background/60 p-4 text-center">
      <div className="text-xs text-foreground/60">{label}</div>
      <div className="font-semibold mt-1">{value}</div>
    </div>
  );
}

export default UserDashboard;
