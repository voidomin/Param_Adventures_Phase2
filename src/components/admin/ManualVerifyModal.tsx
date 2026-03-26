"use client";

import { useState } from "react";
import { X, Upload, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ManualVerifyModalProps {
  bookingId: string;
  bookingAmount: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ManualVerifyModal({
  bookingId,
  bookingAmount,
  isOpen,
  onClose,
  onSuccess,
}: Readonly<ManualVerifyModalProps>) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    transactionId: "",
    amountPaid: bookingAmount,
    adminNotes: "",
  });

  const [uploading, setUploading] = useState(false);
  const [proofUrl, setProofUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      // 1. Get signed upload signature
      const sigResponse = await fetch("/api/admin/media/cloudinary-sign", {
        method: "POST",
        body: JSON.stringify({ folder: "payment-proofs" }),
      });
      const sigData = await sigResponse.json();

      if (!sigResponse.ok) throw new Error(sigData.error || "Failed to get upload signature");

      // 2. Upload to Cloudinary
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("api_key", sigData.apiKey);
      uploadFormData.append("timestamp", sigData.timestamp.toString());
      uploadFormData.append("signature", sigData.signature);
      uploadFormData.append("folder", sigData.folder);

      const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${sigData.cloudName}/image/upload`;
      const uploadResponse = await fetch(cloudinaryUrl, {
        method: "POST",
        body: uploadFormData,
      });

      const uploadData = await uploadResponse.json();
      if (!uploadResponse.ok) throw new Error(uploadData.error?.message || "Cloudinary upload failed");

      setProofUrl(uploadData.secure_url);
    } catch (err: unknown) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "Failed to upload image.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!proofUrl) {
      setError("Please upload payment proof first.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}/verify-manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          paymentProofUrl: proofUrl,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Verification failed");

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card w-full max-w-md border border-border rounded-2xl shadow-2xl overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 transition-all">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-foreground/2">
          <h3 className="font-heading font-bold text-lg text-foreground">Verify Manual Payment</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-foreground/5 text-foreground/40 hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="py-8 text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 text-green-500 mb-2">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="text-xl font-bold text-foreground">Payment Confirmed!</h4>
              <p className="text-foreground/60">The booking has been successfully verified.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-4">
                {/* Transaction ID */}
                <div>
                  <label htmlFor="transactionId" className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5">
                    Transaction ID / Reference
                  </label>
                  <input
                    id="transactionId"
                    type="text"
                    required
                    placeholder="e.g. PAY-123456789"
                    value={formData.transactionId}
                    onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-foreground/20"
                  />
                </div>

                {/* Amount */}
                <div>
                  <label htmlFor="amountPaid" className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5">
                    Amount Paid (₹)
                  </label>
                  <input
                    id="amountPaid"
                    type="number"
                    required
                    value={formData.amountPaid}
                    onChange={(e) => setFormData({ ...formData, amountPaid: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                </div>

                {/* Image Upload */}
                <div>
                  <label htmlFor="proof-upload" className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5">
                    Payment Screenshot
                  </label>
                  <div
                    className={cn(
                      "relative border-2 border-dashed border-border rounded-xl p-4 transition-all hover:bg-foreground/2",
                      proofUrl ? "border-green-500/50 bg-green-500/5" : "hover:border-primary/50"
                    )}
                  >
                    {(() => {
                      if (uploading) {
                        return (
                          <div className="flex flex-col items-center justify-center gap-2 py-4">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            <span className="text-sm text-foreground/50">Uploading...</span>
                          </div>
                        );
                      }
                      if (proofUrl) {
                        return (
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center text-green-500">
                              <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">Screenshot Uploaded</p>
                              <button
                                type="button"
                                onClick={() => setProofUrl(null)}
                                className="text-xs text-primary hover:underline"
                              >
                                Change image
                              </button>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <label
                          htmlFor="proof-upload"
                          className="flex flex-col items-center justify-center gap-2 py-4 cursor-pointer"
                        >
                          <Upload className="w-6 h-6 text-foreground/30" />
                          <span className="text-sm text-foreground/50 font-medium italic">Click to upload proof</span>
                          <input
                            id="proof-upload"
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileUpload}
                          />
                        </label>
                      );
                    })()}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label htmlFor="adminNotes" className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5">
                    Admin Notes (Optional)
                  </label>
                  <textarea
                    id="adminNotes"
                    rows={2}
                    placeholder="Any specific details about this payment..."
                    value={formData.adminNotes}
                    onChange={(e) => setFormData({ ...formData, adminNotes: e.target.value })}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none placeholder:text-foreground/20"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 border border-border rounded-xl text-sm font-medium text-foreground/60 hover:bg-foreground/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || uploading || !proofUrl}
                  className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirm Payment
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
