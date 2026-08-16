# Batch 7：服務工具伺服器（7筆） — 動手前記錄

最後更新：2026-08-15。

## 任務

`plans/2026-08-14-full-catalog-roster.json` 分類=服務工具伺服器，7筆全部pending：

1. ADD_SERVICE_TOOLS_SERVER_CONFIGURATION_ENTRY (Procedure)
2. CHANGE_SERVICE_TOOLS_SERVER (Procedure)
3. CHANGE_SERVICE_TOOLS_SERVER_CONFIGURATION_ENTRY (Procedure)
4. REMOVE_SERVICE_TOOLS_SERVER_CONFIGURATION_ENTRY (Procedure)
5. SERVICE_TOOLS_SERVER_CONFIGURATION_ENTRY_INFO (View)
6. SERVICE_TOOLS_SERVER_INFO (View)
7. SET_PASE_SHELL_INFO (Procedure)

本類別Procedure佔多數(5/7)，UI已有Procedure專屬警示邏輯（`type === 'Procedure'`才觸發），這批不需要額外UI調整。

## 已知限制

- 查證管道優先序不變：①`rzajqpdf.pdf`全文搜尋 → ②`ibm-i-services-sql.html`（Type/PTF對照）→ ③`WebSearch` → ④`webfetch-escalate.sh`。查不到就不收錄，標記`blocked-no-doc-found`。
- 沿用 [plans/2026-08-15-batch-script-consolidation.md](2026-08-15-batch-script-consolidation.md) 的4支固定腳本：`scripts/pdf-search.py`、`scripts/webfetch-escalate.sh`、`scripts/headless-check.sh`、`scripts/roster-mark-added.py`，已在Batch6驗證過全程不跳核准視窗。
- SET_PASE_SHELL_INFO在Batch6查USER_INFO時PDF文本裡有提過「PASE_SHELL_PATH...使用QSYS2.SET_PASE_SHELL_INFO程序設定」，這批可以直接鎖定關鍵字找到定義段落。

## 本次計畫怎麼做

1. 用`python scripts/pdf-search.py search "..."`逐一定位7筆在PDF裡的位置，`dump`模式取出完整段落。
2. 查不到的用`bash scripts/webfetch-escalate.sh`查即時IBM文件。
3. 4筆Procedure依既有UI規則會自動觸發「執行動作類」警示，不用額外處理；2筆View依「查詢面過窄」規則盤點篩選欄位。
4. 寫入`services.json`/`templates.json`，用`python scripts/roster-mark-added.py`更新roster狀態。
5. `npm test`→`npm run build`→`bash scripts/headless-check.sh`驗證筆數→抽樣`fillTemplate`+`formatSql`端對端驗證新模板。
6. 補這份記錄的「結果」段落，回報使用者。

## 本輪動作範圍

允許修改：`src/data/services.json`、`src/data/templates.json`、`plans/2026-08-14-full-catalog-roster.json`、`outputs/kb.html`（僅透過`npm run build`產生）。不涉及`scripts/build-kb-html.js`（本批不預期需要UI改動）。

## 結果（已完成）

7筆全數核實成功收錄，roster全部標記`added`。**服務工具伺服器分類7筆全數收齊**。目前總計 **92/207**（85+7）已收錄、0筆blocked。

**查證來源**：
- 3筆從`rzajqpdf.pdf`查到完整內容：CHANGE_SERVICE_TOOLS_SERVER(640-643)、SERVICE_TOOLS_SERVER_INFO(658-660)、SET_PASE_SHELL_INFO(546-547)。
- 4筆(ADD/CHANGE/REMOVE_SERVICE_TOOLS_SERVER_CONFIGURATION_ENTRY、SERVICE_TOOLS_SERVER_CONFIGURATION_ENTRY_INFO)本機PDF查無，且本機`ibm-i-services-sql.html`裡這4筆的`<a href>`全部指向同一個IBM Support摘要頁(node/7278275)——這4個service是被合併在同一篇「Service tools server configuration entry services」主題底下記錄的，用`webfetch-escalate.sh`抓一次摘要頁就拿到全部4筆各自的IBM Documentation完整連結，再分別抓取。

**查證中的插曲**：`CHANGE_SERVICE_TOOLS_SERVER_CONFIGURATION_ENTRY`跟`SERVICE_TOOLS_SERVER_CONFIGURATION_ENTRY_INFO`的真實網址一開始查詢連續2次都是503（get跟fetch各試一次都失敗），一度懷疑是猜錯slug——改用另一手法(改抓同系列的VIEW頁，看它側欄TOC列出的真實連結)反過來確認，赫然發現側欄TOC列出的slug跟我一開始猜的完全一樣，證明不是猜錯而是IBM文件站當下暫時性不穩定，第三輪重試就正常了。另外官方摘要頁本身給`REMOVE_SERVICE_TOOLS_SERVER_CONFIGURATION_ENTRY`的連結指向一個看起來像內部測試網域(`ibmdocs-test.dcs.ibm.com`)，判斷是IBM自己文件系統的authoring bug，沒有照抄那個連結，改用同系列其他3筆的slug命名規律推導出正確的docs.ibm.com網址並成功驗證。

**查詢面過窄盤點**：本類別5筆是Procedure(動作類CALL)，直接對應官方參數，`CHANGE_SERVICE_TOOLS_SERVER`/`CHANGE_SERVICE_TOOLS_SERVER_CONFIGURATION_ENTRY`所有可選參數官方文件明確寫「留空=該項不變更」，沿用`NULLIF('{param}', '')`寫法讓留空時送SQL NULL而不是空字串。2筆View(SERVICE_TOOLS_SERVER_INFO/SERVICE_TOOLS_SERVER_CONFIGURATION_ENTRY_INFO)都是固定回傳全部設定資訊，不需篩選欄位，`params: []`是刻意設計。

**驗證**：`npm test`(16/16)、`npm run build`、`bash scripts/headless-check.sh`確認93筆(86+7)正確渲染、`fillTemplate`+`formatSql`端對端驗證5個代表性新模板。
