import { useNavigate } from "react-router-dom";
import { HeartHandshake, LockKeyhole, MapPin, MessageCircle, Phone, Search, Star, Video } from "lucide-react";
import { Button } from "@/components/ui/button";

const featuredCounsellors = [
  {
    initials: "AR",
    name: "Dr. Ananya Rao",
    role: "Clinical Psychologist",
    rating: "4.9",
    reviews: "312",
    bio: "Warm, evidence-based therapist focused on CBT and mindfulness for young adults.",
    tags: ["Anxiety", "Stress", "Sleep"],
    exp: "9 yrs exp",
    location: "Bengaluru, IN",
    language: "English / Hindi / Telugu",
    price: "Rs. 1,499",
    tone: "from-emerald-200 to-green-300",
  },
  {
    initials: "MH",
    name: "Marcus Hale, LMFT",
    role: "Relationship Therapist",
    rating: "4.8",
    reviews: "248",
    bio: "Helps individuals and couples move from disconnect to deep understanding.",
    tags: ["Relationships", "Couples", "Communication"],
    exp: "12 yrs exp",
    location: "Austin, US",
    language: "English / Spanish",
    price: "Rs. 2,499",
    tone: "from-orange-200 to-amber-300",
  },
  {
    initials: "LH",
    name: "Leila Haddad",
    role: "Trauma Specialist",
    rating: "5.0",
    reviews: "401",
    bio: "Trauma-informed support for safety, agency, grounding, and emotional repair.",
    tags: ["Trauma", "PTSD", "EMDR"],
    exp: "14 yrs exp",
    location: "Toronto, CA",
    language: "English / Arabic / French",
    price: "Rs. 3,999",
    tone: "from-rose-200 to-orange-200",
  },
  {
    initials: "KM",
    name: "Kenji Mori",
    role: "Counselling Psychologist",
    rating: "4.7",
    reviews: "156",
    bio: "Friendly, practical sessions for students and early-career professionals.",
    tags: ["Exam Stress", "Career Anxiety", "Loneliness"],
    exp: "6 yrs exp",
    location: "Tokyo, JP",
    language: "English / Japanese",
    price: "Rs. 1,499",
    tone: "from-cyan-200 to-sky-300",
  },
  {
    initials: "PM",
    name: "Dr. Priya Menon",
    role: "Psychiatrist & Therapist",
    rating: "4.9",
    reviews: "528",
    bio: "Integrated care combining psychotherapy and, when needed, medication guidance.",
    tags: ["Depression", "Mood", "Women's Health"],
    exp: "17 yrs exp",
    location: "Mumbai, IN",
    language: "English / Hindi / Malayalam",
    price: "Rs. 2,499",
    tone: "from-fuchsia-200 to-purple-300",
  },
  {
    initials: "SO",
    name: "Samuel Okafor",
    role: "Wellness Counsellor",
    rating: "4.8",
    reviews: "189",
    bio: "A grounded space to slow down and rebuild through breath, body, and story.",
    tags: ["Stress", "Mindfulness", "Men's Mental Health"],
    exp: "8 yrs exp",
    location: "Lagos, NG",
    language: "English / Yoruba",
    price: "Rs. 1,499",
    tone: "from-lime-200 to-yellow-200",
  },
];

const steps = [
  { title: "Choose a counsellor", text: "Filter by specialty, language, location, and experience.", icon: Search },
  { title: "Pick a therapy plan", text: "Short, medium, or long-term support - your call.", icon: HeartHandshake },
  { title: "Book your session", text: "Google Meet, voice call, or in-person, on your schedule.", icon: Video },
];

const modes = [
  { title: "Google Meet", text: "HD video sessions from anywhere. Encrypted, no recording stored.", icon: Video, badge: "Most popular" },
  { title: "Voice Call", text: "Audio-only support when you need to close your eyes and talk.", icon: Phone, badge: "Low bandwidth" },
  { title: "In-person", text: "Meet at a verified clinic in supported cities.", icon: MapPin, badge: "Select cities" },
];

