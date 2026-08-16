# Batch 11A：系統效能（第1批，共15筆中的前8筆） — 動手前記錄

最後更新：2026-08-16。

## 任務

`plans/2026-08-14-full-catalog-roster.json` 分類=系統效能，現查pending共15筆，分兩批處理。本批（11A）處理前8筆：

1. ACTIVE_DB_CONNECTIONS (Table function)
2. ASP_JOB_INFO (View)
3. COLLECTION_SERVICES_INFO (View)
4. MEMORY_POOL (Table function)
5. MEMORY_POOL_INFO (View)
6. PROCESS_SYSTEM_LIMITS_ALERTS (Procedure)
7. SMAPP_ACCESS_PATHS (View)
8. SYSLIMITS (View)

剩餘7筆（SYSLIMITS_BASIC ~ WORKLOAD_GROUP_INFO）留待Batch 11B。

## 已知限制

- 查證管道優先序不變：①`python scripts/pdf-search.py`查`rzajqpdf.pdf` → ②`ibm-i-services-sql.html`（Type/PTF對照）→ ③`WebSearch` → ④`bash scripts/webfetch-escalate.sh`。查不到就不收錄，標記`blocked-no-doc-found`。
- **全程不使用cd**，牽涉專案外路徑一律用絕對路徑當參數傳遞。
- `MEMORY_POOL`(1176-1177頁)、`MEMORY_POOL_INFO`(1177-1179頁)已在Batch 10B查證JOB_QUEUE_INFO/OPEN_FILES/PRESTART_JOB_INFO時順帶取得完整內容，可直接引用不需重查。
- **重要教訓延續（Batch 10A）**：純關鍵字搜尋可能命中不相關章節的巧合提及，找不到明確定義段落時要用完整片語(如「The XXX table/view」)二次確認；`roster-mark-added.py`執行前務必先用python核對services.json確實已有對應條目才標記，不能憑印象。

## 本次計畫怎麼做

同既有SOP：PDF查證(用完整片語搜尋避免誤判頁碼)→查詢面過窄盤點→寫入services.json/templates.json(先核對條目已寫入)→roster-mark-added.py→npm test/build/headless-check.sh→補結果段落。

## 本輪動作範圍

允許修改：`src/data/services.json`、`src/data/templates.json`、`plans/2026-08-14-full-catalog-roster.json`、`outputs/kb.html`（僅透過`npm run build`產生）。

## 結果（已完成）

8筆全數核實成功收錄，寫入services.json後先用python核對條目確實存在才執行roster-mark-added.py。roster層面 **164/207** 已收錄、0筆blocked、43筆pending。

**查證來源**：`MEMORY_POOL`(1192-1193)、`MEMORY_POOL_INFO`(1193-1196)沿用Batch 10B查證時已取得的內容；其餘6筆用完整片語搜尋一次到位：ACTIVE_DB_CONNECTIONS(576-577)、ASP_JOB_INFO(1075-1076，附帶取得下一批要用的ASP_VARY_INFO 1076-1077完整內容，屬儲存空間管理分類)、COLLECTION_SERVICES_INFO(936-937)、SMAPP_ACCESS_PATHS(899-901)、SYSLIMITS(1114-1117，附帶取得SYSLIMTBL 1113-1114跟SYSLIMITS_BASIC 1117-1118完整內容，兩者都是Batch 11B要用的項目)、PROCESS_SYSTEM_LIMITS_ALERTS(1119)。

**驗證**：`npm test`(16/16)、`npm run build`、`bash scripts/headless-check.sh`確認165筆(157+8)正確渲染、`node -e`端對端驗證4個代表性新模板(含`syslimits_check`的數值型必填參數`limitId`未加引號直接帶入WHERE子句)，SQL輸出皆正確。

## 下一批預告

Batch 11B（系統效能剩餘7筆：SYSLIMITS_BASIC、SYSLIMTBL、SYSTEM_ACTIVITY_INFO、SYSTEM_STATUS、SYSTEM_STATUS_INFO_BASIC、SYSTMPSTG、WORKLOAD_GROUP_INFO）將接續進行，其中`SYSLIMITS_BASIC`(1117-1118)、`SYSLIMTBL`(1113-1114)已在本批查證時取得，`SYSTEM_ACTIVITY_INFO`(1218-1219)、`WORKLOAD_GROUP_INFO`(1259)已在Batch 10B查證時取得，可直接引用不需重查；`SYSTEM_STATUS`(1219頁起)在Batch 10B僅取得開頭部分，需補查後續頁碼。
