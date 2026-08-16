# AS400 SQL Service 知識庫 — 待辦事項總覽

最後更新：2026-08-14。本檔案只記錄「這個專案本身」要做的事，工具鏈（scrapling skill等）不算在內。

## 目前狀態（2026-08-14 更新）

- `outputs/kb.html` 已改成表格式版面（棄用卡片網格，理由與調研見 `plans/2026-08-14-catalog-layout-benchmark-and-sql-format.md`），並用headless Chrome+`node --check`+`fillTemplate`/`formatSql`端對端實測驗證過。
- 知識庫收錄10筆service，**全部 `verified: true`**（含這輪核實升級的 `object_lock_info`／`systablestat`／`ifs_object_statistics`），依跨對話記憶規則 `project-full-verification-required`，這個knowledge base不再保留 `verified:false` 的草稿。
- 已經抓到多份可用來核對的官方原始資料，存放在 `outputs/webfetch/`：
  - `ibm-i-services-sql.html`（IBM官方「IBM i Services (SQL)」OS版本/PTF對照表，含207個service，是「IBM i Services」這個PTF追蹤計畫底下的，不含更早期的基礎Db2目錄視觀表）
  - `rzajqpdf.pdf`（IBM官方手冊《Database Performance and Query Optimization》，1442頁，含完整語法/欄位/參數說明）
  - `ibm-systablestat-view.md`／`ibm-syspartitionstat-view.md`（用scrapling即時抓取IBM官方文件網站 `https://www.ibm.com/docs/en/i/` 的Db2 for i SQL Reference章節，當`rzajqpdf.pdf`跟`ibm-i-services-sql.html`都不收錄某個service時的備援查證管道）
- 全量擴充到207筆的總計畫見 `plans/2026-08-14-full-catalog-expansion-master-plan.md`，進度追蹤在 `plans/2026-08-14-full-catalog-roster.json`。

## 已完成事項

### 1. ~~修正 `OBJECT_LOCK_INFO` 的語法錯誤~~ — 已完成

已查 `rzajqpdf.pdf` 第1196-1199頁核對：確認是 **View**，正確語法是 `SELECT * FROM QSYS2.OBJECT_LOCK_INFO WHERE SYSTEM_OBJECT_SCHEMA = ... AND SYSTEM_OBJECT_NAME = ...`。`services.json`／`templates.json` 已改完，`object_lock_check` template同時補上 `objectType`/`lockState`/`jobName`/`jobUser` 篩選欄位。

### 2. ~~把已經找到的真實OS版本/PTF資料寫回去~~ — 已完成

`object_lock_info`／`ifs_object_statistics` 的 `ptfTable` 已寫回 `services.json`，`verified` 改為 `true`。

### 3. ~~`SYSTABSTAT`/`SYSPARTITIONSTAT` 缺乏權威資料來源~~ — 已完成

用 `scrapling`（`get`空內容後自動升級`fetch`）抓取IBM官方文件網站 `https://www.ibm.com/docs/en/i/7.6.0?topic=views-systablestat` 與 `...=views-syspartitionstat`，核對出完整欄位定義：`TABLE_SCHEMA`/`TABLE_NAME`/`NUMBER_ROWS`/`DATA_SIZE` 與現有 `exampleSql` 完全吻合。這兩個view屬於Db2 for i SQL Reference的基礎目錄視觀表章節，不在「IBM i Services」PTF追蹤體系內，未提及PTF或版本別限制，`minOsVersion` 已改成如實描述。

### 4. ~~核對 `rzajqpdf.pdf` 裡的正確語法/欄位/參數~~ — 已完成

`OBJECT_LOCK_INFO` 完整欄位清單已核對（第1196-1199頁）。`IFS_OBJECT_STATISTICS` 參數簽名已核對（第680-687頁）：`START_PATH_NAME`/`SUBTREE_DIRECTORIES`/`OBJECT_TYPE_LIST`/`OMIT_LIST`/`IGNORE_ERRORS`，跟既有 `templates.json` 寫法完全吻合，`DATA_SIZE` 單位(bytes)也確認正確。

### 5. ~~重新建置與完整驗證~~ — 已完成

`npm test`（15項全過，含新增的 `formatSql` 測試）、`npm run build`、headless Chrome dump-dom 確認10筆service正確渲染、`fillTemplate`+`formatSql` 對真實 `templates.json` 資料端對端跑過（含 `journal_check`／`object_lock_check` 這兩個這輪改動最大的模板）。

### 6. ~~更新文件~~ — 已完成

`docs/data-schema.md` 已更新：加入 `type` 欄位說明、「`verified` 必須為 `true` 才能收錄」的硬性規則、`formatSql` 說明、LIKE部分比對的Pattern B。`docs/usage.md`／`specs/tool-spec.md` 這輪還沒重新讀過，不確定是否有過時措辭，先誠實標記不確定，不假設已經同步，留給下一輪檢查。

### 7. ~~是否擴大知識庫涵蓋範圍~~ — 已決定：擴大到207筆全部

範圍、分類、批次順序、Procedure的UI呈現方式都已拍板，見 `plans/2026-08-14-full-catalog-expansion-master-plan.md`。執行中，進度見 `plans/2026-08-14-full-catalog-roster.json` 的 `status` 欄位。

### 8. ~~`temp/` 裡的參考原始資料歸檔~~ — 已完成（2026-08-14）

`ibm-i-services-sql.html` 跟 `rzajqpdf.pdf` 已搬到 `outputs/webfetch/`，作為長期保留的外部參考資料。

## 待辦事項

### 9. 檢查 `docs/usage.md`／`specs/tool-spec.md` 是否有過時措辭

第6項這輪只更新了 `docs/data-schema.md`，這兩份還沒重新讀過，可能還留著「全部未驗證」之類的舊措辭，需要下一輪確認。
