# 篩選列拿掉顏色、表格類型欄改用顏色區分（執行記錄）

對應計畫：[[2026-08-18-swap-filter-and-type-column-coloring]]

## 已知限制

- 純視覺樣式調整，不涉及資料結構。
- 需連動修改：頂部分類/類型chip、表格類型欄`.type-pill`、表格分組標題列（依使用者確認追加）。

## 本輪動作範圍

允許修改：`scripts/build-kb-html.js`（CSS + JS渲染邏輯）、`outputs/kb.html`（僅透過`npm run build`重新產生）。
不允許：`src/data/*.json`、`src/lib/kbEngine.js`（本次不涉及資料/邏輯層）。

## 本次計畫怎麼做

1. `renderCategoryChips()`、`renderTypeChips()`：拿掉`<span class="dot">`。
2. CSS：移除`.chip .dot`、`.chip.chip-type .dot`、`.chip.active .dot`。
3. `appendServiceRows()`第803行`.type-pill`：加回`typeColor[service.type]`inline style。
4. `appendGroupHeader()`：拿掉`.cat-dot`；CSS `tr.group-header td`字級13.5px→16px，加統一底色`var(--surface-alt)`。
5. `npm test` → `npm run build` → `bash scripts/headless-check.sh`驗證。

## 結果

- 修改`scripts/build-kb-html.js`：
  1. `renderCategoryChips()`/`renderTypeChips()`拿掉色點span，改`chip.textContent`純文字。
  2. CSS移除`.chip .dot`/`.chip.chip-type .dot`/`.chip.active .dot`（無其他引用，確認為死CSS後刪除）。
  3. `appendServiceRows()`第797行`.type-pill`加回`typeColor[service.type]`inline style（沿用git歷史裡2026-08-17前的舊寫法：background加`1a`後綴10%透明、border加`55`後綴33%透明、color全不透明）。
  4. `appendGroupHeader()`拿掉`.cat-dot`span；CSS `tr.group-header td`字級13.5px→16px、背景`var(--paper)`→`var(--surface-alt)`；移除已死的`.cat-dot`CSS規則。
  5. 連帶把`categoryColor`（色盤map，色值已無人使用）簡化成`categories`（純分類名稱陣列，供分組渲染/展開收合按鈕取用分類清單），移除`CATEGORY_PALETTE`。
- 驗證依據：
  - `npm test`：16/16 pass。
  - `npm run build`：成功產出`outputs/kb.html`。
  - `bash scripts/headless-check.sh`：輸出「共258筆」，筆數與異動前一致。
  - `bash scripts/headless-check.sh screenshot`截圖確認：頂部分類/類型chip已無色點、表格類型欄位依類型上色（View/Table function藍色系、Procedure橘色系語意色不變）、分組標題列改字級放大+統一底色、無色點。
- 使用者透過AskUserQuestion確認的兩個判斷題：(1)分組標題色點一併拿掉、(2)拿掉後改用「字級放大＋統一底色」，均已依確認結果實作。
