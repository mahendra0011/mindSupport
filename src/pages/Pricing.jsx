import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Sparkles, ShieldCheck, Gauge, HeartPulse, BookOpen, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

function formatRupees(value = 0) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(Number(value) || 0);
}
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
function PlanCard({ name, price, period, highlight, features, wellnessIncluded, onChoose, }) {
    return (<Card className={"dashboard-card-motion glass-card relative rounded-2xl transition-all duration-200 hover:-translate-y-1 hover:shadow-xl " +
            (highlight ? "ring-1 ring-primary/30" : "hover:ring-1 hover:ring-foreground/10")}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">{name}</CardTitle>
          {highlight && (<Badge className="bg-primary/15 text-primary border border-primary/20 rounded-full gap-1">
              <Sparkles className="h-3.5 w-3.5"/> Popular
            </Badge>)}
        </div>
        <CardDescription>
          {name === "Premium Care"
            ? "Frequent care with deeper tracking"
            : name === "Wellness Plus"
                ? "Best for regular counselling support"
                : "Light support for guided self-care"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-baseline gap-2">
          <div className="text-4xl font-bold">{price}</div>
          {period && <div className="text-sm text-foreground/60">/ {period}</div>}
        </div>

        <div className="space-y-2">
          {features.map((f) => (<FeatureItem key={f.label} feature={f}/>))}

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
    const starterFeatures = [
        { label: "Counsellor messaging", included: true },
        { label: "Resources", included: true },
        { label: "Mood and journal tools", included: true },
        { label: "Discounted sessions", included: false },
    ];
    const plusFeatures = [
        { label: "Counsellor messaging", included: true },
        { label: "Book Session", included: true },
        { label: "Resources", included: true },
        { label: "2 discounted sessions", included: true },
    ];
    const premiumFeatures = [
        { label: "Unlimited chat follow-ups", included: true },
        { label: "4 discounted sessions", included: true },
        { label: "Resources", included: true },
        { label: "Advanced wellness reports", included: true },
    ];
    return (<div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-16">
        <section className="dashboard-motion py-10">
          <div className="dashboard-shell max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <div className="dashboard-icon-float mx-auto h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Gauge className="h-6 w-6 text-primary"/>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Choose the plan that fits you</h1>
              <p className="text-foreground/70 mt-2">
                Rupee-based subscriptions for guided self-care, counselling support, and deeper progress tracking.
              </p>
            </div>

            <div className="dashboard-stagger grid grid-cols-1 md:grid-cols-3 gap-6">
              <PlanCard name="Care Starter" price={formatRupees(499)} period="month" features={starterFeatures} wellnessIncluded onChoose={() => toast({ title: "Care Starter selected", description: `Monthly access recorded at ${formatRupees(499)}.` })}/>

              <PlanCard name="Wellness Plus" price={formatRupees(999)} period="month" highlight features={plusFeatures} wellnessIncluded onChoose={() => toast({ title: "Wellness Plus selected", description: `Monthly access recorded at ${formatRupees(999)}.` })}/>

              <PlanCard name="Premium Care" price={formatRupees(1999)} period="month" features={premiumFeatures} wellnessIncluded onChoose={() => toast({ title: "Premium Care selected", description: `Monthly access recorded at ${formatRupees(1999)}.` })}/>
            </div>

            <div className="dashboard-stagger mt-10 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-foreground/70">
              <div className="flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-primary mt-0.5"/>
                <span>Secure payments and data protection</span>
              </div>
              <div className="flex items-start gap-2">
                <HeartPulse className="h-4 w-4 text-secondary mt-0.5"/>
                <span>Built for emotional wellbeing and support</span>
              </div>
              <div className="flex items-start gap-2">
                <BookOpen className="h-4 w-4 text-accent mt-0.5"/>
                <span>Access curated mental health resources</span>
              </div>
            </div>

            <div className="mt-6 text-xs text-foreground/60 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5"/>
              <span>Plan selection records subscription intent. Connect your payment gateway before accepting live payments.</span>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>);
};
export default Pricing;
