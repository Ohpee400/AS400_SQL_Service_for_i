# Batch 9A：網路連線（第1批，共23筆中的前12筆） — 動手前記錄

最後更新：2026-08-16。

## 任務

`plans/2026-08-14-full-catalog-roster.json` 分類=網路連線，現查pending共23筆，分兩批處理。本批（9A）處理前12筆：

1. ADD_ISCSI_TARGET (Procedure)
2. ADD_TIME_SERVER (Procedure)
3. CHANGE_ISCSI_TARGET (Procedure)
4. CHANGE_OBJECTCONNECT (Procedure)
5. DNS_LOOKUP (Table function)
6. DNS_LOOKUP_IP (Scalar function)
7. DRDA_AUTHENTICATION_ENTRY_INFO (View)
8. HTTP_SERVER_INFO (View)
9. ISCSI_INFO (View)
10. NETSTAT_INTERFACE_INFO (View)
11. NETSTAT_JOB_INFO (View)
12. NETSTAT_ROUTE_INFO (View)

剩餘11筆（OBJECTCONNECT_INFO ~ TIME_PROTOCOL_INFO）留待Batch 9B。

## 已知限制

- 查證管道優先序不變：①`python scripts/pdf-search.py`查`rzajqpdf.pdf` → ②`ibm-i-services-sql.html`（Type/PTF對照）→ ③`WebSearch` → ④`bash scripts/webfetch-escalate.sh`。查不到就不收錄，標記`blocked-no-doc-found`。
- **全程不使用cd**，牽涉專案外路徑一律用絕對路徑當參數傳遞。
- 只要是實作項目一律要留progress記錄，本記錄即依此規則產出。
- ISCSI/TIME_SERVER/OBJECTCONNECT/SERVER_SBS系列都是Procedure，注意動作類（ADD/CHANGE/REMOVE/SET）Procedure通常有多個必要參數，需完整核對參數順序與型別，不可用OR-trick（那是給View WHERE子句用的），若有選填參數要用`NULLIF('{param}', '')`。
- NETSTAT系列容易與現有NETSTAT_*搞混，需確認是否已有同名/近似服務已收錄（避免重複建立）。

## 本次計畫怎麼做

1. 用`python scripts/pdf-search.py search "..."`逐一定位12筆在PDF裡的位置，`dump`模式取出完整段落。
2. 查不到的用`ibm-i-services-sql.html`本機對照表或`bash scripts/webfetch-escalate.sh`查即時IBM文件。
3. 依「查詢面過窄」規則盤點每筆SELECT類的輸出欄位vs可篩選表單參數。
4. 寫入`services.json`/`templates.json`，用`python scripts/roster-mark-added.py`更新roster狀態。
5. `npm test`→`npm run build`→`bash scripts/headless-check.sh`驗證筆數→抽樣`fillTemplate`+`formatSql`端對端驗證新模板。
6. 補這份記錄的「結果」段落，回報使用者。

## 本輪動作範圍

允許修改：`src/data/services.json`、`src/data/templates.json`、`plans/2026-08-14-full-catalog-roster.json`、`outputs/kb.html`（僅透過`npm run build`產生）。不涉及`scripts/build-kb-html.js`（本批不預期需要UI改動）。

## 結果（已完成）

12筆全數核實成功收錄，roster全部標記`added`。roster層面 **124/207** 已收錄、0筆blocked、83筆pending。

**查證來源**：全部12筆都直接從`rzajqpdf.pdf`查到完整內容：ADD_ISCSI_TARGET(636-638)、ADD_TIME_SERVER(579-580)、CHANGE_ISCSI_TARGET(638-640，附帶查到CHANGE_IOP procedure跟REMOVE_ISCSI_TARGET procedure的完整內容，留給Batch 9B直接使用不用重查)、CHANGE_OBJECTCONNECT(580-583)、DNS_LOOKUP(583)、DNS_LOOKUP_IP(584)、DRDA_AUTHENTICATION_ENTRY_INFO(996-997)、HTTP_SERVER_INFO(585-586)、ISCSI_INFO(656-657，附帶查到SERVICE_TOOLS_SERVER_INFO view的完整內容)、NETSTAT_INTERFACE_INFO(593-600)、NETSTAT_JOB_INFO(600-602)、NETSTAT_ROUTE_INFO(602-609)。PTF/OS版本資訊全部來自本機`ibm-i-services-sql.html`的Type/PTF對照表（7.6/7.5/7.4/7.3四欄）。

**參數語意查證細節**：
- `CHANGE_ISCSI_TARGET`的`INITIATOR_CHAP_NAME`/`INITIATOR_CHAP_SECRET`參數，官方文件明確寫「特殊值`*SAME`＝不變更此設定，且為預設值」，跟其他批次慣用的「留空→NULLIF→NULL＝套用預設」語意不同（文件沒提到NULL等同`*SAME`），因此這兩個參數改用`default: "*SAME"`字面值當範本預設，不套用NULLIF包裝，避免留空時傳NULL造成跟文件不符的行為。
- `CHANGE_OBJECTCONNECT`的10個具名參數全部是「省略則不變更」語意，全數套用`NULLIF('{param}', '')`。
- `TARGET_PORT`(整數型，1-65535)等數值型可選參數延續先前批次已確立的NULLIF字串包裝慣例(先前`VIRTUAL_LAN_ID`已有先例)。

**驗證**：`npm test`(16/16)、`npm run build`、`bash scripts/headless-check.sh`確認125筆(113+12)正確渲染、`node -e`端對端驗證6個代表性新模板（`add_iscsi_target_call`留空選填參數、`change_iscsi_target_call`確認`*SAME`預設、`change_objectconnect_call`留空參數、`dns_lookup_query`/`dns_lookup_ip_call`、`netstat_job_info_check`留空篩選），SQL輸出皆正確。

Batch 9B（剩餘11筆：OBJECTCONNECT_INFO ~ TIME_PROTOCOL_INFO）將接續進行，其中`REMOVE_ISCSI_TARGET`、`SERVICE_TOOLS_SERVER_INFO`(不在本次roster清單內)已在本批查證過程中順帶取得完整PDF內容，屆時可直接引用不需重查。
