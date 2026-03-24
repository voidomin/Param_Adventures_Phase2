"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import AuthLayout, { itemVariants } from "@/components/auth/AuthLayout";
import { AuthInput, AuthButton } from "@/components/auth/AuthShared";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login(email, password);
      const redirect = searchParams.get("redirect") || "/";
      router.push(redirect);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      heading="Welcome Back"
      subheading="Sign in to continue your adventure"
      backgroundImage="/auth-login-bg.png"
      settingsKey="auth_login_bg"
      imageHeading={"Welcome Back\nTo The Trail"}
      imageSubheading="Pick up where you left off — your next summit is waiting."
    >
      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-5"
        >
          <p className="text-red-400 text-sm text-center">{error}</p>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthInput
          id="login-email"
          label="Email"
          type="email"
          required
          value={email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />

        <AuthInput
          id="login-password"
          label="Password"
          type="password"
          required
          showPasswordToggle
          value={password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
          placeholder="••••••••"
        />

        <AuthButton
          isSubmitting={isSubmitting}
          loadingText="Signing in..."
          text="Sign In"
        />
      </form>

      <motion.div variants={itemVariants} className="mt-6 text-center">
        <p className="text-white/40 text-sm">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="text-amber-400 hover:text-amber-300 font-medium transition-colors"
          >
            Create one
          </Link>
        </p>
      </motion.div>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
