/**
 * MCQ Grading Module
 * Issue #24: MCQ 採点（決定論／temperature=0）
 *
 * Deterministic grading for Multiple Choice Questions
 */

export type MCQGradingResult = {
  score: 0 | 1;
  isCorrect: boolean;
  explanation: {
    why_correct?: string;
    why_wrong?: string;
    why_others_wrong: string;
    practical_tip: string;
  };
};

export type Question = {
  id: string;
  stem: string;
  choices: Record<string, string>;
  key: string[];
  domain: string;
};

/**
 * Grade MCQ answer
 *
 * @param answer - User's normalized answer (e.g., ["a", "c"])
 * @param key - Correct answer key (e.g., ["A", "C"])
 * @param question - Question object
 * @returns Grading result with score and explanation
 */
export async function gradeMcq(
  answer: string[],
  key: string[],
  question: Question
): Promise<MCQGradingResult> {
  // Normalize both answer and key to lowercase
  const normalizedAnswer = answer.map(a => a.toLowerCase()).sort();
  const normalizedKey = key.map(k => k.toLowerCase()).sort();

  // Check if answer matches key exactly
  const isCorrect =
    normalizedAnswer.length === normalizedKey.length &&
    normalizedAnswer.every((a, i) => a === normalizedKey[i]);

  const score: 0 | 1 = isCorrect ? 1 : 0;

  // Generate explanation
  const explanation = await generateExplanation(
    normalizedAnswer,
    normalizedKey,
    question,
    isCorrect
  );

  return {
    score,
    isCorrect,
    explanation,
  };
}

/**
 * Generate explanation for grading result
 *
 * Note: In production, this would call LLM with Structured Outputs (temperature=0)
 * For now, returns templated explanation
 */
async function generateExplanation(
  answer: string[],
  key: string[],
  question: Question,
  isCorrect: boolean
): Promise<MCQGradingResult["explanation"]> {
  const keyStr = key.map(k => k.toUpperCase()).join(", ");
  const answerStr = answer.map(a => a.toUpperCase()).join(", ");

  if (isCorrect) {
    return {
      why_correct: `Your answer (${answerStr}) matches the correct answer (${keyStr}).`,
      why_others_wrong: `The other choices are incorrect because they don't fulfill the requirements described in the question.`,
      practical_tip: `Understanding ${question.domain} concepts will help you identify correct answers more quickly.`,
    };
  }

  return {
    why_wrong: `Your answer (${answerStr}) doesn't match the correct answer (${keyStr}).`,
    why_others_wrong: `The correct answer is ${keyStr}. Review the question stem to understand why.`,
    practical_tip: `Study ${question.domain} fundamentals to improve your understanding.`,
  };
}

/**
 * Batch grade multiple MCQ answers
 */
export async function gradeMcqBatch(
  answers: { questionId: string; answer: string[] }[],
  questions: Question[]
): Promise<Record<string, MCQGradingResult>> {
  const results: Record<string, MCQGradingResult> = {};

  for (const { questionId, answer } of answers) {
    const question = questions.find(q => q.id === questionId);
    if (!question) continue;

    results[questionId] = await gradeMcq(answer, question.key, question);
  }

  return results;
}