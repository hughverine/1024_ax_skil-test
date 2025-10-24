/**
 * CodeGenAgent - AI駆動コード生成Agent
 * Claude Sonnet 4を使用して自動的にコードを生成
 */

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs/promises";
import * as path from "path";
import chalk from "chalk";
import { requestTaskFromClaudeCode } from "./task-tool-helper.js";

export interface CodeGenerationRequest {
  issueNumber: number;
  issueTitle: string;
  issueBody: string;
  repository: string;
}

export interface GeneratedFile {
  path: string;
  content: string;
  description: string;
}

export interface CodeGenerationResult {
  success: boolean;
  files: GeneratedFile[];
  summary: string;
  error?: string;
}

export class CodeGenAgent {
  private anthropic: Anthropic | null = null;
  private enabled: boolean;
  private useTaskTool: boolean;

  constructor(apiKey?: string, useTaskTool: boolean = true) {
    this.useTaskTool = useTaskTool || process.env.USE_TASK_TOOL === "true";
    this.enabled = !!apiKey || this.useTaskTool;

    if (apiKey && !this.useTaskTool) {
      this.anthropic = new Anthropic({ apiKey });
    }
  }

  /**
   * Issueからコードを生成
   */
  async generateCode(request: CodeGenerationRequest): Promise<CodeGenerationResult> {
    // Task tool モード
    if (this.useTaskTool) {
      console.log(chalk.cyan("🧠 CodeGenAgent: Using Claude Code Task tool for code generation..."));
      return this.generateWithTaskTool(request);
    }

    // Anthropic API モード
    if (!this.enabled || !this.anthropic) {
      console.log(chalk.yellow("⚠️  CodeGenAgent: ANTHROPIC_API_KEY not set - using mock implementation"));
      return this.generateMockCode(request);
    }

    try {
      console.log(chalk.cyan("🧠 CodeGenAgent: Analyzing issue and generating code with Claude API..."));

      // Claude APIを使用してコード生成
      const prompt = this.buildPrompt(request);

      const message = await this.anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        temperature: 0.7,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      // レスポンスからコードを抽出
      const responseText = message.content
        .filter((block) => block.type === "text")
        .map((block) => (block as Anthropic.TextBlock).text)
        .join("\n");

      const files = this.extractFilesFromResponse(responseText);

      return {
        success: true,
        files,
        summary: `Generated ${files.length} file(s) using Claude Sonnet 4`,
      };
    } catch (error: any) {
      console.error(chalk.red(`❌ CodeGenAgent error: ${error.message}`));

      return {
        success: false,
        files: [],
        summary: "Code generation failed",
        error: error.message,
      };
    }
  }

  /**
   * 生成されたファイルをディスクに書き込み
   */
  async writeFiles(files: GeneratedFile[], basePath: string = "."): Promise<void> {
    for (const file of files) {
      const fullPath = path.join(basePath, file.path);
      const dir = path.dirname(fullPath);

      // ディレクトリ作成
      await fs.mkdir(dir, { recursive: true });

      // ファイル書き込み
      await fs.writeFile(fullPath, file.content, "utf-8");

      console.log(chalk.green(`  ✓ Created: ${file.path}`));
    }
  }

  /**
   * プロンプト構築
   */
  private buildPrompt(request: CodeGenerationRequest): string {
    return `You are an expert software engineer working on the repository: ${request.repository}

Issue #${request.issueNumber}: ${request.issueTitle}

${request.issueBody}

Based on this GitHub issue, generate the necessary code files to implement the requested feature.

For each file, use the following format:
\`\`\`filepath
[FILE: path/to/file.ts]
[DESCRIPTION: Brief description of what this file does]
[CONTENT]
// Your code here
\`\`\`

Requirements:
1. Follow TypeScript best practices
2. Include proper error handling
3. Add comments for complex logic
4. Use modern ES6+ syntax
5. Follow the existing project structure shown in the issue

Generate complete, production-ready code.`;
  }

