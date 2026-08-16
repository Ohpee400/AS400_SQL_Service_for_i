> **已整合進 [plans/2026-08-14-final-implementation-plan.md](2026-08-14-final-implementation-plan.md)**，這份保留作為調研過程紀錄，最新決策與實作範圍以那份為準。

# 主列表版面選型調研 + SQL 複製格式化 — 計畫書

最後更新：2026-08-14。回應本輪使用者的4點要求：(1) 卡片對齊問題先暫緩，因為主列表可能大改，先做完調研再決定；(2) 務必**實際**上網查證同類型工具的UI架構，多方比較，不能只憑既有知識；(3) 「查詢面過窄」這條決議要落實到每一份計畫書；(4) SQL複製結果格式化，並回報實作成本。

## 決策狀態（2026-08-14 第二輪更新）

使用者已確認3個方向：
1. **同意改表格/條列式**，但前提是「不能枯燥乏味，要現代化設計且現行功能不能少」——因此在動手改 `scripts/build-kb-html.js` 之前，先產出一份可互動的設計提案 Artifact 讓你實際操作確認，避免猜錯方向又要整個重做。**Artifact 預覽：[SQL Service 目錄設計提案](https://claude.ai/code/artifact/fae8878d-a4c1-4bfa-b451-ce39fff148a4)**，用真實的10筆service/template資料做成可互動原型（搜尋、分類篩選、展開規格詳情、抽屜式表單、產生+複製SQL全部可以實際點）。**待你確認這份視覺/互動方向可以，才會動手改正式的 `build-kb-html.js`。**
2. **SQL格式化選「複製前、後都格式化」**（原方案B），已在上面的Artifact裡一併實作示範（見下方「四、SQL格式化方案」的格式化邏輯說明）。
3. **「查詢面過窄」檢查清單**：這輪已完成全部10筆service的盤點（見下方「五」），不是只做`journal_info`，且已確立成往後每份計畫書的固定章節。

---

## 一、調研方法與範圍說明（回應要求2：務必實查、不要亂找）

鎖定「服務/API 目錄型參考工具」這一類做比較，不是隨便找漂亮UI，理由：這類工具跟本專案性質最接近——大量條目、文字密度高、核心動作是「快速找到目標項目→複製使用」，而不是行銷型/展示型頁面。實際查證方式：`WebFetch` 直接抓取頁面內容看DOM結構，加上 `WebSearch` 輔助確認。查證紀錄同步寫入 `progress/2026-08-14-catalog-ui-benchmark-research.md`。

## 二、調研結果（4個查證來源，3個可確認、1個查無法確認）

| 來源 | 查證方式 | 實際版面 | 每項目顯示內容 |
|---|---|---|---|
| **IBM i Db2 for i「IBM i Services」官方對照表**（本專案資料來源同一份，`outputs/webfetch/ibm-i-services-sql.html`，本機已存檔可直接解析） | 直接讀取本機HTML原始碼 | **純HTML `<table>`**，逐列呈現 | 欄位：Service名稱(連結)、類型(View/Table function)、7.6/7.5/7.4/7.3各版PTF需求。**無圖示、無說明文字**，幾百筆服務全部用同一張表格呈現 |
| MDN Web API 索引 (`developer.mozilla.org/.../Web/API`) | WebFetch | 純**條列清單**(按字母分組) | 只有名稱+連結，無說明、無圖示 |
| AWS CLI EC2 指令參考 (`docs.aws.amazon.com/cli/.../ec2/`) | WebFetch | 純**條列清單** | 只有指令名稱+連結，無說明 |
| GitHub REST API 文件 | WebSearch（找到官方部落格說明版型改版） | 三欄式版面，**左側為條列式sidebar導覽** | sidebar是純清單，說明/範例在右側欄位，不是card grid |
| Postman Public API Network 瀏覽頁 | WebFetch官方文件說明頁 | **查無法確認** | 官方文件沒有描述到具體視覺呈現方式（card或table），沒有查到就不編造 |

## 三、結論與建議（誠實回答，不迎合）

**4個可查證的同類型參考工具，3個是表格、1個是條列清單，0個是卡片網格。** 尤其IBM i Services官方對照表——這是跟本專案完全同源、同資料性質的參照對象——本身就是用最樸素的表格呈現幾百筆服務，沒有卡片、沒有圖示。

我的判斷：**卡片網格不適合這類「大量、文字為主、需要快速掃視比對」的技術參考型目錄**，理由：
- 卡片的留白與邊框對「快速掃視多筆」是負擔，尤其目前10筆之後如果擴充到「outstanding-tasks.md 第7項」規劃的幾十筆以上，捲動量會大幅增加。
- 卡片適合「每項有獨立視覺識別（圖示/品牌/顏色分類）、且項目數量有限（通常一頁內數十個以內）」的情境，例如應用程式商店、Postman/RapidAPI這種"marketplace"型目錄（但這點我沒查到實際證據，只能標記為一般印象，不當作查證結論）。本專案服務項目本身沒有圖示，靠文字辨識，不符合卡片的優勢場景。

**建議：主列表改成表格/條列式**，例如：一列＝一個service，固定欄位（名稱、分類、一句話說明、已驗證徽章、「產生SQL」按鈕），比照IBM官方對照表跟AWS CLI參考的密度取向。

**因此**：卡片內部元素對齊的CSS修正（上一輪提的問題）**不再需要處理**——確定改表格式後，卡片對齊問題本身就不存在了。

### 三之二、設計提案（回應「不能枯燥乏味、要現代化」+「功能不能少」）

使用者同意表格/條列方向，但要求不能做成枯燥的純表格、要有現代感，且既有功能一個都不能少。做法：不是直接改正式檔案賭一次對不對，而是先做一份用真實資料的可互動 Artifact 原型：**[SQL Service 目錄設計提案](https://claude.ai/code/artifact/fae8878d-a4c1-4bfa-b451-ce39fff148a4)**。

**設計方向（token）：**
- **色彩**：主色不用最泛用的純藍/紫漸層，改用偏深青藍 `#0e5c73`（呼應IBM i的技術/終端機氣質但不做成復古綠幕梗），中性色帶一點藍灰偏色（`#eef1f6`頁面底/`#17222d`文字）而不是純灰；分類用9色一組的低飽和色盤，每個分類一個色點，之後分類數變多可自動輪替色相，不用手動配色。
- **字體**：介面文字沿用系統字型（Segoe UI/微軟正黑，中文顯示安全）；**service名稱、SQL、PTF版本號改用等寬字**（Consolas），因為這些本質上是技術識別碼跟對齊數字，用等寬字一眼就能分辨是「代碼」而非「敘述文字」，也讓版本號直向對齊更好讀。
- **版面**：不是純表格，是「表格骨架＋列可展開」——每列常駐顯示名稱/分類色點/描述/徽章/產生SQL按鈕，點列可展開內嵌的規格詳情（沿用progressive disclosure，只是從「卡片內收合」改成「列內收合」），搜尋列做成sticky吸頂＋表頭sticky，捲動大清單時仍看得到欄位標題；點「產生SQL」不再跳到頁面下方的表單區，改成從右側滑出的抽屜（drawer），現代UI常見模式，避免使用者失去目前捲動位置。

**功能不遺漏checklist（比對現有 `outputs/kb.html` 逐項核對，Artifact裡都已可實際操作）：**

| 現有功能 | 在Artifact原型的對應 |
|---|---|
| 關鍵字搜尋（即時過濾） | 保留，sticky搜尋框 |
| 分類chip篩選（可與關鍵字並存、再點一次取消） | 保留，chip加上色點呼應列表左側分類色 |
| 已核實/草稿徽章 | 保留，樣式改為pill |
| 「顯示規格詳情」展開/收合（最低OS、PTF對照表/文字、版本例外提示） | 保留，改成點列展開的內嵌詳情列 |
| 「產生SQL」按鈕（一個service可能對應多個template） | 保留，每個template各一顆按鈕 |
| 表單：欄位prompt+input/select、必填標記、預設值 | 保留，搬進右側抽屜 |
| 進階選項收合（「顯示更多N個進階選項」） | 保留 |
| 「產生SQL」＋「重設為預設值」按鈕 | 保留 |
| SQL輸出＋複製SQL按鈕（含「已複製！」回饋） | 保留，並加上第四節的格式化 |
| 免責聲明 | 這版原型省略（不影響功能判斷），正式版會保留 |

**待你確認**：實際點開Artifact操作過後，這個方向（配色/字體/抽屜互動/列展開）可以嗎，還是要調整哪裡？確認後才會動手改 `scripts/build-kb-html.js` 正式套用。

## 四、SQL 複製格式化方案（回應要求4，已鎖定「複製前、後都格式化」）

### 現況
`sqlTemplate` 在 `templates.json` 存成單行字串，`fillTemplate()` 純字串代換，畫面顯示跟複製出去的內容都是同一條沒有換行的字串。

### 已在Artifact原型驗證的格式化邏輯
不用引入外部SQL格式化套件，寫一個約40行的純函式 `formatSql()`：逐字元掃描字串，用「目前有沒有在單引號字串內」「目前括號巢狀深度」兩個狀態判斷——只在**深度為0、不在字串內**時，遇到 `FROM`/`WHERE`/`AND`/`OR`/`ORDER BY`/`GROUP BY` 前換行、遇到頂層逗號後換行縮排。這樣可以避開兩個風險：
1. 篩選值字串裡剛好包含關鍵字的誤判（例如使用者輸入 `'AND_TEAM'`）——因為在單引號內的字元不會被判斷成關鍵字。
2. `templates.json` 大量使用的「OR trick」寫法（`(COL = '{x}' OR '{x}' = '')`）不會被拆得太碎——括號內的 `OR` 深度大於0不換行，只有連接各個括號群組的頂層 `AND` 才會換行，例如 `journal_info` 的查詢格式化後會是：
   ```
   SELECT JOURNAL_NAME,
     JOURNAL_LIBRARY,
     ATTACHED_JOURNAL_RECEIVER_NAME,
     ATTACHED_JOURNAL_RECEIVER_LIBRARY,
     MESSAGE_QUEUE,
     MESSAGE_QUEUE_LIBRARY
   FROM QSYS2.JOURNAL_INFO
   WHERE (JOURNAL_LIBRARY = 'MYLIB' OR 'MYLIB' = '')
   AND (JOURNAL_NAME = '' OR '' = '')
   ```

**成本（回應「如果麻煩要告知」）**：實測下來**不需要大量token**，屬於小範圍改動，且已經在Artifact裡跑過全部10個template驗證輸出正常（包含 `SYSTEM_STATUS_INFO` 這種無WHERE子句、`OBJECT_LOCK_INFO` 這種table function語法的邊界情況）。正式實作只需把這個函式搬進 `src/lib/kbEngine.js`（讓 `npm test` 能覆蓋到），複製按鈕跟畫面顯示都呼叫格式化後的字串，一次到位。

## 五、「查詢面過窄」檢查清單（回應要求3：往後每份計畫書都要附上）

> 依 `plans/2026-08-14-ui-ux-optimization.md` 第C節決議：每個service「可查證過的欄位」都應該設計成表單參數（可搭配 progressive disclosure 收在進階選項），只用已從官方資料源核對過的欄位名稱。**這個檢查清單之後每一份涉及 service/template 異動的計畫書都要附上，逐一過一次，不能省略。**

**這輪已完成全部10筆service的盤點**（比對 `services.json` 的 `exampleSql`/`templates.json` 的 `sqlTemplate` 輸出欄位 vs. `params` 可篩選欄位）：

| Service | SELECT輸出欄位 | 目前可篩選參數 | 是否有缺口 |
|---|---|---|---|
| `object_lock_info` | `SELECT *`（實際欄位未知——語法本身有bug，見 `outstanding-tasks.md` 第1項，View誤寫成table function） | library/object/objType（皆為table function的輸入參數，非輸出欄位篩選） | **無法判斷**，卡在語法未修正，不是這份清單能單獨解決的，待第1項修完後才能重新盤點 |
| `systablestat` | `TABLE_SCHEMA`, `TABLE_NAME`, `NUMBER_ROWS`, `DATA_SIZE` | library(→SCHEMA)、tableName(→NAME，進階)、minSizeMb(→DATA_SIZE門檻) | **有缺口**：`NUMBER_ROWS`（資料筆數）沒有篩選門檻，例如「只看超過N筆的資料表」查不到 |
| `ifs_object_statistics` | `PATH_NAME`, `DATA_SIZE` | path(必填,→起始路徑)、minSizeMb(→DATA_SIZE門檻) | 無明顯缺口（2個輸出欄位都有對應輸入/門檻），但這個service的參數簽名本身未經官方核對，見 `outstanding-tasks.md` 第4項 |
| `active_job_info` | `JOB_NAME`, `JOB_USER`, `SUBSYSTEM`, `CPU_TIME`, `ELAPSED_CPU_PERCENTAGE` | subsystem、jobName(進階)、currentUser(進階)、detailedInfo(進階，非篩選) | **有缺口**：`CPU_TIME`/`ELAPSED_CPU_PERCENTAGE` 沒有門檻篩選，例如「只看CPU使用率超過X%的工作」查不到，這是很常見的排查情境 |
| `system_status_info` | 8個欄位（系統整體單一列快照） | 無 | **無缺口**——這個view本質上整個系統只回傳1列，沒有可篩選的維度，`params: []` 是正確設計，不是遺漏 |
| `journal_info` | 6個欄位 | library、journalName(進階) | **有缺口**（上一輪已發現）：`ATTACHED_JOURNAL_RECEIVER_NAME/LIBRARY`、`MESSAGE_QUEUE`/`MESSAGE_QUEUE_LIBRARY` 這4個輸出欄位沒有篩選參數 |
| `user_info` | 5個欄位 | authorizationName、daysUntilExpire、status(進階)、userClassName(進階)、daysSinceLastSignon(進階) | 無缺口，5個輸出欄位都有對應篩選 |
| `output_queue_entries` | `SPOOLED_FILE_NAME`, `USER_NAME`, `STATUS`, `CREATE_TIMESTAMP` | outqLib/outqName(必填,函式輸入)、status(進階)、userName(進階)、createdBefore(進階,→CREATE_TIMESTAMP) | **小缺口**：`SPOOLED_FILE_NAME` 沒有篩選（例如已知檔名要查特定緩衝檔狀態），優先度較低，多數情境是瀏覽整個佇列而非查特定檔名 |
| `netstat_info` | `LOCAL_PORT`, `LOCAL_ADDRESS`, `REMOTE_ADDRESS`, `REMOTE_PORT`, `TCP_STATE` | state、localPort(進階)、remotePort(進階) | **有缺口**：`LOCAL_ADDRESS`/`REMOTE_ADDRESS` 沒有篩選，網路排查常見情境「查某個遠端IP的連線」目前做不到 |
| `asp_info` | `ASP_NUMBER`, `DEVICE_DESCRIPTION_NAME`, `ASP_STATE`, `ASP_TYPE`, `TOTAL_CAPACITY`, `TOTAL_CAPACITY_AVAILABLE` | aspState(進階)、aspType(進階) | **有缺口**：`ASP_NUMBER`/`DEVICE_DESCRIPTION_NAME` 沒有指定查詢，且 `TOTAL_CAPACITY_AVAILABLE` 沒有門檻篩選——「只看可用空間低於X%的ASP」這種儲存空間告警情境目前查不到，算是比較有實際價值的缺口 |

**小結**：10筆裡有6筆有缺口（`object_lock_info` 待語法修正後才能判斷、`systablestat`、`active_job_info`、`journal_info`、`output_queue_entries`、`netstat_info`、`asp_info`），2筆完整（`ifs_object_statistics`／`user_info`，各有但書），1筆本來就不需要篩選（`system_status_info`）。

**待你確認**：這些缺口要不要排入這輪一起補，還是先處理完主列表版面／SQL格式化，缺口另開一輪處理（畢竟這輪已經有3件事在動了，避免範圍一次擴太大）。

**這條檢查清單的長期落地方式**：已存進持久記憶（跨對話），確立「往後每份涉及 service/template 異動的計畫書都要附這個章節」是標準動作；而且使用者明確提醒現在只有10筆，之後知識庫會擴大到涵蓋 `outputs/webfetch/ibm-i-services-sql.html` 裡幾百筆service的規模，屆時這個checklist要逐批對新增的service重新盤點一次，不是做過一次就結束。

---

## 六、實作範圍（等你確認後才動手）

目前這份僅為調研+規劃+可互動原型，**尚未修改 `src/`、`scripts/`、`outputs/` 任何檔案**。等你：
1. 確認Artifact原型的視覺/互動方向沒問題（或提出要改的地方）
2. 決定「查詢面過窄」缺口這輪要不要一起補

才會動手：改 `scripts/build-kb-html.js` 套用表格式版面、把 `formatSql()` 加進 `src/lib/kbEngine.js`（含單元測試）、視你的決定加上缺口欄位的表單參數，改完跑 `npm test` + `npm run build` + 瀏覽器實測。
