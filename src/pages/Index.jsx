import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import AdvancedFeatures from "@/components/AdvancedFeatures";
import CallToAction from "@/components/CallToAction";
import Footer from "@/components/Footer";
const Index = () => {
    return (<div className="min-h-screen bg-background">
      <Navigation />
      <Hero />
      <Features />
      <AdvancedFeatures />
      <CallToAction />
      <Footer />
    </div>);
};
export default Index;
