# 篩選列拿掉顏色、表格類型欄改用顏色區分

最後更新：2026-08-18。使用者用截圖標出兩處：紅框#1（頂部「分類」「類型」篩選chip列）要拿掉顏色區分；紅框#2（表格內每列的「類型」欄，`.type-pill`）反而要加上顏色區分。

## 問題/需求清單

1. 頂部篩選列（`#category-chips`、`#type-chips`）目前每個分類/類型都畫不同顏色的圓點，使用者覺得太花。
2. 表格每列的「類型」欄位（`.type-pill`）目前全部同一個accent色，看不出類型差異，使用者要恢復用顏色區分。

## 已查明的現況（讀取`scripts/build-kb-html.js`確認，非猜測）

- 這是方向上的**反轉**：2026-08-17當天已經處理過一次「顏色太花」的回饋（見[[2026-08-17-uiux-remaining-items]]），當時的結論是：拿掉表格每列的分類色點欄位、把`.type-pill`改成單一固定色，但**保留**頂部篩選chip的顏色（分類/類型），理由是chip只有6~16顆、是圖例用途，跟258列同時攤開的視覺疲勞是不同問題。這次使用者的新回饋剛好是相反方向：篩選chip改不上色，表格類型欄改上色。
- 分類篩選chip：`renderCategoryChips()`（約line 618-632），用`categoryColor[category]`（`CATEGORY_PALETTE`，9色循環）畫`<span class="dot">`。
- 類型篩選chip：`renderTypeChips()`（約line 634-644），用`typeColor[type]`畫`<span class="dot">`。
- OS版本chip（`renderVersionChips()`，約line 650-660）本來就沒有色點，純文字pill——不受影響。
- 已選篩選標籤列（`renderActiveFilters()`，約line 679-738，`.filter-tag`）也沒有用到`categoryColor`/`typeColor`——不受影響。
- 表格類型欄：`appendServiceRows()`第803行，`<span class="type-pill">`目前沒有inline style，CSS固定用`var(--accent)`系列顏色（第187-191行）。
- `typeColor`/`TYPE_COLOR_FIXED`/`TYPE_PALETTE`的定義（第375-392行）**都還在**，只是2026-08-17那次拿掉了套用到`.type-pill`的那行inline style，現在要接回去即可，不用重新設計配色邏輯。其中`TYPE_COLOR_FIXED = { 'Procedure': '#b5562f' }`是語意固定色（Procedure是唯一會異動系統狀態的類型），這個邏輯直接沿用。
- `.dot`這個CSS class（第88、89、92行）目前只被`.chip`（分類）和`.chip.chip-type`（類型）用到，拿掉色點後這幾條規則會變成沒有引用，需要一併清掉。
- 表格分組標題列（`appendGroupHeader()`第848行，`▼●物件鎖定(3)`前面那個`.cat-dot`）也用`categoryColor`上色，不在使用者紅框#1範圍內，已用AskUserQuestion向使用者確認：**決定一併拿掉分類色點**，改用「字級放大＋統一底色」取代（使用者採用建議方案，非分類別的單一色，不會造成「太花」問題）。

### C. 分組標題列拿掉分類色點，改用字級＋底色區隔（使用者確認）
- `appendGroupHeader()`：innerHTML拿掉`<span class="cat-dot" style="background:categoryColor[category]...">`那段。
- CSS `tr.group-header td`：字級從13.5px放大到16px（維持`font-weight:700`），加上統一底色（沿用現有`--surface-alt`變數，跟`tr.row:hover td`同一色，但這裡是常態顯示，非hover觸發），跟一般資料列做出區塊區隔。

## 查詢面/欄位盤點

本次純視覺樣式調整，不涉及service/template資料結構或可篩選參數，不需要查詢面欄位盤點。

## 修復方向

### A. 頂部篩選chip拿掉顏色
- `renderCategoryChips()`、`renderTypeChips()`：innerHTML拿掉`<span class="dot" style="background:...">`那段，只留文字（`escapeHtml(category)` / `escapeHtml(type)`）。
- CSS移除`.chip .dot`、`.chip.chip-type .dot`、`.chip.active .dot`三條規則（確認無其他地方引用`.dot`後移除，避免留下死CSS）。
- chip本身的外框/選中樣式（`.chip`、`.chip.active`）不動，只是拿掉圓點，維持原本的可點擊/hover/active視覺。

### B. 表格類型欄恢復顏色
- `appendServiceRows()`第803行的`.type-pill`加回inline style，用`typeColor[service.type]`設定background/color/border（比照2026-08-17之前、以及目前`renderTypeChips()`用同一份`typeColor`調色盤的做法，維持整站類型顏色語意一致：例如Procedure在篩選chip跟表格類型欄都是同一個橘色）。

## 本輪動作範圍

允許修改：`scripts/build-kb-html.js`（CSS + JS渲染邏輯）、`outputs/kb.html`（僅透過`npm run build`重新產生，不手動編輯）。

驗證方式：`npm test` → `npm run build` → `bash scripts/headless-check.sh`確認筆數/功能未壞 → headless瀏覽器截圖確認：(1)頂部分類/類型篩選chip不再有色點、(2)表格每列類型欄`.type-pill`有依類型上色、(3)分組標題色點維持不變（依使用者確認結果調整）。
