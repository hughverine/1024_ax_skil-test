# Issue #26: 補完ロジック & スコア補正

**Status**: Implemented ✅

Task request file: `.ai/task-requests/issue-26.md`

---

## Overview

Supplementary questions logic and score adjustment module. After completing 30 questions, identifies domains with low confidence and generates 2-5 supplementary questions to improve measurement accuracy and adjust final scores.

## Features

### 1. Domain Confidence Calculation

Calculates confidence score (0.0-1.0) for each domain based on:

- **Average Score (40%)**: Higher score → higher confidence
- **Score Consistency (30%)**: Lower variance → higher confidence
- **Error Rate (20%)**: Lower error rate → higher confidence
- **Answer Length (10%)**: Adequate length for free-form answers → higher confidence
- **Sample Size Penalty**: Penalizes domains with less than 3 questions

### 2. Weak Domain Identification

- Identifies domains below confidence threshold (default: 0.6)
- Sorts by confidence (lowest first) to prioritize weakest domains
- Returns empty array if all domains are strong

### 3. Supplementary Question Generation

- Generates 2-5 questions for weak domains
- Alternates between MCQ and free-form questions
- Supports difficulty levels (easy/medium/hard)
- **Production**: Will use RAG (Retrieval-Augmented Generation) to fetch from question bank

### 4. Score Adjustment

- Adjusts domain weight by ±5-10% based on supplementary performance
- Weight adjustment formula: `improvement / 0.5 * 10%` (capped at ±10%)
- Positive improvement → increase weight
- Negative improvement → decrease weight
- Applies adjustments to calculate final adjusted score

## API

### `calculateDomainConfidence()`

```typescript
function calculateDomainConfidence(
  session: TestSession,
  domain: string,
  confidenceThreshold: number = 0.6
): DomainConfidence
```

Calculate confidence score for a specific domain.

**Parameters:**
- `session`: Test session with all answers
- `domain`: Domain to calculate confidence for
- `confidenceThreshold`: Minimum confidence threshold (default: 0.6)

**Returns:**
```typescript
{
  domain: string,
  confidence: number,          // 0.0-1.0
  sampleSize: number,          // Number of questions
  averageScore: number,        // 0.0-1.0
  scoreVariance: number,       // Statistical variance
  errorRate: number,           // 0.0-1.0 (MCQ only)
  averageAnswerLength?: number // Word count (free-form only)
}
```

### `identifyWeakDomains()`

```typescript
function identifyWeakDomains(
  session: TestSession,
  threshold: number = 0.6
): DomainConfidence[]
```

Identify domains that need supplementary questions.

**Parameters:**
- `session`: Test session with all answers
- `threshold`: Confidence threshold (default: 0.6)

**Returns:** Array of domain confidence scores below threshold, sorted by confidence (lowest first)

### `generateSupplementaryQuestions()`

```typescript
async function generateSupplementaryQuestions(
  request: SupplementaryQuestionsRequest
): Promise<SupplementaryQuestion[]>
```

Generate 2-5 supplementary questions for a weak domain.

**Parameters:**
```typescript
{
  domain: string,
  count: number,                    // 2-5 (auto-clamped)
  existingQuestionIds: string[],    // To avoid duplicates
  difficulty?: "easy" | "medium" | "hard"
}
```

**Returns:** Array of 2-5 supplementary questions (alternating MCQ/free-form)

### `calculateScoreAdjustment()`

```typescript
function calculateScoreAdjustment(
  domain: string,
  originalDomainScore: number,
  supplementaryAnswers: Answer[],
  domainWeight: number = 1.0
): ScoreAdjustment
```

Calculate weight adjustment based on supplementary results.

**Parameters:**
- `domain`: Domain name
- `originalDomainScore`: Original score before supplementary (0.0-1.0)
- `supplementaryAnswers`: Answers to supplementary questions
- `domainWeight`: Current domain weight (default: 1.0)

**Returns:**
```typescript
{
  domain: string,
  originalWeight: number,
  adjustedWeight: number,              // ±5-10% adjustment
  reason: string,                      // Explanation
  supplementaryScoreImprovement: number // Change in score
}
```

### `applyScoreAdjustments()`

```typescript
function applyScoreAdjustments(
  originalScore: number,
  domainScores: Record<string, number>,
  adjustments: ScoreAdjustment[]
): AdjustedScore
```

Apply weight adjustments to calculate final score.

**Parameters:**
- `originalScore`: Original overall score (0.0-1.0)
- `domainScores`: Original scores per domain
- `adjustments`: Score adjustments for each domain

**Returns:**
```typescript
{
  originalScore: number,      // 0.0-1.0
  adjustedScore: number,      // 0.0-1.0 (clamped)
  adjustments: ScoreAdjustment[],
  totalAdjustment: number     // Percentage change
}
```

## Confidence Calculation Formula

