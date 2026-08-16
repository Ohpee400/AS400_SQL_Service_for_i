# Batch 10B：工作管理（第2批，剩餘10筆） — 動手前記錄

最後更新：2026-08-16。

## 任務

`plans/2026-08-14-full-catalog-roster.json` 分類=工作管理，Batch 10A（前11筆）已完成。本批（10B）處理剩餘10筆，完成後**工作管理分類21筆全數收齊**：

1. PRESTART_JOB_STATISTICS (Table function)
2. REMOVE_TRACKED_JOB_QUEUE (Procedure)
3. ROUTING_ENTRY_INFO (View)
4. SCHEDULED_JOB_INFO (View)
5. SUBSYSTEM_INFO (View)
6. SUBSYSTEM_POOL_INFO (View)
7. TRACKED_JOB_INFO (Table function)
8. TRACKED_JOB_QUEUES (View)
9. WATCH_DETAIL (Table function)
10. WATCH_INFO (View)

## 已知限制

- 查證管道優先序不變：①`python scripts/pdf-search.py`查`rzajqpdf.pdf` → ②`ibm-i-services-sql.html`（Type/PTF對照）→ ③`WebSearch` → ④`bash scripts/webfetch-escalate.sh`。查不到就不收錄，標記`blocked-no-doc-found`。
- **全程不使用cd**，牽涉專案外路徑一律用絕對路徑當參數傳遞。
- `PRESTART_JOB_STATISTICS`(1206-1207頁)已在Batch 10A查證時順帶取得完整內容，可直接引用。
- **Batch 10A教訓**：`roster-mark-added.py`執行前務必先確認對應services.json條目已實際寫入，不能只憑「查過PDF」的印象標記；純關鍵字搜尋可能命中不相關章節的巧合提及，找不到明確定義段落時要用更完整的標題片語(如「The XXX table function」)二次確認，避免像上一批JOB_INFO那樣誤判頁碼。

## 本次計畫怎麼做

同既有SOP：PDF查證(找不到就用完整片語重查，不臆測頁碼)→查詢面過窄盤點→寫入services.json/templates.json(每筆先確認條目已寫入再標記roster)→roster-mark-added.py→npm test/build/headless-check.sh→補結果段落。

## 本輪動作範圍

允許修改：`src/data/services.json`、`src/data/templates.json`、`plans/2026-08-14-full-catalog-roster.json`、`outputs/kb.html`（僅透過`npm run build`產生）。

## 結果（已完成）

10筆全數核實成功收錄，roster全部標記`added`前先用python核對services.json確實有對應10筆條目才執行roster-mark-added.py（吸取Batch 10A的教訓）。**工作管理分類21筆全數收齊**。roster層面 **156/207** 已收錄、0筆blocked、51筆pending。

**查證來源**：全部10筆都用完整片語「The XXX」精準搜尋一次到位，沒有再誤判頁碼：dump(1209-1220)涵蓋REMOVE_TRACKED_JOB_QUEUE(1209-1210)、ROUTING_ENTRY_INFO(1210-1212)、SCHEDULED_JOB_INFO(1212-1216)、SUBSYSTEM_INFO(1216-1217)、SUBSYSTEM_POOL_INFO(1217-1218)；dump(1248-1260)涵蓋TRACKED_JOB_INFO(1248-1258)、TRACKED_JOB_QUEUES(1258-1259)；dump(558-565)涵蓋WATCH_DETAIL(558-563)、WATCH_INFO(563-565)；PRESTART_JOB_STATISTICS(1206-1207)沿用Batch 10A查證時已取得的內容。

**細節**：`REMOVE_TRACKED_JOB_QUEUE`本身名稱在PDF跟`ibm-i-services-sql.html`都一致(跟上一批`CLEAR_TRACKED_JOB_QUEUE`的命名不一致是單一個案，不是普遍問題)；順帶注意到`ibm-i-services-sql.html`裡`REMOVE_TRACKED_JOB_QUEUE`跟前一批的`CLEAR_TRACKED_JOB_QUEUE`兩列的IBM support連結都指向同一個node(6828353)，進一步印證前一批的命名不一致推測合理(該support頁面可能是一次PTF合併多個work management強化項目的公告頁，不是逐一對應單一service的文件頁)。

**驗證**：`npm test`(16/16)、`npm run build`、`bash scripts/headless-check.sh`確認157筆(147+10)正確渲染、`node -e`端對端驗證4個代表性新模板，SQL輸出皆正確。

工作管理分類全數完成後，依使用者指示接續處理下一個分類：系統效能(15筆，預計分兩批)。
