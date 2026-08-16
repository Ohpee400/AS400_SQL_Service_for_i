# 全量擴充 Batch 1-3 + 10筆final-implementation-plan 上線 — 補記錄

最後更新：2026-08-14。**這份是補記錄，不是即時記錄**——專案慣例（`CLAUDE.md`「動手前記錄」）要求每次非顯而易見的動作（尤其查證/修改交付檔案）前先在 `progress/` 留簡短記錄，但這輪把10筆final-implementation-plan實際寫回正式檔案、以及Batch 1-3（共30筆新service）的查證與寫入，都沒有依這個慣例逐批留記錄，是我的疏漏，不是「已有機制只是沒被看到」。使用者發現後要求補上；這份檔案先補記過去發生的，之後Batch 4起會回到「每批動手前先留一份progress記錄」的正常做法。

## 已知限制
- 這份是事後彙整，不是動手當下寫的，細節依 `plans/2026-08-14-final-implementation-plan.md`、`plans/2026-08-14-full-catalog-expansion-master-plan.md`、以及對話紀錄回溯整理，可能有遺漏。
- 往後（Batch 4起）改回：每批動手前先建一份 `progress/YYYY-MM-DD-batch{N}-{分類}.md`，動手後補結果，不再事後一次補多批。

## 已完成範圍

### final-implementation-plan（10筆既有service）上線
- 依已核准的 `plans/2026-08-14-final-implementation-plan.md`，把 `src/data/services.json`／`src/data/templates.json` 從草稿狀態改成正式核實版本（`object_lock_info`語法重寫、`systablestat`／`ifs_object_statistics`升級verified、6筆補齊查詢面缺口）。
- `src/lib/kbEngine.js` 加 `formatSql()`。
- `scripts/build-kb-html.js` 從卡片版面改成表格/抽屜版面。
- 驗證：`npm test`、`npm run build`、headless Chrome dump-dom、`fillTemplate`+`formatSql`端對端跑真實資料。

### Batch 1（物件鎖定延伸，8筆新增）
- 新增：`JOB_LOCK_INFO`／`RECORD_LOCK_INFO`（物件鎖定）、`ADD/CHANGE/CREATE/DELETE/REMOVE_DEVICE_LOCKING_POLICY`／`LOCKING_POLICY_INFO`（原自動分類誤判到物件鎖定，查證後發現是NVMe硬碟密碼鎖定，改分到儲存空間管理）。
- 查證依據：`rzajqpdf.pdf`第1063-1091、1176-1179、1208-1209頁 + `ibm-i-services-sql.html` PTF對照。
- 過程中發現並修正既有bug：`asp_check`的`aspNumber`欄位留空時產生缺運算元的無效SQL，補上`CHAR()`轉型，並新增永久迴歸測試（`tests/unit/kbEngine.test.js`「every template...」測試）防止同類bug再發生。

### Batch 2（大檔案分析延伸，4筆新增）
- 新增：`OBJECT_STATISTICS`（大檔案分析）、`SYSDISKSTAT`（查證後改分到儲存空間管理）、`SAVE_FILE_INFO`／`SAVE_FILE_OBJECTS`（查證後新增「備份與還原」分類收錄，不硬塞大檔案分析）。
- 查證依據：`rzajqpdf.pdf`第568-573、909-917、1091-1097頁 + `ibm-i-services-sql.html` PTF對照。

### Batch 3（列印/報表管理 + 資料佇列，10筆新增）
- 新增：`OUTPUT_QUEUE_ENTRIES_BASIC`／`OUTPUT_QUEUE_INFO`／`SPOOLED_FILE_INFO`（列印/報表管理，分類名稱已依使用者要求從「列印/緩衝檔管理」改名）、`CLEAR_DATA_QUEUE`／`DATA_QUEUE_ENTRIES`／`DATA_QUEUE_INFO`／`RECEIVE_DATA_QUEUE`／`SEND_DATA_QUEUE`／`_BINARY`／`_UTF8`（資料佇列）。
- 查證依據：`rzajqpdf.pdf`第457-542、1041-1063頁 + `ibm-i-services-sql.html` PTF對照。
- 特別記錄：`RECEIVE_DATA_QUEUE`官方型別是Table function但預設行為(REMOVE=YES)會消耗訊息，屬於「披著查詢外皮的破壞性操作」，現有「type=Procedure才顯示警示」的UI規則抓不到這種情況。這輪處理方式是把表單預設值改成REMOVE=NO（不採用官方API本身的YES預設），沒有動UI判斷邏輯本身，這個限制之後若有更多類似case出現，值得回頭檢討。

## 這輪（第4次回饋）額外處理的UI/資料調整
1. Service名稱欄位加寬+不換行（`white-space:nowrap`+table auto-layout+外層`overflow-x:auto`容器，不是猜一個固定px硬寫死）。
2. 同一service對到多個模板時，按鈕文字加上模板描述消歧義（原本兩顆按鈕文字完全一樣，被誤認為bug）。
3. 「緩衝檔」全面改為「報表」（`services.json`/`templates.json`/`roster.json`的分類名稱＋描述文字），已存進跨對話記憶做為往後用詞規則。
4. 類型欄位（View/Table function/Procedure）改用顏色區分，Procedure固定用暖色（跟既有action-warning同色系，語意一致），其餘從色盤動態取色。
5. 新增「類型」篩選chip列（跟分類chip同一套互動邏輯），可依View/Table function/Procedure篩選，之後出現Scalar function/Table類型會自動落進色盤跟篩選清單，不需要再改程式碼。

## 驗證
`npm test`（16/16，含迴歸測試）、`npm run build`、headless Chrome screenshot實際比對畫面確認上述5項UI調整都生效。

## 進度
累計 32/207 已收錄（見 `plans/2026-08-14-full-catalog-roster.json` 的 `status` 欄位），全數 `verified: true`。下一批：Batch 4（日誌管理延伸，14筆）。
