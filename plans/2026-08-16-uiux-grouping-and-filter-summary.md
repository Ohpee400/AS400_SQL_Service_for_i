# UI/UX修復：分類分組 + 篩選摘要條

最後更新：2026-08-16。對應前一輪對話提出的優化建議第1點（使用者回覆「OK」確認方向）。

## 問題/需求清單

1. 目前258筆服務在未篩選分類時，全部平鋪在單一長表格裡（`renderServiceList`直接把過濾後list逐列塞進`<tbody>`，無分組），使用者要往下捲很長才能找到特定分類的內容。
2. 分類/類型/OS版本三組chip各自獨立顯示active狀態，但畫面上沒有統一的「目前套用了哪些篩選」摘要區塊，也沒有一鍵清除全部篩選的入口——目前只有drawer內部表單有個「重設為預設值」按鈕，跟主畫面篩選是兩回事。

## 已查明的現況（讀取`scripts/build-kb-html.js`確認，非猜測）

- 篩選邏輯在`applyFilters()`（約403行）：`activeCategory`/`activeType`/`activeVersion`三個全域字串變數，各自靠對應chip的click事件單選切換（點同一個chip會取消），彼此用AND邏輯疊加篩選，加上`keywordInput`的關鍵字搜尋。
- `renderServiceList()`（約432行）：目前結果只有`resultCountEl.textContent = '共 ' + list.length + ' 筆'`，表格本體是把list逐筆`forEach`直接生成`row`+`detailRow`塞進`serviceBody`，沒有任何分組結構。
- 沒有任何現成的「清除全部篩選」按鈕或函式。

## 修復方向

### A. 分類分組（可摺疊）

- 只在`activeCategory === ''`（未鎖定單一分類）時才分組——如果使用者已經點了分類chip鎖定單一分類，畫面本來就只剩一個分類的資料，分組標題反而多餘。
- 依過濾後的`list`，依`category`分組，組內維持原本排序；分組順序採目前`categoryChips`渲染時的既有分類順序（避免每次篩選結果不同時分組順序跳動）。
- 每組前插入一列分組標題列（colspan=5），顯示「分類名稱＋(數量)」與一個摺疊箭頭，點擊可摺疊/展開該分類底下的列。
- 摺疊狀態用一個模組層級的`collapsedGroups`物件記錄（key為分類名稱），**不因篩選條件變更而重置**，避免使用者摺疊某分類後，稍微調整關鍵字又要重新摺一次；預設未紀錄=展開，避免使用者第一次進來找不到資料。

### B. 篩選摘要條 + 一鍵清除

- 在既有的`chip-group`區塊（分類/類型/OS版本三排chip）下方新增一個摘要列容器，只在「有任一篩選生效」（`activeCategory`/`activeType`/`activeVersion`任一非空，或`keywordInput.value`非空）時顯示內容，否則整列不佔版面。
- 摘要列內容：依生效的篩選逐一顯示小標籤，例如「分類：安全稽核 ×」「類型：View ×」「OS版本：7.5+ ×」「關鍵字："cve" ×」，每個標籤可點×單獨清除該項篩選（清除後重新呼叫`applyFilters()`）。
- 摘要列最後放一個「清除全部」按鈕，一次清空`keywordInput.value`與三個`active*`變數，並重新渲染chip的active樣式與表格。

## 查詢面/欄位盤點

不涉及services.json/templates.json資料異動，純UI渲染邏輯調整，不需要查詢面欄位盤點。

## 本輪動作範圍

允許修改：`scripts/build-kb-html.js`（CSS+HTML骨架+JS渲染邏輯）、`outputs/kb.html`（僅透過`npm run build`重新產生）。不動`src/data/*.json`。

驗證方式：`npm test`（確保既有16項迴歸測試不受影響）→ `npm run build` → `bash scripts/headless-check.sh`確認筆數不變 → 手動情境確認：①不篩選時看到分組標題與可摺疊 ②鎖定單一分類時不顯示分組標題 ③套用多重篩選後摘要列正確顯示且可清除 ④清除全部後畫面回到初始狀態。
