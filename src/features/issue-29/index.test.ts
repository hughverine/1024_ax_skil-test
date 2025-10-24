import { describe, it, expect } from "vitest";
import { getNextQuestion, submitAnswer } from "./index";

describe("Issue #29 - Test Screen", () => {
  it("gets next question", () => {
    const result = getNextQuestion({ sessionId: "s1", currentQuestion: 0, totalQuestions: 30, answers: [] });
    expect(result.questionId).toBeDefined();
  });

  it("submits answer", () => {
    const result = submitAnswer({ sessionId: "s1", currentQuestion: 1, totalQuestions: 30, answers: [] }, ["a"]);
    expect(result.score).toBeDefined();
  });
});
