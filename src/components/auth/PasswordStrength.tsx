"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

interface PasswordStrengthProps {
  password: string;
}

function getStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score; // 0-5
}

const LEVELS = [
  { label: "Too short", color: "bg-red-500", textColor: "text-red-400" },
  { label: "Weak", color: "bg-orange-500", textColor: "text-orange-400" },
  { label: "Fair", color: "bg-yellow-500", textColor: "text-yellow-400" },
  { label: "Good", color: "bg-lime-500", textColor: "text-lime-400" },
  { label: "Strong", color: "bg-green-500", textColor: "text-green-400" },
  { label: "Excellent", color: "bg-emerald-400", textColor: "text-emerald-400" },
];

export default function PasswordStrength({ password }: PasswordStrengthProps) {
  const strength = useMemo(() => getStrength(password), [password]);
  const level = LEVELS[strength];

  if (!password) return null;

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i < strength ? level.color : "bg-white/10"
            }`}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: i * 0.05, duration: 0.2 }}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${level.textColor}`}>
        {level.label}
      </p>
    </div>
  );
}
