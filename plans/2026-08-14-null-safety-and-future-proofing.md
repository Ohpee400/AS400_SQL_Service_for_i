# NULL安全性修復 + 未來擴充防呆計畫

最後更新：2026-08-14。起因：使用者實測 `USER_INFO` 查詢回傳0筆，經診斷SQL確認根本原因，並要求提出「這整類問題」的預防計畫（不只這次的timestamp/NULL問題），供之後擴充到更多service時參考。**這是計畫文件，尚未動手實作，等待使用者確認後才進入實作階段。**

## 一、已確認的bug（使用者提供實測資料佐證）

使用者跑了 `SELECT AUTHORIZATION_NAME, DAYS_UNTIL_PASSWORD_EXPIRES, PREVIOUS_SIGNON FROM QSYS2.USER_INFO`，結果：
- `DAYS_UNTIL_PASSWORD_EXPIRES`：**目前看到的每一筆都是NULL**（畫面顯示`-`）
- `PREVIOUS_SIGNON`：多數有值，但 `DMCLUSTER`、`ICA` 這兩筆是NULL

`user_info_check` 模板目前的SQL：
```sql
... AND DAYS_UNTIL_PASSWORD_EXPIRES <= {daysUntilExpire} AND PREVIOUS_SIGNON < CURRENT_TIMESTAMP - {daysSinceLastSignon} DAYS ...
```
這兩個條件都是**直接跟真實欄位比較**。SQL裡 `NULL <= 數字` 或 `NULL < 時間` 的結果是UNKNOWN，該列會被整條排除。這台系統的 `DAYS_UNTIL_PASSWORD_EXPIRES` 全部是NULL，所以不管門檻設多寬鬆，這個條件永遠濾掉所有列，這就是回傳0筆的直接原因。

### 為什麼這跟文字類的選填篩選（OR trick）不一樣

文字類選填篩選 `(STATUS = '{status}' OR '{status}' = '')` 留空時，OR右邊比的是**參數字串跟自己**，完全不去看資料庫欄位的實際值，所以天生不受NULL影響。但 `daysUntilExpire`／`daysSinceLastSignon` 這種數值/時間類參數，因為要避開「留空時運算式語法斷裂」的問題（`CURRENT_TIMESTAMP - DAYS` 這種寫法不合法），我當時改用「安全預設值」（999999天／0天）取代OR trick——但這個寫法**還是會真的去比對資料庫欄位**，所以繼承了NULL被排除的風險，這是我當時沒想清楚的地方。

## 二、立即修復項目

### 2.1 `user_info_check` 的兩個數值/時間篩選改用「哨兵值自我比對」寫法

沿用OR trick的精神，但比較對象從「空字串」改成「該欄位的預設哨兵值」，讓「使用者沒動這個欄位」時完全繞過真實欄位比對：

```sql
AND (DAYS_UNTIL_PASSWORD_EXPIRES <= {daysUntilExpire} OR '{daysUntilExpire}' = '999999')
AND (PREVIOUS_SIGNON < CURRENT_TIMESTAMP - {daysSinceLastSignon} DAYS OR '{daysSinceLastSignon}' = '0')
```
- 使用者沒填（維持預設值999999／0）時，OR右邊比對參數字串跟寫死的預設值文字，恆真，完全不看NULL不NULL。
- 使用者真的填了門檻（例如「7天內到期」），才會去比對真實欄位，這時候NULL被排除是合理的（一個永不到期的帳號本來就不該出現在「7天內到期」的報表裡）。

### 2.2 盤點其餘9個模板裡，同樣「用安全預設值取代OR trick」的地方

逐一檢查是否有類似風險：

| 模板 | 欄位 | 風險評估 |
|---|---|---|
| `large_table_check` | `DATA_SIZE > {minSizeMb} * 1024 * 1024`（預設'0'） | **無法確認**——`SYSTABLESTAT` 不在 `rzajqpdf.pdf` 收錄範圍內（這份service本來就缺乏權威資料來源，見 `outstanding-tasks.md` 第3項），查不到 `DATA_SIZE` 是否可為NULL。保守起見比照2.1同樣手法加防護，不管有沒有實際發生都先擋掉這個風險。 |
| `output_queue_check` | `CREATE_TIMESTAMP < {createdBefore}`（預設`CURRENT_TIMESTAMP`） | PDF裡沒有明確標註 `CREATE_TIMESTAMP` 是否nullable，但緩衝檔的建立時間是系統自動產生的欄位，NULL的可能性直覺上很低。標記為低風險但**未實測驗證**，先比照做同樣防護（成本很低，不做也沒有壞處）。 |
| `large_ifs_check` | `DATA_SIZE > {minSizeMb} * 1024 * 1024`（預設'100'） | 這個預設值100MB是**刻意設計的篩選門檻**，不是「不篩選」的語意，不適用這個修復模式，維持現狀。 |
| 其餘模板（`object_lock_check`／`journal_check`／`netstat_check`／`asp_check`／`active_job_check`） | 選填篩選都是文字類OR trick或IBM API本身支援留空=全部，沒有這類風險 | 不用改 |

