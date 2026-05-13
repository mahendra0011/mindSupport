import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Archive,
  Bell,
  BookOpen,
  Camera,
  CalendarClock,
  CalendarDays,
  CheckCheck,
  CheckCircle2,
  CreditCard,
  Droplets,
  Dumbbell,
  EyeOff,
  File,
  FileText,
  Heart,
  HeartPulse,
  IdCard,
  Image,
  LineChart as LineChartIcon,
  Lock,
  MessageCircle,
  Moon,
  NotebookPen,
  Palette,
  Paperclip,
  Pencil,
  Pin,
  PlayCircle,
  Reply,
  Search,
  Send,
  Settings,
  Shield,
  ShieldCheck,
  Siren,
  Smile,
  SmilePlus,
  Sparkles,
  Star,
  Trash2,
  Users,
  Video,
  MoreVertical,
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

const defaultNotificationPrefs = {
  session: true,
  mood: true,
  messages: true,
  payments: true,
};

const defaultPrivacyPrefs = {
  anonymousDefault: false,
  shareJournal: false,
  crisisAlerts: true,
};

function readStoredPrefs(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

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
  payments: { summary: "Session payments only", invoices: [] },
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
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState("");
  const [editingMessageText, setEditingMessageText] = useState("");
  const [chatSearch, setChatSearch] = useState("");
  const [chatFilter, setChatFilter] = useState("all");
  const [showAttachmentPanel, setShowAttachmentPanel] = useState(false);
  const [showEmojiPanel, setShowEmojiPanel] = useState(false);
  const [pinnedChatIds, setPinnedChatIds] = useState([]);
  const [archivedChatIds, setArchivedChatIds] = useState([]);
  const [paying, setPaying] = useState(false);
  const [accountSaving, setAccountSaving] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState("");
  const [notificationPrefs, setNotificationPrefs] = useState(() => readStoredPrefs("mindsupport_notification_prefs", defaultNotificationPrefs));
  const [privacyPrefs, setPrivacyPrefs] = useState(() => readStoredPrefs("mindsupport_privacy_prefs", defaultPrivacyPrefs));
  const [otpCode, setOtpCode] = useState("");
  const [otpHint, setOtpHint] = useState("");

  const loadDashboard = useCallback(() => {
    let active = true;
    setLoading(true);
    apiFetch("/api/user/dashboard")
      .then((result) => {
        if (active) {
          setData({ ...emptyData, ...result });
          setUsernameDraft((current) => current || result.profile?.username || "");
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

  useEffect(() => {
    localStorage.setItem("mindsupport_notification_prefs", JSON.stringify(notificationPrefs));
  }, [notificationPrefs]);

  useEffect(() => {
    localStorage.setItem("mindsupport_privacy_prefs", JSON.stringify(privacyPrefs));
  }, [privacyPrefs]);

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
  const latestMood = data.moodEntries?.[0]?.mood || data.stats.moodScore || 4;
  const currentRisk = data.latestAssessment?.level || data.stats.latestRiskLevel || "not-started";
  const allChatConversations = useMemo(() => {
    const knownTherapists = new Map(data.therapists.map((therapist) => [therapist.id, therapist]));
    const messagePeers = new Map();

    chatMessages.forEach((message) => {
      const peerId = message.direction === "sent" ? message.toId : message.fromId;
      const peerName = message.direction === "sent" ? message.to : message.from;
      if (peerId && !knownTherapists.has(peerId)) {
        messagePeers.set(peerId, {
          id: peerId,
          name: peerName || "Counsellor",
          specialization: "Secure support",
          responseTime: "Within 24 hours",
          rating: 4.8,
          categories: [],
        });
      }
    });

    return [...data.therapists, ...messagePeers.values()]
      .map((therapist) => {
        const thread = chatMessages.filter(
          (message) =>
            message.fromId === therapist.id ||
            message.toId === therapist.id ||
            message.from === therapist.name ||
            message.to === therapist.name
        );
        const lastMessage = thread[thread.length - 1];
        const unreadCount = thread.filter((message) => message.unread).length;
        const pinned = pinnedChatIds.includes(therapist.id);
        const archived = archivedChatIds.includes(therapist.id);
        return {
          ...therapist,
          thread,
          lastMessage,
          unreadCount,
          pinned,
          archived,
          online: therapist.responseTime?.toLowerCase().includes("fast") || Number(therapist.rating) >= 4.8,
          lastText: lastMessage?.text || "Start a secure conversation",
          lastTime: formatChatTime(lastMessage?.createdAt || lastMessage?.time),
        };
      })
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        const aTime = new Date(a.lastMessage?.createdAt || 0).getTime();
        const bTime = new Date(b.lastMessage?.createdAt || 0).getTime();
        return bTime - aTime;
      });
  }, [archivedChatIds, chatMessages, data.therapists, pinnedChatIds]);
  const filteredChatConversations = useMemo(() => {
    const q = chatSearch.trim().toLowerCase();
    return allChatConversations.filter((conversation) => {
      const matchesSearch =
        !q ||
        conversation.name?.toLowerCase().includes(q) ||
        conversation.specialization?.toLowerCase().includes(q) ||
        conversation.lastText?.toLowerCase().includes(q);
      const matchesFilter =
        chatFilter === "all" ||
        (chatFilter === "unread" && conversation.unreadCount > 0) ||
        (chatFilter === "pinned" && conversation.pinned) ||
        (chatFilter === "archived" && conversation.archived);
      const visibleArchiveState = chatFilter === "archived" ? conversation.archived : !conversation.archived;
      return matchesSearch && matchesFilter && visibleArchiveState;
    });
  }, [allChatConversations, chatFilter, chatSearch]);
  const activeConversation =
    allChatConversations.find((conversation) => conversation.id === messageRecipient) ||
    filteredChatConversations[0] ||
    allChatConversations[0] ||
    null;
  const activeMessages = useMemo(() => {
    if (!activeConversation) return [];
    return chatMessages.filter(
      (message) =>
        message.fromId === activeConversation.id ||
        message.toId === activeConversation.id ||
        message.from === activeConversation.name ||
        message.to === activeConversation.name
    );
  }, [activeConversation, chatMessages]);

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
    const targetRecipient = messageRecipient || activeConversation?.id;
    if (!targetRecipient || !messageText.trim()) {
      toast({ variant: "destructive", title: "Message is incomplete", description: "Choose a counsellor and write a message." });
      return;
    }
    try {
      await apiFetch("/api/messages", {
        method: "POST",
        body: JSON.stringify({
          to: targetRecipient,
          subject: activeConversation ? `Chat with ${activeConversation.name}` : "Session follow-up",
          text: messageText,
          fileUrl: messageFileUrl,
          fileName: messageFileUrl ? "Shared file" : "",
          replyTo: replyToMessage?.id,
        }),
      });
      toast({ title: "Message sent", description: "Your counsellor can reply from their dashboard." });
      setMessageText("");
      setMessageFileUrl("");
      setReplyToMessage(null);
      loadDashboard();
    } catch (error) {
      toast({ variant: "destructive", title: "Message failed", description: error?.message || "" });
    }
  };

  const startEditMessage = (message) => {
    if (!message.canEdit || message.deleted) return;
    setEditingMessageId(message.id);
    setEditingMessageText(message.text || "");
  };

  const saveEditedMessage = async () => {
    if (!editingMessageId || !editingMessageText.trim()) return;
    try {
      await apiFetch(`/api/messages/${editingMessageId}`, {
        method: "PATCH",
        body: JSON.stringify({ text: editingMessageText }),
      });
      setEditingMessageId("");
      setEditingMessageText("");
      toast({ title: "Message updated" });
      loadDashboard();
    } catch (error) {
      toast({ variant: "destructive", title: "Edit failed", description: error?.message || "" });
    }
  };

  const deleteMessage = async (message) => {
    if (!message.canDelete || !window.confirm("Delete this message from the conversation?")) return;
    try {
      await apiFetch(`/api/messages/${message.id}`, { method: "DELETE" });
      toast({ title: "Message deleted" });
      loadDashboard();
    } catch (error) {
      toast({ variant: "destructive", title: "Delete failed", description: error?.message || "" });
    }
  };

  const reactToMessage = async (message, emoji) => {
    if (!message?.id || message.deleted) return;
    try {
      await apiFetch(`/api/messages/${message.id}/reactions`, {
        method: "POST",
        body: JSON.stringify({ emoji }),
      });
      loadDashboard();
    } catch (error) {
      toast({ variant: "destructive", title: "Reaction failed", description: error?.message || "" });
    }
  };

  const togglePinnedChat = (id) => {
    setPinnedChatIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const toggleArchivedChat = (id) => {
    setArchivedChatIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
    if (chatFilter !== "archived") setChatFilter("all");
  };

  const addEmojiToMessage = (emoji) => {
    setMessageText((current) => `${current}${emoji}`);
    setShowEmojiPanel(false);
  };

  const addQuickReply = (reply) => {
    setMessageText((current) => (current ? `${current}\n${reply}` : reply));
  };

  const selectAttachmentType = (type) => {
    setShowAttachmentPanel(false);
    toast({
      title: `${type} attachment`,
      description: "Paste a secure file or resource link in the attachment field before sending.",
    });
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

  const saveSecurityPreferences = async () => {
    setAccountSaving(true);
    try {
      await apiFetch("/api/users/me", {
        method: "PUT",
        body: JSON.stringify({
          username: usernameDraft,
          privacySettings: {
            showOnlineStatus: !privacyPrefs.anonymousDefault,
            allowMessages: true,
            shareProgressWithCounsellor: privacyPrefs.shareJournal,
            anonymousDisplayName: privacyPrefs.anonymousDefault ? "Anonymous MindSupport user" : "",
          },
          notificationSettings: {
            session: notificationPrefs.session,
            messages: notificationPrefs.messages,
            payments: notificationPrefs.payments,
            platform: true,
          },
        }),
      });
      toast({ title: "Security settings saved", description: "Username, privacy, and notifications are updated." });
      loadDashboard();
    } catch (error) {
      toast({ variant: "destructive", title: "Save failed", description: error?.message || "" });
    } finally {
      setAccountSaving(false);
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
        <section className="dashboard-motion py-6 md:py-10 bg-gradient-to-br from-primary/8 via-background via-secondary/8 to-accent/5">
          <div className="dashboard-shell max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <GlowPanel className="dashboard-panel p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                <div>
                  <Badge className="bg-primary/15 text-primary border border-primary/25">User dashboard</Badge>
                  <h1 className="text-3xl sm:text-4xl font-bold mt-3">Hi, {user?.name || "there"}</h1>
                  <p className="text-foreground/70 mt-2 max-w-2xl">
                    Book therapy, track your emotions, journal privately, and keep support close.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => navigate("/counselling")} className="gap-2">
                    <Video className="h-4 w-4" />
                    Find Counsellor
                  </Button>
                </div>
              </div>
            </GlowPanel>

            <div className="dashboard-stagger grid md:grid-cols-2 xl:grid-cols-5 gap-4">
              <Metric title="Upcoming sessions" value={data.stats.upcomingSessions} icon={CalendarDays} />
              <Metric title="Mood score" value={`${data.stats.moodScore}/5`} icon={Smile} />
              <Metric title="Wellness streak" value={`${data.stats.wellnessStreak} days`} icon={HeartPulse} />
              <Metric title="Unread messages" value={data.stats.unreadMessages} icon={MessageCircle} />
              <Metric title="Daily tip" value={data.stats.dailyTip} icon={Sparkles} compact />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="dashboard-panel flex h-auto flex-wrap justify-start gap-2 bg-muted/60 p-2">
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

              <TabsContent value="home" className="dashboard-tab-motion space-y-6">
                <div className="dashboard-stagger grid lg:grid-cols-[1.05fr_0.95fr] gap-6">
                  <Card className="dashboard-card-motion glass-card">
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
                          <div key={appointment.id} className="dashboard-card-motion rounded-lg border border-glass-border/40 bg-background/60 p-4">
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
                                      Join same Meet
                                    </a>
                                  </Button>
                                )}
                                <Button size="sm" variant="outline" onClick={() => navigate("/counselling")}>
                                  Reschedule
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  <Card className="dashboard-card-motion glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <LineChartIcon className="h-5 w-5 text-secondary" />
                        Personal Analytics
                      </CardTitle>
                      <CardDescription>Mood, stability, therapy progress, and sleep</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ProgressRow label="Emotional stability" value={data.analytics.emotionalStability} />
                      <ProgressRow label="Therapy progress" value={data.analytics.therapyProgress} />
                      <ProgressRow label="Sleep quality" value={data.analytics.sleepQuality} />
                      <div className="h-64 rounded-2xl border border-glass-border/40 bg-background/60 p-3">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsLineChart data={data.analytics.weeklyMood || []} margin={{ top: 8, right: 14, left: -18, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.45} />
                            <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                            <YAxis domain={[0, 10]} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                            <Line type="monotone" dataKey="mood" name="Mood" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4 }} />
                            <Line type="monotone" dataKey="sleep" name="Sleep" stroke="hsl(var(--secondary))" strokeWidth={3} dot={{ r: 4 }} />
                            <Line type="monotone" dataKey="anxiety" name="Anxiety" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} />
                          </RechartsLineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="dashboard-stagger grid md:grid-cols-3 gap-4">
                  <FeatureTile icon={EyeOff} title="Anonymous Therapy" text="Use anonymous mode during counselling when privacy matters most." />
                  <FeatureTile icon={ShieldCheck} title="Counsellor Care Plan" text="Keep session notes, wellness tasks, and follow-up reminders in one private place." />
                  <FeatureTile icon={Users} title="Community Support" text="Join anonymous support groups and healing discussions in peer support." />
                </div>

                <Card className="dashboard-card-motion glass-card">
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
                        <div key={notification.id} className="dashboard-card-motion rounded-lg bg-foreground/5 p-3">
                          <div className="font-medium">{notification.title}</div>
                          <div className="text-sm text-foreground/70">{notification.message}</div>
                          <div className="text-xs text-foreground/50 mt-1">{notification.time}</div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="therapists" className="dashboard-tab-motion space-y-6">
                <Card className="dashboard-card-motion glass-card">
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
                    <div className="dashboard-stagger grid md:grid-cols-2 gap-4">
                      {filteredTherapists.map((therapist) => (
                        <div key={therapist.id} className="dashboard-card-motion rounded-lg border border-glass-border/40 bg-background/60 p-4">
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
                          <Button className="mt-4 w-full" onClick={() => navigate("/counselling")}>
                            View plans and book
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="sessions" className="dashboard-tab-motion space-y-6">
                <div className="dashboard-stagger grid lg:grid-cols-[1.15fr_0.85fr] gap-6">
                  <Card className="dashboard-card-motion glass-card">
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
                          <SessionCard key={appointment.id} appointment={appointment} onBook={() => navigate("/counselling")} onChat={() => setActiveTab("chat")} />
                        ))
                      )}
                    </CardContent>
                  </Card>

                  <div className="space-y-4">
                    <Card className="dashboard-card-motion glass-card">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Video className="h-5 w-5 text-secondary" />
                          Session Actions
                        </CardTitle>
                        <CardDescription>Fast controls for the session flow.</CardDescription>
                      </CardHeader>
                      <CardContent className="grid gap-3">
                        <ActionCard title="Book new session" text="Choose counsellor, plan, date, time, and session mode." action="Book" onClick={() => navigate("/counselling")} />
                        <ActionCard title="Manage appointments" text="Review your care plan, progress, and upcoming appointments." action="Open counselling" onClick={() => navigate("/counselling")} />
                        <ActionCard title="Follow-up chat" text="Ask a question after a session or share a resource." action="Open chat" onClick={() => setActiveTab("chat")} />
                      </CardContent>
                    </Card>

                    <Card className="dashboard-card-motion glass-card border-primary/25">
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

              <TabsContent value="wellness" className="dashboard-tab-motion space-y-6">
                <div className="dashboard-stagger grid lg:grid-cols-[1fr_0.9fr] gap-6">
                  <Card className="dashboard-card-motion glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" />
                        Wellness Snapshot
                      </CardTitle>
                      <CardDescription>Daily mood, stress balance, sleep, anxiety, and progress in one place.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="dashboard-stagger grid sm:grid-cols-4 gap-3">
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

                  <Card className="dashboard-card-motion glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-secondary" />
                        Habit Tracking
                      </CardTitle>
                      <CardDescription>Simple daily habits that support sleep, calm, movement, and hydration.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="dashboard-stagger grid sm:grid-cols-2 gap-3">
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
                      <div className="h-56 rounded-2xl border border-glass-border/40 bg-background/60 p-3">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsBarChart data={data.habits || []} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.45} />
                            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                            <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                            <Bar dataKey="progress" name="Progress" radius={[8, 8, 0, 0]} fill="hsl(var(--primary))" />
                          </RechartsBarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="journal" className="dashboard-tab-motion space-y-6">
                <div className="dashboard-stagger grid lg:grid-cols-[1fr_0.9fr] gap-6">
                  <Card className="dashboard-card-motion glass-card">
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
                      <div className="dashboard-stagger grid md:grid-cols-2 gap-3">
                        <Input value={journalGratitude} onChange={(event) => setJournalGratitude(event.target.value)} placeholder="One gratitude note" />
                        <Input value={journalTrigger} onChange={(event) => setJournalTrigger(event.target.value)} placeholder="Trigger or pattern noticed" />
                      </div>
                      {privacyPrefs.crisisAlerts && emergencyKeywords.some((keyword) => `${journalText} ${journalTrigger}`.toLowerCase().includes(keyword)) && (
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

                  <Card className="dashboard-card-motion glass-card">
                    <CardHeader>
                      <CardTitle>Recent Entries</CardTitle>
                      <CardDescription>Your latest private and shared reflections.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {data.journal.length === 0 ? (
                        <PanelText>No journal entries yet. Start with one honest sentence.</PanelText>
                      ) : (
                        data.journal.map((entry) => (
                          <div key={entry.id} className="dashboard-card-motion rounded-lg border border-glass-border/40 bg-background/60 p-4">
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

              <TabsContent value="care" className="dashboard-tab-motion space-y-6">
                <div className="dashboard-stagger grid md:grid-cols-2 xl:grid-cols-4 gap-4">
                  <ResourceTile icon={Sparkles} title="Motivation Articles" text="Confidence, mindset, habit building, and small-step growth reads." />
                  <ResourceTile icon={PlayCircle} title="Breathing Practice" text="Box breathing and 4-7-8 calm routines with guided steps." />
                  <ResourceTile icon={BookOpen} title="Self-Care Guides" text="Stress, sleep, relationships, study pressure, and burnout articles." />
                  <ResourceTile icon={Video} title="Wellness Videos" text="Curated YouTube wellness videos from the resources page." />
                </div>
                <div className="dashboard-stagger grid lg:grid-cols-[1fr_0.9fr] gap-6">
                  <Card className="dashboard-card-motion glass-card">
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
                          <div key={resource.id || resource.title} className="dashboard-card-motion rounded-lg border border-glass-border/40 bg-background/60 p-3">
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

                  <Card className="dashboard-card-motion glass-card border-emergency/30">
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

              <TabsContent value="chat" className="dashboard-tab-motion space-y-6">
                <Card className="dashboard-card-motion glass-card overflow-hidden border-emerald-500/15">
                  <CardContent className="p-0">
                    <div className="grid min-h-[720px] lg:grid-cols-[360px_1fr]">
                      <aside className="border-b border-glass-border/40 bg-background/95 lg:border-b-0 lg:border-r">
                        <div className="border-b border-glass-border/40 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <AvatarBadge name={user?.name || "You"} online />
                              <div>
                                <div className="font-semibold">Chats</div>
                                <div className="text-xs text-foreground/55">Secure counsellor messaging</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <IconButton title="Archived chats" onClick={() => setChatFilter(chatFilter === "archived" ? "all" : "archived")}>
                                <Archive className="h-4 w-4" />
                              </IconButton>
                              <IconButton title="More chat options">
                                <MoreVertical className="h-4 w-4" />
                              </IconButton>
                            </div>
                          </div>
                          <div className="relative mt-4">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/45" />
                            <Input
                              className="h-10 rounded-full bg-foreground/5 pl-9"
                              value={chatSearch}
                              onChange={(event) => setChatSearch(event.target.value)}
                              placeholder="Search or start new chat"
                            />
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {["all", "unread", "pinned", "archived"].map((filter) => (
                              <button
                                key={filter}
                                type="button"
                                onClick={() => setChatFilter(filter)}
                                className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition ${
                                  chatFilter === filter ? "bg-emerald-500 text-white" : "bg-foreground/5 text-foreground/70 hover:bg-foreground/10"
                                }`}
                              >
                                {filter}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="max-h-[590px] overflow-y-auto">
                          {filteredChatConversations.length === 0 ? (
                            <div className="p-4">
                              <PanelText>No chats match this filter.</PanelText>
                            </div>
                          ) : (
                            filteredChatConversations.map((conversation) => (
                              <ConversationRow
                                key={conversation.id}
                                conversation={conversation}
                                active={activeConversation?.id === conversation.id}
                                onClick={() => setMessageRecipient(conversation.id)}
                              />
                            ))
                          )}
                        </div>
                      </aside>

                      <section className="flex min-h-[720px] flex-col bg-[#0b141a] text-slate-50">
                        {activeConversation ? (
                          <>
                            <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#202c33] p-4">
                              <div className="flex min-w-0 items-center gap-3">
                                <AvatarBadge name={activeConversation.name} online={activeConversation.online} />
                                <div className="min-w-0">
                                  <div className="truncate font-semibold">{activeConversation.name}</div>
                                  <div className="truncate text-xs text-slate-300">
                                    {activeConversation.online ? "online" : `last seen ${activeConversation.responseTime || "recently"}`}
                                  </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <IconButton title={activeConversation.pinned ? "Unpin chat" : "Pin chat"} dark onClick={() => togglePinnedChat(activeConversation.id)}>
                                  <Pin className={`h-4 w-4 ${activeConversation.pinned ? "fill-current text-emerald-300" : ""}`} />
                                </IconButton>
                                <IconButton title={activeConversation.archived ? "Unarchive chat" : "Archive chat"} dark onClick={() => toggleArchivedChat(activeConversation.id)}>
                                  <Archive className="h-4 w-4" />
                                </IconButton>
                              </div>
                            </div>

                            <div className="border-b border-white/10 bg-[#111b21] px-4 py-2 text-center text-xs text-slate-300">
                              <Lock className="mr-1 inline h-3.5 w-3.5 text-emerald-300" />
                              Messages are protected in your MindSupport account. This platform is not emergency medical care.
                            </div>

                            <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_28%),linear-gradient(135deg,#0b141a,#111b21)] p-4 md:p-6">
                              {activeMessages.length === 0 ? (
                                <EmptyChatState conversation={activeConversation} onQuickReply={addQuickReply} />
                              ) : (
                                <div className="space-y-3">
                                  {activeMessages.map((message, index) => {
                                    const previous = activeMessages[index - 1];
                                    const showDate = messageDateKey(message) !== messageDateKey(previous);
                                    return (
                                      <div key={message.id || `${message.direction}-${message.text}-${index}`}>
                                        {showDate && <DatePill message={message} />}
                                        <ChatBubble
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
                                      </div>
                                    );
                                  })}
                                  {messageText && (
                                    <div className="ml-2 mt-4 flex items-center gap-2 text-xs text-slate-300">
                                      <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
                                      You are typing...
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="border-t border-white/10 bg-[#202c33] p-3">
                              {replyToMessage && (
                                <div className="mb-3 rounded-xl border-l-4 border-emerald-400 bg-[#111b21] p-3 text-xs text-slate-300">
                                  <div className="flex items-center justify-between gap-3">
                                    <span>Replying to {replyToMessage.direction === "sent" ? "your message" : replyToMessage.from}</span>
                                    <button type="button" className="text-slate-400 hover:text-white" onClick={() => setReplyToMessage(null)}>Cancel</button>
                                  </div>
                                  <div className="mt-1 truncate text-slate-100">{replyToMessage.text}</div>
                                </div>
                              )}
                              <div className="mb-2 flex flex-wrap gap-2">
                                {["I need to reschedule", "Can we discuss my journal?", "Please share a coping task"].map((reply) => (
                                  <button
                                    key={reply}
                                    type="button"
                                    onClick={() => addQuickReply(reply)}
                                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200 hover:bg-white/10"
                                  >
                                    {reply}
                                  </button>
                                ))}
                              </div>

                              {(showAttachmentPanel || showEmojiPanel) && (
                                <div className="chat-panel-pop mb-3 rounded-2xl border border-white/10 bg-[#111b21] p-3">
                                  {showAttachmentPanel && (
                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                      <AttachmentAction icon={File} label="Document" onClick={() => selectAttachmentType("Document")} />
                                      <AttachmentAction icon={Image} label="Gallery" onClick={() => selectAttachmentType("Gallery")} />
                                      <AttachmentAction icon={Camera} label="Camera" onClick={() => selectAttachmentType("Camera")} />
                                      <AttachmentAction icon={FileText} label="Resource" onClick={() => selectAttachmentType("Resource")} />
                                    </div>
                                  )}
                                  {showEmojiPanel && (
                                    <div className="flex flex-wrap gap-2">
                                      {["🙂", "🙏", "💙", "🌱", "😔", "😌", "👍", "✨"].map((emoji) => (
                                        <button key={emoji} type="button" onClick={() => addEmojiToMessage(emoji)} className="rounded-lg bg-white/5 px-3 py-2 text-lg hover:bg-white/10">
                                          {emoji}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              <div className="grid gap-2 md:grid-cols-[220px_1fr]">
                                <Select value={messageRecipient || activeConversation.id} onValueChange={setMessageRecipient}>
                                  <SelectTrigger className="border-white/10 bg-[#111b21] text-slate-100">
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
                                  <Paperclip className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                  <Input
                                    className="border-white/10 bg-[#111b21] pl-9 text-slate-100 placeholder:text-slate-400"
                                    value={messageFileUrl}
                                    onChange={(event) => setMessageFileUrl(event.target.value)}
                                    placeholder="Optional file, image, resource, or report URL"
                                  />
                                </div>
                              </div>

                              <div className="mt-2 flex items-end gap-2">
                                <IconButton title="Emoji" dark onClick={() => { setShowEmojiPanel((value) => !value); setShowAttachmentPanel(false); }}>
                                  <Smile className="h-5 w-5" />
                                </IconButton>
                                <IconButton title="Attach" dark onClick={() => { setShowAttachmentPanel((value) => !value); setShowEmojiPanel(false); }}>
                                  <Paperclip className="h-5 w-5" />
                                </IconButton>
                                <Textarea
                                  rows={2}
                                  value={messageText}
                                  onChange={(event) => setMessageText(event.target.value)}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter" && !event.shiftKey) {
                                      event.preventDefault();
                                      sendUserMessage();
                                    }
                                  }}
                                  placeholder="Type a message"
                                  className="min-h-[46px] resize-none rounded-2xl border-white/10 bg-[#111b21] text-slate-100 placeholder:text-slate-400"
                                />
                                <Button
                                  type="button"
                                  onClick={sendUserMessage}
                                  disabled={!messageText.trim()}
                                  className="h-11 rounded-full bg-emerald-500 px-4 text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                                  title={messageText.trim() ? "Send message" : "Write a message to send"}
                                >
                                  <Send className="h-5 w-5" />
                                </Button>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-1 items-center justify-center p-6">
                            <PanelText>No approved counsellor chats are available yet. Book a session to unlock secure messaging.</PanelText>
                          </div>
                        )}
                      </section>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="payments" className="dashboard-tab-motion space-y-6">
                <div className="dashboard-stagger grid lg:grid-cols-[0.85fr_1.15fr] gap-6">
                  <Card className="dashboard-card-motion glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-primary" />
                        Session Payments
                      </CardTitle>
                      <CardDescription>Pay per session or support plan. No monthly plan is required.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <PanelText>{data.payments.summary || "Session payments only"}</PanelText>
                      <PanelText>Invoices are stored in rupees and linked to booked counselling sessions.</PanelText>
                      <div className="flex flex-wrap gap-2">
                        <Button onClick={payNextSession} disabled={paying}>{paying ? "Processing..." : "Pay next session"}</Button>
                        <Button variant="outline" onClick={() => navigate("/counselling")}>Choose counsellor plan</Button>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="dashboard-card-motion glass-card">
                    <CardHeader>
                      <CardTitle>Invoices</CardTitle>
                      <CardDescription>Session payment history.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {(data.payments.invoices || []).length === 0 ? (
                        <PanelText>No invoices yet.</PanelText>
                      ) : (
                        (data.payments.invoices || []).map((invoice) => (
                          <div key={invoice.id} className="dashboard-card-motion rounded-lg bg-foreground/5 p-3 flex items-center justify-between gap-3">
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

              <TabsContent value="settings" className="dashboard-tab-motion space-y-6">
                <div className="dashboard-stagger grid lg:grid-cols-[1fr_0.8fr] gap-6">
                  <Card className="dashboard-card-motion glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Palette className="h-5 w-5 text-primary" />
                        Theme Settings
                      </CardTitle>
                      <CardDescription>Choose a calm, safe, minimal, emotionally comforting dashboard theme.</CardDescription>
                    </CardHeader>
                    <CardContent className="dashboard-stagger grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
                      {themeOptions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setTheme(option.id)}
                          className={`dashboard-card-motion rounded-lg border p-4 text-left transition ${
                            theme === option.id ? "border-primary bg-primary/10 shadow-sm" : "border-glass-border/40 bg-background/60 hover:border-primary/40"
                          }`}
                        >
                          <span className={`block h-8 w-8 rounded-full ${option.color} mb-3 border border-white/30`} />
                          <span className="font-medium">{option.name}</span>
                        </button>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="dashboard-card-motion glass-card">
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

                <Card className="dashboard-card-motion glass-card border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lock className="h-5 w-5 text-primary" />
                      Account Security & Username
                    </CardTitle>
                    <CardDescription>Use a username for safer login and keep your counselling identity private when needed.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
                    <div className="space-y-2">
                      <Label htmlFor="secure-username">Secure username</Label>
                      <Input
                        id="secure-username"
                        value={usernameDraft}
                        onChange={(event) => setUsernameDraft(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                        placeholder="mindsupport_user"
                      />
                      <p className="text-xs text-foreground/60">Use 3-24 lowercase letters, numbers, or underscores. You can sign in with email or username.</p>
                    </div>
                    <div className="rounded-xl border border-glass-border/40 bg-background/60 p-4 text-sm text-foreground/70">
                      <div className="font-medium text-foreground">Privacy status</div>
                      <p className="mt-2">Anonymous default: {privacyPrefs.anonymousDefault ? "On" : "Off"}</p>
                      <p>Journal sharing default: {privacyPrefs.shareJournal ? "Share allowed" : "Private unless selected"}</p>
                      <p>Emergency keyword support: {privacyPrefs.crisisAlerts ? "On" : "Off"}</p>
                    </div>
                    <Button className="lg:col-span-2 w-fit" onClick={saveSecurityPreferences} disabled={accountSaving}>
                      {accountSaving ? "Saving..." : "Save security preferences"}
                    </Button>
                  </CardContent>
                </Card>

                <div className="dashboard-stagger grid lg:grid-cols-2 gap-6">
                  <Card className="dashboard-card-motion glass-card">
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
                      <PreferenceToggle title="Payment alerts" text="Invoices, session payments, and confirmations." checked={notificationPrefs.payments} onToggle={() => setNotificationPrefs((prev) => ({ ...prev, payments: !prev.payments }))} />
                    </CardContent>
                  </Card>

                  <Card className="dashboard-card-motion glass-card">
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

                <div className="dashboard-stagger grid md:grid-cols-3 gap-4">
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
    <Card className="dashboard-card-motion glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Icon className="dashboard-icon-float h-4 w-4 text-primary" />
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
      <Progress value={value} className="dashboard-progress" />
    </div>
  );
}

function PanelText({ children }) {
  return <div className="dashboard-card-motion rounded-lg border border-glass-border/40 bg-background/60 p-3 text-sm text-foreground/75">{children}</div>;
}

function FeatureTile({ icon: Icon, title, text }) {
  return (
    <Card className="dashboard-card-motion glass-card">
      <CardContent className="p-4">
        <Icon className="dashboard-icon-float h-5 w-5 text-primary mb-3" />
        <div className="font-semibold">{title}</div>
        <p className="text-sm text-foreground/70 mt-1">{text}</p>
      </CardContent>
    </Card>
  );
}

function ResourceTile({ icon: Icon, title, text }) {
  return (
    <Card className="dashboard-card-motion glass-card">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="dashboard-icon-float h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-foreground/70">{text}</CardContent>
    </Card>
  );
}

function ActionCard({ title, text, action, onClick }) {
  return (
    <div className="dashboard-card-motion rounded-lg border border-glass-border/40 bg-background/60 p-4">
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
    <div className="dashboard-card-motion rounded-lg border border-glass-border/40 bg-background/60 p-4 text-center">
      <div className="text-xs text-foreground/60">{label}</div>
      <div className="font-semibold mt-1">{value}</div>
    </div>
  );
}

function SessionCard({ appointment, onBook, onChat }) {
  const isOnline = ["online", "google-meet"].includes(appointment.mode);

  return (
    <div className="dashboard-card-motion rounded-xl border border-glass-border/40 bg-background/60 p-4">
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
                Join same Meet
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
    <div className="dashboard-card-motion rounded-lg border border-glass-border/40 bg-background/60 p-3 flex items-center gap-3">
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

function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "MS";
}

function formatChatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function messageDateKey(message) {
  if (!message?.createdAt) return "";
  const date = new Date(message.createdAt);
  return Number.isNaN(date.getTime()) ? "" : date.toDateString();
}

function IconButton({ children, title, onClick, dark = false }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`flex h-10 w-10 items-center justify-center rounded-full transition hover:scale-105 active:scale-95 ${
        dark ? "text-slate-200 hover:bg-white/10" : "text-foreground/70 hover:bg-foreground/10"
      }`}
    >
      {children}
    </button>
  );
}

function AvatarBadge({ name, online = false }) {
  return (
    <span className="animated-ring relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-sm font-bold text-white shadow-sm">
      {getInitials(name)}
      {online && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#202c33] bg-emerald-300" />}
    </span>
  );
}

function ConversationRow({ conversation, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`chat-row-motion flex w-full items-center gap-3 border-b border-glass-border/30 p-4 text-left transition ${
        active ? "bg-emerald-500/10" : "hover:bg-foreground/5"
      }`}
    >
      <AvatarBadge name={conversation.name} online={conversation.online} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate font-semibold">{conversation.name}</span>
          <span className="shrink-0 text-[11px] text-foreground/50">{conversation.lastTime}</span>
        </span>
        <span className="mt-1 flex items-center gap-1 text-xs text-foreground/55">
          {conversation.pinned && <Pin className="h-3 w-3 fill-current text-emerald-600" />}
          {conversation.archived && <Archive className="h-3 w-3 text-foreground/45" />}
          <span className="truncate">{conversation.lastText}</span>
        </span>
      </span>
      {conversation.unreadCount > 0 && (
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-emerald-500 px-2 text-xs font-semibold text-white">
          {conversation.unreadCount}
        </span>
      )}
    </button>
  );
}

function EmptyChatState({ conversation, onQuickReply }) {
  return (
    <div className="chat-panel-pop mx-auto flex min-h-[360px] max-w-md flex-col items-center justify-center text-center">
      <AvatarBadge name={conversation.name} online={conversation.online} />
      <h3 className="mt-4 text-lg font-semibold">Start chat with {conversation.name}</h3>
      <p className="mt-2 text-sm text-slate-300">
        Send a follow-up, share a journal note, ask for a wellness task, or attach a resource link.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {["Hello, I need support today", "Can we plan my next session?", "Please suggest one coping task"].map((reply) => (
          <button
            key={reply}
            type="button"
            onClick={() => onQuickReply(reply)}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200 hover:bg-white/10"
          >
            {reply}
          </button>
        ))}
      </div>
    </div>
  );
}

function DatePill({ message }) {
  const label = message?.createdAt ? new Date(message.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "Today";
  return (
    <div className="my-4 flex justify-center">
      <span className="chat-panel-pop rounded-full bg-[#182229] px-3 py-1 text-[11px] font-medium text-slate-300 shadow-sm">{label}</span>
    </div>
  );
}

function AttachmentAction({ icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="chat-panel-pop flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-200 transition hover:-translate-y-0.5 hover:bg-white/10"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-200">
        <Icon className="h-5 w-5" />
      </span>
      {label}
    </button>
  );
}

function ChatBubble({
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

  return (
    <div className={`group flex ${sent ? "chat-bubble-sent justify-end" : "chat-bubble-received justify-start"}`}>
      <div className={`max-w-[82%] rounded-2xl px-4 py-3 shadow-sm ${sent ? "bg-[#005c4b] text-white rounded-br-sm" : "bg-[#202c33] text-slate-100 rounded-bl-sm"}`}>
        {message.replyTo && (
          <div className={`mb-2 rounded-lg border-l-4 p-2 text-xs ${sent ? "border-emerald-200 bg-white/10" : "border-emerald-300 bg-black/15"}`}>
            <div className="font-semibold">{message.replyTo.from}</div>
            <div className="truncate opacity-80">{message.replyTo.text}</div>
          </div>
        )}
        <div className={`mb-1 text-xs font-semibold ${sent ? "text-emerald-100" : "text-slate-300"}`}>
          {sent ? "You" : message.from || "Counsellor"}
          {message.fromUsername && !sent ? <span className="ml-1 font-normal opacity-70">@{message.fromUsername}</span> : null}
        </div>
        {editing ? (
          <div className="space-y-2">
            <Textarea rows={3} value={editingText} onChange={(event) => onEditText(event.target.value)} className="border-white/10 bg-[#111b21] text-slate-100" />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={onCancelEdit}>Cancel</Button>
              <Button size="sm" onClick={onSaveEdit}>Save</Button>
            </div>
          </div>
        ) : (
          <>
            {message.subject && <div className="text-sm font-semibold">{message.subject}</div>}
            <div className={`whitespace-pre-wrap text-sm leading-relaxed ${message.deleted ? "italic opacity-70" : ""}`}>{message.text}</div>
            {message.task && <div className="mt-2 rounded-lg bg-white/10 p-2 text-xs">Task: {message.task}</div>}
            {message.fileUrl && (
              <a className={`mt-2 inline-flex items-center gap-1 text-xs underline ${sent ? "text-emerald-100" : "text-emerald-300"}`} href={message.fileUrl} target="_blank" rel="noreferrer">
                <Paperclip className="h-3 w-3" />
                {message.fileName || "Open shared file"}
              </a>
            )}
          </>
        )}
        {reactions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {reactions.map(([emoji, count]) => (
              <button key={emoji} type="button" onClick={() => onReact(emoji)} className="rounded-full bg-white/10 px-2 py-0.5 text-xs hover:bg-white/15">
                {emoji} {count}
              </button>
            ))}
          </div>
        )}
        <div className={`mt-2 flex items-center justify-end gap-1 text-[11px] ${sent ? "text-emerald-100/80" : "text-slate-400"}`}>
          {message.edited && !message.deleted ? <span>edited</span> : null}
          {timeLabel}
          {sent && <CheckCheck className={`h-3.5 w-3.5 ${message.unread ? "" : "text-sky-300"}`} />}
        </div>
        {!message.deleted && (
          <div className="mt-2 flex flex-wrap justify-end gap-1 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
            <Button size="sm" variant="ghost" className="h-8 px-2 text-slate-100 hover:bg-white/10" onClick={onReply}>
              <Reply className="h-3.5 w-3.5" />
            </Button>
            {["+1", "heart", "thanks", "calm"].map((emoji) => (
              <Button key={emoji} size="sm" variant="ghost" className="h-8 px-2 text-slate-100 hover:bg-white/10" onClick={() => onReact(emoji)}>
                <SmilePlus className="mr-1 h-3.5 w-3.5" />
                {emoji}
              </Button>
            ))}
            {message.canEdit && (
              <Button size="sm" variant="ghost" className="h-8 px-2 text-slate-100 hover:bg-white/10" onClick={onStartEdit}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            {message.canDelete && (
              <Button size="sm" variant="ghost" className="h-8 px-2 text-rose-200 hover:bg-rose-500/10 hover:text-rose-100" onClick={onDelete}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PreferenceToggle({ title, text, checked, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="dashboard-card-motion flex w-full items-center justify-between gap-4 rounded-lg border border-glass-border/40 bg-background/60 p-4 text-left transition hover:border-primary/40"
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
