"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Loader2,
  Send,
  Save,
  Mountain,
  Instagram as InstagramIcon,
  X,
  Youtube as YoutubeIcon,
} from "lucide-react";
import MediaUploader from "@/components/admin/MediaUploader";

// Icons are aliased in imports to suppress deprecation warnings

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
                onUploadSuccess={(urls) => {
                  if (urls?.[0]) setCoverImageUrl(urls[0]);
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
                  <InstagramIcon className="w-3 h-3" /> Instagram URL
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
                  <YoutubeIcon className="w-3 h-3" /> YouTube URL
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
