import { describe, it, expect } from "vitest";
import { sendEmail } from "./index";

describe("Issue #32 - Email Notification", () => {
  it("sends email", async () => {
    const result = await sendEmail("test@example.com", "Subject", "Body");
    expect(result.success).toBe(true);
  });
});
