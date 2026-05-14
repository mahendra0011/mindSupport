import { Brain, HeartHandshake, LifeBuoy, LockKeyhole, MessageCircle, Zap } from "lucide-react";

const reasons = [
  {
    title: "Smart Matching",
    text: "Tell us how you feel - we match you with counsellors trained in exactly that.",
    icon: Brain,
    tone: "text-violet-300 bg-violet-500/20",
  },
  {
    title: "Human-First Care",
    text: "Every counsellor is verified, supervised, and trained in trauma-informed care.",
    icon: HeartHandshake,
    tone: "text-rose-300 bg-rose-500/20",
  },
  {
    title: "Three Ways to Talk",
    text: "Google Meet, voice call, or in-person - switch anytime that works for you.",
    icon: MessageCircle,
    tone: "text-cyan-300 bg-cyan-500/20",
  },
  {
    title: "Radically Private",
    text: "Your sessions, notes, and identity are never shared. Anonymous mode available.",
    icon: LockKeyhole,
    tone: "text-emerald-300 bg-emerald-500/20",
  },
  {
    title: "Same-day Sessions",
    text: "Most counsellors offer slots within 24 hours, including evenings and weekends.",
    icon: Zap,
    tone: "text-amber-300 bg-amber-500/20",
  },
  {
    title: "Crisis Backup",
    text: "Free 24/7 crisis support and trained responders if you ever need urgent help.",
    icon: LifeBuoy,
    tone: "text-pink-300 bg-pink-500/20",
  },
];

const WhyMindSupport = () => {
  return (
    <section className="animated-hero-bg relative overflow-hidden bg-[#050914] py-16 md:py-20">
      <div className="relative mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-300">Why MindSupport</p>
          <h2 className="mt-3 text-[2.15rem] font-bold leading-tight tracking-tight text-white md:text-[2.85rem]">
            Built around how you actually heal
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-slate-300/75 md:text-lg">
            From the first message to the last session - every step is designed for safety, comfort, and progress.
          </p>
        </div>

        <div className="dashboard-stagger mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {reasons.map((reason) => (
            <article
              key={reason.title}
              className="premium-hover-card dashboard-card-motion min-h-[196px] rounded-[24px] border border-white/10 bg-[#0b1020] p-6 shadow-[0_18px_46px_rgba(4,7,18,0.26)]"
            >
              <div className={`inline-flex h-12 w-12 items-center justify-center rounded-full ${reason.tone}`}>
                <reason.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-7 text-xl font-bold text-white md:text-2xl">{reason.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-300/75 md:text-base">{reason.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyMindSupport;
