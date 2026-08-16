# 目錄缺口根本原因與修復計劃

最後更新：2026-08-16。對應使用者回饋：「255好像也不是最終結果，隨便一查cve_info就沒有」。

## 使用者具體指控的查證結果

- `SYSTOOLS.CVE_INFO` 這一筆：**已核實存在**於 `src/data/services.json`（id: `cve_info`）與已建置的 `outputs/kb.html`（`grep -c "CVE_INFO" outputs/kb.html` = 2），是 Batch 15B 已收錄的項目。使用者截圖看到的畫面很可能是瀏覽器快取的舊版 `kb.html`，或當下瀏覽器還沒重新整理到最新建置版本。**這個具體指控本身不成立**，但使用者提出的「255筆不是真正的最終結果」這個大方向的懷疑，經重新查證後**確實成立**——只是原因不是CVE_INFO，而是別的兩筆。

## 根本原因（已查明，非猜測）

用程式重新對官方目錄`outputs/webfetch/ibm-i-services-sql.html`做**逐列(row-based)完整解析**（不是先前的關鍵字搜尋式核對），抓出所有 `<tr>` 列的第一個儲存格文字、比對是否符合 `SCHEMA.NAME` 格式，總共抓到257筆去重後的服務名稱，扣掉非服務列（章節標題列、4筆「詳見外部文件連結」的BRMS/HTTP functions/Db2 Mirror/PowerHA，這些原本就正確排除在外），與現有255筆roster比對後，發現**2筆真正遺漏**：

| 服務名稱 | Schema | 類型 | 為何會漏 |
|---|---|---|---|
| `EVEN` | SYSTOOLS | Scalar function | **人工判讀疏漏**：Batch 15查證時，`ERRNO_INFO`／`EVEN`／`ODD`三個服務的官方文件段落緊鄰同一頁（PDF第504-505頁），當時的48筆缺口清單只收錄了`ODD`（因為48筆清單原本鎖定的是「和已知service相關」的關鍵字掃描結果），`EVEN`雖然人眼掃過同一頁內容但沒被列進待辦清單，屬於單純的人工遺漏，不是查證管道的問題。 |
| `SET_COLUMN_ATTRIBUTE` | **SYSPROC** | Procedure | **系統性缺口**：Batch 15原始的48筆缺口分析，用來跟roster比對的正則/掃描範圍只涵蓋 `QSYS2`／`SYSTOOLS`／`SYSIBMADM` 三個schema（因為這3個是207筆roster裡出現過的schema），**從未把`SYSPROC`納入掃描範圍**，導致這個schema底下即使有服務存在於官方目錄，也永遠不會被列入候選缺口清單——這是流程設計上的疏漏，不是單次查證失誤。 |

### 為什麼「207/207」「255/255」都不代表「涵蓋官方目錄全部」

- 兩次的「完成」都是**針對某個特定候選清單**達成100%，而不是針對「官方目錄全部服務」做過完整的逐列比對。
- 207筆的候選清單來自這個工具最初建立時的規劃範圍；255筆的候選清單來自Batch 15查證時**用關鍵字搜尋、人工瀏覽PDF/HTML段落**歸納出的48筆缺口，這種做法天生就有兩種系統性風險：①人工瀏覽時可能看漏同頁相鄰的項目（EVEN的情況）、②候選清單比對用的schema範圍如果訂得不夠廣，會整批漏掉某個schema下的所有服務（SET_COLUMN_ATTRIBUTE的情況，若SYSPROC底下還有其他服務也會一併漏掉，需要確認）。
- 這次用「解析全部`<tr>`列＋比對SCHEMA.NAME格式＋不限定schema白名單」的方式重新掃描，才第一次做到「不依賴人工候選清單，直接對官方目錄做完整逐列比對」，這才是真正意義上可信賴的「有無遺漏」查證方式。

## 怎麼防範（往後所有批次都要套用的新規則）

1. **禁止再用「先人工歸納候選清單、再逐筆查證」的方式來確認『是否有遺漏』**——這種方式只能保證「候選清單裡的項目都查證過」，不能保證「候選清單本身完整」。往後若要回答「還有沒有漏」，一律用本次驗證的**程式化逐列解析＋全量比對**方式（見下方腳本邏輯），不要用關鍵字搜尋或人工瀏覽PDF目錄頁去猜。
2. **比對範圍不設schema白名單**：不要假設「目錄裡只會出現QSYS2/SYSTOOLS/SYSIBMADM」，解析時抓所有符合`大寫字母.大寫字母`格式的儲存格文字，再排除已知的非服務列（章節標題、外部文件連結列），而不是反過來「只認幾個已知schema」。
3. 每次新增一批服務、標記roster完成後，收尾動作除了現有的`npm test`/`npm run build`/`headless-check.sh`，**新增一道「全量逐列比對」的驗證步驟**，確認roster筆數與官方目錄實際筆數一致，這道步驟之後應該固化成一支可重複執行的腳本（而不是像這次一樣臨時寫python code），放進`scripts/`供下次直接呼叫。

## 修復方向（等待使用者確認後才動手）

1. 將`EVEN`、`SET_COLUMN_ATTRIBUTE`這2筆依既有SOP查證收錄：
   - `EVEN`：已於本輪查證時完整取得PDF內容（第504-505頁），SYSTOOLS schema，Scalar function，判斷輸入值是否為偶數，回傳布林值，分類比照`ODD`歸「系統設定/其他」。PTF資料待從`ibm-i-services-sql.html`擷取。
   - `SET_COLUMN_ATTRIBUTE`：已於本輪查證時完整取得PDF內容（第1012-1013頁），**SYSPROC** schema，Procedure，設定資料表欄位的SECURE屬性避免敏感值出現在database monitor/plan cache，官方目錄裡緊鄰安全服務(Security Services)區塊，分類建議歸「安全稽核」；PTF對照表確認4個版本皆為Base(原生支援，無需PTF)。
2. 寫入`src/data/services.json`、`src/data/templates.json`各1筆（id無重複已核對過：`even`/`even_check`、`set_column_attribute`/`set_column_attribute_call`皆不存在）。
3. `plans/2026-08-14-full-catalog-roster.json`新增這2筆（`status: pending`→收錄後改`added`），roster目標由255筆增為257筆。
4. 跑`npm test`→`npm run build`→`bash scripts/headless-check.sh`→端對端抽測新模板SQL輸出。
5. **新增一步**：把本次用的「逐列解析＋全量比對」邏輯整理成`scripts/roster-gap-check.py`（可重複執行、不限定schema白名單），跑一次確認257筆roster與官方目錄的257筆完全一致、0筆缺口，把這支腳本納入之後的SOP收尾清單。
6. 補`progress/`記錄，說明本次根本原因、防範措施與新增的2筆結果。

## 本輪動作範圍

目前只做到「查證＋寫這份計畫」為止，**尚未寫入`src/data/services.json`／`templates.json`／`roster.json`**，等使用者確認方向後才動手（依CLAUDE.md「計畫先行」規則）。
