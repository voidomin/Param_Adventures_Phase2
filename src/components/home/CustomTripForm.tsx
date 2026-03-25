"use client";

import React, { useState } from "react";
import { z } from "zod";

const customTripFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email({ message: "Invalid email address" }),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  requirements: z
    .string()
    .min(10, "Please provide more details on your requirements"),
});
import {
  Send,
  CheckCircle2,
  Loader2,
  User,
  Mail,
  Phone,
  FileText,
} from "lucide-react";

export default function CustomTripForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const target = e.target as HTMLFormElement;
    setLoading(true);
    setError("");

    const formData = new FormData(target);
    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      requirements: formData.get("requirements") as string,
    };

    const validationResult = customTripFormSchema.safeParse(data);

    if (!validationResult.success) {
      setLoading(false);
      const firstError = validationResult.error.issues[0];
      setError(firstError.message);
      return;
    }

    fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then(async (res) => {
        const resData = await res.json();
        if (!res.ok) throw new Error(resData.error || "Failed to submit");
        setSuccess(true);
        target.reset();
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  if (success) {
    return (
      <div className="bg-card border border-border rounded-3xl p-10 text-center shadow-lg">
        <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </div>
        <h3 className="text-2xl font-heading font-black mb-3">
          Request Received!
        </h3>
        <p className="text-foreground/70 mb-6 max-w-md mx-auto">
          Thank you for reaching out. Our trip experts will carefully review
          your requirements and get back to you within 24 hours to plan your
          perfect adventure.
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="text-primary font-bold hover:underline"
        >
          Submit another request
        </button>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-3xl p-8 lg:p-10 shadow-xl shadow-black/5 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-colors duration-1000 pointer-events-none" />

      <div className="relative z-10">
        <h3 className="text-3xl font-heading font-black mb-2">
          Plan a Custom Trip
        </h3>
        <p className="text-foreground/60 mb-8">
          Can&apos;t find exactly what you&apos;re looking for? Let our experts craft a
          personalized itinerary just for you or your group.
        </p>

        {error && (
          <div className="bg-red-500/10 text-red-500 p-4 rounded-xl mb-6 text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-bold block">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-foreground/40">
                  <User className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  suppressHydrationWarning
                  placeholder="John Doe"
                  className="w-full bg-background border border-border rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none font-medium text-foreground"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-bold block">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-foreground/40">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  suppressHydrationWarning
                  placeholder="john@example.com"
                  className="w-full bg-background border border-border rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none font-medium text-foreground"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="phone" className="text-sm font-bold block">
              Phone Number
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-foreground/40">
                <Phone className="w-5 h-5" />
              </div>
              <input
                type="tel"
                id="phone"
                name="phone"
                required
                suppressHydrationWarning
                placeholder="+91 98765 43210"
                className="w-full bg-background border border-border rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none font-medium text-foreground"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="requirements" className="text-sm font-bold block">
              Trip Requirements
            </label>
            <div className="relative">
              <div className="absolute top-4 left-0 pl-4 flex items-start pointer-events-none text-foreground/40">
                <FileText className="w-5 h-5" />
              </div>
              <textarea
                id="requirements"
                name="requirements"
                required
                placeholder="Tell us about your dream trip (group size, preferred dates, destinations, interests)..."
                rows={4}
                className="w-full bg-background border border-border rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none font-medium text-foreground resize-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            suppressHydrationWarning
            className="w-full bg-primary text-primary-foreground font-black py-4 rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform shadow-xl shadow-primary/25 disabled:opacity-50 disabled:scale-100"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Send className="w-5 h-5" />
                Send Request
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
