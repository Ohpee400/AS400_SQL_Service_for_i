## 任務
使用者要求：卡片版面對齊問題先別急著調，因為主畫面可能要大改；要求**實際**上網查詢多個「類似功能」的UI架構（API/服務目錄型參考工具）並做多方比較，再決定主列表要用卡片還是條列/表格。上一輪只有 Claude 自己的既有知識（Swagger/Postman風格）沒有真的查證，這次要補上真實查證。

## 已知限制
- WebFetch 抓到的是頁面轉成 markdown 後的文字內容，無法直接看到視覺排版（顏色/間距），只能從 DOM 結構（是否為 table、list、grid of cards）與描述性文字判斷版面型態。
- 部分商用文件網站可能有動態渲染（JS-heavy SPA），WebFetch 抓不到完整結構時會如實回報「抓不到/不確定」，不臆測。

## 本次計畫怎麼做
1. 鎖定「服務/API 目錄型參考工具」這個類別做比較（不是隨便找UI），至少涵蓋：
   - 官方對照組：IBM i Db2 for i Services 官方參考頁（跟本專案資料來源同源，最直接可比）
   - 開發者API文件常見兩派代表：GitHub REST API 文件、AWS CLI/Azure CLI 參考、MDN Web API 索引（偏table/list派）
   - 有品牌識別需求的目錄：Postman Public API Network 或 RapidAPI Hub（偏card grid派，通常因為每個項目有獨立logo）
2. 每個查證來源記錄：URL、實際版面型態（table/list/card grid）、可觀察到的理由（是否有logo、項目數量、資訊密度）。
3. 綜合比較後給出「本專案主列表該用哪種版面」的具體建議與理由，供使用者決策，寫成新的 plan 文件，不直接動手改 `scripts/build-kb-html.js`。

## 本輪動作範圍
唯讀查證（WebSearch + WebFetch），不修改 `src/`、`scripts/`、`outputs/`。查證結果會整理進新的 plan 文件（`plans/`），等使用者確認方向後才進入實作。

## 結果（已完成）

實際查證4個來源，3個可確認版面型態、1個查無法確認（誠實標記，不編造）：

1. **IBM i Db2 for i「IBM i Services」官方對照表**——本專案資料來源同一份檔案 `outputs/webfetch/ibm-i-services-sql.html`，直接讀取本機HTML原始碼確認：整份用純 `<table>` 呈現幾百筆service（欄位：名稱/類型/各OS版本PTF需求），無卡片、無圖示。
2. **MDN Web API 索引**（WebFetch `developer.mozilla.org/.../Web/API`）：純條列清單，按字母分組，只有名稱+連結。
3. **AWS CLI EC2 指令參考**（WebFetch `docs.aws.amazon.com/cli/.../ec2/`）：純條列清單，只有指令名稱+連結，無說明。
4. **GitHub REST API 文件**（WebSearch找到官方部落格改版說明）：三欄式版面，左側sidebar是條列式導覽，非卡片。
5. Postman Public API Network 瀏覽頁：WebFetch官方文件說明頁，**沒有查到具體視覺呈現方式的描述**，誠實標記查無法確認，未採用一般印象當結論。

結論：4個可確認的同類型參考工具中，3表格+1條列清單，0卡片網格。完整分析與建議已寫入 `plans/2026-08-14-catalog-layout-benchmark-and-sql-format.md`。
