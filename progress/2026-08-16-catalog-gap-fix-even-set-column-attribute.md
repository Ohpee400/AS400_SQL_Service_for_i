# 修復目錄缺口：EVEN、SET_COLUMN_ATTRIBUTE — 動手前記錄

最後更新：2026-08-16。對應計畫：`plans/2026-08-16-catalog-gap-root-cause-and-fix.md`，使用者已回覆「approve」確認動手。

## 任務

依計畫收錄兩筆先前遺漏的官方服務：`SYSTOOLS.EVEN`（Scalar function，系統設定/其他）、`SYSPROC.SET_COLUMN_ATTRIBUTE`（Procedure，安全稽核），並新增一支可重複執行的全量比對腳本，確認之後roster與官方目錄完全一致、0缺口。

## 已知限制

- 兩筆的PDF內容已於查證階段完整取得（EVEN：第504-505頁；SET_COLUMN_ATTRIBUTE：第1012-1013頁），本輪只需補PTF/版本資料（從`ibm-i-services-sql.html`擷取）並寫入。
- id無重複已於查證階段核對過：`even`/`even_check`、`set_column_attribute`/`set_column_attribute_call`均不存在於現有services.json/templates.json。
- 新增的比對腳本邏輯沿用查證階段驗證過的做法：解析全部`<tr>`列、抓第一個`<td>`儲存格文字、比對`SCHEMA.NAME`格式、不限定schema白名單，再排除已知非服務列。

## 本次計畫怎麼做

1. 把這2筆以`status: pending`加入`plans/2026-08-14-full-catalog-roster.json`。
2. 寫入`src/data/services.json`／`src/data/templates.json`各1筆。
3. 用`scripts/roster-mark-added.py`標記這2筆為`added`（標記前核對services.json確有對應id）。
4. 新增`scripts/roster-gap-check.py`（全量逐列比對腳本），跑一次確認roster 257筆與官方目錄完全一致、0缺口。
5. `npm test`→`npm run build`→`bash scripts/headless-check.sh`→端對端抽測新模板SQL輸出。
6. 補這份記錄的「結果」段落，並更新`progress/2026-08-14-session-handoff.md`。

## 本輪動作範圍

允許修改：`plans/2026-08-14-full-catalog-roster.json`、`src/data/services.json`、`src/data/templates.json`、`outputs/kb.html`（僅透過`npm run build`產生）、新增`scripts/roster-gap-check.py`。

## 結果

- 查證依據：`even`的PTF資料以正則`>(SYSTOOLS\.EVEN)\(?\)?(?:&nbsp;)?<`從`ibm-i-services-sql.html`擷取（原正則抓不到是因為官方HTML該處多了一個`&nbsp;`，已調整比對）；`set_column_attribute`的PTF資料（4版本皆Base原生支援）同樣從HTML擷取確認。兩筆的完整PDF內容（參數、Authorization、Example）均已於查證階段取得。
- roster.json：新增2筆`pending`項目後(`EVEN`歸「系統設定/其他」、`SET_COLUMN_ATTRIBUTE`歸「安全稽核」)，寫入services.json/templates.json，再用`roster-mark-added.py`標記為`added`，最終roster統計為`{'added': 257}`，0筆pending、0筆blocked。
- 寫入`src/data/services.json`：新增`even`(SYSTOOLS.EVEN)、`set_column_attribute`(SYSPROC.SET_COLUMN_ATTRIBUTE)共2筆，均`verified:true`；`src/data/templates.json`新增對應2筆模板`even_check`、`set_column_attribute_call`，寫入前均核對id無重複。
- 驗證：`npm test`（16/16 pass）→ `npm run build`（成功）→ `node -e`端對端抽測兩個新模板（`VALUES SYSTOOLS.EVEN(18)`、`CALL SYSPROC.SET_COLUMN_ATTRIBUTE('LIB1', 'ORDERS', 'CCNBR', 'SECURE YES')`），SQL語法正確 → `bash scripts/headless-check.sh`顯示「共 258 筆」，與services.json總數(257 roster對應筆數 + 1筆既有未追蹤的`systablestat`)一致。
- 新增`scripts/roster-gap-check.py`（全量逐列比對腳本，不限定schema白名單），執行結果：「官方目錄去重後服務數: 257／roster.json 服務數: 257／roster.json裡缺少: 0／roster.json多出的: 0／結論：roster.json 與官方目錄完全一致，0筆缺口」，確認本次修復後真正達成與官方目錄零缺口。
- 已清除本次查證用的暫存檔`dump_gap_*.txt`。
