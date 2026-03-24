import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { itemVariants } from "./AuthLayout";

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  showPasswordToggle?: boolean;
}

export const AuthInput = React.forwardRef<HTMLInputElement, AuthInputProps>(
  ({ label, id, showPasswordToggle, type, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const inputType = showPasswordToggle ? (showPassword ? "text" : "password") : type;

    return (
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor={id} className="block text-xs font-medium text-white/60 uppercase tracking-wider">
            {label}
          </label>
          {id === "login-password" && (
            <a href="/forgot-password" className="text-xs text-amber-400/80 hover:text-amber-300 transition-colors">
              Forgot password?
            </a>
          )}
        </div>
        <div className="relative">
          <input
            {...props}
            id={id}
            ref={ref}
            type={inputType}
            className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 transition-all duration-300"
          />
          {showPasswordToggle && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
        </div>
      </motion.div>
    );
  }
);
AuthInput.displayName = "AuthInput";

interface AuthButtonProps extends HTMLMotionProps<"button"> {
  isSubmitting: boolean;
  loadingText: string;
  text: string;
}

export const AuthButton = ({ isSubmitting, loadingText, text, ...props }: AuthButtonProps) => (
  <motion.div variants={itemVariants} className="pt-1">
    <motion.button
      {...props}
      type={props.type ?? "submit"}
      disabled={isSubmitting}
      className="group relative w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30 overflow-hidden"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">
        {isSubmitting ? loadingText : text}
        {!isSubmitting && (
          <motion.span animate={{ x: [0, 4, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
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
);
