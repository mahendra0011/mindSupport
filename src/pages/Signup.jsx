import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarClock,
  FileCheck2,
  GraduationCap,
  HeartHandshake,
  IndianRupee,
  Languages,
  Link2,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  UserRound,
  Video,
} from "lucide-react";
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
  location: "",
  consultationModes: ["google-meet", "in-person", "voice-call"],
  responseTime: "Within 24 hours",
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

const consultationModeOptions = [
  { id: "google-meet", label: "Google Meet", icon: Video },
  { id: "in-person", label: "In person", icon: MapPin },
  { id: "voice-call", label: "Voice call", icon: Phone },
];

const Signup = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const status = useAppSelector((state) => state.auth.status);
  const [role, setRole] = useState("user");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [phone, setPhone] = useState("");
  const [profile, setProfile] = useState(defaultCounsellorProfile);

  const setProfileField = (key, value) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const toggleConsultationMode = (mode) => {
    setProfile((prev) => {
      const current = Array.isArray(prev.consultationModes) ? prev.consultationModes : [];
      const active = current.includes(mode);
      if (active && current.length === 1) return prev;
      return {
        ...prev,
        consultationModes: active ? current.filter((item) => item !== mode) : [...current, mode],
      };
    });
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
      const required = [
        ["Bio", profile.bio],
        ["Specialization", profile.specialization],
        ["Experience", profile.experience],
        ["Languages", profile.languages],
        ["Location", profile.location],
        ["Availability", profile.availability],
        ["ID verification", profile.idDocumentNumber],
      ];
      const missing = required.find(([, value]) => !String(value || "").trim());
      if (missing) {
        toast({ variant: "destructive", title: "Verification details needed", description: `${missing[0]} is required for counsellor or therapist approval.` });
        return;
      }
      if (!Number(profile.sessionPricing) || Number(profile.sessionPricing) < 1) {
        toast({ variant: "destructive", title: "Pricing required", description: "Enter an affordable base session price in rupees." });
        return;
      }
      if (!profile.consultationModes?.length) {
        toast({ variant: "destructive", title: "Mode required", description: "Select at least one counselling mode." });
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
          username,
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
                  title="Counsellor / Therapist"
                  text="Submit your professional or mentor profile. Dashboard opens only after admin approval."
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
                <CardTitle>{role === "counsellor" ? "Counsellor / therapist verification request" : "User account"}</CardTitle>
                <CardDescription>
                  {role === "counsellor"
                    ? "Complete the verification form. Your dashboard stays locked until admin approval."
                    : "Create your personal wellness account and start booking support."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={onSubmit} className="space-y-5">
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field label="Full name" value={name} onChange={setName} placeholder="Jane Doe" />
                    <Field label="Username" value={username} onChange={(value) => setUsername(value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} placeholder="jane_support" />
                    <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="jane@example.com" icon={Mail} />
                    <Field label="Phone" value={phone} onChange={setPhone} placeholder="+91 90000 00000" icon={Phone} />
                    <Field label="Password" type="password" value={password} onChange={setPassword} icon={LockKeyhole} />
                    <Field label="Confirm password" type="password" value={confirm} onChange={setConfirm} icon={LockKeyhole} />
                  </div>

                  {role === "counsellor" && (
                    <div className="space-y-6 border-t border-glass-border/40 pt-5">
                      <FormSection
                        icon={Stethoscope}
                        title="Application type"
                        text="Choose how this profile should be reviewed and displayed after approval."
                      />
                      <div className="grid gap-3 md:grid-cols-2">
                        <TypeChoice
                          active={profile.requestedType === "mentor"}
                          title="Community Mentor"
                          badge="Peer support"
                          text="For lived-experience support such as stress recovery, loneliness, breakup recovery, or confidence building."
                          onClick={() => setProfileField("requestedType", "mentor")}
                        />
                        <TypeChoice
                          active={profile.requestedType === "professional"}
                          title="Licensed Therapist"
                          badge="Professional"
                          text="For psychologists, therapists, and licensed professionals. License or registration number is required."
                          onClick={() => setProfileField("requestedType", "professional")}
                        />
                      </div>

                      <FormSection icon={BriefcaseBusiness} title="Public profile" text="This information is shown to users after admin approval." />
                      <div className="grid md:grid-cols-2 gap-4">
                        <Field label="Specialization" value={profile.specialization} onChange={(value) => setProfileField("specialization", value)} placeholder="Anxiety, trauma, relationship therapy" />
                        <Field label="Experience" value={profile.experience} onChange={(value) => setProfileField("experience", value)} placeholder="6 years, peer recovery mentor" />
                        <Field label="Languages" value={profile.languages} onChange={(value) => setProfileField("languages", value)} placeholder="English, Hindi, Tamil" icon={Languages} />
                        <Field label="Location" value={profile.location} onChange={(value) => setProfileField("location", value)} placeholder="Mumbai, Maharashtra or Online" icon={MapPin} />
                        <Field label="Base session price (INR)" type="number" min="1" value={profile.sessionPricing} onChange={(value) => setProfileField("sessionPricing", value)} placeholder="500" icon={IndianRupee} />
                        <Field label="Categories" value={profile.categories} onChange={(value) => setProfileField("categories", value)} placeholder="Anxiety, Depression, Student Pressure" />
                      </div>
                      <TextField rows={4} label="Bio" value={profile.bio} onChange={(value) => setProfileField("bio", value)} placeholder="Write a warm, professional summary of your background, values, and the support you provide." />

                      <FormSection icon={CalendarClock} title="Availability and session modes" text="Users will use these details while booking sessions." />
                      <div className="grid md:grid-cols-2 gap-4">
                        <Field label="Availability" value={profile.availability} onChange={(value) => setProfileField("availability", value)} placeholder="Monday: 10:00-16:00, Friday: 09:00-14:00" />
                        <Field label="Response time" value={profile.responseTime} onChange={(value) => setProfileField("responseTime", value)} placeholder="Within 24 hours" />
                      </div>
                      <div className="space-y-2">
                        <Label>Counselling modes</Label>
                        <div className="grid gap-2 sm:grid-cols-3">
                          {consultationModeOptions.map((mode) => (
                            <ModeChoice
                              key={mode.id}
                              active={profile.consultationModes.includes(mode.id)}
                              icon={mode.icon}
                              label={mode.label}
                              onClick={() => toggleConsultationMode(mode.id)}
                            />
                          ))}
                        </div>
                      </div>

                      <FormSection icon={FileCheck2} title="Verification details" text="Admin uses these fields to approve, reject, or request more information." />
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>ID document type</Label>
                          <Select value={profile.idDocumentType} onValueChange={(value) => setProfileField("idDocumentType", value)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Government ID">Government ID</SelectItem>
                              <SelectItem value="Aadhaar">Aadhaar</SelectItem>
                              <SelectItem value="Passport">Passport</SelectItem>
                              <SelectItem value="Driving License">Driving License</SelectItem>
                              <SelectItem value="Professional Registration">Professional Registration</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Field label="ID verification number" value={profile.idDocumentNumber} onChange={(value) => setProfileField("idDocumentNumber", value)} placeholder="Masked ID or verification reference" />
                        <Field label="License / registration number" value={profile.licenseNumber} onChange={(value) => setProfileField("licenseNumber", value)} placeholder={profile.requestedType === "professional" ? "Required for professionals" : "Optional for mentors"} />
                        <Field label="Education / training" value={profile.education} onChange={(value) => setProfileField("education", value)} placeholder="MA Psychology, counselling diploma, peer support training" icon={GraduationCap} />
                        <Field label="LinkedIn / portfolio" value={profile.linkedin} onChange={(value) => setProfileField("linkedin", value)} placeholder="https://linkedin.com/in/..." icon={Link2} />
                        <Field label="Profile photo URL" value={profile.profilePhotoUrl} onChange={(value) => setProfileField("profilePhotoUrl", value)} placeholder="https://..." />
                        <Field label="Certificates / document links" value={profile.certificateLinks} onChange={(value) => setProfileField("certificateLinks", value)} placeholder="Comma-separated links" />
                        <Field label="Reference contact" value={profile.referenceContact} onChange={(value) => setProfileField("referenceContact", value)} placeholder="Email or phone of reference" />
                      </div>

                      <FormSection icon={ShieldAlert} title="Safety and approach" text="Mental health support needs clear boundaries and escalation readiness." />
                      <div className="grid md:grid-cols-2 gap-4">
                        <TextField rows={4} label="Therapy / support approach" value={profile.approach} onChange={(value) => setProfileField("approach", value)} placeholder="CBT-informed, trauma-aware, peer support boundaries, referrals when needed." />
                        <TextField rows={4} label="Emergency training" value={profile.emergencyTraining} onChange={(value) => setProfileField("emergencyTraining", value)} placeholder="Crisis response training, suicide prevention training, or escalation process." />
                      </div>
                      <TextField rows={3} label="Verification notes" value={profile.verificationNotes} onChange={(value) => setProfileField("verificationNotes", value)} placeholder="Anything admin should know while reviewing your identity, documents, or profile." />
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

function TypeChoice({ active, title, badge, text, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition ${
        active ? "border-primary bg-primary/10 text-foreground" : "border-glass-border/35 bg-background/45 hover:border-primary/40"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="font-semibold">{title}</div>
        <Badge className={active ? "bg-primary text-primary-foreground" : "bg-foreground/10 text-foreground/75"}>{badge}</Badge>
      </div>
      <p className="mt-2 text-sm leading-6 text-foreground/70">{text}</p>
    </button>
  );
}

function ModeChoice({ active, icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
        active ? "border-primary bg-primary/15 text-primary" : "border-glass-border/35 bg-background/45 text-foreground/75 hover:border-primary/40"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function FormSection({ icon: Icon, title, text }) {
  return (
    <div className="border-t border-glass-border/35 pt-5 first:border-t-0 first:pt-0">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/15 p-2 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-1 text-sm text-foreground/65">{text}</p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder = "", icon: Icon, ...inputProps }) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        {Icon && <Icon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50" />}
        <Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={Icon ? "pl-9" : ""} {...inputProps} />
      </div>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder = "", rows = 5 }) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea id={id} rows={rows} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

export default Signup;
