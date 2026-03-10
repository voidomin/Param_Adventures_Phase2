"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Loader2, Send, Save, Mountain, X } from "lucide-react";
// Custom Social SVGs to avoid Lucide deprecation warnings
const InstagramSVG = () => (
  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" />
  </svg>
);

const YoutubeSVG = () => (
  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

import MediaUploader from "@/components/admin/MediaUploader";
import { ASPECT_RATIOS } from "@/lib/constants/aspect-ratios";

// Lazy-load the editor to avoid SSR issues
const TiptapEditor = dynamic(() => import("@/components/blog/TiptapEditor"), {
  ssr: false,
  loading: () => (
    <div className="border border-border rounded-xl h-[350px] flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  ),
});

interface ConfirmedExperience {
  id: string;
  title: string;
  slug: string;
  location: string;
}

const EMPTY_DOC = { type: "doc", content: [] };

export default function WriteBlogPage() {
  const router = useRouter();
  const [experiences, setExperiences] = useState<ConfirmedExperience[]>([]);
  const [isLoadingExp, setIsLoadingExp] = useState(true);
  const [selectedExp, setSelectedExp] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState<object>(EMPTY_DOC);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [blogId, setBlogId] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [theme, setTheme] = useState("CLASSIC");
  const [socials, setSocials] = useState({
    instagram: "",
    twitter: "",
    youtube: "",
  });

  // Fetch confirmed experiences eligible for blogging
  useEffect(() => {
    fetch("/api/user/blogs/eligible-experiences")
      .then((r) => {
        if (r.status === 401) {
          router.push("/login?redirect=/dashboard/blog/write");
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data?.experiences) setExperiences(data.experiences);
      })
      .finally(() => setIsLoadingExp(false));
  }, [router]);

  const handleSaveDraft = async () => {
    setError("");
    if (!selectedExp) {
      setError("Please select an experience first.");
      return;
    }
    if (!title.trim()) {
      setError("Please enter a title.");
      return;
    }
    setIsSaving(true);
    try {
      if (blogId === null) {
        // Create new blog
        const res = await fetch("/api/user/blogs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            experienceId: selectedExp,
            title,
            coverImageUrl,
            theme,
            authorSocials: socials,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error);
          return;
        }
        setBlogId(data.blog.id);
        // Save content
        await fetch(`/api/user/blogs/${data.blog.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
        await fetch(`/api/user/blogs/${blogId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            content,
            coverImageUrl,
            theme,
            authorSocials: socials,
          }),
        });
      }
      setSavedAt(new Date().toLocaleTimeString("en-IN"));
    } catch {
      setError("Failed to save draft.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    // Save draft first
    await handleSaveDraft();
    if (error || !blogId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/user/blogs/${blogId}/submit`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      router.push("/dashboard/blog?submitted=1");
    } catch {
      setError("Failed to submit blog.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingExp) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (experiences.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 pt-32 text-center">
          <Mountain className="w-14 h-14 text-foreground/20 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-3">
            No Eligible Experiences
          </h1>
          <p className="text-foreground/50 text-sm">
            You need a <strong>confirmed booking</strong> for an experience
            before you can write about it. Once you have attended a trip, come
            back here to share your story!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-3xl mx-auto px-4 pt-28">
        <div className="mb-8">
          <h1 className="text-3xl font-heading font-black text-foreground">
            Write a Blog
          </h1>
          <p className="text-foreground/50 mt-1">
            Share your adventure with the world
          </p>
        </div>

        <div className="space-y-6">
          {/* Experience Selector */}
          <div>
            <label
              htmlFor="experience"
              className="block text-sm font-semibold text-foreground/70 mb-2"
            >
              Which adventure are you writing about?
            </label>
            <select
              id="experience"
              value={selectedExp}
              onChange={(e) => {
                setSelectedExp(e.target.value);
                setBlogId(null);
              }}
              className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Select an experience…</option>
              {experiences.map((exp) => (
                <option key={exp.id} value={exp.id}>
                  {exp.title} — {exp.location}
                </option>
              ))}
            </select>
          </div>

          {/* Theme Selector */}
          <div id="story-theme-group">
            <label
              htmlFor="story-theme-group"
              className="block text-sm font-semibold text-foreground/70 mb-2"
            >
              Story Theme
            </label>
            <div className="flex items-center gap-3">
              {["CLASSIC", "MODERN", "MINIMAL"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(t)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold border-2 transition-all ${
                    theme === t
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-foreground/50 hover:border-foreground/20"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Cover Image */}
          <div>
            <label
              htmlFor="blog-cover-upload"
              className="block text-sm font-semibold text-foreground/70 mb-2"
            >
              Hero Cover Image
            </label>
            {coverImageUrl ? (
              <div className="relative w-full aspect-[21/9] rounded-2xl overflow-hidden group">
                <img
                  src={coverImageUrl}
                  alt="Cover"
                  className="object-cover w-full h-full"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => setCoverImageUrl("")}
                    className="bg-background text-foreground px-4 py-2 rounded-xl text-sm font-bold"
                  >
                    Change Image
                  </button>
                </div>
              </div>
            ) : (
              <MediaUploader
                id="blog-cover-upload"
                apiPrefix="/api/user/media"
                shouldCrop={true}
                aspectRatio={ASPECT_RATIOS.BLOG_CARD}
                onUploadSuccess={(urls?: string[]) => {
                  if (urls && urls[0]) setCoverImageUrl(urls[0]);
                }}
              />
            )}
          </div>

          {/* Title */}
          <div>
            <label
              htmlFor="blog-title"
              className="block text-sm font-semibold text-foreground/70 mb-2"
            >
              Blog Title
            </label>
            <input
              id="blog-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. My Trek to Kedarnath — A Life-Changing Journey"
              className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Editor */}
          <div>
            <label
              htmlFor="blog-writer-content"
              className="block text-sm font-semibold text-foreground/70 mb-2"
            >
              Your Story
            </label>
            <div id="blog-writer-content">
              <TiptapEditor
                content={content}
                onChange={setContent}
                placeholder="Describe your experience in vivid detail — the views, the people, the emotions…"
              />
            </div>
          </div>

          {/* Socials */}
          <div className="p-6 border border-border rounded-2xl bg-foreground/[0.02]">
            <h3 className="font-bold text-foreground mb-4">
              Author Profile Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="instagram-url"
                  className="text-xs font-semibold text-foreground/60 mb-1 flex items-center gap-1"
                >
                  <InstagramSVG /> Instagram URL
                </label>
                <input
                  id="instagram-url"
                  type="text"
                  value={socials.instagram}
                  onChange={(e) =>
                    setSocials({ ...socials, instagram: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg"
                  placeholder="https://instagram.com/..."
                />
              </div>
              <div>
                <label
                  htmlFor="twitter-url"
                  className="text-xs font-semibold text-foreground/60 mb-1 flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Twitter/X URL
                </label>
                <input
                  id="twitter-url"
                  type="text"
                  value={socials.twitter}
                  onChange={(e) =>
                    setSocials({ ...socials, twitter: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg"
                  placeholder="https://x.com/..."
                />
              </div>
              <div>
                <label
                  htmlFor="youtube-url"
                  className="text-xs font-semibold text-foreground/60 mb-1 flex items-center gap-1"
                >
                  <YoutubeSVG /> YouTube URL
                </label>
                <input
                  id="youtube-url"
                  type="text"
                  value={socials.youtube}
                  onChange={(e) =>
                    setSocials({ ...socials, youtube: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg"
                  placeholder="https://youtube.com/..."
                />
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-500 text-sm bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={handleSaveDraft}
              disabled={isSaving || isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 border border-border rounded-xl text-foreground/70 font-semibold hover:bg-foreground/5 transition-colors disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Draft
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSaving || isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg shadow-primary/25"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Submit for Review
            </button>
            {savedAt && (
              <p className="text-xs text-foreground/30 ml-auto">
                Saved at {savedAt}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
