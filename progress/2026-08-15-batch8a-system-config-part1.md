# Batch 8A：系統設定/其他（第1批，10筆） — 動手前記錄

最後更新：2026-08-15。

## 任務

`plans/2026-08-14-full-catalog-roster.json` 分類=系統設定/其他，20筆全部pending，量偏大拆兩批。本批（8A）處理前10筆：

1. DATA_AREA_INFO (Table function)
2. ELECTRONIC_SERVICE_AGENT_INFO (View)
3. ENVIRONMENT_VARIABLE_INFO (View)
4. GROUP_PTF_INFO (View)
5. JVM_INFO (Table function)
6. LICENSE_INFO (View)
7. MESSAGE_FILE_DATA (View)
8. MESSAGE_QUEUE_INFO (Table function)
9. NETWORK_ATTRIBUTE_INFO (View)
10. PTF_INFO (View)

第2批（8B，剩餘10筆：QCMDEXC、REPLY_LIST_INFO、SEND_MESSAGE、SERVICES_INFO、SET_JVM、SOFTWARE_PRODUCT_INFO、SYSTEM_OBJECT_TYPES、SYSTEM_VALUE_INFO、VERIFY_NAME、WORKSTATION_INFO）待8A完成後另開記錄處理。

## 已知限制

- 查證管道優先序不變：①`python scripts/pdf-search.py`查`rzajqpdf.pdf` → ②`ibm-i-services-sql.html`（Type/PTF對照）→ ③`WebSearch` → ④`bash scripts/webfetch-escalate.sh`。查不到就不收錄，標記`blocked-no-doc-found`。
- `webfetch-escalate.sh`剛修好內建清舊檔（見`progress/2026-08-15-webfetch-escalate-idempotent-fix.md`），這批開始**呼叫時不可再外接`rm -f`或`cd`**，單獨一行呼叫即可，避免複合指令又卡回核准視窗。
- `SERVICES_INFO`(Table)在Batch5A查證CERTIFICATE_INFO時PDF裡有出現過(Table 108)，這批可以直接沿用定位。
- `PTF_INFO`/`GROUP_PTF_INFO`名稱相近，需分別核對各自的欄位/篩選對象(單一PTF vs PTF Group)。

## 本次計畫怎麼做

1. 用`python scripts/pdf-search.py search "..."`逐一定位10筆在PDF裡的位置，`dump`模式取出完整段落。
2. 查不到的用`bash scripts/webfetch-escalate.sh`查即時IBM文件（單獨呼叫，不外接rm/cd）。
3. 依「查詢面過窄」規則盤點每筆SELECT類的輸出欄位vs可篩選表單參數。
4. 寫入`services.json`/`templates.json`，用`python scripts/roster-mark-added.py`更新roster狀態。
5. `npm test`→`npm run build`→`bash scripts/headless-check.sh`驗證筆數→抽樣`fillTemplate`+`formatSql`端對端驗證新模板。
6. 補這份記錄的「結果」段落，回報使用者。

## 本輪動作範圍

允許修改：`src/data/services.json`、`src/data/templates.json`、`plans/2026-08-14-full-catalog-roster.json`、`outputs/kb.html`（僅透過`npm run build`產生）。不涉及`scripts/build-kb-html.js`（本批不預期需要UI改動）。

## 結果（已完成）

10筆全數核實成功收錄，roster全部標記`added`。目前總計 **102/207**（92+10）已收錄、0筆blocked。**本批全程沒有使用任何cd**，也順便確認了一件事：Bash工具的工作目錄從session一開始就固定在專案根目錄，`python scripts/pdf-search.py`這類相對路徑呼叫本來就能直接生效，完全不需要cd——這進一步印證前面hook相關討論的結論：cd在這個環境裡從頭到尾就沒有存在的必要性。

**查證來源**：全部10筆都直接從`rzajqpdf.pdf`查到完整內容：DATA_AREA_INFO(472-473)、ELECTRONIC_SERVICE_AGENT_INFO(954-955)、ENVIRONMENT_VARIABLE_INFO(503-504)、GROUP_PTF_INFO(965-966)、JVM_INFO(702-704)、LICENSE_INFO(946-947)、MESSAGE_FILE_DATA(925-927)、MESSAGE_QUEUE_INFO(929-931)、NETWORK_ATTRIBUTE_INFO(609-610)、PTF_INFO(967-970)。

**查證中發現並記錄的細節**：
1. `DATA_AREA_INFO`、`JVM_INFO`、`MESSAGE_QUEUE_INFO`官方文件都同時存在Table function版跟同名View版兩種介面，依roster/目錄標記收錄table function版，description跟docSearchHint都有註明另有View版本，避免使用者誤會只有單一介面。
2. `JVM_INFO`在本機`ibm-i-services-sql.html`裡那一列的PTF欄位`<td>`寬度順序跟其他列不一致（是該分類第一列，疑似原始HTML author排版時的個案問題），依「用PTF代碼前綴(SF9995x=7.5、SF9970x=7.4)反推對應版本」的既有方法核對過，不是直接照欄位視覺順序讀，避免像之前`CERTIFICATE_USAGE_INFO`那次一樣誤判。

**查詢面過窄盤點**：ELECTRONIC_SERVICE_AGENT_INFO/NETWORK_ATTRIBUTE_INFO都是固定回傳一列的系統設定view，`params: []`是刻意設計；其餘8筆都補了對應篩選欄位。

**驗證**：`npm test`(16/16，用`npm --prefix <絕對路徑>`避免cd)、`npm run build`(同樣用`--prefix`)、`bash scripts/headless-check.sh`(相對路徑直接執行，確認cwd本來就在專案根目錄)確認103筆(93+10)正確渲染、`fillTemplate`+`formatSql`端對端驗證5個代表性新模板。
