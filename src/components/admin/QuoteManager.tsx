"use client";

import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Quote as QuoteIcon } from "lucide-react";
import QuoteForm from "./QuoteForm";

interface Quote {
  id: string;
  text: string;
  author: string | null;
  isActive: boolean;
}

export default function QuoteManager() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);

  const fetchQuotes = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/quotes");
      if (res.ok) {
        const data = await res.json();
        setQuotes(data.quotes || []);
      }
    } catch (err) {
      console.error("Failed to fetch quotes:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this quote?")) return;
    try {
      const res = await fetch(`/api/admin/quotes/${id}`, { method: "DELETE" });
      if (res.ok) fetchQuotes();
    } catch (err) {
      console.error("Failed to delete quote:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-heading font-bold text-foreground">
            Adventure Quotes
          </h3>
          <p className="text-foreground/60 text-sm mt-0.5">
            Manage the inspiring quotes shown on the Login &amp; Register pages.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingQuote(null);
            setIsFormOpen(true);
          }}
          className="bg-primary/10 text-primary px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-primary/20 transition-all border border-primary/20"
        >
          <Plus className="w-4 h-4" />
          Add Quote
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quotes.length === 0 ? (
          <div className="sm:col-span-2 lg:col-span-3 py-12 text-center border-2 border-dashed border-border rounded-2xl bg-card/50">
            <QuoteIcon className="w-10 h-10 text-foreground/20 mx-auto mb-3" />
            <p className="text-foreground/40 font-medium">No quotes added yet</p>
          </div>
        ) : (
          quotes.map((quote) => (
            <div
              key={quote.id}
              className={`group relative bg-card border rounded-2xl p-5 hover:border-primary/40 transition-all ${
                !quote.isActive ? "opacity-60 bg-background" : ""
              }`}
            >
              <QuoteIcon className="absolute top-4 right-4 w-4 h-4 text-primary/20 group-hover:text-primary/40 transition-colors" />
              
              <div className="space-y-3">
                <p className="text-foreground font-medium leading-relaxed line-clamp-4 italic">
                  &ldquo;{quote.text}&rdquo;
                </p>
                {quote.author && (
                  <p className="text-foreground/50 text-xs font-bold uppercase tracking-wider">
                    — {quote.author}
                  </p>
                )}
                <div className="flex items-center gap-2 pt-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${quote.isActive ? "bg-green-500" : "bg-foreground/20"}`} />
                  <span className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">
                    {quote.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 rounded-2xl">
                <button
                  onClick={() => {
                    setEditingQuote(quote);
                    setIsFormOpen(true);
                  }}
                  className="bg-primary text-primary-foreground p-2 rounded-lg shadow-lg shadow-primary/20 hover:scale-110 transition-transform"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(quote.id)}
                  className="bg-red-500 text-white p-2 rounded-lg shadow-lg shadow-red-500/20 hover:scale-110 transition-transform"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {isFormOpen && (
        <QuoteForm
          quote={editingQuote}
          onClose={() => setIsFormOpen(false)}
          onSuccess={fetchQuotes}
        />
      )}
    </div>
  );
}
