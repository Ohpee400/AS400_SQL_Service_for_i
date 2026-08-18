# 115筆Table function/Procedure全面參數稽核（執行記錄）

對應計畫：[[2026-08-18-full-param-audit-table-function-procedure]]

## 已知限制

- 自動化初篩用正則抓PDF簽章區塊，版面不規則一定會有誤判，候選清單只是「值得看」不是「確認有問題」，每筆都要人工複核dump出來的原文才能列入修復清單。
- 本輪範圍到「初篩+回報候選規模」為止，逐筆修復要看過規模後再確認。

## 本輪動作範圍

唯讀分析：`src/data/services.json`、`src/data/templates.json`、`outputs/webfetch/rzajqpdf.pdf`。
一次性腳本寫在scratchpad，不進版控。
不寫回`src/data/*.json`（除非使用者看過候選清單後確認要修）。

## 本次計畫怎麼做

1. 寫node腳本：讀115筆Table function/Procedure的`docSearchHint`頁碼，`pdftotext -layout`逐一dump，正則抓參數簽章區塊的`PARAM_NAME =>`清單，跟`templates.json`模板`sqlTemplate`裡的具名參數做差集。
2. 輸出候選清單（服務id、疑似缺漏參數、頁碼、原文片段路徑）。
3. 回報規模給使用者。

## 結果（第一輪：初篩+8筆IGNORE_ERRORS批次修復）

### 初篩結果

用`pdftotext -layout`+正則對115筆Table function/Procedure做自動化初篩：
- 92筆可用本機PDF頁碼查證，7筆需另外WebFetch（本機PDF查無此頁），16筆自動抽取失敗需人工重查頁碼。
- 92筆中初篩抓到54個候選，人工複查發現其中**11筆是假陽性**（單一參數、官方用positional呼叫語法已經有帶值，我的正則只認`NAME =>`具名語法所以誤判）——用`CVE_INFO`實際查PDF確認：官方Example本身就是`CVE_INFO()`空括號呼叫(該參數有預設值=目前系統版本)，我們的模板寫法完全正確，不是bug。
- 修正後**真候選43筆**：8筆單缺`IGNORE_ERRORS`、19筆缺2-3個參數、12筆缺4個以上（最大`CHANGE_USER_PROFILE`缺12個、`DISPLAY_JOURNAL`缺11個）。
- 完整初篩結果存在scratchpad的`audit-results.json`（未進版控，一次性稽核產物）。

### 已修復：8筆單缺IGNORE_ERRORS

逐筆重新用`pdftotext -layout`dump PDF原文確認**IGNORE_ERRORS的預設值不是統一的**（跟先前假設「都跟SPOOLED_FILE_DATA一樣預設YES」不同，這次證實要逐筆查證是對的）：

| service | 頁碼 | 官方預設值 |
|---|---|---|
| job_lock_info | 1176-1179 | YES |
| library_info | 905-908 | YES |
| program_resolved_activations | 531-534 | YES |
| stack_info | 548-553 | YES |
| hardware_resource_info | 644-650 | YES |
| data_area_info | 472-473 | **NO** |
| get_job_info | 1153-1155 | **NO**（參數名是`V_IGNORE_ERRORS`，跟`V_JOB_NAME`同一套V_前綴命名） |
| remove_tracked_job_queue | 1209-1210 | **NO** |

修改`src/data/templates.json`8筆模板，各自加上`ignoreErrors`進階選填參數(`advanced:true`)，`options`陣列依專案慣例把預設值排在第一個。

### 驗證

- `npm test`：16/16 pass。
- 直接呼叫`fillTemplate({})`（全部留空用預設值）確認8筆輸出SQL，逐一核對`IGNORE_ERRORS`/`V_IGNORE_ERRORS`的值符合上表（YES的5筆輸出YES、NO的3筆輸出NO），全部正確。
- `npm run build` → `headless-check.sh`：258筆不變。

