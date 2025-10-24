#!/bin/bash

# DAGベースのIssue並列実行スクリプト
# Repository: hughverine/1024_ax_skil-test

set -e

REPO="hughverine/1024_ax_skil-test"
LOG_DIR=".ai/logs"
REPORT_DIR=".ai/parallel-reports"

mkdir -p "$LOG_DIR"
mkdir -p "$REPORT_DIR"

# ログファイル
LOG_FILE="$LOG_DIR/execution-$(date +%Y-%m-%d-%H%M%S).log"
REPORT_FILE="$REPORT_DIR/execution-report-$(date +%s).json"

echo "🤖 Issue DAG Executor - $(date)" | tee -a "$LOG_FILE"
echo "Repository: $REPO" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# 実行関数
execute_issue() {
  local issue_number=$1
  echo "================================================================================
" | tee -a "$LOG_FILE"
  echo "🚀 Executing Issue #$issue_number" | tee -a "$LOG_FILE"
  echo "================================================================================
" | tee -a "$LOG_FILE"

  # Issue詳細を取得
  gh issue view "$issue_number" --repo "$REPO" --json number,title,body | tee -a "$LOG_FILE"

  echo "" | tee -a "$LOG_FILE"
  echo "⚠️  Note: 自動コード生成は未実装です。Issue #15完了後にCoordinatorAgentが利用可能になります。" | tee -a "$LOG_FILE"
  echo "" | tee -a "$LOG_FILE"
}

# Level 0: プロジェクト基盤
echo "📍 Level 0: プロジェクト基盤" | tee -a "$LOG_FILE"
execute_issue 15

echo ""
echo "⏸️  Level 0完了。次のレベルに進む前にIssue #15を手動で実装してください。" | tee -a "$LOG_FILE"
echo ""
read -p "Issue #15が完了しましたか？ (y/n): " confirm

if [ "$confirm" != "y" ]; then
  echo "❌ 実行を中断しました。" | tee -a "$LOG_FILE"
  exit 0
fi

# Level 1: データベース基盤（並列実行可能）
echo "📍 Level 1: データベース基盤（並列実行: 2）" | tee -a "$LOG_FILE"
execute_issue 16 &
execute_issue 17 &
wait

echo ""
read -p "Level 1（Issue #16, #17）が完了しましたか？ (y/n): " confirm
if [ "$confirm" != "y" ]; then
  echo "❌ 実行を中断しました。" | tee -a "$LOG_FILE"
  exit 0
fi

# Level 2: データ投入
echo "📍 Level 2: データ投入" | tee -a "$LOG_FILE"
execute_issue 18

read -p "Level 2（Issue #18）が完了しましたか？ (y/n): " confirm
if [ "$confirm" != "y" ]; then
  echo "❌ 実行を中断しました。" | tee -a "$LOG_FILE"
  exit 0
fi

# Level 3: LLM基盤（並列実行可能）
echo "📍 Level 3: LLM基盤（並列実行: 2）" | tee -a "$LOG_FILE"
execute_issue 19 &
execute_issue 20 &
wait

read -p "Level 3（Issue #19, #20）が完了しましたか？ (y/n): " confirm
if [ "$confirm" != "y" ]; then
  echo "❌ 実行を中断しました。" | tee -a "$LOG_FILE"
  exit 0
fi

# Level 4: 出題エンジン（並列実行可能）
echo "📍 Level 4: 出題エンジン（並列実行: 3）" | tee -a "$LOG_FILE"
execute_issue 21 &
execute_issue 22 &
execute_issue 23 &
wait

read -p "Level 4（Issue #21, #22, #23）が完了しましたか？ (y/n): " confirm
if [ "$confirm" != "y" ]; then
  echo "❌ 実行を中断しました。" | tee -a "$LOG_FILE"
  exit 0
fi

# Level 5: 採点エンジン（並列実行可能）
echo "📍 Level 5: 採点エンジン（並列実行: 2）" | tee -a "$LOG_FILE"
execute_issue 24 &
execute_issue 25 &
wait

read -p "Level 5（Issue #24, #25）が完了しましたか？ (y/n): " confirm
if [ "$confirm" != "y" ]; then
  echo "❌ 実行を中断しました。" | tee -a "$LOG_FILE"
  exit 0
fi

# Level 6: 補完ロジック
echo "📍 Level 6: 補完ロジック" | tee -a "$LOG_FILE"
execute_issue 26

read -p "Level 6（Issue #26）が完了しましたか？ (y/n): " confirm
if [ "$confirm" != "y" ]; then
  echo "❌ 実行を中断しました。" | tee -a "$LOG_FILE"
  exit 0
fi

# Level 7: API実装
echo "📍 Level 7: API実装" | tee -a "$LOG_FILE"
execute_issue 27

read -p "Level 7（Issue #27）が完了しましたか？ (y/n): " confirm
if [ "$confirm" != "y" ]; then
  echo "❌ 実行を中断しました。" | tee -a "$LOG_FILE"
  exit 0
fi

# Level 8: UI実装（並列実行可能）
echo "📍 Level 8: UI実装（並列実行: 4）" | tee -a "$LOG_FILE"
execute_issue 28 &
execute_issue 29 &
execute_issue 30 &
execute_issue 31 &
wait

read -p "Level 8（Issue #28, #29, #30, #31）が完了しましたか？ (y/n): " confirm
if [ "$confirm" != "y" ]; then
  echo "❌ 実行を中断しました。" | tee -a "$LOG_FILE"
  exit 0
fi

# Level 9: 追加機能（並列実行可能）
echo "📍 Level 9: 追加機能（並列実行: 3）" | tee -a "$LOG_FILE"
execute_issue 32 &
execute_issue 33 &
execute_issue 34 &
wait

read -p "Level 9（Issue #32, #33, #34）が完了しましたか？ (y/n): " confirm
if [ "$confirm" != "y" ]; then
  echo "❌ 実行を中断しました。" | tee -a "$LOG_FILE"
  exit 0
fi

# Level 10: 監査ログ
echo "📍 Level 10: 監査ログ" | tee -a "$LOG_FILE"
execute_issue 35

read -p "Level 10（Issue #35）が完了しましたか？ (y/n): " confirm
if [ "$confirm" != "y" ]; then
  echo "❌ 実行を中断しました。" | tee -a "$LOG_FILE"
  exit 0
fi

# Level 11: テスト
echo "📍 Level 11: テスト" | tee -a "$LOG_FILE"
execute_issue 36

echo ""
echo "✅ 全Issue実行完了！" | tee -a "$LOG_FILE"
echo "📊 ログファイル: $LOG_FILE" | tee -a "$LOG_FILE"
echo ""
