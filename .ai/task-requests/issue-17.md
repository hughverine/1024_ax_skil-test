# Code Generation Task Request

**Repository**: hughverine/1024_ax_skil-test
**Issue**: #17
**Title**: Issue 1-2: RLS/Storage/バケット設計
**Mode**: Task Tool (Claude Code)

---

## Issue Content

## 親EPIC
Relates to #2 (EPIC 1: Supabase スキーマ & RLS/Storage/インデックス)

## 概要
Row Level Security (RLS) を全テーブルに適用し、Storage バケット設定を行います。

## Why
セキュアなデータアクセス制御を実現するため。

## タスク

### 1. RLS有効化
```sql
alter table participants enable row level security;
alter table test_sessions enable row level security;
alter table questions enable row level security;
alter table answers enable row level security;
alter table followup_questions enable row level security;
alter table followup_answers enable row level security;
alter table reports enable row level security;
alter table emails enable row level security;
alter table knowledge_sources enable row level security;
alter table knowledge_chunks enable row level security;
```

基本は**サービスロール経由のみ**で操作。

### 2. Storage バケット `reports`（Private）作成
- バケット名: `reports`
- アクセス: Private
- RLSで**署名付きURLのみ**許可

### 3. 署名URL発行
BFFのみが署名URL発行可能（サーバ側サービスキー使用）。

## 受入基準 (DoD)
- [ ] 全テーブルでRLSが有効化されている
- [ ] `reports` バケットがPrivateで作成済み
- [ ] BFFからのみPDFのアップロード/取得ができる

## 参考資料
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Storage Buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals)

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

`src/features/issue-17/`

---

**Note**: このタスクはClaude Code Task toolモードで実行されています。
Claude Codeが直接コード生成を行い、高品質な実装を提供します。