## 結果（第二輪：19筆缺2-3個參數批次）

### 逐筆PDF人工複核（19筆全部重新dump PDF原文核對，非自動化結果直接採信）

發現自動初篩在這個batch有**更嚴重的假陽性問題**：初篩正則只認`NAME =>`具名語法，完全抓不到positional呼叫。逐筆核對後：

- **完全假陽性(2筆，不用修)**：`object_privileges`（3個參數全部已用positional傳入）、`set_pase_shell_info`（2個參數全部已用positional傳入）。
- **部分假陽性(2筆，只修真的缺的部分)**：`group_ptf_currency_local`（PATH_NAME已用positional傳入，只有`LAST_CHANGED`真的缺）、`ptf_cover_letter`（PTF_ID已用positional傳入，只有`IGNORE_ERRORS`真的缺）。
- **真候選15筆全部修復**：`save_file_objects`、`history_log_info`、`activation_group_info`、`clear_tracked_job_info`(部分)、`prestart_job_statistics`、`tracked_job_info`、`change_user_space_attributes`(部分)、`remove_user_index_entry`、`change_disk_paths`、`compare_ifs`、`ifs_read`、`ifs_write`、`delete_old_spooled_files`、`ended_job_info`、`delete_old_journal_receivers`。

### 刻意延後的部分（binary literal型參數，本輪不修）

- `clear_tracked_job_info`的`INTERNAL_JOB_IDENTIFIER`(BINARY(16)，要用`BX'...'`字面值)+`ROUTING_STEP`(這兩者官方文件寫明互相依存，且都要求`node-name`一起指定)——本輪只加了`NODE_NAME`。
- `change_user_space_attributes`的`INITIAL_VALUE`(1 byte binary，`BX'00'`格式)。
- 原因：`kbEngine.fillTemplate`目前只有字串代換機制，現有專案裡也沒有處理binary字面值的既有慣例可以直接套用，需要另外設計欄位型別/UI輸入方式，不適合在這輪順手加，避免用猜的規則硬套。

### 沿用/新確認的既有慣例

- `NULLIF('{param}', '')`：留空時明確傳NULL給該具名參數，取代「省略該參數」（因為模板引擎不支援條件式省略整個具名參數子句）——這個模式**不是我這輪新發明的**，在`tracked_job_info`/`clear_tracked_job_info`等既有模板裡本來就在用，這次只是沿用同一慣例補到新加的欄位上。
- `type: "datetime-local"`：時間戳記類參數的既有UI慣例(`history_log_info`已用過)，這次沿用到`ended_job_info`、`group_ptf_currency_local`。
- 數值型參數（如`maxRemove`、`eofDelay`、`fileCcsid`）維持不加引號直接嵌入SQL，呼應這次(a)批次修`SPOOLED_FILE_DATA`時發現的「數值參數不該被字串引號包住」的教訓。

### 驗證

- `npm test`：16/16 pass。
- 對全部17筆有異動的模板逐一呼叫`fillTemplate`（留空optional情境），輸出SQL全部語法正確；另外針對`change_disk_paths`、`remove_user_index_entry`(BETWEEN情境)、`ifs_write`、`change_user_space_attributes`額外測試「填值」情境，確認NULLIF/數值代換都正確。
- `npm run build` → `headless-check.sh`：258筆不變。

## 結果（第三輪：12筆缺4個以上參數批次）

### 逐筆PDF人工複核

