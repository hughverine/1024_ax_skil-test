/**
 * Task Tool Helper - Claude Code統合
 *
 * USE_TASK_TOOL=trueの場合、Claude Code（私）が直接コード生成を行います。
 * これにより、ANTHROPIC_API_KEY不要で高品質なコード生成が可能です。
 */

import * as fs from "fs/promises";
import * as path from "path";
import chalk from "chalk";

export interface TaskRequest {
  issueNumber: number;
  issueTitle: string;
  issueBody: string;
  repository: string;
}

export interface TaskResult {
  success: boolean;
  files: Array<{
    path: string;
    content: string;
    description: string;
  }>;
  message: string;
}

/**
 * Task Toolモード: Claude Codeに実装タスクを依頼
 *
 * このモードでは、自動化スクリプト実行前にClaude Codeが
 * Issue内容を確認してコードを生成します。
 */
export async function requestTaskFromClaudeCode(request: TaskRequest): Promise<TaskResult> {
  console.log(chalk.cyan("📋 Task Tool Mode: Preparing task request for Claude Code..."));
  console.log();
  console.log(chalk.blue(`Repository: ${request.repository}`));
  console.log(chalk.blue(`Issue #${request.issueNumber}: ${request.issueTitle}`));
  console.log();

  // Task リクエストファイルを生成
  const taskDir = ".ai/task-requests";
  await fs.mkdir(taskDir, { recursive: true });

  const taskFile = path.join(taskDir, `issue-${request.issueNumber}.md`);

  const taskContent = `# Code Generation Task Request

**Repository**: ${request.repository}
**Issue**: #${request.issueNumber}
**Title**: ${request.issueTitle}
**Mode**: Task Tool (Claude Code)

---

## Issue Content

${request.issueBody}

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

\`src/features/issue-${request.issueNumber}/\`

---

**Note**: このタスクはClaude Code Task toolモードで実行されています。
Claude Codeが直接コード生成を行い、高品質な実装を提供します。
`;

  await fs.writeFile(taskFile, taskContent, "utf-8");

  console.log(chalk.green(`✓ Task request generated: ${taskFile}`));
  console.log();
  console.log(chalk.yellow("━".repeat(80)));
  console.log(chalk.yellow.bold("📢 Claude Code Task Tool Mode"));
  console.log(chalk.yellow("━".repeat(80)));
  console.log();
  console.log(chalk.white("このモードでは、Claude Code（AI）が直接コード生成を行います。"));
  console.log();
  console.log(chalk.white("実行方法:"));
  console.log(chalk.gray("  1. 上記のタスクファイルを確認"));
  console.log(chalk.gray("  2. Claude Codeに実装を依頼"));
  console.log(chalk.gray("  3. 生成されたコードを確認・レビュー"));
  console.log(chalk.gray("  4. 必要に応じて調整"));
  console.log();
  console.log(chalk.white("利点:"));
  console.log(chalk.green("  ✓ ANTHROPIC_API_KEY不要"));
  console.log(chalk.green("  ✓ 対話的なコード生成"));
  console.log(chalk.green("  ✓ リアルタイムフィードバック"));
  console.log(chalk.green("  ✓ コンテキスト理解度が高い"));
  console.log();
  console.log(chalk.yellow("━".repeat(80)));
  console.log();

  // Note: Task toolモードでは、実際のコード生成は
  // Claude Codeがこのメッセージを見て手動で行います

  return {
    success: true,
    files: [
      {
        path: `src/features/issue-${request.issueNumber}/index.ts`,
        content: `// TODO: Claude Codeが生成したコードをここに配置
// Task request: ${taskFile}`,
        description: "Main implementation (awaiting Claude Code generation)",
      },
      {
        path: `src/features/issue-${request.issueNumber}/index.test.ts`,
        content: `// TODO: Claude Codeが生成したテストコードをここに配置`,
        description: "Unit tests (awaiting Claude Code generation)",
      },
      {
        path: `src/features/issue-${request.issueNumber}/README.md`,
        content: `# Issue #${request.issueNumber}: ${request.issueTitle}

**Status**: Awaiting Claude Code implementation

Task request file: \`${taskFile}\`

---

Claude Code Task toolモードで実装中です。
`,
        description: "Documentation (awaiting Claude Code generation)",
      },
    ],
    message: `Task request created. Claude Code will generate the implementation interactively.`,
  };
}
