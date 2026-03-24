"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import AuthLayout, { itemVariants } from "@/components/auth/AuthLayout";
import { AuthInput, AuthButton } from "@/components/auth/AuthShared";
import PasswordStrength from "@/components/auth/PasswordStrength";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      await register(email, password, name);
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      heading="Create Account"
      subheading="Join the adventure community"
      backgroundImage="/auth-register-bg.png"
      settingsKey="auth_register_bg"
      imageHeading={"Begin Your\nJourney Today"}
      imageSubheading="Create an account and start exploring curated treks across India."
      compact
    >
      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-500/10 border border-red-500/20 rounded-xl p-2.5 mb-4"
        >
          <p className="text-red-400 text-sm text-center">{error}</p>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <AuthInput
            id="register-name"
            label="Full Name"
            type="text"
            required
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            placeholder="Your name"
          />

          <AuthInput
            id="register-email"
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>

        <AuthInput
          id="register-password"
          label="Password"
          type="password"
          required
          showPasswordToggle
          value={password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
          placeholder="Min. 8 characters"
        />
        <PasswordStrength password={password} />

        <AuthInput
          id="register-confirm"
          label="Confirm Password"
          type="password"
          required
          showPasswordToggle
          value={confirmPassword}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
        />
        
        {confirmPassword && password !== confirmPassword && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-red-400 text-xs mt-1"
          >
            Passwords do not match
          </motion.p>
        )}

        <AuthButton
          isSubmitting={isSubmitting}
          loadingText="Creating account..."
          text="Create Account"
        />
      </form>

      <motion.div
        variants={itemVariants}
        className="mt-4 flex flex-col items-center gap-1.5"
      >
        <p className="text-white/40 text-sm">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-amber-400 hover:text-amber-300 font-medium transition-colors"
          >
            Sign in
          </Link>
        </p>
        <Link
          href="/forgot-password"
          className="text-xs text-white/25 hover:text-white/40 transition-colors"
        >
          Forgot your password?
        </Link>
      </motion.div>
    </AuthLayout>
  );
}
