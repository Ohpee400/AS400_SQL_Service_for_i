# kbEngine支援「參數留空時整段子句省略」，修復JOB_END_MAXIMUM的SQL0802（真正根本修法）

最後更新：2026-08-18。這份計畫是`end_jobs`那次連環debug最後定案的**真正根本修法**，取代先前「直接拿掉欄位」的治標方案（使用者明確要求不要治標）。

## 問題

`SYSTOOLS.END_JOBS`的`JOB_END_MAXIMUM`參數（Procedure/CALL陳述式的具名參數，INTEGER型別）：
- 已用bisection排除法**實機證實**：只要傳NULL(不論用`CAST`/`NULLIF`/`CASE`運算式或裸`NULL`關鍵字)一律報`SQL0802 Data conversion error`；只有給真正的數字字面值才會成功。
- 官方文件說「留空(不寫這個參數)=不限制」，但這個行為只在**完全不出現在CALL陳述式裡**時成立，傳明確的NULL不算數。
- `kbEngine.fillTemplate`目前只有單純字串替換，沒辦法「這個參數留空時，連同`, JOB_END_MAXIMUM => ...`這一整段都從SQL裡消失」。

之前的暫時處理（直接把`jobEndMaximum`從模板`params`跟`sqlTemplate`裡刪掉，不提供這個欄位）已被使用者否決：官方文件明明存在這個有用的參數，用「乾脆不給選」迴避問題不是真正解法。

## 修復方向：擴充`kbEngine.fillTemplate`支援條件式子句省略

### 新語法

`sqlTemplate`裡可以用`[paramName:任意文字，可包含{paramName}等既有placeholder]`包住一段文字。`fillTemplate`在既有的逐參數字串替換**之前**，先跑一個pre-pass：
- 用正規表示式掃出所有`[paramName:...]`區塊。
- 檢查`paramValues[paramName]`是否為空（沿用現有`getMissingParams`同一套「未定義或空字串」判斷邏輯，**不**套用該參數的`default`——因為這個語法的意義就是「使用者真的沒填，就整段不要」，如果連default都拿來判斷，會跟「有預設值所以永遠不算空」的既有邏輯衝突）。
  - 若為空：整個`[paramName:...]`(含中括號)替換成空字串。
  - 若非空：替換成中括號**內**的文字(中括號本身拿掉，內部的`{paramName}`留給後面既有的逐參數替換迴圈處理)。
- Pre-pass跑完之後，照原本邏輯繼續跑逐參數替換(這樣區塊內殘留的`{paramName}`才會被換成實際值)。

### 用法範例(`end_jobs`)

```
"sqlTemplate": "CALL SYSTOOLS.END_JOBS(... MAXIMUM_JOBLOG_ENTRIES => '{maximumJoblogEntries}'[jobEndMaximum:, JOB_END_MAXIMUM => {jobEndMaximum}], JOB_END_ITERATION_COUNT => {jobEndIterationCount} ...)"
```
- `jobEndMaximum`留空 → 整個`[jobEndMaximum:...]`消失 → `MAXIMUM_JOBLOG_ENTRIES => '*SAME', JOB_END_ITERATION_COUNT => 100`（乾淨，沒有多餘逗號，也沒有NULL字樣）。
- `jobEndMaximum`填`2000` → `MAXIMUM_JOBLOG_ENTRIES => '*SAME', JOB_END_MAXIMUM => 2000, JOB_END_ITERATION_COUNT => 100`。

**逗號放在中括號內側、緊接在參數名稱前面**：這樣不管這段是在CALL參數列的中間還是最後一個，省略後前一個參數都能正確接上後一個參數(或直接收尾)，不會產生`,,`或懸空逗號。

### `jobEndMaximum`欄位定義調整
- 拿掉`"default": "NULL"`(不需要了，留空直接整段省略，不用假裝有個NULL預設值)。
- prompt維持「最多結束幾個工作，留空=不限制(官方預設)」，這次是真的做到「留空=官方預設的不限制行為」，不是文字上寫著預設卻實際傳NULL失敗。

## 查詢面/欄位盤點

本次是修復既有模板的技術缺陷(參數留空無法正確產生SQL)，不涉及新增查詢欄位或篩選參數，不需要查詢面欄位盤點。

## 風險與測試計畫

- **改動範圍**：`src/lib/kbEngine.js`的`fillTemplate`函式（共用引擎，258個service的模板都靠它），以及`src/data/templates.json`的`end_jobs_call`模板。
- **回歸風險**：新的pre-pass regex只匹配`[paramName:...]`這個新語法，目前258筆模板裡**沒有任何一筆**用到`[`或`]`字元(已用腳本掃過確認)，不會誤傷既有模板的輸出。
- **測試計畫**：
  1. `tests/unit/`裡新增針對這個新語法的單元測試（留空時整段省略、填值時正確代換、中間位置跟最後位置各測一次），沿用現有`node --test`架構。
  2. `npm test`確認16筆既有測試+新增測試全部通過。
  3. 對`end_jobs_call`用`fillTemplate`直接測「留空」「填2000」兩種情境，人工核對輸出SQL字串正確。
  4. `npm run build` → `headless-check.sh`確認258筆不變。
  5. **請使用者實機測試**：留空跟填實際數字兩種情境都在ACS執行一次，確認`JOB_END_MAXIMUM`留空時SQL裡完全不出現這個參數、執行成功；填數字時參數正確帶入、執行成功。這是這一整輪debug第一次要驗證「新語法本身」而不是「NULL的各種寫法」，理論上應該一次到位，但因為前面已經連續失敗4次，這次驗證會格外謹慎確認。

## 本輪動作範圍

允許修改：`src/lib/kbEngine.js`、`src/data/templates.json`(`end_jobs_call`)、`tests/unit/*.test.js`(新增測試)、`outputs/kb.html`(僅透過`npm run build`重新產生)。
不修改：其他257筆service的模板(除非這次驗證成功、使用者要求把同一招套用到`set_server_sbs_routing`/`change_user_space_attributes`/`create_user_index`那4個同樣風險未驗證的欄位——那是下一輪的事，這輪先把`end_jobs`一筆做到底、實機驗證過)。
