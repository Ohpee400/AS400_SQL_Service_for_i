# Batch 8B：系統設定/其他（第2批，剩餘10筆） — 動手前記錄

最後更新：2026-08-16。

## 任務

`plans/2026-08-14-full-catalog-roster.json` 分類=系統設定/其他，Batch 8A（前10筆）已完成，本批（8B）處理剩餘10筆，同時**系統設定/其他分類20筆全數收齊**：

1. QCMDEXC (Procedure)
2. REPLY_LIST_INFO (View)
3. SEND_MESSAGE (Procedure)
4. SERVICES_INFO (Table)
5. SET_JVM (Procedure)
6. SOFTWARE_PRODUCT_INFO (View)
7. SYSTEM_OBJECT_TYPES (Table)
8. SYSTEM_VALUE_INFO (View)
9. VERIFY_NAME (Scalar function)
10. WORKSTATION_INFO (View)

## 已知限制

- 查證管道優先序不變：①`python scripts/pdf-search.py`查`rzajqpdf.pdf` → ②`ibm-i-services-sql.html`（Type/PTF對照）→ ③`WebSearch` → ④`bash scripts/webfetch-escalate.sh`。查不到就不收錄，標記`blocked-no-doc-found`。
- **全程不使用cd**，牽涉專案外路徑一律用絕對路徑當參數傳遞（見`progress/2026-08-15-compound-bash-blocking-hook.md`）。
- **本輪起`CLAUDE.md`「動手前記錄」規則已擴大到所有實作項目**，本記錄本身就是照新規則產出。
- `SERVICES_INFO`在Batch5A查證CERTIFICATE_INFO時PDF裡出現過(Table 108)，這批可以直接定位。
- `QCMDEXC`是很基礎常用的CL指令執行介面，注意跟一般CALL Procedure的語法差異(通常用`VALUES QSYS2.QCMDEXC(...)`)。

## 本次計畫怎麼做

1. 用`python scripts/pdf-search.py search "..."`逐一定位10筆在PDF裡的位置，`dump`模式取出完整段落。
2. 查不到的用`bash scripts/webfetch-escalate.sh`查即時IBM文件。
3. 依「查詢面過窄」規則盤點每筆SELECT類的輸出欄位vs可篩選表單參數。
4. 寫入`services.json`/`templates.json`，用`python scripts/roster-mark-added.py`更新roster狀態。
5. `npm test`→`npm run build`→`bash scripts/headless-check.sh`驗證筆數→抽樣`fillTemplate`+`formatSql`端對端驗證新模板。
6. 補這份記錄的「結果」段落，回報使用者。完成後系統設定/其他分類20筆全數收齊。

## 本輪動作範圍

允許修改：`src/data/services.json`、`src/data/templates.json`、`plans/2026-08-14-full-catalog-roster.json`、`outputs/kb.html`（僅透過`npm run build`產生）。不涉及`scripts/build-kb-html.js`（本批不預期需要UI改動）。

## 結果（已完成）

10筆全數核實成功收錄，roster全部標記`added`。**系統設定/其他分類20筆全數收齊，Batch 8結束**。roster層面 **112/207** 已收錄、0筆blocked、95筆pending。

**查證來源**：全部10筆都直接從`rzajqpdf.pdf`查到完整內容：QCMDEXC(535-536，注意官方文件同時有procedure跟scalar function兩種呼叫方式，收錄procedure版)、REPLY_LIST_INFO(934)、SEND_MESSAGE(935-936)、SERVICES_INFO(544-545)、SET_JVM(706)、SOFTWARE_PRODUCT_INFO(948-949)、SYSTEM_OBJECT_TYPES(917-918)、SYSTEM_VALUE_INFO(1247-1248，注意第一次猜的頁碼1117-1119是誤判，那邊只是範例引用不是定義本體，改查另一個候選頁碼1247才找到真正定義)、VERIFY_NAME(557-558)、WORKSTATION_INFO(1260-1261)。

**查證中發現並記錄的細節**：`QCMDEXC`第一次搜尋PDF找到的237-239頁只是Query Supervisor範例程式碼裡剛好提到"qcmdexc"這個RPG API呼叫，不是真正的服務定義，改用`search`功能精準比對「QCMDEXC scalar function」/「QCMDEXC procedure」這種完整標題字串才找到真正的535-536頁定義——這個案例值得記住：純關鍵字搜尋有時會命中範例程式碼裡的巧合提及，要用更完整的標題字串二次確認。

**查詢面過窄盤點**：REPLY_LIST_INFO(只回傳目前工作)、SERVICES_INFO已補分類/名稱篩選、其餘皆已補對應篩選欄位。

**驗證**：`npm test`(16/16)、`npm run build`、`bash scripts/headless-check.sh`確認113筆(103+10)正確渲染、`fillTemplate`+`formatSql`端對端驗證5個代表性新模板。

**額外發現並記錄（資料一致性核對）**：build後headless確認的services.json實際筆數(113)比roster.json的added計數(112)多1，經比對找出原因：`systablestat`這一筆(`QSYS2.SYSTABLESTAT / QSYS2.SYSPARTITIONSTAT`，屬於最初10筆核實範圍、分類「大檔案分析」)**不在`plans/2026-08-14-full-catalog-roster.json`的207筆官方目錄清單裡**——不是漏更新status，是這筆本身就不在207筆掃描範圍內(可能官方目錄頁面用不同呈現方式列這兩個view，建roster時的自動擷取沒收錄到)。**這不是bug、不需要修正roster**，但往後回報進度時要記得：`services.json`總筆數 = roster的207筆基準進度(目前112/207) + 這1筆額外的既有服務，避免之後看到「113 vs 112」這種數字差異誤以為算錯或漏記。
