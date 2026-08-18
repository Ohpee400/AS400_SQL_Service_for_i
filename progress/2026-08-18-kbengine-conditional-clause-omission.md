# kbEngine支援條件式子句省略，修復JOB_END_MAXIMUM（執行記錄）

對應計畫：[[2026-08-18-kbengine-conditional-clause-omission]]

## 已知限制

- 新語法`[paramName:...]`目前只有`end_jobs_call`一筆在用，其他257筆模板不受影響（已用腳本掃過確認`[`/`]`字元原本沒被任何模板使用）。
- `set_server_sbs_routing`/`change_user_space_attributes`/`create_user_index`那4個同樣風險未驗證的欄位，這輪先不動，等`end_jobs`這筆經使用者實機驗證成功後再決定要不要套用同一招。

## 本輪動作範圍

允許修改：`src/lib/kbEngine.js`（新增`stripConditionalClauses`函式，`fillTemplate`呼叫它）、`src/data/templates.json`(`end_jobs_call`)、`src/data/services.json`(`end_jobs`的`docSearchHint`)、`tests/unit/kbEngine.test.js`(新增測試)、`outputs/kb.html`(僅透過`npm run build`)。

## 本次計畫怎麼做

1. `kbEngine.js`的`fillTemplate`前面加一個pre-pass：正則掃`[paramName:文字]`，該參數的`paramValues[name]`未定義或空字串(不看default)時整段替換成空字串，否則替換成中括號內文字(內部`{paramName}`留給後面既有的逐參數迴圈處理)。
2. `end_jobs_call`的`jobEndMaximum`：拿掉先前的`"default": "NULL"`(改回`""`)，`sqlTemplate`裡把`JOB_END_MAXIMUM => {jobEndMaximum}`包成`[jobEndMaximum:, JOB_END_MAXIMUM => {jobEndMaximum}]`。
3. `services.json`的`end_jobs`的`docSearchHint`更新，記錄這次的根本修法跟debug過程連結。
4. `tests/unit/kbEngine.test.js`新增一則測試，驗證留空時整段消失、填值時正確代換。

## 結果

- `npm test`：17/17 pass(含新增的1則測試)。
- 直接`fillTemplate`核對`end_jobs_call`輸出：
  - 留空：`...MAXIMUM_JOBLOG_ENTRIES => '*SAME', JOB_END_ITERATION_COUNT => 100...`（`JOB_END_MAXIMUM`完全不出現，沒有NULL字樣）——跟使用者實機測試成功過的「4參數+3個裸整數，不含JOB_END_MAXIMUM」那個版本語法一致。
  - 填`2000`：`...JOB_END_MAXIMUM => 2000...`——跟使用者實機測試成功過的「JOB_END_MAXIMUM => 2000純字面值」那個版本語法一致。
- `npm run build`→`headless-check.sh`：258筆不變。
- 確認`outputs/kb.html`裡`stripConditionalClauses`函式跟新版`end_jobs`模板都已正確內嵌build進去。
- **待使用者實機驗證**：這是這輪debug第一次驗證「新語法本身」，理論上應該成功（產生的SQL字串跟兩個已實機驗證成功的版本逐字相同），但因為前面已經連續失敗4次，還是要請使用者實際跑一次確認才能真正收尾。

## 後續：使用者實機測試留空情境成功，但發現新的功能性bug

使用者測試「留空jobEndMaximum」情境：**SQL執行成功(回覆碼=0)，SQL0802問題徹底解決**。但發現`CALL`執行成功卻沒有真的結束目標工作——用WRKACTJOB確認工作`A`(CLARK/BCH)仍在執行中。

### 根本原因

`CURRENT_USER_LIST_FILTER => NULLIF('clark', '')`——使用者輸入小寫`clark`，但IBM i使用者描述檔實際儲存/比對是大寫`CLARK`，篩選條件比對不到任何工作，導致`END_JOBS`找不到符合條件的工作可結束(但這不是錯誤，是「查無符合條件的工作」，所以SQL執行本身仍回報成功)。

`src/data/templates.json`的`end_jobs_call`模板裡，`currentUserListFilter`跟`subsystemListFilter`兩個欄位（今天稽核新增）忘記加`"upper": true`，導致使用者輸入沒有被自動轉大寫。

### 一併稽核今天新增的其他約40個欄位有沒有同樣疏漏

逐一比對今天(第一輪到第四輪)新增的所有params，確認：
- 絕大多數系統識別碼類欄位(節點名稱、ASP名稱、程式名稱、群組描述檔、Library名稱等)當初都已正確加上`upper: true`。
- 只有`currentUserListFilter`、`subsystemListFilter`這兩個漏加，是唯二的真實bug，已修復。
- 額外發現`maximumJoblogEntries`（接受數字或`*NOMAX`/`*SAME`特殊值）沒加`upper`，數字輸入不受影響但特殊值若使用者手動輸入小寫會比對失敗，屬於低風險邊界情況，順手一併加上`upper: true`防禦。
- `indexAttribute`/`objectAttribute`（`create_user_index`/`create_user_space`）官方文件明說系統會自動折成大寫("will be folded to uppercase")，不加`upper`不算功能性bug，維持原樣。
- `serverName`(`change_service_tools_server`)、`interfaceId`、`virtualLanId`等屬於網路顯示標籤/十六進位值，文件沒有明確要求大寫，且`hostWwpn`/`remoteWwpn`官方範例本身就是小寫十六進位，維持原樣不強加`upper`。

### 修復與驗證

`src/data/templates.json`：`currentUserListFilter`、`subsystemListFilter`、`maximumJoblogEntries`三個欄位加上`"upper": true`。
`npm test`(17/17)→直接`fillTemplate`確認`clark`輸入被正確轉成`CURRENT_USER_LIST_FILTER => NULLIF('CLARK', '')`→`npm run build`→`headless-check.sh`確認258筆不變。

## 後續：套用已驗證解法到其餘5個「裸NULL未驗證」欄位

使用者確認`end_jobs`修復成功後，接著問「其他地方會不會有一樣的問題」。盤點今天用`"default": "NULL"`裸關鍵字寫法、但還沒被使用者實機驗證過的欄位，找到5個(3個模板)：
- `set_server_sbs_routing_call`：`prefixLength`、`serverPosition`
- `change_user_space_attributes_call`：`size`、`transferSize`
- `create_user_index_call`：`maximumEntryLength`

（`create_user_space_call`的`size`/`transferSize`不在風險名單內：`size`是必填欄位、`transferSize`預設值是`"0"`不是空字串，兩者都不會走到「留空」這條路徑。）

全部改用`end_jobs`已實機驗證成功的`[paramName:...]`條件式子句省略語法，`params`裡的`"default": "NULL"`改回`""`(不再需要假裝有NULL預設值)。

驗證：`npm test`(17/17)→對3個模板逐一測「留空」「填值」兩種情境，確認輸出SQL在留空時該參數完全不出現、填值時正確帶入，沒有多餘逗號或殘留語法→`npm run build`→`headless-check.sh`確認258筆不變。**這3個模板尚未經使用者實機驗證**，但因為套用的是同一套已被證實有效的手法，風險已大幅降低。