## 三、一般化：往後新增/擴充service時的防呆守則（寫進 `docs/data-schema.md`）

1. **任何要做成「留空=不篩選」的參數，一律不能讓參數直接裸接在跟真實欄位比較的運算式裡**，必須用下面兩種模式之一：
   - **Pattern A（文字/字串類欄位）**：`(欄位 = '{參數}' OR '{參數}' = '')`
   - **Pattern C（數值/時間運算式類欄位）**：`(欄位 比較 {參數運算式} OR '{參數}' = '<寫死的預設值文字>')`——OR右邊拿參數字串去比對「這個模板自己定義的預設值文字」，不是比對空字串（因為空字串會讓運算式語法斷裂，這是先前就發現的另一個問題）。
2. **新增篩選欄位前，要查證該欄位在官方文件裡是否標註「Nullable」**——`rzajqpdf.pdf` 的欄位說明表通常會明確寫「Nullable」或「Contains the null value if...」，這是判斷要不要套用Pattern C的依據，不要假設欄位一定有值。
3. **查不到欄位nullable與否的service（例如 `SYSTABLESTAT` 不在官方PDF收錄範圍），一律當作「可能為NULL」處理**，套用防護寫法，不要因為查不到就假設安全。
4. **離線驗證（Node腳本測字串代換）測不出這類bug**——這是這次事件的關鍵教訓。`scratchpad/verify_kb*.js` 這類腳本只能確認「產生的SQL語法/代換邏輯符合預期」，沒辦法知道「某個欄位在實際資料上是不是全部NULL」，這是純離線測試的天花板，不是我可以在沒有真實系統的情況下自己抓出來的bug類型。
5. **新增/擴充涉及「留空=不篩選」語意的篩選欄位時，若有可連線的真實系統，建議至少用預設值（完全不填任何欄位）實際跑一次，確認回傳筆數不是無緣無故的0筆**——這個步驟沒辦法由我自己完成（我沒有系統連線權限），需要使用者協助跑一次baseline查詢。這條會補進「修改交付檔案前」的checklist，但執行上還是要靠使用者配合，如果沒有系統可測，至少要在 `verified` 欄位/PTF說明裡誠實註記「NULL安全性未經實機驗證」。

## 四、其他「未來可能發生的種種」——由這次事件延伸出的其他風險類別盤點

除了NULL排除問題，回顧這幾輪一起犯過/可能犯的錯誤類型，整理成一份checklist，供之後新增service時對照：

| 風險類別 | 具體例子（已發生過的） | 預防方式 |
|---|---|---|
| 大小寫/資料格式假設沒實測 | `datetime-local` 欄位精度被瀏覽器行為影響（上上輪的bug） | 涉及瀏覽器原生元件行為的假設，要嘛實際測過，要嘛保守處理（例如這次改用不預填怪異哨兵值的方式） |
| 列舉值不完整 | `netstat_check.state`／`output_queue_check.status` 一開始只讀了一半PDF內容就列成下拉選項 | 下拉選單化前，比照這次的做法完整讀完PDF的欄位列舉段落，讀到「換下一個欄位定義」才算讀完 |
| NULL值排除（這次事件） | `user_info_check` 的兩個數值/時間篩選 | 見上方第三節Pattern A/C |
| 欄位存在但語意誤解（曾經發生過的例子） | `SYSTEM_STATUS_INFO` 原本以為是table function，查證後其實是View | 任何欄位/型態/語法都要以查證結果為準，不用既有訓練知識的記憶頂替 |
| 未查證資料源的service | `SYSTABLESTAT`／`IFS_OBJECT_STATISTICS` 參數簽名 | 這兩筆維持`verified:false`，且不因為「順手」而幫它們擴充更多篩選欄位（這點先前已經是既定原則，維持） |

## 五、順帶的UI文字清理

大小寫已經是系統自動處理、不需要使用者操心的內建行為，`build-kb-html.js` 的 `createFieldRow()` 裡「大小寫皆可輸入，系統會自動轉為大寫再查詢」這行提示文字**拿掉**，不用逐欄位提醒。

## 驗證方式

1. `npm test` + `npm run build`
2. `scratchpad/verify_kb*.js` 系列腳本補上第二節裡每個模板「預設狀態下（完全不給參數）」的斷言，確認生成的SQL在OR trick的兩側都是**不觸及真實欄位**的純字串/文字比對（這樣才能真正防住NULL問題，不是只測「SQL長得對不對」）。
3. **請使用者協助**：`user_info_check`／`large_table_check`／`output_queue_check` 這三個改完後，麻煩比照這次的方式，各自用「完全不填任何欄位」的狀態產生SQL，拿去SQL client實際跑一次，確認不再是anomalous的0筆（如果本來就該是0筆——例如系統裡真的沒有任何列印佇列資料——也麻煩告知，避免我誤判修復是否成功）。
