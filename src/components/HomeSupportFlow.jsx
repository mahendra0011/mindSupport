import { useNavigate } from "react-router-dom";
import { ArrowRight, BadgeCheck, CalendarClock, CheckCircle2, HeartHandshake, IndianRupee, LockKeyhole, MessageCircle, ShieldCheck, UserCheck, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const steps = [
  {
    title: "Browse verified support",
    text: "Compare counsellors and therapists by focus area, experience, language, location, rating, and support style.",
    icon: UserCheck,
  },
  {
    title: "Pick one package",
    text: "Choose short-term, medium-term, or long-term support once. The schedule page handles date, time, and mode.",
    icon: IndianRupee,
  },
  {
    title: "Continue care privately",
    text: "Use session details, secure chat, notes, resources, notifications, and progress views from your dashboard.",
    icon: LockKeyhole,
  },
];

const plans = [
  {
    name: "Short-Term Support",
    fit: "Stress, anxiety, exam pressure, loneliness",
    detail: "4-8 sessions with frequent check-ins",
  },
  {
    name: "Medium-Term Support",
    fit: "Mild depression, relationship issues, emotional healing",
    detail: "8-15 sessions weekly or bi-weekly",
  },
  {
    name: "Long-Term Therapy",
    fit: "Trauma, severe anxiety, chronic depression",
    detail: "3-6+ months of steady support",
  },
];

const roles = [
  {
    title: "For users",
    text: "Book counsellors, schedule appointments, chat after booking, track progress, and keep your care private.",
    icon: HeartHandshake,
  },
  {
    title: "For counsellors",
    text: "Manage appointments, availability, patient details, notes, earnings, reviews, and emergency alerts.",
    icon: CalendarClock,
  },
  {
    title: "For admins",
    text: "Approve counsellors, review verification details, monitor sessions, revenue, safety reports, and platform activity.",
    icon: ShieldCheck,
  },
];

const HomeSupportFlow = () => {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden bg-background py-20">
      <div className="absolute inset-0 bg-gradient-to-br from-secondary/8 via-transparent to-accent/8" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <Badge className="border border-primary/25 bg-primary/15 text-primary">How MindSupport works</Badge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground md:text-5xl">
              A clear path from finding help to continuing care
            </h2>
          </div>
          <p className="text-base leading-7 text-foreground/70 md:text-lg">
            Browse verified counsellors, choose one affordable support package, schedule sessions, and continue
            privately with chat, progress tracking, notifications, and role-based dashboards.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {steps.map((step, index) => (
            <Card key={step.title} className="glass-card border-glass-border/30">
              <CardContent className="p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div className="rounded-xl bg-primary/15 p-3 text-primary">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-bold text-foreground/40">0{index + 1}</span>
                </div>
                <h3 className="text-xl font-bold text-foreground">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-foreground/70">{step.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Card className="glass-card overflow-hidden border-glass-border/30">
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Badge className="bg-secondary/15 text-secondary">Counselling packages</Badge>
                  <h3 className="mt-3 text-2xl font-bold text-foreground">Support plans users can understand quickly</h3>
                </div>
                <Button className="w-fit gap-2" onClick={() => navigate("/counselling")}>
                  Explore counsellors
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-6 space-y-3">
                {plans.map((plan) => (
                  <div key={plan.name} className="rounded-2xl border border-glass-border/30 bg-background/55 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h4 className="font-semibold text-foreground">{plan.name}</h4>
                        <p className="mt-1 text-sm text-foreground/65">{plan.fit}</p>
                      </div>
                      <div className="rounded-full bg-foreground/10 px-3 py-1 text-xs font-semibold text-foreground/75">{plan.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-glass-border/30">
            <CardContent className="p-6 md:p-8">
              <Badge className="bg-accent/15 text-accent">Trust and safety</Badge>
              <h3 className="mt-3 text-2xl font-bold text-foreground">Built for privacy, verification, and clear responsibility</h3>
              <div className="mt-6 space-y-4">
                <TrustLine icon={BadgeCheck} title="Verified profiles" text="Professionals and mentors are separated with clear badges." />
                <TrustLine icon={MessageCircle} title="Chat after booking" text="Users only chat with counsellors they have booked." />
                <TrustLine icon={Users} title="Role-based dashboards" text="Users, counsellors, and admins each get the tools they need." />
              </div>
              <div className="mt-6 rounded-2xl border border-amber-300/30 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                MindSupport provides emotional support and does not replace medical or psychiatric treatment. In emergencies, contact local professional services immediately.
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {roles.map((role) => (
            <div key={role.title} className="rounded-2xl border border-glass-border/30 bg-glass/35 p-5">
              <role.icon className="h-5 w-5 text-primary" />
              <h3 className="mt-4 font-bold text-foreground">{role.title}</h3>
              <p className="mt-2 text-sm leading-6 text-foreground/65">{role.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-primary/20 bg-primary/10 p-5">
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
            <div className="flex gap-3">
              <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-primary" />
              <div>
                <h3 className="font-bold text-foreground">Explore before creating an account</h3>
                <p className="mt-1 text-sm text-foreground/70">
                  Visitors can view the main public options from the navbar. Private dashboards, bookings, chat, and saved records stay protected behind login.
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate("/signup")}>Create account</Button>
          </div>
        </div>
      </div>
    </section>
  );
};

function TrustLine({ icon: Icon, title, text }) {
  return (
    <div className="flex gap-3">
      <div className="rounded-lg bg-foreground/10 p-2 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="font-semibold text-foreground">{title}</div>
        <p className="mt-1 text-sm leading-6 text-foreground/65">{text}</p>
      </div>
    </div>
  );
}

export default HomeSupportFlow;
