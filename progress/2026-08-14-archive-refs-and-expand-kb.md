# 進度記錄：歸檔參考資料 + 知識庫擴大到10個service

## 動手前記錄

- **日期**：2026-08-14
- **任務來源**：`plans/2026-08-14-outstanding-tasks.md` 第7、8項，使用者這輪明確指示：
  1. 把 `temp/ibm-i-services-sql.html`、`temp/rzajqpdf.pdf` 搬到 `outputs/webfetch/`（新建資料夾），作為長期參考資料。
  2. 知識庫從目前3筆擴大到10筆（要求「不同種類的 SQL Services」），但使用者要求先看過草案並確認無誤，才會全數正式寫入涵蓋。
- **已知限制**：
  - 現有3筆（`object_lock_info`/`systablestat`/`ifs_object_statistics`）目前 `verified: false`，`object_lock_info` 已知有語法錯誤（見 `progress/2026-08-13-sql-service-os-ptf-research.md`，尚未修正）。本輪任務範圍不含修正既有3筆的已知問題，除非使用者另外要求。
  - `ibm-i-services-sql.html` 是涵蓋數百個 service 的 OS版本/PTF對照表，只有 service 名稱+版本資訊，沒有語法/欄位/參數細節；語法細節需另外查 `rzajqpdf.pdf`（1442頁）或既有訓練知識，且後者需標記 `verified: false`。
- **本次計畫**：
  1. 搬移兩份參考檔案到 `outputs/webfetch/`。
  2. 解析 `ibm-i-services-sql.html`，挑出10個「種類不同」的候選 SQL Service（例如：物件鎖定、大檔案分析/IFS、工作狀態、系統活動、訊息佇列、假關聯、安全稽核、效能分析、備份/儲存、通訊網路 等不同類別），列出候選清單（名稱+分類+一句話用途+型態 view/table function/procedure）回報給使用者確認。
  3. 使用者確認候選清單無誤後，才動手寫入 `src/data/services.json`（新增筆數，`verified` 依查證程度誠實標記，不臆測)，並視需要同步 `templates.json`。
- **本輪範圍限制**：
  - 檔案搬移（`temp/` → `outputs/webfetch/`）：允許寫入/移動，使用者已明確指示。
  - 候選清單研究/挑選階段：唯讀查證（讀 html/pdf），**不寫入** `src/data/services.json`、`src/data/templates.json`、`outputs/kb.html`，等使用者確認候選清單後才進入寫入階段。

## 結果（完成後更新）

- **檔案搬移**：`temp/ibm-i-services-sql.html`、`temp/rzajqpdf.pdf` 已搬到 `outputs/webfetch/`，`temp/` 現為空。同步更新 `plans/2026-08-14-outstanding-tasks.md` 內的路徑引用，並將第8項標記為已完成。
- **候選清單確認**：向使用者提出10筆候選（3既有+7新增，涵蓋工作管理/系統效能/日誌管理/安全稽核/列印緩衝檔/網路連線/儲存空間管理等分類），使用者選擇「照單全收，開始查證寫入」。
- **7筆新增service查證過程**：
  1. 用 Python 解析 `outputs/webfetch/ibm-i-services-sql.html` 的表格HTML，逐筆取出每個service的型態(View/Table function)欄位與7.3~7.6各版本OS/PTF資料（非憑記憶）。
  2. 用 `pdftotext -layout` 把 `outputs/webfetch/rzajqpdf.pdf`（17MB，含Crypt filter警告但轉檔成功，96876行文字）轉成純文字後 grep 各service名稱，逐一讀取官方手冊裡的正式章節（欄位表、參數簽名、Authorization說明），取得驗證後的正確欄位名稱、參數名稱與型態。
  3. 過程中發現與既有記憶不符之處：`SYSTEM_STATUS_INFO` 官方標示為 **View**（不是我原本以為的 table function），`ASP_INFO` 在 **7.3版本並非Base**、需要 SF99703 Level 7 以上PTF才能使用（其餘7.4~7.6才是Base）。這類發現已如實寫入 `ptfInfo`/`minOsVersion` 欄位，避免延續錯誤記憶。
  4. `ACTIVE_JOB_INFO`/`USER_INFO` 在7.6（及USER_INFO的7.5）官方頁面的PTF欄位只寫「Base Enhanced」但未列出具體PTF編號，判斷為來源文件本身的資料缺漏，未自行編造編號，已在 `ptfInfo` 裡註明「原文如此，暫無法進一步查證確切層級」。
- **寫入交付檔案**：`src/data/services.json` 新增7筆（`verified: true`，`docSearchHint` 附上 `rzajqpdf.pdf` 對應原書頁碼方便日後複查），並更新 `meta.disclaimer`/`meta.lastUpdated`，把「全部草稿」的舊措辭改成「請以每筆 verified 欄位為準」。`src/data/templates.json` 同步新增對應7組NL模板（含matchKeywords、參數、sqlTemplate）。**未變動既有3筆的內容**（`object_lock_info` 已知的table function語法錯誤等問題仍待使用者另行確認後處理，屬 `plans/2026-08-14-outstanding-tasks.md` 第1項，本輪範圍不含）。
- **驗證**：
  - `node -e JSON.parse(...)` 確認兩份JSON語法正確；`npm test` 11項單元測試全過（測試用固定fixture，未涵蓋真實資料，故另外驗證）。
  - `npm run build` 成功產出 `outputs/kb.html`。
  - 寫了一支一次性腳本（`scratchpad/verify_kb.js`）直接載入真實 `services.json`/`templates.json` 跑 `kbEngine.js` 的 `getById`/`matchByKeyword`/`extractParams`/`getMissingParams`/`fillTemplate`，確認：10筆service都能被查到、7個新自然語言輸入（如「查詢作用中工作 高cpu」「密碼到期」「asp 磁碟空間」）都能正確比對到對應模板並產生語法正確的SQL。附帶發現「asp 磁碟空間」會同時比對到 `asp_check` 與既有的 `large_ifs_check`（兩者都含「磁碟空間」關鍵字）——這是設計上允許的「多重命中讓使用者選」行為，不是bug，未動手修改。
  - 用本機已安裝的 Chrome (`/c/Program Files/Google/Chrome/Application/chrome.exe`) 以 `--headless=new --dump-dom` 開啟 `outputs/kb.html`，確認畫面上實際渲染出10張service卡片（`class="card"` x10），且「已核實」/「草稿未核實」徽章數量與資料相符（7筆verified=true + 3筆verified=false），每張卡片都有對應的「產生SQL」按鈕（10個，一一對應10個service）。因本機未安裝 Playwright/chromium-cli 等互動式瀏覽器自動化工具，這輪**沒有**做到實際點擊按鈕、填表單、複製SQL的完整互動流程（不同於2026-08-13那次用headless Chrome做的完整UI互動測試），這部分如果需要更嚴謹的互動驗證，需要另外安裝瀏覽器自動化工具。

## 待辦（尚未處理，供下次追蹤）

- `plans/2026-08-14-outstanding-tasks.md` 第1項（`OBJECT_LOCK_INFO` table function→View語法修正）、第4項（既有3筆的PDF欄位/參數核對）仍未處理，不在本輪範圍內。
- 若要做完整UI互動測試（點擊按鈕、填表單、複製SQL），需先安裝 Playwright 或確認 chromium-cli 可用。
