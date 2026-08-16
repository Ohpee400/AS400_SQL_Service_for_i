# Batch 11B：系統效能（第2批，剩餘7筆） — 動手前記錄

最後更新：2026-08-16。

## 任務

`plans/2026-08-14-full-catalog-roster.json` 分類=系統效能，Batch 11A（前8筆）已完成。本批（11B）處理剩餘7筆，完成後**系統效能分類15筆全數收齊**：

1. SYSLIMITS_BASIC (View)
2. SYSLIMTBL (Table)
3. SYSTEM_ACTIVITY_INFO (Table function)
4. SYSTEM_STATUS (Table function)
5. SYSTEM_STATUS_INFO_BASIC (View)
6. SYSTMPSTG (View)
7. WORKLOAD_GROUP_INFO (View)

## 已知限制

- 查證管道優先序不變：①`python scripts/pdf-search.py`查`rzajqpdf.pdf` → ②`ibm-i-services-sql.html`（Type/PTF對照）→ ③`WebSearch` → ④`bash scripts/webfetch-escalate.sh`。查不到就不收錄，標記`blocked-no-doc-found`。
- **全程不使用cd**，牽涉專案外路徑一律用絕對路徑當參數傳遞。
- `SYSLIMITS_BASIC`(1117-1118頁)、`SYSLIMTBL`(1113-1114頁)已在Batch 11A查證SYSLIMITS時順帶取得；`SYSTEM_ACTIVITY_INFO`(1218-1219頁)、`WORKLOAD_GROUP_INFO`(1259頁)已在Batch 10B查證時順帶取得，皆可直接引用不需重查。`SYSTEM_STATUS`(1219頁起)在Batch 10B僅取得開頭部分，需補查後續頁碼確認完整欄位。
- **`roster-mark-added.py`執行前務必先用python核對services.json確實已有對應條目才標記**（延續Batch 10A教訓）。

## 本次計畫怎麼做

同既有SOP：PDF查證(SYSTEM_STATUS_INFO_BASIC、SYSTMPSTG需新查，SYSTEM_STATUS需補查)→查詢面過窄盤點→寫入services.json/templates.json(先核對條目已寫入)→roster-mark-added.py→npm test/build/headless-check.sh→補結果段落。完成後系統效能分類15筆全數收齊。

## 本輪動作範圍

允許修改：`src/data/services.json`、`src/data/templates.json`、`plans/2026-08-14-full-catalog-roster.json`、`outputs/kb.html`（僅透過`npm run build`產生）。

## 結果（已完成，含一次自我糾正）

7筆全數核實成功收錄，寫入services.json後先用python核對條目確實存在才執行roster-mark-added.py。**系統效能分類15筆全數收齊**。roster層面 **171/207** 已收錄、0筆blocked、36筆pending。

**查證來源**：`SYSLIMITS_BASIC`(1117-1119)、`SYSLIMTBL`(1113-1114)沿用Batch 11A查證SYSLIMITS時已取得的內容；`SYSTEM_ACTIVITY_INFO`(1218-1219)、`WORKLOAD_GROUP_INFO`(1259)沿用Batch 10B查證時已取得的內容；`SYSTEM_STATUS`(1220-1229，補查完整範圍)、`SYSTEM_STATUS_INFO_BASIC`(1241-1242)、`SYSTMPSTG`(1105-1106，附帶取得下一批要用的USER_STORAGE view 1106-1107跟UNLOCK_DEVICE procedure 1106完整內容，兩者都是儲存空間管理分類項目)為本批新查證。

**過程中發現並即時修正的錯誤（重要）**：新增的`system_status_check`模板id跟一份很早期批次(session更早之前)就已存在、對應`system_status_info`(SYSTEM_STATUS_INFO view，非本次新增的SYSTEM_STATUS table function)的模板id完全重複。因為JS的`Array.find()`只回傳第一個符合的結果，寫端對端驗證測試時發現輸出的SQL明顯不對(`SELECT * FROM QSYS2.SYSTEM_STATUS_INFO`而非預期的`TABLE(QSYS2.SYSTEM_STATUS(...))`)，才追查出id撞名。已將新模板id改為`system_status_table_check`，並額外寫了一段python腳本核對`services.json`跟`templates.json`全體id是否有重複(結果確認除了這一筆外沒有其他重複)，修正後重新跑過完整驗證流程確認正確。**這個教訓值得記住：新增模板id時，光靠人工肉眼比對容易漏掉跟很早期批次的撞名，之後每批完成後都應該用程式化方式全體掃一次id重複，不能只憑印象「這個名字應該沒人用過」。**

**驗證**：`npm test`(16/16)、`npm run build`、`bash scripts/headless-check.sh`確認172筆(165+7)正確渲染、`node -e`端對端驗證4個代表性新模板(含修正後的`system_status_table_check`)，SQL輸出皆正確；額外執行全體id重複掃描腳本，確認`services.json`(172筆)與`templates.json`(173筆)目前皆無id重複。

系統效能分類全數完成後，依使用者指示接續處理下一個分類：使用者空間/索引(13筆)。
