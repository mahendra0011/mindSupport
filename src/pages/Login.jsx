import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Brain, CalendarCheck, LockKeyhole, Mail, ShieldCheck, Sparkles, Users } from "lucide-react";
import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";
import GlowPanel from "@/components/reactbits/GlowPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { loginUser } from "@/store/authSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const Login = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, status } = useAppSelector((state) => state.auth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [navigate, user]);

  const submit = async (event) => {
    event.preventDefault();
    try {
      await dispatch(loginUser({ email, password })).unwrap();
      toast({ title: "Signed in", description: "Opening your secure workspace." });
      const from = location.state?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    } catch (error) {
      toast({ variant: "destructive", title: "Login failed", description: error?.message || "Please try again." });
    }
  };

  const isLoading = status === "loading";

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-16">
        <section className="py-8 md:py-12 bg-gradient-to-br from-primary/8 via-background via-secondary/8 to-accent/5">
          <div className="max-w-6xl mx-auto px-4 grid lg:grid-cols-[1fr_420px] gap-6 items-stretch">
            <GlowPanel className="p-7 flex flex-col justify-between min-h-[430px]">
              <div>
                <Badge className="bg-primary/15 text-primary border border-primary/25">Role protected access</Badge>
                <h1 className="mt-5 text-4xl font-bold tracking-tight">Welcome back to MindSupport</h1>
                <p className="mt-3 text-foreground/75 max-w-xl">
                  Sign in to continue care, manage sessions, review applications, or run platform operations.
                </p>
              </div>
              <div className="mt-8 grid sm:grid-cols-3 gap-3 text-sm">
                <AccessTile icon={CalendarCheck} title="Users" text="Bookings, mood, journal, messages" />
                <AccessTile icon={Users} title="Counsellors" text="Unlocked only after admin approval" />
                <AccessTile icon={ShieldCheck} title="Admins" text="Manual platform accounts only" />
              </div>
            </GlowPanel>

            <Card className="glass-card">
              <CardHeader>
                <div className="p-3 rounded-lg bg-gradient-primary w-fit">
                  <Brain className="h-6 w-6 text-primary-foreground" />
                </div>
                <CardTitle>Sign in</CardTitle>
                <CardDescription>Use your registered email and password.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={submit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50" />
                      <Input id="email" type="text" inputMode="email" className="pl-9" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <LockKeyhole className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50" />
                      <Input id="password" type="password" className="pl-9" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
                    </div>
                  </div>
                  <Button type="submit" className="w-full gap-2" disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Open dashboard"}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </form>

                <div className="mt-5 rounded-lg border border-glass-border/40 bg-background/60 p-4 text-sm text-foreground/70">
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Counsellor approval flow
                  </div>
                  <p className="mt-2">Pending counsellors can sign in, but their counsellor dashboard stays locked until admin approval.</p>
                </div>

                <div className="mt-5 text-sm text-foreground/70 text-center">
                  Need an account?{" "}
                  <Link to="/signup" className="text-primary hover:underline">
                    Create one
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

function AccessTile({ icon: Icon, title, text }) {
  return (
    <div className="rounded-lg border border-glass-border/30 bg-background/75 p-3">
      <Icon className="h-4 w-4 text-primary mb-2" />
      <div className="font-semibold">{title}</div>
      <p className="text-xs text-foreground/65 mt-1">{text}</p>
    </div>
  );
}

export default Login;
