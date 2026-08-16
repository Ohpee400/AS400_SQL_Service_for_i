# 批次作業bash指令收斂成固定腳本 — 規劃

最後更新：2026-08-15。回應使用者對Batch 5作業中反覆跳出bash核准視窗的不滿，要求把重複性(超過2次)的bash操作收斂成固定腳本/skill，目的：減少作業中斷、減少token浪費。

## 一、問題清單

Batch 4/5執行過程中，以下4類操作每次都是「臨時拼裝的bash/python指令」，字串每次不同(參數不同)，導致：
1. 每次都被判定為「新指令」跳出核准視窗，打斷連續作業。
2. 每次都要重新在對話裡現組同一套邏輯的python/bash程式碼，多花token。

## 二、已查明的根本原因

1. **腳本化程度不足**：4類操作邏輯完全固定，只有參數(搜尋詞、頁碼、URL、服務清單)不同，卻沒有寫成獨立腳本，而是每次用一次性`python -c "..."`或`bash -c "..."`現組。
2. **權限比對機制的限制**（誠實說明，非我能單方面解決的部分）：即使收斂成固定腳本，若每次呼叫的參數不同(例如URL不同)，指令字串仍然不同，Claude Code預設的權限比對還是可能視為新指令而詢問——除非使用者在自己的permission設定裡對該腳本路徑加上前綴萬用字元規則(例如 `Bash(python scripts/pdf-search.py:*)`)，才能讓「同一支腳本、不同參數」都免核准。這一步需要使用者自行到設定調整，或明確授權我協助調整，我不能未經同意就更動權限設定檔。

## 三、修復/實作方向：4支固定腳本

### 1. `scripts/pdf-search.py` — 本機PDF查證
取代目前每次現組的`python -c "import pypdf..."`。

```
python scripts/pdf-search.py search "AUTHORITY_COLLECTION view"   # 全文搜尋，印出命中頁碼
python scripts/pdf-search.py dump 972 980 outputs/pdf-dump.txt    # 匯出頁碼範圍到檔案(UTF-8寫檔，避免主控台cp950編碼崩潰)
```

### 2. `scripts/webfetch-escalate.sh` — scrapling get→fetch guarded流程
取代目前每次手動先跑`scrapling extract get`、空了再跑`extract fetch`的兩段式操作，把`scrapling-user`skill訂的guarded流程（誠實get優先、空/失敗才升級fetch、絕不自動用stealthy-fetch）寫死成腳本邏輯。

```
scripts/webfetch-escalate.sh "https://www.ibm.com/support/pages/node/xxx" outputs/webfetch/tmp_xxx.md
```
腳本內部：跑get，若輸出檔為空或抓到503/403錯誤頁特徵字串，自動升級跑fetch(`--wait 2500`)，並在失敗兩次後照skill規則停下回報、不擅自升級stealthy-fetch。

### 3. `scripts/headless-check.sh` — headless Chrome驗證
取代目前每次手動組`file:///` URL(還要記得用`pwd -W`避免路徑錯誤)、跑dump-dom、grep筆數的組合指令。

```
scripts/headless-check.sh              # 預設模式：印出"共 N 筆"確認筆數
scripts/headless-check.sh screenshot outputs/check.png   # 螢幕截圖模式
```

### 4. `scripts/roster-mark-added.py` — roster.json批次狀態更新
取代目前每批次現組的python讀寫json邏輯。

```
python scripts/roster-mark-added.py --category "程式與程式庫" --names ACTIVATION_GROUP_INFO PROGRAM_EXPORT_IMPORT_INFO ...
```
內部：讀roster.json、把符合分類+名稱清單的status改成`added`(可用`--status blocked-no-doc-found`覆寫成其他狀態)、寫回並印出統計(added/pending/blocked各幾筆)。

## 四、不在這次範圍內的事

- 不會去動使用者的Claude Code permission設定檔——只做腳本本身，是否要幫忙加白名單規則等使用者明確授權後再做，這次先不列入實作範圍。
- 不新增scrapling以外的第三方套件依賴，4支腳本都只用專案已有的pypdf/標準函式庫。

## 五、待確認

方向是否OK？確認後開始實作這4支腳本，並在`docs/`或這幾支腳本自己的說明裡記下用法，往後每批次作業改呼叫這些固定腳本，不再臨時拼裝。
