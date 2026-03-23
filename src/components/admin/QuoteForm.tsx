"use client";

import React, { useState, type FormEvent } from "react";
import { X } from "lucide-react";

interface Quote {
  readonly id?: string;
  readonly text: string;
  readonly author?: string | null;
  readonly isActive: boolean;
}

interface QuoteFormProps {
  readonly quote?: Quote | null;
  readonly onClose: () => void;
  readonly onSuccess: () => void;
}

export default function QuoteForm({ quote, onClose, onSuccess }: QuoteFormProps) {
  const [formData, setFormData] = useState<Quote>(() => ({
    id: quote?.id,
    text: quote?.text || "",
    author: quote?.author || "",
    isActive: quote?.isActive ?? true,
  }));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Using BaseSyntheticEvent as a robust alternative to deprecated FormEvent if warned
  const handleSubmit = async (e: React.BaseSyntheticEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const url = quote?.id
        ? `/api/admin/quotes/${quote.id}`
        : "/api/admin/quotes";
      const method = quote?.id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save quote");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-6 border-b border-border">
          <h3 className="text-xl font-heading font-bold text-foreground">
            {quote ? "Edit Quote" : "Add New Quote"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-foreground/40 hover:text-foreground transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="quote-text" className="text-sm font-medium text-foreground/60">
              Quote Text
            </label>
            <textarea
              id="quote-text"
              required
              value={formData.text}
              onChange={(e) =>
                setFormData({ ...formData, text: e.target.value })
              }
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all min-h-[120px] resize-none"
              placeholder="e.g. The mountains are calling and I must go."
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="quote-author" className="text-sm font-medium text-foreground/60">
              Author (Optional)
            </label>
            <input
              id="quote-author"
              type="text"
              value={formData.author || ""}
              onChange={(e) =>
                setFormData({ ...formData, author: e.target.value })
              }
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              placeholder="e.g. John Muir"
            />
          </div>

          <div className="flex items-center gap-3 py-2">
            <button
              type="button"
              id="quote-active-toggle"
              onClick={() =>
                setFormData({ ...formData, isActive: !formData.isActive })
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                formData.isActive ? "bg-primary" : "bg-border"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.isActive ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <label htmlFor="quote-active-toggle" className="text-sm font-medium text-foreground cursor-pointer">
              Active (Visible on Auth Pages)
            </label>
          </div>

          <div className="flex justify-end gap-3 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-xl text-foreground/60 font-medium hover:bg-foreground/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary text-primary-foreground px-8 py-2 rounded-xl font-bold hover:scale-105 transition-all shadow-lg shadow-primary/25 disabled:opacity-50 disabled:scale-100"
            >
              {isSubmitting ? "Saving..." : "Save Quote"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
