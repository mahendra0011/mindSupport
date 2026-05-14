import { useEffect, useMemo, useState } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectTrigger, SelectValue, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { apiUrl } from "@/lib/api";
import { BookOpen, Filter, Languages, Search, Video, FileText, Bookmark } from "lucide-react";
import { useNavigate } from "react-router-dom";
function buildQuery(params) {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v === undefined || v === null)
            return;
        if (typeof v === "string" && v.trim() === "")
            return;
        if (Array.isArray(v)) {
            if (v.length > 0)
                q.set(k, v.join(","));
            return;
        }
        q.set(k, String(v));
    });
    const s = q.toString();
    return s ? `?${s}` : "";
}
async function fetchResources(filters) {
    const query = buildQuery({
        q: filters.q,
        type: filters.type && filters.type !== "all" ? filters.type : undefined,
        category: filters.category && filters.category !== "all" ? filters.category : undefined,
        language: filters.language && filters.language !== "all" ? filters.language : undefined,
        tags: filters.tags && filters.tags.length ? filters.tags : undefined,
        minDur: filters.minDur,
        maxDur: filters.maxDur,
    });
    const res = await fetch(apiUrl(`/api/resources${query}`));
    if (!res.ok) {
        throw new Error(`Failed to load resources ${res.status}`);
    }
    return res.json();
}
async function fetchYouTube(q, opts) {
    try {
        if (opts.type !== "video" && opts.type !== "all")
            return [];
        const max = opts.maxResults ?? 6;
        const query = buildQuery({
            q: q || opts.category || opts.tags?.[0] || "mental health motivation",
            category: opts.category && opts.category !== "all" ? opts.category : undefined,
            language: opts.language && opts.language !== "all" ? opts.language : undefined,
            minDur: opts.minDur,
            maxDur: opts.maxDur,
            maxResults: max,
        });
        const res = await fetch(apiUrl(`/api/resources/youtube${query}`));
        if (!res.ok)
            return [];
        const items = await res.json();
        // Client-side filter for language/duration against YouTube results
        return items.filter((i) => {
            if (opts.language && opts.language !== "all" && i.language) {
                if (i.language.toLowerCase() !== String(opts.language).toLowerCase())
                    return false;
            }
            if (typeof opts.minDur === "number" && typeof i.durationMin === "number") {
                if (i.durationMin < opts.minDur)
                    return false;
            }
            if (typeof opts.maxDur === "number" && typeof i.durationMin === "number") {
                if (i.durationMin > opts.maxDur)
                    return false;
            }
            return true;
        });
    }
    catch {
        return [];
    }
}
function getYoutubeId(url) {
    try {
        const u = new URL(url);
        if (u.hostname.includes("youtube.com")) {
            const id = u.searchParams.get("v");
            return id;
        }
        if (u.hostname === "youtu.be") {
            return u.pathname.replace("/", "") || null;
        }
        return null;
    }
    catch {
        return null;
    }
}
function getResourceThumbnail(resource) {
    return resource?.thumbnail || resource?.imageUrl || resource?.coverImage || resource?.cover || "";
}
function articleTone(category = "") {
    const key = category.toLowerCase();
    if (key.includes("stress") || key.includes("burnout"))
        return "from-amber-500/28 via-orange-500/18 to-rose-500/20";
    if (key.includes("sleep"))
        return "from-indigo-500/28 via-sky-500/16 to-cyan-500/20";
    if (key.includes("motivation") || key.includes("confidence"))
        return "from-violet-500/28 via-fuchsia-500/18 to-sky-500/20";
    if (key.includes("relationship") || key.includes("loneliness"))
        return "from-pink-500/26 via-violet-500/18 to-blue-500/20";
    if (key.includes("trauma") || key.includes("addiction"))
        return "from-emerald-500/24 via-teal-500/16 to-sky-500/20";
    if (key.includes("anxiety") || key.includes("depression"))
        return "from-blue-500/26 via-violet-500/18 to-emerald-500/18";
    return "from-primary/25 via-secondary/18 to-accent/18";
}
// NOTE: Keep all hooks inside the component
const defaultCategories = [
    "Anxiety",
    "Stress",
    "Sleep",
    "Burnout",
    "Depression",
    "Motivation",
    "Self Confidence",
    "Meditation",
    "Relationships",
    "Career Stress",
    "Student Pressure",
    "Loneliness",
    "Addiction Recovery",
    "Trauma Support",
    "General",
];
const defaultLanguages = ["English", "Hindi", "Tamil", "Telugu", "Kannada", "Marathi", "Bengali"];
const ResourceHub = () => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [resources, setResources] = useState([]);
    const [q, setQ] = useState("");
    const [type, setType] = useState("all");
    const [category, setCategory] = useState("all");
    const [language, setLanguage] = useState("all");
    const [tags, setTags] = useState([]);
    const [minDur, setMinDur] = useState("");
    const [maxDur, setMaxDur] = useState("");
    // Personalization: if last chat category stored, show recommended section
    const lastCategory = (localStorage.getItem("lastCategory") || "").trim();
    const selectedFilters = useMemo(() => ({
        q,
        type,
        category,
        language,
        tags,
        minDur: minDur ? Number(minDur) : undefined,
        maxDur: maxDur ? Number(maxDur) : undefined,
    }), [q, type, category, language, tags, minDur, maxDur]);
    useEffect(() => {
        // initial load
        void reload();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    // Auto-search YouTube + platform resources when filters/keyword change (debounced)
    useEffect(() => {
        const handle = setTimeout(() => {
            void reload();
        }, 500); // debounce
        return () => clearTimeout(handle);
    }, [q, type, category, language, minDur, maxDur, tags]);
    async function reload() {
        setLoading(true);
        try {
            // Fetch platform resources + YouTube results and merge
            const platformPromise = fetchResources(selectedFilters);
            const ytPromise = fetchYouTube(q, {
                type,
                category,
                language,
                tags,
                minDur: selectedFilters.minDur,
                maxDur: selectedFilters.maxDur,
                maxResults: 8,
            });
            const [platform, yt] = await Promise.all([platformPromise, ytPromise]);
            // Merge arrays (platform first), YouTube items have id prefixed with "yt:" to avoid collisions
            const merged = [...platform, ...(Array.isArray(yt) ? yt : [])];
            setResources(merged);
        }
        catch (e) {
            toast({
                variant: "destructive",
                title: "Failed to load resources",
                description: e?.message || "Please try again",
            });
        }
        finally {
            setLoading(false);
        }
    }
    function toggleTag(t) {
        setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
    }
    const availableTags = useMemo(() => {
        // Derive tags from resources for quick chips
        const bag = new Set();
        for (const r of resources) {
            (r.tags || []).forEach((t) => bag.add(t));
        }
        // Seed some commonly useful tags
        ["motivation", "self confidence", "exam stress", "mindfulness", "sleep hygiene", "breathing", "grounding", "study", "relationships", "burnout"].forEach((t) => bag.add(t));
        return Array.from(bag).sort();
    }, [resources]);
    const recommended = useMemo(() => {
        if (!lastCategory)
            return [];
        return resources.filter((r) => r.category.toLowerCase().includes(lastCategory.toLowerCase())).slice(0, 6);
    }, [resources, lastCategory]);
    return (<div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-16">
        <section className="py-6 md:py-8 lg:py-10 bg-gradient-to-br from-primary/8 via-background via-secondary/8 to-accent/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight flex items-center gap-3">
                  <BookOpen className="h-8 w-8 text-primary"/>
                  Psychoeducational Resource Hub
                </h1>
                <p className="text-foreground/70 mt-2">
                  Search trusted wellness videos and practical articles for motivation, stress, sleep, confidence,
                  relationships, and student pressure.
                </p>
              </div>
              <div className="hidden md:flex gap-2">
                <Button variant="outline" className="gap-2" onClick={() => navigate("/")}>
                  Home
                </Button>
                <Button variant="outline" className="gap-2" onClick={reload} disabled={loading}>
                  <Search className="h-4 w-4"/> Search
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => {
            setQ("");
            setType("all");
            setCategory("all");
            setLanguage("all");
            setTags([]);
            setMinDur("");
            setMaxDur("");
        }} disabled={loading}>
                  <Filter className="h-4 w-4"/> Reset
                </Button>
              </div>
            </div>

            {/* Filters */}
            <Card className="glass-card mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-primary"/> Browse & Search
                </CardTitle>
                <CardDescription>Search by keyword, filter by type and language, or jump using tags.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Keyword</label>
                    <div className="relative">
                      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g., breathing, exam stress, sleep" className="pl-9"/>
                      <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50"/>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Type</label>
                    <Select value={type} onValueChange={(v) => setType(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="All"/>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="video">Video</SelectItem>
                        <SelectItem value="article">Article</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category</label>
                    <Select value={category} onValueChange={(v) => setCategory(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="All"/>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {defaultCategories.map((c) => (<SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Languages className="h-4 w-4 text-primary"/>
                      Language
                    </label>
                    <Select value={language} onValueChange={(v) => setLanguage(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="All"/>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {defaultLanguages.map((l) => (<SelectItem key={l} value={l}>
                            {l}
                          </SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Min Duration (minutes)</label>
                    <Input type="number" min={0} value={minDur} onChange={(e) => setMinDur(e.target.value)} placeholder="e.g., 2"/>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Max Duration (minutes)</label>
                    <Input type="number" min={0} value={maxDur} onChange={(e) => setMaxDur(e.target.value)} placeholder="e.g., 20"/>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Quick Tags</label>
                    <ScrollArea className="h-10">
                      <div className="flex gap-2 pr-2">
                        {availableTags.map((t) => (<Badge key={t} onClick={() => toggleTag(t)} className={`cursor-pointer ${tags.includes(t) ? "bg-primary text-primary-foreground" : "bg-foreground/10 text-foreground"}`}>
                            #{t}
                          </Badge>))}
                      </div>
                    </ScrollArea>
                    {tags.length > 0 && (<div className="text-xs text-foreground/70">
                        Active tags:{" "}
                        {tags.map((t, i) => (<span key={t}>
                            {t}
                            {i < tags.length - 1 ? ", " : ""}
                          </span>))}
                      </div>)}
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={reload} disabled={loading} className="gap-2">
                    <Search className="h-4 w-4"/> Apply
                  </Button>
                  <Button variant="outline" onClick={() => {
            setQ("");
            setType("all");
            setCategory("all");
            setLanguage("all");
            setTags([]);
            setMinDur("");
            setMaxDur("");
            void reload();
        }} className="gap-2" disabled={loading}>
                    <Filter className="h-4 w-4"/> Clear
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recommended */}
            {lastCategory && recommended.length > 0 && (<Card className="glass-card mb-6 border-secondary/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bookmark className="h-5 w-5 text-secondary"/> Recommended for you
                  </CardTitle>
                  <CardDescription>Based on your recent conversation context: {lastCategory}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResourceGrid items={recommended}/>
                </CardContent>
              </Card>)}

            {/* Results */}
            <Tabs defaultValue="all" className="w-full">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="video" className="gap-2">
                  <Video className="h-4 w-4"/> Videos
                </TabsTrigger>
                <TabsTrigger value="article" className="gap-2">
                  <FileText className="h-4 w-4"/> Articles
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle>Results</CardTitle>
                    <CardDescription>
                      {loading ? "Loading..." : `${resources.length} resource${resources.length !== 1 ? "s" : ""} found`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResourceGrid items={resources}/>
                  </CardContent>
                </Card>
              </TabsContent>

              {["video", "article"].map((t) => (<TabsContent key={t} value={t}>
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="capitalize">{t}</CardTitle>
                      <CardDescription>
                        {loading ? "Loading..." : `${resources.filter((r) => r.type === t).length} ${t} resource(s)`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResourceGrid items={resources.filter((r) => r.type === t)}/>
                    </CardContent>
                  </Card>
                </TabsContent>))}
            </Tabs>
          </div>
        </section>
      </main>

      <Footer />
    </div>);
};
function ResourceGrid({ items }) {
    if (items.length === 0) {
        return <p className="text-sm text-foreground/70">No resources found. Try adjusting filters.</p>;
    }
    return (<div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((r) => (<Card key={r.id} className="overflow-hidden glass-card hover:shadow-xl transition-shadow">
          <div className="aspect-video bg-black/5 relative">
            {r.type === "video" ? (
              <VideoEmbed url={r.url} thumbnail={getResourceThumbnail(r)} title={r.title} />
            ) : (
              <ArticleThumbnail resource={r} />
            )}
          </div>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="line-clamp-1">{r.title}</CardTitle>
              <span className="text-xs px-2 py-0.5 rounded-md bg-foreground/10 capitalize">{r.type}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary" className="capitalize">
                {r.category}
              </Badge>
              <Badge className="bg-foreground/10 text-foreground">{r.language}</Badge>
              {typeof r.durationMin === "number" && r.durationMin > 0 && (<Badge className="bg-foreground/10 text-foreground">{r.durationMin} min</Badge>)}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {r.description && <p className="text-sm text-foreground/80 line-clamp-3">{r.description}</p>}
            {r.tags && r.tags.length > 0 && (<div className="flex flex-wrap gap-2">
                {r.tags.slice(0, 6).map((t) => (<Badge key={t} className="bg-foreground/10 text-foreground">
                    #{t}
                  </Badge>))}
              </div>)}
            <div className="flex gap-2">
              <Button asChild variant="outline" className="w-full">
                <a href={r.url} target="_blank" rel="noreferrer">
                  Open Resource
                </a>
              </Button>
              {r.type === "article" && r.url.toLowerCase().endsWith(".pdf") && (<Button asChild variant="outline">
                  <a href={r.url} target="_blank" rel="noreferrer" download>
                    Download
                  </a>
                </Button>)}
            </div>
          </CardContent>
        </Card>))}
    </div>);
}
function ArticleThumbnail({ resource }) {
    const thumbnail = getResourceThumbnail(resource);
    const [imageFailed, setImageFailed] = useState(false);
    if (thumbnail && !imageFailed) {
        return (<div className="absolute inset-0 overflow-hidden">
        <img src={thumbnail} alt={resource.title || "Article thumbnail"} loading="lazy" className="h-full w-full object-cover" onError={() => setImageFailed(true)}/>
        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/35 to-transparent"/>
        <div className="absolute bottom-4 left-4 right-4">
          <Badge className="mb-2 border-white/10 bg-background/70 text-foreground backdrop-blur-sm">
            <FileText className="mr-1 h-3.5 w-3.5"/>
            Article
          </Badge>
          <p className="line-clamp-2 text-sm font-bold leading-5 text-white drop-shadow">{resource.category || "Wellness"}</p>
        </div>
      </div>);
    }
    return (<div className={`absolute inset-0 overflow-hidden bg-gradient-to-br ${articleTone(resource.category)}`}>
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/15 blur-2xl"/>
      <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-primary/20 blur-2xl"/>
      <div className="relative flex h-full flex-col justify-between p-5">
        <div className="flex items-center justify-between">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-background/45 text-primary backdrop-blur-sm">
            <FileText className="h-5 w-5"/>
          </span>
          <Badge className="border-white/10 bg-background/55 text-foreground backdrop-blur-sm">Article</Badge>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/65">{resource.category || "Wellness"}</p>
          <h3 className="mt-2 line-clamp-2 text-lg font-bold leading-6 text-foreground">{resource.title}</h3>
        </div>
      </div>
    </div>);
}
function VideoEmbed({ url, thumbnail, title }) {
    const id = getYoutubeId(url);
    if (!id) {
        return (<div className="w-full h-full flex items-center justify-center bg-foreground/5">
        <span className="text-xs text-foreground/70 px-4 text-center">Invalid YouTube URL</span>
      </div>);
    }
    const embed = `https://www.youtube.com/embed/${id}`;
    return (<iframe className="absolute inset-0 w-full h-full" src={embed} title={title || "YouTube video"} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen style={thumbnail ? { backgroundImage: `url(${thumbnail})`, backgroundSize: "cover" } : undefined}/>);
}
export default ResourceHub;
