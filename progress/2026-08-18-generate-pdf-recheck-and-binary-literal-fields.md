# GENERATE_PDF複查(非bug) + 3個binary literal參數修復（執行記錄）

對應todo清單第1、2項（`GENERATE_PDF`引號複查、binary literal參數）。

## 本輪動作範圍

允許修改：`src/data/templates.json`(`clear_tracked_job_info_call`、`change_user_space_attributes_call`、`create_user_space_call`)、`outputs/kb.html`(僅透過`npm run build`)。
唯讀複查：`generate_pdf_call`（結論是不用改）。

## 本次怎麼做

1. **`GENERATE_PDF`複查**：重新核對`services.json`確認`type`是`Scalar function`(用`VALUES`呼叫，不是`CALL`陳述式)，且`spooledFileNumber`本來就要支援`*LAST`特殊字串值(預設值也是`"*LAST"`)。今天稽核`END_JOBS`發現的「CALL陳述式數值參數不接受運算式」限制，只在Procedure的`CALL`陳述式成立，不適用於`VALUES`呼叫的Scalar function；而且`'{spooledFileNumber}'`用引號包成字串是對的寫法(跟已實機驗證成功的`MAXIMUM_JOBLOG_ENTRIES => '*SAME'`同一種「數字或特殊字串混合」模式)。**結論：這不是bug，之前的判斷是錯的，不需要修改。**
2. `clear_tracked_job_info_call`新增`internalJobIdentifier`(BINARY(16)，要求使用者直接輸入完整`BX'...'`字面值)、`routingStep`(整數，只有搭配`internalJobIdentifier`才有意義)，用`[paramName:...]`條件式子句省略語法。
3. `change_user_space_attributes_call`、`create_user_space_call`各自新增`initialValue`(1 byte binary，`BX'...'`格式，同樣的條件式省略語法)。

## 結果

- `npm test`：19/19 pass。
- 對3個模板逐一用`fillTemplate`+`formatSql`核對「留空」「填BX'...'字面值」兩種情境，確認：
  - 留空時該參數完全不出現在SQL裡。
  - 填值時`BX'...'`字面值原樣嵌入(不加額外引號，因為使用者輸入的就是完整字面值語法)。
- `npm run build` → `headless-check.sh`：258筆不變。
- **這3個模板尚未經使用者實機驗證**，binary literal的實際格式正確性(尤其`INTERNAL_JOB_IDENTIFIER`需要搭配`node-name`、且不能同時指定`job-queue-library`/`job-queue`的交叉限制)只有文件提示、沒有強制驗證。
