import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import {
  Activity,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  HeartHandshake,
  HeartPulse,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Video,
} from "lucide-react";

const fallbackPlans = [
  {
    id: "short-term",
    name: "Short-Term Support",
    duration: "4-8 sessions",
    cadence: "One session every two days",
    bestFor: ["Stress", "Anxiety", "Exam pressure", "Loneliness"],
    perSessionPrice: 700,
  },
  {
    id: "medium-term",
    name: "Medium-Term Support",
    duration: "8-15 sessions",
    cadence: "Weekly or bi-weekly",
    bestFor: ["Mild depression", "Relationship issues", "Emotional healing"],
    perSessionPrice: 650,
  },
  {
    id: "long-term",
    name: "Long-Term Therapy",
    duration: "3-6+ months",
    cadence: "Weekly or bi-weekly sessions",
    bestFor: ["Trauma", "Severe anxiety", "Chronic depression"],
    perSessionPrice: 600,
  },
];

const modeOptions = [
  { id: "google-meet", label: "Google Meet", icon: Video },
  { id: "in-person", label: "In person", icon: MapPin },
  { id: "voice-call", label: "Voice call", icon: Phone },
];

const timeSlots = ["09:00", "10:30", "12:00", "14:00", "16:30", "18:00"];

function formatRupees(value = 0) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function initials(name = "") {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "MS"
  );
}

function planTarget(duration = "") {
  const match = String(duration).match(/\d+/);
  return match ? Number(match[0]) : 4;
}

function modeLabel(value = "") {
  return modeOptions.find((mode) => mode.id === value)?.label || value.replace("-", " ");
}

