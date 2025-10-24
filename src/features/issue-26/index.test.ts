import { describe, it, expect } from "vitest";
import {
  calculateDomainConfidence,
  identifyWeakDomains,
  generateSupplementaryQuestions,
  calculateScoreAdjustment,
  applyScoreAdjustments,
  type TestSession,
  type Answer,
} from "./index";

// Sample test session
const createTestSession = (answers: Answer[]): TestSession => ({
  userId: "test-user-1",
  answers,
  startedAt: new Date("2024-01-01T10:00:00Z"),
  completedAt: new Date("2024-01-01T11:00:00Z"),
});

describe("calculateDomainConfidence", () => {
  it("should return high confidence for consistent high scores", () => {
    const session = createTestSession([
      {
        questionId: "q1",
        domain: "TypeScript",
        type: "mcq",
        answer: ["a"],
        score: 1.0,
        isCorrect: true,
      },
      {
        questionId: "q2",
        domain: "TypeScript",
        type: "mcq",
        answer: ["b"],
        score: 1.0,
        isCorrect: true,
      },
      {
        questionId: "q3",
        domain: "TypeScript",
        type: "free-form",
        answer: ["TypeScript is a typed superset of JavaScript"],
        score: 0.9,
        answerLength: 50,
      },
    ]);

    const confidence = calculateDomainConfidence(session, "TypeScript");

    expect(confidence.domain).toBe("TypeScript");
    expect(confidence.confidence).toBeGreaterThan(0.8);
    expect(confidence.sampleSize).toBe(3);
    expect(confidence.averageScore).toBeCloseTo(0.967, 2);
    expect(confidence.errorRate).toBe(0);
  });

  it("should return low confidence for inconsistent scores", () => {
    const session = createTestSession([
      {
        questionId: "q1",
        domain: "AI",
        type: "mcq",
        answer: ["a"],
        score: 1.0,
        isCorrect: true,
      },
      {
        questionId: "q2",
        domain: "AI",
        type: "mcq",
        answer: ["b"],
        score: 0.0,
        isCorrect: false,
      },
      {
        questionId: "q3",
        domain: "AI",
        type: "free-form",
        answer: ["AI"],
        score: 0.3,
        answerLength: 5,
      },
    ]);

    const confidence = calculateDomainConfidence(session, "AI");

    expect(confidence.confidence).toBeLessThan(0.5);
    expect(confidence.scoreVariance).toBeGreaterThan(0.1);
    expect(confidence.errorRate).toBe(0.5);
  });

  it("should penalize small sample sizes", () => {
    const session = createTestSession([
      {
        questionId: "q1",
        domain: "React",
        type: "mcq",
        answer: ["a"],
        score: 1.0,
        isCorrect: true,
      },
    ]);

    const confidence = calculateDomainConfidence(session, "React");

    expect(confidence.sampleSize).toBe(1);
    // Confidence should be reduced by 1/3 due to small sample
    expect(confidence.confidence).toBeLessThan(0.4);
  });

  it("should return zero confidence for non-existent domain", () => {
    const session = createTestSession([
      {
        questionId: "q1",
        domain: "TypeScript",
        type: "mcq",
        answer: ["a"],
        score: 1.0,
        isCorrect: true,
      },
    ]);

    const confidence = calculateDomainConfidence(session, "Python");

    expect(confidence.confidence).toBe(0);
    expect(confidence.sampleSize).toBe(0);
    expect(confidence.errorRate).toBe(1);
  });

  it("should consider answer length for free-form questions", () => {
    const session = createTestSession([
      {
        questionId: "q1",
        domain: "Prompting",
        type: "free-form",
        answer: ["Short"],
        score: 0.6,
        answerLength: 5,
      },
      {
        questionId: "q2",
        domain: "Prompting",
        type: "free-form",
        answer: ["A comprehensive answer with detailed explanation"],
        score: 0.8,
        answerLength: 80,
      },
      {
        questionId: "q3",
        domain: "Prompting",
        type: "free-form",
        answer: ["Another detailed answer with examples and reasoning"],
        score: 0.7,
        answerLength: 60,
      },
    ]);

    const confidence = calculateDomainConfidence(session, "Prompting");

    expect(confidence.averageAnswerLength).toBeCloseTo(48.3, 1);
    expect(confidence.confidence).toBeGreaterThan(0.6);
  });
});

