import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Check,
  CreditCard,
  GraduationCap,
  Languages,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from "lucide-react";

const fallbackPlans = [
  {
    id: "short-term",
    name: "Short-Term Support",
    duration: "4-8 sessions",
    cadence: "One session every two days",
    summary: "Quick emotional support and guidance",
    bestFor: ["Stress", "Anxiety", "Exam pressure", "Loneliness"],
    bookingPrice: 1499,
    perSessionPrice: 1499,
  },
  {
    id: "medium-term",
    name: "Medium-Term Support",
    duration: "8-15 sessions",
    cadence: "Weekly or bi-weekly",
    summary: "Emotional recovery and personal growth",
    bestFor: ["Mild depression", "Relationship issues", "Emotional healing"],
    bookingPrice: 2499,
    perSessionPrice: 2499,
  },
  {
    id: "long-term",
    name: "Long-Term Therapy",
    duration: "3-6+ months",
    cadence: "Weekly or bi-weekly sessions",
    summary: "Ongoing therapy and steady progress",
    bestFor: ["Trauma", "Severe anxiety", "Chronic depression"],
    bookingPrice: 3999,
    perSessionPrice: 3999,
  },
];

const activeStatuses = ["pending", "confirmed"];
const avatarTones = [
  "from-emerald-200 to-green-300 text-violet-500",
  "from-orange-200 to-amber-300 text-violet-500",
  "from-rose-200 to-orange-200 text-violet-500",
  "from-cyan-200 to-sky-300 text-violet-500",
  "from-fuchsia-200 to-purple-300 text-violet-500",
  "from-lime-200 to-yellow-200 text-violet-500",
];
const slots = ["08:00", "11:00", "13:30", "17:00", "19:30"];

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

function planLabel(planId = "") {
  return planId
    .split("-")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("-");
}

function plansFor(counsellor) {
  return counsellor?.supportPlans?.length ? counsellor.supportPlans : fallbackPlans;
}

function planPrice(plan) {
  return Number(plan?.bookingPrice || plan?.perSessionPrice || 0);
}

function lowestPrice(counsellor) {
  return Math.min(...plansFor(counsellor).map((plan) => planPrice(plan) || 1499));
}

function planFromList(counsellor, planId) {
  const plans = plansFor(counsellor);
  return plans.find((plan) => plan.id === planId) || plans[0];
}

function modeLabel(value = "") {
  const labels = {
    "google-meet": "Google Meet",
    "in-person": "In person",
    "voice-call": "Voice call",
    online: "Online",
  };
  return labels[value] || value || "Google Meet";
}

