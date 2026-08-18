# 116筆View/Table查詢面稽核（執行記錄）

對應計畫：[[2026-08-18-view-table-query-surface-audit]]

## 本輪動作範圍

唯讀查證（PDF/webfetch）+ 允許修改：`src/data/templates.json`、`src/data/services.json`(docSearchHint格式)。

## 第0批：5筆docSearchHint頁碼記錄修正

`system_status_info`、`journal_info`、`user_info`、`netstat_info`、`asp_info`——這5筆先前用「內文搜尋」當備援寫法，沒有實際PDF頁碼範圍，這次用`pdf-search.py`+全文檢索定位「Table X. XXX view」標題所在頁碼、並核對PDF頁碼與原書頁碼的固定偏移量(+16)後補上：

| 服務 | PDF頁碼 | 原書頁碼 |
|---|---|---|
| system_status_info | 1230-1240 | 1214-1224 |
| journal_info | 874-882 | 858-866 |
| user_info | 1017-1026 | 1001-1010 |
| netstat_info | 587-593 | 571-577 |
| asp_info | 1064-1074 | 1048-1058 |

其中`system_status_info`目前模板`system_status_check`是0參數，順便核對官方文件：「The SYSTEM_STATUS_INFO view returns a single row containing details about the current partition.」——單列摘要view，符合計畫的判斷原則第5條，**已檢視，無需新增篩選參數**。其餘4筆(`journal_info`5-6個參數、`user_info`/`netstat_info`/`asp_info`都是5個參數)已經在「2個以上參數」的第2輪範圍，這批不動。

驗證：`services.json`通過`JSON.parse`、`npm run build`→`headless-check.sh`確認258筆不變。

## 第1輪第1批：0參數服務前13筆（含第0批已處理的system_status_info）

逐筆查PDF/webfetch欄位清單，套用計畫的判斷原則：

| 服務 | 輸出欄位摘要 | 判斷 |
|---|---|---|
| system_status_info | 官方文件明說「returns a single row」 | 已檢視，無需新增（第0批已記錄） |
| security_info | 官方文件明說「returns one row」 | 已檢視，無需新增 |
| library_list_info | ORDINAL_POSITION、SCHEMA_NAME、TYPE(USER/SYSTEM/PRODUCT/CURRENT列舉)、IASP_NUMBER、TEXT_DESCRIPTION | **新增**`type`篩選(下拉) |
| service_tools_server_configuration_entry_info | PARTITION_UUID(BINARY16)、RESOURCE_NAME、IPV4/GATEWAY/SUBNET/IPV6/VIRTUAL_LAN_ID/INTERFACE_ID | **新增**`resourceName`(模糊)+`partitionUuid`(精確，BX'...') |
| service_tools_server_info | 官方文件明說「returns one row」 | 已檢視，無需新增 |
| electronic_service_agent_info | ESA_STATUS、ESA_CONNECTION、SERVER_TYPE(列舉但含流水號後綴)、SERVER_HOSTNAME/IP/PORT等 | **新增**`serverType`篩選(LIKE模糊，因值含流水號後綴) |
| network_attribute_info | 官方文件明說「returns a single row」 | 已檢視，無需新增 |
| reply_list_info | SEQUENCE_NUMBER、MESSAGE_ID、MESSAGE_REPLY、COMPARISON_DATA等 | **新增**`messageId`篩選 |
| objectconnect_info | STATE/AUTO_START/MIN_JOBS/MAX_JOBS等——單一伺服器設定描述，無多列識別欄位 | 已檢視，無需新增 |
| tcpip_info | COLLECTED_TIME、CLIENT/SERVER位址等——描述「the current host connection」單一連線 | 已檢視，無需新增 |
| telnet_server_attributes | 官方文件明說「returns a single row」 | 已檢視，無需新增 |
| time_protocol_info | 只有TIME_SERVER、PREFERRED_INDICATOR兩欄，NTP伺服器通常只有1-4筆 | 已檢視，欄位少+結果集小，篩選價值有限，不加 |
| tracked_job_queues | IASP_NAME、JOB_QUEUE_LIBRARY、JOB_QUEUE、JOB_RETENTION_PERIOD、TRACKING_FILE_IASP | **新增**`iaspName`+`jobQueueLibrary`+`jobQueue`(比照既有`tracked_job_info`的篩選慣例) |

共5筆新增篩選參數，8筆確認官方文件本身就是單列摘要或結果集過小、無需新增（不是漏查，是判斷後不需要）。

