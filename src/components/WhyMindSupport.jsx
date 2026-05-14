import { Brain, HeartHandshake, LifeBuoy, LockKeyhole, MessageCircle, Zap } from "lucide-react";

const reasons = [
  {
    title: "Smart Matching",
    text: "Tell us how you feel and browse counsellors trained around your exact concern, language, and support style.",
    icon: Brain,
    tone: "text-violet-300 bg-violet-500/20",
  },
  {
    title: "Human-First Care",
    text: "Every approved counsellor is reviewed by admin, clearly verified, and shown with transparent experience details.",
    icon: HeartHandshake,
    tone: "text-rose-300 bg-rose-500/20",
  },
  {
    title: "Three Ways to Talk",
    text: "Choose Google Meet, voice call, or in-person sessions based on what feels safest and most comfortable.",
    icon: MessageCircle,
    tone: "text-cyan-300 bg-cyan-500/20",
  },
  {
    title: "Radically Private",
    text: "Your sessions, chat, journal, and identity controls stay protected with role-based access and explicit sharing.",
    icon: LockKeyhole,
    tone: "text-emerald-300 bg-emerald-500/20",
  },
  {
    title: "Flexible Sessions",
    text: "Book one affordable support package, pick preferred dates, and reschedule from your session dashboard.",
    icon: Zap,
    tone: "text-amber-300 bg-amber-500/20",
  },
  {
    title: "Crisis Backup",
    text: "Emergency support, helplines, and counsellor/admin alerts help users reach urgent support when it matters.",
    icon: LifeBuoy,
    tone: "text-pink-300 bg-pink-500/20",
  },
];

const WhyMindSupport = () => {
  return (
    <section className="relative overflow-hidden bg-[#050914] py-20 md:py-24">
      <div className="absolute left-1/2 top-24 h-72 w-[44rem] -translate-x-1/2 rounded-full bg-violet-700/10 blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-300">Why MindSupport</p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-5xl">
            Built around how you actually heal
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-slate-300/75 md:text-xl">
            From the first message to the last session, every step is designed for safety, comfort, privacy, and progress.
          </p>
        </div>

        <div className="dashboard-stagger mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {reasons.map((reason) => (
            <article
              key={reason.title}
              className="dashboard-card-motion min-h-[230px] rounded-[28px] border border-white/10 bg-[#0b1020] p-7 shadow-[0_20px_55px_rgba(4,7,18,0.28)]"
            >
              <div className={`inline-flex h-14 w-14 items-center justify-center rounded-full ${reason.tone}`}>
                <reason.icon className="h-7 w-7" />
              </div>
              <h3 className="mt-8 text-2xl font-bold text-white">{reason.title}</h3>
              <p className="mt-4 text-base leading-8 text-slate-300/75">{reason.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyMindSupport;