describe("identifyWeakDomains", () => {
  it("should identify domains below threshold", () => {
    const session = createTestSession([
      // Strong domain
      {
        questionId: "q1",
        domain: "TypeScript",
        type: "mcq",
        answer: ["a"],
        score: 1.0,
        isCorrect: true,
      },
      {
        questionId: "q2",
        domain: "TypeScript",
        type: "mcq",
        answer: ["b"],
        score: 1.0,
        isCorrect: true,
      },
      {
        questionId: "q3",
        domain: "TypeScript",
        type: "mcq",
        answer: ["c"],
        score: 0.9,
        isCorrect: true,
      },
      // Weak domain
      {
        questionId: "q4",
        domain: "AI",
        type: "mcq",
        answer: ["a"],
        score: 0.5,
        isCorrect: false,
      },
      {
        questionId: "q5",
        domain: "AI",
        type: "mcq",
        answer: ["b"],
        score: 0.3,
        isCorrect: false,
      },
      {
        questionId: "q6",
        domain: "AI",
        type: "mcq",
        answer: ["c"],
        score: 0.4,
        isCorrect: false,
      },
    ]);

    const weakDomains = identifyWeakDomains(session, 0.6);

    expect(weakDomains.length).toBe(1);
    expect(weakDomains[0].domain).toBe("AI");
    expect(weakDomains[0].confidence).toBeLessThan(0.6);
  });

  it("should sort weak domains by confidence (lowest first)", () => {
    const session = createTestSession([
      // Weak domain 1 (medium weakness)
      {
        questionId: "q1",
        domain: "React",
        type: "mcq",
        answer: ["a"],
        score: 0.6,
        isCorrect: true,
      },
      {
        questionId: "q2",
        domain: "React",
        type: "mcq",
        answer: ["b"],
        score: 0.5,
        isCorrect: false,
      },
      {
        questionId: "q3",
        domain: "React",
        type: "mcq",
        answer: ["c"],
        score: 0.5,
        isCorrect: false,
      },
      // Weak domain 2 (very weak)
      {
        questionId: "q4",
        domain: "AI",
        type: "mcq",
        answer: ["a"],
        score: 0.3,
        isCorrect: false,
      },
      {
        questionId: "q5",
        domain: "AI",
        type: "mcq",
        answer: ["b"],
        score: 0.2,
        isCorrect: false,
      },
      {
        questionId: "q6",
        domain: "AI",
        type: "mcq",
        answer: ["c"],
        score: 0.3,
        isCorrect: false,
      },
    ]);

    const weakDomains = identifyWeakDomains(session, 0.6);

    expect(weakDomains.length).toBe(2);
    expect(weakDomains[0].domain).toBe("AI");
    expect(weakDomains[1].domain).toBe("React");
    expect(weakDomains[0].confidence).toBeLessThan(weakDomains[1].confidence);
  });

  it("should return empty array if all domains are strong", () => {
    const session = createTestSession([
      {
        questionId: "q1",
        domain: "TypeScript",
        type: "mcq",
        answer: ["a"],
        score: 1.0,
        isCorrect: true,
      },
      {
        questionId: "q2",
        domain: "TypeScript",
        type: "mcq",
        answer: ["b"],
        score: 0.9,
        isCorrect: true,
      },
      {
        questionId: "q3",
        domain: "TypeScript",
        type: "mcq",
        answer: ["c"],
        score: 0.95,
        isCorrect: true,
      },
    ]);

    const weakDomains = identifyWeakDomains(session, 0.6);

    expect(weakDomains.length).toBe(0);
  });
});

describe("generateSupplementaryQuestions", () => {
  it("should generate requested number of questions (2-5)", async () => {
    const request = {
      domain: "AI",
      count: 3,
      existingQuestionIds: ["q1", "q2"],
    };

    const questions = await generateSupplementaryQuestions(request);

    expect(questions.length).toBe(3);
    expect(questions.every((q) => q.domain === "AI")).toBe(true);
  });

  it("should clamp count to 2-5 range", async () => {
    const request1 = {
      domain: "AI",
      count: 1,
      existingQuestionIds: [],
    };
    const questions1 = await generateSupplementaryQuestions(request1);
    expect(questions1.length).toBe(2);

    const request2 = {
      domain: "AI",
      count: 10,
      existingQuestionIds: [],
    };
    const questions2 = await generateSupplementaryQuestions(request2);
    expect(questions2.length).toBe(5);
  });

  it("should alternate between MCQ and free-form questions", async () => {
    const request = {
      domain: "TypeScript",
      count: 4,
      existingQuestionIds: [],
    };

    const questions = await generateSupplementaryQuestions(request);

    expect(questions[0].type).toBe("mcq");
    expect(questions[1].type).toBe("free-form");
    expect(questions[2].type).toBe("mcq");
    expect(questions[3].type).toBe("free-form");
  });

  it("should include difficulty level", async () => {
    const request = {
      domain: "React",
      count: 3,
      existingQuestionIds: [],
      difficulty: "hard" as const,
    };

    const questions = await generateSupplementaryQuestions(request);

    expect(questions.every((q) => q.difficulty === "hard")).toBe(true);
  });
});

