import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import WhyMindSupport from "@/components/WhyMindSupport";
import HomeSupportFlow from "@/components/HomeSupportFlow";
import CallToAction from "@/components/CallToAction";
import Footer from "@/components/Footer";
const Index = () => {
    return (<div className="min-h-screen bg-background">
      <Navigation />
      <Hero />
      <Features />
      <WhyMindSupport />
      <HomeSupportFlow />
      <CallToAction />
      <Footer />
    </div>);
};
export default Index;
