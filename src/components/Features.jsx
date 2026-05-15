import { BookOpen, Calendar, BarChart3, MessageCircle, Shield, Users, Zap } from "lucide-react";
import ElectricBorder from "@/components/reactbits/ElectricBorder";

const mainFeatures = [
  {
    icon: MessageCircle,
    title: "Secure Counsellor Messaging",
    description: "Private follow-up conversations, care tasks, file sharing, and session reminders stay connected to booked counsellors.",
    features: ["Booked counsellor chat", "Replies and reactions", "Shared resources", "Care follow-ups"],
    accent: "from-violet-500/25 via-[#0b1020] to-blue-500/10",
  },
  {
    icon: Calendar,
    title: "Counselling Booking System",
    description: "Users can choose a verified counsellor, select one package, and schedule Google Meet, voice, or in-person sessions.",
    features: ["One-time packages", "Flexible scheduling", "Meet integration", "Reschedule support"],
    accent: "from-cyan-500/20 via-[#0b1020] to-emerald-500/10",
  },
  {
    icon: BookOpen,
    title: "Wellness Resource Hub",
    description: "Curated videos and practical articles for motivation, stress, sleep, confidence, and self-care routines.",
    features: ["YouTube videos", "Motivation articles", "Self-care guides", "Category filters"],
    accent: "from-fuchsia-500/20 via-[#0b1020] to-amber-500/10",
  },
];

const platformLayers = [
  {
    icon: Users,
    title: "Peer Support Network",
    description: "Anonymous, moderated community posts for students who need a safe space to share.",
    stat: "Moderated",
  },
  {
    icon: BarChart3,
    title: "Role Dashboards",
    description: "Separate user, counsellor, and admin dashboards with focused workflows and analytics.",
    stat: "3 roles",
  },
  {
    icon: Shield,
    title: "Privacy & Safety",
    description: "JWT authentication, role access, emergency routing, and confidential user controls.",
    stat: "Protected",
  },
];

const Features = () => {
  return (
    <section id="features" className="animated-hero-bg relative overflow-hidden bg-[#050914] py-20 md:py-24">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-cyan-500/8" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ElectricBorder color="#22d3ee" speed={0.72} chaos={0.07} borderRadius={28} className="block" style={{ borderRadius: 28 }}>
          <div className="rounded-[28px] border border-cyan-300/10 bg-[#07101f]/90 p-5 shadow-[0_28px_80px_rgba(8,13,32,0.34)] backdrop-blur md:p-8 lg:p-10">
            <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2">
                  <Zap className="h-4 w-4 text-cyan-300" />
                  <span className="text-sm font-semibold text-cyan-100">Comprehensive Platform</span>
                </div>
                <h2 className="mt-5 text-3xl font-bold leading-tight md:text-5xl">
                  <span className="bg-gradient-to-r from-white via-violet-100 to-cyan-200 bg-clip-text text-transparent">
                    Comprehensive Mental Health
                  </span>
                  <br />
                  <span className="text-white">Support Ecosystem</span>
                </h2>
              </div>
              <p className="max-w-2xl text-base leading-8 text-slate-300/75 lg:justify-self-end">
                MindSupport combines counselling, private communication, wellness resources, progress tracking, payments, and safety workflows in one clean platform for users, counsellors, and admins.
              </p>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {mainFeatures.map((feature) => (
                <article
                  key={feature.title}
                  className={`premium-hover-card dashboard-card-motion rounded-[22px] border border-white/10 bg-gradient-to-br ${feature.accent} p-5 shadow-[0_18px_48px_rgba(4,7,18,0.28)]`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-cyan-200">
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{feature.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-300/75">{feature.description}</p>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {feature.features.map((item) => (
                      <span key={item} className="rounded-full border border-white/10 bg-white/[0.08] px-3 py-1 text-xs font-semibold text-slate-200">
                        {item}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {platformLayers.map((layer) => (
                <article key={layer.title} className="premium-hover-card rounded-[18px] border border-white/10 bg-[#0b1020]/78 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-200">
                        <layer.icon className="h-5 w-5" />
                      </span>
                      <div>
                        <h3 className="font-semibold text-white">{layer.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-300/70">{layer.description}</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-violet-500/20 px-3 py-1 text-xs font-bold text-violet-200">{layer.stat}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </ElectricBorder>
      </div>
    </section>
  );
};

export default Features;
