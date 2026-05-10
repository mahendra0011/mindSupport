import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Sparkles, ShieldCheck, Gauge, HeartPulse, BookOpen, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
function FeatureItem({ feature }) {
    return (<div className="flex items-start gap-2">
      {feature.included ? (<Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0"/>) : (<X className="h-4 w-4 text-foreground/40 mt-0.5 flex-shrink-0"/>)}
      <span className={feature.included ? "text-sm" : "text-sm text-foreground/60 line-through"}>
        {feature.label}
      </span>
    </div>);
}
function WellnessBlock({ included }) {
    const base = "flex items-start gap-2";
    const TitleIcon = ShieldCheck;
    const itemCls = (ok) => ok ? "text-sm" : "text-sm text-foreground/60 line-through";
    const iconOk = "h-4 w-4 text-green-600 mt-0.5 flex-shrink-0";
    const iconNo = "h-4 w-4 text-foreground/40 mt-0.5 flex-shrink-0";
    return (<div className="mt-4 space-y-2">
      <div className="flex items-center gap-2">
        <TitleIcon className={included ? "h-4 w-4 text-primary" : "h-4 w-4 text-foreground/40"}/>
        <span className={included ? "text-sm font-medium" : "text-sm font-medium text-foreground/60 line-through"}>
          My Wellness Dashboard
        </span>
      </div>
      <div className="grid grid-cols-1 gap-1.5">
        <div className={base}>
          {(included ? <Check className={iconOk}/> : <X className={iconNo}/>)}
          <span className={itemCls(included)}>Dashboard</span>
        </div>
        <div className={base}>
          {(included ? <Check className={iconOk}/> : <X className={iconNo}/>)}
          <span className={itemCls(included)}>Risk Assessment</span>
        </div>
        <div className={base}>
          {(included ? <Check className={iconOk}/> : <X className={iconNo}/>)}
          <span className={itemCls(included)}>Mood Tracking</span>
        </div>
        <div className={base}>
          {(included ? <Check className={iconOk}/> : <X className={iconNo}/>)}
          <span className={itemCls(included)}>Resources</span>
        </div>
        <div className={base}>
          {(included ? <Check className={iconOk}/> : <X className={iconNo}/>)}
          <span className={itemCls(included)}>Emergency</span>
        </div>
      </div>
    </div>);
}
function PlanCard({ name, price, period, highlight, features, adminIncluded, wellnessIncluded, onChoose, }) {
    return (<Card className={"glass-card relative rounded-2xl transition-all duration-200 hover:-translate-y-1 hover:shadow-xl " +
            (highlight ? "ring-1 ring-primary/30" : "hover:ring-1 hover:ring-foreground/10")}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">{name}</CardTitle>
          {highlight && (<Badge className="bg-primary/15 text-primary border border-primary/20 rounded-full gap-1">
              <Sparkles className="h-3.5 w-3.5"/> Popular
            </Badge>)}
        </div>
        <CardDescription>
          {name === "Premium"
            ? "All features unlocked with full analytics"
            : name === "Standard"
                ? "Great for regular students"
                : "Core access to get started"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-baseline gap-2">
          <div className="text-4xl font-bold">{price}</div>
          {period && <div className="text-sm text-foreground/60">/ {period}</div>}
        </div>

        <div className="space-y-2">
          {features.map((f) => (<FeatureItem key={f.label} feature={f}/>))}

          {/* Admin Dashboard */}
          <div className="flex items-start gap-2 pt-2">
            {adminIncluded ? (<Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0"/>) : (<X className="h-4 w-4 text-foreground/40 mt-0.5 flex-shrink-0"/>)}
            <span className={adminIncluded ? "text-sm" : "text-sm text-foreground/60 line-through"}>
              Admin Dashboard
            </span>
          </div>

          {/* Wellness bundle */}
          <WellnessBlock included={wellnessIncluded}/>
        </div>

        <Button onClick={onChoose} size="lg" className={"w-full group relative overflow-hidden transform transition-all duration-200 hover:-translate-y-0.5 hover:ring-2 hover:ring-primary/40 hover:shadow-lg hover:animate-pulse " +
            (highlight ? "bg-gradient-primary text-primary-foreground" : "bg-foreground/5")}>
          <span className="relative z-10">Choose Plan</span>
          <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-primary/20"/>
        </Button>
      </CardContent>
    </Card>);
}
const Pricing = () => {
    const { toast } = useToast();
    const freeFeatures = [
        { label: "Counsellor messaging", included: true },
        { label: "Resources", included: true },
        { label: "Book Session", included: false },
        { label: "Peer Support (chat with community)", included: false },
    ];
    const standardFeatures = [
        { label: "Counsellor messaging", included: true },
        { label: "Book Session", included: true },
        { label: "Resources", included: true },
        { label: "Peer Support (chat with community)", included: true },
    ];
    const premiumFeatures = [
        { label: "Counsellor messaging", included: true },
        { label: "Book Session", included: true },
        { label: "Resources", included: true },
        { label: "Peer Support (chat with community)", included: true },
    ];
    return (<div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-16">
        <section className="py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Gauge className="h-6 w-6 text-primary"/>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Choose the plan that fits you</h1>
              <p className="text-foreground/70 mt-2">
                Three clean, card-based pricing options with soft shadows, rounded corners, and hover animations.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Free */}
              <PlanCard name="Free" price="$0" features={freeFeatures} adminIncluded={false} wellnessIncluded={false} onChoose={() => toast({ title: "Free plan selected", description: "You can start right away." })}/>

              {/* Standard */}
              <PlanCard name="Standard" price="$5" period="month" highlight features={standardFeatures} adminIncluded={false} wellnessIncluded={false} onChoose={() => toast({ title: "Standard plan selected", description: "Monthly access activated." })}/>

              {/* Premium */}
              <PlanCard name="Premium" price="$10" period="month" features={premiumFeatures} adminIncluded wellnessIncluded onChoose={() => toast({ title: "Premium plan selected", description: "All features unlocked." })}/>
            </div>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-foreground/70">
              <div className="flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-primary mt-0.5"/>
                <span>Secure payments and data protection</span>
              </div>
              <div className="flex items-start gap-2">
                <HeartPulse className="h-4 w-4 text-secondary mt-0.5"/>
                <span>Built for student wellbeing and support</span>
              </div>
              <div className="flex items-start gap-2">
                <BookOpen className="h-4 w-4 text-accent mt-0.5"/>
                <span>Access curated mental health resources</span>
              </div>
            </div>

            <div className="mt-6 text-xs text-foreground/60 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5"/>
              <span>Plan selection is illustrative. Integrate with your billing provider to enable purchases.</span>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>);
};
export default Pricing;
