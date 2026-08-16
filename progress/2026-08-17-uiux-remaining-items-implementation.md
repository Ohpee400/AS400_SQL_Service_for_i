# UI/UX剩餘3項回饋實作 — 動手前記錄

最後更新：2026-08-17。對應計畫：`plans/2026-08-17-uiux-remaining-items.md`，使用者回覆「一次全處理吧」確認方向。

## 任務

依計畫實作：①全展開/全收合按鈕；②移除每列分類色點欄位＋type-pill改單一配色；③改寫`meta.disclaimer`為純使用者導向文字。

## 已知限制

- B項移除`col-cat`欄位會改變表格總欄數(5→4)，需同步修正`colSpan`的3處引用與colgroup/thead定義，避免detail-row/group-header/空結果列跑版。
- C項只動`meta.disclaimer`純文字，不影響任何service/template資料結構。

## 本次計畫怎麼做

1. HTML/CSS/JS改動（A+B項），一次改完再一起驗證。
2. `src/data/services.json`的`meta.disclaimer`改寫（C項）。
3. `npm test`→`npm run build`→`bash scripts/headless-check.sh`→headless Chrome模擬點擊全展開/全收合→截圖確認顏色簡化效果→dump-dom確認免責聲明新文字。
4. 補這份記錄的結果段落。

## 本輪動作範圍

允許修改：`scripts/build-kb-html.js`、`src/data/services.json`(僅`meta.disclaimer`欄位)、`outputs/kb.html`（僅透過`npm run build`產生）。

## 結果

### A. 全展開/全收合
- `result-count`旁新增`group-controls`區塊（「全部展開」「全部收合」兩個藍字按鈕），只在未鎖定分類(有分組發生)時顯示，`renderServiceList()`裡依情境切換`.visible` class。
- 點擊分別把`collapsedGroups`所有16個分類key設為`false`/`true`後重新渲染。

### B. 簡化顏色
- 移除每列的`col-cat`欄位與色點，表格從5欄改4欄，`colgroup`/`thead`/3處`colSpan`同步從5改4。
- `.type-pill`拿掉`typeColor[service.type]`動態inline上色，改用CSS固定單一配色（`var(--accent-soft)`底、`var(--accent)`字/邊框）。
- 分組標題(`appendGroupHeader`)的分類色點保留不動（只出現16次且是分組情境下的分類提示，不算視覺過載來源）；分類/類型filter chip列的圖例色點也保留不動（篩選圖例用途，跟使用者反應的「258列同時攤開的顏色疲勞」是不同情境）。

### C. 改寫免責聲明
- `src/data/services.json`的`meta.disclaimer`整段改寫，拿掉「verified欄位」「專案規則」「正式收錄清單」等內部維運用語，改成純使用者導向文字（內容來源、環境可能有落差、建議測試機驗證、可用DSPPTF/GO PTF複查）。

### 驗證方式與實際結果
- `npm test`16/16 pass → `npm run build`成功 → `bash scripts/headless-check.sh`確認「共 258 筆」不變。
- **互動情境驗證**（複製`outputs/kb.html`注入`click()`模擬腳本，用headless Chrome實際執行）：
  - 模擬點擊「全部收合」→ DOM裡`class="row"`數量降為0、16個`group-header`全部取得`collapsed` class。
  - 接續模擬「全部收合」後再點「全部展開」→ `class="row"`數量恢復258、`collapsed` class數量歸零，確認可逆。
  - dump-dom確認`#disclaimer`文字已更新為新版內容，不含「verified」或內部流程用語。
- 截圖確認：分組標題色點保留、每列不再有色點欄位、type pill統一配色、右上角新增「全部展開／全部收合」控制項，視覺明顯比之前清爽。
- 已清除本次驗證用的暫存測試檔與截圖。
