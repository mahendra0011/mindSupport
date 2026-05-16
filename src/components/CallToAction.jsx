import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const CallToAction = () => {
  const navigate = useNavigate();

  const handleLiquidMove = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;

    event.currentTarget.style.setProperty("--liquid-x", `${x}%`);
    event.currentTarget.style.setProperty("--liquid-y", `${y}%`);
  };

  const resetLiquid = (event) => {
    event.currentTarget.style.setProperty("--liquid-x", "50%");
    event.currentTarget.style.setProperty("--liquid-y", "50%");
  };

  return (
    <section className="animated-hero-bg bg-[#050914] pb-20 pt-6">
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8">
        <div
          className="premium-hover-card cta-liquid-card rounded-[28px] px-6 py-12 text-center shadow-[0_24px_70px_rgba(37,99,235,0.22)] md:px-10"
          onMouseMove={handleLiquidMove}
          onMouseLeave={resetLiquid}
          data-motion
        >
          <div className="cta-liquid-layer" aria-hidden="true" />
          <Sparkles className="motion-icon-pop relative z-10 mx-auto h-8 w-8 text-white/90" />
          <h2 className="relative z-10 mt-5 text-3xl font-bold leading-tight text-white md:text-4xl">Take the first step today</h2>
          <p className="relative z-10 mx-auto mt-4 max-w-xl text-sm leading-6 text-white/75">
            The hardest part is starting. Browse counsellors, pick someone who feels right, and book in under 2 minutes.
          </p>
          <div className="relative z-10 mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Button className="motion-button rounded-full bg-[#050914] px-6 text-sm font-bold text-white hover:bg-[#0b1020]" onClick={() => navigate("/counselling")}>
              Find My Counsellor
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="motion-button rounded-full border-white/25 bg-white/10 px-6 text-sm font-bold text-white hover:bg-white/15 hover:text-white"
              onClick={() => navigate("/counselling")}
            >
              Compare Plans
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CallToAction;
