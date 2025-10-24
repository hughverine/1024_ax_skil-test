/**
 * IssueAgent - Issue分析・ラベル付与Agent
 * 組織設計原則65ラベル体系による自動分類
 */

import { Octokit } from "@octokit/rest";
import chalk from "chalk";

export interface Issue {
  number: number;
  title: string;
  body: string;
  labels: Array<{ name: string }>;
}

export interface LabelAnalysisResult {
  recommendedLabels: string[];
  confidence: number; // 0-1
  reasoning: string;
}

export class IssueAgent {
  private octokit: Octokit;

  // ラベル分類ルール
  private labelRules = {
    type: {
      "✨ type:feature": ["feature", "new", "add", "implement"],
      "🐛 type:bug": ["bug", "fix", "error", "issue"],
      "📚 type:docs": ["docs", "document", "readme"],
      "🧪 type:test": ["test", "testing", "spec"],
      "♻️ type:refactor": ["refactor", "cleanup", "improve"],
      "🎨 type:style": ["style", "format", "ui", "design"],
      "⚡ type:perf": ["perf", "performance", "optimize"],
      "🔧 type:chore": ["chore", "maintenance"],
    },
    priority: {
      "📊 priority:P0-Critical": ["critical", "urgent", "blocker", "blocking"],
      "⚠️ priority:P1-High": ["high", "important"],
      "📊 priority:P2-Medium": ["medium"],
      "📉 priority:P3-Low": ["low", "minor"],
      "💡 priority:P4-Trivial": ["trivial", "nice to have"],
    },
    state: {
      "📥 state:pending": ["pending", "new"],
      "🚧 state:in-progress": ["in progress", "wip"],
      "✅ state:completed": ["completed", "done"],
      "❌ state:blocked": ["blocked"],
    },
    phase: {
      "🎯 phase:planning": ["planning", "design"],
      "🎯 phase:development": ["development", "coding"],
      "🎯 phase:review": ["review", "testing"],
      "🎯 phase:deployment": ["deployment", "deploy"],
    },
    agent: {
      "🤖 agent:codegen": ["codegen", "code generation"],
      "🤖 agent:review": ["review", "quality"],
      "🤖 agent:pr": ["pr", "pull request"],
      "🤖 agent:deploy": ["deploy", "deployment"],
    },
    special: {
      "🔒 special:security": ["security", "vulnerability", "rls"],
      "🎉 enhancement": ["enhancement", "improvement"],
      "❓ question": ["question", "help"],
      "💾 database": ["database", "sql", "schema"],
      "🔌 api": ["api", "endpoint"],
      "🎨 design": ["design", "ui", "ux"],
    },
  };

  constructor(githubToken: string) {
    this.octokit = new Octokit({ auth: githubToken });
  }

  /**
   * Issueを分析してラベルを推奨
   */
  analyzeIssue(issue: Issue): LabelAnalysisResult {
    const recommendedLabels: Set<string> = new Set();
    const text = `${issue.title} ${issue.body}`.toLowerCase();

    let totalMatches = 0;
    let categoryMatches = 0;

    // 各カテゴリのラベルを判定
    for (const [category, labels] of Object.entries(this.labelRules)) {
      let categoryMatched = false;

      for (const [label, keywords] of Object.entries(labels)) {
        for (const keyword of keywords) {
          if (text.includes(keyword.toLowerCase())) {
            recommendedLabels.add(label);
            totalMatches++;
            categoryMatched = true;
            break; // 同じラベルで複数マッチしても1回のみカウント
          }
        }
      }

      if (categoryMatched) {
        categoryMatches++;
      }
    }

    // デフォルトラベル
    if (!Array.from(recommendedLabels).some((l) => l.startsWith("📊 priority:"))) {
      recommendedLabels.add("📊 priority:P2-Medium");
    }

    if (!Array.from(recommendedLabels).some((l) => l.startsWith("📥 state:"))) {
      recommendedLabels.add("📥 state:pending");
    }

    if (!Array.from(recommendedLabels).some((l) => l.startsWith("🎯 phase:"))) {
      recommendedLabels.add("🎯 phase:planning");
    }

    // Agentの自動判定
    if (text.includes("implement") || text.includes("create") || text.includes("add")) {
      recommendedLabels.add("🤖 agent:codegen");
    }

    // 信頼度計算
    const confidence = Math.min(1, (totalMatches + categoryMatches) / 10);

    return {
      recommendedLabels: Array.from(recommendedLabels),
      confidence,
      reasoning: `Matched ${totalMatches} keywords across ${categoryMatches} categories`,
    };
  }

  /**
   * Issueにラベルを付与
   */
  async addLabels(
    repository: string,
    issueNumber: number,
    labels: string[]
  ): Promise<void> {
    try {
      const [owner, repo] = repository.split("/");

      await this.octokit.issues.addLabels({
        owner,
        repo,
        issue_number: issueNumber,
        labels,
      });

      console.log(chalk.green(`✅ Added labels to Issue #${issueNumber}: ${labels.join(", ")}`));
    } catch (error: any) {
      console.error(chalk.red(`❌ Failed to add labels: ${error.message}`));
      throw error;
    }
  }

