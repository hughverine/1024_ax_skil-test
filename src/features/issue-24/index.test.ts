import { describe, it, expect } from "vitest";
import { gradeMcq, gradeMcqBatch } from "./index";

const sampleQuestion = {
  id: "q1",
  stem: "What is TypeScript?",
  choices: { A: "Language", B: "Framework", C: "Library", D: "Tool" },
  key: ["A"],
  domain: "Programming",
};

describe("gradeMcq", () => {
  it("should return score 1 for correct answer", async () => {
    const result = await gradeMcq(["a"], ["A"], sampleQuestion);
    expect(result.score).toBe(1);
    expect(result.isCorrect).toBe(true);
  });

  it("should return score 0 for incorrect answer", async () => {
    const result = await gradeMcq(["b"], ["A"], sampleQuestion);
    expect(result.score).toBe(0);
    expect(result.isCorrect).toBe(false);
  });
});

describe("gradeMcqBatch", () => {
  it("should grade multiple questions", async () => {
    const answers = [
      { questionId: "q1", answer: ["a"] },
    ];
    const results = await gradeMcqBatch(answers, [sampleQuestion]);
    expect(results.q1.score).toBe(1);
  });
});