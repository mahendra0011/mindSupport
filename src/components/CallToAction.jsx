import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Shield, Heart, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
const CallToAction = () => {
    const navigate = useNavigate();
    return (<section className="py-24 bg-gradient-to-br from-primary/10 via-background to-secondary/10 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-hero opacity-50"></div>
      <div className="absolute top-20 left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-6xl font-bold mb-6">
            <span className="text-foreground">Ready to Start Your</span>
            <br />
            <span className="gradient-text">Mental Wellness Journey?</span>
          </h2>
          
          <p className="text-xl text-foreground/70 max-w-3xl mx-auto mb-8">
            Join thousands of students who have found support, guidance, and peace of mind 
            through our comprehensive digital mental health platform.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button size="lg" className="bg-gradient-primary hover:opacity-90 text-lg px-12 py-6 glow-primary pulse-glow group text-xl" onClick={() => navigate("/signup")}>
              Create Account
              <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform"/>
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-12 py-6 border-glass-border/50 hover:bg-glass/30 backdrop-blur-sm text-xl" onClick={() => navigate("/counselling")}>
              Explore Counsellors
            </Button>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="glass-card text-center p-8 floating-card">
            <CardContent className="p-0">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-primary glow-primary mb-4">
                <Shield className="h-8 w-8 text-primary-foreground"/>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">100% Confidential</h3>
              <p className="text-foreground/70">
                Your privacy is our top priority. All conversations and data are encrypted and secure.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card text-center p-8 floating-card" style={{ animationDelay: '0.2s' }}>
            <CardContent className="p-0">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-secondary glow-purple mb-4">
                <Heart className="h-8 w-8 text-secondary-foreground"/>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Professional Care</h3>
              <p className="text-foreground/70">
                Connect with licensed counselors and mental health professionals when you need them.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card text-center p-8 floating-card" style={{ animationDelay: '0.4s' }}>
            <CardContent className="p-0">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-secondary glow-cyan mb-4">
                <Users className="h-8 w-8 text-accent-foreground"/>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Peer Support</h3>
              <p className="text-foreground/70">
                Join a supportive community of students who understand what you're going through.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Final CTA */}
        <div className="glass-card p-12 text-center glow-primary">
          <h3 className="text-3xl font-bold text-foreground mb-4">
            Take the First Step Today
          </h3>
          <p className="text-lg text-foreground/70 mb-8 max-w-2xl mx-auto">
            Your mental health matters. Don't wait - start your journey to better wellbeing with 
            the support and tools you need to thrive in your academic life.
          </p>
          
          <div className="space-y-4">
            <Button size="lg" className="bg-gradient-primary hover:opacity-90 text-xl px-16 py-6 glow-primary pulse-glow group" onClick={() => navigate("/signup")}>
              Start With MindSupport
              <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform"/>
            </Button>
            
            <p className="text-sm text-foreground/50">
              Create a user account or submit a counsellor verification request.
            </p>
          </div>
        </div>
      </div>
    </section>);
};
export default CallToAction;
