# Issue #23: 既存問題の流用/類似検出

## 概要
生成された問題が既存問題の流用でないかを5-gram Jaccard類似度で検出し、類似度が高い場合は再生成します。

## 機能

### `detectSimilarity(newQuestion, existingQuestions, threshold?, ngramSize?)`
新しい問題と既存問題の類似度を計算します。

```typescript
const result = detectSimilarity("What is TypeScript?", existingQuestions, 0.7);
// { similarity: 0.85, isDuplicate: true, threshold: 0.7, method: "jaccard" }
```

### `generateWithRetry(generateFn, checkFn, maxRetries?, fallbackQuestion?)`
重複検出と再生成のリトライロジックを提供します。

```typescript
const result = await generateWithRetry(
  () => generateQuestion(),
  (q) => checkSimilarity(q),
  3,
  fallbackQuestion
);
```

## 仕様
- **5-gram Jaccard類似度**: テキストベースの類似度計算
- **しきい値**: デフォルト0.7（カスタマイズ可能）
- **最大リトライ**: 3回
- **フォールバック**: 静的予備問題を使用

## テスト
```bash
npm test -- issue-23
```

## 参考
- タスクリクエスト: `.ai/task-requests/issue-23.md`
- 関連Issue: #5 (EPIC 4: 出題エンジン)
