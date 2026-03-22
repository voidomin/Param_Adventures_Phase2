"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import AuthLayout, { itemVariants } from "@/components/auth/AuthLayout";
import { CheckCircle, ArrowRight, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send reset link.");
      }

      setStatus("success");
      setMessage(
        data.message || "If an account exists, a reset link has been sent.",
      );
    } catch (err: unknown) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  return (
    <AuthLayout
      heading="Reset Password"
      subheading="Enter your email to receive a reset link"
      backgroundImage="/auth-login-bg.png"
      imageHeading={"Lost Your Way?\nWe've Got You"}
      imageSubheading="No worries — we'll help you get back on the trail."
    >
      {status === "error" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-5"
        >
          <p className="text-red-400 text-sm text-center">{message}</p>
        </motion.div>
      )}

      {status === "success" ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center py-6"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 15 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 mb-4"
          >
            <CheckCircle className="w-8 h-8 text-green-400" />
          </motion.div>
          <motion.h3
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-lg font-heading font-bold text-white mb-2"
          >
            Check Your Inbox
          </motion.h3>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-white/50 text-sm mb-6"
          >
            {message}
          </motion.p>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-amber-400 hover:text-amber-300 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Login
          </Link>
        </motion.div>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="space-y-4">
            <motion.div variants={itemVariants}>
              <label
                htmlFor="forgot-email"
                className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wider"
              >
                Email
              </label>
              <input
                id="forgot-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 transition-all duration-300"
                placeholder="you@example.com"
              />
            </motion.div>

            <motion.div variants={itemVariants} className="pt-1">
              <motion.button
                type="submit"
                disabled={status === "loading"}
                className="group relative w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30 overflow-hidden"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {status === "loading" ? "Sending..." : "Send Reset Link"}
                  {status !== "loading" && (
                    <motion.span
                      animate={{ x: [0, 4, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <ArrowRight className="w-4 h-4" />
                    </motion.span>
                  )}
                </span>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-amber-600 to-orange-600"
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                />
              </motion.button>
            </motion.div>
          </form>

          <motion.div variants={itemVariants} className="mt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-white/40 hover:text-white/60 text-sm font-medium transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Login
            </Link>
          </motion.div>
        </>
      )}
    </AuthLayout>
  );
}
