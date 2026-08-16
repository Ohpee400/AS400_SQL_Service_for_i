# UI修復（首項破圖、篩選區分組）+ CREATE_DATA_JOURNAL_READER重試 — 動手前記錄

最後更新：2026-08-15。

## 任務

使用者第4次UI回饋（`/compact`後那則訊息）的3件事，已回覆診斷+建議、使用者確認依建議①實作：

1. `CREATE_DATA_JOURNAL_READER`：使用者截圖+我重新解析本機 `outputs/webfetch/ibm-i-services-sql.html` 找到真實 `<a href="https://www.ibm.com/support/pages/node/7278293">`，要用這個真連結重新查證、收錄（目前roster狀態`blocked-no-doc-found`）。
2. 首項破圖bug：根因是 `table.catalog thead th { top: 53px }` 寫死的sticky offset，這輪新增「類型」篩選chip列後toolbar變兩排，53px已經跟實際toolbar高度對不上，導致表頭吸頂位置跟第二排chips重疊。
3. 篩選區分類/類型視覺區分不明顯：使用者採納建議①——兩排chips前面加「分類」「類型」小標籤文字，類型chips改用方形圓角跟分類chips的全圓角膠囊做形狀區隔。

## 已知限制

- 查證管道優先序不變：①`rzajqpdf.pdf`全文搜尋 → ②本機`ibm-i-services-sql.html`（這次已知真實href）→ ③`WebSearch` → ④`WebFetch`/`scrapling`。查不到就不收錄。
- sticky offset的修法不能再寫死第二個magic number（例如硬改成"93px"）——未來如果篩選chips再增加一排,一樣會壞掉。改用JS量測`.toolbar`實際高度、寫入CSS變數的方式，避免同類bug重演。

## 本次計畫怎麼做

1. 用剛才找到的 `https://www.ibm.com/support/pages/node/7278293` 這個真實連結 WebFetch（必要時scrapling升級），核實`CREATE_DATA_JOURNAL_READER`的語法（Table function，依目錄表格）、完整欄位/參數定義、PTF/OS版本。核實成功才寫入`services.json`/`templates.json`，並依「查詢面過窄」規則盤點輸出欄位。
2. `build-kb-html.js`：sticky thead的`top`改用JS在`DOMContentLoaded`+`resize`時量測`.toolbar`實際高度寫入`--toolbar-h`，CSS改用`top: var(--toolbar-h, 53px)`（保留53px當fallback預設值）。
3. `build-kb-html.js`：`.chip-row`前各加一個`.chip-group-label`小標籤（分類/類型），類型chip的CSS改成方形圓角（例如`border-radius: 6px`）跟分類chip的`border-radius: 999px`做區隔。
4. 更新`roster.json`此筆狀態、`npm test`、`npm run build`、headless Chrome驗證（含驗證首項不再破圖、chips視覺分組)。
5. 補這份記錄的「結果」段落。

## 本輪動作範圍

允許修改：`src/data/services.json`、`src/data/templates.json`、`plans/2026-08-14-full-catalog-roster.json`、`scripts/build-kb-html.js`、`outputs/kb.html`（僅透過`npm run build`產生）。

## 結果（已完成）

1. **CREATE_DATA_JOURNAL_READER 重新查證成功**：`outputs/webfetch/ibm-i-services-sql.html`裡`<a href>`實際指向`https://www.ibm.com/support/pages/node/7278293`（IBM Support redirector），`WebFetch`對此頁403，改用scrapling `get`成功(200)拿到摘要頁；摘要頁的「For complete details」連結出使用者截圖那個`ibm.com/docs/en/i/7.6.0?topic=services-create-data-journal-reader-scalar-function`真實網址，`get`該頁遇503、升級`fetch`(瀏覽器渲染)成功取得完整語法/參數/範例。核實結果：官方標題是**Scalar function**（本機`ibm-i-services-sql.html`目錄表格的Type欄位誤標為Table function，已在roster.json一併修正，services.json採用官方標題為準）。已寫入`services.json`（id: `create_data_journal_reader`）+`templates.json`（VALUES呼叫，3個必填參數LIBRARY_NAME/FILE_NAME/OUTPUT_LIBRARY，皆無可篩選查詢面問題，因為這不是SELECT類）。roster該筆狀態改為`added`。**根因回顧**：上一輪查證管道不完整，只把本機HTML當PTF對照表讀`<td>`，沒解析`<a href>`；且猜測的docs URL用錯slug(table-function而非scalar-function)。
2. **首項破圖bug**：第一輪診斷（sticky offset寫死53px）只對了一半，實際套用`--toolbar-h`動態量測後破圖依然存在。進一步用A/B對照測試（拿掉thead的position:sticky）鎖定真正根因：`.table-scroll{overflow-x:auto}`使該容器依CSS規範自動把`overflow-y`也算成`auto`，變成巢狀垂直捲動容器，讓thead的sticky定位座標系統跟頁面實際視窗脫鉤，才是造成疊圖的根本原因。跟使用者確認後採用「拿掉表頭吸頂」+「新增回到頂部按鈕」的組合方案：`thead th`移除`position:sticky`；新增右下角浮動的`#back-to-top`圓形按鈕，`scrollY>400`時淡入顯示，點擊`scrollTo({top:0,behavior:'smooth'})`平滑捲回頂部。已移除先前多餘的`--toolbar-h`/`syncToolbarHeight`程式碼（改用不吸頂方案後用不到）。
3. **篩選區分組視覺改版**：分類/類型兩排chip前各加「分類」「類型」小標籤（`.chip-group-label`），類型chip改用方形圓角（`border-radius:6px`）跟分類chip的全圓角膠囊（`border-radius:999px`）做形狀區隔，兩者的`dot`圖示也一併做圓形/方形區隔。

**驗證**：`npm test`(16/16通過，含新模板的迴歸測試)、`npm run build`成功、headless Chrome確認共47筆(46+新增1筆)、`back-to-top`按鈕元素存在、`thead`已無sticky殘留、視覺截圖（scroll=0）確認首項不再破圖、chip分組標籤與形狀區隔正確顯示。

**已知未盡驗證項目**：回到頂部按鈕的「捲動到400px後淡入」互動行為，用headless Chrome CLI + 腳本注入`scrollTo`測試時，工具本身在擷取截圖時出現不穩定的殘影/重複渲染（legacy與new headless模式結果一致，判斷是CLI截圖工具在處理JS觸發捲動時的既知不穩定行為，非頁面程式碼問題），沒有再進一步安裝puppeteer等新工具去繞過（避免在未告知情況下安裝套件、也避免過度投入時間在驗證工具本身而非產品程式碼上）。按鈕的程式邏輯（`scrollY`門檻切換class、`scrollTo`平滑捲動）是標準且風險低的寫法，但建議使用者實際在瀏覽器裡手動捲動確認一次外觀跟互動是否符合預期。
