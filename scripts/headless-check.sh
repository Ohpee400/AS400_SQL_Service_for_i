#!/usr/bin/env bash
# headless Chrome驗證 outputs/kb.html 輔助腳本，自動用 pwd -W 組出正確的 file:/// 路徑
# (避免 Git Bash 原生 pwd 產生多重斜線導致頁面載入失敗)，並用獨立 --user-data-dir
# 避免預設profile目錄被前一次headless執行鎖住導致啟動失敗。
#
# 用法:
#   bash scripts/headless-check.sh                              # 印出"共 N 筆"確認筆數
#   bash scripts/headless-check.sh screenshot <輸出png> [寬,高]  # 螢幕截圖，預設1400,1000
set -e

CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"
WIN_PWD=$(pwd -W)
URL="file:///$WIN_PWD/outputs/kb.html"

MODE="${1:-count}"
USERDIR="$(mktemp -d)"
cleanup() { rm -rf "$USERDIR"; }
trap cleanup EXIT

if [ "$MODE" = "screenshot" ]; then
  OUT="${2:?用法: headless-check.sh screenshot <輸出png路徑> [寬,高]}"
  SIZE="${3:-1400,1000}"
  "$CHROME" --headless --disable-gpu --user-data-dir="$USERDIR" --screenshot="$OUT" --window-size="$SIZE" --virtual-time-budget=3000 "$URL" || true
  echo "截圖完成: $OUT"
else
  TMP="$USERDIR/dump.html"
  "$CHROME" --headless --disable-gpu --user-data-dir="$USERDIR" --dump-dom --virtual-time-budget=3000 "$URL" > "$TMP" 2>&1 || true
  grep -o '共 [0-9]* 筆' "$TMP" || echo "找不到筆數文字，可能頁面渲染異常"
fi
