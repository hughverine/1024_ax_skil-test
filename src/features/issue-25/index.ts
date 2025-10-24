/**
 * Free-form Grading Module
 * Issue #25: 記述式 採点（ルーブリック + コピペ検出）
 *
 * Rubric-based grading with plagiarism detection for free-form answers
 */

export type RubricScores = {
  accuracy: number; // 0.0-1.0: Technical correctness
  practicality: number; // 0.0-1.0: Practical applicability
  depth: number; // 0.0-1.0: Depth of thinking (Why/How)
  prompt_quality?: number; // 0.0-1.0: Prompt clarity and structure (optional)
};

export type GradingDetail = {
  rubric: RubricScores;
  feedback: string;
  examples: {
    good?: string;
    bad?: string;
  };
};

export type GradingResult = {
  score: number; // 0.0-1.0: Overall score
  detail: GradingDetail;
  plagiarismDetected?: boolean;
  requiresResubmission?: boolean;
};

export type Question = {
  id: string;
  stem: string;
  type: "free-form" | "prompt-design";
  hints?: string[];
  exemplarAnswer?: string;
  domain: string;
};

export type PlagiarismCheckResult = {
  similarity: number; // 0.0-1.0
  isPlagiarized: boolean;
  threshold: number;
  source?: "hint" | "exemplar";
};

/**
 * Grade free-form answer using rubric criteria
 *
 * @param answer - User's answer text
 * @param question - Question object with hints and exemplar
 * @param hints - Additional hint texts for plagiarism detection
 * @returns Grading result with score, rubric breakdown, and feedback
 */
export async function gradeFree(
  answer: string,
  question: Question,
  hints: string[] = []
): Promise<GradingResult> {
  // 1. Plagiarism detection
  const plagiarismCheck = await detectPlagiarism(
    answer,
    [...hints, ...(question.hints || []), question.exemplarAnswer || ""]
  );

  if (plagiarismCheck.isPlagiarized) {
    return {
      score: 0,
      detail: {
        rubric: {
          accuracy: 0,
          practicality: 0,
          depth: 0,
          ...(question.type === "prompt-design" ? { prompt_quality: 0 } : {}),
        },
        feedback:
          "⚠️ High similarity detected with reference materials. Please provide your own original answer without copying from hints or examples.",
        examples: {},
      },
      plagiarismDetected: true,
      requiresResubmission: true,
    };
  }

  // 2. Rubric-based grading
  const rubricScores = await evaluateRubric(answer, question);

  // 3. Calculate overall score (weighted average)
  const weights =
    question.type === "prompt-design"
      ? { accuracy: 0.25, practicality: 0.25, depth: 0.25, prompt_quality: 0.25 }
      : { accuracy: 0.35, practicality: 0.35, depth: 0.3 };

  let score = 0;
  if (question.type === "prompt-design" && rubricScores.prompt_quality !== undefined) {
    score =
      rubricScores.accuracy * weights.accuracy +
      rubricScores.practicality * weights.practicality +
      rubricScores.depth * weights.depth +
      rubricScores.prompt_quality * weights.prompt_quality!;
  } else {
    score =
      rubricScores.accuracy * weights.accuracy +
      rubricScores.practicality * weights.practicality +
      rubricScores.depth * weights.depth;
  }

  // 4. Generate feedback and examples
  const feedback = await generateFeedback(rubricScores, question, score);
  const examples = await generateExamples(rubricScores, question);

  return {
    score: Math.round(score * 100) / 100, // Round to 2 decimal places
    detail: {
      rubric: rubricScores,
      feedback,
      examples,
    },
    plagiarismDetected: false,
    requiresResubmission: false,
  };
}

/**
 * Detect plagiarism using cosine similarity
 *
 * Note: In production, this would use OpenAI embeddings API
 * For now, uses simple text similarity as placeholder
 */
async function detectPlagiarism(
  answer: string,
  referenceMaterials: string[],
  threshold: number = 0.85
): Promise<PlagiarismCheckResult> {
  // Filter out empty reference materials
  const validReferences = referenceMaterials.filter((ref) => ref && ref.trim().length > 0);

  if (validReferences.length === 0) {
    return {
      similarity: 0,
      isPlagiarized: false,
      threshold,
    };
  }

  // Simple text similarity (placeholder for embeddings)
  // In production: use OpenAI embeddings + cosine similarity
  let maxSimilarity = 0;
  let sourceType: "hint" | "exemplar" | undefined;

  for (const reference of validReferences) {
    const similarity = calculateTextSimilarity(answer, reference);
    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
    }
  }

  return {
    similarity: maxSimilarity,
    isPlagiarized: maxSimilarity >= threshold,
    threshold,
    source: maxSimilarity >= threshold ? "hint" : undefined,
  };
}

/**
 * Simple text similarity (placeholder for embeddings-based similarity)
 *
 * Uses Jaccard similarity on word sets as placeholder
 * In production: replace with OpenAI embeddings + cosine similarity
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = new Set(
    text1
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 0)
  );
  const words2 = new Set(
    text2
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 0)
  );

  if (words1.size === 0 || words2.size === 0) return 0;

  const intersection = new Set([...words1].filter((w) => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Evaluate answer against rubric criteria
 *
 * Note: In production, this would call LLM with Structured Outputs (temperature=0)
 * For now, returns mock scores based on answer length and quality heuristics
 */
