# 功能規格：AS400 SQL Service 知識庫工具

## 背景與目標

團隊在 IBM i 上使用 SQL Services 做 troubleshooting（物件鎖定查詢、大檔案分析等）時，常遇到兩個問題：不確定某 SQL Service 需要的 OS 版本/PTF，以及不熟悉語法而寫不出正確查詢。本工具用一份可搜尋的知識庫網頁，先顯示中文說明讓使用者了解 Service 用途，再用表單（含預設值）快速產生可複製的 SQL，降低使用門檻、提升團隊 SQL Services troubleshooting 能力。

## 版本歷程

- **v1（已捨棄）**：Node.js CLI 工具，`gen` 指令用 `readline` 逐題問答蒐集參數。實測多欄位情境（如大檔案分析需連問 library、門檻MB）UX 不佳，使用者要求改版。
- **v2（目前版本）**：本機靜態網頁 `outputs/kb.html`，資料與比對邏輯改寫成可跨 Node/瀏覽器共用的 `src/lib/kbEngine.js`，UI 改成搜尋 + 表單（預填預設值），捨棄逐題問答流程。

## 範圍

- **In scope**：網頁查詢知識庫（OS 版本/PTF/中文說明）、依關鍵字搜尋、依自然語言描述自動比對情境並帶入表單、表單產生可複製 SQL、知識庫以 JSON 維護供團隊擴充。
- **Out of scope（本版不做）**：呼叫 LLM API 做真正語意理解、直接連線 IBM i 執行 SQL、需要伺服器的架構（全部是本機靜態檔案）。

## 架構決策

| 決策點 | 選擇 | 理由 |
|---|---|---|
| NL→SQL 實作 | 規則式關鍵字比對模板 | 可控、免 API key、可離線執行；代價是僅覆蓋已知情境 |
| 交付形式 | 單一自足 `outputs/kb.html`（由 `npm run build` 產生） | 團隊成員雙擊即可用，無需伺服器、無需安裝任何東西，資料/邏輯全內嵌不受 `file://` 下 fetch/XHR 被擋的限制 |
| 邏輯共用方式 | `src/lib/kbEngine.js` 寫成 UMD 模組 | 同一份純函式（無 Node 專屬 API）同時給 `node --test` 單元測試與瀏覽器 `<script>` 內嵌使用，避免邏輯重複維護兩份 |
| 知識庫來源 | 每筆資料核對官方文件（`rzajqpdf.pdf`／IBM Docs網站）後才收錄 | 見下方「資料驗證」小節 |

## 網頁功能設計

1. **搜尋/清單**：表格式版面（非卡片，理由見 `plans/2026-08-14-catalog-layout-benchmark-and-sql-format.md` 的調研），關鍵字即時過濾+分類chip篩選，每列顯示名稱、分類、中文說明、類型(View/Table function/Procedure...)；點列展開規格詳情(最低OS版本、PTF對照表)。
2. **參數表單**：點「產生SQL」從右側滑出抽屜，顯示該情境所有欄位（進階欄位收合），`templates.json` 的 `default` 預填，使用者可直接修改；按「產生 SQL」用 `fillTemplate` 組出語句、`formatSql` 格式化多行呈現，並提供瀏覽器 Clipboard API 複製按鈕（失敗時退回 `execCommand('copy')`，並顯示明確的成功/失敗文字）。
3. **自然語言輸入**：`matchByKeyword`／`extractParams` 這兩個引擎函式存在且有單元測試，但目前網頁UI沒有接一個獨立的NL輸入框；`templates.json` 的 `matchKeywords`/`extract` 欄位目前主要供未來擴充或其他呼叫端使用。

## 資料結構

詳見 [`docs/data-schema.md`](../docs/data-schema.md)：`src/data/services.json`（知識庫）與 `src/data/templates.json`（NL 模板），皆為純 JSON，與邏輯分離，方便團隊擴充；改完執行 `npm run build` 重新產生 `outputs/kb.html`。

## 資料驗證

早期版本曾實測 `WebFetch` 對整個 `ibm.com` 網域一律回傳403，改用「先抓官方PDF/HTML存檔比對」的方式。目前查證管道依序：① `outputs/webfetch/rzajqpdf.pdf` 全文搜尋 → ② `outputs/webfetch/ibm-i-services-sql.html`（僅Type/PTF對照，無欄位定義）→ ③ `WebFetch` 直接抓 IBM 官方文件網站即時內容（`https://www.ibm.com/docs/en/i/`，部分頁面此法可行）→ ④ `WebFetch` 失敗就照 `scrapling-user` skill 的guarded流程（先誠實`get`，需要JS渲染就自動升級`fetch`）。全部查不到才視為無法核實。

**`verified: true` 是收錄的必要條件，不存在「先收錄、之後再補核實」的草稿狀態**（見 `docs/data-schema.md`、跨對話記憶 `project-full-verification-required`）。目前收錄的10筆全數 `verified: true`。

## 已知限制

- 知識庫收錄範圍正在從10筆擴大到 `outputs/webfetch/ibm-i-services-sql.html` 涵蓋的207筆，見 `plans/2026-08-14-full-catalog-expansion-master-plan.md` 與進度檔 `plans/2026-08-14-full-catalog-roster.json`；未涵蓋到的情境會提示「找不到符合的 SQL Service」。
- 關鍵字比對為簡單字串 includes，非語意理解，措辭差異過大可能比對不到。
- `outputs/kb.html` 為建置產物，不應手動編輯，改資料一律從 `src/data/*.json` 修改後重新 build。

## 驗證方式

1. `npm test` — `kbEngine.js` 邏輯單元測試
2. `npm run build` — 產出 `outputs/kb.html`
3. 瀏覽器開啟 `outputs/kb.html`，實測：關鍵字搜尋過濾、NL 輸入自動比對+帶參數、表單預設值正確、產生的 SQL 語句正確、複製按鈕可用（已用 headless Chrome + CDP 自動化截圖驗證過一輪，見專案協作紀錄）