  /**
   * レスポンスからファイル情報を抽出
   */
  private extractFilesFromResponse(response: string): GeneratedFile[] {
    const files: GeneratedFile[] = [];
    const fileBlocks = response.match(/\[FILE:\s*(.+?)\]\s*\[DESCRIPTION:\s*(.+?)\]\s*\[CONTENT\]\s*```[\w]*\n([\s\S]+?)```/g);

    if (!fileBlocks) {
      // フォールバック: 通常のコードブロックを検出
      const codeBlocks = response.match(/```(\w+)?\n([\s\S]+?)```/g);

      if (codeBlocks) {
        codeBlocks.forEach((block, index) => {
          const match = block.match(/```(\w+)?\n([\s\S]+?)```/);
          if (match) {
            const ext = match[1] || "ts";
            const content = match[2];

            files.push({
              path: `generated/file-${index + 1}.${ext}`,
              content: content.trim(),
              description: `Generated code block ${index + 1}`,
            });
          }
        });
      }

      return files;
    }

    for (const block of fileBlocks) {
      const match = block.match(/\[FILE:\s*(.+?)\]\s*\[DESCRIPTION:\s*(.+?)\]\s*\[CONTENT\]\s*```[\w]*\n([\s\S]+?)```/);

      if (match) {
        files.push({
          path: match[1].trim(),
          content: match[3].trim(),
          description: match[2].trim(),
        });
      }
    }

    return files;
  }

  /**
   * Task toolモード: Claude Codeに実装を依頼
   */
  private async generateWithTaskTool(request: CodeGenerationRequest): Promise<CodeGenerationResult> {
    const taskResult = await requestTaskFromClaudeCode({
      issueNumber: request.issueNumber,
      issueTitle: request.issueTitle,
      issueBody: request.issueBody,
      repository: request.repository,
    });

    return {
      success: taskResult.success,
      files: taskResult.files,
      summary: taskResult.message,
    };
  }

  /**
   * モック実装（API KEYがない場合）
   */
  private generateMockCode(request: CodeGenerationRequest): CodeGenerationResult {
    const files: GeneratedFile[] = [];

    // Issue番号に基づいて異なるファイルを生成
    const issueNumber = request.issueNumber;

    // 基本的なファイル構造を生成
    files.push({
      path: `src/features/issue-${issueNumber}/index.ts`,
      content: `/**
 * Implementation for Issue #${issueNumber}
 * ${request.issueTitle}
 */

export class Feature${issueNumber} {
  constructor() {
    console.log('Feature ${issueNumber} initialized');
  }

  async execute(): Promise<void> {
    // TODO: Implement feature logic
    console.log('Executing feature ${issueNumber}');
  }
}

export default Feature${issueNumber};
`,
      description: `Main implementation for Issue #${issueNumber}`,
    });

    // テストファイルも生成
    files.push({
      path: `src/features/issue-${issueNumber}/index.test.ts`,
      content: `import { describe, it, expect } from 'vitest';
import Feature${issueNumber} from './index';

describe('Feature${issueNumber}', () => {
  it('should initialize correctly', () => {
    const feature = new Feature${issueNumber}();
    expect(feature).toBeDefined();
  });

  it('should execute without errors', async () => {
    const feature = new Feature${issueNumber}();
    await expect(feature.execute()).resolves.toBeUndefined();
  });
});
`,
      description: `Unit tests for Issue #${issueNumber}`,
    });

    // README も生成
    files.push({
      path: `src/features/issue-${issueNumber}/README.md`,
      content: `# Issue #${issueNumber}: ${request.issueTitle}

## Overview

Implementation of Issue #${issueNumber}.

## Files

- \`index.ts\`: Main implementation
- \`index.test.ts\`: Unit tests

## Usage

\`\`\`typescript
import Feature${issueNumber} from './features/issue-${issueNumber}';

const feature = new Feature${issueNumber}();
await feature.execute();
\`\`\`

## Testing

\`\`\`bash
npm test src/features/issue-${issueNumber}
\`\`\`
`,
      description: `Documentation for Issue #${issueNumber}`,
    });

    return {
      success: true,
      files,
      summary: `Generated ${files.length} file(s) (mock implementation - ANTHROPIC_API_KEY not set)`,
    };
  }
}
