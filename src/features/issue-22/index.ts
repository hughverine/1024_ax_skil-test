/**
 * MCQ (Multiple Choice Question) Input Normalization
 * Issue #22: MCQ入力正規化モジュール
 *
 * Handles various input formats and normalizes them to a consistent array format
 */

export type NormalizeResult = {
  normalized: string[];
  isValid: boolean;
  original: string;
  warnings?: string[];
  error?: string;
};

/**
 * Normalize MCQ input from various formats
 *
 * Supported formats:
 * - "a, c" → ["a", "c"]
 * - "A C" → ["a", "c"]
 * - "all" / "全部" → all choices
 * - "A-D" / "A〜D" → ["a", "b", "c", "d"]
 * - Copy-paste text → match choice text
 *
 * @param input - User input string
 * @param choices - Available choices (e.g., ["A", "B", "C", "D"])
 * @returns Normalized result with validation
 */
export function normalizeMcq(
  input: string,
  choices: string[] = ["A", "B", "C", "D"]
): NormalizeResult {
  const original = input;
  const warnings: string[] = [];

  // Clean input
  let cleaned = input.trim();

  if (!cleaned) {
    return {
      normalized: [],
      isValid: false,
      original,
      error: "Input is empty",
    };
  }

  // Convert to lowercase for case-insensitive processing
  const lowerInput = cleaned.toLowerCase();

  // Handle "all" aliases
  const allAliases = [
    "all",
    "すべて",
    "全部",
    "全て",
    "ぜんぶ",
  ];

  if (allAliases.some((alias) => lowerInput === alias)) {
    return {
      normalized: choices.map((c) => c.toLowerCase()),
      isValid: true,
      original,
    };
  }

  // Handle range formats (A-D, A〜D, A~D)
  const rangeMatch = cleaned.match(/^([a-dA-D])\s*[-〜~]\s*([a-dA-D])$/);
  if (rangeMatch) {
    const start = rangeMatch[1].toUpperCase();
    const end = rangeMatch[2].toUpperCase();
    const startCode = start.charCodeAt(0);
    const endCode = end.charCodeAt(0);

    if (startCode <= endCode) {
      const range: string[] = [];
      for (let code = startCode; code <= endCode; code++) {
        const letter = String.fromCharCode(code);
        if (choices.includes(letter)) {
          range.push(letter.toLowerCase());
        }
      }
      return {
        normalized: range,
        isValid: true,
        original,
      };
    }
  }

  // Extract letter choices (A, B, C, D)
  const letterPattern = /[a-dA-D]/g;
  const letters = cleaned.match(letterPattern) || [];

  if (letters.length > 0) {
    // Normalize to lowercase and remove duplicates
    const normalized = [
      ...new Set(letters.map((l) => l.toLowerCase())),
    ].sort();

    // Check for invalid choices
    const invalidChoices = normalized.filter(
      (letter) => !choices.map((c) => c.toLowerCase()).includes(letter)
    );

    if (invalidChoices.length > 0) {
      warnings.push(
        `Invalid choices detected: ${invalidChoices.join(", ").toUpperCase()}. Valid choices are: ${choices.join(", ")}`
      );
    }

    // Filter out invalid choices
    const validNormalized = normalized.filter((letter) =>
      choices.map((c) => c.toLowerCase()).includes(letter)
    );

    if (validNormalized.length === 0) {
      return {
        normalized: [],
        isValid: false,
        original,
        warnings,
        error: `No valid choices found. Valid choices are: ${choices.join(", ")}`,
      };
    }

    return {
      normalized: validNormalized,
      isValid: true,
      original,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  return {
    normalized: [],
    isValid: false,
    original,
    error: `Could not parse input. Please use format like "A", "A, C", "A-D", or "all". Valid choices are: ${choices.join(", ")}`,
  };
}

/**
 * Normalize MCQ input with choice text matching
 */
export function normalizeMcqWithText(
  input: string,
  choiceTexts: Record<string, string>
): NormalizeResult {
  const choices = Object.keys(choiceTexts);
  const standardResult = normalizeMcq(input, choices);

  if (standardResult.isValid) {
    return standardResult;
  }

  const lowerInput = input.toLowerCase().trim();
  const matched: string[] = [];

  for (const [letter, text] of Object.entries(choiceTexts)) {
    const lowerText = text.toLowerCase().trim();
    if (lowerInput.includes(lowerText) || lowerText.includes(lowerInput)) {
      matched.push(letter.toLowerCase());
    }
  }

  if (matched.length > 0) {
    return {
      normalized: matched.sort(),
      isValid: true,
      original: input,
      warnings: ["Matched based on choice text content"],
    };
  }

  return standardResult;
}

/**
 * Validate normalized choices against correct answers
 */
export function validateAnswer(
  normalized: string[],
  correctAnswers: string[]
): boolean {
  if (normalized.length !== correctAnswers.length) {
    return false;
  }

  const sortedNormalized = [...normalized].sort();
  const sortedCorrect = correctAnswers.map((a) => a.toLowerCase()).sort();

  return sortedNormalized.every((choice, i) => choice === sortedCorrect[i]);
}