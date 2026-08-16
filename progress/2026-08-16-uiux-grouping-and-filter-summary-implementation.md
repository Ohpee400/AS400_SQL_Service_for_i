# UI/UX修復：分類分組＋篩選摘要條 — 動手前記錄

最後更新：2026-08-16。對應計畫：`plans/2026-08-16-uiux-grouping-and-filter-summary.md`，使用者已回覆「OK」確認方向與「執行」指示。

## 任務

依計畫在`scripts/build-kb-html.js`實作：①未鎖定分類時，表格依分類分組並可摺疊；②新增篩選摘要條，顯示目前生效的篩選並可個別/整批清除。

## 已知限制

- 純前端渲染邏輯調整，不動`src/data/services.json`／`templates.json`，不影響既有的16項`npm test`迴歸測試（那些測試針對`kbEngine.js`的資料處理函式，不是這次要動的HTML/CSS/DOM渲染部分）。
- 摺疊狀態用記憶體變數保存，重新整理頁面會重置（純靜態單頁工具，沒有後端/localStorage持久化需求，非本次範圍）。

## 本次計畫怎麼做

1. 讀取現有`applyFilters`/`renderServiceList`/chip渲染邏輯（已完成，見plan文件的「已查明的現況」段落）。
2. 新增分組渲染：`renderServiceList`內依`activeCategory`是否為空決定要不要分組，分組時插入可摺疊標題列。
3. 新增篩選摘要條：HTML骨架加一個容器、CSS樣式、JS渲染函式（依三個active變數+關鍵字狀態產生標籤），並在`applyFilters`結尾呼叫。
4. `npm test`→`npm run build`→`bash scripts/headless-check.sh`→手動情境確認（分組展開/摺疊、鎖定分類時不分組、摘要條顯示與清除）。
5. 補這份記錄的結果段落。

## 本輪動作範圍

允許修改：`scripts/build-kb-html.js`、`outputs/kb.html`（僅透過`npm run build`產生）。

## 結果

- 實作內容：
  - CSS新增`.active-filters`摘要條樣式、`.filter-tag`可移除標籤樣式、`tr.group-header`分組標題列樣式（含摺疊箭頭旋轉動畫）。
  - HTML骨架在chip-group區塊下方新增`<div class="active-filters" id="active-filters">`容器。
  - JS新增`renderActiveFilters()`函式（依`activeCategory`/`activeType`/`activeVersion`/`keywordInput.value`產生可個別清除的標籤＋清除全部按鈕），並在`applyFilters()`結尾呼叫；新增`collapsedGroups`狀態物件、`appendGroupHeader()`、`lastRenderedList`；`renderServiceList()`改為：未鎖定分類(`activeCategory`為空)時依`categoryColor`的既有分類順序分組並插入可摺疊標題列，鎖定單一分類時維持原本平鋪列表不分組。
- 驗證方式與實際結果（非僅代碼審閱，全部用真實headless Chrome模擬點擊驗證）：
  1. `node --check scripts/build-kb-html.js` → 語法通過。
  2. `npm test` → 16/16 pass（既有迴歸測試不受影響，因為這次改動只碰渲染邏輯，不碰`kbEngine.js`）。
  3. `npm run build` → 成功產出`outputs/kb.html`。
  4. `bash scripts/headless-check.sh` → 「共 258 筆」不變。
  5. 預設（未篩選）畫面截圖確認：16個分類分組標題正確渲染，含分類色點、名稱、筆數、摺疊箭頭。
  6. **互動情境驗證**（複製`outputs/kb.html`注入`click()`模擬腳本，用headless Chrome實際載入並執行，非單純程式碼推導）：
     - 情境②：模擬點擊「物件鎖定」分類chip → 結果「共 3 筆」、`group-header`數量=0（確認鎖定分類時不分組）。
     - 情境③：同上動作後 → `active-filters`元素取得`visible` class，內容正確顯示「分類：物件鎖定 ×」標籤＋「清除全部」按鈕。
     - 情境④：模擬先點分類chip再點「清除全部」→ 結果回到「共 258 筆」、`group-header`數量回到16、`active-filters`清空且移除`visible` class。
     - 額外驗證摺疊本身：模擬點擊第一個`group-header`（物件鎖定，3筆）→ 該標題列取得`collapsed` class，DOM裡`class="row"`的數量從258減少為255（3筆確實從畫面隱藏，非只是CSS遮蔽）。
  7. 已清除本次驗證用的暫存測試檔（3個注入版kb.html複本＋1張截圖）。
- 所有情境皆為使用真實headless Chrome載入並執行實際click事件後得到的DOM結果，不是單純程式碼推導或假設。