```typescript
confidence =
  averageScore * 0.4 +
  (1 - normalizedVariance) * 0.3 +
  (1 - errorRate) * 0.2 +
  lengthAdequacy * 0.1

// With sample size penalty
if (sampleSize < 3) {
  confidence *= sampleSize / 3
}
```

## Weight Adjustment Formula

```typescript
// Calculate improvement
improvement = supplementaryScore - originalDomainScore

// Adjustment percentage (capped at ±10%)
adjustmentPercentage = max(-10, min(10, (improvement / 0.5) * 10))

// Apply adjustment
adjustedWeight = originalWeight * (1 + adjustmentPercentage / 100)
```

**Examples:**
- Improvement +0.5 → +10% weight
- Improvement +0.25 → +5% weight
- Improvement -0.25 → -5% weight
- Improvement -0.5 → -10% weight

## Testing

Comprehensive test coverage (22 test cases):

**Domain Confidence Calculation (5 tests)**
- High confidence for consistent high scores
- Low confidence for inconsistent scores
- Small sample size penalty
- Non-existent domain handling
- Answer length consideration

**Weak Domain Identification (3 tests)**
- Identify domains below threshold
- Sort by confidence (lowest first)
- Return empty array if all strong

**Supplementary Question Generation (4 tests)**
- Generate 2-5 questions
- Clamp count to valid range
- Alternate MCQ/free-form
- Include difficulty level

**Score Adjustment (4 tests)**
- Increase weight for positive improvement
- Decrease weight for negative improvement
- Cap adjustment at ±10%
- No adjustment if no supplementary answers

**Apply Adjustments (4 tests)**
- Apply weight adjustments
- Return original if no adjustments
- Handle multiple domain adjustments
- Clamp adjusted score to 0-1

Run tests:
```bash
npm test src/features/issue-26
```

## Workflow Example

```typescript
// 1. Calculate domain confidences
const session = { userId: "user1", answers: [...], ... };
const typescriptConf = calculateDomainConfidence(session, "TypeScript");
const aiConf = calculateDomainConfidence(session, "AI");

// 2. Identify weak domains
const weakDomains = identifyWeakDomains(session, 0.6);
// => [{ domain: "AI", confidence: 0.45, ... }]

// 3. Generate supplementary questions
const suppQuestions = await generateSupplementaryQuestions({
  domain: "AI",
  count: 3,
  existingQuestionIds: ["q1", "q2", ...]
});

// 4. User answers supplementary questions
// ... collect answers ...

// 5. Calculate score adjustment
const adjustment = calculateScoreAdjustment(
  "AI",
  0.5,  // original score
  supplementaryAnswers,
  1.0   // original weight
);
// => { adjustedWeight: 1.07, supplementaryScoreImprovement: 0.15, ... }

// 6. Apply adjustments to final score
const finalScore = applyScoreAdjustments(
  0.72,  // original overall score
  { TypeScript: 0.9, AI: 0.5, React: 0.7 },
  [adjustment]
);
// => { originalScore: 0.72, adjustedScore: 0.73, totalAdjustment: 1.4% }
```

## Implementation Details

### Current Implementation

- **Domain Confidence**: Statistical calculation based on score patterns
- **Supplementary Questions**: Placeholder alternating MCQ/free-form
- **Score Adjustment**: Formula-based weight adjustment with ±10% cap

### Production Requirements

Replace supplementary question generation with RAG:

```typescript
async function generateSupplementaryQuestions(
  request: SupplementaryQuestionsRequest
): Promise<SupplementaryQuestion[]> {
  // 1. Use embeddings to find similar questions from question bank
  const embedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: `${request.domain} domain questions`
  });

  // 2. Query vector database for relevant questions
  const similarQuestions = await vectorDB.query({
    embedding: embedding.data[0].embedding,
    filter: { domain: request.domain },
    topK: request.count
  });

  // 3. If not enough questions, generate new ones with LLM
  if (similarQuestions.length < request.count) {
    const newQuestions = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{
        role: "system",
        content: `Generate ${request.count} questions for ${request.domain}...`
      }],
      response_format: { type: "json_schema", ... }
    });
  }

  return questions;
}
```

## Acceptance Criteria (DoD)

- ✅ Domains below threshold are correctly detected
- ✅ 2-5 supplementary questions are generated
- ✅ Supplementary results are reflected in final score
- ⏳ Production: Replace placeholder with RAG-based generation

## Related Issues

- Relates to #7 (EPIC 6: 補完質問)
- Uses #24 (MCQ grading) and #25 (Free-form grading)
- Used by #30 (Supplementary question screen)

## Notes

- Confidence threshold of 0.6 is configurable but recommended
- Weight adjustment is capped at ±10% to prevent over-correction
- Sample size penalty ensures reliable confidence scores
- Alternating MCQ/free-form provides balanced assessment
