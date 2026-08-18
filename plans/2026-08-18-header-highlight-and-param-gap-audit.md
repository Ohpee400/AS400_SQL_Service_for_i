# 分組標題強化 + SPOOLED_FILE_DATA參數缺漏Bug分析（僅分析，禁止實作）

最後更新：2026-08-18。使用者明確指示：因發現嚴重bug，本輪**禁止實作**，只能分析並回報，等待使用者下一步指示。本檔案只記錄分析結果與待選方案，尚未拍板、尚未動手。

## 問題1：分組標題列的視覺區隔不夠明顯

使用者對前一輪「字級放大＋統一底色」的結果不滿意，要求改用更明顯的highlight或底色區分。

### 已查明的根本原因

讀取`scripts/build-kb-html.js`目前的CSS token：
- `--paper: #eef1f6`（頁面底色，也是`table.catalog thead th`的底色）
- `--surface-alt: #f4f7fa`（上一輪改用的分組標題底色）

這兩個顏色的明度非常接近（都是淺灰藍色調），`--surface-alt`實際上比`--paper`**更淺**，對比不增反減，這就是為什麼使用者覺得看不出區隔——選錯了對比方向的token。

### 待選方案（尚未實作，待使用者選擇）

- **方案A：換成明顯更深的底色** — 改用`--border`（#d7dee6，比paper/surface-alt都深一階），或另外定義一個專用的較深token，搭配目前已有的放大字級＋粗體。
- **方案B：加左側色條(accent bar)** — 比照現有`.action-warning`的做法（`border-left: 3-4px solid var(--accent)`），在分組標題列左側加一條固定色（不分類別、單一accent色）的色條，作為強烈的「這是分組標題」視覺錨點，底色可維持淺色不變。
- **方案C：A+B合併** — 底色換深一階 + 左側accent色條，區隔感最強。

## 問題2：SYSTOOLS.SPOOLED_FILE_DATA缺漏SPOOLED_FILE_NUMBER參數（確認為真實bug）

### 查證依據（非猜測，已用`scripts/pdf-search.py`實際dump官方手冊原文核對）

`src/data/services.json`第3516-3529行`spooled_file_data`這筆service的`docSearchHint`寫「官方手冊`outputs/webfetch/rzajqpdf.pdf`第1057-1059頁」，`exampleSql`欄位只有：
```
SELECT * FROM TABLE(SYSTOOLS.SPOOLED_FILE_DATA(JOB_NAME => '{jobName}', SPOOLED_FILE_NAME => '{spooledFileName}')) ORDER BY ORDINAL_POSITION
```
`src/data/templates.json`第2843-2851行`spooled_file_data_query`模板的`params`也只有`jobName`、`spooledFileName`兩個。

**但實際dump第1057-1059頁原文**（官方函式簽章區塊，第1058頁），`SPOOLED_FILE_DATA`完整簽章是4個參數：
```
SPOOLED_FILE_DATA (
  JOB_NAME => job-name,
  SPOOLED_FILE_NAME => spooled-file-name,
  SPOOLED_FILE_NUMBER => spooled-file-number,
  IGNORE_ERRORS => ignore-errors
)
```
其中`spooled-file-number`原文說明：「The number of the spooled file. If this parameter is omitted, the spooled file with the highest number matching spooled-file-name is used.」——**確認是真實存在、可選（有預設值）的參數，我們的service/template兩處資料都漏掉了**。`ignore-errors`同樣是官方定義的可選參數（NO/YES控制遇錯誤時的行為），也完全沒被收錄。

### 根本原因推測（有證據支持的假設，非定論）

第1059頁緊接著的「Example」小節，官方範例SQL剛好只示範了`JOB_NAME`、`SPOOLED_FILE_NAME`兩個參數（因為這兩個是說明用最小範例，其餘兩個有預設值所以官方範例省略不寫）：
```
SELECT * FROM TABLE(SYSTOOLS.SPOOLED_FILE_DATA(
  JOB_NAME => '193846/SLROMANO/QPADEV0009',
  SPOOLED_FILE_NAME => 'QSYSPRT'))
ORDER BY ORDINAL_POSITION;
```
這跟目前`services.json`裡的`exampleSql`幾乎逐字一致（只是參數值換成`{jobName}`/`{spooledFileName}`佔位符）。**高度懷疑**：當初建立這筆資料時，是直接照抄手冊「Example」小節的SQL，而不是照抄前一頁「完整參數簽章」區塊——這是查證方法上的落差：官方文件的Example為了示範簡潔，本來就會省略有預設值的可選參數，如果建置流程是「抄Example當exampleSql、再照exampleSql反推params」，就會系統性漏掉每個服務裡「有預設值、Example沒秀出來」的可選參數。

### 已用自動化交叉比對做初步規模評估（唯讀分析，非人工逐筆查證）

寫了一段一次性node腳本（未落地成正式程式檔），比對`services.json`每筆`exampleSql`的具名參數 vs `templates.json`對應模板`sqlTemplate`的具名參數，抓出「exampleSql有、模板沒有」的落差：
- 258筆service中，抓到2筆額外落差：`change_device_locking_policy`（`FIXUP`模板缺`POLICY_PASSWORD`/`NEW_POLICY_PASSWORD`——但這筆有多個模板可能是刻意分工，需人工確認是否為誤判）、`SYSTOOLS.PING`（缺`REMOTE_SYSTEM`）。

**這個自動比對方法有已知盲點，不能當作「已完成全面查證」**：它只能抓「exampleSql有寫、模板漏掉」的落差，抓不到「exampleSql自己本來就漏參數」的情況——而`SPOOLED_FILE_DATA`剛好就是這種：`exampleSql`跟`templates.json`兩邊**一起**漏掉了`SPOOLED_FILE_NUMBER`/`IGNORE_ERRORS`，所以自動比對完全抓不到，是使用者人工抽查才發現的。

### 規模評估

`services.json`裡`type`為`Table function`（66筆）+`Procedure`（49筆）的服務，共**115筆**都是「函式呼叫帶具名參數」的型態，都有跟`SPOOLED_FILE_DATA`同樣的風險（若當初真的是照抄Example建置，任何「官方Example省略了某個有預設值參數」的服務都可能中招）。`Scalar function`（27筆）多半只有1個必要參數、風險較低但不能排除。`View`/`Table`（116筆）走的是SELECT+WHERE可篩選欄位模式，是另一條已知規則（見記憶`project_query_surface_checklist_in_plans`，2026-08-14發現過6筆output欄位vs可篩選參數落差），性質不同、不算這次bug的範圍，但同樣尚未對258筆規模重新盤點過。

**目前無法只用程式自動判斷「還有多少筆中招」**，因為問題本質是「文件裡明明有參數但被漏抄」，這需要逐筆重新對照`docSearchHint`指向的PDF頁碼原文，不是資料內部一致性檢查能發現的。

## 待使用者決策的事項（尚未實作，等待指示）

1. 問題1的分組標題方案，選A/B/C哪一個（或提出其他方向）。
2. 問題2的修復範圍：
   - (a) 先只修`spooled_file_data`這一筆（補上`SPOOLED_FILE_NUMBER`、`IGNORE_ERRORS`兩個可選參數，UI用`advanced`收合）；
   - (b) 對115筆Table function/Procedure做全面重新查證（逐筆對照PDF原文的完整簽章區塊，而非Example區塊）——工作量大，需要另外排時程，比對建議做法見上方「根本原因推測」段落。
   - 兩者不互斥，可以先做(a)止血，再排(b)的稽核批次。