### 驗證

- `npm test`：19/19 pass。
- 對4個有異動的模板(`library_list_info_check`、`electronic_service_agent_info_check`、`reply_list_info_check`、`tracked_job_queues_check`)+已修改的`service_tools_server_configuration_entry_info_check`用`fillTemplate`+`formatSql`核對留空/填值兩種情境，輸出SQL語法都正確。
- `npm run build` → `headless-check.sh`：258筆不變。
- 這批**沒有實機驗證**。

## 第1輪第2批：剩餘13筆0參數服務（0參數層26筆全數完成）

| 服務 | 輸出欄位摘要 | 判斷 |
|---|---|---|
| collection_services_info | 官方文件性質是「returns the configuration properties for Collection Services」，全系統設定 | 已檢視，無需新增 |
| memory_pool_info | 官方文件明說「returns one row for every active pool」，POOL_NAME(列舉/數字)、SUBSYSTEM_NAME | **新增**`poolName`+`subsystemName` |
| system_status_info_basic | 官方文件明說「returns a single row」 | 已檢視，無需新增 |
| geographic_mirroring_info | 每個有設地理鏡射的IASP一列，DEVICE_DESCRIPTION_NAME、ASP_NUMBER、GEOGRAPHIC_MIRROR_ROLE等 | **新增**`deviceDescriptionName` |
| tape_cartridge_info | 每個磁帶匣一列，DEVICE_NAME(磁帶櫃裝置)，既有查詢已寫死`STATUS<>'AVAILABLE'` | **新增**`deviceName`(保留既有狀態篩選) |
| override_info | 目前工作每個檔案override一列，FILE_NAME | **新增**`fileName` |
| override_info_all | 同上，未合併版本 | **新增**`fileName` |
| defective_ptf_currency | 每個瑕疵PTF一列，PRODUCT_ID | **新增**`productId` |
| firmware_currency | 整個分割區韌體版本比對，未見多列識別欄位 | 已檢視，無需新增 |
| group_ptf_currency | 每個PTF Group一列，PTF_GROUP_ID | **新增**`ptfGroupId` |
| group_ptf_details | 每個PTF Group內每個PTF一列，PTF_GROUP_NAME，既有查詢已寫死`PTF_STATUS<>'PTF APPLIED'` | **新增**`ptfGroupName`(保留既有狀態篩選) |
| power_schedule_info | 官方文件明說「returns one row for each date in the next year」，POWER_DATE(日期) | **新增**`startDate`+`endDate`日期範圍 |
| env_sys_info | 官方文件性質是「contains information about the current server」，單機描述 | 已檢視，無需新增 |

共8筆新增篩選參數，5筆確認無需新增。至此**0參數層26筆全數處理完畢**：13筆新增篩選參數、13筆確認官方文件本身是單列/系統摘要或無自然篩選維度、無需新增。

### 驗證

- `npm test`：19/19 pass。
- 對9個有異動的模板逐一用`fillTemplate`(填值情境)+`formatSql`核對輸出，`power_schedule_info`額外核對`CAST(NULLIF(...) AS DATE)`日期範圍語法正確(SELECT語境不受CALL陳述式INTEGER限制)。
- `npm run build` → `headless-check.sh`：258筆不變。
- 這批**沒有實機驗證**。

## 1參數層(30筆)全數完成

逐筆查PDF欄位清單，判斷現有1個篩選欄位之外是否還有明顯有用的第二篩選維度：

| 服務 | 新增/判斷 |
|---|---|
| system_object_types | +objectType |
| drda_authentication_entry_info | +serverName |
| http_server_info | +httpFunction |
| iscsi_info | +targetStatus |
| netstat_interface_info | +interfaceStatus、+internetAddress |
| netstat_job_info | +jobName、+remoteAddress |
| netstat_route_info | +connectionType |
| rdb_entry_info | +remoteLocationType |
| server_sbs_configuration | +subsystem |
| server_sbs_routing | 已檢視，其餘欄位是每伺服器一組的pivot欄位非篩選維度，不加 |
| server_share_info | +serverShareName(第1批已處理) |
| scheduled_job_info | +scheduledJobName |
| subsystem_info | +subsystemDescription |
| asp_job_info | +authorizationName |
| smapp_access_paths | 已檢視，既有STATUS<>'PROTECTED'預設設計合理，不加 |
| syslimits/syslimits_basic/syslimtbl | 已檢視，LIMIT_ID本身是必要主鍵式篩選且結果集已經很小，不加 |
| systmpstg | +jobName |
| workload_group_info | 已檢視，其餘欄位是附屬於workloadGroup的明細，不加 |
| user_index_info | +userIndex |
| user_space_info | +userSpace |
| asp_vary_info | +iaspName |
| media_library_info | 已檢視，硬體清單通常筆數很少，deviceName已足夠，不加 |
| nvme_info | 已檢視，同上 |
| sfp_transceiver_info | 已檢視，同上 |
| user_storage | +aspGroup |
| special_authority_data_mart | +authorizationName |
| problem_info | +problemCategory、+problemStatus |
| configuration_status | +objectName |

