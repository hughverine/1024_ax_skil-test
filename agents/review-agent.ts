/**
 * ReviewAgent - コード品質レビューAgent
 * 静的解析・セキュリティスキャン・品質スコアリング
 */

import * as fs from "fs/promises";
import * as path from "path";
import chalk from "chalk";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface ReviewRequest {
  files: string[];
  projectRoot: string;
}

export interface QualityIssue {
  file: string;
  line?: number;
  severity: "error" | "warning" | "info";
  message: string;
  rule?: string;
}

export interface ReviewResult {
  score: number; // 0-100
  passed: boolean; // >= 80点で合格
  issues: QualityIssue[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
  details: {
    typeScript: { errors: number; score: number };
    eslint: { errors: number; warnings: number; score: number };
    security: { vulnerabilities: number; score: number };
    complexity: { score: number };
  };
}

export class ReviewAgent {
  private threshold: number = 80; // 合格ライン

  /**
   * コードレビュー実行
   */
  async review(request: ReviewRequest): Promise<ReviewResult> {
    console.log(chalk.cyan("📊 ReviewAgent: Starting code review..."));

    const issues: QualityIssue[] = [];
    let typeScriptScore = 100;
    let eslintScore = 100;
    let securityScore = 100;
    let complexityScore = 100;

    // TypeScriptチェック
    const tsResult = await this.checkTypeScript(request);
    issues.push(...tsResult.issues);
    typeScriptScore = tsResult.score;

    // ESLintチェック
    const lintResult = await this.checkESLint(request);
    issues.push(...lintResult.issues);
    eslintScore = lintResult.score;

    // セキュリティチェック
    const secResult = await this.checkSecurity(request);
    issues.push(...secResult.issues);
    securityScore = secResult.score;

    // 複雑度チェック
    const compResult = await this.checkComplexity(request);
    complexityScore = compResult.score;

    // 総合スコア計算（加重平均）
    const totalScore = Math.round(
      typeScriptScore * 0.3 + eslintScore * 0.3 + securityScore * 0.3 + complexityScore * 0.1
    );

    const summary = {
      errors: issues.filter((i) => i.severity === "error").length,
      warnings: issues.filter((i) => i.severity === "warning").length,
      info: issues.filter((i) => i.severity === "info").length,
    };

    const passed = totalScore >= this.threshold;

    // 結果表示
    this.displayResults(totalScore, passed, summary);

    return {
      score: totalScore,
      passed,
      issues,
      summary,
      details: {
        typeScript: { errors: tsResult.errors, score: typeScriptScore },
        eslint: { errors: lintResult.errors, warnings: lintResult.warnings, score: eslintScore },
        security: { vulnerabilities: secResult.vulnerabilities, score: securityScore },
        complexity: { score: complexityScore },
      },
    };
  }

  /**
   * TypeScriptチェック
   */
  private async checkTypeScript(request: ReviewRequest): Promise<{
    issues: QualityIssue[];
    errors: number;
    score: number;
  }> {
    const issues: QualityIssue[] = [];
    let errors = 0;

    try {
      // TypeScriptコンパイラを実行（noEmit）
      await execAsync("npx tsc --noEmit", { cwd: request.projectRoot });

      console.log(chalk.green("  ✓ TypeScript: No errors"));
      return { issues, errors: 0, score: 100 };
    } catch (error: any) {
      // TypeScriptエラーを解析
      const output = error.stdout || error.stderr || "";
      const errorMatches = output.match(/error TS\d+:/g);
      errors = errorMatches ? errorMatches.length : 1;

      // エラーを抽出
      const lines = output.split("\n");
      for (const line of lines) {
        if (line.includes("error TS")) {
          issues.push({
            file: "TypeScript",
            severity: "error",
            message: line.trim(),
            rule: "tsc",
          });
        }
      }

      console.log(chalk.yellow(`  ⚠ TypeScript: ${errors} error(s) found`));

      // スコア計算: エラー1件につき-10点（最小0点）
      const score = Math.max(0, 100 - errors * 10);

      return { issues, errors, score };
    }
  }

