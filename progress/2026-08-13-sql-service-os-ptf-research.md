# 進度記錄：SQL Service OS版本/PTF 資料來源研究

## 動手前記錄（依使用者要求，動手前先記錄意圖）

- **日期**：2026-08-13
- **任務**：知識庫（`src/data/services.json`）目前 3 筆 SQL Service 的 `minOsVersion`/`ptfInfo` 皆為未驗證草稿。使用者要求尋找官方權威來源核實。
- **已知限制**：WebFetch 對整個 `ibm.com` 網域（含 `/docs`、`/support`）一律回傳 403，已於前一輪任務實測確認（對照組 Wikipedia 正常）。
- **參考經驗**：使用者提供 `temp/2026-08-13-ibm-website-403-switched-to-pdf.md`，指出先前在另一個「command-authority-lookup」任務中，同樣遇到 `ibm.com` 403，當時的解法不是繞過網頁封鎖，而是改用完全不同的取得管道——直接解析 IBM 官方發行的 *IBM i 7.5 Security Reference* PDF。該筆記未附實際 PDF 網址/下載管道細節。
- **本次計畫嘗試方向**：
  1. 找看看是否有等效於「Security Reference」但涵蓋 SQL Services（尤其 OS 最低版本/PTF 資訊）的官方 PDF/手冊。
  2. 若找到候選 PDF，嘗試從非 `ibm.com/docs`、`ibm.com/support` 的其他 IBM 網域（如檔案發布用網域）取得，因為先前只驗證過這兩個路徑被擋，未驗證是否為全網域封鎖。
  3. 全部失敗則如實回報已嘗試的網址與失敗原因，不臆測、不編造替代資料。
- **本輪範圍限制**：僅做讀取/研究性質的查證（WebFetch 等唯讀操作），**不修改** `outputs/kb.html`、`src/data/services.json`、`src/data/templates.json`、`scripts/build-kb-html.js` 等任何交付檔案。查證結果先回報給使用者確認後，才會回頭更新資料。

## 結果（研究完成後更新）

嘗試了以下 URL（皆用 WebFetch）：

| 網址 | 結果 |
|---|---|
| `https://www-40.ibm.com/servers/eserver/ers/protected/results.wss` | 403 Forbidden |
| `https://www.ibm.com/docs/api/v1/content/ssw_ibm_i_75/rzajq/rzajqoverview.pdf`（猜測路徑） | 403 Forbidden |
| `https://public.dhe.ibm.com/`（IBM 檔案發布網域，非 `www.ibm.com/docs`） | 未明確回傳 403，但抓回內容為空白，判斷是遇到 JS 驗證/擋爬蟲頁（回 200 但無實質內容），效果上等同無法存取 |

**結論**：目前證據顯示 `ibm.com` 整個網域家族（含 `www-40.ibm.com`、`public.dhe.ibm.com` 等子網域）對 WebFetch 都無法正常存取，不是只有 `www.ibm.com/docs` 被擋。因此「換個 ibm.com 底下的網址/PDF 路徑」這條路目前看起來不可行，卡住的原因是網域層級的存取限制，而非猜錯特定文件路徑。

**已回報給使用者**：見對話紀錄，請使用者提供替代管道（如手動下載 PDF 放入專案由我本機讀取，或改用 `QSYS2.SERVICES_INFO` 在真機查詢）。

## 追加：使用者提供已驗證正確的網址後複測

使用者提供另一個 AI 對話紀錄，內含已用瀏覽器實際下載驗證過的正確網址：
- PDF：`https://www.ibm.com/docs/en/ssw_ibm_i_75/pdf/rzajqpdf.pdf`（*Database Performance and Query Optimization*，含 IBM i Services 章節，使用者已下載驗證含 1442 頁、內容正確）
- OS版本/PTF對照表（HTML）：`https://www.ibm.com/support/pages/ibm-i-services-sql`

