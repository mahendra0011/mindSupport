import { useEffect, useMemo, useRef, useState } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { AlertTriangle, Flag, MessageCircle, Plus, ThumbsDown, ThumbsUp, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/lib/api";
const CATEGORIES = ["General Wellness", "Exam Stress", "Sleep Issues", "Burnout", "Coping Strategies"];
const emergencyKeywords = ["suicide", "self-harm", "panic attack", "abuse"];
const hasEmergencyLanguage = (text) => emergencyKeywords.some((keyword) => String(text || "").toLowerCase().includes(keyword));
async function api(path, init) {
    return apiFetch(path, init);
}
async function listPosts(category) {
    const q = category && category !== "All" ? `?category=${encodeURIComponent(category)}` : "";
    return api(`/api/peer/posts${q}`);
}
async function createPost(params) {
    return api(`/api/peer/posts`, { method: "POST", body: JSON.stringify(params) });
}
async function votePost(id, direction) {
    return api(`/api/peer/posts/${encodeURIComponent(id)}/vote`, {
        method: "POST",
        body: JSON.stringify({ direction }),
    });
}
async function listComments(postId) {
    return api(`/api/peer/comments?postId=${encodeURIComponent(postId)}`);
}
async function createComment(params) {
    return api(`/api/peer/comments`, { method: "POST", body: JSON.stringify(params) });
}
async function reportContent(params) {
    return api(`/api/peer/reports`, { method: "POST", body: JSON.stringify(params) });
}
function getOrCreateAnonUID() {
    const key = "peer_anon_uid";
    const existing = localStorage.getItem(key);
    if (existing)
        return existing;
    const uid = `anon_${Math.random().toString(36).slice(2)}${Date.now()}`;
    localStorage.setItem(key, uid);
    return uid;
}
function aliasFromUID(uid) {
    const animals = ["Panda", "Koala", "Sparrow", "Dolphin", "Otter", "Robin", "Fox", "Penguin", "Orchid", "Lotus"];
    const colors = ["Blue", "Green", "Amber", "Violet", "Teal", "Coral", "Indigo", "Rose", "Cyan", "Lime"];
    let seed = 0;
    for (let i = 0; i < uid.length; i++)
        seed = (seed * 31 + uid.charCodeAt(i)) % 100000;
    const animal = animals[seed % animals.length];
    const color = colors[(seed >> 4) % colors.length];
    const num = (seed % 9000) + 1000;
    return `${color} ${animal} #${num}`;
}
const PeerSupport = () => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [activeCategory, setActiveCategory] = useState("All");
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(false);
    // Author identity (anonymous)
    const uid = useMemo(() => getOrCreateAnonUID(), []);
    const alias = useMemo(() => aliasFromUID(uid), [uid]);
    // New post state
    const [postContent, setPostContent] = useState("");
    const postContentRef = useRef(null);
    // Comments state per selected post
    const [selectedPost, setSelectedPost] = useState(null);
    const [comments, setComments] = useState([]);
    const [commentContent, setCommentContent] = useState("");
    // Polling for realtime-like updates
    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                const list = await listPosts(activeCategory === "All" ? undefined : activeCategory);
                if (!cancelled) {
                    setPosts(list);
                    // If a post is open, refresh its comments too
                    if (selectedPost) {
                        const fresh = list.find((p) => p.id === selectedPost.id);
                        if (!fresh) {
                            setSelectedPost(null);
                            setComments([]);
                        }
                        else {
                            const cs = await listComments(selectedPost.id);
                            if (!cancelled)
                                setComments(cs);
                        }
                    }
                }
            }
            catch (e) {
                // ignore polling errors
                console.error(e);
            }
        }
        // initial and interval polling
        void load();
        const iv = setInterval(load, 2000);
        return () => {
            cancelled = true;
            clearInterval(iv);
        };
    }, [activeCategory, selectedPost]);
    async function reloadPosts() {
        setLoading(true);
        try {
            const list = await listPosts(activeCategory === "All" ? undefined : activeCategory);
            setPosts(list);
        }
        catch (e) {
            toast({ variant: "destructive", title: "Failed to load posts", description: e?.message || "" });
        }
        finally {
            setLoading(false);
        }
    }
    async function submitPost() {
        const content = postContent.trim();
        if (!content) {
            toast({ title: "Write something to share.", variant: "destructive" });
            return;
        }
        setLoading(true);
        try {
            await createPost({ author_uid: uid, alias, category: (activeCategory === "All" ? "General Wellness" : activeCategory), content });
            setPostContent("");
            postContentRef.current?.focus();
            await reloadPosts();
            toast({ title: "Posted successfully" });
        }
        catch (e) {
            toast({ title: "Post failed", description: e?.message || "", variant: "destructive" });
        }
        finally {
            setLoading(false);
        }
    }
    async function openPost(p) {
        setSelectedPost(p);
        try {
            const cs = await listComments(p.id);
            setComments(cs);
        }
        catch (e) {
            toast({ title: "Failed to load comments", description: e?.message || "", variant: "destructive" });
        }
    }
    async function submitComment() {
        if (!selectedPost)
            return;
        const content = commentContent.trim();
        if (!content)
            return;
        setLoading(true);
        try {
            await createComment({ post_id: selectedPost.id, author_uid: uid, alias, content });
            setCommentContent("");
            const cs = await listComments(selectedPost.id);
            setComments(cs);
            await reloadPosts();
        }
        catch (e) {
            toast({ title: "Comment failed", description: e?.message || "", variant: "destructive" });
        }
        finally {
            setLoading(false);
        }
    }
    async function vote(p, dir) {
        try {
            await votePost(p.id, dir);
            await reloadPosts();
        }
        catch (e) {
            toast({ title: "Vote failed", description: e?.message || "", variant: "destructive" });
        }
    }
    async function report(p, c) {
        const reason = prompt("Report reason (optional):") || "Inappropriate / harmful content";
        try {
            await reportContent({
                reporter_uid: uid,
                reason,
                post_id: p?.id,
                comment_id: c?.id,
            });
            toast({ title: "Reported for review" });
        }
        catch (e) {
            toast({ title: "Report failed", description: e?.message || "", variant: "destructive" });
        }
    }
    return (<div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-16">
        <section className="py-6 md:py-8 lg:py-10 bg-gradient-to-br from-primary/8 via-background via-secondary/8 to-accent/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight flex items-center gap-3">
                  <MessageCircle className="h-8 w-8 text-primary"/>
                  Peer Support Platform
                </h1>
                <p className="text-foreground/70 mt-2">
                  Share experiences, ask for tips, and support each other. Your identity is private. This is a safe,
                  moderated space.
                </p>
              </div>
              <div className="text-right flex items-center gap-4">
                <Button variant="outline" className="gap-2" onClick={() => navigate("/")}>
                  Home
                </Button>
                <div>
                  <div className="text-xs text-foreground/60">Your anonymous alias</div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-foreground/5">
                    <User className="h-4 w-4"/>
                    <span className="font-semibold">{alias}</span>
                  </div>
                </div>
              </div>
            </div>

            <Tabs defaultValue="All" value={activeCategory} onValueChange={(v) => setActiveCategory(v)}>
              <TabsList className="flex flex-wrap gap-2">
                <TabsTrigger value="All">All</TabsTrigger>
                {CATEGORIES.map((c) => (<TabsTrigger key={c} value={c}>
                    {c}
                  </TabsTrigger>))}
              </TabsList>

              <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_minmax(360px,420px)] gap-6 mt-6">
                {/* Posts column */}
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageCircle className="h-5 w-5 text-primary"/> Discussions
                    </CardTitle>
                    <CardDescription>Browse posts and join the conversation</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[62vh]">
                      <div className="space-y-4 pr-2">
                        {posts.length === 0 ? (<p className="text-sm text-foreground/60">No posts yet in this category.</p>) : (posts.map((p) => (<div key={p.id} className="p-4 rounded-xl border border-glass-border/50 bg-background/70 hover:bg-background/90 transition">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary">{p.category}</Badge>
                                  <span className="text-xs text-foreground/60">
                                    {new Date(p.created_at).toLocaleString()}
                                  </span>
                                </div>
                                <div className="text-xs text-foreground/60">by {p.alias}</div>
                              </div>

                              {p.crisis && (<div className="mt-2 px-3 py-2 rounded-lg bg-amber-100/60 dark:bg-amber-900/20 border border-amber-300/60 dark:border-amber-800/60 text-amber-800 dark:text-amber-200 flex items-center gap-2">
                                  <AlertTriangle className="h-4 w-4"/>
                                  <span>{p.crisisMessage || "If you’re in crisis, please reach out to a helpline. You are not alone."}</span>
                                </div>)}

                              <p className="mt-3 text-sm whitespace-pre-wrap">{p.content}</p>

                              <div className="mt-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Button size="sm" variant="outline" className="gap-1" onClick={() => vote(p, "up")}>
                                    <ThumbsUp className="h-4 w-4"/>
                                    <span className="text-xs">{p.up}</span>
                                  </Button>
                                  <Button size="sm" variant="outline" className="gap-1" onClick={() => vote(p, "down")}>
                                    <ThumbsDown className="h-4 w-4"/>
                                    <span className="text-xs">{p.down}</span>
                                  </Button>
                                  <Button size="sm" variant="outline" className="gap-1" onClick={() => openPost(p)}>
                                    <MessageCircle className="h-4 w-4"/>
                                    <span className="text-xs">{p.commentCount ?? 0}</span>
                                  </Button>
                                </div>
                                <Button size="sm" variant="outline" className="gap-1" onClick={() => report(p, undefined)}>
                                  <Flag className="h-4 w-4"/>
                                  <span className="text-xs">Report</span>
                                </Button>
                              </div>

                              {/* Comments viewer (inline if this is the selected post) */}
                              {selectedPost?.id === p.id && (<div className="mt-4 rounded-lg border border-glass-border/50 p-3">
                                  <div className="text-sm font-semibold mb-2">Comments</div>
                                  <div className="space-y-3">
                                    {comments.length === 0 ? (<p className="text-xs text-foreground/60">No comments yet. Be the first to reply.</p>) : (comments.map((c) => (<div key={c.id} className="p-2 rounded-lg bg-foreground/5">
                                          <div className="flex items-center justify-between">
                                            <div className="text-xs font-semibold">{c.alias}</div>
                                            <div className="text-[10px] text-foreground/60">
                                              {new Date(c.created_at).toLocaleString()}
                                            </div>
                                          </div>
                                          {c.crisis && (<div className="mt-1 px-2 py-1 rounded bg-amber-100/60 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-1">
                                              <AlertTriangle className="h-3 w-3"/>
                                              <span>{c.crisisMessage || "If you’re in crisis, please reach out to a helpline."}</span>
                                            </div>)}
                                          <div className="text-sm mt-1 whitespace-pre-wrap">{c.content}</div>
                                          <div className="flex justify-end mt-1">
                                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={() => report(undefined, c)}>
                                              <Flag className="h-3 w-3"/> Report
                                            </Button>
                                          </div>
                                        </div>)))}
                                  </div>
                                  <div className="mt-3 flex gap-2">
                                    <Input value={commentContent} onChange={(e) => setCommentContent(e.target.value)} placeholder="Write a supportive reply..."/>
                                    <Button size="sm" onClick={submitComment} disabled={loading || !commentContent.trim()}>
                                      Reply
                                    </Button>
                                  </div>
                                  {hasEmergencyLanguage(commentContent) && (
                                    <div className="mt-2 rounded-lg bg-red-50 border border-red-200 p-2 text-xs text-red-800">
                                      Urgent support options: local emergency services, 1800-599-0019 in India, or 988 where available.
                                    </div>
                                  )}
                                </div>)}
                            </div>)))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* New Post panel */}
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Plus className="h-5 w-5 text-primary"/> Create a Post
                    </CardTitle>
                    <CardDescription>Your identity remains anonymous to other users.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-xs text-foreground/60">
                      Posting as: <span className="font-semibold">{alias}</span>
                    </div>
                    <Textarea ref={postContentRef} rows={8} value={postContent} onChange={(e) => setPostContent(e.target.value)} placeholder={`Share what's on your mind in ${activeCategory === "All" ? "General Wellness" : activeCategory}...`} className="resize-none"/>
                    {hasEmergencyLanguage(postContent) && (
                      <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
                        Urgent support options: call local emergency services, 1800-599-0019 in India, or 988 where available.
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-foreground/60">
                        Category: <Badge variant="secondary">{activeCategory === "All" ? "General Wellness" : activeCategory}</Badge>
                      </div>
                      <Button onClick={submitPost} disabled={loading || !postContent.trim()}>
                        Post
                      </Button>
                    </div>
                    <div className="text-[11px] text-foreground/60">
                      Safety note: If your post mentions crisis terms, we will show a helpline notice and alert moderators to keep everyone safe.
                    </div>
                  </CardContent>
                </Card>
              </div>
            </Tabs>
          </div>
        </section>
      </main>

      <Footer />
    </div>);
};
export default PeerSupport;