  /**
   * Issueから既存ラベルを削除
   */
  async removeLabel(
    repository: string,
    issueNumber: number,
    labelName: string
  ): Promise<void> {
    try {
      const [owner, repo] = repository.split("/");

      await this.octokit.issues.removeLabel({
        owner,
        repo,
        issue_number: issueNumber,
        name: labelName,
      });

      console.log(chalk.gray(`  ○ Removed label: ${labelName}`));
    } catch (error: any) {
      // ラベルが存在しない場合はエラーを無視
      if (!error.message.includes("Not Found")) {
        console.error(chalk.yellow(`  ⚠ Failed to remove label: ${error.message}`));
      }
    }
  }

  /**
   * Issueのラベルを更新（既存削除 + 新規追加）
   */
  async updateLabels(
    repository: string,
    issueNumber: number,
    newLabels: string[]
  ): Promise<void> {
    try {
      const [owner, repo] = repository.split("/");

      // 既存ラベルを取得
      const { data: issue } = await this.octokit.issues.get({
        owner,
        repo,
        issue_number: issueNumber,
      });

      const existingLabels = issue.labels.map((l) =>
        typeof l === "string" ? l : l.name || ""
      );

      // 既存ラベルを削除
      for (const label of existingLabels) {
        if (label) {
          await this.removeLabel(repository, issueNumber, label);
        }
      }

      // 新しいラベルを追加
      await this.addLabels(repository, issueNumber, newLabels);

      console.log(chalk.green(`✅ Updated labels for Issue #${issueNumber}`));
    } catch (error: any) {
      console.error(chalk.red(`❌ Failed to update labels: ${error.message}`));
      throw error;
    }
  }

  /**
   * リポジトリに必要なラベルを作成
   */
  async ensureLabelsExist(repository: string): Promise<void> {
    const [owner, repo] = repository.split("/");

    // 全ラベルを収集
    const allLabels = new Set<string>();

    for (const labels of Object.values(this.labelRules)) {
      for (const label of Object.keys(labels)) {
        allLabels.add(label);
      }
    }

    console.log(chalk.cyan(`📋 Ensuring ${allLabels.size} labels exist in ${repository}...`));

    for (const labelName of allLabels) {
      try {
        // ラベルが存在するか確認
        await this.octokit.issues.getLabel({
          owner,
          repo,
          name: labelName,
        });

        console.log(chalk.gray(`  ✓ Label exists: ${labelName}`));
      } catch (error: any) {
        if (error.status === 404) {
          // ラベルが存在しない場合は作成
          try {
            await this.octokit.issues.createLabel({
              owner,
              repo,
              name: labelName,
              color: this.getLabelColor(labelName),
              description: this.getLabelDescription(labelName),
            });

            console.log(chalk.green(`  ✓ Created label: ${labelName}`));
          } catch (createError: any) {
            console.error(chalk.red(`  ✗ Failed to create label ${labelName}: ${createError.message}`));
          }
        }
      }
    }

    console.log(chalk.green("✅ Label setup completed"));
  }

  /**
   * ラベル色を取得
   */
  private getLabelColor(labelName: string): string {
    if (labelName.startsWith("✨ type:")) return "1d76db";
    if (labelName.startsWith("🐛 type:")) return "d73a4a";
    if (labelName.startsWith("📚 type:")) return "0075ca";
    if (labelName.startsWith("🧪 type:")) return "d876e3";
    if (labelName.startsWith("📊 priority:P0")) return "b60205";
    if (labelName.startsWith("⚠️ priority:P1")) return "d93f0b";
    if (labelName.startsWith("📊 priority:P2")) return "fbca04";
    if (labelName.startsWith("📥 state:")) return "0e8a16";
    if (labelName.startsWith("🎯 phase:")) return "1d76db";
    if (labelName.startsWith("🤖 agent:")) return "5319e7";
    if (labelName.startsWith("🔒 special:security")) return "b60205";

    return "ededed"; // デフォルト
  }

  /**
   * ラベル説明を取得
   */
  private getLabelDescription(labelName: string): string {
    const descriptions: Record<string, string> = {
      "✨ type:feature": "New feature or enhancement",
      "🐛 type:bug": "Bug fix",
      "📚 type:docs": "Documentation",
      "🧪 type:test": "Testing",
      "📊 priority:P0-Critical": "Critical priority",
      "⚠️ priority:P1-High": "High priority",
      "📊 priority:P2-Medium": "Medium priority",
      "📥 state:pending": "Pending",
      "🎯 phase:planning": "Planning phase",
      "🎯 phase:development": "Development phase",
      "🤖 agent:codegen": "Code generation agent",
      "🔒 special:security": "Security-related",
    };

    return descriptions[labelName] || "";
  }
}
