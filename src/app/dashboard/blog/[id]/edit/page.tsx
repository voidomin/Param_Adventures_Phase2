"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Loader2, Send, Save, AlertTriangle, Search } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import ReauthModal from "@/components/auth/ReauthModal";


const TiptapEditor = dynamic(() => import("@/components/blog/TiptapEditor"), {
  ssr: false,
  loading: () => (
    <div className="border border-border rounded-xl h-[350px] flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  ),
});

interface Blog {
  id: string;
  title: string;
  content: object;
  status: "DRAFT" | "PENDING_REVIEW" | "PUBLISHED";
  rejectionReason: string | null;
  experience: { id: string; title: string } | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string | null;
  readingTime?: number | null;
}

export default function EditBlogPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { user } = useAuth();

  const [blog, setBlog] = useState<Blog | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState<object>({ type: "doc", content: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [isReauthOpen, setIsReauthOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"SAVE" | "SUBMIT" | null>(null);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [metaKeywords, setMetaKeywords] = useState("");
  const [readingTime, setReadingTime] = useState("");

  useEffect(() => {
    fetch("/api/user/blogs")
      .then((r) => {
        if (r.status === 401) {
          router.push("/login");
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        const found = data.blogs.find((b: Blog) => b.id === id);
        if (!found) {
          router.push("/dashboard/blog");
          return;
        }
        setBlog(found);
        setTitle(found.title);
        setContent(found.content as object);
        setMetaTitle(found.metaTitle ?? "");
        setMetaDescription(found.metaDescription ?? "");
        setMetaKeywords(found.metaKeywords ?? "");
        setReadingTime(found.readingTime ? String(found.readingTime) : "");
      })
      .finally(() => setIsLoading(false));
  }, [id, router]);

  const handleSave = async (): Promise<boolean> => {
    setError("");
    setIsSaving(true);
    try {
      const res = await fetch(`/api/user/blogs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          metaTitle: metaTitle || null,
          metaDescription: metaDescription || null,
          metaKeywords: metaKeywords || null,
          readingTime: readingTime ? Number(readingTime) : null,
        }),
      });
      if (!res.ok) {
        if (res.status === 401) {
          setIsReauthOpen(true);
          return false;
        }
        const d = await res.json();
        setError(d.error);
        return false;
      }
      setSavedAt(new Date().toLocaleTimeString("en-IN"));
      return true;
    } catch {
      setError("Failed to save.");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const executeReauthSuccess = () => {
    setIsReauthOpen(false);
    if (pendingAction === "SAVE") {
      handleSave();
    } else if (pendingAction === "SUBMIT") {
      handleSubmit();
    }
    setPendingAction(null);
  };

  const onSaveClick = () => {
    setPendingAction("SAVE");
    handleSave();
  };

  const onSubmitClick = () => {
    setPendingAction("SUBMIT");
    handleSubmit();
  };

  const handleSubmit = async () => {
    const saved = await handleSave();
    if (!saved) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/user/blogs/${id}/submit`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setIsReauthOpen(true);
          return;
        }
        setError(data.error);
        return;
      }
      router.push("/dashboard/blog?submitted=1");
    } catch {
      setError("Failed to submit.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading)
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );

  if (!blog) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-3xl mx-auto px-4 pt-28">
        <div className="mb-8">
          <h1 className="text-3xl font-heading font-black text-foreground">
            Edit Blog
          </h1>
          {blog.experience && (
            <p className="text-foreground/50 mt-1">
              About: <strong>{blog.experience.title}</strong>
            </p>
          )}
        </div>

        {/* Rejection Banner */}
        {blog.rejectionReason && (
          <div className="flex items-start gap-3 mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-500">Admin rejected this blog</p>
              <p className="text-sm text-foreground/60 mt-1">
                {blog.rejectionReason}
              </p>
              <p className="text-xs text-foreground/40 mt-2">
                Make your changes and re-submit for review.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label
              htmlFor="edit-title"
              className="block text-sm font-semibold text-foreground/70 mb-2"
            >
              Title
            </label>
            <input
              id="edit-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label
              htmlFor="blog-content-editor"
              className="block text-sm font-semibold text-foreground/70 mb-2"
            >
              Content
            </label>
            <div id="blog-content-editor">
              <TiptapEditor content={content} onChange={setContent} />
            </div>
          </div>

          {/* SEO Settings */}
          <div className="p-6 border border-border rounded-2xl bg-foreground/[0.02] space-y-4 text-left">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <Search className="w-4 h-4 text-primary" /> SEO Settings
              </h3>
              <div className="flex items-center gap-2 bg-background border border-border px-3 py-1.5 rounded-xl">
                <input
                  type="number"
                  min="1"
                  value={readingTime}
                  onChange={(e) => setReadingTime(e.target.value)}
                  className="w-12 bg-transparent text-center font-bold text-sm text-foreground focus:outline-none"
                  placeholder="5"
                />
                <span className="text-xs text-foreground/50 font-semibold">min read</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="seo-meta-title" className="block text-xs font-semibold text-foreground/60 mb-1">
                  Meta Title
                </label>
                <input
                  id="seo-meta-title"
                  type="text"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg placeholder:text-foreground/30 focus:outline-none focus:ring-1 focus:ring-primary/50"
                  placeholder="SEO meta title"
                  maxLength={120}
                />
                <p className="text-[10px] text-foreground/40 text-right mt-1">
                  {metaTitle.length} characters
                </p>
              </div>

              <div>
                <label htmlFor="seo-meta-description" className="block text-xs font-semibold text-foreground/60 mb-1">
                  Meta Description
                </label>
                <textarea
                  id="seo-meta-description"
                  rows={3}
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg placeholder:text-foreground/30 focus:outline-none focus:ring-1 focus:ring-primary/50"
                  placeholder="SEO meta description"
                  maxLength={300}
                />
                <p className="text-[10px] text-foreground/40 text-right mt-1">
                  {metaDescription.length} characters
                </p>
              </div>

              <div>
                <label htmlFor="seo-meta-keywords" className="block text-xs font-semibold text-foreground/60 mb-1">
                  Meta Keywords
                </label>
                <input
                  id="seo-meta-keywords"
                  type="text"
                  value={metaKeywords}
                  onChange={(e) => setMetaKeywords(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg placeholder:text-foreground/30 focus:outline-none focus:ring-1 focus:ring-primary/50"
                  placeholder="e.g. personal loan, EMI tips, CIBIL score"
                />
                <p className="text-[10px] text-foreground/40 mt-1">
                  Separate with commas — For search engines
                </p>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-sm bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl">
              {error}
            </p>
          )}

          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={onSaveClick}
              disabled={isSaving || blog.status !== "DRAFT"}
              className="flex items-center gap-2 px-5 py-2.5 border border-border rounded-xl text-foreground/70 font-semibold hover:bg-foreground/5 transition-colors disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}{" "}
              Save Draft
            </button>
            <button
              onClick={onSubmitClick}
              disabled={isSaving || isSubmitting || blog.status !== "DRAFT"}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg shadow-primary/25"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}{" "}
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
      <ReauthModal
        isOpen={isReauthOpen}
        onClose={() => {
          setIsReauthOpen(false);
          setPendingAction(null);
        }}
        onSuccess={executeReauthSuccess}
        email={user?.email || ""}
      />
    </div>
  );
}
