import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import WhyMindSupport from "@/components/WhyMindSupport";
import HomeSupportFlow, { HomeCounsellors } from "@/components/HomeSupportFlow";
import CallToAction from "@/components/CallToAction";
import Footer from "@/components/Footer";
const Index = () => {
    return (<div className="min-h-screen bg-background">
      <Navigation />
      <Hero />
      <HomeCounsellors />
      <WhyMindSupport />
      <HomeSupportFlow />
      <Features />
      <CallToAction />
      <Footer />
    </div>);
};
export default Index;
