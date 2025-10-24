#!/usr/bin/env tsx

/**
 * Miyabi Agent Status Checker
 * プロジェクトとAgentシステムのステータスを確認
 */

import "dotenv/config";
import { Octokit } from "@octokit/rest";
import chalk from "chalk";
import Table from "cli-table3";
import * as fs from "fs/promises";
import * as path from "path";

interface Config {
  githubToken: string;
  repository: string;
  deviceIdentifier: string;
}

function loadConfig(): Config {
  return {
    githubToken: process.env.GITHUB_TOKEN || "",
    repository: process.env.REPOSITORY || "",
    deviceIdentifier: process.env.DEVICE_IDENTIFIER || "localhost",
  };
}

async function checkEnvironment(): Promise<void> {
  console.log(chalk.cyan.bold("\n📋 Environment Status\n"));

  const table = new Table({
    head: [chalk.white("Variable"), chalk.white("Status"), chalk.white("Value")],
    colWidths: [25, 10, 50],
  });

  const config = loadConfig();

  table.push(
    [
      "GITHUB_TOKEN",
      config.githubToken ? chalk.green("✓") : chalk.red("✗"),
      config.githubToken ? "Set (hidden)" : "Not set",
    ],
    [
      "REPOSITORY",
      config.repository ? chalk.green("✓") : chalk.red("✗"),
      config.repository || "Not set",
    ],
    [
      "DEVICE_IDENTIFIER",
      chalk.green("✓"),
      config.deviceIdentifier,
    ],
    [
      "ANTHROPIC_API_KEY",
      process.env.ANTHROPIC_API_KEY ? chalk.green("✓") : chalk.yellow("○"),
      process.env.ANTHROPIC_API_KEY ? "Set (hidden)" : "Optional (for CodeGenAgent)",
    ]
  );

  console.log(table.toString());
  console.log();
}

async function checkGitHubConnection(): Promise<void> {
  console.log(chalk.cyan.bold("🔗 GitHub Connection\n"));

  const config = loadConfig();

  if (!config.githubToken || !config.repository) {
    console.log(chalk.red("✗ Cannot connect: Missing GITHUB_TOKEN or REPOSITORY"));
    return;
  }

  try {
    const octokit = new Octokit({ auth: config.githubToken });
    const [owner, repo] = config.repository.split("/");

    const { data: repoData } = await octokit.repos.get({ owner, repo });

    console.log(chalk.green("✓ Successfully connected to GitHub"));
    console.log(chalk.gray(`  Repository: ${repoData.full_name}`));
    console.log(chalk.gray(`  Default branch: ${repoData.default_branch}`));
    console.log(chalk.gray(`  Open issues: ${repoData.open_issues_count}`));
    console.log();
  } catch (error: any) {
    console.log(chalk.red(`✗ GitHub connection failed: ${error.message}`));
    console.log();
  }
}

async function checkIssues(): Promise<void> {
  console.log(chalk.cyan.bold("📝 Issue Status\n"));

  const config = loadConfig();

  if (!config.githubToken || !config.repository) {
    console.log(chalk.yellow("⚠ Skipped: Missing GitHub credentials"));
    return;
  }

  try {
    const octokit = new Octokit({ auth: config.githubToken });
    const [owner, repo] = config.repository.split("/");

    const { data: issues } = await octokit.issues.listForRepo({
      owner,
      repo,
      state: "open",
      per_page: 10,
    });

    const table = new Table({
      head: [chalk.white("#"), chalk.white("Title"), chalk.white("Labels")],
      colWidths: [6, 50, 30],
    });

    for (const issue of issues.slice(0, 5)) {
      const labels = issue.labels
        .map((l) => (typeof l === "string" ? l : l.name))
        .join(", ");

      table.push([
        `#${issue.number}`,
        issue.title.substring(0, 47) + (issue.title.length > 47 ? "..." : ""),
        labels.substring(0, 27) + (labels.length > 27 ? "..." : ""),
      ]);
    }

    console.log(table.toString());
    console.log(chalk.gray(`\nShowing 5 of ${issues.length} open issues`));
    console.log();
  } catch (error: any) {
    console.log(chalk.red(`✗ Failed to fetch issues: ${error.message}`));
    console.log();
  }
}

async function checkDirectories(): Promise<void> {
  console.log(chalk.cyan.bold("📁 Project Structure\n"));

  const directories = [
    ".ai/logs",
    ".ai/parallel-reports",
    ".claude/agents",
    ".claude/commands",
    "scripts",
  ];

  const table = new Table({
    head: [chalk.white("Directory"), chalk.white("Status")],
    colWidths: [30, 15],
  });

  for (const dir of directories) {
    try {
      await fs.access(dir);
      table.push([dir, chalk.green("✓ Exists")]);
    } catch {
      table.push([dir, chalk.yellow("○ Missing")]);
    }
  }

  console.log(table.toString());
  console.log();
}

async function checkAgentSystem(): Promise<void> {
  console.log(chalk.cyan.bold("🤖 Agent System Status\n"));

  const table = new Table({
    head: [chalk.white("Component"), chalk.white("Status"), chalk.white("Notes")],
    colWidths: [25, 10, 45],
  });

  // package.json確認
  let packageJsonExists = false;
  try {
    await fs.access("package.json");
    packageJsonExists = true;
    table.push(["package.json", chalk.green("✓"), "Project configured"]);
  } catch {
    table.push(["package.json", chalk.red("✗"), "Missing - run npm init"]);
  }

  // tsconfig.json確認
  try {
    await fs.access("tsconfig.json");
    table.push(["tsconfig.json", chalk.green("✓"), "TypeScript configured"]);
  } catch {
    table.push(["tsconfig.json", chalk.yellow("○"), "Missing - recommended"]);
  }

  // Executor確認
  try {
    await fs.access("scripts/agents-parallel-executor.ts");
    table.push(["Parallel Executor", chalk.green("✓"), "Ready to run"]);
  } catch {
    table.push(["Parallel Executor", chalk.red("✗"), "Implementation missing"]);
  }

  // node_modules確認
  if (packageJsonExists) {
    try {
      await fs.access("node_modules");
      table.push(["Dependencies", chalk.green("✓"), "Installed"]);
    } catch {
      table.push(["Dependencies", chalk.red("✗"), "Run: pnpm install"]);
    }
  }

  console.log(table.toString());
  console.log();
}

async function main() {
  console.log(chalk.cyan.bold("\n╔═══════════════════════════════════════════════════════╗"));
  console.log(chalk.cyan.bold("║       Miyabi Agent Framework - Status Report         ║"));
  console.log(chalk.cyan.bold("╚═══════════════════════════════════════════════════════╝\n"));

  await checkEnvironment();
  await checkGitHubConnection();
  await checkIssues();
  await checkDirectories();
  await checkAgentSystem();

  console.log(chalk.green.bold("✅ Status check completed\n"));
}

main().catch((error) => {
  console.error(chalk.red("\n❌ Error:"), error.message);
  process.exit(1);
});
