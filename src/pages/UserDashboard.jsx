import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Bell,
  BookOpen,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Crown,
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
  Moon,
  NotebookPen,
  Palette,
  Paperclip,
  PlayCircle,
  Search,
  Send,
  Settings,
  Shield,
  ShieldCheck,
  Siren,
  Smile,
  Sparkles,
  Star,
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

const subscriptionPlans = [
  {
    id: "starter",
    name: "Care Starter",
    price: 499,
    period: "month",
    description: "For light support and guided self-care.",
    features: ["Unlimited resource access", "Mood and journal tools", "Community support"],
  },
  {
    id: "plus",
    name: "Wellness Plus",
    price: 999,
    period: "month",
    description: "Best for regular counselling support.",
    features: ["Priority counsellor chat", "2 discounted sessions", "Wellness progress reports"],
    popular: true,
  },
  {
    id: "premium",
    name: "Premium Care",
    price: 1999,
    period: "month",
    description: "More frequent support and deeper tracking.",
    features: ["Unlimited chat follow-ups", "4 discounted sessions", "Advanced care insights"],
  },
];

function formatRupees(value = 0) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

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
  const [journalTitle, setJournalTitle] = useState("");
  const [journalMood, setJournalMood] = useState("");
  const [journalGratitude, setJournalGratitude] = useState("");
  const [journalTrigger, setJournalTrigger] = useState("");
  const [activeTab, setActiveTab] = useState("home");
  const [messageRecipient, setMessageRecipient] = useState("");
  const [messageText, setMessageText] = useState("");
  const [messageFileUrl, setMessageFileUrl] = useState("");
  const [paying, setPaying] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("plus");
  const [notificationPrefs, setNotificationPrefs] = useState({
    session: true,
    mood: true,
    messages: true,
    payments: true,
  });
  const [privacyPrefs, setPrivacyPrefs] = useState({
    anonymousDefault: false,
    shareJournal: false,
    crisisAlerts: true,
  });
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

  const chatMessages = useMemo(() => [...(data.messages || [])].reverse(), [data.messages]);
  const selectedPlanData = subscriptionPlans.find((plan) => plan.id === selectedPlan) || subscriptionPlans[1];
  const latestMood = data.moodEntries?.[0]?.mood || data.stats.moodScore || 4;
  const currentRisk = data.latestAssessment?.level || data.stats.latestRiskLevel || "not-started";

  const submitJournal = async (sharedWithCounsellor = false) => {
    if (!journalText.trim()) {
      toast({ variant: "destructive", title: "Journal is empty", description: "Write a thought, trigger, or gratitude note first." });
      return;
    }
    try {
      await apiFetch("/api/journals", {
        method: "POST",
        body: JSON.stringify({
          title: journalTitle.trim() || (sharedWithCounsellor ? "Shared reflection" : "Private reflection"),
          content: journalText,
          mood: journalMood || undefined,
          gratitude: journalGratitude || undefined,
          trigger: journalTrigger || undefined,
          sharedWithCounsellor,
        }),
      });
      toast({
        title: sharedWithCounsellor ? "Journal shared" : "Journal saved",
        description: sharedWithCounsellor ? "Your selected entry is available for counsellor review." : "Your private entry is saved securely.",
      });
      setJournalText("");
      setJournalTitle("");
      setJournalMood("");
      setJournalGratitude("");
      setJournalTrigger("");
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

  const paySubscription = async (plan = selectedPlanData) => {
    setPaying(true);
    try {
      await apiFetch("/api/payments/session", {
        method: "POST",
        body: JSON.stringify({
          kind: "subscription",
          plan: plan.name,
          amount: plan.price,
          description: `${plan.name} subscription`,
        }),
      });
      toast({ title: "Subscription activated", description: `${plan.name} is recorded at ${formatRupees(plan.price)}/month.` });
      loadDashboard();
    } catch (error) {
      toast({ variant: "destructive", title: "Subscription failed", description: error?.message || "" });
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
                <TabsTrigger value="chat">Chat</TabsTrigger>
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
                            Languages: {(therapist.languages || []).join(", ") || "English"} - From {formatRupees(therapist.sessionPricing || 500)} / session
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
                <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-6">
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CalendarDays className="h-5 w-5 text-primary" />
                        My Sessions
                      </CardTitle>
                      <CardDescription>Book, reschedule, cancel, and join Google Meet sessions from one clean place.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {data.appointments.length === 0 ? (
                        <PanelText>No sessions yet. Choose a counsellor and book your first appointment.</PanelText>
                      ) : (
                        data.appointments.map((appointment) => (
                          <SessionCard key={appointment.id} appointment={appointment} onBook={() => navigate("/book")} onChat={() => setActiveTab("chat")} />
                        ))
                      )}
                    </CardContent>
                  </Card>

                  <div className="space-y-4">
                    <Card className="glass-card">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Video className="h-5 w-5 text-secondary" />
                          Session Actions
                        </CardTitle>
                        <CardDescription>Fast controls for the session flow.</CardDescription>
                      </CardHeader>
                      <CardContent className="grid gap-3">
                        <ActionCard title="Book new session" text="Choose counsellor, date, time, and online/offline mode." action="Book" onClick={() => navigate("/book")} />
                        <ActionCard title="Manage appointments" text="Reschedule, cancel, or review completed sessions." action="Open bookings" onClick={() => navigate("/book")} />
                        <ActionCard title="Follow-up chat" text="Ask a question after a session or share a resource." action="Open chat" onClick={() => setActiveTab("chat")} />
                      </CardContent>
                    </Card>

                    <Card className="glass-card border-primary/25">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center gap-2 font-semibold">
                          <ShieldCheck className="h-5 w-5 text-primary" />
                          Session Safety
                        </div>
                        <p className="text-sm text-foreground/70">
                          Online sessions use Google Meet links. For emergencies, use local emergency services or the crisis support options.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="wellness" className="space-y-6">
                <div className="grid lg:grid-cols-[1fr_0.9fr] gap-6">
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" />
                        Wellness Snapshot
                      </CardTitle>
                      <CardDescription>Daily mood, stress balance, sleep, anxiety, and progress in one place.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="grid sm:grid-cols-4 gap-3">
                        <Tracker label="Mood score" value={`${latestMood}/5`} />
                        <Tracker label="Entries" value={data.stats.moodEntries} />
                        <Tracker label="Streak" value={`${data.stats.wellnessStreak} days`} />
                        <Tracker label="Risk" value={currentRisk.replace("-", " ")} />
                      </div>
                      <div className="space-y-4">
                        <ProgressRow label="Emotional stability" value={data.analytics.emotionalStability} />
                        <ProgressRow label="Therapy progress" value={data.analytics.therapyProgress} />
                        <ProgressRow label="Sleep quality" value={data.analytics.sleepQuality} />
                      </div>
                      <Button onClick={() => navigate("/wellness")} className="gap-2">
                        <HeartPulse className="h-4 w-4" />
                        Open Full Wellness Dashboard
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-secondary" />
                        Habit Tracking
                      </CardTitle>
                      <CardDescription>Simple daily habits that support sleep, calm, movement, and hydration.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid sm:grid-cols-2 gap-3">
                        <MiniHabit icon={Moon} label="Sleep" />
                        <MiniHabit icon={Heart} label="Meditation" />
                        <MiniHabit icon={Dumbbell} label="Exercise" />
                        <MiniHabit icon={Droplets} label="Hydration" />
                      </div>
                      <div className="space-y-3">
                        {data.habits.length === 0 ? (
                          <PanelText>No habit data yet. Add entries from the full wellness tracker.</PanelText>
                        ) : (
                          data.habits.map((habit) => (
                            <ProgressRow key={habit.name} label={`${habit.name} - ${habit.value}`} value={habit.progress} />
                          ))
                        )}
                      </div>
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
                      <CardDescription>Write daily thoughts, gratitude notes, and emotional triggers without clutter.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid md:grid-cols-[1fr_180px] gap-3">
                        <Input value={journalTitle} onChange={(event) => setJournalTitle(event.target.value)} placeholder="Entry title" />
                        <Select value={journalMood} onValueChange={setJournalMood}>
                          <SelectTrigger>
                            <SelectValue placeholder="Mood" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Calm">Calm</SelectItem>
                            <SelectItem value="Hopeful">Hopeful</SelectItem>
                            <SelectItem value="Stressed">Stressed</SelectItem>
                            <SelectItem value="Low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Textarea rows={7} value={journalText} onChange={(event) => setJournalText(event.target.value)} placeholder="Write what happened, what you felt, and what you need next..." />
                      <div className="grid md:grid-cols-2 gap-3">
                        <Input value={journalGratitude} onChange={(event) => setJournalGratitude(event.target.value)} placeholder="One gratitude note" />
                        <Input value={journalTrigger} onChange={(event) => setJournalTrigger(event.target.value)} placeholder="Trigger or pattern noticed" />
                      </div>
                      {emergencyKeywords.some((keyword) => `${journalText} ${journalTrigger}`.toLowerCase().includes(keyword)) && (
                        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
                          Emergency support is available now: call 1800-599-0019, 988 where available, or local emergency services.
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Button onClick={() => submitJournal(false)}>Save private entry</Button>
                        <Button variant="outline" onClick={() => submitJournal(true)}>Share with counsellor</Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle>Recent Entries</CardTitle>
                      <CardDescription>Your latest private and shared reflections.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {data.journal.length === 0 ? (
                        <PanelText>No journal entries yet. Start with one honest sentence.</PanelText>
                      ) : (
                        data.journal.map((entry) => (
                          <div key={entry.id} className="rounded-lg border border-glass-border/40 bg-background/60 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="font-medium">{entry.title}</div>
                                {entry.createdAt && <div className="text-xs text-foreground/50">{new Date(entry.createdAt).toLocaleDateString("en-IN")}</div>}
                              </div>
                              <Badge variant="secondary">{entry.shared ? "Shared" : "Private"}</Badge>
                            </div>
                            <p className="text-sm text-foreground/70 mt-2">{entry.excerpt}</p>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="care" className="space-y-6">
                <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
                  <ResourceTile icon={Sparkles} title="Motivation Articles" text="Confidence, mindset, habit building, and small-step growth reads." />
                  <ResourceTile icon={PlayCircle} title="Breathing Practice" text="Box breathing and 4-7-8 calm routines with guided steps." />
                  <ResourceTile icon={BookOpen} title="Self-Care Guides" text="Stress, sleep, relationships, study pressure, and burnout articles." />
                  <ResourceTile icon={Video} title="Wellness Videos" text="Curated YouTube wellness videos from the resources page." />
                </div>
                <div className="grid lg:grid-cols-[1fr_0.9fr] gap-6">
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Recommended Self-Care
                      </CardTitle>
                      <CardDescription>Saved articles and exercises matched to your current wellness needs.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {(data.recommendedResources || []).length === 0 ? (
                        <PanelText>Open the resources page to browse motivation articles, wellness videos, and exercises.</PanelText>
                      ) : (
                        data.recommendedResources.slice(0, 5).map((resource) => (
                          <div key={resource.id || resource.title} className="rounded-lg border border-glass-border/40 bg-background/60 p-3">
                            <div className="font-medium">{resource.title}</div>
                            <div className="text-sm text-foreground/70">{resource.description || resource.category || "Self-care resource"}</div>
                          </div>
                        ))
                      )}
                      <Button onClick={() => navigate("/resources")} className="gap-2">
                        <BookOpen className="h-4 w-4" />
                        Browse Resources
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="glass-card border-emergency/30">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Siren className="h-5 w-5 text-emergency" />
                        Emergency Support
                      </CardTitle>
                      <CardDescription>Crisis support stays visible without mixing it into chat.</CardDescription>
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

              <TabsContent value="chat" className="space-y-6">
                <Card className="glass-card overflow-hidden">
                  <CardHeader className="border-b border-glass-border/40 bg-background/60">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <MessageCircle className="h-5 w-5 text-primary" />
                          Counsellor Chat
                        </CardTitle>
                        <CardDescription>WhatsApp-like secure follow-up messages with optional file links.</CardDescription>
                      </div>
                      <Badge className="w-fit bg-emerald-500/15 text-emerald-600 border border-emerald-500/20">Secure messaging</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="flex min-h-[560px] flex-col bg-gradient-to-br from-background via-primary/5 to-secondary/5">
                      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3">
                        {chatMessages.length === 0 ? (
                          <div className="h-full min-h-[300px] flex items-center justify-center">
                            <PanelText>No messages yet. Choose a counsellor below and send your first follow-up.</PanelText>
                          </div>
                        ) : (
                          chatMessages.map((message) => <ChatBubble key={message.id || `${message.direction}-${message.text}`} message={message} />)
                        )}
                      </div>
                      <div className="border-t border-glass-border/40 bg-background/90 p-4 space-y-3">
                        <div className="grid md:grid-cols-[240px_1fr] gap-3">
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
                          <div className="relative">
                            <Paperclip className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50" />
                            <Input className="pl-9" value={messageFileUrl} onChange={(event) => setMessageFileUrl(event.target.value)} placeholder="Optional file or resource URL" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Textarea rows={2} value={messageText} onChange={(event) => setMessageText(event.target.value)} placeholder="Type a message..." className="resize-none" />
                          <Button onClick={sendUserMessage} className="self-end gap-2">
                            <Send className="h-4 w-4" />
                            Send
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="payments" className="space-y-6">
                <div className="grid md:grid-cols-3 gap-4">
                  {subscriptionPlans.map((plan) => (
                    <SubscriptionPlanCard
                      key={plan.id}
                      plan={plan}
                      selected={selectedPlan === plan.id}
                      onSelect={() => setSelectedPlan(plan.id)}
                      onPay={() => paySubscription(plan)}
                      disabled={paying}
                    />
                  ))}
                </div>
                <div className="grid lg:grid-cols-[0.85fr_1.15fr] gap-6">
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-primary" />
                        Payments & Subscription
                      </CardTitle>
                      <CardDescription>Pay for sessions, buy subscriptions, and view invoices in rupees.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <PanelText>Current plan: {data.payments.subscription}</PanelText>
                      <PanelText>Selected plan: {selectedPlanData.name} at {formatRupees(selectedPlanData.price)} / month</PanelText>
                      <PanelText>Next billing: {data.payments.nextBillingDate || "Not scheduled"}</PanelText>
                      <div className="flex flex-wrap gap-2">
                        <Button onClick={payNextSession} disabled={paying}>{paying ? "Processing..." : "Pay next session"}</Button>
                        <Button variant="outline" onClick={() => paySubscription(selectedPlanData)} disabled={paying}>
                          Activate selected plan
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle>Invoices</CardTitle>
                      <CardDescription>Session and subscription payment history.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {(data.payments.invoices || []).length === 0 ? (
                        <PanelText>No invoices yet.</PanelText>
                      ) : (
                        (data.payments.invoices || []).map((invoice) => (
                          <div key={invoice.id} className="rounded-lg bg-foreground/5 p-3 flex items-center justify-between gap-3">
                            <div>
                              <div className="font-medium">{invoice.id}</div>
                              <div className="text-sm text-foreground/70">{invoice.date}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">{formatRupees(invoice.amount)}</div>
                              <Badge variant="secondary">{invoice.status}</Badge>
                            </div>
                          </div>
                        ))
                      )}
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
                            theme === option.id ? "border-primary bg-primary/10 shadow-sm" : "border-glass-border/40 bg-background/60 hover:border-primary/40"
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

                <div className="grid lg:grid-cols-2 gap-6">
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5 text-primary" />
                        Notification Preferences
                      </CardTitle>
                      <CardDescription>Control reminders without leaving the dashboard.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <PreferenceToggle title="Session reminders" text="Appointment reminders and Google Meet alerts." checked={notificationPrefs.session} onToggle={() => setNotificationPrefs((prev) => ({ ...prev, session: !prev.session }))} />
                      <PreferenceToggle title="Mood check-ins" text="Daily wellness tracking prompts." checked={notificationPrefs.mood} onToggle={() => setNotificationPrefs((prev) => ({ ...prev, mood: !prev.mood }))} />
                      <PreferenceToggle title="Counsellor messages" text="Replies and follow-up chat notifications." checked={notificationPrefs.messages} onToggle={() => setNotificationPrefs((prev) => ({ ...prev, messages: !prev.messages }))} />
                      <PreferenceToggle title="Payment alerts" text="Invoices, subscriptions, and confirmations." checked={notificationPrefs.payments} onToggle={() => setNotificationPrefs((prev) => ({ ...prev, payments: !prev.payments }))} />
                    </CardContent>
                  </Card>

                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5 text-primary" />
                        Privacy & Safety
                      </CardTitle>
                      <CardDescription>Choose how your support experience behaves by default.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <PreferenceToggle title="Anonymous session default" text="Use nickname-first identity when booking sessions." checked={privacyPrefs.anonymousDefault} onToggle={() => setPrivacyPrefs((prev) => ({ ...prev, anonymousDefault: !prev.anonymousDefault }))} />
                      <PreferenceToggle title="Share journal with counsellor" text="Make sharing explicit before entries are visible." checked={privacyPrefs.shareJournal} onToggle={() => setPrivacyPrefs((prev) => ({ ...prev, shareJournal: !prev.shareJournal }))} />
                      <PreferenceToggle title="Emergency keyword alerts" text="Show urgent support options when crisis words appear." checked={privacyPrefs.crisisAlerts} onToggle={() => setPrivacyPrefs((prev) => ({ ...prev, crisisAlerts: !prev.crisisAlerts }))} />
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

function SessionCard({ appointment, onBook, onChat }) {
  const isOnline = appointment.mode === "online";

  return (
    <div className="rounded-xl border border-glass-border/40 bg-background/60 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-semibold">{appointment.counsellorName || "Counsellor"}</div>
            <Badge variant="secondary" className="capitalize">{appointment.status}</Badge>
            {isOnline && <Badge className="bg-blue-500/15 text-blue-600 border border-blue-500/20">Google Meet</Badge>}
          </div>
          <div className="mt-2 text-sm text-foreground/70">
            {appointment.date} at {appointment.time} - {appointment.mode || "online"} session
          </div>
          {appointment.reason && <div className="mt-1 text-xs text-foreground/55">{appointment.reason}</div>}
        </div>
        <div className="flex flex-wrap gap-2">
          {appointment.meetingLink && (
            <Button asChild size="sm" className="gap-2">
              <a href={appointment.meetingLink} target="_blank" rel="noreferrer">
                <Video className="h-4 w-4" />
                Join Meet
              </a>
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onBook}>
            Reschedule
          </Button>
          <Button size="sm" variant="outline" onClick={onChat}>
            Chat
          </Button>
        </div>
      </div>
    </div>
  );
}

function MiniHabit({ icon: Icon, label }) {
  return (
    <div className="rounded-lg border border-glass-border/40 bg-background/60 p-3 flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </span>
      <div>
        <div className="font-medium">{label}</div>
        <div className="text-xs text-foreground/60">Track daily</div>
      </div>
    </div>
  );
}

function ChatBubble({ message }) {
  const sent = message.direction === "sent";
  const timeLabel = message.createdAt
    ? new Date(message.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    : message.time || "";

  return (
    <div className={`flex ${sent ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[82%] rounded-2xl px-4 py-3 shadow-sm ${sent ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-background/85 border border-glass-border/40 rounded-bl-sm"}`}>
        <div className={`mb-1 text-xs font-semibold ${sent ? "text-primary-foreground/80" : "text-foreground/60"}`}>
          {sent ? "You" : message.from || "Counsellor"}
        </div>
        {message.subject && <div className="text-sm font-semibold">{message.subject}</div>}
        <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.text}</div>
        {message.fileUrl && (
          <a className={`mt-2 inline-flex text-xs underline ${sent ? "text-primary-foreground" : "text-primary"}`} href={message.fileUrl} target="_blank" rel="noreferrer">
            Open shared file
          </a>
        )}
        <div className={`mt-2 text-right text-[11px] ${sent ? "text-primary-foreground/70" : "text-foreground/45"}`}>{timeLabel}</div>
      </div>
    </div>
  );
}

function SubscriptionPlanCard({ plan, selected, onSelect, onPay, disabled }) {
  return (
    <Card className={`glass-card relative overflow-hidden ${selected ? "border-primary/60 ring-1 ring-primary/30" : ""}`}>
      {plan.popular && (
        <Badge className="absolute right-4 top-4 bg-primary/15 text-primary border border-primary/20">
          Popular
        </Badge>
      )}
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-primary" />
          {plan.name}
        </CardTitle>
        <CardDescription>{plan.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <span className="text-3xl font-bold">{formatRupees(plan.price)}</span>
          <span className="text-sm text-foreground/60"> / {plan.period}</span>
        </div>
        <div className="space-y-2">
          {plan.features.map((feature) => (
            <div key={feature} className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-600" />
              <span>{feature}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant={selected ? "default" : "outline"} className="flex-1" onClick={onSelect}>
            {selected ? "Selected" : "Select"}
          </Button>
          <Button variant="outline" className="flex-1" onClick={onPay} disabled={disabled}>
            Pay
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PreferenceToggle({ title, text, checked, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between gap-4 rounded-lg border border-glass-border/40 bg-background/60 p-4 text-left transition hover:border-primary/40"
    >
      <span>
        <span className="block font-medium">{title}</span>
        <span className="mt-1 block text-sm text-foreground/65">{text}</span>
      </span>
      <span className={`relative h-7 w-12 rounded-full transition ${checked ? "bg-primary" : "bg-foreground/20"}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${checked ? "left-6" : "left-1"}`} />
      </span>
    </button>
  );
}

export default UserDashboard;
