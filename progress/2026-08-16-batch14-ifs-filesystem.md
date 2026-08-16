# Batch 14：IFS檔案系統（11筆，本輪最後一批） — 動手前記錄

最後更新：2026-08-16。

## 任務

`plans/2026-08-14-full-catalog-roster.json` 分類=IFS檔案系統，現查pending共11筆，本批一次處理完，**完成後207/207全數收齊**：

1. COMPARE_IFS (Table function)
2. IFS_JOB_INFO (Table function)
3. IFS_OBJECT_LOCK_INFO (Table function)
4. IFS_OBJECT_PRIVILEGES (Table function)
5. IFS_OBJECT_REFERENCES_INFO (Table function)
6. IFS_READ (Table function)
7. IFS_READ_BINARY (Table function)
8. IFS_READ_UTF8 (Table function)
9. IFS_WRITE (Procedure)
10. IFS_WRITE_BINARY (Procedure)
11. IFS_WRITE_UTF8 (Procedure)

## 已知限制

- 查證管道優先序不變：①`python scripts/pdf-search.py`查`rzajqpdf.pdf` → ②`ibm-i-services-sql.html`（Type/PTF對照）→ ③`WebSearch` → ④`bash scripts/webfetch-escalate.sh`。查不到就不收錄，標記`blocked-no-doc-found`。
- **全程不使用cd**，牽涉專案外路徑一律用絕對路徑當參數傳遞。
- `IFS_WRITE`/`IFS_WRITE_BINARY`在先前批次查證SERVER_SHARE_INFO時見過範例片段(第699頁附近)，但未取得完整參數定義，本批仍需完整查證。
- **延續前幾批教訓**：①`roster-mark-added.py`執行前務必先用python核對services.json確實已有對應條目才標記；②新增模板id前用python掃描`templates.json`全體id是否重複；③純關鍵字搜尋可能命中不相關章節，找不到明確定義段落要用完整片語二次確認。

## 本次計畫怎麼做

同既有SOP：PDF查證→查詢面過窄盤點→寫入services.json/templates.json(先核對條目已寫入、id無重複)→roster-mark-added.py→npm test/build/headless-check.sh→補結果段落。完成後確認roster總計207/207、0筆blocked，並整理總結報告給使用者。

## 本輪動作範圍

允許修改：`src/data/services.json`、`src/data/templates.json`、`plans/2026-08-14-full-catalog-roster.json`、`outputs/kb.html`（僅透過`npm run build`產生）。

## 結果（已完成 — 207/207全數收齊）

11筆全數核實成功收錄，寫入services.json/templates.json後先用python核對條目確實存在、且全體id無重複，才執行roster-mark-added.py。**IFS檔案系統分類11筆全數收齊，同時是207筆roster的最後一批**。

**最終確認（python核對roster.json + services.json + templates.json）**：
- roster：207筆全部`status=added`，0筆`pending`，0筆`blocked`
- `services.json`：208筆（207筆roster對應 + 1筆既有的`systablestat`額外收錄，非bug，詳見Batch 8B記錄），全部`verified:true`，沒有草稿
- `templates.json`：209筆，每一筆services.json條目都至少對應一個模板
- id重複掃描：services.json與templates.json均無重複id

**查證來源**：一次dump(664-699頁)幾乎涵蓋全部11筆：COMPARE_IFS(665-668)、IFS_JOB_INFO(668-671)、IFS_OBJECT_LOCK_INFO(671-674)、IFS_OBJECT_PRIVILEGES(674-677)、IFS_OBJECT_REFERENCES_INFO(677-680)；另一次dump(692-700)取得IFS_READ/IFS_READ_BINARY/IFS_READ_UTF8(693-695)、IFS_WRITE/IFS_WRITE_BINARY/IFS_WRITE_UTF8(697-699)。

**驗證**：`npm test`(16/16)、`npm run build`、`bash scripts/headless-check.sh`確認208筆(197+11)正確渲染、`node -e`端對端驗證4個代表性新模板(含binary版本)，SQL輸出皆正確。

**收尾**：清空本session累積的`outputs/webfetch/dump_*.txt`暫存檔(34個)，只保留本來就存在的正式參考檔案(`rzajqpdf.pdf`、`ibm-i-services-sql.html`等)。

## 總結：207筆全量擴充作業至此全部完成