const Counselling = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { counsellorId } = useParams();
  const user = useAppSelector((state) => state.auth.user);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [counsellors, setCounsellors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedId, setSelectedId] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("short-term");
  const [booking, setBooking] = useState({
    mode: "google-meet",
    date: "",
    time: "",
    concern: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [profiles, dashboard] = await Promise.all([
        apiFetch("/api/counsellors"),
        apiFetch("/api/user/dashboard").catch(() => ({ appointments: [] })),
      ]);
      setCounsellors(profiles);
      setAppointments(dashboard?.appointments || []);
      setSelectedId((current) => counsellorId || current || profiles?.[0]?.id || "");
    } catch (error) {
      toast({ variant: "destructive", title: "Could not load counsellors", description: error?.message || "" });
    } finally {
      setLoading(false);
    }
  }, [counsellorId, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (counsellorId) setSelectedId(counsellorId);
  }, [counsellorId]);

  const categories = useMemo(() => {
    const values = new Set(["All"]);
    counsellors.forEach((counsellor) => {
      (counsellor.categories || []).forEach((item) => values.add(item));
      (counsellor.supportPlans || fallbackPlans).forEach((plan) => {
        (plan.bestFor || []).forEach((item) => values.add(item));
      });
    });
    return [...values];
  }, [counsellors]);

  const filteredCounsellors = useMemo(() => {
    const q = search.trim().toLowerCase();
    return counsellors.filter((counsellor) => {
      const text = [
        counsellor.name,
        counsellor.specialization,
        counsellor.location,
        counsellor.education,
        counsellor.bio,
        ...(counsellor.categories || []),
        ...((counsellor.supportPlans || fallbackPlans).flatMap((plan) => plan.bestFor || [])),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesText = !q || text.includes(q);
      const matchesCategory = category === "All" || text.includes(category.toLowerCase());
      const matchesType = typeFilter === "all" || counsellor.counsellorType === typeFilter;
      return matchesText && matchesCategory && matchesType;
    });
  }, [category, counsellors, search, typeFilter]);

  const selectedCounsellor = counsellors.find((counsellor) => counsellor.id === selectedId) || filteredCounsellors[0] || counsellors[0] || null;
  const selectedPlans = selectedCounsellor?.supportPlans?.length ? selectedCounsellor.supportPlans : fallbackPlans;
  const selectedPlan = selectedPlans.find((plan) => plan.id === selectedPlanId) || selectedPlans[0];

  useEffect(() => {
    if (!selectedCounsellor) return;
    const firstPlan = selectedCounsellor.supportPlans?.[0]?.id || "short-term";
    setSelectedPlanId((current) => (selectedCounsellor.supportPlans?.some((plan) => plan.id === current) ? current : firstPlan));
    setBooking((current) => {
      const supportedModes = selectedCounsellor.consultationModes?.length ? selectedCounsellor.consultationModes : ["google-meet", "in-person", "voice-call"];
      return supportedModes.includes(current.mode) ? current : { ...current, mode: supportedModes[0] || "google-meet" };
    });
  }, [selectedCounsellor]);

  const progress = useMemo(() => {
    const completed = appointments.filter((item) => item.status === "completed");
    const upcoming = appointments.filter((item) => !["cancelled", "completed", "declined"].includes(item.status));
    const active = upcoming[0] || appointments[appointments.length - 1] || null;
    const target = planTarget(active?.supportPlanDuration || selectedPlan?.duration);
    const percent = Math.min(100, Math.round((completed.length / Math.max(1, target)) * 100));
    const byPlan = appointments.reduce((acc, appointment) => {
      const key = appointment.supportPlanName || "Counselling sessions";
      acc[key] = acc[key] || { total: 0, completed: 0 };
      acc[key].total += 1;
      if (appointment.status === "completed") acc[key].completed += 1;
      return acc;
    }, {});
    return {
      completed: completed.length,
      upcoming: upcoming.length,
      active,
      target,
      percent,
      byPlan: Object.entries(byPlan).map(([name, value]) => ({ name, ...value })),
    };
  }, [appointments, selectedPlan]);

  const supportedModes = selectedCounsellor?.consultationModes?.length ? selectedCounsellor.consultationModes : ["google-meet", "in-person", "voice-call"];

  const bookAppointment = async () => {
    if (!selectedCounsellor || !selectedPlan || !booking.date || !booking.time) {
      toast({ variant: "destructive", title: "Booking incomplete", description: "Choose counsellor, plan, date, and time." });
      return;
    }
    setSubmitting(true);
    try {
      const appointment = await apiFetch("/api/appointments", {
        method: "POST",
        body: JSON.stringify({
          counsellorId: selectedCounsellor.id,
          supportPlanId: selectedPlan.id,
          mode: booking.mode,
          date: booking.date,
          time: booking.time,
          concern: booking.concern,
          isAnonymous: false,
        }),
      });
      toast({
        title: "Appointment scheduled",
        description: `${selectedCounsellor.name} received your ${selectedPlan.name} booking details.`,
      });
      setAppointments((current) => [...current, appointment]);
      setBooking((current) => ({ ...current, date: "", time: "", concern: "" }));
      await loadData();
      navigate("/user?tab=sessions");
    } catch (error) {
      toast({ variant: "destructive", title: "Booking failed", description: error?.message || "" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-16">
        <section className="dashboard-motion bg-gradient-to-br from-primary/8 via-background to-accent/5 py-8 md:py-12">
          <div className="dashboard-shell mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
            <Card className="dashboard-panel glass-card overflow-hidden">
              <CardContent className="p-5 md:p-7">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-3xl">
                    <Badge className="bg-primary/15 text-primary border border-primary/25">Counselling marketplace</Badge>
                    <h1 className="mt-4 text-3xl font-bold md:text-5xl">Choose the right counsellor and therapy plan</h1>
                    <p className="mt-3 text-foreground/70">
                      Browse verified professionals and community mentors, view full profiles, choose short, medium, or long-term support, then book by Google Meet, in person, or voice call.
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <HeroMetric value={counsellors.length || "..."} label="Experts" />
                    <HeroMetric value="3" label="Plans" />
                    <HeroMetric value={`${progress.percent}%`} label="Progress" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="dashboard-stagger grid gap-6 xl:grid-cols-[0.96fr_1.04fr]">
              <div className="space-y-6">
                <Card className="dashboard-card-motion glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Search className="h-5 w-5 text-primary" />
                      Find Counsellors & Therapists
                    </CardTitle>
                    <CardDescription>Search by concern, plan type, specialization, location, language, or badge.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
                      <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search stress, trauma, exams, location..." />
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
                      <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All experts</SelectItem>
                          <SelectItem value="professional">Therapists</SelectItem>
                          <SelectItem value="mentor">Mentors</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      {loading ? (
                        <PanelText>Loading approved counsellors from MongoDB...</PanelText>
                      ) : filteredCounsellors.length === 0 ? (
                        <PanelText>No counsellors match this filter. Try another concern or plan type.</PanelText>
                      ) : (
                        filteredCounsellors.map((counsellor) => (
                          <CounsellorCard
                            key={counsellor.id}
                            counsellor={counsellor}
                            selected={selectedCounsellor?.id === counsellor.id}
                            onSelect={() => navigate(`/counselling/${counsellor.id}`)}
                          />
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                <ProgressPanel progress={progress} userName={user?.name} />
              </div>

              <div className="space-y-6">
                {selectedCounsellor ? (
                  <>
                    <ProfilePanel counsellor={selectedCounsellor} />

                    <Card className="dashboard-card-motion glass-card">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <HeartHandshake className="h-5 w-5 text-primary" />
                          Choose Support Plan
                        </CardTitle>
                        <CardDescription>Pick the plan that matches your current need. You can change later with your counsellor.</CardDescription>
                      </CardHeader>
                      <CardContent className="grid gap-3">
                        {selectedPlans.map((plan) => (
                          <PlanCard
                            key={plan.id}
                            plan={plan}
                            selected={selectedPlan?.id === plan.id}
                            onSelect={() => setSelectedPlanId(plan.id)}
                          />
                        ))}
                      </CardContent>
                    </Card>

                    <Card className="dashboard-card-motion glass-card border-primary/25">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <CalendarDays className="h-5 w-5 text-primary" />
                          Book Appointment
                        </CardTitle>
                        <CardDescription>
                          {selectedPlan?.name} with {selectedCounsellor.name}. Date and time are checked against counsellor bookings.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-3 md:grid-cols-3">
                          <div className="space-y-2">
                            <Label>Mode</Label>
                            <Select value={booking.mode} onValueChange={(mode) => setBooking((current) => ({ ...current, mode }))}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {modeOptions.map((mode) => (
                                  <SelectItem key={mode.id} value={mode.id} disabled={!supportedModes.includes(mode.id)}>
                                    {mode.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Date</Label>
                            <Input
                              type="date"
                              value={booking.date}
                              onChange={(event) => setBooking((current) => ({ ...current, date: event.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Time</Label>
                            <Select value={booking.time} onValueChange={(time) => setBooking((current) => ({ ...current, time }))}>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose slot" />
                              </SelectTrigger>
                              <SelectContent>
                                {timeSlots.map((slot) => (
                                  <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {timeSlots.map((slot) => (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => setBooking((current) => ({ ...current, time: slot }))}
                              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                                booking.time === slot ? "border-primary bg-primary text-primary-foreground" : "border-glass-border/50 bg-background/70 hover:border-primary/50"
                              }`}
                            >
                              {slot}
                            </button>
                          ))}
                        </div>

                        <div className="grid gap-3 md:grid-cols-3">
                          {modeOptions.map((mode) => {
                            const Icon = mode.icon;
                            const active = booking.mode === mode.id;
                            const disabled = !supportedModes.includes(mode.id);
                            return (
                              <button
                                key={mode.id}
                                type="button"
                                disabled={disabled}
                                onClick={() => setBooking((current) => ({ ...current, mode: mode.id }))}
                                className={`dashboard-card-motion rounded-lg border p-4 text-left transition ${
                                  active ? "border-primary bg-primary/10" : "border-glass-border/40 bg-background/60"
                                } ${disabled ? "cursor-not-allowed opacity-45" : "hover:border-primary/40"}`}
                              >
                                <Icon className="h-5 w-5 text-primary" />
                                <div className="mt-2 font-semibold">{mode.label}</div>
                                <div className="mt-1 text-xs text-foreground/60">{disabled ? "Not offered by this counsellor" : "Available for this profile"}</div>
                              </button>
                            );
                          })}
                        </div>

                        <div className="space-y-2">
                          <Label>What would you like support with?</Label>
                          <Textarea
                            value={booking.concern}
                            onChange={(event) => setBooking((current) => ({ ...current, concern: event.target.value }))}
                            placeholder="Share your concern, goal, or preferred focus for the first session."
                            rows={4}
                          />
                        </div>

                        <div className="rounded-lg border border-glass-border/40 bg-background/60 p-4 text-sm text-foreground/70">
                          <div className="font-semibold text-foreground">Booking summary</div>
                          <div className="mt-2 grid gap-2 md:grid-cols-2">
                            <span>{selectedPlan?.name} - {selectedPlan?.duration}</span>
                            <span>{formatRupees(selectedPlan?.perSessionPrice)} per session</span>
                            <span>{modeLabel(booking.mode)}</span>
                            <span>{booking.date || "Select date"} {booking.time ? `at ${booking.time}` : ""}</span>
                          </div>
                        </div>

                        <Button onClick={bookAppointment} disabled={submitting} className="w-full gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          {submitting ? "Sending request..." : "Book Counsellor"}
                        </Button>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <PanelText>Select a counsellor to view profile and plans.</PanelText>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

function HeroMetric({ value, label }) {
  return (
    <div className="dashboard-card-motion rounded-lg border border-glass-border/40 bg-background/60 px-4 py-3">
      <div className="text-2xl font-bold gradient-text">{value}</div>
      <div className="text-xs text-foreground/60">{label}</div>
    </div>
  );
}

function CounsellorCard({ counsellor, selected, onSelect }) {
  const plans = counsellor.supportPlans?.length ? counsellor.supportPlans : fallbackPlans;
  const lowestPrice = Math.min(...plans.map((plan) => Number(plan.perSessionPrice) || Number(counsellor.sessionPricing) || 700));
  return (
    <div className={`dashboard-card-motion rounded-lg border bg-background/60 p-4 ${selected ? "border-primary/70 ring-1 ring-primary/30" : "border-glass-border/40"}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <Avatar className="h-16 w-16 border border-glass-border/50">
          <AvatarImage src={counsellor.profilePhotoUrl} alt={counsellor.name} />
          <AvatarFallback>{initials(counsellor.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold">{counsellor.name}</h3>
            <Badge className={counsellor.counsellorType === "mentor" ? "bg-emerald-500/15 text-emerald-500" : "bg-blue-500/15 text-blue-500"}>
              {counsellor.badge || (counsellor.counsellorType === "mentor" ? "Community Mentor" : "Verified Professional")}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-foreground/70">{counsellor.specialization || "General counselling"}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Badge variant="secondary" className="gap-1"><MapPin className="h-3 w-3" />{counsellor.location || "Online"}</Badge>
            <Badge variant="secondary" className="gap-1"><Star className="h-3 w-3 fill-current" />{counsellor.rating || 4.8} ({counsellor.reviews || 0})</Badge>
            <Badge variant="secondary" className="gap-1"><Clock3 className="h-3 w-3" />{counsellor.responseTime || "Within 24 hours"}</Badge>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(counsellor.categories || []).slice(0, 4).map((item) => (
              <span key={item} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">
                {item}
              </span>
            ))}
          </div>
          <div className="mt-3 text-sm text-foreground/70">Starts from {formatRupees(lowestPrice)} per session</div>
        </div>
        <Button onClick={onSelect} variant={selected ? "default" : "outline"} className="sm:self-center">
          View Profile
        </Button>
      </div>
    </div>
  );
}

function ProfilePanel({ counsellor }) {
  const modes = counsellor.consultationModes?.length ? counsellor.consultationModes : ["google-meet", "in-person", "voice-call"];
  return (
    <Card className="dashboard-card-motion glass-card">
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar className="h-20 w-20 border border-glass-border/50">
            <AvatarImage src={counsellor.profilePhotoUrl} alt={counsellor.name} />
            <AvatarFallback>{initials(counsellor.name)}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-2xl">{counsellor.name}</CardTitle>
            <CardDescription>
              {counsellor.counsellorType === "mentor" ? "Community mentor" : "Professional therapist"} - {counsellor.specialization || "General counselling"}
            </CardDescription>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge className="bg-primary/15 text-primary border border-primary/20"><BadgeCheck className="mr-1 h-3 w-3" />{counsellor.badge}</Badge>
              {Number(counsellor.rating) >= 4.8 && <Badge className="bg-amber-500/15 text-amber-500">Top Rated</Badge>}
              <Badge variant="secondary">{counsellor.experience || "Experience verified"}</Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-relaxed text-foreground/75">{counsellor.bio || "Supportive, confidential mental health care for students and adults."}</p>
        <div className="grid gap-3 md:grid-cols-2">
          <InfoLine icon={MapPin} label="Location" value={counsellor.location || "Online"} />
          <InfoLine icon={Star} label="Ratings & reviews" value={`${counsellor.rating || 4.8} / 5 from ${counsellor.reviews || 0} reviews`} />
          <InfoLine icon={ShieldCheck} label="Education" value={counsellor.education || "Verified qualification"} />
          <InfoLine icon={HeartHandshake} label="Session pricing" value={`From ${formatRupees(counsellor.sessionPricing || 700)} per session`} />
          <InfoLine icon={MessageCircle} label="Languages" value={(counsellor.languages || ["English"]).join(", ")} />
          <InfoLine icon={Clock3} label="Availability" value={(counsellor.availability || ["Flexible slots"]).join(", ")} />
        </div>
        <div className="flex flex-wrap gap-2">
          {modes.map((mode) => (
            <Badge key={mode} variant="secondary">{modeLabel(mode)}</Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function InfoLine({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg border border-glass-border/40 bg-background/60 p-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-foreground/50">
        <Icon className="h-3.5 w-3.5 text-primary" />
        {label}
      </div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}

function PlanCard({ plan, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`dashboard-card-motion rounded-lg border p-4 text-left transition ${
        selected ? "border-primary bg-primary/10 ring-1 ring-primary/25" : "border-glass-border/40 bg-background/60 hover:border-primary/40"
      }`}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{plan.name}</h3>
            {selected && <Badge className="bg-primary/15 text-primary">Selected</Badge>}
          </div>
          <p className="mt-1 text-sm text-foreground/65">{plan.duration} - {plan.cadence}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(plan.bestFor || []).map((item) => (
              <span key={item} className="rounded-full bg-accent/10 px-2.5 py-1 text-xs text-accent">
                {item}
              </span>
            ))}
          </div>
        </div>
        <div className="shrink-0 text-left md:text-right">
          <div className="text-xl font-bold">{formatRupees(plan.perSessionPrice)}</div>
          <div className="text-xs text-foreground/55">per session</div>
        </div>
      </div>
    </button>
  );
}

function ProgressPanel({ progress, userName }) {
  const next = progress.active;
  return (
    <Card className="dashboard-card-motion glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Counselling Progress
        </CardTitle>
        <CardDescription>{userName ? `${userName}'s support plan snapshot` : "Your support plan snapshot"}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <ProgressStat icon={CheckCircle2} value={progress.completed} label="Completed" />
          <ProgressStat icon={CalendarDays} value={progress.upcoming} label="Upcoming" />
          <ProgressStat icon={HeartPulse} value={progress.target} label="Plan target" />
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-foreground/70">Overall progress</span>
            <span className="font-semibold">{progress.percent}%</span>
          </div>
          <Progress value={progress.percent} className="dashboard-progress" />
        </div>
        {next ? (
          <div className="rounded-lg border border-primary/25 bg-primary/10 p-4">
            <div className="flex items-center gap-2 font-semibold">
              <Sparkles className="h-4 w-4 text-primary" />
              Next step
            </div>
            <div className="mt-2 text-sm text-foreground/75">
              {next.supportPlanName || "Counselling session"} with {next.counsellorName} on {next.date} at {next.time} by {modeLabel(next.mode)}.
            </div>
          </div>
        ) : (
          <PanelText>Book your first counselling session to start progress tracking.</PanelText>
        )}
        <div className="space-y-2">
          {progress.byPlan.length === 0 ? (
            <PanelText>No plan activity yet.</PanelText>
          ) : (
            progress.byPlan.map((plan) => (
              <div key={plan.name} className="rounded-lg border border-glass-border/40 bg-background/60 p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{plan.name}</span>
                  <span className="text-foreground/60">{plan.completed}/{plan.total} completed</span>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ProgressStat({ icon: Icon, value, label }) {
  return (
    <div className="rounded-lg border border-glass-border/40 bg-background/60 p-3 text-center">
      <Icon className="mx-auto h-4 w-4 text-primary" />
      <div className="mt-2 text-xl font-bold">{value}</div>
      <div className="text-xs text-foreground/60">{label}</div>
    </div>
  );
}

function PanelText({ children }) {
  return <div className="rounded-lg border border-glass-border/40 bg-background/60 p-3 text-sm text-foreground/75">{children}</div>;
}

export default Counselling;
