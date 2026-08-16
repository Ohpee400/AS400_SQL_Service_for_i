# Batch 13：儲存空間管理（12筆） — 動手前記錄

最後更新：2026-08-16。

## 任務

`plans/2026-08-14-full-catalog-roster.json` 分類=儲存空間管理，現查pending共12筆，本批一次處理完：

1. ASP_VARY_INFO (View)
2. CHANGE_DISK_PATHS (Procedure)
3. CHANGE_IOP (Procedure)
4. FACTORY_RESET_DEVICE (Procedure)
5. GEOGRAPHIC_MIRRORING_INFO (View)
6. HARDWARE_RESOURCE_INFO (Table function)
7. MEDIA_LIBRARY_INFO (View)
8. NVME_INFO (View)
9. SFP_TRANSCEIVER_INFO (View)
10. TAPE_CARTRIDGE_INFO (View)
11. UNLOCK_DEVICE (Procedure)
12. USER_STORAGE (View)

## 已知限制

- 查證管道優先序不變：①`python scripts/pdf-search.py`查`rzajqpdf.pdf` → ②`ibm-i-services-sql.html`（Type/PTF對照）→ ③`WebSearch` → ④`bash scripts/webfetch-escalate.sh`。查不到就不收錄，標記`blocked-no-doc-found`。
- **全程不使用cd**，牽涉專案外路徑一律用絕對路徑當參數傳遞。
- `ASP_VARY_INFO`(1076-1077頁，Batch 11A查證時取得)、`CHANGE_IOP`(638-639頁，Batch 9A查證時取得)、`UNLOCK_DEVICE`(1106頁)、`USER_STORAGE`(1106-1107頁，兩者皆Batch 11B查證時取得)已有完整內容可直接引用；`MEDIA_LIBRARY_INFO`(565頁附近)、`TAPE_CARTRIDGE_INFO`(576頁附近)先前只取得片段，需補查完整範圍。
- **延續前幾批教訓**：①`roster-mark-added.py`執行前務必先用python核對services.json確實已有對應條目才標記；②新增模板id前用python掃描`templates.json`全體id是否重複；③純關鍵字搜尋可能命中不相關章節，找不到明確定義段落要用完整片語二次確認。

## 本次計畫怎麼做

同既有SOP：PDF查證(4筆沿用既有內容、2筆補查完整範圍、6筆全新查證)→查詢面過窄盤點→寫入services.json/templates.json(先核對條目已寫入、id無重複)→roster-mark-added.py→npm test/build/headless-check.sh→補結果段落。

## 本輪動作範圍

允許修改：`src/data/services.json`、`src/data/templates.json`、`plans/2026-08-14-full-catalog-roster.json`、`outputs/kb.html`（僅透過`npm run build`產生）。

## 結果（已完成）

12筆全數核實成功收錄，寫入services.json/templates.json後先用python核對條目確實存在、且全體id無重複，才執行roster-mark-added.py。**儲存空間管理分類12筆全數收齊**。roster層面 **196/207** 已收錄、0筆blocked、11筆pending。

**查證來源**：`ASP_VARY_INFO`(1076-1077)、`CHANGE_IOP`(638-639)、`UNLOCK_DEVICE`(1106)、`USER_STORAGE`(1106-1107)沿用先前批次查證時已取得的內容；`CHANGE_DISK_PATHS`(1078-1080)、`FACTORY_RESET_DEVICE`(1082)、`GEOGRAPHIC_MIRRORING_INFO`(1082-1087)、`NVME_INFO`(1088-1090)為一次dump(1078-1090)取得；`HARDWARE_RESOURCE_INFO`(644-650)、`MEDIA_LIBRARY_INFO`(565-567)、`SFP_TRANSCEIVER_INFO`(660-663)、`TAPE_CARTRIDGE_INFO`(574-576)分別新查。

**細節**：`HARDWARE_RESOURCE_INFO`官方文件同時收錄了Table function(644-650頁)跟View(650-651頁)兩種版本，內容欄位幾乎相同，roster.json標記此筆類型為Table function，因此收錄Table function版本，並在docSearchHint裡註明這個並存情況避免日後誤會少收錄了一個版本。

**驗證**：`npm test`(16/16)、`npm run build`、`bash scripts/headless-check.sh`確認197筆(185+12)正確渲染、`node -e`端對端驗證4個代表性新模板，SQL輸出皆正確；額外執行id重複掃描腳本確認`services.json`(197筆)與`templates.json`(198筆)無重複id。

儲存空間管理分類全數完成後，依使用者指示接續處理最後一個分類：IFS檔案系統(11筆)。