describe("calculateScoreAdjustment", () => {
  it("should increase weight for positive improvement", () => {
    const supplementaryAnswers: Answer[] = [
      {
        questionId: "supp-1",
        domain: "AI",
        type: "mcq",
        answer: ["a"],
        score: 0.8,
        isCorrect: true,
      },
      {
        questionId: "supp-2",
        domain: "AI",
        type: "free-form",
        answer: ["Good answer"],
        score: 0.9,
      },
    ];

    const adjustment = calculateScoreAdjustment("AI", 0.5, supplementaryAnswers, 1.0);

    expect(adjustment.supplementaryScoreImprovement).toBeCloseTo(0.35, 2);
    expect(adjustment.adjustedWeight).toBeGreaterThan(1.0);
    expect(adjustment.reason).toContain("improvement");
  });

  it("should decrease weight for negative improvement", () => {
    const supplementaryAnswers: Answer[] = [
      {
        questionId: "supp-1",
        domain: "React",
        type: "mcq",
        answer: ["b"],
        score: 0.2,
        isCorrect: false,
      },
      {
        questionId: "supp-2",
        domain: "React",
        type: "free-form",
        answer: ["Poor answer"],
        score: 0.3,
      },
    ];

    const adjustment = calculateScoreAdjustment("React", 0.6, supplementaryAnswers, 1.0);

    expect(adjustment.supplementaryScoreImprovement).toBeLessThan(0);
    expect(adjustment.adjustedWeight).toBeLessThan(1.0);
    expect(adjustment.reason).toContain("decline");
  });

  it("should cap adjustment at ±10%", () => {
    // Huge improvement (should cap at +10%)
    const supplementaryAnswers: Answer[] = [
      {
        questionId: "supp-1",
        domain: "AI",
        type: "mcq",
        answer: ["a"],
        score: 1.0,
      },
      {
        questionId: "supp-2",
        domain: "AI",
        type: "mcq",
        answer: ["b"],
        score: 1.0,
      },
    ];

    const adjustment = calculateScoreAdjustment("AI", 0.0, supplementaryAnswers, 1.0);

    expect(adjustment.adjustedWeight).toBeCloseTo(1.1, 2); // +10% max
  });

  it("should return no adjustment if no supplementary answers", () => {
    const adjustment = calculateScoreAdjustment("AI", 0.5, [], 1.0);

    expect(adjustment.originalWeight).toBe(1.0);
    expect(adjustment.adjustedWeight).toBe(1.0);
    expect(adjustment.supplementaryScoreImprovement).toBe(0);
    expect(adjustment.reason).toContain("No supplementary questions");
  });
});

describe("applyScoreAdjustments", () => {
  it("should apply weight adjustments to calculate adjusted score", () => {
    const domainScores = {
      TypeScript: 0.9,
      AI: 0.5,
      React: 0.7,
    };

    const adjustments = [
      {
        domain: "AI",
        originalWeight: 1.0,
        adjustedWeight: 1.1, // +10%
        reason: "Strong improvement",
        supplementaryScoreImprovement: 0.3,
      },
    ];

    const result = applyScoreAdjustments(0.7, domainScores, adjustments);

    expect(result.originalScore).toBe(0.7);
    expect(result.adjustedScore).not.toBe(0.7);
    expect(result.adjustments.length).toBe(1);
  });

  it("should return original score if no adjustments", () => {
    const domainScores = {
      TypeScript: 0.9,
      AI: 0.8,
    };

    const result = applyScoreAdjustments(0.85, domainScores, []);

    expect(result.originalScore).toBe(0.85);
    expect(result.adjustedScore).toBe(0.85);
    expect(result.totalAdjustment).toBe(0);
  });

  it("should handle multiple domain adjustments", () => {
    const domainScores = {
      TypeScript: 0.8,
      AI: 0.5,
      React: 0.6,
    };

    const adjustments = [
      {
        domain: "AI",
        originalWeight: 1.0,
        adjustedWeight: 1.1,
        reason: "Improvement",
        supplementaryScoreImprovement: 0.2,
      },
      {
        domain: "React",
        originalWeight: 1.0,
        adjustedWeight: 0.95,
        reason: "Slight decline",
        supplementaryScoreImprovement: -0.1,
      },
    ];

    const result = applyScoreAdjustments(0.633, domainScores, adjustments);

    expect(result.adjustments.length).toBe(2);
    expect(result.adjustedScore).toBeGreaterThanOrEqual(0);
    expect(result.adjustedScore).toBeLessThanOrEqual(1);
  });

  it("should clamp adjusted score to 0-1 range", () => {
    const domainScores = {
      AI: 0.1,
    };

    const adjustments = [
      {
        domain: "AI",
        originalWeight: 1.0,
        adjustedWeight: 0.5, // Severe penalty
        reason: "Major decline",
        supplementaryScoreImprovement: -0.5,
      },
    ];

    const result = applyScoreAdjustments(0.1, domainScores, adjustments);

    expect(result.adjustedScore).toBeGreaterThanOrEqual(0);
    expect(result.adjustedScore).toBeLessThanOrEqual(1);
  });
});
