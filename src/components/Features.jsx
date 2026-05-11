import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, BookOpen, Calendar, Users, BarChart3, Shield, Zap, Heart, Clock, UserCheck, ArrowRight } from "lucide-react";
const Features = () => {
    const mainFeatures = [
        {
            icon: MessageCircle,
            title: "Secure Counsellor Messaging",
            description: "Private messaging for follow-ups, wellness tasks, session reminders, and supportive check-ins with your counsellor.",
            features: ["Private Follow-ups", "Session Tasks", "File Sharing", "Care Notes"],
            gradient: "from-primary/20 to-primary/5",
            glowClass: "glow-primary"
        },
        {
            icon: Calendar,
            title: "Secure Booking System",
            description: "Book confidential one-on-one sessions with qualified counselors through our encrypted platform.",
            features: ["Private Sessions", "Qualified Counselors", "Flexible Scheduling", "Secure Platform"],
            gradient: "from-secondary/20 to-secondary/5",
            glowClass: "glow-purple"
        },
        {
            icon: BookOpen,
            title: "Resource Hub",
            description: "Curated collection of mental wellness videos and articles for motivation, stress, sleep, confidence, and self-care.",
            features: ["YouTube Videos", "Motivation Articles", "Multi-language", "Categorized Resources"],
            gradient: "from-accent/20 to-accent/5",
            glowClass: "glow-cyan"
        }
    ];
    const additionalFeatures = [
        {
            icon: Users,
            title: "Peer Support Network",
            description: "Connect with fellow students in a moderated, anonymous forum environment.",
            stats: "Anonymous & Safe"
        },
        {
            icon: BarChart3,
            title: "Analytics Dashboard",
            description: "Administrators can view aggregate insights to improve mental health services.",
            stats: "Data-Driven Insights"
        },
        {
            icon: Shield,
            title: "Privacy & Security",
            description: "End-to-end encryption with row-level security ensuring complete confidentiality.",
            stats: "100% Secure"
        }
    ];
    const benefits = [
        { icon: Shield, text: "Confidential by Design", color: "text-primary" },
        { icon: Clock, text: "Available 24/7", color: "text-accent" },
        { icon: UserCheck, text: "Professional Support", color: "text-secondary" },
        { icon: Heart, text: "Student-Focused", color: "text-purple-accent" }
    ];
    return (<section id="features" className="py-24 bg-background relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-glass/30 border border-glass-border/30 backdrop-blur-sm mb-6">
            <Zap className="h-4 w-4 text-primary"/>
            <span className="text-sm text-foreground/80">Comprehensive Platform</span>
          </div>
          
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            <span className="gradient-text">Comprehensive Mental Health</span>
            <br />
            <span className="text-foreground">Support Ecosystem</span>
          </h2>
          
          <p className="text-xl text-foreground/70 max-w-3xl mx-auto">
            Our platform combines qualified counsellor support, privacy-first tools, and practical resources 
            tailored for students.
          </p>
        </div>

        {/* Main Features Grid */}
        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          {mainFeatures.map((feature, index) => (<Card key={index} className={`glass-card floating-card bg-gradient-to-br ${feature.gradient} ${feature.glowClass}`}>
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3 mb-4">
                  <div className={`p-3 rounded-lg bg-gradient-primary ${feature.glowClass}`}>
                    <feature.icon className="h-6 w-6 text-primary-foreground"/>
                  </div>
                  <CardTitle className="text-xl text-foreground">{feature.title}</CardTitle>
                </div>
                <CardDescription className="text-foreground/70 text-base leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3 mb-6">
                  {feature.features.map((item, idx) => (<div key={idx} className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <span className="text-sm text-foreground/80">{item}</span>
                    </div>))}
                </div>
                <Button variant="outline" className="w-full border-glass-border/50 hover:bg-glass/30 group">
                  Learn More
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform"/>
                </Button>
              </CardContent>
            </Card>))}
        </div>

        {/* Additional Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {additionalFeatures.map((feature, index) => (<Card key={index} className="glass-card hover:shadow-glow transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="p-2 rounded-lg bg-muted/50">
                    <feature.icon className="h-5 w-5 text-primary"/>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                    <p className="text-sm text-foreground/70 mb-3">{feature.description}</p>
                    <div className="text-xs text-primary font-medium">{feature.stats}</div>
                  </div>
                </div>
              </CardContent>
            </Card>))}
        </div>

        {/* Benefits */}
        <div className="glass-card p-8 text-center">
          <h3 className="text-2xl font-bold text-foreground mb-8">Why Choose MindSupport?</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (<div key={index} className="flex flex-col items-center space-y-3">
                <div className="p-3 rounded-full bg-glass/50 border border-glass-border/30">
                  <benefit.icon className={`h-6 w-6 ${benefit.color}`}/>
                </div>
                <span className="text-sm font-medium text-foreground/80">{benefit.text}</span>
              </div>))}
          </div>
        </div>
      </div>
    </section>);
};
export default Features;