const stories = [
  ["I was skeptical about online therapy. Three months with Dr. Ananya and I sleep through the night again.", "Aarav S.", "Student, 22"],
  ["Marcus gave us tools we still use every week. We actually talk now.", "Maya and Jon", "Couple, 31"],
  ["Postpartum hit me hard. Dr. Priya was warm, patient, and never made me feel broken.", "Priscilla O.", "New mom"],
];

const faqs = [
  "How quickly can I book a session?",
  "Is what I share really confidential?",
  "Can I switch counsellors if it is not the right fit?",
  "Do you accept insurance?",
  "What if I am in crisis right now?",
];

export const HomeCounsellors = () => {
  const navigate = useNavigate();

  return (
    <section className="animated-hero-bg relative overflow-hidden bg-[#050914] pb-10 pt-14">
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8">
        <div className="mb-8 grid gap-5 lg:grid-cols-[1fr_0.7fr] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-300">Our counsellors</p>
            <h2 className="mt-2 text-[2rem] font-bold leading-tight text-white md:text-[2.35rem]">Find someone you click with</h2>
          </div>
          <p className="max-w-md text-sm leading-7 text-slate-300/75 md:justify-self-end">
            Verified, multilingual professionals across stress, relationships, trauma, and more.
          </p>
        </div>

        <div className="premium-hover-card mb-7 rounded-[24px] border border-white/10 bg-[#0b1020] p-4" data-motion>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
            <div className="h-11 rounded-[22px] border border-white/10 bg-[#050914] pl-11 pt-3 text-xs font-medium text-slate-500">
              Search by name or specialty (e.g. anxiety, relationships)...
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {["All", "Anxiety", "Stress", "Relationships", "Trauma", "Depression", "Exam Stress", "Sleep", "Mindfulness"].map((item) => (
              <span
                key={item}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
                  item === "All" ? "bg-blue-500 text-white" : "bg-[#151b30] text-slate-300"
                }`}
              >
                {item}
              </span>
            ))}
          </div>
          <p className="mt-4 text-xs font-medium text-slate-400">Showing 6 of 6 counsellors</p>
        </div>

        <div className="dashboard-stagger grid gap-5 md:grid-cols-3">
          {featuredCounsellors.map((counsellor) => (
            <article key={counsellor.name} className="premium-hover-card dashboard-card-motion rounded-[24px] border border-white/10 bg-[#0b1020] p-5">
              <div className="flex gap-4">
                <div className="relative">
                  <div className={`flex h-16 w-16 items-center justify-center rounded-[20px] bg-gradient-to-br ${counsellor.tone} text-xl font-bold text-violet-500`}>
                    {counsellor.initials}
                  </div>
                  <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-[3px] border-[#0b1020] bg-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{counsellor.name}</h3>
                  <p className="text-sm text-slate-300/70">{counsellor.role}</p>
                  <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold">
                    <Star className="h-3.5 w-3.5 fill-red-400 text-red-400" />
                    <span>{counsellor.rating}</span>
                    <span className="text-slate-400">({counsellor.reviews})</span>
                    <span className="ml-1 text-emerald-300">Available</span>
                  </div>
                </div>
              </div>
              <p className="mt-5 line-clamp-2 min-h-[44px] text-sm leading-6 text-slate-300/70">{counsellor.bio}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {counsellor.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-[#151b30] px-2.5 py-1 text-[11px] font-semibold text-slate-100">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm text-slate-300/75">
                <span>{counsellor.exp}</span>
                <span>{counsellor.location}</span>
                <span className="col-span-2">{counsellor.language}</span>
              </div>
              <div className="my-4 h-px bg-white/8" />
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Starts at</p>
                  <p className="mt-1 text-[1.55rem] font-bold leading-none text-white">
                    {counsellor.price}
                    <span className="text-[11px] text-slate-400"> / package</span>
                  </p>
                </div>
                <span className="rounded-full bg-violet-500/25 px-2.5 py-1 text-[10px] font-semibold text-violet-300">Meet / Voice / In-person</span>
              </div>
              <Button
                variant="outline"
                className="motion-button mt-4 h-10 w-full rounded-2xl border-white/10 bg-transparent text-sm font-bold text-white hover:bg-violet-500/15"
                onClick={() => navigate("/counselling")}
              >
                View Profile
              </Button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

const HomeSupportFlow = () => {
  const navigate = useNavigate();

  return (
    <section className="animated-hero-bg relative overflow-hidden bg-[#050914] pb-14 pt-6">
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8">
        <div className="premium-hover-card motion-gradient-aura rounded-[26px] bg-gradient-to-br from-violet-700 to-blue-600 p-7 md:p-10" data-motion>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">How it works</p>
          <h2 className="mt-2 max-w-xl text-2xl font-bold leading-tight text-white md:text-3xl">
            From first message to first session in three simple steps.
          </h2>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.title} className="premium-hover-card rounded-[18px] bg-[#0b1020]/88 p-5">
                <div className="flex items-center justify-between text-violet-300">
                  <step.icon className="h-5 w-5" />
                  <span className="text-xl font-bold opacity-60">0{index + 1}</span>
                </div>
                <h3 className="mt-4 text-sm font-bold text-white">{step.title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-300/75">{step.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-300">Session modes</p>
          <h2 className="mt-2 text-2xl font-bold text-white md:text-3xl">Talk however feels right</h2>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {modes.map((mode) => (
            <article key={mode.title} className="premium-hover-card rounded-[20px] border border-white/10 bg-[#0b1020] p-5">
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-white">
                  <mode.icon className="h-5 w-5" />
                </span>
                <span className="rounded-full bg-violet-500/25 px-2.5 py-1 text-[10px] font-bold text-violet-300">{mode.badge}</span>
              </div>
              <h3 className="mt-5 font-bold text-white">{mode.title}</h3>
              <p className="mt-2 text-xs leading-5 text-slate-300/70">{mode.text}</p>
            </article>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-300">Stories of healing</p>
          <h2 className="mt-2 text-2xl font-bold text-white md:text-3xl">Real people. Real progress.</h2>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {stories.map(([quote, name, meta]) => (
            <article key={name} className="premium-hover-card rounded-[20px] border border-white/10 bg-[#0b1020] p-5">
              <div className="mb-4 flex gap-1 text-red-400">
                {[1, 2, 3, 4, 5].map((item) => (
                  <Star key={item} className="h-3.5 w-3.5 fill-red-400" />
                ))}
              </div>
              <p className="min-h-[78px] text-sm leading-6 text-slate-200">"{quote}"</p>
              <div className="mt-5 border-t border-white/8 pt-4">
                <div className="text-sm font-bold text-white">{name}</div>
                <div className="text-xs text-slate-400">{meta}</div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-300">Questions</p>
          <h2 className="mt-2 text-2xl font-bold text-white md:text-3xl">Things people often ask</h2>
        </div>
        <div className="mx-auto mt-8 max-w-3xl space-y-3">
          {faqs.map((faq) => (
            <details key={faq} className="premium-hover-card rounded-2xl border border-white/10 bg-[#0b1020] px-5 py-4 text-left">
              <summary className="cursor-pointer text-sm font-bold text-white">{faq}</summary>
              <p className="mt-3 text-sm leading-6 text-slate-300/70">
                MindSupport keeps booking simple and private. Create an account when you are ready to save sessions, chat, and progress.
              </p>
            </details>
          ))}
        </div>

        <div className="premium-hover-card mt-16 rounded-[22px] border border-red-400/25 bg-red-500/8 p-5" data-motion>
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
            <div className="flex gap-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20 text-red-300">
                <LockKeyhole className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-bold text-white">In crisis? You are not alone.</h3>
                <p className="mt-1 text-xs leading-5 text-slate-300/70">
                  If someone you know is in immediate distress, reach out to a 24/7 helpline. Therapy is ongoing care and emergencies need urgent support.
                </p>
              </div>
            </div>
            <Button className="motion-button rounded-full bg-red-400 px-6 text-xs font-bold text-white hover:bg-red-300" onClick={() => navigate("/wellness")}>
              Get crisis help
              <MessageCircle className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeSupportFlow;
