import { describe, expect, it } from "vitest";
import { passwordSchema } from "@/lib/validators/auth.schema";

describe("passwordSchema", () => {
  it("accepts a password with lowercase, uppercase, and a digit", () => {
    expect(passwordSchema.safeParse("Password1").success).toBe(true);
  });

  it("rejects a password shorter than 8 characters", () => {
    expect(passwordSchema.safeParse("Pass1").success).toBe(false);
  });

  it("rejects a password with no uppercase letter", () => {
    expect(passwordSchema.safeParse("password1").success).toBe(false);
  });

  it("rejects a password with no lowercase letter", () => {
    expect(passwordSchema.safeParse("PASSWORD1").success).toBe(false);
  });

  it("rejects a password with no digit", () => {
    expect(passwordSchema.safeParse("Passwordxx").success).toBe(false);
  });
});
