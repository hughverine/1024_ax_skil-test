# AXCAMP Prompts Directory

This directory contains prompt templates and curriculum knowledge files.

## Structure

```
prompts/
├── curriculum/        # Knowledge base (YAML files)
│   └── example.yaml   # Sample curriculum
└── README.md          # This file
```

## Curriculum Files

Knowledge files in YAML format for RAG (Retrieval-Augmented Generation).

### Format

```yaml
- type: knowledge
  category: カテゴリ名
  subcategory: サブカテゴリ名（optional）
  summary: 概要説明
  key_points:
    - ポイント1
    - ポイント2
    - ポイント3
  解説: |
    詳細な解説文...
```

### Loading Knowledge

Run the knowledge loader script:

```bash
npm run load:knowledge
# or
tsx scripts/load-knowledge.ts
```

This will:
1. Read all `*.yaml` files from `prompts/curriculum/`
2. Extract knowledge entries (type: knowledge)
3. Split into chunks (1500 chars with 200 char overlap)
4. Generate OpenAI embeddings (text-embedding-3-large, 3072 dimensions)
5. Store in Supabase (`knowledge_sources` + `knowledge_chunks`)

### Categories

Recommended categories (adjust based on your curriculum):

- 経営戦略 (Business Strategy)
- マーケティング (Marketing)
- 財務会計 (Finance & Accounting)
- 人的資源管理 (Human Resource Management)
- オペレーション管理 (Operations Management)
- リーダーシップ (Leadership)
- イノベーション (Innovation)
- デジタル変革 (Digital Transformation)

## Prompt Templates (Coming Soon)

Future directory structure:

```
prompts/
├── curriculum/           # Knowledge base
├── system/               # System prompts
│   ├── examiner.txt      # Question generation
│   ├── grader.txt        # Answer grading
│   └── analyzer.txt      # Performance analysis
└── templates/            # Prompt templates
    ├── mcq.txt           # MCQ generation
    └── essay.txt         # Essay question generation
```

## Best Practices

1. **Consistent Formatting**: Use the same YAML structure across files
2. **Clear Categories**: Use hierarchical categories (category + subcategory)
3. **Concise Summaries**: Keep summaries under 200 characters
4. **Actionable Key Points**: 3-5 bullet points per entry
5. **Detailed Explanations**: Provide context and examples in 解説

## Example Usage

```yaml
# Good example
- type: knowledge
  category: 経営戦略
  subcategory: SWOT分析
  summary: 企業の内部環境と外部環境を評価する戦略フレームワーク
  key_points:
    - Strengths: 競争優位性
    - Weaknesses: 改善領域
    - Opportunities: 外部機会
    - Threats: 外部脅威
  解説: |
    SWOT分析は1960年代に開発された戦略立案ツールです。
    企業が現状を客観的に理解し、適切な戦略を策定します。

# Bad example - too vague
- type: knowledge
  category: ビジネス
  summary: ビジネスに関する知識
  content: いろいろな内容
```

## Troubleshooting

### Error: "Directory not found"

```bash
mkdir -p prompts/curriculum
```

### Error: "Invalid YAML syntax"

Validate your YAML:

```bash
npm install -g js-yaml
js-yaml prompts/curriculum/your-file.yaml
```

### Error: "Embedding dimensions mismatch"

Ensure you're using `text-embedding-3-large` (3072 dimensions).
Update `sql/01_schema.sql` if using a different model:

```sql
-- For text-embedding-3-small (1536 dimensions)
embedding vector(1536)

-- For text-embedding-3-large (3072 dimensions)
embedding vector(3072)
```
