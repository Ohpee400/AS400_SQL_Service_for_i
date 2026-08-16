# UI/UX 第三輪實測回饋 — 修復計畫

最後更新：2026-08-14。使用者實際操作 `outputs/kb.html` 後回報7點問題（含1筆實測到的真SQL錯誤），本檔案是動手修復前的計畫，對應 `progress/2026-08-14-ux-and-query-improvements.md` 那輪實作的驗收回饋。

## 待修正項目

### 1. 分類chip — 滿意，不需改動

### 2+3. OS版本／PTF欄位視覺不對等，且版本例外資訊被稀釋

**現況（已核對 `scripts/build-kb-html.js` 目前程式碼）**：
```js
'<div class="tag-row"><span class="tag"><strong>最低 OS：</strong>' + escapeHtml(service.minOsVersion) + '</span></div>' +
'<p class="meta" style="...">PTF 資訊：' + escapeHtml(service.ptfInfo) + '</p>' +
```
只有 `minOsVersion` 被包成醒目的膠囊標籤，`ptfInfo` 還是原本的小灰字段落，兩欄視覺不對等，沒有真正做到「兩個乾淨獨立欄位」。且 `ASP_INFO` 這類「版本有條件例外」（7.3+特定PTF也可用，不是硬性7.4起跳）的資訊，目前是塞在 `minOsVersion` 字串裡的括號註解，一樣有「重要資訊被稀釋」的老問題。

**修復方向**：
- `ptfInfo` 也給對等的視覺處理（可能是另一個tag，或是有明顯標籤的獨立區塊，而不是小灰字段落）。
- 評估 `services.json` 是否需要新增結構化欄位來表示「版本例外」（例如 `minOsVersion` 保持乾淨的最低版本號，例外情況另開一個欄位如 `versionNotes` 清楚呈現，而不是塞進版本號字串本身）。

### 4. 移除自然語言輸入功能、移除搜尋框範例文字

- 拿掉整個 `#nl-section`（HTML區塊）與對應JS（`runNlMatch`、`nlMatchBtn`/`nlInput` 事件綁定）。
- `#keyword-input` 的 `placeholder` 範例文字拿掉。
- `kbEngine.js` 的 `matchByKeyword`/`extractParams` 函式**不刪**，因為 `tests/unit/kbEngine.test.js` 有獨立單元測試涵蓋，只是UI不再呼叫它們；保留對未來若要重新開放這個功能有彈性，且維持測試通過。

### 5. 已知列舉值的參數改用 `<select>` 下拉選單