- **完全假陽性(2筆，不用修)**：`associate_journal_receiver`（4個參數全部已用positional傳入，且順序跟PDF簽章完全一致）、`send_message`（7個參數全部已用positional傳入，順序也一致）——都有實際比對PDF原文裡的Example驗證順序，不只是猜。
- **真候選10筆全部修復**：`display_journal`(11個，最大最複雜的一筆，含`STARTING_SEQUENCE`/`ENDING_SEQUENCE`跟時間戳記互斥、`EOF_DELAY`跟`GENERATE_SYSLOG`/`ORDER BY`互斥等多重限制，都寫進prompt提示但不做強制驗證)、`change_service_tools_server`(6個)、`set_server_sbs_routing`(8個，多數欄位"僅限authorizationName=*ALL時可用"的限制也寫進提示)、`joblog_info`(4個，同時把原本的positional呼叫改成具名)、`job_info`(4個)、`create_user_index`(9個)、`create_user_space`(7個，`INITIAL_VALUE`是binary literal不修)、`end_jobs`(7個)、`ping`(6個，同時把原本的positional呼叫改成具名)、`change_user_profile`(12個，全專案這次稽核最大的一筆，逐一核對CHGUSRPRF對應語意)。

### 額外發現：`END_JOBS`模板既有的`endOption`欄位選項值疑似是錯的（本輪未修，僅記錄）

查`END_JOBS`官方文件時發現：模板既有的`endOption`參數選項是`["*CNTRLD", "*IMMED"]`，但PDF原文(第1147-1150頁)寫的合法值其實是`CONTROLLED`/`IMMEDIATE`（沒有星號、拼全名，這是SQL程序參數值不是CL指令縮寫）。這不是這次稽核範圍內的「缺參數」問題，是既有欄位的**選項值本身可能是錯的**，不同性質的bug，這輪沒有動，記錄下來留給你決定要不要另外處理。

### 驗證

- `npm test`：16/16 pass。
- 對10筆有異動的模板逐一呼叫`fillTemplate`（必填給DUMMY、留空optional）確認輸出SQL語法正確，包含最大的`change_user_profile`(15個參數)、`display_journal`(21個參數)都核對過。
- `npm run build` → `headless-check.sh`：258筆不變。

## 結果（第四輪：修復END_JOBS的endOption選項值錯誤）

使用者要求立即處理第三輪意外發現的bug。重新核對`$TEMP/b3_endjobs.txt`(第1147-1150頁dump)原文確認：`end-option`合法值是`CONTROLLED`(官方預設)/`IMMEDIATE`，不帶星號、拼全名，官方Example也是這樣寫(`END_OPTION => 'CONTROLLED'`)。

`src/data/templates.json`的`end_jobs_call`：
- `endOption`欄位的`default`從`"*CNTRLD"`改成`"CONTROLLED"`，`options`從`["*CNTRLD", "*IMMED"]`改成`["CONTROLLED", "IMMEDIATE"]`。
- 連帶把上一輪自己寫的`endControlledDelay`欄位prompt文字裡殘留的`*CNTRLD`/`*IMMED`也一併改成正確用詞。
- 檢查`services.json`的`exampleSql`欄位，確認是用`{endOption}`佔位符沒有寫死錯誤值，不需要跟著改。

驗證：`npm test`(16/16)→直接呼叫`fillTemplate`分別測留空(得CONTROLLED)、填IMMEDIATE兩種情境，輸出SQL都正確→`npm run build`→`headless-check.sh`確認258筆不變。

## 結果（第五輪：修復數值型參數用錯誤的NULLIF字串包裝方式，系統性bug）

使用者實測`END_JOBS`時，改對`JOB_NAME_FILTER`後truncation錯誤消失，但換成新錯誤：`SQLSTATE 22023 / SQL0802「Data conversion or data mapping error」`。

### 根本原因

比對完整SQL陳述式後定位到`JOB_END_MAXIMUM => NULLIF('{jobEndMaximum}', '')`——`JOB_END_MAXIMUM`官方文件是INTEGER類型參數，但我在第三輪加這個欄位時用了字串型的`NULLIF('{x}', '')`包裝(這個模式原本只適合真正的VARCHAR/CHAR參數)，`NULLIF('','')`的靜態型別是CHAR，指派給INTEGER參數槽位時Db2需要做隱含轉換，空字串`''`轉INTEGER會失敗，就是這次的SQL0802。

