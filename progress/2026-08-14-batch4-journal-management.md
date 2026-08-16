# Batch 4：日誌管理延伸 — 動手前記錄

最後更新：2026-08-14。

## 任務
`plans/2026-08-14-full-catalog-expansion-master-plan.md` 批次順序第4項：日誌管理分類延伸，共14筆（16筆該分類扣掉已收錄的`journal_info`）。

## 已知限制
沿用既有查證管道優先序：① `rzajqpdf.pdf`全文搜尋 → ② `ibm-i-services-sql.html`（Type/PTF對照）→ ③ `WebFetch`抓IBM官方文件網站即時內容 → ④ `scrapling-user`skill guarded流程。查不到就不收錄（`project-full-verification-required`規則）。

## 本次計畫怎麼做
1. 從 `plans/2026-08-14-full-catalog-roster.json` 取出分類=日誌管理、status=pending的service清單。
2. 逐筆查證：正確語法(View/Table function/Procedure)、完整欄位或參數定義、PTF/OS版本。
3. 依「查詢面過窄」規則盤點每筆SELECT類的輸出欄位vs可篩選參數。
4. 依這輪確立的「報表」用詞規則（若有Spooled File相關措辭要注意），寫入`services.json`/`templates.json`。
5. 更新roster狀態、rebuild、`npm test`、headless Chrome驗證。

## 本輪動作範圍
允許修改：`src/data/services.json`、`src/data/templates.json`、`plans/2026-08-14-full-catalog-roster.json`、`scripts/build-kb-html.js`(若UI有需要調整)、`outputs/kb.html`(僅透過`npm run build`產生，不手動編輯)。

## 結果（已完成）

- 15筆pending裡，14筆核實成功收錄：`ASSOCIATE_JOURNAL_RECEIVER`、`AUDIT_JOURNAL_DATA_MART_INFO`、`DB_TRANSACTION_INFO`／`_JOURNAL_INFO`／`_OBJECT_INFO`／`_RECORD_INFO`、`DISPLAY_JOURNAL`、`HISTORY_LOG_INFO`、`JOURNALED_OBJECTS`、`JOURNAL_CODE_INFO`、`JOURNAL_INHERIT_RULES`、`JOURNAL_RECEIVER_INFO`、`MANAGE_AUDIT_JOURNAL_DATA_MART`、`REMOTE_JOURNAL_INFO`。
- 查證依據：`rzajqpdf.pdf`第479-503、706-903、918-928頁 + `ibm-i-services-sql.html` PTF對照。
- 1筆查不到、未收錄：`CREATE_DATA_JOURNAL_READER`。`rzajqpdf.pdf`全文搜尋不到、`WebSearch`找不到、猜測的IBM Docs網址(`ibm.com/docs/en/i/7.6.0?topic=services-create-data-journal-reader-table-function`等)用`WebFetch`跟`scrapling`都被302導回文件首頁。**但使用者事後截圖顯示 `outputs/webfetch/ibm-i-services-sql.html`（本機已存檔的官方PTF對照表）裡 `QSYS2.CREATE_DATA_JOURNAL_READER()` 本身就是一個可點擊連結**——這個連結本身可能就是正確的官方文件網址，這輪沒有去解析/追蹤這個HTML檔案裡實際的`href`屬性去查證，只顧著用WebSearch/猜URL，是查證管道沒用全。**下一輪處理這筆前，先解析本機`ibm-i-services-sql.html`裡`QSYS2.CREATE_DATA_JOURNAL_READER`那個`<a>`標籤的`href`，用那個真實連結去`WebFetch`/`scrapling`，不要再用猜的URL。**
- roster狀態：`CREATE_DATA_JOURNAL_READER` 標記 `blocked-no-doc-found`（不是pending，代表查證卡住，等下一輪用上面的新線索重試，不是漏掉沒處理）。
- 驗證：`npm test`(16/16)、`npm run build`、headless Chrome確認46筆正確渲染、`fillTemplate`+`formatSql`對`display_journal_check`/`history_log_info_check`/`manage_audit_journal_data_mart_call`/`db_transaction_journal_info_check`端對端驗證過。
