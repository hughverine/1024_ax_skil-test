/**
 * Supplementary Questions Logic & Score Adjustment Module
 * Issue #26: 補完ロジック & スコア補正
 *
 * Identifies domains with low confidence and generates 2-5 supplementary questions
 * to improve measurement accuracy and adjust final scores.
 */

export type TestSession = {
  userId: string;
  answers: Answer[];
  startedAt: Date;
  completedAt?: Date;
};

export type Answer = {
  questionId: string;
  domain: string;
  type: "mcq" | "free-form";
  answer: string[];
  score: number; // 0.0-1.0
  isCorrect?: boolean;
  answerLength?: number; // For free-form answers (word count)
};

export type DomainConfidence = {
  domain: string;
  confidence: number; // 0.0-1.0: Higher = more confident in understanding
  sampleSize: number; // Number of questions in this domain
  averageScore: number; // 0.0-1.0
  scoreVariance: number; // Variance of scores
  errorRate: number; // 0.0-1.0: Ratio of incorrect answers
  averageAnswerLength?: number; // For free-form questions
};

export type SupplementaryQuestionsRequest = {
  domain: string;
  count: number; // 2-5
  existingQuestionIds: string[];
  difficulty?: "easy" | "medium" | "hard";
};

export type SupplementaryQuestion = {
  id: string;
  domain: string;
  type: "mcq" | "free-form";
  stem: string;
  choices?: Record<string, string>;
  key?: string[];
  difficulty: "easy" | "medium" | "hard";
};

export type ScoreAdjustment = {
  domain: string;
  originalWeight: number; // 0.0-1.0
  adjustedWeight: number; // ±5-10% adjustment
  reason: string;
  supplementaryScoreImprovement: number; // Change in score after supplementary questions
};

export type AdjustedScore = {
  originalScore: number; // 0.0-1.0
  adjustedScore: number; // 0.0-1.0
  adjustments: ScoreAdjustment[];
  totalAdjustment: number; // Percentage change
};

/**
 * Calculate domain confidence based on answer patterns
 *
 * @param session - Test session with all answers
 * @param domain - Domain to calculate confidence for
 * @param confidenceThreshold - Minimum confidence threshold (default: 0.6)
 * @returns Domain confidence metrics
 */
export function calculateDomainConfidence(
  session: TestSession,
  domain: string,
  confidenceThreshold: number = 0.6
): DomainConfidence {
  // Filter answers for this domain
  const domainAnswers = session.answers.filter((a) => a.domain === domain);

  if (domainAnswers.length === 0) {
    return {
      domain,
      confidence: 0,
      sampleSize: 0,
      averageScore: 0,
      scoreVariance: 0,
      errorRate: 1,
    };
  }

  // Calculate average score
  const scores = domainAnswers.map((a) => a.score);
  const averageScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;

  // Calculate score variance
  const scoreVariance =
    scores.reduce((sum, s) => sum + Math.pow(s - averageScore, 2), 0) / scores.length;

  // Calculate error rate (for MCQ questions)
  const mcqAnswers = domainAnswers.filter((a) => a.type === "mcq");
  const incorrectCount = mcqAnswers.filter((a) => a.isCorrect === false).length;
  const errorRate = mcqAnswers.length > 0 ? incorrectCount / mcqAnswers.length : 0;

  // Calculate average answer length (for free-form questions)
  const freeFormAnswers = domainAnswers.filter((a) => a.type === "free-form" && a.answerLength);
  const averageAnswerLength =
    freeFormAnswers.length > 0
      ? freeFormAnswers.reduce((sum, a) => sum + (a.answerLength || 0), 0) / freeFormAnswers.length
      : undefined;

  // Calculate confidence score (0.0-1.0)
  // Factors:
  // - High average score → high confidence
  // - Low score variance → high confidence (consistent understanding)
  // - Low error rate → high confidence
  // - Adequate answer length → high confidence (for free-form)

  let confidence = 0;

  // Weight 1: Average score (40%)
  confidence += averageScore * 0.4;

  // Weight 2: Consistency (low variance) (30%)
  // Normalize variance: lower variance = higher confidence
  // Max expected variance is 0.25 (when scores are perfectly split between 0 and 1)
  const normalizedVariance = Math.min(scoreVariance / 0.25, 1.0);
  confidence += (1 - normalizedVariance) * 0.3;

  // Weight 3: Low error rate (20%)
  confidence += (1 - errorRate) * 0.2;

  // Weight 4: Answer length adequacy (10%) - only for free-form
  if (averageAnswerLength !== undefined) {
    // Consider 50+ words as adequate
    const lengthAdequacy = Math.min((averageAnswerLength || 0) / 50, 1.0);
    confidence += lengthAdequacy * 0.1;
  } else {
    // If no free-form answers, redistribute this weight to average score
    confidence += averageScore * 0.1;
  }

  // Penalize small sample sizes (need at least 3 questions for confidence)
  if (domainAnswers.length < 3) {
    confidence *= domainAnswers.length / 3;
  }

  return {
    domain,
    confidence: Math.min(confidence, 1.0),
    sampleSize: domainAnswers.length,
    averageScore,
    scoreVariance,
    errorRate,
    averageAnswerLength,
  };
}

