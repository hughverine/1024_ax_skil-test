# Issue #22: MCQ入力正規化モジュール

## 概要
MCQ（多肢選択）の入力を正規化するモジュール。受講者の多様な入力形式に対応し、公平な採点を実現します。

## 機能

### サポートする入力形式
- `"a, c"` → `["a", "c"]` (カンマ区切り)
- `"A C"` → `["a", "c"]` (スペース区切り)
- `"all"` / `"全部"` → 全選択肢
- `"A-D"` / `"A〜D"` → `["a", "b", "c", "d"]` (範囲指定)
- 選択肢テキストのコピペ → テキストマッチング

### 主な関数

#### `normalizeMcq(input: string, choices?: string[])`
標準的なMCQ入力正規化を行います。

```typescript
const result = normalizeMcq("a, c");
// { normalized: ["a", "c"], isValid: true, original: "a, c" }
```

#### `normalizeMcqWithText(input: string, choiceTexts: Record<string, string>)`
選択肢テキストとのマッチングもサポートします。

```typescript
const result = normalizeMcqWithText("TypeScript", {
  A: "TypeScript is a typed superset",
  B: "Python is a language",
});
// { normalized: ["a"], isValid: true, warnings: ["Matched based on choice text content"] }
```

#### `validateAnswer(normalized: string[], correctAnswers: string[])`
正規化された回答と正解を比較します。

```typescript
const isCorrect = validateAnswer(["a", "c"], ["A", "C"]);
// true
```

## テスト
```bash
npm test -- issue-22
```

## 参考
- タスクリクエスト: `.ai/task-requests/issue-22.md`
- 関連Issue: #5 (EPIC 4: 出題エンジン)