const Counselling = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { counsellorId } = useParams();
  const [loading, setLoading] = useState(true);
  const [counsellors, setCounsellors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [selectedPlanId, setSelectedPlanId] = useState("short-term");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [profiles, userAppointments] = await Promise.all([
        apiFetch("/api/counsellors"),
        apiFetch("/api/appointments/my").catch(() => []),
      ]);
      setCounsellors(profiles || []);
      setAppointments(userAppointments || []);
    } catch (error) {
      toast({ variant: "destructive", title: "Could not load counselling", description: error?.message || "" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const categories = useMemo(() => {
    const values = new Set(["All"]);
    counsellors.forEach((counsellor) => {
      (counsellor.categories || []).forEach((item) => values.add(item));
      plansFor(counsellor).forEach((plan) => (plan.bestFor || []).forEach((item) => values.add(item)));
    });
    return [...values];
  }, [counsellors]);

  const activeBookings = useMemo(() => {
    const map = new Map();
    appointments
      .filter((appointment) => activeStatuses.includes(appointment.status))
      .forEach((appointment) => map.set(appointment.counsellorId, appointment));
    return map;
  }, [appointments]);

  const filteredCounsellors = useMemo(() => {
    const q = search.trim().toLowerCase();
    return counsellors.filter((counsellor) => {
      const text = [
        counsellor.name,
        counsellor.specialization,
        counsellor.location,
        counsellor.education,
        counsellor.bio,
        counsellor.badge,
        ...(counsellor.categories || []),
        ...plansFor(counsellor).flatMap((plan) => plan.bestFor || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return (!q || text.includes(q)) && (category === "All" || text.includes(category.toLowerCase()));
    });
  }, [category, counsellors, search]);

  const selectedCounsellor = counsellors.find((counsellor) => counsellor.id === counsellorId);

  useEffect(() => {
    if (!selectedCounsellor) return;
    setSelectedPlanId((current) => (plansFor(selectedCounsellor).some((plan) => plan.id === current) ? current : plansFor(selectedCounsellor)[0]?.id));
  }, [selectedCounsellor]);

  if (counsellorId) {
    return (
      <CounsellorProfile
        counsellor={selectedCounsellor}
        loading={loading}
        selectedPlanId={selectedPlanId}
        setSelectedPlanId={setSelectedPlanId}
        booking={activeBookings.get(counsellorId)}
        onBack={() => navigate("/counselling")}
        onSchedule={(planId) => navigate(`/session-schedule?counsellorId=${counsellorId}&plan=${planId}`)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#070b15] text-foreground">
      <Navigation />
      <main className="pt-16">
        <section className="dashboard-motion relative overflow-hidden py-10 md:py-14">
          <div className="absolute inset-x-0 top-28 h-72 bg-purple-700/10 blur-3xl" />
          <div className="relative mx-auto max-w-[1540px] px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <Badge className="border border-primary/25 bg-primary/15 text-primary">Professional counselling marketplace</Badge>
                <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-5xl">Book trusted support with one clear package payment</h1>
                <p className="mt-3 text-base text-muted-foreground md:text-lg">
                  Compare verified counsellors, review therapy plans, and book the right expert once with transparent rupee pricing.
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <HeroStat icon={Users} value={`${counsellors.length || "12"}+`} label="Approved experts" />
                  <HeroStat icon={CreditCard} value="One-time" label="Package payment" />
                  <HeroStat icon={ShieldCheck} value="Verified" label="Professional profiles" />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-[minmax(220px,320px)_190px]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="h-11 rounded-xl border-white/10 bg-[#0d1220] pl-9"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search anxiety, trauma, city..."
                  />
                </div>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-11 rounded-xl border-white/10 bg-[#0d1220]">
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
            </div>

            {loading ? (
              <EmptyPanel text="Loading counsellors from MongoDB..." />
            ) : filteredCounsellors.length === 0 ? (
              <EmptyPanel text="No counsellors match this filter. Try another concern or location." />
            ) : (
              <div className="dashboard-stagger grid gap-7 md:grid-cols-2 xl:grid-cols-3">
                {filteredCounsellors.map((counsellor, index) => (
                  <CounsellorCard
                    key={counsellor.id}
                    counsellor={counsellor}
                    tone={avatarTones[index % avatarTones.length]}
                    booking={activeBookings.get(counsellor.id)}
                    onView={() => navigate(`/counselling/${counsellor.id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

function CounsellorCard({ counsellor, tone, booking, onView }) {
  const plans = plansFor(counsellor);
  const accepting = counsellor.bookingEnabled !== false;
  return (
    <article className="dashboard-card-motion relative flex min-h-[390px] flex-col overflow-hidden rounded-[28px] border border-white/8 bg-[#0d1220]/95 p-7 shadow-[0_20px_70px_rgba(4,7,18,0.45)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-400 via-sky-400 to-emerald-300" />
      <div className="flex gap-5">
        <Avatar className={`h-20 w-20 rounded-[24px] border-0 bg-gradient-to-br ${tone}`}>
          <AvatarImage src={counsellor.profilePhotoUrl} alt={counsellor.name} />
          <AvatarFallback className={`rounded-[24px] bg-gradient-to-br text-3xl font-bold ${tone}`}>{initials(counsellor.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h2 className="text-xl font-bold leading-tight">{counsellor.name}</h2>
          <p className="mt-1 text-base text-slate-300/75">{counsellor.specialization || "Mental wellness counsellor"}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-semibold">
            <Star className="h-4 w-4 fill-red-400 text-red-400" />
            <span>{Number(counsellor.rating || 4.8).toFixed(1)}</span>
            <span className="text-slate-400">({counsellor.reviews || 0})</span>
            <span className={`rounded-full px-2.5 py-1 text-xs ${accepting ? "bg-emerald-400/10 text-emerald-300" : "bg-rose-400/10 text-rose-300"}`}>
              {accepting ? "Accepting bookings" : "Currently unavailable"}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-7 flex flex-wrap gap-2">
        {(counsellor.categories || []).slice(0, 3).map((item) => (
          <span key={item} className="rounded-full bg-[#151b30] px-3 py-1 text-sm font-semibold text-slate-100">
            {item}
          </span>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 text-slate-300/80">
        <IconLine icon={BriefcaseBusiness} text={counsellor.experience || "Experience verified"} />
        <IconLine icon={MapPin} text={counsellor.location || "Online"} />
      </div>

      <div className="my-7 h-px bg-white/8" />

      <div className="mt-auto">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Package plans</p>
          <p className="text-sm font-semibold text-emerald-300">from {formatRupees(lowestPrice(counsellor))} once</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {plans.map((plan) => (
            <span key={plan.id} className="rounded-full bg-violet-500/25 px-3 py-1 text-sm font-bold text-violet-300">
              {planLabel(plan.id)}
            </span>
          ))}
        </div>
        {booking && (
          <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-200">
            Already booked: {booking.date} at {booking.time}
          </div>
        )}
        <Button onClick={onView} className="mt-7 h-12 w-full rounded-full bg-violet-500 text-base font-bold text-white hover:bg-violet-400">
          View Profile & Book
        </Button>
      </div>
    </article>
  );
}

function CounsellorProfile({ counsellor, loading, selectedPlanId, setSelectedPlanId, booking, onBack, onSchedule }) {
  const selectedPlan = planFromList(counsellor, selectedPlanId);

  return (
    <div className="min-h-screen bg-[#070b15] text-foreground">
      <Navigation />
      <main className="pt-16">
        <section className="dashboard-motion py-10 md:py-14">
          <div className="mx-auto max-w-[1380px] px-4 sm:px-6 lg:px-8">
            <button type="button" onClick={onBack} className="mb-10 flex items-center gap-2 text-slate-300 transition hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Back to counsellors
            </button>

            {loading && !counsellor ? (
              <EmptyPanel text="Loading counsellor profile..." />
            ) : !counsellor ? (
              <EmptyPanel text="Counsellor profile not found." />
            ) : (
              <div className="grid gap-8 lg:grid-cols-[1fr_430px]">
                <div className="space-y-8">
                  <Card className="dashboard-card-motion rounded-[28px] border-white/8 bg-[#0d1220] shadow-[0_20px_70px_rgba(4,7,18,0.38)]">
                    <CardContent className="p-7 md:p-10">
                      <div className="flex flex-col gap-7 md:flex-row">
                        <Avatar className="h-36 w-36 rounded-[34px] border-0 bg-gradient-to-br from-orange-200 to-amber-300 text-violet-500">
                          <AvatarImage src={counsellor.profilePhotoUrl} alt={counsellor.name} />
                          <AvatarFallback className="rounded-[34px] bg-gradient-to-br from-orange-200 to-amber-300 text-5xl font-bold text-violet-500">
                            {initials(counsellor.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <h1 className="text-3xl font-bold md:text-4xl">{counsellor.name}</h1>
                          <p className="mt-2 text-xl text-slate-300/80">{counsellor.specialization || "Mental wellness counsellor"}</p>
                          <div className="mt-4 flex flex-wrap items-center gap-4 text-slate-300">
                            <span className="flex items-center gap-2 font-semibold">
                              <Star className="h-5 w-5 fill-red-400 text-red-400" />
                              {Number(counsellor.rating || 4.8).toFixed(1)} ({counsellor.reviews || 0} reviews)
                            </span>
                            <span className="flex items-center gap-2">
                              <MapPin className="h-5 w-5 text-slate-400" />
                              {counsellor.location || "Online"}
                            </span>
                          </div>
                          <div className="mt-6 flex flex-wrap gap-2">
                            {(counsellor.categories || []).map((item) => (
                              <Badge key={item} className="rounded-full bg-violet-500/25 px-3 py-1 text-violet-300">
                                {item}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="mt-9 grid gap-4 md:grid-cols-3">
                        <InfoTile icon={BriefcaseBusiness} label="Experience" value={counsellor.experience || "Verified"} />
                        <InfoTile icon={GraduationCap} label="Qualifications" value={counsellor.education || "Verified qualification"} />
                        <InfoTile icon={Languages} label="Languages" value={(counsellor.languages || ["English"]).join(", ")} />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="dashboard-card-motion rounded-[28px] border-white/8 bg-[#0d1220]">
                    <CardHeader className="p-7 pb-3 md:p-10 md:pb-4">
                      <CardTitle>About</CardTitle>
                    </CardHeader>
                    <CardContent className="px-7 pb-7 md:px-10 md:pb-10">
                      <p className="text-lg leading-8 text-slate-300/80">
                        {counsellor.bio || "A warm, privacy-first counsellor focused on emotional support, practical tools, and steady progress."}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="dashboard-card-motion rounded-[28px] border-white/8 bg-[#0d1220]">
                    <CardHeader className="p-7 pb-3 md:p-10 md:pb-4">
                      <CardTitle>Therapy plans</CardTitle>
                      <CardDescription>Select a plan, then continue to the separate schedule page.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-5 px-7 pb-7 sm:grid-cols-2 md:px-10 md:pb-10">
                      {plansFor(counsellor).map((plan) => (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => setSelectedPlanId(plan.id)}
                          className={`min-h-[190px] rounded-[24px] border p-6 text-left transition ${
                            selectedPlan?.id === plan.id
                              ? "border-violet-400 bg-violet-500 text-white shadow-[0_18px_50px_rgba(139,92,246,0.28)]"
                              : "border-white/10 bg-[#070b15] hover:border-violet-400/50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <h3 className="text-2xl font-bold">{plan.name}</h3>
                            {selectedPlan?.id === plan.id && <Check className="h-5 w-5" />}
                          </div>
                          <p className="mt-2 text-sm opacity-80">{plan.duration}</p>
                          <div className="mt-6 text-3xl font-bold">
                            {formatRupees(planPrice(plan))}
                            <span className="text-sm font-semibold opacity-75"> once</span>
                          </div>
                        </button>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                <aside className="lg:sticky lg:top-24 lg:self-start">
                  <Card className="dashboard-card-motion rounded-[28px] border-white/8 bg-[#0d1220] shadow-[0_20px_70px_rgba(4,7,18,0.38)]">
                    <CardContent className="p-7 md:p-8">
                      <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Selected plan</p>
                      <h2 className="mt-3 text-3xl font-bold">{selectedPlan?.name}</h2>
                      <p className="mt-2 text-lg text-slate-300/80">{selectedPlan?.summary || "Personalized support plan"}</p>

                      <div className="mt-8 space-y-4 text-lg">
                        <SummaryLine label="Duration" value={selectedPlan?.duration} />
                        <SummaryLine label="Cadence" value={selectedPlan?.cadence} />
                        <SummaryLine label="One-time payment" value={formatRupees(planPrice(selectedPlan))} />
                        <SummaryLine label="Mode" value={(counsellor.consultationModes || ["google-meet"]).map(modeLabel).join(", ")} />
                      </div>
                      <div className="mt-6 rounded-3xl border border-violet-400/20 bg-violet-400/10 p-4 text-sm text-violet-100">
                        <Sparkles className="mb-2 h-4 w-4" />
                        One booking unlocks the selected support package with this counsellor. No per-session charge is shown to the user.
                      </div>

                      <div className="mt-8">
                        <p className="mb-3 text-sm uppercase tracking-[0.16em] text-slate-400">Today's available slots</p>
                        <div className="flex flex-wrap gap-2">
                          {slots.map((slot) => (
                            <span key={slot} className="rounded-full bg-[#151b30] px-4 py-1.5 text-sm font-bold">
                              {slot}
                            </span>
                          ))}
                        </div>
                      </div>

                      {booking && (
                        <div className="mt-7 rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-emerald-100">
                          <div className="font-bold">Already booked</div>
                          <div className="mt-1 text-sm opacity-85">
                            {booking.supportPlanName || "Counselling session"} on {booking.date} at {booking.time}.
                          </div>
                        </div>
                      )}

                      <Button
                        onClick={() => onSchedule(selectedPlan?.id)}
                        className="mt-7 h-14 w-full rounded-full bg-violet-500 text-lg font-bold text-white hover:bg-violet-400"
                      >
                        {booking ? "Open session schedule" : "Book counsellor"}
                      </Button>
                    </CardContent>
                  </Card>

                  <div className="mt-5 rounded-[24px] border border-white/8 bg-[#0d1220]/70 p-5 text-sm leading-6 text-slate-300/75">
                    <ShieldCheck className="mb-3 h-5 w-5 text-emerald-300" />
                    This platform provides emotional support and does not replace medical or psychiatric treatment. For emergencies, contact professional services immediately.
                  </div>
                </aside>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function HeroStat({ icon: Icon, value, label }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-[#0d1220]/80 p-4">
      <Icon className="mb-3 h-5 w-5 text-primary" />
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs text-slate-300/65">{label}</div>
    </div>
  );
}

function IconLine({ icon: Icon, text }) {
  return (
    <div className="flex min-w-0 items-center gap-3 text-base">
      <Icon className="h-5 w-5 shrink-0 text-slate-400" />
      <span className="truncate">{text}</span>
    </div>
  );
}

function InfoTile({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[22px] bg-[#151b30]/75 p-5">
      <div className="flex items-center gap-2 text-sm uppercase tracking-[0.16em] text-slate-400">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="mt-3 text-lg font-bold">{value}</div>
    </div>
  );
}

function SummaryLine({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-300/80">{label}</span>
      <span className="text-right font-bold">{value || "Flexible"}</span>
    </div>
  );
}

function EmptyPanel({ text }) {
  return <div className="rounded-[24px] border border-white/8 bg-[#0d1220] p-6 text-slate-300">{text}</div>;
}

export default Counselling;