**先做**（PDF裡已核對過『完整』列舉值的）：
- `active_job_check.detailedInfo`：NONE/WORK/QTEMP/FULL/ALL
- `output_queue_check.detailedInfo`：YES/NO
- `asp_check.aspState`：ACTIVE/AVAILABLE/FAILED/NONE/VARIED OFF/VARIED ON
- `user_info_check.status`：*ENABLED/*DISABLED

**動手前要重新核對PDF、確認列舉完整才能做**（上次讀取時讀到一半就停了，不確定有沒有漏值）：
- `netstat_check.state`：目前只確認 LISTEN/ESTABLISHED 兩個值
- `output_queue_check.status`：目前只確認 CLOSED/DEFERRED/DELETED/HELD/MESSAGE/WAITING/OPEN，不確定是否窮舉完畢

**技術做法**：`templates.json` 的 param 定義新增 `options: ["值1", "值2", ...]` 陣列；`build-kb-html.js` 的 `createFieldRow()` 判斷 `param.options` 存在時渲染 `<select>` 而非 `<input>`，其餘（`required`/`default`/`advanced`/`upper`）邏輯共用，`upper` 對下拉選單其實是no-op（下拉的值本來就是我們自己定義的固定字串，已經是正確大小寫）。
**不做**：`object_lock_check.objType`（IBM物件類型有上百種，非小範圍列舉）維持手動輸入。

### 6. 切換service時舊表單沒清除、沒有收合機制

**現況（已核對程式碼）**：`formSection.hidden` 全程式碼裡只在 `openForm()` 被設成 `false`，沒有任何地方設回 `true`，也沒有關閉按鈕。

**修復方向**：
- 在表單區塊加一顆「關閉」按鈕，點擊後 `formSection.hidden = true`。
- 搜尋框（`keyword-input`）內容改變時，若表單目前開著，自動收合（`formSection.hidden = true`），避免使用者以為還在查上一個service。

### 7. `OUTPUT_QUEUE_ENTRIES` 的timestamp預設值錯誤（已用實機SQL client重現SQL0180錯誤）

**根本原因（已查明，非猜測）**：
1. 原設計假設「不合法格式的字串（`9999-12-31 23:59:59`，空格分隔非`T`）指定給 `<input type="datetime-local">` 的 value，瀏覽器會忽略、顯示空白」——**這個假設沒有實測就直接採用，使用者的截圖證明是錯的**：Chrome實際接受並顯示了這個值。
2. 更關鍵的是，因為這個預設值帶有「秒」的精度，瀏覽器把該欄位升級成「支援到秒」的輸入精度，之後讀出來的原始值格式變成 `YYYY-MM-DDTHH:mm:ss`（多了秒），不再是原本假設的 `YYYY-MM-DDTHH:mm`。
3. 但送出表單的轉換程式碼寫死 `raw.replace('T', ' ') + ':00'`，不管三七二十一都加 `:00`，對已經含秒的值又多加一段，變成 `2026-08-14 11:50:59:00` 這種四段式的非法字串，觸發 SQL0180。

**修復方向**：
- **改用『當前時間』語意當預設，不再用哨兵字串**：`createdBefore` 留空時，直接讓SQL用 `CURRENT_TIMESTAMP`（SQL關鍵字，不是字串常數）取代 `TIMESTAMP('{createdBefore}')` 這個寫法，`sqlTemplate` 改成 `CREATE_TIMESTAMP < {createdBefore}`，param的 `default` 直接設成SQL關鍵字文字 `CURRENT_TIMESTAMP`（不加引號，代入後語法上直接是 `CREATE_TIMESTAMP < CURRENT_TIMESTAMP`，恆為近乎不篩選的效果，且語意上更直覺）；使用者若真的選了時間，代入的值要在收值階段組成完整的 `TIMESTAMP('...')` 運算式（含引號跟函式包裝一起放進被代換的值裡，而不是寫死在sqlTemplate裡）。
- **收值轉換邏輯也要修得更防呆**：不要無條件加 `:00`，改成先判斷 `raw` 裡的冒號數量（`HH:mm` 只有1個冒號、`HH:mm:ss` 有2個），只有在確定沒有秒的情況下才補 `:00`，避免同類型bug用不同方式再發生一次。
- 這個bug是這輪唯一有「未經實測就假設瀏覽器行為」的地方，之後任何用到瀏覽器原生表單元件特殊行為的設計，都要找方法實際操作驗證過一次，不能只憑HTML5規格書面印象。

## 修復後驗證

1. `npm test` + `npm run build`
2. 用先前建立的 `scratchpad/verify_kb2.js` 模式，針對第7項額外補斷言：模擬 `datetime-local` 欄位「已經含秒」跟「不含秒」兩種原始值，確認轉換後都不會產生連續兩段秒數。
3. 請使用者在實機SQL client上重新測一次 `OUTPUT_QUEUE_ENTRIES` 的產生SQL，確認不再出現SQL0180。
4. 瀏覽器手動確認：分類chip+關鍵字搜尋、新增的下拉選單欄位、表單關閉按鈕、切換搜尋自動收合表單，這幾項這輪同樣沒有自動化瀏覽器工具可用，需要使用者協助複測。
