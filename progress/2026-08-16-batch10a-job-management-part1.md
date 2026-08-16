# Batch 10A：工作管理（第1批，共21筆中的前11筆） — 動手前記錄

最後更新：2026-08-16。

## 任務

`plans/2026-08-14-full-catalog-roster.json` 分類=工作管理，現查pending共21筆，分兩批處理。本批（10A）處理前11筆：

1. ADD_TRACKED_JOB_QUEUE (Procedure)
2. AUTOSTART_JOB_INFO (View)
3. CLEAR_TRACKED_JOB_QUEUE (Procedure)
4. COMMUNICATIONS_ENTRY_INFO (View)
5. GET_JOB_INFO (Table function)
6. JOBLOG_INFO (Table function)
7. JOB_DESCRIPTION_INFO (View)
8. JOB_INFO (Table function)
9. JOB_QUEUE_INFO (View)
10. OPEN_FILES (Table function)
11. PRESTART_JOB_INFO (View)

剩餘10筆（PRESTART_JOB_STATISTICS ~ WATCH_INFO）留待Batch 10B。

## 已知限制

- 查證管道優先序不變：①`python scripts/pdf-search.py`查`rzajqpdf.pdf` → ②`ibm-i-services-sql.html`（Type/PTF對照）→ ③`WebSearch` → ④`bash scripts/webfetch-escalate.sh`。查不到就不收錄，標記`blocked-no-doc-found`。
- **全程不使用cd**，牽涉專案外路徑一律用絕對路徑當參數傳遞。
- 依使用者指示，本輪起連續處理剩餘所有分類直到207/207，每個分類/子批次仍各自遵守「動手前後留progress記錄」規則。
- ADD/CLEAR/REMOVE_TRACKED_JOB_QUEUE屬於同一組追蹤工作佇列(tracked job queue)功能的Procedure，注意跟TRACKED_JOB_INFO/TRACKED_JOB_QUEUES(View/Table function查詢類)是不同服務、參數簽名需分開查證。

## 本次計畫怎麼做

同既有SOP：PDF查證→查詢面過窄盤點→寫入services.json/templates.json→roster-mark-added.py→npm test/build/headless-check.sh→補結果段落。

## 本輪動作範圍

允許修改：`src/data/services.json`、`src/data/templates.json`、`plans/2026-08-14-full-catalog-roster.json`、`outputs/kb.html`（僅透過`npm run build`產生）。

## 結果（已完成，含一次自我糾正）

11筆全數核實成功收錄，roster全部標記`added`。roster層面 **146/207** 已收錄、0筆blocked、61筆pending。

**查證來源**：一次dump(1138-1161頁)涵蓋ADD_TRACKED_JOB_QUEUE(1138-1139)、AUTOSTART_JOB_INFO(1142-1143)、CLEAR_TRACKED_JOB_INFO(1143-1145)、COMMUNICATIONS_ENTRY_INFO(1145-1147)、GET_JOB_INFO(1153-1155)、JOB_DESCRIPTION_INFO(1155-1161)；另dump(922-925)取得JOBLOG_INFO；dump(1188-1207)取得JOB_QUEUE_INFO(1188-1191)、OPEN_FILES(1199-1201)、PRESTART_JOB_INFO(1202-1207)，同時取得下一批要用的PRESTART_JOB_STATISTICS(1206-1207)可直接引用。

**過程中發現並即時修正的錯誤（重要）**：
1. **roster項目「CLEAR_TRACKED_JOB_QUEUE」查無此名稱的procedure**：PDF書本只有「CLEAR_TRACKED_JOB_INFO procedure」，透過WebSearch+scrapling get→fetch核對IBM官方文件(https://www.ibm.com/docs/en/i/7.5.0?topic=procedure-submitted-job-tracker)TOC與內文，確認官方現行名稱就是CLEAR_TRACKED_JOB_INFO，本機`ibm-i-services-sql.html`對照表裡把這一列的名稱誤植為「QSYS2.CLEAR_TRACKED_JOB_QUEUE()」，屬於該來源本身的命名不一致。已用services.json實際收錄「QSYS2.CLEAR_TRACKED_JOB_INFO」並在docSearchHint完整記錄核對過程，roster仍用其原始名稱「CLEAR_TRACKED_JOB_QUEUE」標記完成(該筆roster.json的name欄位保留原樣，不影響services.json內容正確性)。
2. **JOB_INFO一度誤標roster為added但實際漏寫services.json條目**：因PDF關鍵字搜尋「JOB_INFO table function」誤命中378頁(Plan Cache Services章節裡巧合出現的文字)，當下沒有察覺頁碼不對就直接把roster狀態標成added，事後重新檢查時發現services.json裡根本沒有對應條目。已立即用python把roster該筆狀態改回pending、改用完整片語「The JOB_INFO table function」重新搜尋找到正確頁碼(1162-1165)，補上完整驗證後的services.json/templates.json條目，再重新標記roster為added，最終筆數對得上(147=136+11)。這個案例提醒：往後每次roster-mark-added.py執行前，都要先確認對應的services.json條目確實已經寫入，不能只憑「已經查過PDF」的印象就標記完成。

**驗證**：`npm test`(16/16)、`npm run build`、`bash scripts/headless-check.sh`確認147筆(136+11)正確渲染、`node -e`端對端驗證4個代表性新模板，SQL輸出皆正確。

## 下一批預告

Batch 10B（工作管理剩餘10筆：PRESTART_JOB_STATISTICS ~ WATCH_INFO）將接續進行，其中`PRESTART_JOB_STATISTICS`(1206-1207頁)已在本批查證時順帶取得完整內容，可直接引用不需重查。
