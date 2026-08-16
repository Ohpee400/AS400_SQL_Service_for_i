# 知識庫資料結構說明（供團隊擴充維護）

工具的知識庫與 NL 模板是純 JSON 資料，與網頁的呈現/比對邏輯（`src/lib/kbEngine.js`）分離。新增/修正內容不需要改程式碼，只需編輯以下兩個檔案，改完重新 `npm run build` 即可反映到 `outputs/kb.html`：

- `src/data/services.json` — SQL Service 對照表
- `src/data/templates.json` — 自然語言關鍵字 → SQL 模板

## services.json

```json
{
  "meta": {
    "disclaimer": "顯示在網頁下方的免責提醒文字",
    "lastUpdated": "YYYY-MM-DD",
    "maintainedBy": "team"
  },
  "services": [
    {
      "id": "唯一代號，供 info/gen 內部關聯用，建議全小寫+底線",
      "name": "SQL Service 完整名稱，例如 QSYS2.OBJECT_LOCK_INFO",
      "category": "分類，例如 物件鎖定 / 大檔案分析",
      "type": "View / Table function / Scalar function / Table / Procedure，依官方文件的「Type of Service」欄位如實填寫，畫面上取代舊版的已核實/草稿徽章顯示。Procedure這類CALL執行動作，畫面按鈕文字與規格詳情警示文字會自動跟其他類型不同，不需要另外設定",
      "description": "一句話說明用途",
      "minOsVersion": "最低所需 OS 版本，只放版本號本身（如 7.3+）；若該service不屬於PTF追蹤的「IBM i Services」體系（例如基礎Db2目錄視觀表），如實描述查證來源與結論（例如「官方SQL Reference 7.1~7.6各版本文件皆收錄，未提及PTF或版本別限制」），不要塞解釋文字之外的臆測版本號",
      "ptfTable": "結構化的PTF對照表，見下方「PTF資訊呈現方式」說明。這是唯一支援的PTF呈現格式",
      "verified": true,
      "docSearchHint": "查證依據：搜尋到的官方文件位置(rzajqpdf.pdf頁碼 或 IBM Docs網址)，供之後複查",
      "exampleSql": "一段範例 SQL（或 Procedure 的 CALL 範例）"
    }
  ]
}
```

**`verified` 必須為 `true` 才能收錄進這個knowledge base，不存在「草稿先上架、之後再補核實」這個狀態。** 查不到官方依據的service直接不收錄，不要用 `verified: false` 暫時放進 `services.json`（畫面上也已經沒有顯示核實狀態的徽章，因為收錄本身就代表已核實）。`ptfInfo`/`versionNotes` 這兩個舊欄位已停用，`scripts/build-kb-html.js` 不會再讀取，新增資料一律只用 `ptfTable`。

### PTF資訊呈現方式：`ptfTable`（已驗證資料優先使用）

```json
"ptfTable": [
  { "version": "7.6", "base": true, "enhanced": "SF99960 Level 3" },
  { "version": "7.5", "base": true, "enhanced": "SF99950 Level 3/4/5/8/12" },
  { "version": "7.4", "base": true, "enhanced": "" },
  { "version": "7.3", "base": false, "enhanced": "最低需SF99703 Level 7才能使用" }
]
```

- 一個版本一個物件，`version` 是版本號、`base` 是該版本是否為原生內建(Base)功能、`enhanced` 是額外的強化PTF編號說明。
- **官方文件查不到某個版本的資料，`enhanced` 就填空字串 `""`，畫面上該欄位直接留空，不要塞「原文如此」「未列出」這類替代說明文字進去**——這是這個schema存在的主要原因，不要違反。
- `base: false` 代表這個版本不是原生內建、需要額外PTF才能使用（例如 `ASP_INFO` 的7.3），畫面上會用不同樣式標示，這種情況`enhanced`欄位可以簡短說明最低需求的PTF。
- 查不到某個service的PTF/版本資料來源時，這筆**不收錄**，不要用空的 `ptfTable` 或臆測資料湊數。

