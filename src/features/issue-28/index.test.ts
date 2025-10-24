import { describe, it, expect } from "vitest";
import { isValidEmail, validateStartForm, submitStartForm } from "./index";

describe("Issue #28 - Start Form", () => {
  it("validates email", () => {
    expect(isValidEmail("test@example.com")).toBe(true);
    expect(isValidEmail("invalid")).toBe(false);
  });

  it("validates form", () => {
    expect(validateStartForm({ name: "太郎", email: "test@example.com", agreedToTerms: true }).isValid).toBe(true);
    expect(validateStartForm({ name: "", email: "test@example.com", agreedToTerms: true }).isValid).toBe(false);
  });

  it("submits form", async () => {
    const result = await submitStartForm({ name: "太郎", email: "test@example.com", agreedToTerms: true });
    expect(result.success).toBe(true);
  });
});
