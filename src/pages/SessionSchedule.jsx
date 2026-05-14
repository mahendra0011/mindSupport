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
import { apiFetch } from "@/lib/api";
import {
  ArrowRight,
  CalendarClock,
  Clock3,
  HeartHandshake,
  MapPin,
  Phone,
  ShieldCheck,
  Star,
  UserCheck,
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

function dateFromOffset(offset) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

const quickDates = [
  { label: "Tomorrow", value: dateFromOffset(1) },
  { label: "In 2 days", value: dateFromOffset(2) },
  { label: "This week", value: dateFromOffset(4) },
  { label: "Next week", value: dateFromOffset(7) },
];

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
    <div className="min-h-screen bg-[#070b15] text-foreground">
      <Navigation />
      <main className="pt-16">
        <section className="dashboard-motion relative overflow-hidden py-7 md:py-9">
          <div className="absolute inset-x-0 top-20 h-56 bg-violet-700/10 blur-3xl" />
          <div className="relative mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <Badge className="h-7 rounded-full border border-primary/25 bg-primary/15 px-3 text-xs text-primary">Session Schedule</Badge>
                <h1 className="mt-3 text-2xl font-bold md:text-4xl">Schedule your counselling session</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300/75 md:text-base">
                  Choose your counsellor, support package, date, time, and counselling mode in one focused place.
                </p>
              </div>
              <Button variant="outline" className="h-10 rounded-xl text-sm" onClick={() => navigate("/counselling")}>
                Browse counsellors
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
              <Card className="dashboard-card-motion rounded-[20px] border-white/8 bg-[#0d1220]">
                <CardHeader className="p-5 pb-2 md:p-6 md:pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CalendarClock className="h-5 w-5 text-primary" />
                    Appointment details
                  </CardTitle>
                  <CardDescription>Only the details needed to schedule your counselling appointment.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 p-5 pt-2 md:p-6 md:pt-3">
                  {loading ? (
                    <PanelText>Loading schedule data...</PanelText>
                  ) : !selectedCounsellor ? (
                    <PanelText>No approved counsellors available yet.</PanelText>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label>Counsellor / Therapist</Label>
                        <Select value={selectedCounsellor.id} onValueChange={selectCounsellor}>
                          <SelectTrigger className="h-10 rounded-xl border-white/10 bg-[#070b15] text-sm">
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

                      <div className="rounded-[18px] border border-white/8 bg-[#070b15] p-4">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center">
                          <Avatar className="h-16 w-16 rounded-[18px] bg-gradient-to-br from-orange-200 to-amber-300">
                            <AvatarImage src={selectedCounsellor.profilePhotoUrl} alt={selectedCounsellor.name} />
                            <AvatarFallback className="rounded-[18px] bg-gradient-to-br from-orange-200 to-amber-300 text-xl font-bold text-violet-500">
                              {initials(selectedCounsellor.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="text-xl font-bold">{selectedCounsellor.name}</h2>
                              <Badge className="bg-emerald-400/15 text-emerald-300">
                                <UserCheck className="mr-1 h-3 w-3" />
                                {selectedCounsellor.badge || "Verified"}
                              </Badge>
                            </div>
                            <p className="mt-1 text-slate-300/75">{selectedCounsellor.specialization}</p>
                            <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-300/75">
                              <span className="flex items-center gap-1">
                                <Star className="h-4 w-4 fill-red-400 text-red-400" />
                                {Number(selectedCounsellor.rating || 4.8).toFixed(1)}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {selectedCounsellor.location || "Online"}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock3 className="h-4 w-4" />
                                {selectedCounsellor.experience || "Verified experience"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <SectionLabel title="Session mode" text="Choose how you want to attend this appointment." />
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
                              className={`rounded-[18px] border p-4 text-left transition ${
                                active ? "border-primary bg-primary/15" : "border-white/8 bg-[#070b15]"
                              } ${disabled ? "cursor-not-allowed opacity-45" : "hover:border-primary/50"}`}
                            >
                              <Icon className="h-5 w-5 text-primary" />
                              <div className="mt-2 font-bold">{mode.label}</div>
                              <p className="mt-1 text-xs text-slate-300/65">{disabled ? "Not offered by this counsellor" : mode.text}</p>
                            </button>
                          );
                        })}
                      </div>

                      <SectionLabel title="Date and time" text="Pick a preferred slot. The counsellor can confirm or reschedule if needed." />
                      <div className="grid gap-4 md:grid-cols-[210px_1fr]">
                        <div className="space-y-2">
                          <Label>Date</Label>
                          <Input
                            type="date"
                            value={booking.date}
                            onChange={(event) => setBooking((current) => ({ ...current, date: event.target.value }))}
                            className="h-10 rounded-xl border-white/10 bg-[#070b15] text-sm"
                          />
                          <div className="flex flex-wrap gap-2">
                            {quickDates.map((date) => (
                              <button
                                key={date.value}
                                type="button"
                                onClick={() => setBooking((current) => ({ ...current, date: date.value }))}
                                className={`rounded-full px-2.5 py-1 text-xs font-bold transition ${
                                  booking.date === date.value ? "bg-primary text-primary-foreground" : "bg-[#151b30] text-slate-300 hover:bg-[#1b2440]"
                                }`}
                              >
                                {date.label}
                              </button>
                            ))}
                          </div>
                          {booking.date && (
                            <div className={`rounded-2xl border p-3 text-xs ${
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
                        <div className="space-y-2">
                          <Label>Available time slots</Label>
                          <div className="flex flex-wrap gap-2">
                            {timeSlots.map((slot) => (
                              <button
                                key={slot}
                                type="button"
                                onClick={() => setBooking((current) => ({ ...current, time: slot }))}
                                className={`rounded-full px-3 py-1.5 text-sm font-bold transition ${
                                  booking.time === slot ? "bg-violet-500 text-white" : "bg-[#151b30] text-slate-200 hover:bg-[#1b2440]"
                                }`}
                              >
                                {slot}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Session note (optional)</Label>
                        <Textarea
                          value={booking.concern}
                          onChange={(event) => setBooking((current) => ({ ...current, concern: event.target.value }))}
                          placeholder="Share your concern, goal, or what you want to work on in the first session."
                          rows={3}
                          className="rounded-xl border-white/10 bg-[#070b15] text-sm"
                        />
                      </div>

                      {activeBooking ? (
                        <div className="rounded-[18px] border border-emerald-400/20 bg-emerald-400/10 p-4 text-emerald-100">
                          <div className="font-bold">This counsellor is already booked once.</div>
                          <p className="mt-1 text-sm opacity-85">
                            {activeBooking.supportPlanName || "Counselling session"} on {activeBooking.date} at {activeBooking.time}. You can manage this booking from your dashboard.
                          </p>
                        </div>
                      ) : !acceptingBookings ? (
                        <div className="rounded-[18px] border border-rose-400/20 bg-rose-400/10 p-4 text-rose-100">
                          <div className="font-bold">Bookings are paused</div>
                          <p className="mt-1 text-sm opacity-85">This counsellor has disabled new bookings for now.</p>
                        </div>
                      ) : dateUnavailable ? (
                        <div className="rounded-[18px] border border-rose-400/20 bg-rose-400/10 p-4 text-rose-100">
                          <div className="font-bold">Choose another date</div>
                          <p className="mt-1 text-sm opacity-85">The selected counsellor marked this date unavailable.</p>
                        </div>
                      ) : (
                        <Button
                          onClick={submitBooking}
                          disabled={submitting}
                          className="h-11 w-full rounded-xl bg-violet-500 text-sm font-bold text-white hover:bg-violet-400"
                        >
                          {submitting ? "Sending schedule request..." : "Confirm schedule request"}
                        </Button>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              <aside className="space-y-4">
                <Card className="dashboard-card-motion rounded-[20px] border-white/8 bg-[#0d1220]">
                  <CardHeader className="p-5 pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <HeartHandshake className="h-5 w-5 text-primary" />
                      Session summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 p-5 pt-2 text-sm">
                    <SummaryLine label="Counsellor" value={selectedCounsellor?.name || "Select counsellor"} />
                    <SummaryLine label="Package" value={selectedPlan?.name || "Select plan"} />
                    <SummaryLine label="Package total" value={formatRupees(planPrice(selectedPlan))} />
                    <SummaryLine label="Mode" value={modeLabel(booking.mode)} />
                    <SummaryLine label="Date" value={booking.date || "Choose date"} />
                    <SummaryLine label="Time" value={booking.time || "Choose slot"} />
                    <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-xs leading-5 text-emerald-100">
                      After confirmation, your session appears in dashboard with Meet, call, or in-person details.
                    </div>
                  </CardContent>
                </Card>

                <Card className="dashboard-card-motion rounded-[20px] border-white/8 bg-[#0d1220]">
                  <CardHeader className="p-5 pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Clock3 className="h-5 w-5 text-primary" />
                      Upcoming sessions
                    </CardTitle>
                    <CardDescription>Your pending and confirmed appointments.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 p-5 pt-2">
                    {upcomingSessions.length === 0 ? (
                      <PanelText>No active session yet.</PanelText>
                    ) : (
                      upcomingSessions.map((session) => (
                        <div key={session.id} className="rounded-2xl border border-white/8 bg-[#070b15] p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-bold">{session.counsellorName}</div>
                            <Badge variant="secondary" className="capitalize">{session.status}</Badge>
                          </div>
                          <div className="mt-2 text-sm text-slate-300/70">
                            {session.date} at {session.time} - {modeLabel(session.mode)}
                          </div>
                          <div className="mt-1 text-sm text-slate-300/60">{session.supportPlanName || "Counselling session"}</div>
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

                <div className="rounded-[18px] border border-white/8 bg-[#0d1220]/75 p-4 text-xs leading-6 text-slate-300/75">
                  <ShieldCheck className="mb-3 h-5 w-5 text-emerald-300" />
                  MindSupport is for emotional support. In immediate danger or medical emergency, contact local emergency services.
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

function SummaryLine({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-300/70">{label}</span>
      <span className="text-right font-bold">{value}</span>
    </div>
  );
}

function SectionLabel({ title, text }) {
  return (
    <div className="space-y-1">
      <h3 className="text-sm font-bold">{title}</h3>
      <p className="text-xs text-slate-300/65">{text}</p>
    </div>
  );
}

function PanelText({ children }) {
  return <div className="rounded-2xl border border-white/8 bg-[#070b15] p-3 text-sm text-slate-300/75">{children}</div>;
}

export default SessionSchedule;
