# Code Generation Task Request

**Repository**: hughverine/1024_ax_skil-test
**Issue**: #16
**Title**: Issue 1-1: データモデルの作成（SQLマイグレーション）
**Mode**: Task Tool (Claude Code)

---

## Issue Content

## 親EPIC
Relates to #2 (EPIC 1: Supabase スキーマ & RLS/Storage/インデックス)

## 概要
Supabaseのテーブル定義とpgvectorインデックスを作成します。

## Why
仕様 §9 相当のデータモデルをSupabaseで実体化。

## タスク

### 1. 拡張有効化
```sql
create extension if not exists pgcrypto;
create extension if not exists vector with schema extensions;
```

### 2. テーブル作成
- `participants` - 受講者情報（PII暗号化）
- `test_sessions` - テストセッション
- `questions` / `answers` - 問題と回答
- `followup_questions` / `followup_answers` - 補完質問
- `reports` - レポート
- `emails` - メール送信履歴
- `knowledge_sources` / `knowledge_chunks` - RAG用ナレッジ

詳細なDDLは要件定義の「EPIC 1 — Issue 1-1」セクションを参照。

### 3. pgvector インデックス
```sql
create index on knowledge_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);
```

## 受入基準 (DoD)
- [ ] SQL実行後、全テーブルが作成済み
- [ ] ivfflat インデックスが作成済み
- [ ] pgvector拡張が有効化されている

## 参考資料
- [Supabase pgvector](https://supabase.com/docs/guides/database/extensions/pgvector)
- [Supabase Semantic Search](https://supabase.com/docs/guides/ai/semantic-search)

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

`src/features/issue-16/`

---

**Note**: このタスクはClaude Code Task toolモードで実行されています。
Claude Codeが直接コード生成を行い、高品質な実装を提供します。
