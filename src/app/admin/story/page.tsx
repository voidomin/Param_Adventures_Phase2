"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  BookOpen,
} from "lucide-react";
import Image from "next/image";
import StoryBlockForm from "@/components/admin/StoryBlockForm";

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

const TYPE_LABELS: Record<string, string> = {
  hero: "Hero",
  milestone: "Milestone",
  value: "Value",
  team: "Team",
  cta: "Call to Action",
};

const TYPE_COLORS: Record<string, string> = {
  hero: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  milestone: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  value: "bg-green-500/10 text-green-500 border-green-500/20",
  team: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  cta: "bg-primary/10 text-primary border-primary/20",
};

export default function AdminStoryPage() {
  const [blocks, setBlocks] = useState<StoryBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<StoryBlock | null>(null);

  const fetchBlocks = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/story");
      if (res.ok) {
        const data = await res.json();
        setBlocks(data.blocks);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBlocks();
  }, []);

  const handleDelete = async (id: string, title: string) => {
    if (!globalThis.confirm(`Delete block "${title}"?`)) return;
    try {
      const res = await fetch(`/api/admin/story/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchBlocks();
      } else {
        alert("Failed to delete");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMove = async (
    id: string,
    direction: "up" | "down",
    index: number,
  ) => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === blocks.length - 1) return;

    const newBlocks = [...blocks];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    const tempOrder = newBlocks[index].order;
    newBlocks[index].order = newBlocks[targetIndex].order;
    newBlocks[targetIndex].order = tempOrder;

    const sorted = [...newBlocks].sort((a, b) => a.order - b.order);
    setBlocks(sorted);

    try {
      await Promise.all([
        fetch(`/api/admin/story/${newBlocks[index].id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: newBlocks[index].order }),
        }),
        fetch(`/api/admin/story/${newBlocks[targetIndex].id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: newBlocks[targetIndex].order }),
        }),
      ]);
    } catch (err) {
      console.error("Failed to reorder", err);
      fetchBlocks();
    }
  };

  const openForm = (block?: StoryBlock) => {
    setEditingBlock(block || null);
    setIsFormOpen(true);
  };

  const onFormClose = () => {
    setIsFormOpen(false);
    setEditingBlock(null);
  };

  const onFormSuccess = () => {
    onFormClose();
    fetchBlocks();
  };

  let content;
  if (isLoading) {
    content = (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    );
  } else if (blocks.length === 0) {
    content = (
      <div className="bg-card border border-border rounded-2xl p-12 text-center text-foreground/60">
        <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-bold text-foreground mb-2">
          No Story Blocks Yet
        </h3>
        <p className="mb-6">
          Create blocks to build your &quot;Our Story&quot; page. Add heroes,
          milestones, values, and more.
        </p>
        <button
          onClick={() => openForm()}
          className="inline-block bg-background border border-border text-foreground px-6 py-2.5 rounded-full font-bold hover:bg-foreground/5 transition-colors"
        >
          Create First Block
        </button>
      </div>
    );
  } else {
    content = (
      <div className="grid gap-3">
        {blocks.map((block, index) => (
          <div
            key={block.id}
            className={`bg-card border border-border rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center transition-colors hover:border-foreground/30 ${
              block.isActive ? "" : "opacity-50"
            }`}
          >
            {/* Type badge */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border ${TYPE_COLORS[block.type] || "bg-foreground/5 text-foreground/60 border-border"}`}
              >
                {TYPE_LABELS[block.type] || block.type}
              </span>
              {block.stat && (
                <span className="text-sm font-mono font-bold text-primary">
                  {block.stat}
                </span>
              )}
            </div>

            {/* Preview */}
            {block.imageUrl && (
              <div className="w-full md:w-20 h-14 rounded-lg overflow-hidden bg-foreground/5 shrink-0">
                        <div className="relative aspect-video w-full">
                          <Image
                            src={block.imageUrl}
                            alt={block.title}
                            fill
                            className="object-cover"
                          />
                        </div>         </div>
            )}

            {/* Title & subtitle */}
            <div className="flex-1 min-w-0 w-full text-center md:text-left">
              <h3 className="font-bold text-foreground truncate">
                {block.title}
              </h3>
              {block.subtitle && (
                <p className="text-foreground/50 text-sm truncate mt-0.5">
                  {block.subtitle}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-3 md:pt-0 border-t border-border md:border-none w-full md:w-auto justify-center md:justify-end">
              <div className="flex flex-col mr-2">
                <button
                  onClick={() => handleMove(block.id, "up", index)}
                  disabled={index === 0}
                  className="p-1 text-foreground/40 hover:text-foreground disabled:opacity-30 transition-colors"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleMove(block.id, "down", index)}
                  disabled={index === blocks.length - 1}
                  className="p-1 text-foreground/40 hover:text-foreground disabled:opacity-30 transition-colors"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => openForm(block)}
                className="p-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors"
                title="Edit"
              >
                <Edit2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleDelete(block.id, block.title)}
                className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors"
                title="Delete"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">
            Our Story
          </h1>
          <p className="text-foreground/60 mt-1">
            Manage the content blocks on your public &quot;Our Story&quot; page.
          </p>
        </div>
        <button
          onClick={() => openForm()}
          className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-bold flex items-center gap-2 hover:scale-105 transition-transform shadow-lg shadow-primary/25"
        >
          <Plus className="w-5 h-5" />
          Add Block
        </button>
      </div>

      {content}

      {isFormOpen && (
        <StoryBlockForm
          block={editingBlock}
          onClose={onFormClose}
          onSuccess={onFormSuccess}
          nextOrder={blocks.length}
        />
      )}
    </div>
  );
}
