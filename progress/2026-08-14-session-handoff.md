# 全量擴充作業 — Session交接記錄

最後更新：2026-08-16。**207筆全量擴充作業、Batch 15（48筆官方目錄缺口補齊）、以及事後發現的2筆遺漏(EVEN/SET_COLUMN_ATTRIBUTE)修復都已完成**，roster層面257/257全數`added`、0筆blocked、0筆pending，且已用全量比對腳本確認與官方目錄完全一致、0缺口。這份文件保留供之後回顧整個擴充過程的脈絡；同時要讀跨對話記憶（`project-full-verification-required`、`project-query-surface-checklist-in-plans`、`feedback-terminology-spooled-file-baobiao`、`feedback-progress-record-per-batch`這幾條記的是「規則」，長期適用）。

## 最新狀態（2026-08-16，257/257完成，含Batch 15＋事後缺口修復）

- roster：`plans/2026-08-14-full-catalog-roster.json` 257筆全部`status=added`，0筆pending、0筆blocked。**已用`scripts/roster-gap-check.py`全量逐列比對官方目錄確認0缺口**（這支腳本不限定schema白名單，可重複執行，往後每次新增/懷疑有遺漏都應該先跑這支，不要再用人工瀏覽/關鍵字搜尋去猜）。
- `src/data/services.json`：258筆（257筆對應roster + 1筆既有的`systablestat`，這1筆不在roster掃描範圍內、屬既有服務非bug，詳見`progress/2026-08-16-batch8b-system-config-part2.md`「額外發現」段落），全部`verified:true`，無草稿。
- `src/data/templates.json`：259筆，每筆service都至少有一個對應模板，經python腳本確認services.json/templates.json均無重複id。
- Batch 15緣由：使用者UI回饋第5點質疑「207筆是否真的涵蓋全部官方目錄」，查證後確認官方目錄還有48筆（以SYSTOOLS schema為主+1筆SYSIBMADM）從未被207筆roster追蹤，經使用者確認後分15A/15B/15C三個子批次(17+16+15筆)補齊，完整過程與結果見`progress/2026-08-16-batch15-roster-expansion-207to255.md`。
- **事後缺口修復**：使用者質疑255筆仍非最終結果（誤以為`cve_info`沒收錄，實查已收錄），順勢重新用程式化全量逐列比對，找出2筆真正遺漏——`SYSTOOLS.EVEN`（人工疏漏，跟`ODD`同頁卻沒列入待辦）、`SYSPROC.SET_COLUMN_ATTRIBUTE`（系統性缺口：原48筆缺口分析只掃`QSYS2`/`SYSTOOLS`/`SYSIBMADM`三個schema，從未涵蓋`SYSPROC`）。根本原因與修復過程見`plans/2026-08-16-catalog-gap-root-cause-and-fix.md`與`progress/2026-08-16-catalog-gap-fix-even-set-column-attribute.md`。roster因此由255增為257。
- 207筆階段最後一批（Batch 14：IFS檔案系統11筆）完成記錄：`progress/2026-08-16-batch14-ifs-filesystem.md`。
- 完整批次歷史（由舊到新）：final-implementation-plan(10筆升級)、Batch1(物件鎖定8)、Batch2(大檔案分析4)、Batch3(列印/報表+資料佇列10)、Batch4(日誌管理14)、CREATE_DATA_JOURNAL_READER重試、Batch5A/5B(安全稽核26)、Batch6(程式與程式庫13)、Batch7(服務工具伺服器7)、Batch8A/8B(系統設定/其他20)、Batch9A/9B(網路連線23)、Batch10A/10B(工作管理21)、Batch11A/11B(系統效能15)、Batch12(使用者空間/索引13)、Batch13(儲存空間管理12)、Batch14(IFS檔案系統11)、UI修正(table-layout/scroll/OS版本篩選，見`progress/2026-08-16-ui-fixes-table-scroll-osfilter.md`)、Batch15A/15B/15C(官方目錄缺口48筆)。
- 批次作業SOP（查證用`scripts/pdf-search.py`/`scripts/webfetch-escalate.sh`，驗證用`scripts/headless-check.sh`，roster更新用`scripts/roster-mark-added.py`）、不使用cd的規則、progress記錄規則等，詳見`progress/2026-08-15-compound-bash-blocking-hook.md`與`CLAUDE.md`，這些屬於長期規則，之後任何新增/修改本專案資料的工作都應該延續套用，不因擴充作業結束而失效。

## 歷史記錄（擴充作業進行中期間的舊筆記，保留供回顧）

