import heroImage from "@/assets/hero-mental-health.jpg";
import FlowingMenu from "@/components/reactbits/FlowingMenu";

const supportPathItems = [
  { link: "/counselling", text: "Book Counselling", image: heroImage },
  { link: "/resources", text: "Wellness Resources", image: heroImage },
  { link: "/wellness", text: "Track Progress", image: heroImage },
  { link: "/peer", text: "Peer Support", image: heroImage },
];

const HomeFlowingMenu = () => {
  return (
    <section className="animated-hero-bg relative overflow-hidden bg-[#050914] py-14">
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8">
        <div className="mb-7 grid gap-4 md:grid-cols-[0.8fr_1fr] md:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Support paths</p>
            <h2 className="mt-2 text-3xl font-bold leading-tight text-white md:text-4xl">Choose what you need today</h2>
          </div>
          <p className="text-sm leading-7 text-slate-300/75 md:justify-self-end">
            Hover a path to preview the experience, then jump straight into counselling, resources, progress, or peer support.
          </p>
        </div>
        <div className="premium-hover-card h-[440px] overflow-hidden rounded-[26px] border border-cyan-300/15 bg-[#080d1d] shadow-[0_22px_64px_rgba(34,211,238,0.12)]" data-motion>
          <FlowingMenu
            items={supportPathItems}
            speed={16}
            textColor="#e5efff"
            bgColor="#080d1d"
            marqueeBgColor="#7df9ff"
            marqueeTextColor="#05111f"
            borderColor="rgba(125, 249, 255, 0.18)"
          />
        </div>
      </div>
    </section>
  );
};

export default HomeFlowingMenu;
