import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Check,
  GraduationCap,
  Languages,
  MapPin,
  Search,
  ShieldCheck,
  Star,
  Video,
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

function compactModeLabel(value = "") {
  const labels = {
    "google-meet": "Meet",
    "in-person": "In-person",
    "voice-call": "Voice",
    online: "Online",
  };
  return labels[value] || value || "Meet";
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
    <div className="min-h-screen bg-[#050914] text-foreground">
      <Navigation />
      <main className="pt-16">
        <section className="dashboard-motion relative overflow-hidden py-10 md:py-12">
          <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-violet-700/15 blur-3xl" />
          <div className="absolute right-8 top-44 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
          <div className="relative mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8">
            <div className="mb-7 grid gap-5 lg:grid-cols-[1fr_0.7fr] lg:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-300">Our counsellors</p>
                <h1 className="mt-2 max-w-2xl text-[2rem] font-bold leading-tight tracking-tight md:text-[2.65rem]">Find someone you click with</h1>
              </div>
              <p className="max-w-md text-sm leading-7 text-slate-300/75 md:justify-self-end md:text-base">
                Verified, multilingual professionals across stress, relationships, trauma, student pressure, and more.
              </p>
            </div>

            <div className="mb-7 rounded-[24px] border border-white/10 bg-[#0b1020] p-4 shadow-[0_22px_60px_rgba(4,7,18,0.28)] md:p-5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-5 top-3.5 h-4 w-4 text-slate-400" />
                <Input
                  className="h-12 rounded-[22px] border-white/10 bg-[#050914] pl-12 text-sm"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name or specialty (e.g. anxiety, relationships)..."
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {categories.slice(0, 10).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCategory(item)}
                    className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                      category === item
                        ? "border-transparent bg-blue-500 text-white shadow-[0_10px_24px_rgba(59,130,246,0.24)]"
                        : "border-white/8 bg-[#151b30] text-slate-300 hover:border-violet-400/45 hover:text-white"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <p className="mt-4 text-xs font-medium text-slate-400">
                Showing {filteredCounsellors.length} of {counsellors.length} counsellors
              </p>
            </div>

            {loading ? (
              <EmptyPanel text="Loading counsellors from MongoDB..." />
            ) : filteredCounsellors.length === 0 ? (
              <EmptyPanel text="No counsellors match this filter. Try another concern or location." />
            ) : (
              <div className="dashboard-stagger grid gap-5 md:grid-cols-2 xl:grid-cols-3">
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
  const accepting = counsellor.bookingEnabled !== false;
  const languages = counsellor.languages?.length ? counsellor.languages : ["English"];
  const modes = counsellor.consultationModes?.length ? counsellor.consultationModes : ["google-meet", "voice-call", "in-person"];
  return (
    <article className="dashboard-card-motion group relative flex min-h-[354px] flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[#0b1020]/95 p-5 shadow-[0_18px_46px_rgba(4,7,18,0.3)]">
      <div className="pointer-events-none absolute -bottom-16 right-0 h-32 w-32 rounded-full bg-violet-500/12 blur-3xl transition group-hover:bg-violet-500/22" />
      <div className="relative flex gap-4">
        <div className="relative shrink-0">
          <Avatar className={`h-16 w-16 rounded-[20px] border-0 bg-gradient-to-br ${tone}`}>
            <AvatarImage src={counsellor.profilePhotoUrl} alt={counsellor.name} />
            <AvatarFallback className={`rounded-[20px] bg-gradient-to-br text-xl font-bold ${tone}`}>{initials(counsellor.name)}</AvatarFallback>
          </Avatar>
          <span className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-[3px] border-[#0b1020] ${accepting ? "bg-emerald-400" : "bg-rose-400"}`} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold leading-tight">{counsellor.name}</h2>
          <p className="mt-0.5 text-sm text-slate-300/70">{counsellor.specialization || "Mental wellness counsellor"}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs font-semibold">
            <Star className="h-3.5 w-3.5 fill-red-400 text-red-400" />
            <span>{Number(counsellor.rating || 4.8).toFixed(1)}</span>
            <span className="text-slate-400">({counsellor.reviews || 0})</span>
            <span className={`ml-1 inline-flex items-center gap-1.5 ${accepting ? "text-emerald-300" : "text-rose-300"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${accepting ? "bg-emerald-400" : "bg-rose-400"}`} />
              {accepting ? "Available" : "Paused"}
            </span>
          </div>
        </div>
      </div>

      <p className="relative mt-5 line-clamp-2 min-h-[44px] text-sm leading-6 text-slate-300/70">
        {counsellor.bio || "Warm, practical support focused on emotional clarity, coping skills, and steady progress."}
      </p>

      <div className="relative mt-3 flex min-h-[28px] flex-wrap gap-2">
        {(counsellor.categories || []).slice(0, 3).map((item) => (
          <span key={item} className="rounded-full bg-[#151b30] px-2.5 py-1 text-[11px] font-semibold text-slate-100">
            {item}
          </span>
        ))}
      </div>

      <div className="relative mt-5 grid grid-cols-2 gap-4 text-slate-300/80">
        <IconLine icon={BriefcaseBusiness} text={`${counsellor.experience || "Verified"} exp`} />
        <IconLine icon={MapPin} text={counsellor.location || "Online"} />
      </div>
      <div className="relative mt-3">
        <IconLine icon={Languages} text={languages.join(" / ")} />
      </div>

      <div className="relative my-4 h-px bg-white/8" />

      <div className="relative mt-auto">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Starts at</p>
            <p className="mt-1 whitespace-nowrap text-[1.65rem] font-bold leading-none text-slate-100">
              {formatRupees(lowestPrice(counsellor))}
              <span className="text-[11px] font-semibold text-slate-400"> / package</span>
            </p>
          </div>
          <span className="inline-flex max-w-[176px] items-center gap-1 rounded-full bg-violet-500/25 px-2.5 py-1 text-[10px] font-semibold leading-tight text-violet-300">
            <Video className="h-3.5 w-3.5" />
            {modes.map(compactModeLabel).join(" / ")}
          </span>
        </div>
        {booking && (
          <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200">
            Already booked: {booking.date} at {booking.time}
          </div>
        )}
        <Button
          onClick={onView}
          variant="outline"
          className="mt-4 h-10 w-full rounded-2xl border-white/10 bg-transparent text-sm font-bold text-slate-100 hover:border-violet-400/50 hover:bg-violet-500/15 hover:text-white"
        >
          View Profile
        </Button>
      </div>
    </article>
  );
}

function CounsellorProfile({ counsellor, loading, selectedPlanId, setSelectedPlanId, booking, onBack, onSchedule }) {
  const selectedPlan = planFromList(counsellor, selectedPlanId);

  return (
    <div className="min-h-screen bg-[#050914] text-foreground">
      <Navigation />
      <main className="pt-16">
        <section className="dashboard-motion relative overflow-hidden py-8 md:py-10">
          <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-violet-700/15 blur-3xl" />
          <div className="absolute right-8 top-44 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
          <div className="relative mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8">
            <button type="button" onClick={onBack} className="mb-5 flex items-center gap-2 text-sm text-slate-300 transition hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Back to counsellors
            </button>

            {loading && !counsellor ? (
              <EmptyPanel text="Loading counsellor profile..." />
            ) : !counsellor ? (
              <EmptyPanel text="Counsellor profile not found." />
            ) : (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="space-y-6">
                  <Card className="dashboard-card-motion overflow-hidden rounded-[28px] border-white/10 bg-[#0b1020] shadow-[0_22px_60px_rgba(4,7,18,0.34)]">
                    <CardContent className="relative p-5 md:p-6">
                      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-violet-500/15 blur-3xl" />
                      <div className="relative flex flex-col gap-6 md:flex-row">
                        <Avatar className="h-28 w-28 rounded-[30px] border-0 bg-gradient-to-br from-orange-200 to-amber-300 text-violet-500">
                          <AvatarImage src={counsellor.profilePhotoUrl} alt={counsellor.name} />
                          <AvatarFallback className="rounded-[30px] bg-gradient-to-br from-orange-200 to-amber-300 text-4xl font-bold text-violet-500">
                            {initials(counsellor.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-3xl font-bold tracking-tight md:text-[2.15rem]">{counsellor.name}</h1>
                            <Badge className="rounded-full bg-emerald-400/15 text-emerald-300">{counsellor.badge || "Verified"}</Badge>
                          </div>
                          <p className="mt-1 text-base text-slate-300/80">{counsellor.specialization || "Mental wellness counsellor"}</p>
                          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-300">
                            <span className="flex items-center gap-2 font-semibold">
                              <Star className="h-4 w-4 fill-red-400 text-red-400" />
                              {Number(counsellor.rating || 4.8).toFixed(1)} ({counsellor.reviews || 0} reviews)
                            </span>
                            <span className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-slate-400" />
                              {counsellor.location || "Online"}
                            </span>
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {(counsellor.categories || []).map((item) => (
                              <Badge key={item} className="rounded-full bg-violet-500/25 px-2.5 py-1 text-xs text-violet-300">
                                {item}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="relative mt-6 grid gap-3 md:grid-cols-3">
                        <InfoTile icon={BriefcaseBusiness} label="Experience" value={counsellor.experience || "Verified"} />
                        <InfoTile icon={GraduationCap} label="Qualifications" value={counsellor.education || "Verified qualification"} />
                        <InfoTile icon={Languages} label="Languages" value={(counsellor.languages || ["English"]).join(", ")} />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="dashboard-card-motion rounded-[24px] border-white/10 bg-[#0b1020]">
                    <CardHeader className="p-5 pb-2 md:p-6 md:pb-2">
                      <CardTitle className="text-lg">About</CardTitle>
                    </CardHeader>
                    <CardContent className="px-5 pb-5 md:px-6 md:pb-6">
                      <p className="text-sm leading-7 text-slate-300/80">
                        {counsellor.bio || "A warm, privacy-first counsellor focused on emotional support, practical tools, and steady progress."}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="dashboard-card-motion rounded-[24px] border-white/10 bg-[#0b1020]">
                    <CardHeader className="p-5 pb-2 md:p-6 md:pb-2">
                      <CardTitle className="text-lg">Therapy plans</CardTitle>
                      <CardDescription>Select a plan, then continue to the separate schedule page.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 px-5 pb-5 sm:grid-cols-2 md:px-6 md:pb-6">
                      {plansFor(counsellor).map((plan) => (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => setSelectedPlanId(plan.id)}
                          className={`min-h-[164px] rounded-[22px] border p-5 text-left transition ${
                            selectedPlan?.id === plan.id
                              ? "border-violet-300 bg-violet-500 text-white shadow-[0_20px_44px_rgba(139,92,246,0.28)]"
                              : "border-white/10 bg-[#070b15] hover:border-violet-400/50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <h3 className="text-lg font-bold">{plan.name}</h3>
                            {selectedPlan?.id === plan.id && <Check className="h-5 w-5" />}
                          </div>
                          <p className="mt-2 text-sm opacity-80">{plan.summary}</p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {(plan.bestFor || []).slice(0, 3).map((item) => (
                              <span key={item} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${selectedPlan?.id === plan.id ? "bg-white/15 text-white" : "bg-violet-500/20 text-violet-300"}`}>
                                {item}
                              </span>
                            ))}
                          </div>
                          <div className="mt-4 text-2xl font-bold">
                            {formatRupees(planPrice(plan))}
                            <span className="text-sm font-semibold opacity-75"> one-time</span>
                          </div>
                          <p className="mt-1 text-xs opacity-70">{plan.duration} - {plan.cadence}</p>
                        </button>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                <aside className="lg:sticky lg:top-24 lg:self-start">
                  <Card className="dashboard-card-motion overflow-hidden rounded-[26px] border-white/10 bg-[#0b1020] shadow-[0_22px_60px_rgba(4,7,18,0.36)]">
                    <CardContent className="relative p-5">
                      <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-violet-500/15 blur-3xl" />
                      <div className="relative">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Selected plan</p>
                      <h2 className="mt-2 text-2xl font-bold">{selectedPlan?.name}</h2>
                      <p className="mt-1 text-sm leading-6 text-slate-300/80">{selectedPlan?.summary || "Personalized support plan"}</p>
                      <div className="mt-4 rounded-[22px] border border-violet-400/20 bg-violet-500/15 p-3">
                        <div className="text-xs uppercase tracking-[0.16em] text-violet-200/80">Package total</div>
                        <div className="mt-1 text-3xl font-bold text-white">{formatRupees(planPrice(selectedPlan))}</div>
                        <div className="mt-1 text-xs text-violet-100/75">one-time counsellor booking</div>
                      </div>

                      <div className="mt-4 space-y-2.5 text-sm">
                        <SummaryLine label="Duration" value={selectedPlan?.duration} />
                        <SummaryLine label="Cadence" value={selectedPlan?.cadence} />
                        <SummaryLine label="Mode" value={(counsellor.consultationModes || ["google-meet"]).map(modeLabel).join(", ")} />
                      </div>

                      <div className="mt-4">
                        <p className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-400">Today's available slots</p>
                        <div className="flex flex-wrap gap-2">
                          {slots.map((slot) => (
                            <span key={slot} className="rounded-full bg-[#151b30] px-3 py-1 text-xs font-bold">
                              {slot}
                            </span>
                          ))}
                        </div>
                      </div>

                      {booking && (
                        <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-emerald-100">
                          <div className="font-bold">Already booked</div>
                          <div className="mt-1 text-sm opacity-85">
                            {booking.supportPlanName || "Counselling session"} on {booking.date} at {booking.time}.
                          </div>
                        </div>
                      )}

                      <Button
                        onClick={() => onSchedule(selectedPlan?.id)}
                        className="mt-5 h-12 w-full rounded-2xl bg-violet-500 text-sm font-bold text-white shadow-[0_16px_32px_rgba(139,92,246,0.22)] hover:bg-violet-400"
                      >
                        {booking ? "Open session schedule" : "Book counsellor"}
                      </Button>
                      <p className="mt-3 text-center text-xs text-slate-300/65">
                        One booking unlocks this full support package. No per-session charge is shown.
                      </p>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="mt-4 rounded-[22px] border border-white/10 bg-[#0d1220]/70 p-4 text-xs leading-6 text-slate-300/75">
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

function IconLine({ icon: Icon, text }) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-sm">
      <Icon className="h-4 w-4 shrink-0 text-slate-400" />
      <span className="truncate">{text}</span>
    </div>
  );
}

function InfoTile({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[16px] bg-[#151b30]/75 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-slate-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-2 text-sm font-bold leading-6">{value}</div>
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
  return <div className="rounded-[18px] border border-white/8 bg-[#0d1220] p-5 text-sm text-slate-300">{text}</div>;
}

export default Counselling;
