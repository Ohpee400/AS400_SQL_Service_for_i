# 剩餘7筆需WebFetch服務的參數稽核（執行記錄）

對應todo清單A2（7筆PDF查無此頁、需改用官方網頁查證）。延續同一份稽核任務（[plans/2026-08-18-full-param-audit-table-function-procedure.md](../plans/2026-08-18-full-param-audit-table-function-procedure.md)已核准的方法論），非新計畫，僅在此記錄本批次的執行過程。

## 本輪動作範圍

唯讀查證（已取得的7份官方文件markdown，透過scrapling get→fetch抓取，存放於session暫存目錄）+ 允許修改：`src/data/templates.json`。

服務清單：`change_totp_key`、`ekm_info`、`kerberos_keytab_entries`、`program_resolved_imports`、`add_service_tools_server_configuration_entry`、`change_service_tools_server_configuration_entry`、`remove_service_tools_server_configuration_entry`。

## 查證結果

逐一比對官方文件參數簽章 vs `templates.json`現有欄位：

| 服務 | 結果 |
|---|---|
| `change_totp_key` | 官方僅1參數(key)，現有模板已完整，無缺口 |
| `ekm_info` | 官方僅1參數(path-name)，現有模板已完整，無缺口 |
| `kerberos_keytab_entries` | 官方2參數(key-table-path, principal-name)，現有模板已完整，無缺口 |
| `program_resolved_imports` | **缺`IGNORE_ERRORS`**(官方預設YES) |
| `add_service_tools_server_configuration_entry` | **缺`INTERFACE_ID`**(選填，8-byte字元字串，官方預設X'0000000000000000') |
| `change_service_tools_server_configuration_entry` | **缺`RESOURCE_NAME`、`VIRTUAL_LAN_ID`、`INTERFACE_ID`**共3個 |
| `remove_service_tools_server_configuration_entry` | 官方僅1參數(partition-uuid)，現有模板已完整，無缺口 |

## 本次怎麼做

- `program_resolved_imports`：比照同批次`stack_info`/`program_resolved_activations`已用過的`IGNORE_ERRORS`(YES/NO選項，預設YES，advanced)慣例補上。
- `add_service_tools_server_configuration_entry`：補`interfaceId`欄位，選填、advanced，套用X'...'十六進位字面值格式(非BX'...'，因官方範例用的是`X'0000000000000000'`，8 byte字元字串)，留空時整段子句省略(套用今天新增的`[paramName:...]`條件式語法，因為此procedure的其他必填為binary partitionUuid，語境已是CALL statement)。
- `change_service_tools_server_configuration_entry`：補`resourceName`(留空不變更，upper)、`virtualLanId`、`interfaceId`(同上X'...'格式、留空不變更)，比照`change_service_tools_server`已有的同名欄位慣例。

## 額外發現並修復：VIRTUAL_LAN_ID / INTERFACE_ID 系統性問題

比對過程中，透過補抓的`SERVICE_TOOLS_SERVER_CONFIGURATION_ENTRY_INFO` view官方文件（scrapling get→fetch取得）確認：
- `VIRTUAL_LAN_ID`實際型別是**INTEGER**——這跟先前`END_JOBS`的`JOB_END_MAXIMUM`是同一類bug：CALL statement對INTEGER參數若用`NULLIF('{x}', '')`會觸發SQL0802。舊有3處(`add_service_tools_server_configuration_entry_call`、`change_service_tools_server_call`、剛新增的`change_service_tools_server_configuration_entry_call`)全部用了這個不安全寫法，已全部改用今天建立的`[paramName:...]`條件式子句省略語法。
- `INTERFACE_ID`實際型別是**BINARY(8)**，但`change_service_tools_server_call`既有的寫法是`NULLIF('{interfaceId}', '')`(當作一般字串加引號)——型別不符，已改為要求使用者直接輸入完整`X'...'`十六進位字面值(比照`add_service_tools_server_configuration_entry_call`新增的`interfaceId`欄位寫法)。

這證實了使用者稍早提出的疑慮「其他模板會不會有同樣的NULL/型別問題」——這次是在稽核不相關服務時意外發現的，不在原訂稽核範圍內，但屬於同一類系統性風險所以一併修復。

## 驗證

- `npm test`：19/19 pass（含「optional params留空時每個模板都要產生合法SQL」的全模板掃描測試）。
- 對6個模板（含這次修改的全部3個STSCE procedure + program_resolved_imports）用`fillTemplate`+`formatSql`分別核對「全留空」與「全填值」兩種情境，確認：VIRTUAL_LAN_ID/INTERFACE_ID留空時整段子句消失、有填值時輸出裸字面值(不加引號、不用NULLIF包裹)。
- `npm run build` → `headless-check.sh`：258筆不變。
- 這批全部**沒有實機驗證**。

## 結果

7筆WebFetch批次全部處理完畢：3筆無缺口、4筆有缺口已修復（1筆缺IGNORE_ERRORS、1筆缺INTERFACE_ID、1筆缺RESOURCE_NAME+VIRTUAL_LAN_ID+INTERFACE_ID共3個）。另外意外發現並修復3處既有的VIRTUAL_LAN_ID(INTEGER誤用NULLIF)、1處INTERFACE_ID(BINARY(8)誤用字串引號)系統性問題。至此A1(16筆)+A2(7筆)共23筆稽核全部完成。
