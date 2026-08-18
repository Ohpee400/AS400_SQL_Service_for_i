# 116筆View/Table「查詢面過窄」稽核計畫

對應todo清單B（先前排序中優先度最低，使用者現在要求跟A5一起處理；A5已確認exampleSql非bug、整個跳過，故本檔案只涵蓋B）。

## 問題

`services.json`裡`type`為`View`或`Table`的服務共116筆，這些服務沒有官方「參數簽章」可核對（不像Table function/Procedure），可篩選的WHERE條件完全是我們自己在`templates.json`決定要開放哪些欄位。今天用唯讀script普查`templates.json`目前每筆的篩選參數數量：

| 篩選參數數量 | 筆數 |
|---|---|
| 0個（模板是`SELECT * FROM view`，完全沒有WHERE可調） | 26 |
| 1個 | 30 |
| 2個以上 | 60 |

0個跟1個參數的56筆是最值得檢視「是否漏掉明顯有用的篩選欄位」的對象——但**參數少不等於一定有問題**，例如`SYSTEM_STATUS_INFO`、`ENV_SYS_INFO`這類回傳單一列系統摘要的view，本來就沒有自然的篩選維度，不能看到0個參數就當成bug硬塞欄位。

## 已知限制

- 跟Table function/Procedure稽核不同，這裡沒有「官方簽章」當作絕對標準可以拿來做差集比對，每一筆都要看官方文件的欄位清單(Column Name/Data Type/Description表格)，人工判斷哪些欄位是「合理的篩選維度」——這是主觀判斷不是客觀缺口，比對過程比A1/A2慢。
- 5筆View的`docSearchHint`本來就記錄著缺PDF頁碼的問題（`system_status_info`、`journal_info`、`user_info`、`netstat_info`、`asp_info`，先前A1稽核時特意留給B處理），這批會先修頁碼記錄再往下審查。
- 60筆「2個以上參數」的服務優先度較低，先做完56筆的第一輪後再視時間決定要不要做第二輪。

## 判斷原則（每筆審查時套用）

1. 找到官方文件的欄位清單（PDF頁碼查`docSearchHint`，查無頁碼的用`scrapling-user`skill的get→fetch流程）。
2. 列出「輸出欄位 vs 目前可篩選參數」對照表（每筆審查記錄都要附，呼應先前建立的稽核慣例）。
3. 只在下列情況才新增篩選參數，不是每個欄位都要開放篩選：
   - 明顯的識別欄位（*_NAME、*_LIBRARY等）且該view單次可能回傳多列（不是摘要單列）。
   - 狀態/類型欄位且官方文件本身列出有限的列舉值（適合做成`options`下拉選單）。
   - 官方文件Example章節本身就示範了用該欄位做WHERE條件（代表官方認定這是常見查詢方式）。
4. 沿用既有UX慣例：字串類LIKE萬用字元模糊比對(`'%{x}%'`)、識別碼類精確比對+`upper:true`、列舉類`options`下拉、留空條件用`OR '{x}' = ''`模式（View/Table走SELECT語境，不受CALL陳述式那條INTEGER限制，數值篩選可以用`CAST(NULLIF(...))`）。
5. 單列摘要類view（如`ENV_SYS_INFO`）如果確認沒有合理篩選維度，明確記錄「已檢視，無需新增」，不要略過不寫。

## 執行方式

比照A1/A2稽核的分批模式，每批處理後跑`npm test`+`fillTemplate`/`formatSql`人工核對+`npm run build`+`headless-check.sh`，並在`progress/`留執行記錄。

- **第0批**：修正5筆已知docSearchHint頁碼記錄問題。
- **第1輪（56筆，0-1個參數，最高優先）**：分成約5批、每批10-12筆，逐批人工查PDF/webfetch+判斷+修改+驗證。
- **第2輪（60筆，2個以上參數，較低優先）**：第1輪全部做完後再評估要不要做、怎麼分批。

## 本次不做

- 不改動Table function/Procedure（已在A1/A2完成）。
- 不觸碰`exampleSql`欄位（A5已確認跳過）。
- 不做實機驗證（比照今天的A1/A2批次，SQL語法層面驗證為主，實機驗證需使用者協助）。
