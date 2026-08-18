# 分組標題強化(方案C) + SPOOLED_FILE_DATA參數缺漏修復（執行記錄）

對應計畫：[[2026-08-18-header-highlight-and-param-gap-audit]]。使用者確認：問題1選方案C，問題2選(a)+(b)——本輪先做(a)止血，(b)全面稽核115筆另外排時程。

## 本輪動作範圍

允許修改：`scripts/build-kb-html.js`（CSS）、`src/data/templates.json`（`spooled_file_data_query`）、`src/data/services.json`（`spooled_file_data`的`exampleSql`/`docSearchHint`）、`outputs/kb.html`（僅透過`npm run build`重新產生）。
不含(b)：115筆Table function/Procedure的全面重新核對尚未開始，待另外排程。

## 本次怎麼做

### 問題1：分組標題方案C
`tr.group-header td`：底色從`var(--surface-alt)`（太淺，跟問題根源同一批）改成`var(--border)`（比paper/surface-alt深一階），加`border-left: 4px solid var(--accent)`左側色條，`padding-left`從10px調成13px配合色條。

### 問題2：SPOOLED_FILE_DATA補齊參數
`src/data/templates.json`的`spooled_file_data_query`新增兩個`advanced`選填參數：
- `spooledFileNumber`（留空預設NULL，數值型用`CASE WHEN '{x}'='' THEN NULL ELSE CAST('{x}' AS INTEGER) END`包裝，避免kbEngine.fillTemplate單純字串替換在留空時產生無效SQL，同時修正數值型參數不該被字串引號包住的問題）。
- `ignoreErrors`（下拉YES/NO，預設YES，依官方文件「YES是預設值」的核對結果）。

`src/data/services.json`的`spooled_file_data`同步更新`exampleSql`（改用4參數完整版）與`docSearchHint`（補記完整簽章頁碼與Example只示範2參數的落差說明，方便未來稽核時快速理解為什麼舊資料是錯的）。

## 額外發現（記錄但本輪不修，留給(b)批次稽核）

用一次性交叉比對腳本另外抓到2筆疑似落差，加上查GENERATE_PDF官方文件時發現的第3筆，這輪都沒動：
1. `SYSTOOLS.PING`模板缺`REMOTE_SYSTEM`參數。
2. `CHANGE_DEVICE_LOCKING_POLICY`的FIXUP模板缺`POLICY_PASSWORD`/`NEW_POLICY_PASSWORD`——但這筆有多個模板可能是刻意分工，需先確認是否為誤判再處理。
3. **`GENERATE_PDF`模板的`SPOOLED_FILE_NUMBER => '{spooledFileNumber}'`把數值型參數用單引號包成字串**——查證`GENERATE_PDF`官方文件範例（PDF第1037-1038頁）`SPOOLED_FILE_NUMBER => 2`是不加引號的數值字面值，跟這次`SPOOLED_FILE_DATA`同類型參數的正確處理方式（本次已修正為CAST AS INTEGER）不一致，屬同一類系統性問題的另一個實例。

## 結果

- `npm test`：16/16 pass（含既有的「optional參數留空時不產生無效SQL」測試，本次新增的CASE寫法也通過）。
- 額外用node直接呼叫`fillTemplate`驗證兩種情境的實際輸出：
  - 留空：`SPOOLED_FILE_NUMBER => CASE WHEN '' = '' THEN NULL ELSE CAST('' AS INTEGER) END, IGNORE_ERRORS => 'YES'`
  - 填值(3, NO)：`SPOOLED_FILE_NUMBER => CASE WHEN '3' = '' THEN NULL ELSE CAST('3' AS INTEGER) END, IGNORE_ERRORS => 'NO'`
  兩種輸出語法都合法。
- `npm run build`→`bash scripts/headless-check.sh`：共258筆，筆數不變。
- 截圖確認分組標題列(方案C)視覺區隔明顯（深底色+左側色條），跟一般資料列有清楚落差。
- **未驗證項**：`headless-check.sh`目前只支援截圖/dump-dom計數，不支援模擬點擊，所以沒有實際點開`SPOOLED_FILE_DATA`的抽屜表單驗證進階欄位UI渲染——是靠「其他既有模板(如`endOption`/`deleteSpooledFiles`)已經用同樣的params結構(`default`+`options`+`advanced`)驗證過可正常運作」來類推，不是直接對這筆重新截圖驗證。若要更嚴謹可以之後手動在瀏覽器開`outputs/kb.html`實際點開這個service確認。
