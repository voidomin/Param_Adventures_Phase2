"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";

interface StoryBlock {
  id: string;
  type: string;
  title: string;
  subtitle: string | null;
  body: string | null;
  imageUrl: string | null;
  stat: string | null;
  order: number;
  isActive: boolean;
}

const BLOCK_TYPES = [
  { value: "hero", label: "Hero — Full-screen page opener" },
  { value: "milestone", label: "Milestone — Timeline entry with image" },
  { value: "value", label: "Value — Core value card" },
  { value: "team", label: "Team — Team member or group" },
  { value: "cta", label: "CTA — Call-to-action closer" },
];

export default function StoryBlockForm({
  block,
  onClose,
  onSuccess,
  nextOrder,
}: Readonly<{
  block: StoryBlock | null;
  onClose: () => void;
  onSuccess: () => void;
  nextOrder: number;
}>) {
  const isEditing = !!block;

  const [type, setType] = useState(block?.type || "milestone");
  const [title, setTitle] = useState(block?.title || "");
  const [subtitle, setSubtitle] = useState(block?.subtitle || "");
  const [body, setBody] = useState(block?.body || "");
  const [imageUrl, setImageUrl] = useState(block?.imageUrl || "");
  const [stat, setStat] = useState(block?.stat || "");
  const [order, setOrder] = useState(block?.order ?? nextOrder);
  const [isActive, setIsActive] = useState(block?.isActive ?? true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const payload = {
      type,
      title: title.trim(),
      subtitle: subtitle.trim() || null,
      body: body.trim() || null,
      imageUrl: imageUrl.trim() || null,
      stat: stat.trim() || null,
      order,
      isActive,
    };

    try {
      const url = isEditing
        ? `/api/admin/story/${block.id}`
        : "/api/admin/story";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save.");
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

    const buttonContent = loading ? (
      <Loader2 className="w-5 h-5 animate-spin" />
    ) : isEditing ? (
      "Save Changes"
    ) : (
      "Create Block"
    );

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card z-10 rounded-t-2xl">
            <h2 className="text-xl font-heading font-bold">
              {isEditing ? "Edit Block" : "New Story Block"}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-foreground/5 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
  
          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="bg-red-500/10 text-red-500 p-3 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}
  
            {/* Type */}
            <div className="space-y-1.5">
              <label htmlFor="sb-type" className="text-sm font-bold block">
                Block Type
              </label>
              <select
                id="sb-type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground font-medium"
              >
                {BLOCK_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
  
            {/* Title */}
            <div className="space-y-1.5">
              <label htmlFor="sb-title" className="text-sm font-bold block">
                Title *
              </label>
              <input
                id="sb-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="e.g. Born from the Mountains"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium text-foreground"
              />
            </div>
  
            {/* Subtitle */}
            <div className="space-y-1.5">
              <label htmlFor="sb-subtitle" className="text-sm font-bold block">
                Subtitle
              </label>
              <input
                id="sb-subtitle"
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="A brief tagline or summary"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium text-foreground"
              />
            </div>
  
            {/* Body */}
            <div className="space-y-1.5">
              <label htmlFor="sb-body" className="text-sm font-bold block">
                Body Text
              </label>
              <textarea
                id="sb-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                placeholder="Longer narrative text (optional)"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium text-foreground resize-none"
              />
            </div>
  
            {/* Image URL */}
            <div className="space-y-1.5">
              <label htmlFor="sb-image" className="text-sm font-bold block">
                Image URL
              </label>
              <input
                id="sb-image"
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium text-foreground"
              />
              {imageUrl && (
                <div className="mt-2 w-32 h-20 rounded-lg overflow-hidden bg-foreground/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
  
            <div className="grid grid-cols-2 gap-4">
              {/* Stat */}
              <div className="space-y-1.5">
                <label htmlFor="sb-stat" className="text-sm font-bold block">
                  Stat / Emoji
                </label>
                <input
                  id="sb-stat"
                  type="text"
                  value={stat}
                  onChange={(e) => setStat(e.target.value)}
                  placeholder="e.g. 2019, 500+, 🏔️"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium text-foreground"
                />
              </div>
  
              {/* Order */}
              <div className="space-y-1.5">
                <label htmlFor="sb-order" className="text-sm font-bold block">
                  Display Order
                </label>
                <input
                  id="sb-order"
                  type="number"
                  value={order}
                  onChange={(e) => setOrder(Number(e.target.value))}
                  min={0}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium text-foreground"
                />
              </div>
            </div>
  
            {/* Active toggle */}
            <label
              htmlFor="sb-active"
              className="flex items-center gap-3 cursor-pointer"
            >
              <input
                id="sb-active"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-5 h-5 rounded border-border text-primary focus:ring-primary/20 accent-primary"
              />
              <span className="text-sm font-bold">Active (visible on public page)</span>
            </label>
  
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground font-black py-3.5 rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform shadow-lg shadow-primary/25 disabled:opacity-50"
            >
              {buttonContent}
            </button>
          </form>
        </div>
      </div>
    );
}
