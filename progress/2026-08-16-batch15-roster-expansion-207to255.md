# Batch 15：roster從207擴充到255筆 — 動手前記錄

最後更新：2026-08-16。對應計畫：`plans/2026-08-16-ui-fixes-and-batch15-completeness.md`的C項。

## 任務

把先前查證確認的48筆官方目錄缺口（詳見該次查證：比對`outputs/webfetch/ibm-i-services-sql.html`官方目錄與`plans/2026-08-14-full-catalog-roster.json`，找出48筆從未列入roster的服務，以`SYSTOOLS` schema為主47筆+`SYSIBMADM.ENV_SYS_INFO`1筆）加入roster並逐筆查證收錄，讓roster從207筆擴充到255筆。

## 已知限制

- 這48筆本來就不在roster.json裡，需要先**新增**條目（`status: pending`）而非用既有的`roster-mark-added.py`（該工具只更新既有項目的status，不會新增項目）。
- 已先查過每筆的`type`（View/Table function/Procedure/Scalar function/Table），用於這次新增roster條目與後續查證比對。
- 分類為初步指派，實際查證PDF/官方文件內容時可能調整（例如某些SYSTOOLS工具函式可能查出更適合的分類）。
- 查證管道優先序不變：①`python scripts/pdf-search.py`查`rzajqpdf.pdf` → ②`ibm-i-services-sql.html`（Type/PTF對照） → ③`WebSearch` → ④`bash scripts/webfetch-escalate.sh`。SYSTOOLS服務多半也收錄在同一本PDF裡（Systools章節），先比照既有查證流程處理。
- **全程不使用cd**，牽涉專案外路徑一律用絕對路徑當參數傳遞。
- 延續前面所有批次教訓：①`roster-mark-added.py`執行前務必先用python核對services.json確實已有對應條目才標記；②新增模板id前用python掃描`templates.json`全體id是否重複；③純關鍵字搜尋可能命中不相關章節，找不到明確定義段落要用完整片語二次確認。

## 本次計畫怎麼做

1. 把48筆以`status: pending`加入roster.json（一次性準備動作，非透過既有腳本，因為是新增而非狀態更新）。
2. 分三個子批次處理（各約16筆）：
   - Batch 15A：列印/報表管理(4)+工作管理(10)+網路連線(1)+日誌管理(1)
   - Batch 15B：安全稽核(7)+IFS檔案系統(4)+系統設定/其他前5筆(CVE_INFO/DEFECTIVE_PTF_CURRENCY/FIRMWARE_CURRENCY/GROUP_PTF_CURRENCY/GROUP_PTF_CURRENCY_LOCAL)
   - Batch 15C：系統設定/其他剩餘16筆
3. 每個子批次比照Batch 1~14既有SOP：PDF/官方文件查證→查詢面盤點→寫入services.json/templates.json(先核對條目已寫入、id無重複)→roster-mark-added.py→npm test/build/headless-check.sh→補progress結果段落。
4. 全部完成後確認roster總計255/255、0筆blocked，整理總結回報。

## 本輪動作範圍

允許修改：`plans/2026-08-14-full-catalog-roster.json`（新增48筆pending項目、之後逐批更新為added）、`src/data/services.json`、`src/data/templates.json`、`outputs/kb.html`（僅透過`npm run build`產生）。

## Batch 15A 結果（列印/報表管理4+工作管理10+網路連線1+日誌管理1 = 17筆）

- 查證依據：`python scripts/pdf-search.py`查`rzajqpdf.pdf`，逐筆確認頁碼、參數、回傳值、Note/Authorization段落；PTF/最低版本資料另從`outputs/webfetch/ibm-i-services-sql.html`比對schema限定名稱(`SYSTOOLS.xxx`)欄位擷取，過程中發現並修正一個查詢bug（見下）。
- 寫入`src/data/services.json`共17筆新條目，全部`verified: true`：
  - 列印/報表管理：`delete_old_spooled_files`、`generate_pdf`、`generate_spreadsheet`、`printer_file_info`、`spooled_file_data`
  - 工作管理：`end_jobs`、`ended_job_info`、`job_name`、`job_name_details`、`job_number`、`job_user`、`job_queue_entries`、`override_info`、`override_info_all`、`reply_inquiry_messages`
  - 網路連線：`ping`
  - 日誌管理：`delete_old_journal_receivers`
- 寫入`src/data/templates.json`共17筆對應模板，寫入前用python核對17個id均無重複；第一版`delete_old_spooled_files_call`的`P_OUTPUT_QUEUE_NAME`可選參數誤用直接帶空字串`'{pOutputQueueName}'`，未依既有慣例包`NULLIF('{...}', '')`——複查全庫其他CALL模板慣例後發現並修正。
- 驗證：`npm test`（16/16 pass）→ `npm run build`（成功產出`outputs/kb.html`）→ `bash scripts/headless-check.sh`（顯示「共 225 筆」，等於原208+新增17）→ `node -e`手動抽測6個新模板（delete_old_spooled_files_call/generate_pdf_call/ping_check/job_name_details_extract/override_info_query/printer_file_info_query）的`fillTemplate`+`formatSql`輸出，SQL語法正確。
- roster標記：用`python scripts/roster-mark-added.py`依分類分批標記這17筆為`added`（標記前已用python核對services.json確實有對應id），執行後roster統計為`{'added': 224, 'pending': 31}`，與207+17=224相符。
- 已清除本批次查證用的暫存檔`outputs/webfetch/dump_b15a_*.txt`（共10個）。
- 已知修正：查詢`ibm-i-services-sql.html`時若直接用短名稱（如`END_JOBS`）搜尋錨點會誤命中schema前綴不同的最後一筆結果（該HTML錨點含`SYSTOOLS.`前綴），已改用含schema前綴的正則二次確認17筆PTF資料互不相同後才採用。

