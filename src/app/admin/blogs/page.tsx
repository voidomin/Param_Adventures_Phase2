"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import {
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  User,
  Mountain,
  Search,
} from "lucide-react";

interface Blog {
  id: string;
  title: string;
  slug: string;
  status: "DRAFT" | "PENDING_REVIEW" | "PUBLISHED";
  rejectionReason: string | null;
  updatedAt: string;
  author: { id: string; name: string; email: string; avatarUrl: string | null };
  experience: { id: string; title: string; slug: string } | null;
}

const STATUS_OPTIONS = ["ALL", "PENDING_REVIEW", "PUBLISHED", "DRAFT"] as const;

function RejectModal({
  blogId,
  onClose,
  onDone,
}: Readonly<{
  blogId: string;
  onClose: () => void;
  onDone: () => void;
}>) {
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleReject = async () => {
    if (!reason.trim()) {
      setError("Rejection reason is required.");
      return;
    }
    setIsLoading(true);
    const res = await fetch(`/api/admin/blogs/${blogId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject", rejectionReason: reason }),
    });
    if (res.ok) {
      onDone();
    } else {
      const d = await res.json();
      setError(d.error);
    }
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="text-lg font-bold text-foreground mb-1">Reject Blog</h3>
        <p className="text-sm text-foreground/50 mb-4">
          This will be shown to the author so they can improve their blog.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. The content is too short. Please add more detail about your experience."
          rows={4}
          className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none"
        />
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-border rounded-xl text-foreground/60 hover:bg-foreground/5 transition-colors text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleReject}
            disabled={isLoading}
            className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors text-sm disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
            ) : (
              "Reject & Notify Author"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminBlogsPage() {
  const router = useRouter();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_OPTIONS)[number]>("PENDING_REVIEW");
  const [isLoading, setIsLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingBlog, setRejectingBlog] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchBlogs = async (status: string) => {
    setIsLoading(true);
    const q = status === "ALL" ? "" : `?status=${status}`;
    const res = await fetch(`/api/admin/blogs${q}`);
    if (res.status === 401 || res.status === 403) {
      router.push("/login");
      return;
    }
    const data = await res.json();
    setBlogs(data.blogs ?? []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchBlogs(statusFilter);
  }, [statusFilter]); // eslint-disable-line

  const handleApprove = async (id: string) => {
    setApprovingId(id);
    await fetch(`/api/admin/blogs/${id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    });
    setBlogs((prev) => prev.filter((b) => b.id !== id));
    setApprovingId(null);
  };

  const filtered = blogs.filter(
    (b) =>
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.author.name.toLowerCase().includes(search.toLowerCase()),
  );

  const counts = {
    PENDING_REVIEW: blogs.filter((b) => b.status === "PENDING_REVIEW").length,
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-heading font-black text-foreground">
            Blog Moderation
          </h1>
          <p className="text-foreground/50 mt-1">
            Review and approve user-submitted adventure blogs
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex gap-2 flex-wrap">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors border ${
                  statusFilter === s
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-foreground/60 hover:text-foreground hover:bg-foreground/5"
                }`}
              >
                {s === "PENDING_REVIEW"
                  ? `Pending${counts.PENDING_REVIEW > 0 ? ` (${counts.PENDING_REVIEW})` : ""}`
                  : s.replace("_", " ")}
              </button>
            ))}
          </div>
          <div className="relative sm:ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title or author…"
              className="pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 w-60"
            />
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-2xl">
            <Mountain className="w-10 h-10 text-foreground/20 mx-auto mb-3" />
            <p className="text-foreground/40">No blogs found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((blog) => (
              <div
                key={blog.id}
                className="bg-card border border-border rounded-2xl p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        blog.status === "PUBLISHED"
                          ? "bg-green-500/10 text-green-500 border-green-500/20"
                          : blog.status === "PENDING_REVIEW"
                            ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                            : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                      }`}
                    >
                      {blog.status === "PUBLISHED" ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : blog.status === "PENDING_REVIEW" ? (
                        <Clock className="w-3 h-3" />
                      ) : null}
                      {blog.status.replace("_", " ")}
                    </span>
                    {blog.experience && (
                      <span className="text-xs bg-foreground/5 border border-border px-2.5 py-0.5 rounded-full text-foreground/50">
                        {blog.experience.title}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-foreground truncate">
                    {blog.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-sm text-foreground/40">
                    <User className="w-3.5 h-3.5" />
                    <span>{blog.author.name}</span>
                    <span>·</span>
                    <span>
                      {new Date(blog.updatedAt).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                </div>

                {blog.status === "PENDING_REVIEW" && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleApprove(blog.id)}
                      disabled={approvingId === blog.id}
                      className="flex items-center gap-1.5 px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-bold hover:bg-green-600 transition-colors disabled:opacity-50"
                    >
                      {approvingId === blog.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle className="w-3.5 h-3.5" />
                      )}
                      Approve
                    </button>
                    <button
                      onClick={() => setRejectingBlog(blog.id)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-sm font-bold hover:bg-red-500/20 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {rejectingBlog && (
        <RejectModal
          blogId={rejectingBlog}
          onClose={() => setRejectingBlog(null)}
          onDone={() => {
            setRejectingBlog(null);
            setBlogs((prev) => prev.filter((b) => b.id !== rejectingBlog));
          }}
        />
      )}
    </div>
  );
}
