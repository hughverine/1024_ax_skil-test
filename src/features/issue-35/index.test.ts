import { describe, it, expect } from "vitest";
import { logAuditEvent } from "./index";

describe("Issue #35 - Audit Log", () => {
  it("logs audit event", () => {
    const log = logAuditEvent("test.action", { userId: "u1" });
    expect(log.action).toBe("test.action");
  });
});
