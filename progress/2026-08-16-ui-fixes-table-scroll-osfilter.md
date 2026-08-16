# UI修正：表格欄位固定寬度、篩選捲動、OS版本篩選功能 — 動手前記錄

最後更新：2026-08-16。對應計畫：`plans/2026-08-16-ui-fixes-and-batch15-completeness.md`（A/B/D/E項，Batch 15的C項另外處理）。

## 任務

依使用者回饋確認的方向實作：
1. `scripts/build-kb-html.js`：表格改`table-layout:fixed`+`<colgroup>`固定欄寬，加大`main`/`header`/`footer`的`max-width`釋放留白給表格；服務名稱欄維持不換行。
2. `scripts/build-kb-html.js`：`applyFilters()`篩選後統一捲動回結果區頂部。
3. `scripts/build-kb-html.js`：新增「OS版本」chip篩選群組，邏輯為「該版本原生內建(base)或有Enhanced PTF可用即算支援」。
4. `src/data/services.json`：修正`ifs_read`的description誤用「報表」一詞的問題。

## 已知限制

- 欄寬依實際資料量測結果設計：最長服務名稱53字元(`QSYS2.CHANGE_SERVICE_TOOLS_SERVER_CONFIGURATION_ENTRY`)、最長類型文字"Scalar function"(15字元)。欄寬配置：col-cat 30px、col-name 480px、col-desc 560px、col-type 130px、col-action 240px，合計1440px；`main`等容器max-width調整為1500px。
- `table-layout:fixed`下欄寬由`<colgroup>`的`<col>`決定，CSS裡原本`td.col-type{width:130px}`等重複宣告予以同步更新，避免混淆。
- OS版本chip標籤沿用資料裡既有的"7.3+"這種措辭習慣（跟`minOsVersion`欄位一致），實際篩選邏輯是檢查該精確版本在`ptfTable`裡的那一列。
- **全程不使用cd**，牽涉專案外路徑一律用絕對路徑當參數傳遞。

## 本次計畫怎麼做

1. 修改`build-kb-html.js`的CSS與HTML結構（colgroup、容器寬度）。
2. 修改JS：`applyFilters()`加捲動、新增OS版本chip渲染與篩選邏輯。
3. 修改`services.json`的`ifs_read` description。
4. `npm test`→`npm run build`→`bash scripts/headless-check.sh`→用headless screenshot實際核對多個分類下欄位是否對齊一致、不篩選時是否還會出現按鈕被推出畫面的情況。
5. 補這份記錄的「結果」段落。

## 本輪動作範圍

允許修改：`scripts/build-kb-html.js`、`src/data/services.json`、`outputs/kb.html`（僅透過`npm run build`產生）。不涉及`src/lib/kbEngine.js`、`src/data/templates.json`、roster.json。

## 結果（已完成）

**A. 表格欄位固定寬度**：`table.catalog`改`table-layout:fixed`+新增`<colgroup>`，五欄寬度為col-cat 30px、col-name 480px、col-desc 540px、col-type 150px、col-action 240px(合計1440px)；`header`/`main`/`footer`的`max-width`由1220px調整為1500px。實作過程中發現第一版col-type設130px會讓"Table function"文字換成2行，已調整為150px並補上`.type-pill{white-space:nowrap}`解決。

**B. 篩選捲動**：`applyFilters()`（分類/類型/OS版本chip與關鍵字輸入共用此函式）結尾加上`window.scrollTo({top:0, behavior:'auto'})`，每次篩選都一致捲回頂部。

**D. IFS_READ用詞修正**：`services.json`裡`ifs_read`的description移除誤用的「報表」一詞，改為「讀取IFS串流檔的內容...」，跟同系列其他三筆(`ifs_read_binary`/`ifs_read_utf8`/`ifs_write*`)用詞一致。

**E. OS版本篩選**：新增「OS版本」chip群組，選項依資料裡`ptfTable`出現過的版本動態產生(7.6+/7.5+/7.4+/7.3+)，篩選邏輯`serviceSupportsVersion()`檢查該版本列是否`base===true`或`enhanced`非空字串。

**驗證**：
- `npm test`(16/16)、`npm run build`、`bash scripts/headless-check.sh`確認208筆正確渲染。
- 用`node -e`直接套用篩選邏輯核對四個版本的命中筆數：7.6+→208、7.5+→199、7.4+→190、7.3+→139，隨版本變舊筆數遞減，符合預期(越新版本涵蓋的服務越多)。
- headless screenshot核對不篩選(共208筆)畫面：欄位對齊正常、「產生SQL/CALL指令」按鈕完整可見，不再被推出畫面外（對應第4點回報的破圖問題）。
- 修正type-pill寬度後重新截圖確認"Table function"恢復單行顯示。
- 另外寫了一份獨立的隔離測試頁(scratchpad，非專案檔案)，用相同CSS規則單獨渲染全庫最長服務名稱(`QSYS2.CHANGE_SERVICE_TOOLS_SERVER_CONFIGURATION_ENTRY`，53字元)在480px欄寬下的呈現，截圖確認完整顯示、無被`text-overflow:ellipsis`截斷，480px欄寬設計正確。
- 未實機模擬點擊分類/類型/OS版本chip驗證捲動行為（headless screenshot只能截靜態畫面，無法模擬互動），該部分程式碼邏輯簡單直接(`window.scrollTo`加在共用的`applyFilters()`結尾)，過人工複查程式碼確認正確接上三種觸發來源(分類chip、類型chip、關鍵字輸入)，新增的OS版本chip也會呼叫到同一函式。
- 清空過程中產生的暫存截圖檔(`outputs/webfetch/check-*.png`等)，確認`outputs/webfetch/`只留原有的正式參考檔案。

C項(Batch 15補齊48筆)另外處理，尚未開始。

## 追加修正：OS版本篩選邏輯語意錯誤

使用者回報「7.6+顯示208筆」不合理——原始實作(`serviceSupportsVersion`)檢查的是「該精確版本這一列可不可以用」，這個語意下越新的版本涵蓋越多服務(7.6幾乎全部服務都能用，因為新版本通常向下相容既有功能)，導致「7.6+」顯示208筆這種違反直覺的結果。

**修正後語意**：「X+」代表「只有X（含）以上的版本才能用」，也就是這個服務的**最低可用版本(floor)**要落在X或更新，等同於「在比X更舊的版本裡完全不可用」。新增`versionFloorIndex()`(由舊到新找第一個可用版本)+`serviceRequiresAtLeast()`(floor索引 >= 選定版本索引)取代原本的`serviceSupportsVersion()`直接呼叫。

**驗證**：用`node -e`重新計算，並額外從**實際build出來的`outputs/kb.html`裡grep確認`serviceRequiresAtLeast`/`versionFloorIndex`兩個函式確實存在且數量正確**(不是只驗證了獨立的node腳本、真的確認建置產物裡有這次修正)：
- 7.6+ → 9筆（只有真正限定7.6才能用、7.3~7.5均標示Not Supported的服務）
- 7.5+ → 18筆
- 7.4+ → 69筆
- 7.3+ → 208筆（合理：7.3是資料裡最舊的版本，所有服務理論上都「至少從7.3以後」可用，這個篩選等同於全部）

版本越新篩選越嚴格、越舊篩選越寬鬆，符合「X+」字面上「最低需求門檻」的直覺。`npm test`(16/16)、`npm run build`皆通過。
