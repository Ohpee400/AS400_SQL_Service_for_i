# Batch 6：程式與程式庫（13筆） — 動手前記錄

最後更新：2026-08-15。

## 任務

`plans/2026-08-14-full-catalog-roster.json` 分類=程式與程式庫，13筆全部pending：

1. ACTIVATION_GROUP_INFO (Table function)
2. BINDING_DIRECTORY_INFO (View)
3. BOUND_MODULE_INFO (View)
4. BOUND_SRVPGM_INFO (View)
5. COMMAND_INFO (View)
6. FUNCTION_INFO (View)
7. LIBRARY_INFO (Table function)
8. LIBRARY_LIST_INFO (View)
9. PROGRAM_EXPORT_IMPORT_INFO (View)
10. PROGRAM_INFO (View)
11. PROGRAM_RESOLVED_ACTIVATIONS (Table function)
12. PROGRAM_RESOLVED_IMPORTS (Table function)
13. STACK_INFO (Table function)

## 已知限制

- 查證管道優先序不變：①`rzajqpdf.pdf`全文搜尋 → ②`ibm-i-services-sql.html`（Type/PTF對照）→ ③`WebSearch` → ④`WebFetch`/`scrapling`。查不到就不收錄，標記`blocked-no-doc-found`。
- **本批起改用 [plans/2026-08-15-batch-script-consolidation.md](2026-08-15-batch-script-consolidation.md) 新增的4支固定腳本**，取代先前每次現組python/bash指令的做法：`scripts/pdf-search.py`（PDF查證）、`scripts/webfetch-escalate.sh`（get→fetch guarded流程）、`scripts/headless-check.sh`（筆數/截圖驗證）、`scripts/roster-mark-added.py`（roster狀態更新）。這4支已加進`.claude/settings.json`白名單，不會再跳核准視窗。
- ACTIVATION_GROUP_INFO在Batch4查證EXIT_POINT_INFO時前一輪已順手看過附近頁面(page 489一帶)，這批可以直接查PDF確認。
- STACK_INFO(呼叫堆疊)、PROGRAM_RESOLVED_ACTIVATIONS/IMPORTS這幾個屬於較技術性的程式綁定/解析資訊，需注意查詢面篩選欄位是否要包含Job/程式名稱等常見篩選維度。

## 本次計畫怎麼做

1. 用`python scripts/pdf-search.py search "..."`逐一定位13筆在PDF裡的位置，`dump`模式取出完整段落。
2. 查不到的用`bash scripts/webfetch-escalate.sh`查即時IBM文件。
3. 依「查詢面過窄」規則盤點每筆SELECT類的輸出欄位vs可篩選表單參數。
4. 寫入`services.json`/`templates.json`，用`python scripts/roster-mark-added.py`更新roster狀態。
5. `npm test`→`npm run build`→`bash scripts/headless-check.sh`驗證筆數→抽樣`fillTemplate`+`formatSql`端對端驗證新模板。
6. 補這份記錄的「結果」段落，回報使用者。

## 本輪動作範圍

允許修改：`src/data/services.json`、`src/data/templates.json`、`plans/2026-08-14-full-catalog-roster.json`、`outputs/kb.html`（僅透過`npm run build`產生）。不涉及`scripts/build-kb-html.js`（本批不預期需要UI改動）。

## 結果（已完成）

13筆全數核實成功收錄，roster全部標記`added`。目前總計 **85/207**（72+13）已收錄、0筆blocked。本批是**首次全程改用4支固定腳本**，`pdf-search.py`/`webfetch-escalate.sh`全程沒有跳出核准視窗中斷作業，符合原本要解決的問題。

**查證來源**：
- 12筆直接從`rzajqpdf.pdf`查到完整內容：ACTIVATION_GROUP_INFO(441-443)、BINDING_DIRECTORY_INFO(443-445)、BOUND_MODULE_INFO(445-451)、BOUND_SRVPGM_INFO(454)、COMMAND_INFO(459-465)、FUNCTION_INFO(997-998)、LIBRARY_INFO(905-908)、LIBRARY_LIST_INFO(908-909)、PROGRAM_EXPORT_IMPORT_INFO(516-517)、PROGRAM_INFO(517-519)、PROGRAM_RESOLVED_ACTIVATIONS(531-534)、STACK_INFO(548-553)。
- `PROGRAM_RESOLVED_IMPORTS`本機PDF查無(太新)，用`webfetch-escalate.sh`對本機`ibm-i-services-sql.html`裡的`<a href>`(node/7229426)取得摘要頁確認正確IBM Documentation網址，get遇兩次503（判斷是暫時性錯誤，第三次直接對已知docs.ibm.com完整網址重試才成功，跟前幾批經驗一致）。

**查證中發現並記錄的細節**：
本類別13筆裡有4筆Table function的參數本身就要求`PROGRAM_LIBRARY`/`PROGRAM_NAME`/`OBJECT_TYPE`這組固定三元組（`PROGRAM_RESOLVED_ACTIVATIONS`、`PROGRAM_RESOLVED_IMPORTS`），沿用先前`OBJECT_PRIVILEGES`的模板風格（必填參數直接輸入，不用OR-trick）。`STACK_INFO`的`THREAD_ID`留空需要送SQL NULL而非空字串（官方預設邏輯依JOB_NAME是否為`*`而定），沿用Batch5B抓到的`NULLIF('{param}', '')`寫法，避免重蹈`KERBEROS_KEYTAB_ENTRIES`那個bug。

**查詢面過窄盤點**：BINDING_DIRECTORY_INFO/BOUND_MODULE_INFO/BOUND_SRVPGM_INFO/COMMAND_INFO/FUNCTION_INFO/PROGRAM_EXPORT_IMPORT_INFO/PROGRAM_INFO都補了對應篩選欄位；LIBRARY_LIST_INFO固定回傳目前工作的完整程式庫清單、筆數少不需篩選，params留空是刻意設計。

**驗證**：`npm test`(16/16)、`npm run build`、`bash scripts/headless-check.sh`確認86筆(73+13)正確渲染、`fillTemplate`+`formatSql`端對端驗證6個代表性新模板。
