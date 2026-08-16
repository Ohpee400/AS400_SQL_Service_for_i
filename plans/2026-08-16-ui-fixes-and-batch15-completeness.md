# UI修正 + 資料完整性擴充(Batch 15) — 實作計畫

最後更新：2026-08-16。本計畫涵蓋使用者這輪回報的5個UI/資料問題 + 1個新功能需求，經確認方向後才動手。**本文件產出階段本身不涉及任何程式碼異動**，先前查證過程全部唯讀（headless dump-dom、python讀取JSON、比對官方目錄HTML），沒有寫入`src/`、`scripts/`、`outputs/`任何檔案。

## 問題清單與已查明的根本原因

### 1+2. 表格欄位定位不一致 / 類型欄位過寬（同一根因）
`scripts/build-kb-html.js`的`table.catalog`沒有設定`table-layout: fixed`，用瀏覽器預設的`auto`版面配置——每欄寬度是根據「當下篩選出的那批資料」動態計算，不同分類/類型下顯示的服務名稱長度、類型文字長度不同，欄寬跟著跑，才會出現「切換分類時欄位對不齊」。類型欄位偏寬也是因為清單裡只要曾出現一次"Table function"就會撐開，即使當下篩選結果只有短的"View"。

### 3. 切換分類時捲動位置不一致
程式碼裡沒有任何主動捲動邏輯。已核對各分類筆數，使用者回報會跳動的兩個分類（物件鎖定3筆、大檔案分析3筆）剛好是筆數最少的兩個分類之一。真正原因：篩選後頁面變超短，超出目前捲動位置範圍，觸發瀏覽器「自動把捲動位置夾回頁面實際高度內」的預設行為，筆數多的分類因為頁面依然夠高不會觸發，才顯得「不一致」。

### 4. 不篩選時破圖
已用headless Chrome抓JS執行完的最終DOM核對：208列都正確渲染（跟畫面顯示筆數一致），DOM裡7次"undefined"字樣逐一核對後全部是`kbEngine.js`本來就有的合法程式碼（型別檢查用的`!== undefined`），不是資料代入出錯。真正原因跟第1/2點同根：不篩選時清單同時包含全庫最長服務名稱(53字元，`QSYS2.CHANGE_SERVICE_TOOLS_SERVER_CONFIGURATION_ENTRY`)和最長類型文字("Scalar function"，15字元)，`auto`版面配置把欄寬撐爆，最右邊按鈕欄被推出可視範圍。

### 5. 207筆非官方目錄全部服務
已比對本機`outputs/webfetch/ibm-i-services-sql.html`（IBM官方Db2 for i Services目錄頁）與`plans/2026-08-14-full-catalog-roster.json`，發現**48筆官方目錄裡存在、但從roster建立當初(2026-08-14)就沒被列入的服務**，以`SYSTOOLS` schema為主(47筆)，另有1筆`SYSIBMADM.ENV_SYS_INFO`。詳細清單見下方「Batch 15 待補清單」。這48筆包含使用者提到的4筆spool相關(`SYSTOOLS.DELETE_OLD_SPOOLED_FILES`、`GENERATE_PDF`、`PRINTER_FILE_INFO`、`SPOOLED_FILE_DATA`)。**這個缺口不是本次Batch 9~14工作造成的，是roster清單建立當下就存在的既有缺口。**

### 額外發現：`IFS_READ`描述用詞錯誤
`ifs_read`這筆的description寫「讀取IFS**報表**(串流檔)的內容」，誤用「報表」一詞泛稱一般串流檔——依專案既有規則「報表」只能對應Spooled File，這是本次擴充作業自己引入的用詞錯誤，需訂正。核對過`ifs_read_binary`/`ifs_read_utf8`/`ifs_write*`四筆沒有相同問題，是單筆孤立錯誤。

## 已確認的修正方向

### A. 表格版面（解決1、2、4點）
- `main`/`header`/`footer`目前`max-width: 1220px`置中留白，使用者反映「左右都還有留白空間」，希望對齊又不換行——確認方向：**加大整體`max-width`（釋放側邊留白給表格用），改用`table-layout: fixed`+`<colgroup>`寫死每欄寬度**，讓欄位邊界在任何篩選狀態下都固定不變。
- 欄寬設計依實際資料量測：服務名稱欄需容納最長53字元(mono字體)、類型欄容納最長"Scalar function"(15字元)、描述欄需保留足夠寬度給中文說明。`table-scroll`的`overflow-x:auto`保留當保險（極窄視窗或未來出現更長名稱時的後備方案），但正常桌面寬度下不應觸發。
- 服務名稱欄**維持不換行**（使用者明確要求），靠加寬容器 + 固定欄寬達成，不使用「名稱欄可換行」這個選項。

