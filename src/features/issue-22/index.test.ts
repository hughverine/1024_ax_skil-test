/**
 * MCQ Normalization Tests
 * Issue #22: MCQ入力正規化モジュール
 */

import { describe, it, expect } from "vitest";
import { normalizeMcq, normalizeMcqWithText, validateAnswer } from "./index";

describe("normalizeMcq", () => {
  it('should normalize "a, c" to ["a", "c"]', () => {
    const result = normalizeMcq("a, c");
    expect(result.isValid).toBe(true);
    expect(result.normalized).toEqual(["a", "c"]);
  });

  it('should normalize "A C" to ["a", "c"]', () => {
    const result = normalizeMcq("A C");
    expect(result.isValid).toBe(true);
    expect(result.normalized).toEqual(["a", "c"]);
  });

  it('should handle "all" alias', () => {
    const result = normalizeMcq("all");
    expect(result.isValid).toBe(true);
    expect(result.normalized).toEqual(["a", "b", "c", "d"]);
  });

  it('should handle "全部" alias', () => {
    const result = normalizeMcq("全部");
    expect(result.isValid).toBe(true);
    expect(result.normalized).toEqual(["a", "b", "c", "d"]);
  });

  it('should handle range format "A-D"', () => {
    const result = normalizeMcq("A-D");
    expect(result.isValid).toBe(true);
    expect(result.normalized).toEqual(["a", "b", "c", "d"]);
  });

  it('should handle range format "A〜D"', () => {
    const result = normalizeMcq("A〜D");
    expect(result.isValid).toBe(true);
    expect(result.normalized).toEqual(["a", "b", "c", "d"]);
  });

  it("should handle empty input", () => {
    const result = normalizeMcq("");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Input is empty");
  });

  it("should detect invalid choices", () => {
    const result = normalizeMcq("A, E, F");
    expect(result.isValid).toBe(true);
    expect(result.normalized).toEqual(["a"]);
    expect(result.warnings).toBeDefined();
    expect(result.warnings![0]).toContain("E, F");
  });

  it("should return error when only invalid choices", () => {
    const result = normalizeMcq("E, F");
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("No valid choices found");
  });

  it("should remove duplicates", () => {
    const result = normalizeMcq("A, A, B, B");
    expect(result.isValid).toBe(true);
    expect(result.normalized).toEqual(["a", "b"]);
  });

  it("should be case-insensitive", () => {
    const result = normalizeMcq("a, B, C, d");
    expect(result.isValid).toBe(true);
    expect(result.normalized).toEqual(["a", "b", "c", "d"]);
  });
});

describe("normalizeMcqWithText", () => {
  const choiceTexts = {
    A: "TypeScript is a typed superset of JavaScript",
    B: "Python is a high-level programming language",
    C: "Java is a class-based object-oriented language",
    D: "Ruby is a dynamic programming language",
  };

  it("should fallback to standard normalization", () => {
    const result = normalizeMcqWithText("A, C", choiceTexts);
    expect(result.isValid).toBe(true);
    expect(result.normalized).toEqual(["a", "c"]);
  });

  it("should match based on choice text", () => {
    const result = normalizeMcqWithText("TypeScript", choiceTexts);
    expect(result.isValid).toBe(true);
    expect(result.normalized).toEqual(["a"]);
    expect(result.warnings).toContain("Matched based on choice text content");
  });

  it("should match partial text", () => {
    const result = normalizeMcqWithText("high-level", choiceTexts);
    expect(result.isValid).toBe(true);
    expect(result.normalized).toEqual(["b"]);
  });
});

describe("validateAnswer", () => {
  it("should return true for correct answers", () => {
    expect(validateAnswer(["a", "c"], ["A", "C"])).toBe(true);
  });

  it("should return true regardless of order", () => {
    expect(validateAnswer(["c", "a"], ["A", "C"])).toBe(true);
  });

  it("should return false for wrong answers", () => {
    expect(validateAnswer(["a", "b"], ["A", "C"])).toBe(false);
  });

  it("should return false for incomplete answers", () => {
    expect(validateAnswer(["a"], ["A", "C"])).toBe(false);
  });

  it("should return false for extra answers", () => {
    expect(validateAnswer(["a", "b", "c"], ["A", "C"])).toBe(false);
  });
});