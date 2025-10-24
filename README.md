# AXCAMP - Miyabi Agent System

AI駆動テスト自動生成システム with Miyabi Agent Framework

## プロジェクト概要

このプロジェクトは、MiyabiフレームワークをベースにしたAutonomous Agentシステムを使用して、GitHub IssueからDAGを構築し、依存関係を考慮した並列実行を行います。

## 技術スタック

- **Agent Framework**: Miyabi (TypeScript版)
- **Runtime**: Node.js 18+
- **Package Manager**: npm/pnpm
- **言語**: TypeScript
- **GitHub API**: Octokit
- **AI**: Anthropic Claude (オプション)

## セットアップ

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env`ファイルを確認し、必要な環境変数を設定してください：

```bash
# 必須
GITHUB_TOKEN=your_github_token
REPOSITORY=owner/repo

# オプション
DEVICE_IDENTIFIER="Your Device Name"

# CodeGenAgent設定（デフォルト: Claude Code統合モード）
USE_TASK_TOOL=true                    # Claude Code統合モード（推奨・デフォルト）
# ANTHROPIC_API_KEY=your_anthropic_key  # Claude API直接使用時のみ（オプション）
```

### 3. GitHub Personal Access Tokenの作成

GitHub > Settings > Developer settings > Personal access tokens > Tokens (classic)

必要な権限:
- `repo` (Full control of private repositories)
- `workflow` (Update GitHub Action workflows)

## 使用方法

### Agentシステムのステータス確認

```bash
npm run agents:status
```

出力例:
```
╔═══════════════════════════════════════════════════════╗
║       Miyabi Agent Framework - Status Report         ║
╚═══════════════════════════════════════════════════════╝

📋 Environment Status
✓ GITHUB_TOKEN: Set
✓ REPOSITORY: hughverine/1024_ax_skil-test
✓ GitHub Connection: OK
✓ Open Issues: 37
```

### 単一Issue実行

```bash
npm run agents:parallel:exec -- --issue 15
```

### 複数Issue並列実行

```bash
npm run agents:parallel:exec -- --issues 15,16,17 --concurrency 3
```

### Dry run（確認のみ、変更なし）

```bash
npm run agents:parallel:exec -- --issue 15 --dry-run
```

### Claude Code統合モード（デフォルト・推奨）

```bash
# デフォルトでTask toolモードが有効です
npm run agents:parallel:exec -- --issue 15 --dry-run

# 明示的に指定する場合
USE_TASK_TOOL=true npm run agents:parallel:exec -- --issue 15 --dry-run
```

このモード（デフォルト）では：
- ✅ ANTHROPIC_API_KEYが不要
- ✅ Claude Code（AI）が対話的にコード生成
- ✅ タスクリクエストファイル（`.ai/task-requests/issue-N.md`）が生成される
- ✅ Claude Codeにタスク実行を依頼する形式
- ✅ より柔軟な対話型開発が可能

### オプション

| オプション | 説明 | デフォルト |
|-----------|------|-----------|
| `--issue <number>` | 単一Issue番号 | - |
| `--issues <n1,n2,...>` | 複数Issue番号（カンマ区切り） | - |
| `--concurrency <number>` | 並行実行数 | 2 |
| `--dry-run` | 実行のみ（変更なし） | false |

## プロジェクト構造

```
.
├── .ai/
│   ├── logs/                     # 実行ログ
│   ├── parallel-reports/         # 実行レポート
│   ├── execution-plan.md         # 実行計画
│   └── issue-dag.json           # Issue依存関係DAG
├── .claude/
│   ├── agents/                   # Agent設計書
│   │   ├── coordinator-agent.md
│   │   ├── codegen-agent.md
│   │   ├── review-agent.md
│   │   └── ...
│   └── commands/                 # スラッシュコマンド
│       ├── agent-run.md
│       └── ...
├── scripts/
│   ├── agents-parallel-executor.ts  # CoordinatorAgent実装
│   └── agents-status.ts             # ステータスチェッカー
├── package.json
├── tsconfig.json
├── .env
└── README.md
```

## 実行計画（DAG）

`.ai/execution-plan.md`に全22Issueの依存関係と実行計画が記載されています。

### レベル構造

- **Level 0**: プロジェクト基盤（Issue #15）
- **Level 1**: データベース基盤（Issue #16, #17）並列実行可能
- **Level 2**: データ投入（Issue #18）
- **Level 3**: LLM基盤（Issue #19, #20）並列実行可能
- **Level 4**: 出題エンジン（Issue #21, #22, #23）並列実行可能
- ...（以下省略）

### 並列実行グループ

- グループ1: Issue #16, #17（並列度2）
- グループ2: Issue #19, #20（並列度2）
- グループ3: Issue #21, #22, #23（並列度3）
- グループ4: Issue #24, #25（並列度2）
- グループ5: Issue #28, #29, #30, #31（並列度4）
- グループ6: Issue #32, #33, #34（並列度3）

## Agent System

### 実装済み（完全動作）

- ✅ **CoordinatorAgent**: タスク統括・DAG構築・並列実行制御
- ✅ **IssueAgent**: Issue分析・65ラベル体系による自動分類
- ✅ **CodeGenAgent**: AI駆動コード生成
  - **Task toolモード**（デフォルト）: `USE_TASK_TOOL=true`（Claude Code統合、API KEY不要）
  - **Claude API モード**（オプション）: `ANTHROPIC_API_KEY`使用（自動生成）
- ✅ **ReviewAgent**: コード品質レビュー・スコアリング（TypeScript/ESLint/Security）
- ✅ **PRAgent**: Pull Request自動作成（Conventional Commits準拠）

### 実行フロー

```
Issue → IssueAgent → CodeGenAgent → ReviewAgent → PRAgent
         ↓            ↓               ↓              ↓
      ラベル付与   コード生成      品質チェック    Draft PR作成
                              (80点以上で合格)
```

## 推定所要時間

- **並列実行**: 約7.5時間
- **順次実行**: 約20時間
- **効率改善**: 62.5%

## トラブルシューティング

### GitHub API エラー

```bash
❌ Failed to fetch issue #270: Not Found

解決策:
1. Issue番号が正しいか確認
2. GITHUB_TOKEN権限を確認（repo, workflow）
3. REPOSITORYが正しいか確認
```

### 環境変数が読み込まれない

```bash
npm run agents:status
```

で環境変数の状態を確認してください。

## ログ確認

```bash
# 実行ログ
cat .ai/logs/$(date +%Y-%m-%d).md

# 実行レポート
cat .ai/parallel-reports/*.json | jq
```

## 参考リンク

- **Miyabiフレームワーク**: https://github.com/ShunsukeHayashi/Miyabi
- **プロジェクトリポジトリ**: https://github.com/hughverine/1024_ax_skil-test

## ライセンス

Apache-2.0

---

🤖 Powered by Miyabi Agent Framework