> 2026-08-16更新：完成Batch 9A（網路連線前12筆：ADD_ISCSI_TARGET、ADD_TIME_SERVER、CHANGE_ISCSI_TARGET、CHANGE_OBJECTCONNECT、DNS_LOOKUP、DNS_LOOKUP_IP、DRDA_AUTHENTICATION_ENTRY_INFO、HTTP_SERVER_INFO、ISCSI_INFO、NETSTAT_INTERFACE_INFO、NETSTAT_JOB_INFO、NETSTAT_ROUTE_INFO，見`progress/2026-08-16-batch9a-network-part1.md`）。**目前roster層面124/207已收錄、0筆blocked、83筆pending**（`services.json`實際筆數125，多的1筆`systablestat`不在207筆roster清單範圍內，是既有服務不是bug，詳見Batch8B記錄的「額外發現」段落，回報進度一律以roster的207筆為基準）。下一批是Batch 9B：網路連線剩餘11筆（OBJECTCONNECT_INFO、RDB_ENTRY_INFO、REMOVE_ISCSI_TARGET、REMOVE_TIME_SERVER、SERVER_SBS_CONFIGURATION、SERVER_SBS_ROUTING、SERVER_SHARE_INFO、SET_SERVER_SBS_ROUTING、TCPIP_INFO、TELNET_SERVER_ATTRIBUTES、TIME_PROTOCOL_INFO），其中`REMOVE_ISCSI_TARGET`(657-658頁)的PDF內容已在Batch 9A查證時順帶取得可直接引用。網路連線批次做完後剩餘分類：工作管理21、系統效能15、使用者空間/索引13、儲存空間管理12、IFS檔案系統11。**批次作業SOP已更新**：查證改用`scripts/pdf-search.py`/`scripts/webfetch-escalate.sh`，驗證改用`scripts/headless-check.sh`，roster更新改用`scripts/roster-mark-added.py`（詳見`plans/2026-08-15-batch-script-consolidation.md`跟`progress/2026-08-15-batch-script-consolidation-implementation.md`），這4支已在`.claude/settings.json`白名單不會跳核准視窗。**任何Bash呼叫都不使用cd**（工作目錄本來就固定在專案根目錄、牽涉專案外路徑一律用絕對路徑當參數傳遞），完整背景跟GitHub查證來源、`PreToolUse`/`PostToolUse`兩支hook細節見`progress/2026-08-15-compound-bash-blocking-hook.md`。**只要是實作項目一律要留progress記錄，動手前後都要，不論使用者是否提醒**（2026-08-16確立，已寫進`CLAUDE.md`），之後接手務必先讀這幾份文件。UI標準規則沒有變動，第41-50行以下內容維持原樣供批次SOP參考，但查證/驗證的具體指令已被腳本取代。

- ~~累計：45/207 已收錄（全數`verified:true`）、1筆blocked、161筆pending。~~（已過時，見上方更新）
- 進度真實來源：`plans/2026-08-14-full-catalog-roster.json` 的 `status` 欄位（`pending`/`added`/`blocked-no-doc-found`），不要憑記憶判斷做到哪，直接讀這個檔案。
- 已完成批次：
  - final-implementation-plan（原10筆核實升級+UI改版）
  - Batch 1：物件鎖定延伸（8筆，含分類修正：NVMe鎖定原則系列改分到儲存空間管理）
  - Batch 2：大檔案分析延伸（4筆，含分類修正：`SYSDISKSTAT`改儲存空間管理、`SAVE_FILE_*`新增「備份與還原」分類）
  - Batch 3：列印/報表管理+資料佇列（10筆，分類「列印/緩衝檔管理」改名「列印/報表管理」）
  - Batch 4：日誌管理延伸（14筆，1筆`CREATE_DATA_JOURNAL_READER`卡住見下方）
- 詳細過程分別記在 `progress/2026-08-14-catalog-expansion-batches-1-3-retroactive.md`、`progress/2026-08-14-batch4-journal-management.md`。

## 下一步：Batch 5（安全稽核，pending 26筆）

依 `plans/2026-08-14-full-catalog-expansion-master-plan.md` 的批次順序，下一批是「安全稽核」分類，pending還有26筆，master plan原本規劃這批要分兩小批處理（分類本身有27筆左右）。**開始前記得先照`feedback-progress-record-per-batch`規則，建一份`progress/`動手前記錄**，格式比照 `progress/2026-08-14-batch4-journal-management.md`。

取清單指令（已驗證可用）：
```python
import json
with open('plans/2026-08-14-full-catalog-roster.json', encoding='utf-8') as f:
    items = json.load(f)
batch = [i for i in items if i['category'] == '安全稽核' and i['status'] == 'pending']
```

批次之後的順序（依master plan，都還沒動）：程式與程式庫(13)、服務工具伺服器(7)、系統設定/其他(20，分兩批)、工作管理剩餘部分、系統效能剩餘部分、使用者空間/索引、IFS檔案系統剩餘部分——**這幾個分類的pending數字都已經因為前4批的分類修正而跟master plan原始估計有落差，動手前務必重新用上面的python指令現查`status=pending`的實際清單，不要沿用master plan文件裡的舊數字。**