## Batch 15B 結果（安全稽核7+IFS檔案系統4+系統設定/其他前5 = 16筆）

- 查證依據：`python scripts/pdf-search.py`查`rzajqpdf.pdf`，逐筆確認頁碼、參數、回傳值、Note/Authorization段落；PTF/最低版本資料從`outputs/webfetch/ibm-i-services-sql.html`用含schema前綴的正則（延續15A的修正）擷取。
- 寫入`src/data/services.json`共16筆新條目，全部`verified: true`：
  - 安全稽核：`add_validation_list_entry`、`change_validation_list_entry`、`remove_validation_list_entry`、`change_user_profile`、`user_drda_authentication_entries`、`special_authority_data_mart`、`problem_info`
  - IFS檔案系統：`ifs_access`、`ifs_path`、`ifs_rename`、`ifs_unlink`
  - 系統設定/其他：`cve_info`、`defective_ptf_currency`、`firmware_currency`、`group_ptf_currency`、`group_ptf_currency_local`
- 寫入`src/data/templates.json`共16筆對應模板，寫入前用python核對16個id均無重複；沿用15A修正過的`NULLIF('{...}', '')`慣例處理可留空的CALL/VALUES選填參數（如`add_validation_list_entry_call`的`entryData`）。
- 驗證：`npm test`（16/16 pass）→ `npm run build`（成功）→ `node -e`手動抽測6個新模板（add_validation_list_entry_call/change_user_profile_call/ifs_path_extract/cve_info_query/group_ptf_currency_local_query/special_authority_data_mart_query）的`fillTemplate`+`formatSql`輸出，SQL語法正確（含`special_authority_data_mart_query`的REFRESH TABLE+SELECT兩段式語法）。
- roster標記：依分類分批標記這16筆為`added`（標記前已核對services.json確實有對應id），執行後roster統計為`{'added': 240, 'pending': 15}`，與224+16=240相符。
- 已清除本批次查證用的暫存檔`dump_b15b_*.txt`（共10個，存放於scratchpad目錄）。

## Batch 15C 結果（系統設定/其他剩餘15筆）

- 查證依據：`python scripts/pdf-search.py`查`rzajqpdf.pdf`，逐筆確認頁碼、參數、回傳值、Note/Authorization段落；PTF/最低版本資料從`outputs/webfetch/ibm-i-services-sql.html`用schema前綴正則擷取。
- 寫入`src/data/services.json`共15筆新條目，全部`verified: true`：`group_ptf_details`、`ptf_cover_letter`、`check_product_options`、`license_expiration_check`、`configuration_status`、`check_command_syntax`、`power_schedule_info`、`env_sys_info`(SYSIBMADM schema)、`errno_info`、`getenv`、`putenv`、`lprintf`、`odd`、`split`、`send_email`，全歸類「系統設定/其他」。
- 寫入`src/data/templates.json`共15筆對應模板，寫入前用python核對15個id均無重複；`send_email_call`的`attachment`選填參數沿用`NULLIF('{...}', '')`慣例。
- 驗證：`npm test`（16/16 pass）→ `npm run build`（成功）→ `node -e`手動抽測6個新模板（send_email_call/split_query/errno_info_lookup/odd_check/env_sys_info_query/group_ptf_details_query）的`fillTemplate`+`formatSql`輸出，SQL語法正確。
- roster標記：標記這15筆為`added`（標記前已核對services.json確實有對應id），執行後roster統計為`{'added': 255}`，**pending降為0，roster達成255/255、0筆blocked**。
- 已清除本批次查證用的暫存檔`dump_b15c_*.txt`（共12個，存放於scratchpad目錄）。

## Batch 15 全部完成 — 總結

- 三個子批次（15A/15B/15C）共新增48筆services.json/templates.json條目，`src/data/services.json`總數從208筆成長到256筆；`plans/2026-08-14-full-catalog-roster.json`的roster目標從207擴充到255並全數標記`added`（差異的1筆256 vs 255，是本次擴充前既有、原本就未被舊版207筆roster追蹤的既存條目，非本次新增，與先前208 vs 207的已知落差一致）。
- 最終驗證：`bash scripts/headless-check.sh`顯示「共 256 筆」，與services.json總數一致；`npm test`全數16項通過；`npm run build`成功產出`outputs/kb.html`。
- 所有48筆新條目均依查證優先序①PDF→②官方HTML目錄取得PTF/版本資料，無任何草稿或未核實項目。
