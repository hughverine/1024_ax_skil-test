#!/usr/bin/env tsx

/**
 * Miyabi Agent Framework - Parallel Executor
 * GitHub IssueをDAGベースで並列実行するCoordinatorAgent
 */

import "dotenv/config";
import { Octokit } from "@octokit/rest";
import chalk from "chalk";
import ora from "ora";
import { program } from "commander";
import * as fs from "fs/promises";
import * as path from "path";

// Agents
import { CodeGenAgent } from "../agents/codegen-agent.js";
import { ReviewAgent } from "../agents/review-agent.js";
import { PRAgent } from "../agents/pr-agent.js";
import { IssueAgent } from "../agents/issue-agent.js";

// 環境変数の型定義
interface Config {
  githubToken: string;
  repository: string;
  deviceIdentifier: string;
  anthropicApiKey?: string;
  logDirectory: string;
  reportDirectory: string;
  defaultConcurrency: number;
}

// Issue型定義
interface Issue {
  number: number;
  title: string;
  body: string;
  labels: Array<{ name: string }>;
  state: string;
}

// DAGノード型定義
interface DAGNode {
  id: string;
  number: number;
  title: string;
  dependencies: string[];
  level: number;
}

// 設定読み込み
function loadConfig(): Config {
  const config: Config = {
    githubToken: process.env.GITHUB_TOKEN || "",
    repository: process.env.REPOSITORY || "",
    deviceIdentifier: process.env.DEVICE_IDENTIFIER || "localhost",
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    logDirectory: process.env.LOG_DIRECTORY || ".ai/logs",
    reportDirectory: process.env.REPORT_DIRECTORY || ".ai/parallel-reports",
    defaultConcurrency: parseInt(process.env.DEFAULT_CONCURRENCY || "2", 10),
  };

  if (!config.githubToken) {
    throw new Error("GITHUB_TOKEN is required in .env file");
  }
  if (!config.repository) {
    throw new Error("REPOSITORY is required in .env file (format: owner/repo)");
  }

  return config;
}

// GitHub APIクライアント初期化
function createOctokit(token: string): Octokit {
  return new Octokit({ auth: token });
}

// Issue取得
async function fetchIssue(
  octokit: Octokit,
  owner: string,
  repo: string,
  issueNumber: number
): Promise<Issue> {
  const spinner = ora(`Fetching Issue #${issueNumber}`).start();

  try {
    const { data } = await octokit.issues.get({
      owner,
      repo,
      issue_number: issueNumber,
    });

    spinner.succeed(`Fetched Issue #${issueNumber}: ${data.title}`);

    return {
      number: data.number,
      title: data.title,
      body: data.body || "",
      labels: data.labels.map((label) =>
        typeof label === "string" ? { name: label } : { name: label.name || "" }
      ),
      state: data.state,
    };
  } catch (error) {
    spinner.fail(`Failed to fetch Issue #${issueNumber}`);
    throw error;
  }
}

// 複数Issue取得
async function fetchIssues(
  octokit: Octokit,
  owner: string,
  repo: string,
  issueNumbers: number[]
): Promise<Issue[]> {
  const issues: Issue[] = [];

  for (const num of issueNumbers) {
    const issue = await fetchIssue(octokit, owner, repo, num);
    issues.push(issue);
  }

  return issues;
}

