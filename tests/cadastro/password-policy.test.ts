import { describe, expect, it } from "vitest";
import {
  SIGNUP_PASSWORD_MIN_LENGTH,
  describePasswordStrength,
  signupPasswordMeetsMinimum,
} from "@/lib/passwordPolicy";

describe("passwordPolicy (frontend)", () => {
  it("mínimo 6 caracteres alinhado à UI", () => {
    expect(SIGNUP_PASSWORD_MIN_LENGTH).toBe(6);
    expect(signupPasswordMeetsMinimum("12345")).toBe(false);
    expect(signupPasswordMeetsMinimum("123456")).toBe(true);
  });

  it("força sugerida — ok > fair > weak", () => {
    expect(describePasswordStrength("12345")).toBe("weak");
    expect(describePasswordStrength("abcdefgh")).toBe("fair");
    expect(describePasswordStrength("Abcdefgh1!")).toBe("ok");
  });
});