/**
 * Identify domains that need supplementary questions
 *
 * @param session - Test session with all answers
 * @param threshold - Confidence threshold below which supplementary questions are needed (default: 0.6)
 * @returns Array of domain confidence scores, sorted by confidence (lowest first)
 */
export function identifyWeakDomains(
  session: TestSession,
  threshold: number = 0.6
): DomainConfidence[] {
  // Get unique domains
  const domains = [...new Set(session.answers.map((a) => a.domain))];

  // Calculate confidence for each domain
  const confidences = domains.map((domain) => calculateDomainConfidence(session, domain, threshold));

  // Filter domains below threshold and sort by confidence (lowest first)
  return confidences.filter((c) => c.confidence < threshold).sort((a, b) => a.confidence - b.confidence);
}

/**
 * Generate supplementary questions for weak domains
 *
 * Note: In production, this would use RAG (Retrieval-Augmented Generation) to fetch
 * relevant questions from a question bank and/or generate new questions using LLM.
 * For now, returns placeholder questions.
 *
 * @param request - Supplementary questions request
 * @returns Array of 2-5 supplementary questions
 */
export async function generateSupplementaryQuestions(
  request: SupplementaryQuestionsRequest
): Promise<SupplementaryQuestion[]> {
  // Validate count (2-5 questions)
  const count = Math.max(2, Math.min(5, request.count));

  // Placeholder implementation
  // In production: use RAG to fetch from question bank or generate with LLM
  const questions: SupplementaryQuestion[] = [];

  for (let i = 0; i < count; i++) {
    // Alternate between MCQ and free-form
    const type = i % 2 === 0 ? "mcq" : "free-form";
    const difficulty = request.difficulty || "medium";

    if (type === "mcq") {
      questions.push({
        id: `supp-${request.domain}-mcq-${i + 1}`,
        domain: request.domain,
        type: "mcq",
        stem: `[Supplementary MCQ] Question about ${request.domain}`,
        choices: {
          A: "Option A",
          B: "Option B",
          C: "Option C",
          D: "Option D",
        },
        key: ["A"],
        difficulty,
      });
    } else {
      questions.push({
        id: `supp-${request.domain}-free-${i + 1}`,
        domain: request.domain,
        type: "free-form",
        stem: `[Supplementary Free-form] Explain a concept in ${request.domain}`,
        difficulty,
      });
    }
  }

  return questions;
}

/**
 * Calculate score adjustment based on supplementary question results
 *
 * @param originalDomainScore - Original domain score before supplementary questions (0.0-1.0)
 * @param supplementaryAnswers - Answers to supplementary questions
 * @param domainWeight - Current weight of this domain in overall score (0.0-1.0)
 * @returns Score adjustment details
 */
