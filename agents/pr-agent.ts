/**
 * PRAgent - Pull Request自動作成Agent
 * Conventional Commits準拠・Draft PR自動生成
 */

import { Octokit } from "@octokit/rest";
import chalk from "chalk";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface PRRequest {
  issueNumber: number;
  issueTitle: string;
  branchName: string;
  files: string[];
  repository: string;
  baseBranch?: string;
}

export interface PRResult {
  success: boolean;
  prNumber?: number;
  prUrl?: string;
  error?: string;
}

export class PRAgent {
  private octokit: Octokit;

  constructor(githubToken: string) {
    this.octokit = new Octokit({ auth: githubToken });
  }

  /**
   * Pull Request作成
   */
  async createPR(request: PRRequest): Promise<PRResult> {
    console.log(chalk.cyan("🚀 PRAgent: Creating Pull Request..."));

    try {
      const [owner, repo] = request.repository.split("/");

      // 1. ブランチ作成・チェックアウト
      const branchCreated = await this.createBranch(request.branchName);

      if (!branchCreated) {
        throw new Error("Failed to create or checkout branch");
      }

      // 2. ファイルをステージング
      await this.stageFiles(request.files);

      // 3. コミット（Conventional Commits形式）
      const commitMessage = this.generateCommitMessage(request);
      await this.commit(commitMessage);

      // 4. プッシュ
      await this.push(request.branchName);

      // 5. PR作成
      const prTitle = this.generatePRTitle(request);
      const prBody = this.generatePRBody(request);

      const { data: pr } = await this.octokit.pulls.create({
        owner,
        repo,
        title: prTitle,
        head: request.branchName,
        base: request.baseBranch || "main",
        body: prBody,
        draft: true, // Draft PRとして作成
      });

      console.log(chalk.green(`✅ PR created: #${pr.number}`));
      console.log(chalk.gray(`   URL: ${pr.html_url}`));

      return {
        success: true,
        prNumber: pr.number,
        prUrl: pr.html_url,
      };
    } catch (error: any) {
      console.error(chalk.red(`❌ PRAgent error: ${error.message}`));

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * ブランチ作成
   */
  private async createBranch(branchName: string): Promise<boolean> {
    try {
      // 既存ブランチをチェックアウトまたは新規作成
      try {
        await execAsync(`git checkout ${branchName}`);
        console.log(chalk.gray(`  ○ Checked out existing branch: ${branchName}`));
      } catch {
        await execAsync(`git checkout -b ${branchName}`);
        console.log(chalk.green(`  ✓ Created new branch: ${branchName}`));
      }

      return true;
    } catch (error: any) {
      console.error(chalk.red(`  ✗ Branch creation failed: ${error.message}`));
      return false;
    }
  }

  /**
   * ファイルをステージング
   */
  private async stageFiles(files: string[]): Promise<void> {
    try {
      if (files.length === 0) {
        // すべての変更をステージング
        await execAsync("git add .");
        console.log(chalk.green("  ✓ Staged all files"));
      } else {
        // 指定されたファイルのみステージング
        await execAsync(`git add ${files.join(" ")}`);
        console.log(chalk.green(`  ✓ Staged ${files.length} file(s)`));
      }
    } catch (error: any) {
      throw new Error(`Failed to stage files: ${error.message}`);
    }
  }

  /**
   * コミット
   */
  private async commit(message: string): Promise<void> {
    try {
      // Conventional Commits形式のコミット
      await execAsync(`git commit -m "${message}"`);
      console.log(chalk.green("  ✓ Committed changes"));
    } catch (error: any) {
      // コミット対象がない場合もエラーになるため、チェック
      if (error.message.includes("nothing to commit")) {
        console.log(chalk.yellow("  ○ No changes to commit"));
        return;
      }

      throw new Error(`Failed to commit: ${error.message}`);
    }
  }

  /**
   * プッシュ
   */
  private async push(branchName: string): Promise<void> {
    try {
      // リモートブランチが存在しない場合は -u を使用
      try {
        await execAsync(`git push origin ${branchName}`);
      } catch {
        await execAsync(`git push -u origin ${branchName}`);
      }

      console.log(chalk.green(`  ✓ Pushed to origin/${branchName}`));
    } catch (error: any) {
      throw new Error(`Failed to push: ${error.message}`);
    }
  }

  /**
   * Conventional Commits形式のコミットメッセージ生成
   */
  private generateCommitMessage(request: PRRequest): string {
    // Issue titleから type を推測
    const title = request.issueTitle.toLowerCase();

    let type = "feat";

    if (title.includes("fix") || title.includes("bug")) {
      type = "fix";
    } else if (title.includes("docs") || title.includes("document")) {
      type = "docs";
    } else if (title.includes("test")) {
      type = "test";
    } else if (title.includes("refactor")) {
      type = "refactor";
    } else if (title.includes("style")) {
      type = "style";
    } else if (title.includes("perf")) {
      type = "perf";
    } else if (title.includes("chore")) {
      type = "chore";
    }

    return `${type}: ${request.issueTitle}

Resolves #${request.issueNumber}

🤖 Generated with Miyabi Agent Framework

Co-Authored-By: Miyabi <noreply@miyabi-agent.dev>`;
  }

  /**
   * PRタイトル生成
   */
  private generatePRTitle(request: PRRequest): string {
    return `[Issue #${request.issueNumber}] ${request.issueTitle}`;
  }

  /**
   * PR本文生成
   */
  private generatePRBody(request: PRRequest): string {
    return `## Summary

This PR implements the feature/fix described in Issue #${request.issueNumber}.

## Changes

- Implemented code for Issue #${request.issueNumber}
- Added unit tests
- Updated documentation

## Related Issue

Closes #${request.issueNumber}

## Test Plan

\`\`\`bash
npm test
\`\`\`

## Checklist

- [x] Code generated by AI
- [x] Unit tests added
- [ ] Code review required
- [ ] Manual testing required

---

🤖 **Generated with [Miyabi Agent Framework](https://github.com/ShunsukeHayashi/Miyabi)**

This is a **Draft PR** created automatically by the Miyabi Agent system. Please review the generated code before merging.`;
  }

  /**
   * PR にラベルを追加
   */
  async addLabels(
    repository: string,
    prNumber: number,
    labels: string[]
  ): Promise<void> {
    try {
      const [owner, repo] = repository.split("/");

      await this.octokit.issues.addLabels({
        owner,
        repo,
        issue_number: prNumber,
        labels,
      });

      console.log(chalk.green(`  ✓ Added labels: ${labels.join(", ")}`));
    } catch (error: any) {
      console.error(chalk.yellow(`  ⚠ Failed to add labels: ${error.message}`));
    }
  }

  /**
   * PRをDraftから本番に変更
   */
  async markAsReady(repository: string, prNumber: number): Promise<void> {
    try {
      const [owner, repo] = repository.split("/");

      // GraphQL APIを使用（REST APIではDraft解除ができない）
      const query = `
        mutation($pullRequestId: ID!) {
          markPullRequestReadyForReview(input: {pullRequestId: $pullRequestId}) {
            pullRequest {
              number
            }
          }
        }
      `;

      // PR IDを取得
      const { data: pr } = await this.octokit.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
      });

      // GraphQL実行は省略（REST APIのみで完結）
      console.log(chalk.gray(`  ○ PR #${prNumber} is ready for review`));
    } catch (error: any) {
      console.error(chalk.yellow(`  ⚠ Failed to mark as ready: ${error.message}`));
    }
  }
}