`SPOOLED_FILE_DATA`(第一輪)當初就是為了同一個問題才改用`CASE WHEN...THEN NULL...ELSE CAST(...AS INTEGER) END`的寫法，但第二、三輪新增其他數值型參數時没有全部套用同一個模式，造成同一類bug散落在多個模板。

### 全面排查+修復

用正則掃過整份`templates.json`抓出所有`NULLIF('{x}', '')`的用法，逐一核對哪些是今天新增、且官方文件標明INTEGER/DECIMAL型別的參數，抓到6個模板共10處：
- `display_journal_check`：`STARTING_SEQUENCE`、`ENDING_SEQUENCE`(DECIMAL(21,0))、`COMMIT_CYCLE`(DECIMAL(21,0))
- `set_server_sbs_routing_call`：`PREFIX_LENGTH`、`SERVER_POSITION`(INTEGER)
- `change_user_space_attributes_call`：`SIZE`(**這個是既有代碼，不是今天新增的，但同一種bug**)、`TRANSFER_SIZE`(INTEGER)
- `create_user_index_call`：`MAXIMUM_ENTRY_LENGTH`(INTEGER)
- `ifs_read_check`：`MAXIMUM_LINE_LENGTH`(INTEGER)
- `end_jobs_call`：`JOB_END_MAXIMUM`(INTEGER，使用者實測失敗的那個)

全部改成`CASE WHEN '{x}' = '' THEN NULL ELSE CAST('{x}' AS INTEGER/DECIMAL(21,0)) END`模式。

### 驗證

- `npm test`：16/16 pass。
- 針對這6筆逐一用`fillTemplate`測「留空」跟「填值」兩種情境，確認`CASE WHEN`語法在兩種情境都輸出正確：留空時整段是`CASE WHEN '' = '' THEN NULL ELSE CAST('' AS INTEGER) END`(會拿到NULL)，填值時是`CASE WHEN '500' = '' THEN NULL ELSE CAST('500' AS INTEGER) END`(會拿到500)。
- `npm run build` → `headless-check.sh`：258筆不變。
- **無法實際連線IBM i系統驗證**，這是目前查證手段的邊界——只能核對SQL語法邏輯正確，實際執行結果要請使用者協助驗證。

## 結果（第六輪：連續2次修正失敗後觸發停損，改用HTML官方文件交叉核對+找到真正根本原因）

依全域規則第8條，連續2次修正(`JOB_END_MAXIMUM`用CASE/CAST、`MAXIMUM_JOBLOG_ENTRIES`改裸整數)都沒解決同一個SQL0802錯誤後，已停止繼續猜測並寫入`agent_logs/errors.md`回報。使用者說明無法用DSPJOBLOG(用的是ACS的SQL Script功能)、也不想每個模板都手動排除測試。

### 改用官方HTML文件交叉核對