export function calculateScoreAdjustment(
  domain: string,
  originalDomainScore: number,
  supplementaryAnswers: Answer[],
  domainWeight: number = 1.0
): ScoreAdjustment {
  if (supplementaryAnswers.length === 0) {
    return {
      domain,
      originalWeight: domainWeight,
      adjustedWeight: domainWeight,
      reason: "No supplementary questions answered",
      supplementaryScoreImprovement: 0,
    };
  }

  // Calculate supplementary score
  const supplementaryScore =
    supplementaryAnswers.reduce((sum, a) => sum + a.score, 0) / supplementaryAnswers.length;

  // Calculate improvement
  const improvement = supplementaryScore - originalDomainScore;

  // Adjust weight by ±5-10% based on improvement
  // Positive improvement → increase weight (up to +10%)
  // Negative improvement → decrease weight (up to -10%)
  // Scale: improvement of ±0.5 = ±10% weight adjustment

  const adjustmentPercentage = Math.max(-10, Math.min(10, (improvement / 0.5) * 10));
  const adjustedWeight = domainWeight * (1 + adjustmentPercentage / 100);

  let reason = "";
  if (improvement > 0.2) {
    reason = `Strong improvement (+${(improvement * 100).toFixed(1)}%) in supplementary questions. Increasing domain weight by ${adjustmentPercentage.toFixed(1)}%.`;
  } else if (improvement > 0) {
    reason = `Moderate improvement (+${(improvement * 100).toFixed(1)}%) in supplementary questions. Increasing domain weight by ${adjustmentPercentage.toFixed(1)}%.`;
  } else if (improvement < -0.2) {
    reason = `Significant decline (${(improvement * 100).toFixed(1)}%) in supplementary questions. Decreasing domain weight by ${Math.abs(adjustmentPercentage).toFixed(1)}%.`;
  } else if (improvement < 0) {
    reason = `Slight decline (${(improvement * 100).toFixed(1)}%) in supplementary questions. Decreasing domain weight by ${Math.abs(adjustmentPercentage).toFixed(1)}%.`;
  } else {
    reason = "No change in performance. Weight remains the same.";
  }

  return {
    domain,
    originalWeight: domainWeight,
    adjustedWeight,
    reason,
    supplementaryScoreImprovement: improvement,
  };
}

/**
 * Apply score adjustments to calculate final adjusted score
 *
 * @param originalScore - Original overall score before adjustments (0.0-1.0)
 * @param domainScores - Original scores per domain
 * @param adjustments - Score adjustments for each domain
 * @returns Adjusted score with breakdown
 */
export function applyScoreAdjustments(
  originalScore: number,
  domainScores: Record<string, number>,
  adjustments: ScoreAdjustment[]
): AdjustedScore {
  if (adjustments.length === 0) {
    return {
      originalScore,
      adjustedScore: originalScore,
      adjustments: [],
      totalAdjustment: 0,
    };
  }

  // Create adjustment map
  const adjustmentMap = new Map(adjustments.map((adj) => [adj.domain, adj]));

  // Calculate total original weight
  let totalOriginalWeight = 0;
  let totalAdjustedWeight = 0;

  for (const domain in domainScores) {
    const adjustment = adjustmentMap.get(domain);
    if (adjustment) {
      totalOriginalWeight += adjustment.originalWeight;
      totalAdjustedWeight += adjustment.adjustedWeight;
    } else {
      // Domains without adjustments keep weight = 1
      totalOriginalWeight += 1;
      totalAdjustedWeight += 1;
    }
  }

  // Calculate adjusted score
  let adjustedScore = 0;
  for (const domain in domainScores) {
    const domainScore = domainScores[domain];
    const adjustment = adjustmentMap.get(domain);

    if (adjustment) {
      // Apply adjusted weight
      const normalizedWeight = adjustment.adjustedWeight / totalAdjustedWeight;
      adjustedScore += domainScore * normalizedWeight;
    } else {
      // No adjustment, use original weight
      const normalizedWeight = 1 / totalAdjustedWeight;
      adjustedScore += domainScore * normalizedWeight;
    }
  }

  const totalAdjustment = ((adjustedScore - originalScore) / originalScore) * 100;

  return {
    originalScore,
    adjustedScore: Math.min(Math.max(adjustedScore, 0), 1), // Clamp to 0-1
    adjustments,
    totalAdjustment,
  };
}
