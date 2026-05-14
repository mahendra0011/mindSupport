import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch, getStoredUser } from "@/lib/api";
import { ArrowLeft, Check, MapPin, Phone, ShieldCheck, Video } from "lucide-react";

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
  { id: "google-meet", label: "Google Meet", icon: Video, text: "Video call from anywhere" },
  { id: "voice-call", label: "Voice Call", icon: Phone, text: "Audio-only conversation" },
  { id: "in-person", label: "In-person", icon: MapPin, text: "Visit the clinic" },
];
const timeSlots = ["08:00", "11:00", "13:30", "17:00", "19:30"];

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
  const [params] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [counsellors, setCounsellors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [selectedId, setSelectedId] = useState(params.get("counsellorId") || "");
  const [selectedPlanId, setSelectedPlanId] = useState(params.get("plan") || "short-term");
  const [booking, setBooking] = useState({ mode: "google-meet", date: "", time: "" });
  const storedUser = useMemo(() => getStoredUser(), []);
  const [confirmationEmail, setConfirmationEmail] = useState(storedUser?.email || "");
  const dateChoices = useMemo(() => buildDateChoices(10), []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [profiles, userAppointments] = await Promise.all([
        apiFetch("/api/counsellors"),
        apiFetch("/api/appointments/my").catch(() => []),
      ]);
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
    () => (selectedCounsellor?.consultationModes?.length ? selectedCounsellor.consultationModes : ["google-meet", "voice-call", "in-person"]),
    [selectedCounsellor]
  );
  const activeBooking = appointments.find(
    (appointment) => appointment.counsellorId === selectedCounsellor?.id && activeStatuses.includes(appointment.status)
  );
  const acceptingBookings = selectedCounsellor?.bookingEnabled !== false;
  const dateUnavailable = Boolean(booking.date && (selectedCounsellor?.unavailableDates || []).includes(booking.date));
  const canSubmit = Boolean(selectedCounsellor && selectedPlan && booking.date && booking.time && acceptingBookings && !activeBooking && !dateUnavailable);

  useEffect(() => {
    if (!selectedCounsellor) return;
    const plans = plansFor(selectedCounsellor);
    setSelectedPlanId((current) => (plans.some((plan) => plan.id === current) ? current : plans[0]?.id || "short-term"));
    setBooking((current) => (supportedModes.includes(current.mode) ? current : { ...current, mode: supportedModes[0] || "google-meet" }));
  }, [selectedCounsellor, supportedModes]);

  const submitBooking = async () => {
    if (!selectedCounsellor || !selectedPlan || !booking.date || !booking.time) {
      toast({ variant: "destructive", title: "Booking incomplete", description: "Choose mode, date, and time." });
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
          concern: "",
          isAnonymous: false,
        }),
      });
      setAppointments((current) => [...current, appointment]);
      setBooking((current) => ({ ...current, date: "", time: "" }));
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
        <section className="dashboard-motion relative overflow-hidden py-10 md:py-12">
          <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-violet-700/14 blur-3xl" />
          <div className="absolute right-0 top-40 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
          <div className="relative mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => navigate(selectedCounsellor ? `/counselling/${selectedCounsellor.id}` : "/counselling")}
              className="mb-8 flex items-center gap-2 text-sm text-slate-300 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              {selectedCounsellor ? "Back to profile" : "Back to counsellors"}
            </button>

            <div className="mb-7">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-300">Book a session</p>
              <h1 className="mt-3 text-[2rem] font-bold leading-tight tracking-tight md:text-[2.85rem]">Pick your mode, day and time</h1>
            </div>

            {loading ? (
              <PanelText>Loading schedule data...</PanelText>
            ) : !selectedCounsellor ? (
              <PanelText>No approved counsellors available yet.</PanelText>
            ) : (
              <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="space-y-5">
                  <SchedulePanel title="Counselling mode">
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
                            className={`relative min-h-[104px] rounded-[22px] border p-4 text-left transition ${
                              active
                                ? "border-violet-300 bg-violet-500 text-white shadow-[0_16px_36px_rgba(139,92,246,0.24)]"
                                : "border-white/10 bg-[#070b15] hover:border-violet-400/50"
                            } ${disabled ? "cursor-not-allowed opacity-45" : ""}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <Icon className={`h-5 w-5 ${active ? "text-white" : "text-slate-200"}`} />
                              {active && <Check className="h-4 w-4" />}
                            </div>
                            <div className="mt-5 text-base font-bold">{mode.label}</div>
                            <p className={`mt-1 text-sm leading-5 ${active ? "text-white/80" : "text-slate-300/65"}`}>
                              {disabled ? "Not offered" : mode.text}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </SchedulePanel>

                  <SchedulePanel title="Preferred date">
                    <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 xl:grid-cols-10">
                      {dateChoices.map((date) => {
                        const unavailable = (selectedCounsellor.unavailableDates || []).includes(date.value);
                        return (
                          <button
                            key={date.value}
                            type="button"
                            disabled={unavailable}
                            onClick={() => setBooking((current) => ({ ...current, date: date.value }))}
                            className={`rounded-[22px] border px-3 py-3 text-center transition ${
                              booking.date === date.value
                                ? "border-violet-300 bg-violet-500 text-white shadow-[0_16px_34px_rgba(139,92,246,0.22)]"
                                : "border-white/10 bg-[#070b15] text-slate-200 hover:border-violet-400/50"
                            } ${unavailable ? "cursor-not-allowed opacity-35" : ""}`}
                          >
                            <div className="text-[11px] font-bold tracking-[0.14em] opacity-75">{date.weekday}</div>
                            <div className="mt-1 text-2xl font-bold">{date.day}</div>
                          </button>
                        );
                      })}
                    </div>
                  </SchedulePanel>

                  <SchedulePanel title="Available time slots">
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

                  <SchedulePanel title="Where should we send confirmation?">
                    <Input
                      type="email"
                      value={confirmationEmail}
                      onChange={(event) => setConfirmationEmail(event.target.value)}
                      placeholder="you@example.com"
                      className="h-12 rounded-[24px] border-white/10 bg-[#070b15] px-5 text-sm"
                    />
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

                <aside className="lg:sticky lg:top-24 lg:self-start">
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

                      <div className="mt-7 space-y-4 text-sm">
                        <SummaryLine label="Plan" value={selectedPlan?.name || "Selected plan"} />
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
                        className="mt-6 h-12 w-full rounded-[22px] bg-violet-500 text-sm font-bold text-white hover:bg-violet-400 disabled:bg-violet-500/45"
                      >
                        {submitting ? "Confirming booking..." : activeBooking ? "Already booked" : "Confirm booking"}
                      </Button>
                      <p className="mt-4 text-center text-xs leading-5 text-slate-300/70">
                        You will receive session details and reminders after confirmation.
                      </p>
                    </CardContent>
                  </Card>

                  <div className="mt-4 rounded-[22px] border border-white/10 bg-[#0d1220]/75 p-4 text-xs leading-6 text-slate-300/75">
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

function SchedulePanel({ title, children }) {
  return (
    <Card className="dashboard-card-motion rounded-[28px] border-white/10 bg-[#0d1220] shadow-[0_18px_48px_rgba(4,7,18,0.26)]">
      <CardContent className="p-5 md:p-6">
        <h2 className="mb-5 text-xl font-bold">{title}</h2>
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
  return <div className="rounded-2xl border border-white/10 bg-[#070b15] p-4 text-sm text-slate-300/75">{children}</div>;
}

export default SessionSchedule;
