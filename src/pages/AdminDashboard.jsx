import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Download,
  FileText,
  Megaphone,
  Shield,
  ShieldAlert,
  Star,
  UserCog,
  Users,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";

const emptyData = {
  stats: {
    usersByRole: {},
    usersByStatus: {},
    appointmentsByStatus: {},
    appointmentsByMode: {},
    openReports: 0,
    resources: 0,
    totalUsers: 0,
    activeCounsellors: 0,
    totalSessions: 0,
    revenue: 0,
    emergencyAlerts: 0,
    reviewModeration: 0,
    lowRatedCounsellors: 0,
  },
  analytics: { userGrowth: [], sessionTrends: [], revenueTrends: [], demand: [] },
  revenue: { platformRevenue: 0, counsellorPayouts: 0, subscriptionIncome: 0, refundRequests: 0 },
  emergency: [],
  reviews: [],
  activityLogs: [],
  recentUsers: [],
  counsellors: [],
  counsellorApplications: [],
  lowRatedCounsellors: [],
  insights: [],
};

const AdminDashboard = () => {
  const { toast } = useToast();
  const [data, setData] = useState(emptyData);
  const [users, setUsers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [announcement, setAnnouncement] = useState("");
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "password123",
    role: "user",
    specialization: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dashboard, userList, appts] = await Promise.all([
        apiFetch("/api/admin/dashboard"),
        apiFetch("/api/admin/users"),
        apiFetch("/api/admin/appointments"),
      ]);
      setData({ ...emptyData, ...dashboard });
      setUsers(userList);
      setAppointments(appts);
    } catch (error) {
      toast({ variant: "destructive", title: "Admin data unavailable", description: error?.message || "" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(() => {
    const userCount = data.stats.totalUsers || Object.values(data.stats.usersByRole).reduce((sum, value) => sum + value, 0);
    const appointmentCount = data.stats.totalSessions || Object.values(data.stats.appointmentsByStatus).reduce((sum, value) => sum + value, 0);
    return { userCount, appointmentCount };
  }, [data]);

  const createUser = async (event) => {
    event.preventDefault();
    try {
      await apiFetch("/api/admin/users", {
        method: "POST",
        body: JSON.stringify(newUser),
      });
      toast({ title: "Account created", description: `${newUser.role} account is ready.` });
      setNewUser({ name: "", email: "", password: "password123", role: "user", specialization: "" });
      await load();
    } catch (error) {
      toast({ variant: "destructive", title: "Create failed", description: error?.message || "" });
    }
  };

  const updateUserStatus = async (user, status) => {
    try {
      await apiFetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      toast({ title: "Account updated" });
      await load();
    } catch (error) {
      toast({ variant: "destructive", title: "Update failed", description: error?.message || "" });
    }
  };

  const updateUserDetails = async (user, payload, success = "Account updated") => {
    try {
      await apiFetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      toast({ title: success });
      await load();
    } catch (error) {
      toast({ variant: "destructive", title: "Update failed", description: error?.message || "" });
    }
  };

  const deleteUser = async (user) => {
    try {
      await apiFetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      toast({ title: "Account deleted", description: `${user.email} was removed from the platform.` });
      await load();
    } catch (error) {
      toast({ variant: "destructive", title: "Delete failed", description: error?.message || "" });
    }
  };

  const reviewApplication = async (application, status) => {
    try {
      const result = await apiFetch(`/api/admin/counsellor-applications/${application.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      toast({
        title: status === "approved" ? "Counsellor approved" : status === "rejected" ? "Application rejected" : "Application updated",
        description: status === "approved" ? `${result.fullName} now has counsellor access.` : undefined,
      });
      await load();
    } catch (error) {
      toast({ variant: "destructive", title: "Review failed", description: error?.message || "" });
    }
  };

  const moderateReview = async (review, status, action) => {
    try {
      await apiFetch(`/api/admin/reviews/${review.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, action }),
      });
      toast({
        title: action === "suspend-counsellor" ? "Counsellor suspended" : "Review updated",
        description: `${review.counsellor || "Counsellor"} rating moderation saved.`,
      });
      await load();
    } catch (error) {
      toast({ variant: "destructive", title: "Moderation failed", description: error?.message || "" });
    }
  };

  const exportCSV = (kind = "users") => {
    const rows =
      kind === "sessions"
        ? [["Student", "Counsellor", "Date", "Time", "Status", "Mode"], ...appointments.map((item) => [item.studentEmail, item.counsellorName, item.date, item.time, item.status, item.mode])]
        : kind === "revenue"
          ? [
              ["Metric", "Amount"],
              ["Platform revenue", data.revenue.platformRevenue],
              ["Counsellor payouts", data.revenue.counsellorPayouts],
              ["Subscription income", data.revenue.subscriptionIncome],
              ["Refund requests", data.revenue.refundRequests],
            ]
          : kind === "counsellors"
            ? [
                ["Name", "Email", "Status", "Badge", "Rating", "Reviews", "Availability"],
                ...data.counsellors.map((item) => [item.name, item.email, item.status, item.verificationBadge || "", item.rating || 0, item.reviews || 0, (item.availability || []).join("; ")]),
              ]
            : [["Name", "Email", "Role", "Status", "OTP Verified"], ...users.map((user) => [user.name, user.email, user.role, user.status || "active", user.otpVerified ? "yes" : "no"])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `mindsupport-${kind}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const sendAnnouncement = async () => {
    if (!announcement.trim()) {
      toast({ variant: "destructive", title: "Announcement is empty" });
      return;
    }
    try {
      await apiFetch("/api/admin/notifications", {
        method: "POST",
        body: JSON.stringify({ audienceRole: "all", title: "MindSupport announcement", message: announcement }),
      });
      toast({ title: "Announcement sent", description: "Platform notification is available to all dashboards." });
      setAnnouncement("");
      await load();
    } catch (error) {
      toast({ variant: "destructive", title: "Announcement failed", description: error?.message || "" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-16">
        <section className="py-6 md:py-10 bg-gradient-to-br from-primary/8 via-background via-secondary/8 to-accent/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <GlowPanel className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <Badge className="bg-primary/15 text-primary border border-primary/25">Admin dashboard</Badge>
                  <h1 className="text-3xl sm:text-4xl font-bold mt-3 flex items-center gap-3">
                    <Shield className="h-8 w-8 text-primary" />
                    Platform Control Center
                  </h1>
                  <p className="text-foreground/70 mt-2 max-w-2xl">
                    Control users, counsellors, sessions, revenue, emergency reports, reviews, notifications, and security.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => exportCSV("users")} className="gap-2">
                    <Download className="h-4 w-4" />
                    Export Users
                  </Button>
                  <Button onClick={load} disabled={loading}>
                    Refresh
                  </Button>
                </div>
              </div>
            </GlowPanel>

            <div className="grid md:grid-cols-2 xl:grid-cols-6 gap-4">
              <Metric title="Total users" value={totals.userCount} icon={Users} />
              <Metric title="Active counsellors" value={data.stats.activeCounsellors} icon={UserCog} />
              <Metric title="Total sessions" value={totals.appointmentCount} icon={CalendarDays} />
              <Metric title="Revenue" value={`₹${data.stats.revenue}`} icon={CreditCard} />
              <Metric title="Applications" value={data.stats.pendingApplications || 0} icon={FileText} />
              <Metric title="Review queue" value={data.stats.reviewModeration || 0} icon={Star} />
            </div>

            <Tabs defaultValue="overview">
              <TabsList className="flex h-auto flex-wrap justify-start gap-2 bg-muted/60 p-2">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="users">Users</TabsTrigger>
                <TabsTrigger value="applications">Applications</TabsTrigger>
                <TabsTrigger value="counsellors">Counsellors</TabsTrigger>
                <TabsTrigger value="sessions">Sessions</TabsTrigger>
                <TabsTrigger value="revenue">Revenue</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="emergency">Emergency</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid lg:grid-cols-2 gap-6">
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-primary" />
                        Platform Snapshot
                      </CardTitle>
                      <CardDescription>Role distribution, appointment status, and operational insights</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Breakdown title="Roles" data={data.stats.usersByRole} />
                      <Breakdown title="Session status" data={data.stats.appointmentsByStatus} />
                    </CardContent>
                  </Card>

                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle>Admin Insights</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {data.insights.map((insight) => (
                        <PanelText key={insight}>{insight}</PanelText>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="users" className="space-y-6">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserCog className="h-5 w-5 text-primary" />
                      User Management
                    </CardTitle>
                    <CardDescription>View users, block/unblock accounts, verify identities, and create user or counsellor accounts.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={createUser} className="grid lg:grid-cols-5 gap-4 items-end">
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input value={newUser.name} onChange={(event) => setNewUser((prev) => ({ ...prev, name: event.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input type="email" value={newUser.email} onChange={(event) => setNewUser((prev) => ({ ...prev, email: event.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Select value={newUser.role} onValueChange={(value) => setNewUser((prev) => ({ ...prev, role: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="counsellor">Counsellor</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Specialization</Label>
                        <Input value={newUser.specialization} onChange={(event) => setNewUser((prev) => ({ ...prev, specialization: event.target.value }))} />
                      </div>
                      <Button type="submit">Create</Button>
                    </form>
                  </CardContent>
                </Card>

                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle>Accounts</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {users.map((user) => (
                      <div key={user.id} className="rounded-lg border border-glass-border/40 bg-background/60 p-4">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                          <div>
                            <div className="font-semibold">{user.name}</div>
                            <div className="text-sm text-foreground/70">{user.email}</div>
                          </div>
                          <div className="flex flex-wrap gap-2 items-center">
                            <Badge variant="secondary">{user.role}</Badge>
                            <Badge className="bg-foreground/10 text-foreground">{user.status || "active"}</Badge>
                            {user.otpVerified && <Badge className="bg-emerald-500/15 text-emerald-600">OTP verified</Badge>}
                            <Button size="sm" variant="outline" onClick={() => updateUserStatus(user, "active")}>Unblock</Button>
                            <Button size="sm" variant="outline" onClick={() => updateUserDetails(user, { status: "active", otpVerified: true, verificationStatus: "approved" }, "Identity verified")}>Verify identity</Button>
                            <Button size="sm" variant="outline" onClick={() => updateUserStatus(user, "suspended")}>Block</Button>
                            <Button size="sm" variant="outline" onClick={() => deleteUser(user)}>Delete</Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="applications" className="space-y-6">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Counsellor Applications
                    </CardTitle>
                    <CardDescription>Review identity, documents, certificates, experience, pricing, and requested counsellor type.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {data.counsellorApplications.length === 0 ? (
                      <PanelText>No applications submitted yet.</PanelText>
                    ) : (
                      data.counsellorApplications.map((application) => (
                        <div key={application.id} className="rounded-lg border border-glass-border/40 bg-background/60 p-4">
                          <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="font-semibold text-lg">{application.fullName}</div>
                                <Badge variant="secondary">{application.status}</Badge>
                                <Badge className={application.requestedType === "professional" ? "bg-blue-500/15 text-blue-600" : "bg-emerald-500/15 text-emerald-600"}>
                                  {application.requestedType === "professional" ? "Verified Professional" : "Community Mentor"}
                                </Badge>
                              </div>
                              <div className="text-sm text-foreground/70">{application.userEmail} - {application.specialization}</div>
                              <div className="grid md:grid-cols-2 gap-2 text-sm text-foreground/70">
                                <div>Experience: {application.experience}</div>
                                <div>Languages: {(application.languages || []).join(", ") || "Not provided"}</div>
                                <div>Pricing: ₹{application.sessionPricing || 0}/session</div>
                                <div>ID: {application.idDocumentType} / {application.idDocumentNumber ? "provided" : "missing"}</div>
                                <div>License: {application.licenseNumber || "Not provided"}</div>
                                <div>LinkedIn: {application.linkedin || "Not provided"}</div>
                              </div>
                              <p className="text-sm text-foreground/75">{application.bio}</p>
                              {application.verificationNotes && <PanelText>{application.verificationNotes}</PanelText>}
                            </div>
                            <div className="flex flex-wrap xl:flex-col gap-2 min-w-40">
                              <Button size="sm" variant="outline" onClick={() => reviewApplication(application, "reviewing")}>Reviewing</Button>
                              <Button size="sm" onClick={() => reviewApplication(application, "approved")}>Approve</Button>
                              <Button size="sm" variant="outline" onClick={() => reviewApplication(application, "rejected")}>Reject</Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="counsellors">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Video className="h-5 w-5 text-secondary" />
                      Counsellor Management
                    </CardTitle>
                    <CardDescription>Approve counsellors, verify licenses, manage availability, and suspend accounts.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid md:grid-cols-2 gap-4">
                    {data.counsellors.map((counsellor) => (
                      <div key={counsellor.id} className="rounded-lg border border-glass-border/40 bg-background/60 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold">{counsellor.name}</div>
                            <div className="text-sm text-foreground/70">{counsellor.specialization || "General counselling"}</div>
                            <div className="text-xs text-foreground/60 mt-1">
                              {counsellor.verificationBadge || "Verification pending"} - {counsellor.counsellorType || "professional"}
                            </div>
                            <div className="text-xs text-foreground/60 mt-1">License: {counsellor.licenseNumber || "Pending"}</div>
                            <div className="text-xs text-foreground/60 mt-1">
                              Rating: {counsellor.rating || 0} from {counsellor.reviews || 0} reviews
                            </div>
                          </div>
                          <Badge className={counsellor.meetLink ? "bg-emerald-500/15 text-emerald-500" : "bg-amber-500/15 text-amber-500"}>
                            {counsellor.meetLink ? "Meet ready" : "Needs link"}
                          </Badge>
                        </div>
                        <div className="mt-3 text-xs text-foreground/60">{(counsellor.availability || []).join(", ") || "Availability not set"}</div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => updateUserStatus(counsellor, "approved")}>Approve</Button>
                          <Button size="sm" variant="outline" onClick={() => updateUserDetails(counsellor, {
                            verificationStatus: "approved",
                            verificationBadge: counsellor.counsellorType === "mentor" ? "Community Mentor" : "Verified Professional",
                            status: "approved",
                          }, "License verified")}>Verify License</Button>
                          <Button size="sm" variant="outline" onClick={() => updateUserDetails(counsellor, {
                            availability: counsellor.availability?.length ? counsellor.availability : ["Mon 10:00-13:00", "Wed 14:00-17:00"],
                          }, "Availability updated")}>Set default availability</Button>
                          <Button size="sm" variant="outline" onClick={() => updateUserStatus(counsellor, "suspended")}>Suspend</Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="sessions">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle>Session Monitoring</CardTitle>
                    <CardDescription>Monitor sessions, cancellations, statistics, and Google Meet usage.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-end">
                      <Button variant="outline" onClick={() => exportCSV("sessions")}>Export session analytics</Button>
                    </div>
                    {appointments.map((appointment) => (
                      <div key={appointment.id} className="rounded-lg border border-glass-border/40 bg-background/60 p-4">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                          <div>
                            <div className="font-semibold">{appointment.studentEmail}</div>
                            <div className="text-sm text-foreground/70">
                              {appointment.counsellorName} - {appointment.date} at {appointment.time}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 items-center">
                            <Badge variant="secondary">{appointment.status}</Badge>
                            <Badge className="bg-foreground/10 text-foreground">{appointment.mode}</Badge>
                            {appointment.meetingLink && (
                              <Button asChild size="sm" variant="outline">
                                <a href={appointment.meetingLink} target="_blank" rel="noreferrer">Open Meet</a>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="revenue" className="space-y-6">
                <div className="grid md:grid-cols-4 gap-4">
                  <Metric title="Platform revenue" value={`₹${data.revenue.platformRevenue}`} icon={CreditCard} />
                  <Metric title="Counsellor payouts" value={`₹${data.revenue.counsellorPayouts}`} icon={Users} />
                  <Metric title="Subscriptions" value={`₹${data.revenue.subscriptionIncome}`} icon={CheckCircle2} />
                  <Metric title="Refund requests" value={data.revenue.refundRequests} icon={ShieldAlert} />
                </div>
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle>Revenue Trend</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-5 gap-2">
                    {data.analytics.revenueTrends.map((item) => (
                      <MiniBar key={item.month} label={item.month} value={Math.min(100, item.value / 2000)} />
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="analytics" className="space-y-6">
                <div className="grid lg:grid-cols-2 gap-6">
                  <AnalyticsCard title="User Growth" data={data.analytics.userGrowth} />
                  <AnalyticsCard title="Session Trends" data={data.analytics.sessionTrends} />
                  <AnalyticsCard title="Mental Health Demand" data={data.analytics.demand} labelKey="category" />
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle>Reports & Export</CardTitle>
                      <CardDescription>User reports, revenue reports, session analytics, and counsellor performance.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid sm:grid-cols-2 gap-2">
                      <Button variant="outline" onClick={() => exportCSV("users")}>User report</Button>
                      <Button variant="outline" onClick={() => exportCSV("revenue")}>Revenue report</Button>
                      <Button variant="outline" onClick={() => exportCSV("sessions")}>Session report</Button>
                      <Button variant="outline" onClick={() => exportCSV("counsellors")}>Counsellor performance</Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="emergency" className="space-y-6">
                <Card className="glass-card border-emergency/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShieldAlert className="h-5 w-5 text-emergency" />
                      Emergency Monitoring
                    </CardTitle>
                    <CardDescription>SOS alerts, crisis reports, and emergency response activity.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {data.emergency.map((alert) => (
                      <div key={alert.id} className="rounded-lg border border-glass-border/40 bg-background/60 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <div className="font-semibold">{alert.id}</div>
                          <div className="text-sm text-foreground/70">{alert.user} - {alert.time}</div>
                        </div>
                        <Badge variant="secondary">{alert.status}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="security" className="space-y-6">
                <div className="grid lg:grid-cols-[1fr_0.9fr] gap-6">
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        Security Features
                      </CardTitle>
                      <CardDescription>Role-based access, activity logs, JWT auth, and login tracking.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {data.activityLogs.map((log) => (
                        <PanelText key={log}><Activity className="inline h-4 w-4 mr-2" />{log}</PanelText>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Megaphone className="h-5 w-5 text-secondary" />
                        Platform Notifications
                      </CardTitle>
                      <CardDescription>System announcements, wellness campaigns, and maintenance alerts.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Textarea rows={5} value={announcement} onChange={(event) => setAnnouncement(event.target.value)} placeholder="Write a wellness campaign or maintenance alert..." />
                      <Button onClick={sendAnnouncement} className="gap-2">
                        <Bell className="h-4 w-4" />
                        Send Announcement
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-amber-500" />
                      Review Moderation
                    </CardTitle>
                    <CardDescription>Remove abusive reviews, handle reports, and moderate content.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {data.reviews.length === 0 ? (
                      <PanelText>No reviews submitted yet.</PanelText>
                    ) : (
                      data.reviews.map((review) => (
                      <div key={review.id} className="rounded-lg border border-glass-border/40 bg-background/60 p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                        <div className="space-y-1">
                          <div className="font-semibold">{review.counsellor || "Counsellor"}</div>
                          <div className="text-sm text-foreground/70">
                            {review.rating} stars - {review.status} - {review.studentName}
                          </div>
                          <div className="text-xs text-foreground/60">
                            Professionalism {review.professionalism} / Helpfulness {review.helpfulness} / Communication {review.communication}
                          </div>
                          {review.comment && <p className="text-sm text-foreground/75">{review.comment}</p>}
                          {review.needsModeration && <Badge className="bg-amber-500/15 text-amber-600">Needs moderation</Badge>}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => moderateReview(review, "approved")}>Approve</Button>
                          <Button size="sm" variant="outline" onClick={() => moderateReview(review, "flagged")}>Flag</Button>
                          <Button size="sm" variant="outline" onClick={() => moderateReview(review, "removed")}>Remove</Button>
                          <Button size="sm" variant="outline" onClick={() => moderateReview(review, "removed", "suspend-counsellor")}>Suspend counsellor</Button>
                        </div>
                      </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

function Metric({ title, value, icon: Icon }) {
  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function Breakdown({ title, data }) {
  const entries = Object.entries(data || {});
  if (entries.length === 0) return <PanelText>No {title.toLowerCase()} data yet.</PanelText>;
  return (
    <div>
      <h3 className="font-medium mb-2">{title}</h3>
      <div className="space-y-2">
        {entries.map(([name, count]) => (
          <div key={name} className="flex items-center justify-between rounded-lg bg-foreground/5 px-3 py-2">
            <span className="capitalize">{name}</span>
            <span className="font-semibold">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PanelText({ children }) {
  return <div className="rounded-lg border border-glass-border/40 bg-background/60 p-3 text-sm text-foreground/75">{children}</div>;
}

function AnalyticsCard({ title, data, labelKey = "month" }) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-5 gap-2">
        {(data || []).map((item) => (
          <MiniBar key={item[labelKey]} label={item[labelKey]} value={Math.min(100, item.value)} />
        ))}
      </CardContent>
    </Card>
  );
}

function MiniBar({ label, value }) {
  return (
    <div className="h-36 rounded-lg bg-foreground/5 p-2 flex flex-col justify-end">
      <div className="rounded-md bg-primary/70" style={{ height: `${Math.max(12, value)}%` }} />
      <div className="text-center text-[10px] text-foreground/60 mt-2">{label}</div>
    </div>
  );
}

export default AdminDashboard;
