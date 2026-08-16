# Batch 5B：安全稽核（第2批，剩餘13筆） — 動手前記錄

最後更新：2026-08-15。

## 任務

`plans/2026-08-14-full-catalog-roster.json` 分類=安全稽核，Batch 5A（前13筆）已完成，本批（5B）處理剩餘13筆：

1. EKM_INFO (Table function)
2. EXIT_POINT_INFO (View)
3. EXIT_PROGRAM_INFO (View)
4. FUNCTION_USAGE (View)
5. GROUP_PROFILE_ENTRIES (View)
6. KERBEROS_KEYTAB_ENTRIES (Table function)
7. OBJECT_OWNERSHIP (View)
8. OBJECT_PRIVILEGES (Table function)
9. SECURITY_INFO (View)
10. SQL_CHECK_AUTHORITY (Scalar function)
11. SQL_CHECK_FUNCTION_USAGE (Scalar function)
12. SQL_CHECK_SPECIAL_AUTHORITY (Scalar function)
13. USER_INFO_BASIC (View)

完成後安全稽核分類全數26筆收齊，Batch 5全部結束。

## 已知限制

- 查證管道優先序不變：①`rzajqpdf.pdf`全文搜尋 → ②`ibm-i-services-sql.html`（Type/PTF對照，含`<a href>`可追蹤真實連結）→ ③`WebSearch` → ④`WebFetch`/`scrapling`（`get`→`fetch`，`stealthy-fetch`需每次另外授權）。查不到就不收錄，標記`blocked-no-doc-found`。
- 上一輪(Batch 5A)研究過程中已順手翻到部分本批服務在PDF裡的位置：FUNCTION_USAGE(Table 251, 第998-999頁)、SECURITY_INFO(Table 256, 第1011頁附近)、USER_INFO_BASIC(Table 260, 第1035頁附近)，這批可以直接沿用、不用重新搜。
- `SQL_CHECK_AUTHORITY`/`SQL_CHECK_FUNCTION_USAGE`/`SQL_CHECK_SPECIAL_AUTHORITY`三個Scalar function名稱高度相似，須逐一核對各自實際檢查的對象(物件授權/function usage/特殊權限)不能互相套用。
- `EKM_INFO`(加密金鑰管理，Encryption Key Manager)較冷門，需注意是否為新版才有的service。

## 本次計畫怎麼做

1. 逐筆查證：正確語法(View/Table function/Scalar function)、完整欄位或參數定義、PTF/OS版本。
2. 依「查詢面過窄」規則盤點每筆SELECT類(View/Table function/Scalar function)的輸出欄位vs可篩選表單參數。
3. 依「報表」用詞規則（如有Spooled File相關措辭）。
4. 寫入`services.json`/`templates.json`，更新roster狀態。
5. `npm test`→`npm run build`→headless Chrome驗證筆數與無錯誤→抽樣`fillTemplate`+`formatSql`端對端驗證新模板。
6. 補這份記錄的「結果」段落，回報使用者。完成後安全稽核分類(26筆)全數收齊，回報並詢問是否繼續下一分類(網路連線)。

## 本輪動作範圍

允許修改：`src/data/services.json`、`src/data/templates.json`、`plans/2026-08-14-full-catalog-roster.json`、`outputs/kb.html`（僅透過`npm run build`產生）。不涉及`scripts/build-kb-html.js`（本批不預期需要UI改動）。

## 結果（已完成）

13筆全數核實成功收錄，roster全部標記`added`。**安全稽核分類26筆全數收齊，Batch 5結束**。目前總計 **72/207**（59+13）已收錄、0筆blocked。

**查證來源**：
- EXIT_POINT_INFO/EXIT_PROGRAM_INFO：`rzajqpdf.pdf`第506-509頁。
- FUNCTION_USAGE/GROUP_PROFILE_ENTRIES/OBJECT_OWNERSHIP/OBJECT_PRIVILEGES：`rzajqpdf.pdf`第999-1005頁。
- SECURITY_INFO/SQL_CHECK_AUTHORITY/SQL_CHECK_FUNCTION_USAGE/SQL_CHECK_SPECIAL_AUTHORITY：`rzajqpdf.pdf`第1009-1016頁。
- USER_INFO_BASIC：`rzajqpdf.pdf`第1026-1028頁。
- EKM_INFO、KERBEROS_KEYTAB_ENTRIES：本機PDF查無(太新)，用`ibm-i-services-sql.html`的`<a href>`真實連結(node/7278264、node/7229428)取得摘要頁確認正確IBM Documentation網址，再`fetch`該網址取得完整語法。

**查證中發現並記錄的細節**：
1. `OBJECT_PRIVILEGES`官方文件同時存在「table function」跟「view」兩個版本（分別對應本機目錄不同的`<a href>`），本機roster/目錄表格的Type欄位標記為Table function，這輪收錄以此為準，並在description註明官方另有View版本供不指定單一物件時查詢，避免使用者以為查到的是唯一介面。
2. `KERBEROS_KEYTAB_ENTRIES`的兩個參數官方文件寫「留空或給NULL才會用預設值」——如果表單留空直接送出空字串`''`，語意上不等於SQL NULL，可能不會觸發預設行為。**這輪主動抓到這個潛在bug並修正**：模板改用`NULLIF('{param}', '')`包裝，讓留空時在SQL層級真正轉成NULL，而不是空字串，符合官方文件描述的行為。

**查詢面過窄盤點**：本批多數為稽核類View(EXIT_POINT_INFO/EXIT_PROGRAM_INFO/FUNCTION_USAGE/GROUP_PROFILE_ENTRIES/OBJECT_OWNERSHIP/USER_INFO_BASIC)都補了對應篩選欄位；`SECURITY_INFO`固定只回傳一列系統設定，不適用篩選，模板留空params是刻意設計不是遺漏；`OBJECT_PRIVILEGES`/`EKM_INFO`/`SQL_CHECK_*`/`KERBEROS_KEYTAB_ENTRIES`都是需要明確輸入才有意義的函式呼叫，不是可篩選的view，故採直接參數輸入而非OR-trick。

**驗證**：`npm test`(16/16，含發現kerberos NULL問題後修正再次全過)、`npm run build`、headless Chrome確認73筆(60+13)正確渲染、`fillTemplate`+`formatSql`端對端驗證6個代表性新模板。
