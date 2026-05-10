import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, BadgeCheck, HeartHandshake, LockKeyhole, Mail, Phone, ShieldCheck, UserRound } from "lucide-react";
import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";
import GlowPanel from "@/components/reactbits/GlowPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { registerUser } from "@/store/authSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const defaultCounsellorProfile = {
  requestedType: "mentor",
  bio: "",
  specialization: "",
  experience: "",
  languages: "",
  sessionPricing: "",
  profilePhotoUrl: "",
  certificateLinks: "",
  linkedin: "",
  idDocumentType: "Government ID",
  idDocumentNumber: "",
  licenseNumber: "",
  education: "",
  categories: "Anxiety, Stress, Student Pressure",
  availability: "Mon 10:00-13:00, Wed 14:00-17:00",
  approach: "",
  emergencyTraining: "",
  referenceContact: "",
  verificationNotes: "",
};

const Signup = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const status = useAppSelector((state) => state.auth.status);
  const [role, setRole] = useState("user");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [phone, setPhone] = useState("");
  const [profile, setProfile] = useState(defaultCounsellorProfile);

  const setProfileField = (key, value) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      toast({ variant: "destructive", title: "Missing information", description: "Name, email, and password are required." });
      return;
    }
    if (password !== confirm) {
      toast({ variant: "destructive", title: "Password mismatch", description: "Passwords do not match." });
      return;
    }
    if (role === "counsellor") {
      const required = [profile.bio, profile.specialization, profile.experience, profile.idDocumentNumber];
      if (required.some((value) => !String(value || "").trim())) {
        toast({ variant: "destructive", title: "Verification details needed", description: "Bio, specialization, experience, and ID verification are required." });
        return;
      }
      if (profile.requestedType === "professional" && !profile.licenseNumber.trim()) {
        toast({ variant: "destructive", title: "License required", description: "Professional counsellors must provide a license or registration number." });
        return;
      }
    }

    try {
      const result = await dispatch(
        registerUser({
          name,
          fullName: name,
          email,
          password,
          phone,
          role,
          ...(role === "counsellor" ? profile : {}),
        })
      ).unwrap();
      if (result.approvalPending) {
        toast({ title: "Request sent", description: "Your counsellor account is pending admin approval." });
      } else {
        toast({ title: "Account created", description: "Welcome to your MindSupport dashboard." });
      }
      navigate("/dashboard");
    } catch (error) {
      toast({ variant: "destructive", title: "Signup failed", description: error?.message || "Please try again." });
    }
  };

  const isLoading = status === "loading";

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-16">
        <section className="py-8 md:py-12 bg-gradient-to-br from-primary/8 via-background via-secondary/8 to-accent/5">
          <div className="max-w-6xl mx-auto px-4 grid lg:grid-cols-[0.9fr_1.1fr] gap-6 items-start">
            <GlowPanel className="p-6 lg:sticky lg:top-24">
              <Badge className="bg-primary/15 text-primary border border-primary/25">Secure registration</Badge>
              <h1 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight">Create your MindSupport account</h1>
              <p className="mt-3 text-foreground/70">
                Choose a normal user account for therapy and wellness tools, or request counsellor access with verification details.
              </p>
              <div className="mt-6 grid gap-3">
                <RoleChoice
                  active={role === "user"}
                  icon={UserRound}
                  title="User"
                  text="Book sessions, track mood, journal privately, and message approved counsellors."
                  onClick={() => setRole("user")}
                />
                <RoleChoice
                  active={role === "counsellor"}
                  icon={HeartHandshake}
                  title="Counsellor"
                  text="Submit your profile and documents. Access opens only after admin approval."
                  onClick={() => setRole("counsellor")}
                />
              </div>
              <div className="mt-6 rounded-lg border border-amber-300/40 bg-amber-50 p-3 text-sm text-amber-900">
                Admin accounts are created manually by the platform owner and are not available in public signup.
              </div>
            </GlowPanel>

            <Card className="glass-card">
              <CardHeader>
                <div className="p-3 rounded-lg bg-gradient-primary w-fit">
                  {role === "counsellor" ? <BadgeCheck className="h-6 w-6 text-primary-foreground" /> : <ShieldCheck className="h-6 w-6 text-primary-foreground" />}
                </div>
                <CardTitle>{role === "counsellor" ? "Counsellor verification request" : "User account"}</CardTitle>
                <CardDescription>
                  {role === "counsellor"
                    ? "Your dashboard stays locked until admin reviews and approves your counsellor profile."
                    : "Create your personal wellness account and start booking support."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={onSubmit} className="space-y-5">
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field label="Full name" value={name} onChange={setName} placeholder="Jane Doe" />
                    <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="jane@example.com" icon={Mail} />
                    <Field label="Phone" value={phone} onChange={setPhone} placeholder="+91 90000 00000" icon={Phone} />
                    <Field label="Password" type="password" value={password} onChange={setPassword} icon={LockKeyhole} />
                    <Field label="Confirm password" type="password" value={confirm} onChange={setConfirm} icon={LockKeyhole} />
                  </div>

                  {role === "counsellor" && (
                    <div className="space-y-5 rounded-lg border border-glass-border/40 bg-background/60 p-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Counsellor type</Label>
                          <Select value={profile.requestedType} onValueChange={(value) => setProfileField("requestedType", value)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="mentor">Peer Support Counsellor / Community Mentor</SelectItem>
                              <SelectItem value="professional">Licensed Therapist / Professional Psychologist</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Field label="Specialization" value={profile.specialization} onChange={(value) => setProfileField("specialization", value)} placeholder="Anxiety, addiction recovery, relationship stress" />
                        <Field label="Experience" value={profile.experience} onChange={(value) => setProfileField("experience", value)} placeholder="3 years, lived recovery experience, campus support" />
                        <Field label="Languages" value={profile.languages} onChange={(value) => setProfileField("languages", value)} placeholder="English, Hindi, Tamil" />
                        <Field label="Session pricing" value={profile.sessionPricing} onChange={(value) => setProfileField("sessionPricing", value)} placeholder="500" />
                        <Field label="LinkedIn / portfolio" value={profile.linkedin} onChange={(value) => setProfileField("linkedin", value)} placeholder="https://linkedin.com/in/..." />
                        <Field label="Profile photo URL" value={profile.profilePhotoUrl} onChange={(value) => setProfileField("profilePhotoUrl", value)} placeholder="https://..." />
                        <Field label="Certificates / document links" value={profile.certificateLinks} onChange={(value) => setProfileField("certificateLinks", value)} placeholder="Comma-separated links" />
                        <Field label="Education / training" value={profile.education} onChange={(value) => setProfileField("education", value)} placeholder="MA Psychology, recovery group training" />
                        <Field label="ID document type" value={profile.idDocumentType} onChange={(value) => setProfileField("idDocumentType", value)} />
                        <Field label="ID verification number" value={profile.idDocumentNumber} onChange={(value) => setProfileField("idDocumentNumber", value)} placeholder="Masked ID or verification reference" />
                        <Field label="License number" value={profile.licenseNumber} onChange={(value) => setProfileField("licenseNumber", value)} placeholder="Required for professionals" />
                        <Field label="Categories" value={profile.categories} onChange={(value) => setProfileField("categories", value)} placeholder="Anxiety, Relationship, Career Stress" />
                        <Field label="Availability" value={profile.availability} onChange={(value) => setProfileField("availability", value)} placeholder="Mon 10:00-13:00, Wed 14:00-17:00" />
                        <Field label="Reference contact" value={profile.referenceContact} onChange={(value) => setProfileField("referenceContact", value)} placeholder="Email or phone" />
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <TextField label="Bio" value={profile.bio} onChange={(value) => setProfileField("bio", value)} placeholder="Introduce your background, values, and the support you provide." />
                        <TextField label="Approach and safety training" value={profile.approach} onChange={(value) => setProfileField("approach", value)} placeholder="Boundaries, referral process, trauma-informed approach, emergency escalation." />
                      </div>
                      <TextField label="Verification notes" value={profile.verificationNotes} onChange={(value) => setProfileField("verificationNotes", value)} placeholder="Anything admin should know while reviewing your identity/documents." />
                    </div>
                  )}

                  <Button type="submit" className="w-full gap-2" disabled={isLoading}>
                    {isLoading ? "Creating account..." : role === "counsellor" ? "Send approval request" : "Create user account"}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </form>
                <p className="text-xs text-foreground/70 mt-4 text-center">
                  By signing up, you understand MindSupport provides emotional support and is not emergency medical care.
                </p>
                <p className="text-sm text-foreground/70 mt-3 text-center">
                  Already registered?{" "}
                  <Link to="/login" className="text-primary hover:underline">
                    Sign in
                  </Link>
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

function RoleChoice({ active, icon: Icon, title, text, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border p-4 text-left transition ${
        active ? "border-primary bg-primary/10 shadow-glow" : "border-glass-border/40 bg-background/70 hover:border-primary/40"
      }`}
    >
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 text-primary mt-0.5" />
        <div>
          <div className="font-semibold">{title}</div>
          <p className="text-sm text-foreground/70 mt-1">{text}</p>
        </div>
      </div>
    </button>
  );
}

function Field({ label, value, onChange, type = "text", placeholder = "", icon: Icon }) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        {Icon && <Icon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50" />}
        <Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={Icon ? "pl-9" : ""} />
      </div>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder = "" }) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea id={id} rows={5} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

export default Signup;
