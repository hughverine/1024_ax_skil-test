# Issue実行計画（DAG）

## 依存関係の構造

### Level 0: プロジェクト基盤（順次実行必須）
- **Issue #15**: プロジェクト雛形の作成（EPIC #1）
  - 全ての基礎となるため、最初に実行必須

### Level 1: データベース基盤（並列実行可能）
- **Issue #16**: データモデルの作成（EPIC #2）
- **Issue #17**: RLS/Storage/バケット設計（EPIC #2）
  - 依存: Issue #15 完了後
  - 並列実行可能

### Level 2: データ投入基盤（順次実行）
- **Issue #18**: YAML → チャンク → 埋め込み → Supabase格納（EPIC #3）
  - 依存: Issue #16, #17 完了後

### Level 3: LLM基盤（並列実行可能）
- **Issue #19**: プロンプト外部化とバージョン管理（EPIC #4）
- **Issue #20**: Structured Outputs（JSON Schema）で I/O を厳密化（EPIC #4）
  - 依存: Issue #15 完了後
  - 並列実行可能

### Level 4: 出題エンジン（並列実行可能）
- **Issue #21**: 出題ブループリント（EPIC #5）
- **Issue #22**: MCQ入力正規化モジュール（EPIC #5）
- **Issue #23**: 既存問題の流用/類似検出（EPIC #5）
  - 依存: Issue #18, #19, #20 完了後
  - 並列実行可能

### Level 5: 採点エンジン（並列実行可能）
- **Issue #24**: MCQ 採点（EPIC #6）
- **Issue #25**: 記述式 採点（EPIC #6）
  - 依存: Issue #20, #22 完了後
  - 並列実行可能

### Level 6: 補完ロジック（順次実行）
- **Issue #26**: 補完ロジック & スコア補正（EPIC #7）
  - 依存: Issue #24, #25 完了後

### Level 7: API実装（順次実行）
- **Issue #27**: エンドポイント群の実装 + PII暗号化（EPIC #8）
  - 依存: Issue #21, #24, #25, #26 完了後

### Level 8: UI実装（並列実行可能）
- **Issue #28**: Startフォーム（EPIC #9）
- **Issue #29**: テスト画面（EPIC #9）
- **Issue #30**: 補完質問画面（EPIC #9）
- **Issue #31**: 結果画面 + PDF出力（EPIC #9）
  - 依存: Issue #27 完了後
  - 並列実行可能（最大4並行）

### Level 9: 追加機能（並列実行可能）
- **Issue #32**: Edge Function でメール送信（EPIC #10）
- **Issue #33**: ROI算定ロジック & チャート（EPIC #11）
- **Issue #34**: OpenAI 呼び出しのタイムアウト/再試行/フォールバック（EPIC #12）
  - 依存: Issue #27, #28-31のいずれか完了後
  - 並列実行可能

### Level 10: 品質保証・監査（並列実行可能）
- **Issue #35**: 監査ログの実装（EPIC #13）
  - 依存: Issue #27 完了後

### Level 11: テスト（最終段階）
- **Issue #36**: 単体/結合/E2Eテストの実装（EPIC #14）
  - 依存: 全Issue完了後

## 実行戦略

### フェーズ1: 基盤構築（順次）
```bash
Issue #15 → Issue #16, #17（並列）→ Issue #18
```

### フェーズ2: コアロジック（並列）
```bash
Issue #19, #20（並列）→ Issue #21, #22, #23（並列）
```

### フェーズ3: 機能実装（並列 → 順次 → 並列）
```bash
Issue #24, #25（並列）→ Issue #26 → Issue #27 → Issue #28, #29, #30, #31（並列）
```

### フェーズ4: 追加機能・品質保証（並列）
```bash
Issue #32, #33, #34, #35（並列）→ Issue #36
```

## 並列実行グループ

### グループ1（並列度: 2）
- Issue #16, #17

### グループ2（並列度: 2）
- Issue #19, #20

### グループ3（並列度: 3）
- Issue #21, #22, #23

### グループ4（並列度: 2）
- Issue #24, #25

### グループ5（並列度: 4）
- Issue #28, #29, #30, #31

### グループ6（並列度: 4）
- Issue #32, #33, #34, #35

## 推定所要時間

- **Level 0**: 約60分（Issue #15）
- **Level 1**: 約30分（並列実行）
- **Level 2**: 約30分（Issue #18）
- **Level 3**: 約20分（並列実行）
- **Level 4**: 約45分（並列実行）
- **Level 5**: 約30分（並列実行）
- **Level 6**: 約30分（Issue #26）
- **Level 7**: 約60分（Issue #27）
- **Level 8**: 約45分（並列実行）
- **Level 9**: 約30分（並列実行）
- **Level 10**: 約30分（Issue #35）
- **Level 11**: 約60分（Issue #36）

**合計推定時間**: 約7.5時間（並列実行考慮）
**順次実行の場合**: 約20時間

## 実行コマンド

### フェーズ1実行
```bash
# Issue #15を実行
gh issue view 15 --repo hughverine/1024_ax_skil-test

# CoordinatorAgentで実行（実装必要）
# npm run agents:parallel:exec -- --issue 15
```

### 全体並列実行（推奨）
```bash
# CoordinatorAgentで全Issue並列実行
# npm run agents:parallel:exec -- --issues 15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36 --concurrency 4
```
