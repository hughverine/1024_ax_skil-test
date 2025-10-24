# 1024_ax_skil-test - Claude Code Context

## ⚠️ 【厳守事項】Claude Code × Miyabi 実行ルール

**このプロジェクトでは、Claude CodeがMCP経由でMiyabiを実行し、Miyabiが実装を行います。**

### 🚫 やってはいけないこと

1. **Bashツールで直接Miyabi CLIコマンドを実行しない**
   - ❌ `npx miyabi agent run coordinator --issue 15` （Bashツール経由）
   - ❌ `npx miyabi auto` （Bashツール経由）
   - 理由: 外部ANTHROPIC_API_KEYが必要になり、認証エラーが発生する

2. **Claude Codeが直接実装しない**
   - ❌ Write/Editツールで直接コード生成
   - ❌ ファイル作成・編集を自分で行う
   - 理由: すべての実装はMiyabiに委譲する

### ✅ 正しい実行方法

**MCP経由でMiyabiを実行 → Claude Code上でMiyabiが動作**

```
1. Claude CodeがGitHub Issueを読む（gh issue view <番号>）
2. Claude CodeがMCPツール経由でMiyabiを実行
   ↓
   MCPツール: miyabi__agent_run({ issueNumber: 15 })
   ↓
3. Miyabi（Claude Code上で動作）が実装を実行
4. Miyabiが動作確認・テスト実行
5. Miyabiがコミット・Push・PR作成
```

### 実行フロー例

**正しい方法: MCPツールを使用**

```javascript
// ⭕ MCPツール経由でMiyabiを実行（Claude Code上で動作）
miyabi__agent_run({ issueNumber: 15 })

// または複数Issue並列処理
miyabi__agent_run({
  issueNumbers: [15, 16, 17],
  concurrency: 3
})
```

**間違った方法: Bashツールで直接実行**

```bash
# ❌ これはやらない（外部APIキーが必要になる）
npx miyabi agent run --issue 15
```

### Claude Codeの責務

- ✅ GitHub Issueの確認・読み取り
- ✅ **MCPツール経由でMiyabiを実行**
- ✅ ユーザーとのコミュニケーション
- ✅ Miyabiの実行結果を確認・報告
- ❌ **Bashツールで直接Miyabi CLIを実行しない**
- ❌ **直接的なコード生成・ファイル作成は禁止（Miyabiに委譲）**

### Issue処理の優先順位

**必ずIssue番号順（EPIC順）に処理すること**

- Issue #1（EPIC 0）→ Issue #15（Issue 0-1）→ Issue #16（Issue 1-1）→ ...
- 優先度ラベル（P0/P1/P2）は無視して、番号順に処理
- 依存関係があるため、順番を守ることが重要

---

## プロジェクト概要

**1024_ax_skil-test** - Miyabiフレームワークで構築された自律型開発プロジェクト

このプロジェクトは識学理論(Shikigaku Theory)とAI Agentsを組み合わせた自律型開発環境で運用されています。

## 🌸 Miyabi Framework

### 7つの自律エージェント

1. **CoordinatorAgent** - タスク統括・並列実行制御
   - DAG（Directed Acyclic Graph）ベースのタスク分解
   - Critical Path特定と並列実行最適化

2. **IssueAgent** - Issue分析・ラベル管理
   - 識学理論65ラベル体系による自動分類
   - タスク複雑度推定（小/中/大/特大）

3. **CodeGenAgent** - AI駆動コード生成
   - Claude Sonnet 4による高品質コード生成
   - TypeScript strict mode完全対応

4. **ReviewAgent** - コード品質判定
   - 静的解析・セキュリティスキャン
   - 品質スコアリング（100点満点、80点以上で合格）

5. **PRAgent** - Pull Request自動作成
   - Conventional Commits準拠
   - Draft PR自動生成

6. **DeploymentAgent** - CI/CDデプロイ自動化
   - 自動デプロイ・ヘルスチェック
   - 自動Rollback機能

7. **TestAgent** - テスト自動実行
   - テスト実行・カバレッジレポート
   - 80%+カバレッジ目標

## GitHub OS Integration

このプロジェクトは「GitHubをOSとして扱う」設計思想で構築されています:

### 自動化されたワークフロー