  /**
   * ESLintチェック
   */
  private async checkESLint(request: ReviewRequest): Promise<{
    issues: QualityIssue[];
    errors: number;
    warnings: number;
    score: number;
  }> {
    const issues: QualityIssue[] = [];
    let errors = 0;
    let warnings = 0;

    try {
      // ESLintを実行
      const { stdout } = await execAsync(
        `npx eslint ${request.files.join(" ")} --format json`,
        { cwd: request.projectRoot }
      );

      const results = JSON.parse(stdout);

      for (const result of results) {
        for (const message of result.messages) {
          const severity = message.severity === 2 ? "error" : "warning";

          issues.push({
            file: result.filePath,
            line: message.line,
            severity,
            message: message.message,
            rule: message.ruleId,
          });

          if (severity === "error") errors++;
          else warnings++;
        }
      }

      if (errors === 0 && warnings === 0) {
        console.log(chalk.green("  ✓ ESLint: No issues"));
        return { issues, errors: 0, warnings: 0, score: 100 };
      }

      console.log(chalk.yellow(`  ⚠ ESLint: ${errors} error(s), ${warnings} warning(s)`));

      // スコア計算: エラー-5点、警告-2点
      const score = Math.max(0, 100 - errors * 5 - warnings * 2);

      return { issues, errors, warnings, score };
    } catch (error: any) {
      // ESLint未設定または実行エラー
      console.log(chalk.yellow("  ○ ESLint: Skipped (not configured)"));
      return { issues, errors: 0, warnings: 0, score: 100 };
    }
  }

  /**
   * セキュリティチェック
   */
  private async checkSecurity(request: ReviewRequest): Promise<{
    issues: QualityIssue[];
    vulnerabilities: number;
    score: number;
  }> {
    const issues: QualityIssue[] = [];
    let vulnerabilities = 0;

    // 簡易的なセキュリティチェック
    for (const filePath of request.files) {
      try {
        const fullPath = path.join(request.projectRoot, filePath);
        const content = await fs.readFile(fullPath, "utf-8");

        // 危険なパターンをチェック
        const dangerousPatterns = [
          { pattern: /eval\(/g, message: "Avoid using eval()" },
          { pattern: /innerHTML\s*=/g, message: "Potential XSS vulnerability with innerHTML" },
          { pattern: /document\.write\(/g, message: "Avoid using document.write()" },
          { pattern: /process\.env\.\w+/g, message: "Environment variable exposed" },
          {
            pattern: /password|secret|api[_-]?key/gi,
            message: "Potential credential in code",
          },
        ];

        for (const { pattern, message } of dangerousPatterns) {
          const matches = content.match(pattern);
          if (matches) {
            vulnerabilities += matches.length;

            issues.push({
              file: filePath,
              severity: "warning",
              message,
              rule: "security",
            });
          }
        }
      } catch (error) {
        // ファイル読み取りエラーは無視
      }
    }

    if (vulnerabilities === 0) {
      console.log(chalk.green("  ✓ Security: No vulnerabilities detected"));
      return { issues, vulnerabilities: 0, score: 100 };
    }

    console.log(chalk.yellow(`  ⚠ Security: ${vulnerabilities} potential issue(s)`));

    // スコア計算: 脆弱性1件につき-10点
    const score = Math.max(0, 100 - vulnerabilities * 10);

    return { issues, vulnerabilities, score };
  }

  /**
   * 複雑度チェック
   */
  private async checkComplexity(request: ReviewRequest): Promise<{ score: number }> {
    let totalComplexity = 0;
    let fileCount = 0;

    for (const filePath of request.files) {
      try {
        const fullPath = path.join(request.projectRoot, filePath);
        const content = await fs.readFile(fullPath, "utf-8");

        // 簡易的な循環的複雑度計算
        const ifCount = (content.match(/\bif\s*\(/g) || []).length;
        const forCount = (content.match(/\bfor\s*\(/g) || []).length;
        const whileCount = (content.match(/\bwhile\s*\(/g) || []).length;
        const caseCount = (content.match(/\bcase\s+/g) || []).length;
        const catchCount = (content.match(/\bcatch\s*\(/g) || []).length;

        const complexity = 1 + ifCount + forCount + whileCount + caseCount + catchCount;
        totalComplexity += complexity;
        fileCount++;
      } catch (error) {
        // ファイル読み取りエラーは無視
      }
    }

    const avgComplexity = fileCount > 0 ? totalComplexity / fileCount : 0;

    // 複雑度スコア: 平均10以下で100点、20以上で0点
    let score = 100;
    if (avgComplexity > 10) {
      score = Math.max(0, 100 - (avgComplexity - 10) * 10);
    }

    console.log(chalk.gray(`  ○ Complexity: Average ${avgComplexity.toFixed(1)}`));

    return { score: Math.round(score) };
  }

  /**
   * 結果表示
   */
  private displayResults(score: number, passed: boolean, summary: any): void {
    console.log();

    if (passed) {
      console.log(chalk.green.bold(`✅ Review Passed: ${score}/100`));
    } else {
      console.log(chalk.red.bold(`❌ Review Failed: ${score}/100 (threshold: ${this.threshold})`));
    }

    console.log(chalk.gray(`   Errors: ${summary.errors}`));
    console.log(chalk.gray(`   Warnings: ${summary.warnings}`));
    console.log(chalk.gray(`   Info: ${summary.info}`));
    console.log();
  }
}