新增一筆 Service 時：
1. `id` 不可與現有重複，`gen` 的模板會用它來關聯（`templates.json` 的 `serviceId`）。
2. 依「全部核實」規則（見 `plans/2026-08-14-final-implementation-plan.md`「零」節、跨對話記憶 `project-full-verification-required`），查證管道依序：① `outputs/webfetch/rzajqpdf.pdf` 全文搜尋 → ② `outputs/webfetch/ibm-i-services-sql.html`（只有Type/PTF，無欄位定義）→ ③ `WebFetch` 抓 IBM 官方文件網站（`https://www.ibm.com/docs/en/i/`）即時內容 → ④ 失敗就照 `scrapling-user` skill 的guarded流程（先誠實`get`，需要JS渲染就自動升級`fetch`）。全部查不到才視為無法收錄。
3. 新增時同時盤點「查詢面過窄」（見 `project-query-surface-checklist-in-plans` 記憶）：SELECT類（View/Table function/Scalar function/Table）的每個輸出欄位是否都對應到可篩選的表單參數。

## templates.json

```json
[
  {
    "id": "模板唯一代號",
    "serviceId": "對應 services.json 裡的 service id",
    "description": "這個情境的一句話描述，多個模板比對命中時會顯示給使用者選",
    "matchKeywords": ["使用者輸入中可能出現的關鍵字，任一命中即比對成功"],
    "extract": {
      "pattern": "選填，正規表達式，用來直接從描述文字擷取參數",
      "groups": ["依序對應 pattern 中的擷取群組要填入哪個 param name"]
    },
    "params": [
      {
        "name": "參數名稱，需與 sqlTemplate 中的 {參數名稱} 對應",
        "prompt": "表單欄位顯示的標籤文字",
        "required": true,
        "default": "選填，網頁表單會預先帶入這個值，使用者可直接修改",
        "upper": "選填，true 表示代入SQL前自動轉大寫（IBM i的物件/工作/使用者名稱等識別字通常是全大寫存放，比對時區分大小寫）。不確定該不該轉就先不加，經實測確認大小寫不影響結果的欄位（例如IFS路徑）不要加",
        "advanced": "選填，true 表示這個欄位在表單裡預設收在「進階選項」摺疊區，不佔用常駐版面；沒有這個key就是常駐顯示",
        "type": "選填，預設是純文字輸入(text)；設成 datetime-local 會改用瀏覽器原生日期時間選擇器，送出時會自動轉成 'YYYY-MM-DD HH:mm:00' 格式再代入SQL"
      }
    ],
    "sqlTemplate": "SQL 語句樣板，用 {參數名稱} 標記要代換的位置"
  }
]
```

新增一組模板時：
1. `matchKeywords` 盡量涵蓋團隊實際會打的字（含中英文、口語說法）。
2. 若情境有固定格式可直接從輸入文字擷取（例如 `LIB/OBJ`），用 `extract` 減少使用者要手動填的欄位；否則省略 `extract`，所有 `params` 都會顯示在表單裡讓使用者填（若有 `default` 會先帶入）。
3. `sqlTemplate` 裡的每個 `{xxx}` 都必須對應到 `params` 裡的一個 `name`，否則代換不到會直接留在輸出的 SQL 裡。
4. **選填篩選欄位（留空=不篩選）的寫法，依欄位型態分兩種Pattern，兩種都不能讓「留空」這個狀態去真的比對資料庫裡的欄位值**（這點很重要，見下方「為什麼不能直接比對真實欄位」）：

   **Pattern A（文字/字串類欄位）**：`default` 設成空字串 `""`，`sqlTemplate` 寫 `(欄位 = '{參數}' OR '{參數}' = '')`。OR右邊比較的是「參數字串跟空字串」，完全不碰資料庫欄位。
   - 若欄位本身是數值型態但只是拿來做字串式的精確比對（如埠號），要先用 `CHAR(欄位)` 轉成字串再比對，例如 `(CHAR(LOCAL_PORT) = '{localPort}' OR '{localPort}' = '')`，否則留空時會產生 `LOCAL_PORT = ` 這種語法錯誤。

   **Pattern C（數值/時間運算式類欄位，例如門檻值、相對天數、絕對時間點）**：這類參數留空時無法直接比對空字串（`CURRENT_TIMESTAMP - DAYS` 這種算式留空會直接語法錯誤），所以做法是「幫這個模板自己定義一個代表『不篩選』的固定預設值，OR右邊去比對『代入後的參數』是不是等於這個固定值本身」，藉此完全繞開真實欄位：
   ```
   (DAYS_UNTIL_PASSWORD_EXPIRES <= {daysUntilExpire} OR '{daysUntilExpire}' = '999999')
   (PREVIOUS_SIGNON < CURRENT_TIMESTAMP - {daysSinceLastSignon} DAYS OR '{daysSinceLastSignon}' = '0')
   ```
   `daysUntilExpire`／`daysSinceLastSignon` 的 `default` 要跟OR右邊寫死的字串完全一致（`999999`／`0`），這樣「使用者沒填」時OR右邊恆真，繞開對真實欄位的比對。
   - 若參數的值本身就是一段SQL運算式而不是單純數字（例如 `type: "datetime-local"` 產生的 `TIMESTAMP('...')`），不能再幫它加引號比對字串（會產生巢狀引號語法錯誤），改成直接比對「代入後的運算式」是否等於一個SQL關鍵字：
   ```
   (CREATE_TIMESTAMP < {createdBefore} OR {createdBefore} = CURRENT_TIMESTAMP)
   ```
   `createdBefore` 的 `default` 直接是字面文字 `CURRENT_TIMESTAMP`（不加引號的SQL關鍵字），使用者若真的選了時間，前端會把值轉成 `TIMESTAMP('...')` 完整運算式再代入，這時候 `{createdBefore} = CURRENT_TIMESTAMP` 幾乎不可能為真（時間精準到微秒才會相等），自然會落到左邊的真實比對。

   **Pattern B（需要部分比對的欄位，例如IP位址想查整個網段）**：把 `=` 改成 `LIKE '%{參數}%'`，其餘跟Pattern A一樣（`default`空字串、OR右邊比對空字串），例如 `netstat_check` 的 `localAddress`/`remoteAddress`：
   ```
   (LOCAL_ADDRESS LIKE '%{localAddress}%' OR '{localAddress}' = '')
   ```
   只有明確有「輸入部分內容找一批相關資料」這種使用情境時才用LIKE，預設還是用Pattern A的完全比對(`=`)，不要不必要地把所有文字欄位都改成LIKE。