async function evaluateRubric(answer: string, question: Question): Promise<RubricScores> {
  // Placeholder implementation
  // In production: call OpenAI with structured outputs and detailed rubric

  const wordCount = answer.split(/\s+/).filter((w) => w.length > 0).length;
  const hasWhy = /why|because|reason|なぜ|理由/.test(answer.toLowerCase());
  const hasHow = /how|method|approach|どのように|方法/.test(answer.toLowerCase());
  const hasExample = /example|instance|e\.g\.|例えば|例/.test(answer.toLowerCase());

  // Basic heuristics (replace with LLM in production)
  const baseScore = Math.min(wordCount / 100, 1.0); // Longer answers score higher (capped at 1.0)

  const scores: RubricScores = {
    accuracy: Math.min(baseScore * 0.8 + (hasExample ? 0.2 : 0), 1.0),
    practicality: Math.min(baseScore * 0.7 + (hasExample ? 0.3 : 0), 1.0),
    depth: Math.min(baseScore * 0.6 + (hasWhy ? 0.2 : 0) + (hasHow ? 0.2 : 0), 1.0),
  };

  // Add prompt_quality for prompt-design questions
  if (question.type === "prompt-design") {
    const hasStructure = /\d+\.|step|instruction|指示|ステップ/.test(answer.toLowerCase());
    const hasClarification = /clear|specific|明確|具体的/.test(answer.toLowerCase());
    scores.prompt_quality = Math.min(
      baseScore * 0.5 + (hasStructure ? 0.25 : 0) + (hasClarification ? 0.25 : 0),
      1.0
    );
  }

  return scores;
}

/**
 * Generate detailed feedback based on rubric scores
 *
 * Note: In production, this would use LLM to generate personalized feedback
 */
async function generateFeedback(
  rubric: RubricScores,
  question: Question,
  score: number
): Promise<string> {
  const suggestions: string[] = [];

  if (rubric.accuracy < 0.6) {
    suggestions.push("技術的な正確性を向上させましょう。仕様や定義を再確認してください。");
  }

  if (rubric.practicality < 0.6) {
    suggestions.push("実務での適用可能性を考慮しましょう。具体的なユースケースを含めてください。");
  }

  if (rubric.depth < 0.6) {
    suggestions.push("思考の深さを示しましょう。「なぜ」「どのように」まで掘り下げてください。");
  }

  if (question.type === "prompt-design" && rubric.prompt_quality && rubric.prompt_quality < 0.6) {
    suggestions.push("プロンプトの明確性と構造化を改善しましょう。ステップバイステップで指示を記述してください。");
  }

  if (score >= 0.8) {
    return `優秀な回答です！${question.domain}の理解が深く、実践的な内容になっています。${suggestions.length > 0 ? "\n\nさらに向上させるには：\n" + suggestions.join("\n") : ""}`;
  } else if (score >= 0.6) {
    return `良い回答です。基本的な理解はできています。\n\n改善ポイント：\n${suggestions.join("\n")}`;
  } else {
    return `もう少し詳しく回答しましょう。\n\n改善ポイント：\n${suggestions.join("\n")}`;
  }
}

/**
 * Generate good/bad examples based on rubric scores
 *
 * Note: In production, this would use LLM to generate contextual examples
 */
async function generateExamples(
  rubric: RubricScores,
  question: Question
): Promise<{ good?: string; bad?: string }> {
  const examples: { good?: string; bad?: string } = {};

  // Find the weakest criteria
  const weakestCriteria = Object.entries(rubric).reduce((min, [key, value]) =>
    value < (rubric[min as keyof RubricScores] || 1) ? key : min
  );

  // Provide examples based on weakest criteria
  if (rubric[weakestCriteria as keyof RubricScores]! < 0.6) {
    switch (weakestCriteria) {
      case "accuracy":
        examples.bad = "「AIは便利」のような曖昧な表現";
        examples.good = "「AIはパターン認識により、大量データから特徴を抽出できる」のような具体的で正確な説明";
        break;
      case "practicality":
        examples.bad = "「理論的には可能」のような抽象的な記述";
        examples.good = "「実際のプロジェクトでは〇〇のように適用し、△△の効果が得られた」のような実践例";
        break;
      case "depth":
        examples.bad = "「Xを使うべき」のような結論のみ";
        examples.good =
          "「Xを使うべき理由は〇〇であり、その実装方法は△△となる」のようなWhy/Howまで説明";
        break;
      case "prompt_quality":
        examples.bad = "「良い文章を書いて」のような曖昧な指示";
        examples.good =
          "「1. トーンはフォーマルに 2. 200字以内で 3. 具体例を1つ含める」のような構造化された明確な指示";
        break;
    }
  }

  return examples;
}

/**
 * Batch grade multiple free-form answers
 */
export async function gradeFreeBatch(
  answers: { questionId: string; answer: string }[],
  questions: Question[],
  hints: Record<string, string[]> = {}
): Promise<Record<string, GradingResult>> {
  const results: Record<string, GradingResult> = {};

  for (const { questionId, answer } of answers) {
    const question = questions.find((q) => q.id === questionId);
    if (!question) continue;

    results[questionId] = await gradeFree(answer, question, hints[questionId] || []);
  }

  return results;
}