用 WebFetch 直接打這兩個「已驗證正確」的網址，**結果仍是 403 Forbidden**。

**結論更新**：確認問題不是「網址錯誤/猜錯路徑」，而是 WebFetch 這個工具本身的請求特徵被 `ibm.com` 的 WAF 擋下，跟目標網址正不正確無關。對方對話紀錄建議的下一步是「換 User-Agent／模擬瀏覽器header／加delay」試圖繞過 WAF——這部分我判斷不採用（已回報使用者原因），改為請使用者直接提供已下載的檔案供本機讀取。

## 追加二：使用者安裝 scrapling MCP，改用「使用者授權特定目標 + 誠實請求（非stealth）」方式取得

使用者提供分工方案（`temp/Scrapling_使用總綱.md`）：由使用者對特定網址明確授權後，允許我用 `scrapling` 的**非隱身模式**（`get`/`fetch`，非 `stealthy-fetch`）直接請求，理由是這是誠實請求、無反偵測手法，跟我用 WebFetch 性質相同。

- 環境確認：`mcp__scrapling__` MCP 工具在本專案沒有載入（ToolSearch查無），原因是 `~/.claude.json` 裡的 MCP 註冊是綁定在另一個專案路徑（`C:/Users/clarkyun/Desktop/clark/Claude_Code_Lab/MCP/Scrapling`），非本專案。改用該 venv 底下的 `scrapling.exe`/`python.exe` 絕對路徑直接呼叫，不需要 MCP 掛載。
- 使用者明確授權目標：`https://www.ibm.com/docs/en/ssw_ibm_i_75/pdf/rzajqpdf.pdf`
- 用 `scrapling extract get ... --no-stealthy-headers`（明確關閉預設開啟的瀏覽器偽裝header，確保是誠實請求）测試，**成功 200**，但CLI在把PDF二進位內容當文字轉存時有bug（UnicodeDecodeError）。改用 `Fetcher.get(url, stealthy_headers=False)` 直接存 `resp.body` 原始位元組，成功存下完整 PDF（17,224,457 bytes，`temp/rzajqpdf.pdf`）。
- 同樣手法（誠實請求，`stealthy_headers=False`）額外抓了 `https://www.ibm.com/support/pages/ibm-i-services-sql`（OS版本/PTF對照表頁），200 成功，存到 `temp/ibm-i-services-sql.html`。

**重要發現（解析對照表後的真實資料）**：
| Service | 型態 | 7.6 | 7.5 | 7.4 | 7.3 |
|---|---|---|---|---|---|
| `QSYS2.OBJECT_LOCK_INFO` | **View**（不是 table function！） | Base（Enhanced: SF99960 Level 2） | Base（Enhanced: SF99950 Level 11） | Base | Base |
| `QSYS2.IFS_OBJECT_STATISTICS()` | Table function | Base | Base（Enhanced: SF99950 Level 4） | SF99704 Level 4（Enhanced: Level 13） | SF99703 Level 16（Enhanced: Level 24） |
| `SYSTABSTAT`/`SYSTABLESTAT` | — | 這份表格沒有收錄（推測因為是更早期就存在的基礎目錄視觀表，不屬於後續才用PTF增量發布的「Services」計畫範圍） |

**關鍵問題**：目前 `src/data/services.json`/`templates.json` 裡把 `OBJECT_LOCK_INFO` 當成 table function 寫（`TABLE (QSYS2.OBJECT_LOCK_INFO(OBJECT_SCHEMA => ...))`），但官方資料顯示它其實是 **View**，正確用法應該是 `SELECT * FROM QSYS2.OBJECT_LOCK_INFO WHERE ...`，語法整個要修正，不只是OS/PTF數字要更新。已回報給使用者，尚未動手改 `services.json`/`templates.json`，等待確認後續步驟（是否要先深入PDF核對 IFS_OBJECT_STATISTICS 的參數簽名）。
