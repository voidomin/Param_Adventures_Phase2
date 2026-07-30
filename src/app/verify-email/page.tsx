"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("This verification link is missing its token. Please use the link from your email.");
      return;
    }

    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to verify email.");
        setStatus("success");
        setMessage(data.message || "Email verified successfully.");
      })
      .catch((err: unknown) => {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Something went wrong.");
      });
    // Runs once on mount with whatever token was in the URL at load time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl text-center">
      <h1 className="text-2xl font-heading font-bold text-white mb-2">Email Verification</h1>

      {status === "loading" && (
        <p className="text-slate-400 text-sm mt-6">Verifying your email…</p>
      )}

      {status === "success" && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mt-6">
          <p className="text-green-400 text-sm">{message}</p>
        </div>
      )}

      {status === "error" && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mt-6">
          <p className="text-red-400 text-sm">{message}</p>
        </div>
      )}

      <div className="mt-8">
        <Link
          href="/login"
          className="inline-block w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-amber-500/25"
        >
          Continue to Login
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/param-logo.png"
              alt="Param Adventures"
              width={48}
              height={48}
              className="rounded-lg"
            />
            <span className="text-2xl font-heading font-bold text-white">
              PARAM Adventures
            </span>
          </Link>
        </div>

        <Suspense
          fallback={
            <div className="text-center text-white py-12">Loading…</div>
          }
        >
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
