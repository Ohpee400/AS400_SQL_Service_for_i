# 全面稽核CALL陳述式NULL風險 + 複製SQL多行排版優化

最後更新：2026-08-18。對應使用者提出的3件事：(1)其他地方會不會有跟`end_jobs`一樣的問題(含忘記轉大寫、NULL的問題) (2)複製SQL不要呈現一條很長的字串，所有類型都要 (3)這是要給真實使用者/客戶用的，要非常謹慎。這份計畫涵蓋(1)的CALL陳述式NULL風險部分（大小寫已在上一輪處理完，掃描後確認沒有真的漏掉的）跟(2)。

## 已查明的現況（唯讀掃描結果，非猜測）

### CALL陳述式數值型參數用NULLIF/CAST運算式風險（跟`end_jobs`同一類）

用腳本掃描全部258筆模板，篩「type=Procedure」+「sqlTemplate用CALL開頭」+「具名參數用NULLIF/CAST/CASE包住」的組合，抓到候選後逐一核對官方文件確認真正的參數型別（不是只信賴自動掃描結果），找到**9處真候選，分佈在5個模板，全部是這次稽核之前就存在的舊模板（不是今天新增的）**：

| 模板 | 參數 | 型別依據 |
|---|---|---|
| `add_iscsi_target_call` | `TARGET_PORT` | 官方文件「An integer value (1-65535)」 |
| `change_iscsi_target_call` | `TARGET_PORT` | 同上 |
| `remove_iscsi_target_call` | `TARGET_PORT` | 同上 |
| `change_objectconnect_call` | `MINIMUM_JOBS`、`MAXIMUM_JOBS` | `OBJECTCONNECT_INFO`view對應欄位`MIN_JOBS`/`MAX_JOBS`皆為INTEGER |
| `change_objectconnect_call` | `INACTIVE_TIME` | 對應欄位`INACT_TIME`為INTEGER |
| `change_objectconnect_call` | `SEND_BUFFER`、`RECEIVE_BUFFER` | 對應欄位`SND_BUF`/`RCV_BUF`為INTEGER |
| `add_tracked_job_queue_call` | `JOB_RETENTION_PERIOD` | 官方文件「保留分鐘數」為整數 |

排除的假陽性：`change_service_tools_server_call`的`IP_VERSION`（自動掃描因為欄位名稱含"VERSION"誤判，實際是`BOTH`/`IPV4`/`IPV6`字串enum，不是數值，不需要修）。

### 大小寫風險

上一輪已掃描全部258筆的識別碼類欄位，22個候選逐一核對後**沒有真的漏掉的**（都是數值/日期欄位誤判，或iSCSI的IQN名稱、CHAP密碼本來就該區分大小寫，維持不轉大寫才是對的）。這部分不需要再動作。

## 修復方向A：套用`end_jobs`已驗證的條件式子句省略語法

把上述9處全部改用`[paramName:...]`語法（跟`end_jobs`同一套已被使用者實機驗證成功的手法），params的`default`維持`""`不變(這5個模板本來就是`""`，不是`end_jobs`那種曾經誤用過`"NULL"`字面值的狀況)。

## 修復方向B：`formatSql`支援任意深度的具名參數多行排版

### 問題

`kbEngine.js`的`formatSql()`目前只在**最外層(depth=0)**的逗號/`FROM`/`WHERE`/`AND`/`OR`等關鍵字前換行。但`CALL procedure(...)`或`SELECT ... FROM TABLE(func(...))`這類寫法，所有具名參數都包在至少一層括號裡(depth≥1)，完全不會被換行——這是為什麼`END_JOBS`那種10個參數的CALL陳述式，複製出來是一整條很長的字串。這個限制**影響所有258個服務**，不是只有CALL陳述式，`SELECT * FROM TABLE(...)`這種table function呼叫一樣受影響。

### 修法

在`formatSql`裡，逗號換行的判斷從「只看depth===0」，改成「depth===0，或者這個逗號後面接的是『具名參數』寫法(`NAME => `)」。這樣可以精準只在「這是一個具名參數列表」的地方換行，不會誤傷`CAST(x AS DECIMAL(21,0))`這種型別宣告裡的逗號，或`SUBSTR(x,1,5)`這種簡短純位置參數呼叫。換行縮排依括號深度遞增(每層多兩格)，讓巢狀呼叫(如`TABLE(func(...))`)看得出層次。

具體改動：
```
// 原本：if (depth === 0) { if (ch === ',') { ... 固定縮排2格 ... } }
// 改成：
if (ch === ',') {
  const rest = sql.slice(i + 1);
  const isNamedArg = /^\s*[A-Za-z_][A-Za-z0-9_]*\s*=>/.test(rest);
  if (depth === 0 || isNamedArg) {
    // depth===0維持原本固定2格縮排(既有行為不變)；
    // depth>=1且是具名參數逗號，縮排依深度遞增
    ...
    continue;
  }
}
```
`depth===0`的既有行為(固定2格縮排)完全不變，只是新增`depth>=1`時的具名參數判斷分支，不影響任何既有測試案例的預期輸出(已核對過：既有兩則`formatSql`測試案例裡巢狀括號內都沒有逗號，不受影響)。

## 查詢面/欄位盤點

本次是修復既有模板技術缺陷跟排版邏輯，不涉及新增查詢欄位或篩選參數，不需要查詢面欄位盤點。

## 核實狀態

修復方向A的9處，型別依據都來自先前已查證過的官方文件內容(OBJECTCONNECT_INFO view欄位定義、ADD_ISCSI_TARGET等procedure的參數說明)，不是本輪重新查證，是沿用既有查證結果。

## 風險與測試計畫

- **改動範圍**：`src/lib/kbEngine.js`(`formatSql`)、`src/data/templates.json`(5個模板)。
- **回歸風險**：
  - `formatSql`的改動只新增`depth>=1`+「後面接`NAME =>`」的判斷分支，`depth===0`既有邏輯完全不動，理論上不影響任何既有測試。
  - 條件式子句省略語法沿用`end_jobs`已驗證過的機制本身沒變，只是套用到新的5個模板，正則解析邏輯不用再改。
- **測試計畫**：
  1. `npm test`：確認17則既有測試(含`fillTemplate`跟`formatSql`的既有案例)全部維持通過，不因為這次改動而回歸。
  2. 新增至少2則`formatSql`單元測試：(a)CALL陳述式多個具名參數應該逐一換行且縮排正確 (b)`CAST(x AS DECIMAL(21,0))`這種型別宣告裡的逗號不應該被換行。
  3. 對這9處異動的模板逐一用`fillTemplate`+`formatSql`核對「留空」「填值」兩種情境下的輸出，確認語法正確、排版可讀。
  4. `npm run build` → `headless-check.sh`確認258筆不變 → 額外截圖確認`產生SQL`/`產生CALL指令`按鈕跑出來的排版變化。
  5. 這9處套用的是`end_jobs`同一套已驗證手法，修復方式一致。

## 本輪動作範圍

允許修改：`src/lib/kbEngine.js`、`src/data/templates.json`(上述5個模板)、`tests/unit/kbEngine.test.js`(新增測試)、`outputs/kb.html`(僅透過`npm run build`)。
不修改：`change_service_tools_server_call`的`IP_VERSION`(已確認是假陽性)，以及其他253筆本次掃描沒有命中風險的模板。