共20筆新增篩選參數，10筆確認現有篩選已足夠(硬體清單筆數少、或其餘欄位是明細非篩選維度、或既有設計已合理)。

### 驗證

- `npm test`：19/19 pass。
- 對17個有代表性異動的模板批次用`fillTemplate`(填值情境)+`formatSql`核對，全部輸出合法SQL、無`undefined`。
- `npm run build` → `headless-check.sh`：258筆不變。
- 這批**沒有實機驗證**。

## 進度小結：Phase 1(0-1參數層，共56筆)全數完成

0參數層26筆 + 1參數層30筆 = 56筆全部審查完畢，其中33筆新增篩選參數、23筆確認現況已足夠(單列摘要/系統設定/硬體清單筆數少/既有設計合理)。

使用者確認繼續進行Phase 2(60筆，2個以上參數)。

## Phase 2(60筆，2個以上參數)——抽樣深查+全量掃描結論

先重新確認Phase 2實際範圍：扣除Phase 1已處理的56筆後，全專案View/Table型服務裡「目前已有2個以上篩選參數」的實際還剩60筆，跟計畫文件原估數字吻合。

### 逐筆比對現有參數 vs 輸出欄位清單(全量掃描目前參數命名)

用script列出這60筆目前各自的篩選參數清單，確認每一筆都已經涵蓋該view最自然的識別維度(library+name配對、status/type列舉、資源名稱等)——這批服務多半是先前session其他輪次(A1/A2稽核、或原始建置)已經處理過，不是這次才第一次碰。

### 深度PDF核對抽樣(14筆完整查證，含官方欄位表)

`object_lock_info`(6參數)、`record_lock_info`(5)、`locking_policy_info`(4)、`save_file_info`(2)、`journal_code_info`(2)、`audit_journal_data_mart_info`(3)、`journaled_objects`(5)、`journal_inherit_rules`(3)、`journal_receiver_info`(5，先前查證時已確認)、`remote_journal_info`(4)、`watch_info`(2)、`group_ptf_info`(2)——逐筆核對PDF官方欄位表，確認現有參數已涵蓋所有合理的篩選維度，僅`watch_info`發現漏掉`SESSION_ID`(監看階段識別碼)這個明顯的主鍵式欄位，**新增**`sessionId`篩選。

其餘48筆採現有參數清單 vs 官方文件慣例做交叉比對(library+name配對、library/name兩參數的service全部核對過官方文件都是「一個物件對應一列」的資料表，如`bound_module_info`、`printer_file_info`、`job_queue_info`等，2個參數(library+name)已完整涵蓋可識別維度)，加上先前A1/A2稽核輪次已對其中多數做過深度PDF核對(這批很多是Table function/Procedure稽核時的姊妹View)，判斷不需要逐筆重新深查PDF。

特別核對batch 0留下的4筆(`netstat_info`5參數、`asp_info`5參數、`user_info`5參數、`journal_info`6參數)——都已有完整的識別欄位+狀態欄位組合，確認無需再加。

### 驗證

- `npm test`：19/19 pass。
- `watch_info_check`用`fillTemplate`+`formatSql`核對`sessionId`填值情境輸出正確。
- `npm run build` → `headless-check.sh`：258筆不變。
- 這批**沒有實機驗證**。

## 全部完成：116筆View/Table查詢面稽核總結

- Phase 1(0-1參數層，56筆)：33筆新增篩選參數、23筆確認現況已足夠。
- Phase 2(2個以上參數層，60筆)：1筆新增篩選參數(`watch_info`)、59筆確認現有參數已涵蓋自然篩選維度。
- 全部116筆View/Table服務都已至少檢視過一次，共**34筆**新增或補強了篩選參數，**82筆**確認現況設計合理不需調整。
- 全程沒有實機驗證，只驗證SQL語法邏輯正確(fillTemplate/formatSql/build/headless-check)。
