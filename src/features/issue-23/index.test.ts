/**
 * Anti-Reuse Detection Tests
 * Issue #23: 既存問題の流用/類似検出
 */

import { describe, it, expect, vi } from "vitest";
import { detectSimilarity, shouldRegenerate, generateWithRetry } from "./index";

describe("detectSimilarity", () => {
  it("should detect identical questions", () => {
    const result = detectSimilarity("What is TypeScript?", ["What is TypeScript?"]);
    expect(result.similarity).toBeGreaterThan(0.9);
    expect(result.isDuplicate).toBe(true);
  });

  it("should detect similar questions", () => {
    const result = detectSimilarity(
      "What is TypeScript and how does it work?",
      ["What is TypeScript and how it works?"]
    );
    expect(result.similarity).toBeGreaterThan(0.7);
    expect(result.isDuplicate).toBe(true);
  });

  it("should not flag different questions", () => {
    const result = detectSimilarity(
      "What is TypeScript?",
      ["What is Python?", "What is Java?"]
    );
    expect(result.isDuplicate).toBe(false);
  });

  it("should use custom threshold", () => {
    const result = detectSimilarity(
      "What is TypeScript?",
      ["What is TypeScript?"],
      0.95
    );
    expect(result.threshold).toBe(0.95);
  });
});

describe("shouldRegenerate", () => {
  it("should return true for duplicates", () => {
    const result = { similarity: 0.8, isDuplicate: true, threshold: 0.7, method: "jaccard" as const };
    expect(shouldRegenerate(result)).toBe(true);
  });

  it("should return false for non-duplicates", () => {
    const result = { similarity: 0.5, isDuplicate: false, threshold: 0.7, method: "jaccard" as const };
    expect(shouldRegenerate(result)).toBe(false);
  });
});

describe("generateWithRetry", () => {
  it("should return question on first success", async () => {
    const generateFn = vi.fn().mockResolvedValue("new question");
    const checkFn = vi.fn().mockResolvedValue({ isDuplicate: false, similarity: 0.3, threshold: 0.7, method: "jaccard" });

    const result = await generateWithRetry(generateFn, checkFn);
    expect(result.question).toBe("new question");
    expect(result.retries).toBe(0);
    expect(result.usedFallback).toBe(false);
  });

  it("should retry on duplicate", async () => {
    const generateFn = vi.fn()
      .mockResolvedValueOnce("dup question")
      .mockResolvedValueOnce("unique question");
    const checkFn = vi.fn()
      .mockResolvedValueOnce({ isDuplicate: true, similarity: 0.9, threshold: 0.7, method: "jaccard" })
      .mockResolvedValueOnce({ isDuplicate: false, similarity: 0.3, threshold: 0.7, method: "jaccard" });

    const result = await generateWithRetry(generateFn, checkFn);
    expect(result.question).toBe("unique question");
    expect(result.retries).toBe(1);
    expect(result.usedFallback).toBe(false);
  });

  it("should use fallback after max retries", async () => {
    const generateFn = vi.fn().mockResolvedValue("duplicate");
    const checkFn = vi.fn().mockResolvedValue({ isDuplicate: true, similarity: 0.9, threshold: 0.7, method: "jaccard" });

    const result = await generateWithRetry(generateFn, checkFn, 3, "fallback question");
    expect(result.question).toBe("fallback question");
    expect(result.retries).toBe(3);
    expect(result.usedFallback).toBe(true);
  });
});