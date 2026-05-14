import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch, getStoredUser } from "@/lib/api";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
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
const modeOptions = [
  { id: "google-meet", label: "Google Meet", icon: Video, text: "A shared Meet link is created for both user and counsellor." },
  { id: "in-person", label: "In person", icon: MapPin, text: "Use the counsellor location shown on profile." },
  { id: "voice-call", label: "Voice call", icon: Phone, text: "Phone-based session, useful for low bandwidth." },
];
const timeSlots = ["08:00", "09:30", "11:00", "13:30", "15:00", "17:00", "19:30"];
const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function buildDateChoices(count = 10) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return {
      value: date.toISOString().slice(0, 10),
      weekday: date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
      day: date.toLocaleDateString("en-US", { day: "2-digit" }),
    };
  });
}

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

function planFromList(counsellor, planId) {
  const plans = plansFor(counsellor);
  return plans.find((plan) => plan.id === planId) || plans[0];
}

function dateDayName(value) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? "" : dayNames[date.getDay()];
}

function availabilityForDate(counsellor, value) {
  const day = dateDayName(value);
  if (!day) return [];
  return (counsellor?.availability || []).filter((item) => String(item).toLowerCase().startsWith(day.toLowerCase()));
}

function modeLabel(value = "") {
  return modeOptions.find((mode) => mode.id === value)?.label || value || "Google Meet";
}

