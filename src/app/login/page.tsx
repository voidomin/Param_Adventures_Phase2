"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth, type LoginResult } from "@/lib/AuthContext";
import AuthLayout, { itemVariants } from "@/components/auth/AuthLayout";
import { AuthInput, AuthButton } from "@/components/auth/AuthShared";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";

function isRequiresTwoFactor(result: LoginResult): result is { requiresTwoFactor: true } {
  return "requiresTwoFactor" in result;
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, loginWithGoogle, user, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  // Set once a login attempt comes back "requiresTwoFactor": null means the
  // pending attempt was password-based (retry via login()); a string means
  // it was Google-based (retry via loginWithGoogle() with this credential).
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);
  const [pendingGoogleCredential, setPendingGoogleCredential] = useState<string | null>(null);
  const [error, setError] = useState(() => {
    const reason = searchParams.get("reason");
    if (reason === "idle") return "You were signed out after a period of inactivity.";
    if (reason === "session-expired") return "Your session has expired. Please log in again.";
    return "";
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmitTime, setLastSubmitTime] = useState(0);

  // ─── Auto-Redirect if Already Logged In ──────────────────
  useEffect(() => {
    if (!authLoading && user) {
      const redirect = searchParams.get("redirect") || "/";
      router.push(redirect);
    }
  }, [user, authLoading, router, searchParams]);

  // Ghost Mode: If authenticated, we render nothing (stops loops)
  if (user) return null;

  const resetTwoFactorState = () => {
    setNeedsTwoFactor(false);
    setPendingGoogleCredential(null);
    setTotpCode("");
    setError("");
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const now = Date.now();
    if (isSubmitting || (now - lastSubmitTime < 2000)) return;

    setError("");
    setIsSubmitting(true);
    setLastSubmitTime(now);

    const wasAlreadyPromptingForCode = needsTwoFactor;

    try {
      const codeParam = wasAlreadyPromptingForCode ? totpCode : undefined;
      const result = pendingGoogleCredential
        ? await loginWithGoogle(pendingGoogleCredential, totpCode)
        : await login(email, password, codeParam);

      if (isRequiresTwoFactor(result)) {
        // Only a genuine wrong-code retry should say "invalid" -- the very
        // first time we land here, no code has been tried yet.
        if (wasAlreadyPromptingForCode) {
          setError("Invalid code. Please try again.");
        }
        setNeedsTwoFactor(true);
      } else {
        router.push(searchParams.get("redirect") || "/");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleCredential = async (credential: string) => {
    setError("");
    try {
      const result = await loginWithGoogle(credential);
      if (isRequiresTwoFactor(result)) {
        setPendingGoogleCredential(credential);
        setNeedsTwoFactor(true);
      } else {
        router.push(searchParams.get("redirect") || "/");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
    }
  };

  if (needsTwoFactor) {
    return (
      <AuthLayout
        heading="Two-Factor Authentication"
        subheading="Enter the 6-digit code from your authenticator app"
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
            id="login-totp"
            label="Authentication Code"
            type="text"
            required
            autoFocus
            value={totpCode}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTotpCode(e.target.value)}
            placeholder="123456 or a backup code"
          />

          <AuthButton
            isSubmitting={isSubmitting}
            loadingText="Verifying..."
            text="Verify"
          />
        </form>

        <motion.div variants={itemVariants} className="mt-6 text-center">
          <button
            type="button"
            onClick={resetTwoFactorState}
            className="text-white/40 hover:text-white text-sm transition-colors"
          >
            &larr; Back
          </button>
        </motion.div>
      </AuthLayout>
    );
  }

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

      <div className="mt-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-white/30 text-xs uppercase tracking-wider">or</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <div className="mt-5">
        <GoogleSignInButton onCredential={handleGoogleCredential} />
        <p className="text-center text-[11px] text-white/30 mt-2.5">
          By continuing with Google, you agree to our{" "}
          <Link href="/terms" target="_blank" className="underline hover:text-white/50">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" target="_blank" className="underline hover:text-white/50">
            Privacy Policy
          </Link>
          .
        </p>
      </div>

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
