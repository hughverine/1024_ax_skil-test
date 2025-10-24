# Code Generation Task Request

**Repository**: hughverine/1024_ax_skil-test
**Issue**: #19
**Title**: Issue 3-1: プロンプト外部化とバージョン管理
**Mode**: Task Tool (Claude Code)

---

## Issue Content

## 親EPIC
Relates to #4 (EPIC 3: プロンプト群 & LLM I/F)

## 概要
システムプロンプトを外部ファイル化し、役割別に分離してバージョン管理します。

## Why
プロンプトの保守性向上とバージョン管理を実現するため。

## タスク

### 1. プロンプトファイル作成 (`/prompts/`)
- `system_test_engine_v1.md` - メインシステムプロンプト（最終版）
- `assistant_question_writer_v1.md` - 出題専用（30問配分・重み・カテゴリ分散・既存問題排除）
- `assistant_mcq_normalizer_v1.md` - 選択入力解釈
- `assistant_scoring_freeform_v1.md` - ルーブリック採点・解説生成
- `assistant_followup_v1.md` - 補完質問生成・重み補正ルール
- `assistant_report_v1.md` - 総合レポート要約/NLG

### 2. 設定
すべてのプロンプトに以下を明示：
- **temperature=0**
- **top_p=0**

## 受入基準 (DoD)
- [ ] 全プロンプトが `/prompts/` に配置されている
- [ ] 各プロンプトに役割と設定が明記されている
- [ ] バージョン番号が付与されている（v1）

## 参考資料
- 要件定義の最終版システムプロンプト

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

`src/features/issue-19/`

---

**Note**: このタスクはClaude Code Task toolモードで実行されています。
Claude Codeが直接コード生成を行い、高品質な実装を提供します。
