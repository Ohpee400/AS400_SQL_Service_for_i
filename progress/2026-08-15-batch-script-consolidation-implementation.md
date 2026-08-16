# 批次作業bash指令收斂成固定腳本 — 實作記錄

最後更新：2026-08-15。對應規劃檔 [plans/2026-08-15-batch-script-consolidation.md](../plans/2026-08-15-batch-script-consolidation.md)，使用者已確認方向並明確授權調整permission設定。

## 任務
把Batch 5作業中反覆現組、每次觸發bash核准視窗的4類操作收斂成固定腳本，並調整專案層級permission設定讓這4支腳本不再逐次詢問。

## 本次動作範圍
新增：`scripts/pdf-search.py`、`scripts/webfetch-escalate.sh`、`scripts/headless-check.sh`、`scripts/roster-mark-added.py`。
修改：`.claude/settings.json`（新增permissions.allow規則）。

## 結果（已完成）

### 一、新增的4支腳本

| 腳本 | 取代的操作 | 用法 |
|---|---|---|
| `scripts/pdf-search.py` | 每次現組`python -c "import pypdf..."`查PDF | `python scripts/pdf-search.py search "<搜尋字串>"` / `python scripts/pdf-search.py dump <起始頁> <結束頁> <輸出檔案>` |
| `scripts/webfetch-escalate.sh` | 手動分兩段跑scrapling get再fetch | `bash scripts/webfetch-escalate.sh <url> <輸出.md>` |
| `scripts/headless-check.sh` | 每次現組file:///路徑+dump-dom+grep筆數 | `bash scripts/headless-check.sh`（筆數）/ `bash scripts/headless-check.sh screenshot <輸出png>`（截圖） |
| `scripts/roster-mark-added.py` | 每批次現組python讀寫roster.json | `python scripts/roster-mark-added.py --category "分類" --names NAME1 NAME2 ...` |

**開發中發現並修正的2個bug**（都在功能測試階段抓到，未上線就修掉）：
1. `headless-check.sh`：一開始用`set -e` + Chrome指令沒有`|| true`，Chrome headless若回傳非0結束碼(常見，即使畫面有正常渲染)會讓整支腳本提前中止，永遠印不出「找不到筆數文字」的fallback訊息。已在Chrome呼叫後補`|| true`。
2. `headless-check.sh`：用`mktemp`(不指定`--user-data-dir`)搭配headless Chrome時，遇到「Missing headless user data directory」啟動失敗(可能是預設profile目錄鎖定衝突)。已改成每次執行用`mktemp -d`建立獨立的`--user-data-dir`，執行完用`trap ... EXIT`自動清掉。
3. `webfetch-escalate.sh`同步補上`|| true`，避免scrapling因目標網站回傳503/403等錯誤時，`set -e`讓腳本在還沒判斷是否要升級fetch前就先中止。

**測試結果**：4支都各自做過至少一次真實資料的功能測試（PDF搜尋/dump、headless筆數確認73筆/截圖、webfetch對已知成功URL跟需要升級fetch的URL各測一次、roster腳本對已是`added`狀態的項目做等冪測試不影響實際計數），全部正常。

### 二、Permission設定調整

**檔案**：`c:\Users\clarkyun\Desktop\clark\Claude_Code_Lab\AS400_SQL_Service_for_i\.claude\settings.json`（專案層級設定，只影響這個專案，不影響其他專案）

**調整前**：
```json
{
  "hooks": {}
}
```

**調整後**：
```json
{
  "hooks": {},
  "permissions": {
    "allow": [
      "Bash(python scripts/pdf-search.py *)",
      "Bash(bash scripts/webfetch-escalate.sh *)",
      "Bash(bash scripts/headless-check.sh *)",
      "Bash(python scripts/roster-mark-added.py *)"
    ]
  }
}
```

**效果**：往後只要指令是以這4個固定前綴開頭（不管後面接什麼參數/URL/頁碼），都會被視為已授權，不會再跳出核准視窗中斷作業。範圍嚴格限定在這4支腳本本身，不會放寬到其他任意bash指令。

## 未來批次的使用方式

往後查證/驗證流程改呼叫這4支腳本，不再臨時拼裝python/bash指令：
1. PDF查證：`python scripts/pdf-search.py search "..."` 找頁碼 → `python scripts/pdf-search.py dump <頁碼範圍> <輸出檔案>` 取內容。
2. 本機PDF查無資料時：`bash scripts/webfetch-escalate.sh <url> <輸出.md>` 一次完成get→fetch guarded流程。
3. 每批寫完資料後：`bash scripts/headless-check.sh` 確認筆數，必要時 `bash scripts/headless-check.sh screenshot <輸出png>` 看畫面。
4. 更新roster狀態：`python scripts/roster-mark-added.py --category "分類名" --names NAME1 NAME2 ...`
