import { z } from "zod";

/**
 * Shared password strength requirement for registration and password reset:
 * minimum 8 characters, at least one uppercase letter, one lowercase letter,
 * and one digit. Kept in one place so both flows can't drift out of sync.
 */
export const passwordSchema = z
  .string()
  .min(8, { message: "Password must be at least 8 characters" })
  .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
  .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
  .regex(/[0-9]/, { message: "Password must contain at least one number" });
