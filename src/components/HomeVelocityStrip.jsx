import ScrollVelocity from "@/components/reactbits/ScrollVelocity";

const HomeVelocityStrip = () => {
  return (
    <section className="animated-hero-bg relative overflow-hidden bg-[#050914] py-8">
      <div className="border-y border-cyan-300/15 bg-gradient-to-r from-violet-500/10 via-[#050914] to-cyan-500/10 py-7">
        <ScrollVelocity
          texts={[
            "Confidential counselling • Verified professionals • Secure chat •",
            "Google Meet sessions • Mood tracking • Journaling • Emergency support •",
          ]}
          velocity={42}
          damping={45}
          stiffness={360}
          numCopies={7}
          className="mind-velocity-text"
        />
      </div>
    </section>
  );
};

export default HomeVelocityStrip;