### B. 捲動行為（解決3點）
- 在共用的`applyFilters()`函式裡（分類/類型chip點擊、關鍵字輸入都會呼叫到這個函式），篩選後統一捲動回結果區頂部（緊鄰sticky toolbar下方），不管篩選後剩幾筆，行為都一致。

### C. Batch 15：補齊48筆官方目錄缺口（含4筆spool）
- 目標：把roster從207筆擴充到255筆，讓知識庫真正涵蓋官方目錄全部服務。
- 執行前置作業：先把48筆新項目以`status: pending`加進`plans/2026-08-14-full-catalog-roster.json`（並先給一個暫定分類，查證過程中可能微調），才能沿用既有的`roster-mark-added.py`工具鏈。
- 之後比照Batch 1~14同樣SOP：PDF/官方文件查證→查詢面盤點→寫入services.json/templates.json(先核對條目已寫入、id無重複)→roster-mark-added.py→npm test/build/headless-check.sh→補progress結果段落。
- 待補48筆清單（依官方目錄`ibm-i-services-sql.html`比對得出，暫定分類供查證時參考、可能調整）：

| 服務 | 暫定分類 |
|---|---|
| SYSTOOLS.DELETE_OLD_SPOOLED_FILES, GENERATE_PDF, PRINTER_FILE_INFO, SPOOLED_FILE_DATA | 列印/報表管理 |
| SYSTOOLS.END_JOBS, ENDED_JOB_INFO, JOB_NAME, JOB_NAME_DETAILS, JOB_NUMBER, JOB_USER, JOB_QUEUE_ENTRIES, OVERRIDE_INFO, OVERRIDE_INFO_ALL, REPLY_INQUIRY_MESSAGES | 工作管理 |
| SYSTOOLS.CVE_INFO, DEFECTIVE_PTF_CURRENCY, FIRMWARE_CURRENCY, GROUP_PTF_CURRENCY, GROUP_PTF_CURRENCY_LOCAL, GROUP_PTF_DETAILS, PTF_COVER_LETTER, CHECK_PRODUCT_OPTIONS, LICENSE_EXPIRATION_CHECK, CONFIGURATION_STATUS | 系統設定/其他 |
| SYSTOOLS.ADD_VALIDATION_LIST_ENTRY, CHANGE_VALIDATION_LIST_ENTRY, REMOVE_VALIDATION_LIST_ENTRY, CHANGE_USER_PROFILE, USER_DRDA_AUTHENTICATION_ENTRIES, SPECIAL_AUTHORITY_DATA_MART, PROBLEM_INFO | 安全稽核 |
| SYSTOOLS.IFS_ACCESS, IFS_PATH, IFS_RENAME, IFS_UNLINK | IFS檔案系統 |
| SYSTOOLS.PING | 網路連線 |
| SYSTOOLS.POWER_SCHEDULE_INFO | 系統設定/其他（此筆PDF內容已在先前批次查證時順帶取得，第1185頁附近，可直接引用） |
| SYSTOOLS.CHECK_COMMAND_SYNTAX, SEND_EMAIL, SPLIT | 系統設定/其他 |
| SYSTOOLS.ERRNO_INFO, GETENV, PUTENV, LPRINTF, ODD | 系統設定/其他（雜項工具函式，視查證內容可能需要新分類） |
| SYSIBMADM.ENV_SYS_INFO | 系統設定/其他 |

實際分類以查證PDF/官方文件內容後為準，上表僅為規劃階段的暫定分組。

### D. IFS_READ 用詞修正
- 修正`services.json`裡`ifs_read`這筆的`description`欄位，移除「報表」誤用，改為單純描述串流檔內容讀取，跟其他IFS_READ系列描述用詞一致。

### E. 新功能：依OS版本篩選
- 判定邏輯已確認：**「該版本可用即算」**——選定版本X時，服務要顯示的條件是該服務`ptfTable`裡版本X那一列`base === true` 或 `enhanced`非空字串（原生內建或有PTF可用都算支援），不要求「該版本開始才存在」這種更嚴格的下限比對。
- UI新增一組chip-group「OS版本」，選項動態列出資料集裡出現過的所有版本（7.3/7.4/7.5/7.6），比照分類/類型的既有chip渲染邏輯。
- 篩選邏輯併入現有`applyFilters()`的filter chain。

## 本輪動作範圍（等待使用者確認後才會開始寫入程式碼）

尚未動手，等使用者對這份計畫本身沒有其他修正意見後，才會：
1. 先建立`progress/`動手前記錄（依專案規則，任何實作都要留記錄）。
2. 修改`scripts/build-kb-html.js`（A、B、E項）。
3. 修改`src/data/services.json`裡`ifs_read`的description（D項）。
4. 若確認要做Batch 15，另外建立獨立的`progress/`記錄並比照既有SOP逐批處理48筆。
