# Code Generation Task Request

**Repository**: hughverine/1024_ax_skil-test
**Issue**: #20
**Title**: Issue 3-2: Structured Outputs（JSON Schema）で I/O を厳密化
**Mode**: Task Tool (Claude Code)

---

## Issue Content

## 親EPIC
Relates to #4 (EPIC 3: プロンプト群 & LLM I/F)

## 概要
Structured Outputs（JSON Schema）でLLMの入出力を厳密化します。

## Why
決定論的採点・UIバインディングの安定化のため。

## タスク

### 1. JSON Schema定義 (`/schemas/`)
```ts
// schemas/question.ts
export const QuestionSchema = {
  type: "object",
  required: ["id","type","stem","domain","difficulty"],
  properties: {
    id: { type: "string" },
    type: { enum: ["mcq","free"] },
    stem: { type: "string" },
    choices: { type: "array", items: { type: "string" } },
    key: { type: "array", items: { type: "string" } },
    domain: { type: "string" },
    difficulty: { enum: ["basic","applied"] },
    meta: { type: "object", additionalProperties: true }
  },
  additionalProperties: false
} as const;
```

他にも以下のスキーマを定義：
- `ScoringSchema` - 採点結果
- `FollowupSchema` - 補完質問
- `ReportSchema` - レポート

### 2. Responses API ラッパー関数
```ts
// core/llm/responses.ts
import { oai } from "@/lib/openai";

export async function callJSON<T>(
  model: string,
  system: string,
  user: any,
  schema: any
): Promise<T> {
  const res = await oai.responses.create({
    model,
    input: [
      { role: "system", content: system },
      { role: "user", content: [{ type: "input_text", text: JSON.stringify(user) }] }
    ],
    temperature: 0,
    top_p: 0,
    response_format: {
      type: "json_schema",
      json_schema: { name: "Schema", schema, strict: true }
    },
    max_output_tokens: 800
  });
  return JSON.parse(res.output_text!);
}
```

## 受入基準 (DoD)
- [ ] JSON Schema（Zod）が `/schemas/` に定義されている
- [ ] Responses API呼び出しのラッパー関数が実装されている
- [ ] `temperature=0, top_p=0` が適用されている
- [ ] `strict: true` でスキーマ準拠が保証されている

## 参考資料
- [OpenAI Responses API](https://platform.openai.com/docs/api-reference/responses)
- [Structured Outputs](https://openai.com/index/introducing-structured-outputs-in-the-api/)

---

## Task

Claude Codeに依頼: 上記のIssue内容に基づいて、必要なコードファイルを生成してください。

### 生成すべきファイル

1. 実装ファイル（TypeScript）
2. テストファイル（Vitest）
3. READMEドキュメント

### 要件

- TypeScriptベストプラクティスに従う
- 適切なエラーハンドリング
- 複雑なロジックにはコメント
- モダンなES6+構文使用
- プロジェクト構造に従う

---

## 実装場所

`src/features/issue-20/`

---

**Note**: このタスクはClaude Code Task toolモードで実行されています。
Claude Codeが直接コード生成を行い、高品質な実装を提供します。