1. **Issue作成** → IssueAgentが自動ラベル分類
2. **CoordinatorAgent** → タスクをDAG分解、並列実行プラン作成
3. **CodeGenAgent** → コード実装、テスト生成
4. **ReviewAgent** → 品質チェック（80点以上で次へ）
5. **TestAgent** → テスト実行（カバレッジ確認）
6. **PRAgent** → Draft PR作成
7. **DeploymentAgent** → マージ後に自動デプロイ

**全工程が自律実行、人間の介入は最小限。**

## ラベル体系（識学理論準拠）

### 10カテゴリー、53ラベル

- **type:** bug, feature, refactor, docs, test, chore, security
- **priority:** P0-Critical, P1-High, P2-Medium, P3-Low
- **state:** pending, analyzing, implementing, reviewing, testing, deploying, done
- **agent:** codegen, review, deployment, test, coordinator, issue, pr
- **complexity:** small, medium, large, xlarge
- **phase:** planning, design, implementation, testing, deployment
- **impact:** breaking, major, minor, patch
- **category:** frontend, backend, infra, dx, security
- **effort:** 1h, 4h, 1d, 3d, 1w, 2w
- **blocked:** waiting-review, waiting-deployment, waiting-feedback

## 開発ガイドライン

### TypeScript設定

```json
{
  "compilerOptions": {
    "strict": true,
    "module": "ESNext",
    "target": "ES2022"
  }
}
```

### セキュリティ

- **機密情報は環境変数で管理**: `GITHUB_TOKEN`, `ANTHROPIC_API_KEY`
- **.env を .gitignore に含める**
- **Webhook検証**: HMAC-SHA256署名検証

### テスト

```bash
npm test                    # 全テスト実行
npm run test:watch          # Watch mode
npm run test:coverage       # カバレッジレポート
```

目標: 80%+ カバレッジ

## 使用方法

### Issue作成（Claude Code推奨）

```bash
# Claude Code から直接実行
gh issue create --title "機能追加: ユーザー認証" --body "JWT認証を実装"
```

または Claude Code のスラッシュコマンド:

```
/create-issue
```

### 状態確認

```bash
npx miyabi status          # 現在の状態
npx miyabi status --watch  # リアルタイム監視
```

### Agent実行

```bash
/agent-run                 # Claude Code から実行
```

## プロジェクト構造

```
1024_ax_skil-test/
├── .claude/               # Claude Code設定
│   ├── agents/           # Agent定義
│   ├── commands/         # カスタムコマンド
│   └── settings.json     # Claude設定
├── .github/
│   └── workflows/        # 26+ GitHub Actions
├── src/                  # ソースコード
├── tests/                # テストコード
├── CLAUDE.md             # このファイル
└── package.json
```

## カスタムスラッシュコマンド

Claude Code で以下のコマンドが使用可能:

- `/test` - プロジェクト全体のテストを実行
- `/generate-docs` - コードからドキュメント自動生成
- `/create-issue` - Agent実行用Issueを対話的に作成
- `/deploy` - デプロイ実行
- `/verify` - システム動作確認（環境・コンパイル・テスト）
- `/security-scan` - セキュリティ脆弱性スキャン実行
- `/agent-run` - Autonomous Agent実行（Issue自動処理パイプライン）

## 識学理論（Shikigaku Theory）5原則

1. **責任の明確化** - 各AgentがIssueに対する責任を負う
2. **権限の委譲** - Agentは自律的に判断・実行可能
3. **階層の設計** - CoordinatorAgent → 各専門Agent
4. **結果の評価** - 品質スコア、カバレッジ、実行時間で評価
5. **曖昧性の排除** - DAGによる依存関係明示、状態ラベルで進捗可視化

## 環境変数

```bash
# GitHub Personal Access Token（必須）
GITHUB_TOKEN=ghp_xxxxx

# Anthropic API Key（必須 - Agent実行時）
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

## サポート

- **Framework**: [Miyabi](https://github.com/ShunsukeHayashi/Autonomous-Operations)
- **Documentation**: README.md
- **Issues**: GitHub Issues で管理

---

🌸 **Miyabi** - Beauty in Autonomous Development

*このファイルは Claude Code が自動的に参照します。プロジェクトの変更に応じて更新してください。*
