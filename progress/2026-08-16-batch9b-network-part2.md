# Batch 9B：網路連線（第2批，剩餘11筆） — 動手前記錄

最後更新：2026-08-16。

## 任務

`plans/2026-08-14-full-catalog-roster.json` 分類=網路連線，Batch 9A（前12筆）已完成。本批（9B）處理剩餘11筆，完成後**網路連線分類23筆全數收齊**：

1. OBJECTCONNECT_INFO (View)
2. RDB_ENTRY_INFO (View)
3. REMOVE_ISCSI_TARGET (Procedure)
4. REMOVE_TIME_SERVER (Procedure)
5. SERVER_SBS_CONFIGURATION (View)
6. SERVER_SBS_ROUTING (View)
7. SERVER_SHARE_INFO (View)
8. SET_SERVER_SBS_ROUTING (Procedure)
9. TCPIP_INFO (View)
10. TELNET_SERVER_ATTRIBUTES (View)
11. TIME_PROTOCOL_INFO (View)

## 已知限制

- 查證管道優先序不變：①`python scripts/pdf-search.py`查`rzajqpdf.pdf` → ②`ibm-i-services-sql.html`（Type/PTF對照）→ ③`WebSearch` → ④`bash scripts/webfetch-escalate.sh`。查不到就不收錄，標記`blocked-no-doc-found`。
- **全程不使用cd**，牽涉專案外路徑一律用絕對路徑當參數傳遞。
- `REMOVE_ISCSI_TARGET`(657-658頁)、`TIME_PROTOCOL_INFO`(636頁)的PDF內容已在Batch 9A查證時順帶取得，可直接引用不需重查。
- 依使用者指示，本輪起連續處理剩餘所有分類（工作管理21、系統效能15、使用者空間/索引13、儲存空間管理12、IFS檔案系統11）直到207/207，每個分類/子批次仍各自遵守「動手前後留progress記錄」規則，不因為連續作業而省略。

## 本次計畫怎麼做

同既有SOP：PDF查證→查詢面過窄盤點→寫入services.json/templates.json→roster-mark-added.py→npm test/build/headless-check.sh→補結果段落。

## 本輪動作範圍

允許修改：`src/data/services.json`、`src/data/templates.json`、`plans/2026-08-14-full-catalog-roster.json`、`outputs/kb.html`（僅透過`npm run build`產生）。

## 結果（已完成）

11筆全數核實成功收錄，roster全部標記`added`。**網路連線分類23筆全數收齊**。roster層面 **135/207** 已收錄、0筆blocked、72筆pending。

**查證來源**：全部11筆都直接從`rzajqpdf.pdf`查到完整內容，一次dump(616-635頁+699-702頁)就涵蓋了OBJECTCONNECT_INFO(616-617)、RDB_ENTRY_INFO(620-623)、REMOVE_TIME_SERVER(623)、SERVER_SBS_CONFIGURATION(623-624)、SERVER_SBS_ROUTING(624-627)、SET_SERVER_SBS_ROUTING(627-633)、TCPIP_INFO(633-634)、TELNET_SERVER_ATTRIBUTES(634-636)；SERVER_SHARE_INFO另查(699-702)；REMOVE_ISCSI_TARGET(657-658)、TIME_PROTOCOL_INFO(636)沿用Batch 9A查證時已取得的內容。PTF/OS版本全部來自`ibm-i-services-sql.html`。

**PTF對照表解讀細節**：`SERVER_SBS_ROUTING`(7.6/7.5欄)跟`SET_SERVER_SBS_ROUTING`(7.6/7.5欄)的原始HTML儲存格內容只有字面文字「Base Enhanced」，沒有列出對應PTF編號(跟其他筆「Enhanced: SF999xx Level N」的格式不同)，如實記錄成`enhanced: "官方對照表標示Base Enhanced，未列出對應PTF編號"`，不臆測PTF編號。`SET_SERVER_SBS_ROUTING`的7.4/7.3欄則有明確PTF編號(SF99704 Level 4/SF99703 Level 16)對應「支援IP位址範圍路由等進階功能」。

**驗證**：`npm test`(16/16)、`npm run build`、`bash scripts/headless-check.sh`確認136筆(125+11)正確渲染、`node -e`端對端驗證4個代表性新模板（`remove_iscsi_target_call`、`set_server_sbs_routing_call`、`server_share_info_check`留空篩選、`rdb_entry_info_check`），SQL輸出皆正確。

網路連線分類全數完成後，依使用者指示接續處理剩餘分類：工作管理(21)、系統效能(15)、使用者空間/索引(13)、儲存空間管理(12)、IFS檔案系統(11)，逐批進行並各自留progress記錄，最終目標207/207。