直接`WebFetch`抓`ibm.com/docs`回傳403，改用`scrapling-user`skill的分級流程：`get --no-stealthy-headers`一樣403，自動升級到`fetch`(瀏覽器渲染)成功取得`END_JOBS procedure`官方頁面(存在`outputs/webfetch/end_jobs_procedure.md`)。核對結果：**PDF文件的參數型別判讀原本就是對的**，`MAXIMUM_JOBLOG_ENTRIES`(整數或*NOMAX/*SAME)、`JOB_END_MAXIMUM`(整數)的描述跟先前查證一致——排除了「文件判讀錯誤」這個假設。

### 真正根本原因：CASE WHEN...CAST(常數)寫法本身有問題

重新檢視自己寫的修法`CASE WHEN '{x}' = '' THEN NULL ELSE CAST('{x}' AS INTEGER) END`：懷疑`CAST('' AS INTEGER)`這段即使邏輯上在ELSE分支不會被執行到，但因為是純常數字面值運算式(不含變數)，Db2在**準備階段的靜態型別檢查**很可能就會先驗證這段CAST合不合法，不受CASE條件保護。**這代表第一輪`SPOOLED_FILE_DATA`開始、往後所有用這個`CASE WHEN`模式改的數值型參數，都可能有同一個風險，但因為沒有實機測試，一直沒被發現。**

### 修正方向：改用`CAST(NULLIF('{x}', '') AS INTEGER)`

讓`NULLIF`先把空字串轉成NULL，`CAST`實際上轉換的是NULL(任何型別轉NULL都合法)，不會寫死一段「常數空字串轉INTEGER」的運算式。已套用到`end_jobs_call`的`JOB_END_MAXIMUM`。

### 驗證

- `npm test`：16/16 pass。
- `fillTemplate`確認輸出`JOB_END_MAXIMUM => CAST(NULLIF('', '') AS INTEGER)`語法正確。
- `npm run build` → `headless-check.sh`：258筆不變。
- **尚未經使用者實機驗證**——這次先只改`end_jobs`一處，等使用者確認這個新寫法真的解決問題後，才會決定要不要把同一個修法套用到其他今天改過、可能有同樣風險的模板(`display_journal`的3個DECIMAL欄位、`set_server_sbs_routing`的2個INTEGER欄位、`change_user_space_attributes`的2個INTEGER欄位、`create_user_index`的1個、`ifs_read`的1個)。

## 結果（第七輪：透過排除法確認真正根本原因，問題解決）

用bisection排除法（先測官方最精簡範例確認環境正常→逐步加回參數縮小範圍→單獨測`JOB_END_MAXIMUM => 2000`純數字字面值）確認：**真正根本原因是IBM i Db2的CALL陳述式對INTEGER型參數的型別解析比SELECT/TABLE FUNCTION嚴格，不接受CAST/NULLIF/CASE這類運算式，只接受裸字面值**。詳細診斷過程與證據見`agent_logs/errors.md`的`[2026-08-18-3]`條目。

修復：把`end_jobs_call`、`set_server_sbs_routing_call`、`change_user_space_attributes_call`、`create_user_index_call`共5處數值欄位，從CAST/CASE運算式改成裸字面值代換（留空代換`NULL`關鍵字、填值代換該數字本身），跟專案既有`display_journal`時間戳記欄位的模式一致。

驗證：`npm test`(16/16)、`fillTemplate`留空/填值情境核對輸出、`build`+`headless-check`確認258筆不變。`end_jobs`已經使用者實機確認成功；其餘4處是同一套手法套用到同類風險欄位，尚未逐一實機重測。

**待辦**：`display_journal`(3個DECIMAL欄位)、`ifs_read`(1個)使用的是TABLE FUNCTION(在SELECT裡)而非CALL陳述式，理論上不受這次發現的CALL陳述式限制影響，暫不確定是否也要一併檢查——這點需要使用者後續實測驗證後才能定論，目前先不動。

### 未完成（留給下一批次）

- `services.json`的`exampleSql`/`docSearchHint`這8+15+10=33筆**沒有**同步更新（純文件debt，不影響功能，因為已確認`exampleSql`不在UI渲染路徑上）。
- binary literal型參數，需要另外設計欄位型別才能加，全部刻意跳過：`clear_tracked_job_info`的`INTERNAL_JOB_IDENTIFIER`/`ROUTING_STEP`、`change_user_space_attributes`的`INITIAL_VALUE`、`create_user_space`的`INITIAL_VALUE`。
- `END_JOBS`模板既有`endOption`欄位選項值疑似錯誤(`*CNTRLD`/`*IMMED`應為`CONTROLLED`/`IMMEDIATE`)，本輪只記錄未修。
- 16筆抽取失敗需人工查頁、7筆需WebFetch，尚未處理，待下一輪排程。43筆真候選(115筆稽核範圍內)已全數處理完畢(8+19+10=實際修復37筆+6筆完全/部分假陽性確認不用修)。

