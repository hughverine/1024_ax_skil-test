import { describe, it, expect } from "vitest";
import { generateReport } from "./index";

describe("Issue #31 - Results Screen", () => {
  it("generates report", () => {
    const result = generateReport("sess_123");
    expect(result.reportUrl).toContain("sess_123");
  });
});