## 已解決（2026-08-15）：`CREATE_DATA_JOURNAL_READER`（原roster標記`blocked-no-doc-found`，現已`added`）

> 已重新查證收錄，詳見 `progress/2026-08-15-ui-fixes-and-journal-reader-retry.md` 結果段落。以下是原始卡住經過，保留供參考。

這是Batch 4唯一沒收錄的一筆。已知：
- 官方PTF對照表確認它存在（7.6=SF99960 Level 3、7.5=SF99950 Level 12、7.3/7.4=Not Supported，屬於很新的service）。
- `rzajqpdf.pdf`（本機PDF全文1442頁）搜尋不到完整文件段落。
- `WebSearch`、猜測的IBM Docs網址（`WebFetch`+`scrapling`）都失敗（302導回文件首頁，代表猜的網址不存在）。
- **使用者事後截圖顯示：`outputs/webfetch/ibm-i-services-sql.html`（本機已存檔的官方對照表原始HTML）裡，`QSYS2.CREATE_DATA_JOURNAL_READER()` 這個服務名稱本身是一個可點擊的`<a>`超連結。上一輪沒有去解析這個連結實際指向的`href`，只顧著用WebSearch跟用猜的URL，查證管道沒用全。**

**下一輪重試這筆時，第一步應該是**：直接讀取本機 `outputs/webfetch/ibm-i-services-sql.html` 原始碼，找到 `CREATE_DATA_JOURNAL_READER` 那一列的 `<a href="...">` 實際網址，用那個「真的存在、使用者截圖親眼看到的」連結去 `WebFetch`／`scrapling` 抓內容，而不是繼續用猜的URL slug。

## 這輪（第4次UI回饋）確立的規則，往後每批都要套用

1. **全部核實**才能收錄，查不到就不收錄、標記blocked，不留verified:false草稿。
2. **查詢面過窄**：SELECT類service的輸出欄位都要盤點成可篩選表單參數。
3. **報表**（不是「緩衝檔」）是Spooled File的統一用詞。
4. **每批動手前先留progress記錄**，不能只更新roster.json的status。
5. **分類自動判斷不可盡信**：關鍵字比對出的分類常常不準（NVMe鎖定原則、SYSDISKSTAT、SAVE_FILE_*都曾經誤判），每批查證完都要重新確認分類是否合理，不合理就修正、必要時新增分類（已新增「備份與還原」，之後可能還會需要新分類）。
6. **UI層級的迴歸測試**：`tests/unit/kbEngine.test.js` 有一個「every template...」的自動化測試，掃描所有`templates.json`模板留空時是否產生缺運算元的無效SQL，每次改完`templates.json`都要跑`npm test`確認這個測試還是綠燈。
7. 服務欄位（Service name）用`white-space:nowrap`+table auto-layout處理不換行，不要用固定px硬寫死寬度。
8. 同一service對到多個模板時，按鈕文字要接上模板描述消歧義（`svcTemplates.length > 1`才加，避免不必要的長文字）。

## 每批固定流程（SOP）

1. 用上面的python指令從roster取出該分類pending清單。
2. 建progress記錄（動手前）。
3. 查證管道優先序：① `rzajqpdf.pdf`全文搜尋 → ② `ibm-i-services-sql.html`（Type/PTF對照，注意可以解析`<a href>`找官方連結，這輪才發現這招）→ ③ `WebSearch`找正確網址 → ④ `WebFetch`/`scrapling`抓即時內容（`get`空內容就升級`fetch`）。
4. 每筆核實：正確語法(View/Table function/Procedure/Scalar function/Table)、完整欄位或參數定義、PTF/OS版本、查詢面過窄盤點、（如有Spooled File相關）用「報表」措辭。
5. 寫入 `src/data/services.json`／`src/data/templates.json`，更新 `roster.json` 狀態。
6. `npm test`（16項含迴歸測試都要過）→ `npm run build` → headless Chrome dump-dom驗證筆數與無錯誤 → 抽樣`fillTemplate`+`formatSql`端對端跑幾個新模板確認SQL正確。
7. 補progress記錄的「結果」段落。
8. 回報使用者，問是否繼續下一批。

## 相關檔案速查

- 進度真實來源：`plans/2026-08-14-full-catalog-roster.json`
- 總計畫：`plans/2026-08-14-full-catalog-expansion-master-plan.md`
- 10筆核實升級的原始計畫：`plans/2026-08-14-final-implementation-plan.md`
- UI版面調研：`plans/2026-08-14-catalog-layout-benchmark-and-sql-format.md`
- 資料結構文件：`docs/data-schema.md`
- 待辦總覽：`plans/2026-08-14-outstanding-tasks.md`（含第9項「檢查docs/usage.md／specs/tool-spec.md是否有過時措辭」還沒做）
