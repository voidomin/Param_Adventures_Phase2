"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Loader2, Send, Save, AlertTriangle } from "lucide-react";

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
}

export default function EditBlogPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [blog, setBlog] = useState<Blog | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState<object>({ type: "doc", content: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);

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
      })
      .finally(() => setIsLoading(false));
  }, [id, router]);

  const handleSave = async () => {
    setError("");
    setIsSaving(true);
    try {
      const res = await fetch(`/api/user/blogs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error);
        return;
      }
      setSavedAt(new Date().toLocaleTimeString("en-IN"));
    } catch {
      setError("Failed to save.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    await handleSave();
    if (error) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/user/blogs/${id}/submit`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
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

          {error && (
            <p className="text-red-500 text-sm bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl">
              {error}
            </p>
          )}

          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={handleSave}
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
              onClick={handleSubmit}
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
    </div>
  );
}
