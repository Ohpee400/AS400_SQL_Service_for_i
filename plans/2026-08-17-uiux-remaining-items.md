# UI/UX剩餘3項回饋：全展開/收合、簡化顏色、改寫免責聲明

最後更新：2026-08-17。對應使用者稍早列出、尚未處理的3項回饋，使用者確認「一次全處理」。

## 問題/需求清單

1. 分類分組可摺疊，但沒有「全部展開」/「全部收合」的批次操作按鈕，分類一多要一個個點很麻煩。
2. 畫面同時存在16種分類色點（每列一個）＋6種類型pill顏色，同時攤開在258筆列表上視覺負擔大，使用者反應「看得很不舒服」。
3. 頁尾免責聲明文字混了內部協作流程用語（例如「依專案規則不應長期保留在正式收錄清單中」），這是給維護者看的規則，不該出現在給外部使用者看的免責聲明裡。

## 已查明的現況（讀取程式碼確認，非猜測）

- 分組摺疊狀態已有`collapsedGroups`物件記錄各分類的摺疊狀態，`appendGroupHeader()`點擊會逐一切換；目前沒有批次設定全部key的入口。
- 每列的`.col-cat`欄位（30px寬）目前顯示`categoryColor[service.category]`的色點，這跟（未鎖定分類時）分組標題的色點+文字重複；鎖定單一分類時，這個色點也不再提供任何新資訊（全部同色）。
- `.type-pill`目前用`typeColor[service.type]`inline style上色（background/color/border各自不同色），型別filter chip列的圓點(`renderTypeChips`裡的`.dot`)也用同一個`typeColor`調色盤，但chip只有6顆、功能是篩選用的圖例，跟「258列同時攤開一堆顏色」是不同情境，不在這次簡化範圍內。
- `src/data/services.json`裡`meta.disclaimer`欄位的文字（見對話記錄查證）明確寫著「verified=false 代表仍為草稿，尚未核實，且依專案規則不應長期保留在正式收錄清單中」，且經確認**services.json裡目前0筆unverified**、build script也完全不依賴verified欄位渲染任何UI——代表這段內部流程說明對外部使用者毫無意義，使用者永遠看不到unverified的項目、也看不到verified欄位本身。

## 修復方向

### A. 全展開/全收合
在`result-count`旁新增兩顆按鈕「全部展開」「全部收合」，只在未鎖定分類(`activeCategory`為空、有分組發生)時顯示。點擊時把`collapsedGroups`裡所有已知分類key設為`false`（展開）或`true`（收合），呼叫`renderServiceList(lastRenderedList)`重新渲染。

### B. 簡化顏色
- 移除每列的`.col-cat`色點欄位（連同表格colgroup/thead一起移除，欄位數從5欄變4欄，`colSpan`相關處從5改4），空出的30px併入說明欄寬度。分組標題(`appendGroupHeader`)的色點保留，那裡只出現16次(每分類一次)而非258次，且是分組情境下唯一的分類視覺提示，不算「過多顏色」的來源。
- `.type-pill`改用固定單一配色（不再依類型上不同顏色），拿掉inline style裡`typeColor[service.type]`的動態上色，只保留文字區分。
- 分類/類型filter chip列的圖例色點維持不變（只有6-16顆、功能是篩選圖例，跟大量重複列的視覺疲勞是不同問題，不動）。

### C. 改寫免責聲明
`src/data/services.json`的`meta.disclaimer`整段改寫為純使用者導向文字，拿掉「verified欄位」「專案規則」「正式收錄清單」這類內部維運用語，只保留使用者真正需要知道的：內容來源(IBM官方文件整理)、環境可能有落差、正式使用前建議測試環境驗證、可用DSPPTF/GO PTF複查PTF狀態。

## 查詢面/欄位盤點

C項改的是`meta.disclaimer`純文字內容，不影響service/template資料結構本身，不需要查詢面欄位盤點。

## 本輪動作範圍

允許修改：`scripts/build-kb-html.js`（A、B項）、`src/data/services.json`的`meta.disclaimer`欄位（C項）、`outputs/kb.html`（僅透過`npm run build`重新產生）。

驗證方式：`npm test`→`npm run build`→`bash scripts/headless-check.sh`確認筆數不變→headless Chrome模擬點擊「全部展開」「全部收合」確認DOM變化符合預期→截圖確認顏色簡化後的視覺效果→dump-dom確認免責聲明文字已更新且不含內部用語關鍵字。