// 依存関係解析
function parseDependencies(issueBody: string): number[] {
  const deps: number[] = [];

  // "Relates to #123" パターン
  const relatesMatch = issueBody.match(/Relates to #(\d+)/i);
  if (relatesMatch) {
    deps.push(parseInt(relatesMatch[1], 10));
  }

  // "depends: #123" パターン
  const dependsMatches = issueBody.matchAll(/depends:\s*#(\d+)/gi);
  for (const match of dependsMatches) {
    deps.push(parseInt(match[1], 10));
  }

  return [...new Set(deps)]; // 重複削除
}

// DAG構築
function buildDAG(issues: Issue[]): DAGNode[] {
  const nodes: DAGNode[] = [];
  const issueMap = new Map<number, Issue>();

  // Issueマップ作成
  for (const issue of issues) {
    issueMap.set(issue.number, issue);
  }

  // ノード作成
  for (const issue of issues) {
    const deps = parseDependencies(issue.body);

    nodes.push({
      id: `issue-${issue.number}`,
      number: issue.number,
      title: issue.title,
      dependencies: deps.map((d) => `issue-${d}`),
      level: 0, // 後で計算
    });
  }

  // レベル計算（トポロジカルソート）
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const visited = new Set<string>();

  function calculateLevel(nodeId: string): number {
    if (visited.has(nodeId)) {
      const node = nodeMap.get(nodeId);
      return node?.level || 0;
    }

    visited.add(nodeId);
    const node = nodeMap.get(nodeId);

    if (!node || node.dependencies.length === 0) {
      if (node) node.level = 0;
      return 0;
    }

    const maxDepLevel = Math.max(
      ...node.dependencies.map((dep) => calculateLevel(dep))
    );

    node.level = maxDepLevel + 1;
    return node.level;
  }

  for (const node of nodes) {
    calculateLevel(node.id);
  }

  return nodes.sort((a, b) => a.level - b.level);
}

// Issue実行（モック）
async function executeIssue(
  issue: Issue,
  config: Config,
  dryRun: boolean
): Promise<void> {
  console.log(chalk.cyan(`\n${"=".repeat(80)}`));
  console.log(chalk.cyan.bold(`🚀 Executing Issue #${issue.number}: ${issue.title}`));
  console.log(chalk.cyan(`${"=".repeat(80)}\n`));

  const startTime = Date.now();

  if (dryRun) {
    console.log(chalk.yellow("⚠️  Dry run mode: No actual changes will be made\n"));
  }

  try {
    // ============================================================
    // Step 1: IssueAgent - Issue分析・ラベル付与
    // ============================================================
    console.log(chalk.blue.bold("📋 Step 1: Issue Analysis"));

    const issueAgent = new IssueAgent(config.githubToken);
    const labelAnalysis = issueAgent.analyzeIssue(issue);

    console.log(chalk.gray(`  Recommended labels: ${labelAnalysis.recommendedLabels.join(", ")}`));
    console.log(chalk.gray(`  Confidence: ${(labelAnalysis.confidence * 100).toFixed(0)}%`));
    console.log(chalk.gray(`  Reasoning: ${labelAnalysis.reasoning}`));

    if (!dryRun) {
      await issueAgent.addLabels(config.repository, issue.number, labelAnalysis.recommendedLabels);
    }

    console.log();

    // ============================================================
    // Step 2: CodeGenAgent - コード生成
    // ============================================================
    console.log(chalk.blue.bold("📋 Step 2: Code Generation"));

    const codeGen = new CodeGenAgent(config.anthropicApiKey);
    const codeResult = await codeGen.generateCode({
      issueNumber: issue.number,
      issueTitle: issue.title,
      issueBody: issue.body,
      repository: config.repository,
    });

    if (!codeResult.success) {
      throw new Error(`Code generation failed: ${codeResult.error}`);
    }

    console.log(chalk.green(`  ✓ ${codeResult.summary}`));
    console.log(chalk.gray(`  Generated ${codeResult.files.length} file(s):`));

    for (const file of codeResult.files) {
      console.log(chalk.gray(`    - ${file.path} (${file.description})`));
    }

    // ファイル書き込み（dry-runでない場合）
    if (!dryRun) {
      await codeGen.writeFiles(codeResult.files, ".");
    }

    console.log();

    // ============================================================
    // Step 3: ReviewAgent - コード品質レビュー
    // ============================================================
    console.log(chalk.blue.bold("📋 Step 3: Code Review"));

    const reviewer = new ReviewAgent();
    const reviewResult = await reviewer.review({
      files: codeResult.files.map((f) => f.path),
      projectRoot: ".",
    });

    if (!reviewResult.passed) {
      console.log(chalk.red(`\n❌ Review failed: Score ${reviewResult.score}/100 (threshold: 80)`));
      console.log(chalk.yellow("\n⚠️  Issues found:"));

      for (const issue of reviewResult.issues.slice(0, 10)) {
        console.log(chalk.yellow(`  ${issue.severity}: ${issue.message}`));
      }

      throw new Error("Code review failed - quality threshold not met");
    }

    console.log();

    // ============================================================
    // Step 4: PRAgent - Pull Request作成
    // ============================================================
    console.log(chalk.blue.bold("📋 Step 4: Pull Request Creation"));

    const prAgent = new PRAgent(config.githubToken);
    const branchName = `feature/issue-${issue.number}`;

    if (!dryRun) {
      const prResult = await prAgent.createPR({
        issueNumber: issue.number,
        issueTitle: issue.title,
        branchName,
        files: codeResult.files.map((f) => f.path),
        repository: config.repository,
        baseBranch: "main",
      });

      if (!prResult.success) {
        throw new Error(`PR creation failed: ${prResult.error}`);
      }

      console.log(chalk.green(`  ✓ PR #${prResult.prNumber} created`));
      console.log(chalk.gray(`  URL: ${prResult.prUrl}`));

      // ラベル付与
      if (prResult.prNumber) {
        await prAgent.addLabels(config.repository, prResult.prNumber, [
          "🤖 auto-generated",
          "📋 needs-review",
        ]);
      }
    } else {
      console.log(chalk.yellow("  ○ PR creation skipped (dry run)"));
    }

    console.log();

    // ============================================================
    // 完了
    // ============================================================
    const duration = Date.now() - startTime;

    console.log(chalk.green.bold(`✅ Issue #${issue.number} completed successfully`));
    console.log(chalk.gray(`   Duration: ${duration}ms`));
    console.log(chalk.gray(`   Quality Score: ${reviewResult.score}/100`));
    console.log();

    // ログ記録
    const logFile = path.join(
      config.logDirectory,
      `execution-${new Date().toISOString().split("T")[0]}.md`
    );

    await fs.mkdir(path.dirname(logFile), { recursive: true });

    const logContent = `## Issue #${issue.number}: ${issue.title}

**Executed at**: ${new Date().toISOString()}
**Duration**: ${duration}ms
**Status**: ✅ Success
**Quality Score**: ${reviewResult.score}/100

### Generated Files
${codeResult.files.map((f) => `- ${f.path}`).join("\n")}

### Review Summary
- Errors: ${reviewResult.summary.errors}
- Warnings: ${reviewResult.summary.warnings}
- Info: ${reviewResult.summary.info}

---

`;

    await fs.appendFile(logFile, logContent, "utf-8");
  } catch (error: any) {
    const duration = Date.now() - startTime;

    console.log(chalk.red.bold(`❌ Issue #${issue.number} failed`));
    console.log(chalk.red(`   Error: ${error.message}`));
    console.log(chalk.gray(`   Duration: ${duration}ms`));
    console.log();

    // エラーログ記録
    const logFile = path.join(
      config.logDirectory,
      `execution-${new Date().toISOString().split("T")[0]}.md`
    );

    await fs.mkdir(path.dirname(logFile), { recursive: true });

    const errorLog = `## Issue #${issue.number}: ${issue.title}

**Executed at**: ${new Date().toISOString()}
**Duration**: ${duration}ms
**Status**: ❌ Failed
**Error**: ${error.message}

---

`;

    await fs.appendFile(logFile, errorLog, "utf-8");

    throw error;
  }
}

// 並列実行
async function executeDAG(
  dag: DAGNode[],
  octokit: Octokit,
  owner: string,
  repo: string,
  config: Config,
  concurrency: number,
  dryRun: boolean
): Promise<void> {
  // レベル別にグループ化
  const levels = new Map<number, DAGNode[]>();

  for (const node of dag) {
    const levelNodes = levels.get(node.level) || [];
    levelNodes.push(node);
    levels.set(node.level, levelNodes);
  }

  const maxLevel = Math.max(...levels.keys());

  console.log(chalk.green.bold("\n📊 DAG Analysis:"));
  console.log(chalk.gray(`   Total issues: ${dag.length}`));
  console.log(chalk.gray(`   Levels: ${maxLevel + 1}`));
  console.log(chalk.gray(`   Concurrency: ${concurrency}`));
  console.log();

  // レベル順に実行
  for (let level = 0; level <= maxLevel; level++) {
    const levelNodes = levels.get(level) || [];

    if (levelNodes.length === 0) continue;

    console.log(chalk.blue.bold(`\n📍 Level ${level}: ${levelNodes.length} issue(s)`));

    // 並列実行（concurrencyまで）
    const batches: DAGNode[][] = [];
    for (let i = 0; i < levelNodes.length; i += concurrency) {
      batches.push(levelNodes.slice(i, i + concurrency));
    }

    for (const batch of batches) {
      await Promise.all(
        batch.map(async (node) => {
          const issue = await fetchIssue(octokit, owner, repo, node.number);
          await executeIssue(issue, config, dryRun);
        })
      );
    }
  }
}

// メイン関数
async function main() {
  program
    .name("agents-parallel-executor")
    .description("Miyabi Agent Framework - Parallel Issue Executor")
    .option("--issue <number>", "Single issue number to execute")
    .option("--issues <numbers>", "Comma-separated issue numbers")
    .option("--concurrency <number>", "Concurrency level", "2")
    .option("--dry-run", "Dry run mode (no actual changes)")
    .option("--log-level <level>", "Log level", "info")
    .parse();

  const options = program.opts();

  console.log(chalk.cyan.bold("\n🤖 Miyabi Agent - Parallel Executor\n"));

  // 設定読み込み
  const config = loadConfig();
  const [owner, repo] = config.repository.split("/");

  console.log(chalk.green("✅ Configuration loaded"));
  console.log(chalk.gray(`   Device: ${config.deviceIdentifier}`));
  console.log(chalk.gray(`   Repository: ${config.repository}`));
  console.log(chalk.gray(`   Concurrency: ${options.concurrency || config.defaultConcurrency}`));

  if (options.dryRun) {
    console.log(chalk.yellow(`   Dry Run: Yes (no changes will be made)`));
  }
  console.log();

  // GitHub API初期化
  const octokit = createOctokit(config.githubToken);

  // Issue番号取得
  let issueNumbers: number[] = [];

  if (options.issue) {
    issueNumbers = [parseInt(options.issue, 10)];
  } else if (options.issues) {
    issueNumbers = options.issues.split(",").map((n: string) => parseInt(n.trim(), 10));
  } else {
    console.error(chalk.red("❌ Error: --issue or --issues is required"));
    process.exit(1);
  }

  // Issue取得
  const issues = await fetchIssues(octokit, owner, repo, issueNumbers);

  // DAG構築
  const spinner = ora("Building task dependency graph (DAG)").start();
  const dag = buildDAG(issues);
  spinner.succeed("DAG built successfully");

  // 実行
  await executeDAG(
    dag,
    octokit,
    owner,
    repo,
    config,
    parseInt(options.concurrency || config.defaultConcurrency, 10),
    options.dryRun || false
  );

  console.log(chalk.green.bold("\n✅ Execution completed\n"));
}

// エラーハンドリング
main().catch((error) => {
  console.error(chalk.red("\n❌ Fatal error:"), error.message);
  process.exit(1);
});
