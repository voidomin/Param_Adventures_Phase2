"use client";

import React, { useState } from "react";
import { X, Pencil, Save, Ban } from "lucide-react";
import { useRouter } from "next/navigation";

interface LeadActionsProps {
  readonly leadId: string;
  readonly currentStatus: string;
  readonly currentNotes?: string;
}

export default function LeadActions({
  leadId,
  currentStatus,
  currentNotes = "",
}: LeadActionsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState(currentStatus);
  const [notes, setNotes] = useState(currentNotes);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleUpdate = async (newStatus: string, newNotes: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, adminNotes: newNotes }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Update failed with status ${res.status}`,
        );
      }

      setIsEditing(false);
      router.refresh();
    } catch (error: any) {
      console.error("Update failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2 p-2 bg-foreground/5 rounded-xl border border-border/50 animate-in fade-in slide-in-from-top-1">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="text-xs bg-background border border-border rounded-lg px-2 py-1 focus:ring-1 focus:ring-primary outline-none"
        >
          <option value="NEW">New</option>
          <option value="CONTACTED">Contacted</option>
          <option value="CONVERTED">Converted</option>
          <option value="CLOSED">Closed</option>
          <option value="DISCARDED">Discarded</option>
        </select>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Admin notes..."
          className="text-xs bg-background border border-border rounded-lg px-2 py-1 focus:ring-1 focus:ring-primary outline-none resize-none h-16 w-48"
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => setIsEditing(false)}
            className="p-1 hover:bg-foreground/5 rounded-lg text-foreground/50 transition-colors"
            disabled={isLoading}
          >
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleUpdate(status, notes)}
            className="p-1 hover:bg-primary/10 text-primary rounded-lg transition-colors"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setIsEditing(true)}
        className="p-2 hover:bg-primary/10 text-primary rounded-lg transition-all hover:scale-110 group"
        title="Edit Lead Status/Notes"
      >
        <Pencil className="w-4 h-4" />
      </button>
      <button
        onClick={() => handleUpdate("DISCARDED", notes)}
        className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-all hover:scale-110 group"
        title="Discard Lead"
      >
        <Ban className="w-4 h-4" />
      </button>
    </div>
  );
}
