# Batch 5A：安全稽核（第1批，13筆） — 動手前記錄

最後更新：2026-08-15。

## 任務

`plans/2026-08-14-full-catalog-roster.json` 分類=安全稽核，目前pending共26筆，量偏大依既定慣例拆兩小批。本批（5A）處理前13筆：

1. AUTHORITY_COLLECTION (View)
2. AUTHORITY_COLLECTION_DLO (View)
3. AUTHORITY_COLLECTION_FSOBJ (View)
4. AUTHORITY_COLLECTION_IFS (View)
5. AUTHORITY_COLLECTION_LIBRARIES (View)
6. AUTHORITY_COLLECTION_OBJECT (View)
7. AUTHORIZATION_LIST_INFO (View)
8. AUTHORIZATION_LIST_USER_INFO (View)
9. CERTIFICATE_INFO (Table function)
10. CERTIFICATE_USAGE_INFO (View)
11. CHANGE_TOTP_KEY (Table function)
12. CHECK_PASSWORD (Table function)
13. CHECK_TOTP (Scalar function)

第2批（5B，剩餘13筆：EKM_INFO、EXIT_POINT_INFO、EXIT_PROGRAM_INFO、FUNCTION_USAGE、GROUP_PROFILE_ENTRIES、KERBEROS_KEYTAB_ENTRIES、OBJECT_OWNERSHIP、OBJECT_PRIVILEGES、SECURITY_INFO、SQL_CHECK_AUTHORITY、SQL_CHECK_FUNCTION_USAGE、SQL_CHECK_SPECIAL_AUTHORITY、USER_INFO_BASIC）待5A完成後另開記錄處理。

## 已知限制

- 查證管道優先序不變：①`rzajqpdf.pdf`全文搜尋 → ②`ibm-i-services-sql.html`（Type/PTF對照，含`<a href>`可追蹤真實連結，這是Batch4後才確立的新習慣）→ ③`WebSearch` → ④`WebFetch`/`scrapling`（`get`→`fetch`，`stealthy-fetch`需每次另外授權）。查不到就不收錄，標記`blocked-no-doc-found`，不留verified:false草稿。
- `AUTHORITY_COLLECTION`系列6筆(含DLO/FSOBJ/IFS/LIBRARIES/OBJECT)是同一組功能的不同視角(整體/文件庫物件/檔案系統物件/IFS/程式庫/物件層級)，須逐筆核對各自實際欄位差異，不能因為名稱相近就套用同一份規格。
- `CHECK_PASSWORD`、`CHANGE_TOTP_KEY`、`CHECK_TOTP`涉及密碼/雙因子驗證，屬敏感操作類，若UI呈現需要比照先前RECEIVE_DATA_QUEUE/CREATE_DATA_JOURNAL_READER的模式判斷是否需要在description額外註明風險，不預設展開UI邏輯範圍。

## 本次計畫怎麼做

1. 逐筆查證：正確語法(View/Table function/Scalar function)、完整欄位或參數定義、PTF/OS版本。
2. 依「查詢面過窄」規則盤點每筆SELECT類(View/Table function/Scalar function)的輸出欄位vs可篩選表單參數。
3. 依「報表」用詞規則（如有Spooled File相關措辭）。
4. 寫入`services.json`/`templates.json`，更新roster狀態。
5. `npm test`→`npm run build`→headless Chrome驗證筆數與無錯誤→抽樣`fillTemplate`+`formatSql`端對端驗證新模板。
6. 補這份記錄的「結果」段落，回報使用者。

## 本輪動作範圍

允許修改：`src/data/services.json`、`src/data/templates.json`、`plans/2026-08-14-full-catalog-roster.json`、`outputs/kb.html`（僅透過`npm run build`產生）。不涉及`scripts/build-kb-html.js`（本批不預期需要UI改動）。

## 結果（已完成）

13筆全數核實成功收錄，roster全部標記`added`。目前總計 **59/207**（46+13）已收錄、0筆blocked。

**查證來源**：
- AUTHORITY_COLLECTION系列6筆：IBM Documentation`collection-authority-views`頁（scrapling `get`一次成功拿到完整共用欄位表，涵蓋全部6個view），PTF對照另用本機`ibm-i-services-sql.html`逐筆核對（`fetch`第一次逾時，重試`--timeout 40000`成功）。
- AUTHORIZATION_LIST_INFO/USER_INFO、CERTIFICATE_INFO：本機`rzajqpdf.pdf`第972-979頁全文有完整內容，含正確語法/欄位/範例。
- CERTIFICATE_USAGE_INFO、CHECK_PASSWORD：`rzajqpdf.pdf`第980-995頁。
- CHANGE_TOTP_KEY、CHECK_TOTP：本機PDF查無(too new)，改用本機`ibm-i-services-sql.html`的`<a href>`真實連結（node/7229419、node/7229421）先拿摘要頁確認完整IBM Documentation網址，再`fetch`該網址取得完整語法（第二筆`get`503一次，重試後200成功——確認是暫時性錯誤非永久失敗）。

**查證中發現並記錄的細節**：
1. `CHANGE_TOTP_KEY`／`CHECK_TOTP`的IBM Support摘要頁JSON-LD metadata寫「Version: 7.5.0 and future releases」，但本機`ibm-i-services-sql.html`實際PTF對照表寫7.6=Base、7.5/7.4/7.3皆Not Supported——兩者矛盾。採信PTF對照表（這是該表格存在的目的），metadata的Version欄位判斷是較籠統的內容分類標記，不是精確的服務可用性依據。
2. `CHANGE_TOTP_KEY`是Table function但實際上是會異動使用者MFA設定的動作類呼叫（產生/移除TOTP金鑰），UI目前的「執行動作類」警示只對`type === 'Procedure'`生效，這裡不會觸發——跟先前`CREATE_DATA_JOURNAL_READER`／`RECEIVE_DATA_QUEUE`屬於同一類已知UI落差，已在description跟docSearchHint加註提醒，沒有擴大這輪的UI邏輯改動範圍。
3. `CERTIFICATE_USAGE_INFO`在本機`ibm-i-services-sql.html`裡的PTF欄位寬度跟其他列不一致（少一欄），依SF9996x/SF9995x/SF9970x/SF9970x的PTF群組前綴字首判斷實際對應版本（而非依欄位寬度位置），判斷為7.6/7.5需PTF、7.4/7.3不支援。

**查詢面過窄盤點**：AUTHORITY_COLLECTION系列6筆共用約65個輸出欄位，表單只挑實務上最常用的篩選維度（使用者/物件名稱/物件所在Library/路徑/檢查結果），沒有逐一開放全部65欄位當篩選參數——判斷這是合理取捨，不是查詢面過窄，因為使用者可以先用這幾個核心維度縮小範圍，其餘欄位在SELECT *結果裡都看得到。

**驗證**：`npm test`(16/16)、`npm run build`、headless Chrome確認60筆(47+13)正確渲染、`fillTemplate`+`formatSql`端對端驗證6個代表性新模板（含OR-trick、VALUES、TABLE()三種語法）皆產生正確SQL。
