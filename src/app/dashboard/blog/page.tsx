"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  PenLine,
  CheckCircle,
  Clock,
  Trash2,
  Edit3,
  AlertTriangle,
  BookOpen,
  Loader2,
  ArrowRight,
  Mountain,
} from "lucide-react";

interface Blog {
  id: string;
  title: string;
  slug: string;
  status: "DRAFT" | "PENDING_REVIEW" | "PUBLISHED";
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  experience: { id: string; title: string; slug: string } | null;
}

function statusBadge(status: Blog["status"]) {
  const styles = {
    DRAFT: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    PENDING_REVIEW: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    PUBLISHED: "bg-green-500/10 text-green-500 border-green-500/20",
  };
  const icons = {
    DRAFT: <Edit3 className="w-3 h-3" />,
    PENDING_REVIEW: <Clock className="w-3 h-3" />,
    PUBLISHED: <CheckCircle className="w-3 h-3" />,
  };
  const labels = {
    DRAFT: "Draft",
    PENDING_REVIEW: "Pending Review",
    PUBLISHED: "Published",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${styles[status]}`}
    >
      {icons[status]} {labels[status]}
    </span>
  );
}

export default function UserBlogsPage() {
  const router = useRouter();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/user/blogs")
      .then(async (r) => {
        if (r.status === 401) {
          router.push("/login?redirect=/dashboard/blog");
          return null;
        }
        if (!r.ok) {
          console.error("Failed to fetch blogs:", await r.text());
          return null;
        }
        try {
          return await r.json();
        } catch (e) {
          console.error("Invalid JSON response:", e);
          return null;
        }
      })
      .then((data) => {
        if (data?.blogs) setBlogs(data.blogs);
      })
      .finally(() => setIsLoading(false));
  }, [router]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this draft? This cannot be undone.")) return;
    setDeletingId(id);
    await fetch(`/api/user/blogs/${id}`, { method: "DELETE" });
    setBlogs((prev) => prev.filter((b) => b.id !== id));
    setDeletingId(null);
  };

  return (
    <main className="min-h-screen bg-background pb-20">
      <div className="max-w-4xl mx-auto px-4 pt-28">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-heading font-black text-foreground">
              My Blogs
            </h1>
            <p className="text-foreground/50 mt-1">
              Write about the adventures you&apos;ve experienced
            </p>
          </div>
          <Link
            href="/dashboard/blog/write"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-bold hover:scale-[1.02] transition-transform shadow-lg shadow-primary/25"
          >
            <PenLine className="w-4 h-4" /> Write Blog
          </Link>
        </div>

        {isLoading && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && blogs.length === 0 && (
          <div className="text-center py-20 border border-dashed border-border rounded-2xl">
            <Mountain className="w-12 h-12 text-foreground/20 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-foreground/60 mb-2">
              No blogs yet
            </h2>
            <p className="text-foreground/40 text-sm mb-6">
              You can write a blog about any experience you&apos;ve attended.
            </p>
            <Link
              href="/dashboard/blog/write"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-bold hover:scale-[1.02] transition-transform"
            >
              <PenLine className="w-4 h-4" /> Write your first blog
            </Link>
          </div>
        )}

        {!isLoading && blogs.length > 0 && (
          <div className="space-y-4">
            {blogs.map((blog) => (
              <div
                key={blog.id}
                className="bg-card border border-border rounded-2xl p-6 hover:border-primary/30 transition-colors"
              >
                {/* Rejection Banner */}
                {blog.rejectionReason && (
                  <div className="flex items-start gap-3 mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-red-500">
                        Rejected by admin
                      </p>
                      <p className="text-sm text-foreground/60 mt-0.5">
                        {blog.rejectionReason}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      {statusBadge(blog.status)}
                      {blog.experience && (
                        <span className="text-xs text-foreground/50 bg-foreground/5 px-2.5 py-1 rounded-full border border-border">
                          {blog.experience.title}
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg font-bold text-foreground truncate">
                      {blog.title}
                    </h2>
                    <p className="text-sm text-foreground/40 mt-1">
                      Last updated{" "}
                      {new Date(blog.updatedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {blog.status === "PUBLISHED" && (
                      <Link
                        href={`/blog/${blog.slug}`}
                        className="inline-flex items-center gap-1 text-sm text-primary font-bold hover:gap-2 transition-all"
                      >
                        <BookOpen className="w-4 h-4" /> View{" "}
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                    {blog.status === "DRAFT" && (
                      <>
                        <Link
                          href={`/dashboard/blog/${blog.id}/edit`}
                          className="p-2 rounded-lg border border-border text-foreground/60 hover:text-primary hover:border-primary/30 transition-colors"
                          title="Edit draft"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(blog.id)}
                          disabled={deletingId === blog.id}
                          className="p-2 rounded-lg border border-border text-foreground/60 hover:text-red-500 hover:border-red-500/30 transition-colors disabled:opacity-40"
                          title="Delete draft"
                        >
                          {deletingId === blog.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </>
                    )}
                    {blog.status === "PENDING_REVIEW" && (
                      <span className="text-xs text-foreground/40 italic">
                        Waiting for admin review…
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
