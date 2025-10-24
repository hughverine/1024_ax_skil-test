# Code Generation Task Request

**Repository**: hughverine/1024_ax_skil-test
**Issue**: #18
**Title**: Issue 2-1: YAML → チャンク → 埋め込み → Supabase格納
**Mode**: Task Tool (Claude Code)

---

## Issue Content

## 親EPIC
Relates to #3 (EPIC 2: ナレッジ読み込み & ベクター化（RAG）)

## 概要
YAML形式のナレッジソースを読み込み、チャンク分割してOpenAI Embeddingsでベクトル化し、Supabaseに格納します。

## Why
出題時の**RAG土台**を作る。

## タスク

### 1. `/scripts/load_knowledge.ts` 作成
- `/prompts/curriculum/*.yaml` を読み取り
- YAMLパース（`yaml`パッケージ）
- `type: knowledge`/`summary`/`key_points`/`解説`など**知識・解説のみ**抽出

### 2. チャンク分割
- 1,000〜2,000文字を目安
- オーバーラップ付きで分割（200文字程度）

### 3. OpenAI Embeddings
```ts
const resp = await oai.embeddings.create({
  model: "text-embedding-3-large",
  input: chunks,
});
```

### 4. Supabase格納
- `knowledge_sources` にYAMLファイル情報を保存
- `knowledge_chunks` にチャンク + embedding を保存
- メタ（source_id, section, domainタグ）付与

## 受入基準 (DoD)
- [ ] 全YAMLのロードが成功
- [ ] `knowledge_chunks` に件数>0
- [ ] 各チャンクにembedding（3072次元）が付与されている

## 参考資料
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [Supabase × OpenAI Cookbook](https://cookbook.openai.com/examples/vector_databases/supabase/semantic-search)

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

`src/features/issue-18/`

---

**Note**: このタスクはClaude Code Task toolモードで実行されています。
Claude Codeが直接コード生成を行い、高品質な実装を提供します。
