# Issue #25: 記述式 採点（ルーブリック + コピペ検出）

**Status**: Implemented ✅

Task request file: `.ai/task-requests/issue-25.md`

---

## Overview

Free-form answer grading module with rubric-based evaluation and plagiarism detection. Provides comprehensive feedback with scores from 0.0 to 1.0.

## Features

### 1. Rubric-based Grading

Four evaluation criteria:

- **Accuracy (正確性)**: Technical correctness (35% weight)
- **Practicality (実務適用性)**: Practical applicability (35% weight)
- **Depth (思考の深さ)**: Deep thinking with Why/How (30% weight)
- **Prompt Quality (プロンプト品質)**: For prompt-design questions only (25% weight each)

### 2. Plagiarism Detection

- Uses text similarity to detect copying from hints and exemplar answers
- Threshold: 0.85 (configurable)
- When plagiarism is detected:
  - Returns score 0
  - Sets `requiresResubmission: true`
  - Stops test progression
  - Requests original answer

### 3. Detailed Feedback

- Score-based feedback (excellent ≥0.8, good ≥0.6, needs improvement <0.6)
- Specific improvement suggestions per rubric criteria
- Good/bad examples for weakest criteria
- Japanese language feedback

## API

### `gradeFree()`

```typescript
async function gradeFree(
  answer: string,
  question: Question,
  hints: string[] = []
): Promise<GradingResult>
```

Grade a single free-form answer.

**Parameters:**
- `answer`: User's answer text
- `question`: Question object with type, hints, and exemplar
- `hints`: Additional hint texts for plagiarism detection (optional)

**Returns:**
```typescript
{
  score: number,              // 0.0-1.0 (rounded to 2 decimals)
  detail: {
    rubric: {
      accuracy: number,       // 0.0-1.0
      practicality: number,   // 0.0-1.0
      depth: number,          // 0.0-1.0
      prompt_quality?: number // 0.0-1.0 (prompt-design only)
    },
    feedback: string,         // Detailed feedback in Japanese
    examples: {
      good?: string,          // Good example
      bad?: string            // Bad example
    }
  },
  plagiarismDetected?: boolean,
  requiresResubmission?: boolean
}
```

### `gradeFreeBatch()`

```typescript
async function gradeFreeBatch(
  answers: { questionId: string; answer: string }[],
  questions: Question[],
  hints: Record<string, string[]> = {}
): Promise<Record<string, GradingResult>>
```

Grade multiple free-form answers in batch.

**Parameters:**
- `answers`: Array of question IDs and answers
- `questions`: Array of question objects
- `hints`: Per-question hints for plagiarism detection (optional)

**Returns:** Object mapping question IDs to grading results

## Question Types

### Free-form Questions

Standard technical questions evaluating 3 criteria:
- Accuracy (35%)
- Practicality (35%)
- Depth (30%)

```typescript
{
  id: "q1",
  stem: "Explain the benefits of TypeScript",
  type: "free-form",
  hints: ["TypeScript adds static typing"],
  exemplarAnswer: "TypeScript provides...",
  domain: "Programming"
}
```

### Prompt-design Questions

Evaluate prompt quality with 4 criteria:
- Accuracy (25%)
- Practicality (25%)
- Depth (25%)
- Prompt Quality (25%)

```typescript
{
  id: "q2",
  stem: "Write a prompt to generate a product description",
  type: "prompt-design",
  hints: ["Include clear instructions"],
  domain: "Prompt Engineering"
}
```

## Implementation Details

### Current Implementation

- **Plagiarism Detection**: Uses Jaccard similarity on word sets as placeholder
- **Rubric Evaluation**: Uses heuristics based on word count and keyword patterns
- **Feedback Generation**: Template-based with criteria-specific suggestions

### Production Requirements

Replace with OpenAI API calls:

1. **Plagiarism Detection**:
   ```typescript
   // Use OpenAI embeddings API
   const embedding1 = await openai.embeddings.create({
     model: "text-embedding-3-small",
     input: answer
   });
   // Calculate cosine similarity
   ```

2. **Rubric Evaluation**:
   ```typescript
   // Use Structured Outputs with temperature=0
   const response = await openai.chat.completions.create({
     model: "gpt-4",
     temperature: 0,
     response_format: { type: "json_schema", ... },
     messages: [{ role: "system", content: rubricPrompt }, ...]
   });
   ```

3. **Feedback Generation**:
   ```typescript
   // Use LLM for personalized feedback
   const feedback = await openai.chat.completions.create({
     model: "gpt-4",
     temperature: 0,
     messages: [{ role: "system", content: feedbackPrompt }, ...]
   });
   ```

## Testing

Comprehensive test coverage (19 test cases):

- Plagiarism detection (3 tests)
- Rubric-based grading (4 tests)
- Feedback generation (2 tests)
- Examples generation (2 tests)
- Score calculation (4 tests)
- Batch grading (3 tests)

Run tests:
```bash
npm test src/features/issue-25
```

## Acceptance Criteria (DoD)

- ✅ Returns 0.0-1.0 score based on rubric
- ✅ Detects plagiarism and stops progression
- ✅ Provides detailed feedback and examples
- ⏳ Production: Replace with OpenAI API calls

## Related Issues

- Relates to #6 (EPIC 5: 採点・解説)
- Depends on #23 (Anti-reuse detection)
- Used by #29 (Test screen with immediate grading)

## Notes

This is a placeholder implementation using heuristics. In production:
1. Replace text similarity with OpenAI embeddings + cosine similarity
2. Replace heuristic grading with LLM-based evaluation using Structured Outputs (temperature=0)
3. Replace template feedback with LLM-generated personalized feedback
