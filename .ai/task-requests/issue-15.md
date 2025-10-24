# Code Generation Task Request

**Repository**: hughverine/1024_ax_skil-test
**Issue**: #15
**Title**: Issue 0-1: プロジェクト雛形の作成（Next.js + API Routes + Supabase + OpenAI）
**Mode**: Task Tool (Claude Code)

---

## Issue Content

## 親EPIC
Relates to #1 (EPIC 0: リポジトリ雛形 & 開発規約)

## 概要
Next.js + OpenAI API (GPT-5) + Supabase の雛形プロジェクトを作成します。

## Why
最小で動く骨格を最初に固める。

## タスク

### 1. Create Next App (App Router)
```bash
pnpm create next-app axcamp --ts --eslint --src-dir --use-pnpm
```

### 2. パッケージ導入
```bash
pnpm add openai zod yaml date-fns @supabase/supabase-js @supabase/ssr
pnpm add -D @types/yaml @types/node tsx vitest playwright
```

### 3. ディレクトリ規約
```
/app         (UI)
/app/api     (BFF)
/lib         (OpenAI/Supabaseクライアント, utils)
/core        (ドメイン: 出題/採点/補完/レポート)
/prompts     (system & assistant prompts)
/sql         (Supabase migration SQL)
/tests       (unit/e2e)
/scripts     (データ投入, インデクシング)
```

### 4. 環境変数テンプレ `.env.example`
```bash
OPENAI_API_KEY=
OPENAI_ORG_ID=
OPENAI_PROJECT_ID=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=
ADMIN_REPORT_TO=
PII_ENC_KEY=
REPORT_BASE_URL=
```

### 5. OpenAI Node SDK 初期化
```ts
// lib/openai.ts
import OpenAI from "openai";
export const oai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
```

### 6. Supabase Server クライアント
```ts
// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";
export const sbAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);
```

### 7. ヘルスチェックエンドポイント
```ts
// app/api/health/route.ts
export async function GET() {
  return Response.json({ status: "ok" });
}
```

## 受入基準 (DoD)
- [ ] `pnpm dev` で Next.js 起動する
- [ ] `/api/health` が 200 を返す
- [ ] OpenAI/Supabase クライアントが初期化エラーなく動作する
- [ ] ディレクトリ構造が規約通りに整備されている

## 参考資料
- [OpenAI Responses API](https://platform.openai.com/docs/api-reference/responses)
- [OpenAI Node SDK](https://github.com/openai/openai-node)

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

`src/features/issue-15/`

---

**Note**: このタスクはClaude Code Task toolモードで実行されています。
Claude Codeが直接コード生成を行い、高品質な実装を提供します。
