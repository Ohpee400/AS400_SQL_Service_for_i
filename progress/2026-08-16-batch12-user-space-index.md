# Batch 12：使用者空間/索引（13筆） — 動手前記錄

最後更新：2026-08-16。

## 任務

`plans/2026-08-14-full-catalog-roster.json` 分類=使用者空間/索引，現查pending共13筆，本批一次處理完：

1. ADD_USER_INDEX_ENTRY (Procedure)
2. ADD_USER_INDEX_ENTRY_BINARY (Procedure)
3. CHANGE_USER_SPACE (Procedure)
4. CHANGE_USER_SPACE_ATTRIBUTES (Procedure)
5. CHANGE_USER_SPACE_BINARY (Procedure)
6. CREATE_USER_INDEX (Procedure)
7. CREATE_USER_SPACE (Procedure)
8. REMOVE_USER_INDEX_ENTRY (Table function)
9. REMOVE_USER_INDEX_ENTRY_BINARY (Table function)
10. USER_INDEX_ENTRIES (Table function)
11. USER_INDEX_INFO (View)
12. USER_SPACE (Table function)
13. USER_SPACE_INFO (View)

## 已知限制

- 查證管道優先序不變：①`python scripts/pdf-search.py`查`rzajqpdf.pdf` → ②`ibm-i-services-sql.html`（Type/PTF對照）→ ③`WebSearch` → ④`bash scripts/webfetch-escalate.sh`。查不到就不收錄，標記`blocked-no-doc-found`。
- **全程不使用cd**，牽涉專案外路徑一律用絕對路徑當參數傳遞。
- 這批多數是低階系統程式設計介面(User Space/User Index是IBM i傳統MI層級物件)，參數會涉及二進位資料(BINARY型態)，需特別留意欄位型別與二進位/字元版本(_BINARY後綴)的差異，避免混淆。
- **延續前幾批教訓**：①`roster-mark-added.py`執行前務必先用python核對services.json確實已有對應條目才標記；②新增模板id前，用python掃描`templates.json`全體id是否重複，不能只憑印象；③純關鍵字搜尋可能命中不相關章節，找不到明確定義段落要用完整片語二次確認。

## 本次計畫怎麼做

同既有SOP：PDF查證→查詢面過窄盤點→寫入services.json/templates.json(先核對條目已寫入、id無重複)→roster-mark-added.py→npm test/build/headless-check.sh→補結果段落。

## 本輪動作範圍

允許修改：`src/data/services.json`、`src/data/templates.json`、`plans/2026-08-14-full-catalog-roster.json`、`outputs/kb.html`（僅透過`npm run build`產生）。

## 結果（已完成）

13筆全數核實成功收錄，寫入services.json/templates.json後先用python核對條目確實存在、且全體id無重複，才執行roster-mark-added.py（延續前兩批教訓）。**使用者空間/索引分類13筆全數收齊**。roster層面 **184/207** 已收錄、0筆blocked、23筆pending。

**查證來源**：全部13筆都直接從`rzajqpdf.pdf`查到完整內容，兩次dump涵蓋：ADD_USER_INDEX_ENTRY/BINARY(443-444)、CHANGE_USER_SPACE/BINARY(455-456)、CHANGE_USER_SPACE_ATTRIBUTES(456-457)、CREATE_USER_INDEX(466-469)、CREATE_USER_SPACE(469-472)；REMOVE_USER_INDEX_ENTRY/BINARY(539-541)、USER_INDEX_ENTRIES(553-554)、USER_INDEX_INFO(554-555)、USER_SPACE(555-556)、USER_SPACE_INFO(556-557)。

**細節**：這批多數是IBM i傳統MI層級物件(User Space/User Index)的低階存取介面，7個Procedure/Table function都有字元版跟`_BINARY`後綴的二進位版兩種平行介面，處理時特別核對了兩版差異僅在於ENTRY/DATA/KEY等參數是否視為binary string，其餘語意相同，模板部分也依此為3個BINARY變體(ADD_USER_INDEX_ENTRY_BINARY、CHANGE_USER_SPACE_BINARY、REMOVE_USER_INDEX_ENTRY_BINARY)補上獨立模板(用`BX'...'`格式輸入16進位字串)，維持1服務至少1模板的專案慣例。

**驗證**：`npm test`(16/16)、`npm run build`、`bash scripts/headless-check.sh`確認185筆(172+13)正確渲染、`node -e`端對端驗證4個代表性新模板(含binary版本)，SQL輸出皆正確；額外執行id重複掃描腳本確認`services.json`(185筆)與`templates.json`(186筆)無重複id。

使用者空間/索引分類全數完成後，依使用者指示接續處理下一個分類：儲存空間管理(12筆)。
