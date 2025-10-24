import { describe, it, expect } from "vitest";
import { getSupplementaryQuestion } from "./index";

describe("Issue #30 - Supplementary Questions", () => {
  it("gets supplementary question", () => {
    expect(getSupplementaryQuestion("AI").questionId).toContain("AI");
  });
});