5. **為什麼不能直接比對真實欄位（NULL排除問題，實際發生過的bug）**：如果選填欄位的「不篩選」狀態是直接寫 `DAYS_UNTIL_PASSWORD_EXPIRES <= 999999` 這種比對真實欄位的算式，一旦這個欄位在資料庫裡是NULL（IBM i上很常見，例如密碼設定永不到期、帳號從未登入過），SQL的 `NULL <= 999999` 結果是UNKNOWN，該列會被整條排除——如果大部分/全部資料剛好是NULL，會導致「不篩選」變成「查出0筆」，看起來完全不像有在運作。Pattern A/C 都刻意讓「不篩選」狀態的比較**完全不去看真實欄位**，就是為了避開這個問題。
6. **新增篩選欄位前，要去官方文件查證這個欄位是否標註「Nullable」**（`rzajqpdf.pdf` 的欄位說明表通常會寫「Nullable」或「Contains the null value if...」）。查不到來源、無法確認nullable與否的欄位（例如 `SYSTABLESTAT` 這種不在官方Services PTF對照表收錄範圍的service），一律當作「可能為NULL」處理，套用Pattern C防護，不要假設安全。
7. **離線的Node測試腳本測不出NULL排除這類bug**——只能驗證「產生的SQL語法/代換邏輯符合預期」，沒辦法知道某個欄位在實際資料上是不是全部NULL。新增/修改「留空=不篩選」語意的篩選欄位後，若有真實系統可測，建議用完全不填任何欄位的狀態實際查一次，確認回傳筆數不是無緣無故的0筆。
8. **不要對語法本身還沒核實過的service擴充篩選欄位**，先確認語法正確（見上面第2點的查證流程）再擴充，避免疊加在錯誤的SQL骨架上。

## SQL 複製格式化（`KBEngine.formatSql`）

`src/lib/kbEngine.js` 的 `formatSql(sql)` 會在畫面顯示與複製時，把 `sqlTemplate` 代換完的單行SQL字串加上換行：在 `FROM`/`WHERE`/`AND`/`OR`/`ORDER BY`/`GROUP BY` 前、以及頂層(不在括號內)的逗號後插入換行，同時用括號深度與是否在單引號字串內兩個狀態，避免拆散 `(COL = '{x}' OR '{x}' = '')` 這種OR trick寫法、也避免誤判字串常值裡剛好包含關鍵字的情況。新增/修改 `sqlTemplate` 後不需要額外處理格式化，`scripts/build-kb-html.js` 的產生按鈕跟複製按鈕都會自動套用；如果對某個新樣式的SQL結果格式化起來不符合預期，補一條 `tests/unit/kbEngine.test.js` 的 `formatSql` 測試案例即可重現/回歸驗證。

## 驗證修改

改完 JSON 後執行：

```bash
npm test
npm run build
```

確認沒有 JSON 語法錯誤、測試通過，再重新開啟 `outputs/kb.html` 手動確認新增/修改的內容顯示正確。