function formatScheduleDate(value) {
  if (!value) return "Choose date";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

const SessionSchedule = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [counsellors, setCounsellors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [selectedId, setSelectedId] = useState(params.get("counsellorId") || "");
  const [selectedPlanId, setSelectedPlanId] = useState(params.get("plan") || "short-term");
  const [booking, setBooking] = useState({
    mode: "google-meet",
    date: "",
    time: "",
    concern: "",
  });
  const storedUser = useMemo(() => getStoredUser(), []);
  const [confirmationEmail, setConfirmationEmail] = useState(storedUser?.email || "");
  const dateChoices = useMemo(() => buildDateChoices(10), []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [profiles, userAppointments] = await Promise.all([apiFetch("/api/counsellors"), apiFetch("/api/appointments/my").catch(() => [])]);
      setCounsellors(profiles || []);
      setAppointments(userAppointments || []);
      setSelectedId((current) => current || profiles?.[0]?.id || "");
    } catch (error) {
      toast({ variant: "destructive", title: "Could not load schedule", description: error?.message || "" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedCounsellor = useMemo(
    () => counsellors.find((counsellor) => counsellor.id === selectedId) || counsellors[0] || null,
    [counsellors, selectedId]
  );
  const selectedPlan = planFromList(selectedCounsellor, selectedPlanId);
  const supportedModes = useMemo(
    () => (selectedCounsellor?.consultationModes?.length ? selectedCounsellor.consultationModes : ["google-meet", "in-person", "voice-call"]),
    [selectedCounsellor]
  );
  const activeBooking = appointments.find(
    (appointment) => appointment.counsellorId === selectedCounsellor?.id && activeStatuses.includes(appointment.status)
  );
  const upcomingSessions = appointments.filter((appointment) => activeStatuses.includes(appointment.status));
  const acceptingBookings = selectedCounsellor?.bookingEnabled !== false;
  const dateUnavailable = Boolean(booking.date && (selectedCounsellor?.unavailableDates || []).includes(booking.date));
  const selectedDateAvailability = availabilityForDate(selectedCounsellor, booking.date);
  const canSubmit = Boolean(selectedCounsellor && selectedPlan && booking.date && booking.time && acceptingBookings && !activeBooking && !dateUnavailable);

  useEffect(() => {
    if (!selectedCounsellor) return;
    const plans = plansFor(selectedCounsellor);
    setSelectedPlanId((current) => (plans.some((plan) => plan.id === current) ? current : plans[0]?.id || "short-term"));
    setBooking((current) => (supportedModes.includes(current.mode) ? current : { ...current, mode: supportedModes[0] || "google-meet" }));
  }, [selectedCounsellor, supportedModes]);

  const updateUrl = (counsellorId, planId = selectedPlanId) => {
    const next = new URLSearchParams(params);
    next.set("counsellorId", counsellorId);
    next.set("plan", planId);
    setParams(next, { replace: true });
  };

  const selectCounsellor = (id) => {
    const nextCounsellor = counsellors.find((counsellor) => counsellor.id === id);
    const nextPlans = plansFor(nextCounsellor);
    const nextPlanId = nextPlans.some((plan) => plan.id === selectedPlanId) ? selectedPlanId : nextPlans[0]?.id || "short-term";
    setSelectedId(id);
    setSelectedPlanId(nextPlanId);
    updateUrl(id, nextPlanId);
  };

  const submitBooking = async () => {
    if (!selectedCounsellor || !selectedPlan || !booking.date || !booking.time) {
      toast({ variant: "destructive", title: "Booking incomplete", description: "Choose counsellor, plan, date, and time." });
      return;
    }
    if (activeBooking) {
      toast({ variant: "destructive", title: "Already booked", description: "This counsellor is already in your active schedule." });
      return;
    }
    if (!acceptingBookings) {
      toast({ variant: "destructive", title: "Bookings paused", description: "This counsellor is not accepting new bookings right now." });
      return;
    }
    if (dateUnavailable) {
      toast({ variant: "destructive", title: "Date unavailable", description: "Choose another date for this counsellor." });
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
      setAppointments((current) => [...current, appointment]);
      setBooking((current) => ({ ...current, date: "", time: "", concern: "" }));
      toast({
        title: "Counsellor booked",
        description: `${selectedCounsellor.name} received your ${selectedPlan.name} request.`,
      });
      await loadData();
    } catch (error) {
      toast({ variant: "destructive", title: "Booking failed", description: error?.message || "" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050914] text-foreground">
      <Navigation />
      <main className="pt-16">
        <section className="dashboard-motion relative overflow-hidden py-8 md:py-10">
          <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-violet-700/15 blur-3xl" />
          <div className="absolute right-0 top-40 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
          <div className="relative mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => navigate(selectedCounsellor ? `/counselling/${selectedCounsellor.id}` : "/counselling")}
              className="mb-5 flex items-center gap-2 text-sm text-slate-300 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              {selectedCounsellor ? "Back to profile" : "Back to counsellors"}
            </button>

            <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-300">Book a session</p>
                <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">Pick your mode, day and time</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300/75 md:text-base">
                  Schedule the selected one-time counselling package. The counsellor can confirm, reschedule, or share the final joining details.
                </p>
              </div>
              <Button variant="outline" className="h-10 rounded-2xl border-white/10 bg-[#0d1220] text-sm" onClick={() => navigate("/counselling")}>
                Browse counsellors
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            {loading ? (
              <PanelText>Loading schedule data...</PanelText>
            ) : !selectedCounsellor ? (
              <PanelText>No approved counsellors available yet.</PanelText>
            ) : (
              <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_370px]">
                <div className="space-y-5">
                  <SchedulePanel icon={Video} title="Counselling mode" description="Choose how you want to attend this appointment.">
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
                            className={`relative min-h-[124px] rounded-[22px] border p-5 text-left transition ${
                              active
                                ? "border-violet-300 bg-violet-500 text-white shadow-[0_18px_40px_rgba(139,92,246,0.24)]"
                                : "border-white/10 bg-[#070b15] hover:border-violet-400/50"
                            } ${disabled ? "cursor-not-allowed opacity-45" : ""}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <Icon className={`h-5 w-5 ${active ? "text-white" : "text-slate-200"}`} />
                              {active && <Check className="h-4 w-4" />}
                            </div>
                            <div className="mt-5 font-bold">{mode.label}</div>
                            <p className={`mt-1 text-xs leading-5 ${active ? "text-white/80" : "text-slate-300/65"}`}>
                              {disabled ? "Not offered by this counsellor" : mode.text}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </SchedulePanel>

                  <SchedulePanel icon={CalendarDays} title="Preferred date" description="Select one of the next available days or use the calendar input.">
                    <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 xl:grid-cols-10">
                      {dateChoices.map((date) => (
                        <button
                          key={date.value}
                          type="button"
                          onClick={() => setBooking((current) => ({ ...current, date: date.value }))}
                          className={`rounded-[22px] border px-3 py-3 text-center transition ${
                            booking.date === date.value
                              ? "border-violet-300 bg-violet-500 text-white shadow-[0_16px_34px_rgba(139,92,246,0.22)]"
                              : "border-white/10 bg-[#070b15] text-slate-200 hover:border-violet-400/50"
                          }`}
                        >
                          <div className="text-[11px] font-bold tracking-[0.14em] opacity-75">{date.weekday}</div>
                          <div className="mt-1 text-2xl font-bold">{date.day}</div>
                        </button>
                      ))}
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-[220px_1fr] md:items-start">
                      <Input
                        type="date"
                        value={booking.date}
                        onChange={(event) => setBooking((current) => ({ ...current, date: event.target.value }))}
                        className="h-11 rounded-2xl border-white/10 bg-[#070b15] text-sm"
                      />
                      {booking.date && (
                        <div className={`rounded-2xl border p-3 text-xs leading-5 ${
                          dateUnavailable
                            ? "border-rose-400/20 bg-rose-400/10 text-rose-200"
                            : selectedDateAvailability.length
                              ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                              : "border-amber-400/20 bg-amber-400/10 text-amber-100"
                        }`}>
                          {dateUnavailable
                            ? "This date is marked unavailable by the counsellor."
                            : selectedDateAvailability.length
                              ? `Counsellor availability: ${selectedDateAvailability.join(", ")}`
                              : "No day-specific hours are set for this date. You can still send a request."}
                        </div>
                      )}
                    </div>
                  </SchedulePanel>

                  <SchedulePanel icon={Clock3} title="Available time slots">
                    <div className="flex flex-wrap gap-3">
                      {timeSlots.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setBooking((current) => ({ ...current, time: slot }))}
                          className={`rounded-full border px-5 py-2 text-sm font-bold transition ${
                            booking.time === slot
                              ? "border-violet-300 bg-violet-500 text-white"
                              : "border-white/10 bg-[#070b15] text-slate-100 hover:border-violet-400/50"
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </SchedulePanel>

                  <SchedulePanel icon={Mail} title="Confirmation details">
                    <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
                      <div className="space-y-2">
                        <Label>Email for reminders</Label>
                        <Input
                          type="email"
                          value={confirmationEmail}
                          onChange={(event) => setConfirmationEmail(event.target.value)}
                          placeholder="you@example.com"
                          className="h-11 rounded-2xl border-white/10 bg-[#070b15] text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Session note (optional)</Label>
                        <Textarea
                          value={booking.concern}
                          onChange={(event) => setBooking((current) => ({ ...current, concern: event.target.value }))}
                          placeholder="Share your concern, goal, or what you want to work on."
                          rows={3}
                          className="rounded-2xl border-white/10 bg-[#070b15] text-sm"
                        />
                      </div>
                    </div>
                  </SchedulePanel>

                  {activeBooking && (
                    <StatusPanel tone="success" title="This counsellor is already booked once.">
                      {activeBooking.supportPlanName || "Counselling session"} on {activeBooking.date} at {activeBooking.time}. Manage it from your dashboard.
                    </StatusPanel>
                  )}
                  {!activeBooking && !acceptingBookings && (
                    <StatusPanel tone="danger" title="Bookings are paused">
                      This counsellor has disabled new bookings for now.
                    </StatusPanel>
                  )}
                  {!activeBooking && dateUnavailable && (
                    <StatusPanel tone="danger" title="Choose another date">
                      The selected counsellor marked this date unavailable.
                    </StatusPanel>
                  )}
                </div>

                <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
                  <Card className="dashboard-card-motion overflow-hidden rounded-[28px] border-white/10 bg-[#0d1220] shadow-[0_24px_70px_rgba(4,7,18,0.38)]">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-14 w-14 rounded-[18px] bg-gradient-to-br from-orange-200 to-amber-300">
                          <AvatarImage src={selectedCounsellor.profilePhotoUrl} alt={selectedCounsellor.name} />
                          <AvatarFallback className="rounded-[18px] bg-gradient-to-br from-orange-200 to-amber-300 text-lg font-bold text-violet-500">
                            {initials(selectedCounsellor.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h2 className="font-bold leading-tight">{selectedCounsellor.name}</h2>
                          <p className="mt-1 text-sm text-slate-300/70">{selectedCounsellor.specialization}</p>
                        </div>
                      </div>
                      <div className="mt-5 space-y-2">
                        <Label className="text-xs uppercase tracking-[0.16em] text-slate-400">Change counsellor</Label>
                        <Select value={selectedCounsellor.id} onValueChange={selectCounsellor}>
                          <SelectTrigger className="h-10 rounded-2xl border-white/10 bg-[#070b15] text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {counsellors.map((counsellor) => (
                              <SelectItem key={counsellor.id} value={counsellor.id}>
                                {counsellor.name} - {counsellor.specialization}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="mt-6 space-y-4 text-sm">
                        <SummaryLine label="Plan" value={selectedPlan?.name || "Select plan"} />
                        <SummaryLine label="Mode" value={modeLabel(booking.mode)} />
                        <SummaryLine label="Date" value={formatScheduleDate(booking.date)} />
                        <SummaryLine label="Time" value={booking.time || "-"} />
                      </div>

                      <div className="my-6 h-px bg-white/10" />
                      <div className="flex items-end justify-between gap-4">
                        <span className="text-sm text-slate-300/70">Total</span>
                        <div className="text-right">
                          <div className="text-3xl font-bold">{formatRupees(planPrice(selectedPlan))}</div>
                          <div className="text-xs text-slate-400">one-time package</div>
                        </div>
                      </div>

                      <Button
                        onClick={submitBooking}
                        disabled={submitting || !canSubmit}
                        className="mt-6 h-12 w-full rounded-2xl bg-violet-500 text-sm font-bold text-white hover:bg-violet-400 disabled:bg-violet-500/45"
                      >
                        {submitting ? "Confirming booking..." : activeBooking ? "Already booked" : "Confirm booking"}
                      </Button>
                      <p className="mt-4 text-center text-xs leading-5 text-slate-300/70">
                        You will receive session details, reminders, and counsellor updates after confirmation.
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="dashboard-card-motion rounded-[24px] border-white/10 bg-[#0d1220]">
                    <CardHeader className="p-5 pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Upcoming sessions
                      </CardTitle>
                      <CardDescription>Your pending and confirmed appointments.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 p-5 pt-2">
                      {upcomingSessions.length === 0 ? (
                        <PanelText>No active session yet.</PanelText>
                      ) : (
                        upcomingSessions.slice(0, 3).map((session) => (
                          <div key={session.id} className="rounded-2xl border border-white/10 bg-[#070b15] p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="font-bold">{session.counsellorName}</div>
                              <Badge variant="secondary" className="capitalize">{session.status}</Badge>
                            </div>
                            <div className="mt-2 text-sm text-slate-300/70">
                              {formatScheduleDate(session.date)} at {session.time} - {modeLabel(session.mode)}
                            </div>
                            <div className="mt-1 text-xs text-slate-300/55">{session.supportPlanName || "Counselling session"}</div>
                            {session.meetingLink && (
                              <div className="mt-3">
                                <Button asChild size="sm" className="rounded-full">
                                  <a href={session.meetingLink} target="_blank" rel="noreferrer">
                                    <Video className="mr-2 h-4 w-4" />
                                    Join Meet
                                  </a>
                                </Button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  <div className="rounded-[22px] border border-white/10 bg-[#0d1220]/75 p-4 text-xs leading-6 text-slate-300/75">
                    <ShieldCheck className="mb-3 h-5 w-5 text-emerald-300" />
                    MindSupport is for emotional support. In immediate danger or medical emergency, contact local emergency services.
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
};

function SchedulePanel({ icon: Icon, title, description, children }) {
  return (
    <Card className="dashboard-card-motion rounded-[28px] border-white/10 bg-[#0d1220] shadow-[0_18px_48px_rgba(4,7,18,0.28)]">
      <CardContent className="p-5 md:p-6">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <Icon className="h-5 w-5 text-primary" />
              {title}
            </h2>
            {description && <p className="mt-1 text-sm leading-6 text-slate-300/65">{description}</p>}
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function StatusPanel({ tone, title, children }) {
  const styles =
    tone === "danger"
      ? "border-rose-400/20 bg-rose-400/10 text-rose-100"
      : "border-emerald-400/20 bg-emerald-400/10 text-emerald-100";
  return (
    <div className={`rounded-[22px] border p-4 ${styles}`}>
      <div className="font-bold">{title}</div>
      <p className="mt-1 text-sm opacity-85">{children}</p>
    </div>
  );
}

function SummaryLine({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-300/70">{label}</span>
      <span className="text-right font-bold">{value}</span>
    </div>
  );
}

function PanelText({ children }) {
  return <div className="rounded-2xl border border-white/10 bg-[#070b15] p-3 text-sm text-slate-300/75">{children}</div>;
}

export default SessionSchedule;
