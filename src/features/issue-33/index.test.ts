import { describe, it, expect } from "vitest";
import { calculateROI } from "./index";

describe("Issue #33 - ROI Calculation", () => {
  it("calculates ROI", () => {
    const result = calculateROI(0.8, "AI");
    expect(result.roi).toBe(80);
  });
});
