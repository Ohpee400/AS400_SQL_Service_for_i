# 10筆Service「最終完成品」實作計畫

最後更新：2026-08-14。**取代/整合** `plans/2026-08-14-ui-ux-optimization.md` 第二輪決議、`plans/2026-08-14-catalog-layout-benchmark-and-sql-format.md`（Artifact原型的視覺/互動方向已確認，內容併入這份）。目標：把現有10筆service做到「最終完成品」標準——UI架構、查詢欄位完整度、資料正確性全部到位，日後擴充新service只是照同一套模式加資料，不需要再改架構。

實作前**尚未動任何 `src/`/`scripts/`/`outputs/` 檔案**，這份是給你審核用的完整計畫。

---

## 零、「全部核實」是收錄的必要條件（這輪的底線，非附加項目）

你糾正了我上一輪的說法：把 `object_lock_info` 的修正說成「額外收穫、不在原本要求範圍內」是錯的框架——**全部核實是這個工具收錄任何一筆資料的基本且必要條件**，不是加分項。這點已比照「查詢面過窄」存進跨對話記憶，往後每份涉及service異動的計畫書都要附上「全部核實」的達成狀態檢查，不會再遺忘。

**這條規則帶出這輪唯一還沒解決的問題：`systablestat`/`SYSPARTITIONSTAT` 目前無法核實。**

現況盤點（這輪10筆的核實狀態）：

| Service | 核實狀態 |
|---|---|
| `object_lock_info` | 這輪補完後可達 `verified:true`（見第三節） |
| `ifs_object_statistics` | 這輪補完後可達 `verified:true`（見第四節，函式簽名已核對，OS/PTF資料`outstanding-tasks.md`第2項已查到） |
| `active_job_info`／`system_status_info`／`journal_info`／`user_info`／`output_queue_entries`／`netstat_info`／`asp_info` | 已是 `verified:true` |
| `systablestat` / `SYSPARTITIONSTAT` | **仍無法核實** |

`systablestat` 這筆，我剛才又用程式全文搜尋了一次 `rzajqpdf.pdf`（1442頁全文），只找到兩處順帶提及（第85、368頁，都是在講別的功能時順口帶到 `SYSPARTITIONSTAT` 這個目錄視觀表名稱），**沒有找到它的欄位定義章節，也沒有最低OS版本/PTF需求的說明**；`outputs/webfetch/ibm-i-services-sql.html` 這份官方對照表本身也不收錄它（`outstanding-tasks.md`第3項已知）。目前手上兩份官方資料都查不到，判斷是因為它是早於「IBM i Services」PTF追蹤機制就存在的基礎Db2目錄視觀表，沒有被納入這套新文件體系。

**更新（2026-08-14）：你提醒後改用 `outputs/webfetch/rzajqpdf.pdf` 與 `ibm-i-services-sql.html` 以外的官方來源，這筆現在可以核實了。**

`rzajqpdf.pdf`／`ibm-i-services-sql.html` 這兩份是先前既有的本機存檔，只涵蓋「IBM i Services」這個PTF追蹤計畫下的內容，本來就不會收錄 `SYSTABLESTAT`/`SYSPARTITIONSTAT` 這種更基礎的Db2目錄視觀表。改查 **IBM官方文件網站的SQL Reference章節**（`https://www.ibm.com/docs/en/i/7.6.0?topic=views-systablestat`／`...=views-syspartitionstat`，用 `scrapling` 抓取，honest fetch → 需JS渲染就升級到 `fetch`，兩頁都成功取得完整內容），找到官方欄位表：

- **`SYSTABLESTAT`**：官方確認 `TABLE_SCHEMA`(VARCHAR128)、`TABLE_NAME`(VARCHAR128)、`NUMBER_ROWS`(BIGINT)、`DATA_SIZE`(BIGINT，單位bytes)——**跟現有 `exampleSql` 用的4個欄位完全吻合**，包含 `DATA_SIZE` 乘 `1024*1024` 換算MB的假設也是對的。
- **`SYSPARTITIONSTAT`**：官方確認多了 `TABLE_PARTITION` 欄位（分割區/member名稱），驗證現有描述「提供分割區(member)層級的細節」正確。
- **PTF/版本別**：這個「Db2 for i SQL Reference / Db2 for i catalog views」章節的文件形式，**跟「IBM i Services」那套PTF追蹤文件是不同體系**——查了兩個view的頁面都完全沒有提到任何PTF或版本別限制，且IBM文件網站上7.1.0~7.6.0每個版本都各自收錄同一份文件，沒有版本差異註記。這代表它是Db2 for i SQL引擎的基礎目錄視觀表，不是需要額外PTF的「加值功能」，這點本身就是一個可查證的事實（而不是猜測）。原本 `services.json` 裡「V5R4+」這個具體版本號沒有來源支持，這輪會拿掉、改成如實描述「IBM官方文件7.1-7.6版本皆收錄、未提及PTF或版本別限制」，`ptfTable` 比照其他已核實service的格式填成4個版本皆 `base:true`／`enhanced:""`。

**結論：`systablestat`（含SYSPARTITIONSTAT）這輪可以正常升級成 `verified:true`，不需要移除。** 10筆全部核實達標，「已核實/草稿」徽章確實不再需要顯示——你第一節的決定（拿掉徽章）現在跟這個結果一致，不衝突了。

## 一、UI/UX修正（回應你對Artifact原型的6點回饋）

| # | 問題 | 修正方向 |
|---|---|---|
| 1 | 字太小、留白太多 | 本文字級拉大、列的padding/行高壓縮，整體資訊密度提高 |
| 2 | journal_info只有2個篩選欄位 | 不是bug，是資料本身缺口，見下方「二」一併補齊 |
| 3 | 複製SQL按鈕沒反應 | 根因推測：Artifact預覽是跑在claude.ai的沙盒iframe，`navigator.clipboard.writeText()` 常被瀏覽器擋掉、加上原本沒寫`.catch()`所以失敗時沒有任何提示。修法：**直接做進正式的 `scripts/build-kb-html.js`**（回應第5點），本來就是雙擊在本機瀏覽器開啟的獨立html檔案，不在iframe沙盒裡；同時程式碼加上try/catch與失敗時的文字提示（例如「複製失敗，請手動選取複製」），不會再靜默無反應 |
| 4 | 必填欄位未填時要非彈出式提示 | 拿掉 `alert()`，改成在「產生SQL」按鈕旁邊直接顯示紅字提示（不遮擋畫面、不用點掉） |
| 5 | 改成非claude.ai網頁 | 這次直接做正式檔案 `outputs/kb.html`，不再另外產Artifact預覽 |
| 6 | 「狀態」欄位移除，改顯示類型(View/Table function) | 可行，見下方「三」，資料已從官方對照表核對過9/10筆 |

**「已核實/草稿」徽章：整個拿掉，不移到別處**（你已確認）。理由：這個工具的收錄前提是「全部核實才允許放進來」，不存在「核實」以外的合法狀態，徽章沒有資訊價值可顯示。這連帶影響知識庫內容本身要不要收錄某一筆——見下方新增的「零」節。

## 二、「查詢面過窄」全面補齊（這輪做完，不留缺口）

依 [plans/2026-08-14-catalog-layout-benchmark-and-sql-format.md](plans/2026-08-14-catalog-layout-benchmark-and-sql-format.md) 第五節盤點出的缺口，這輪要新增的篩選參數（全部設為進階選項，不影響一般情境的欄位數量）：

| Service | 新增參數 | 對應輸出欄位 | 說明 |
|---|---|---|---|
| `systablestat` | `minRows` | `NUMBER_ROWS` | 篩選門檻(最少筆數)，用法比照現有 `minSizeMb` 的OR trick |
| `active_job_info` | `minCpuPercent` | `ELAPSED_CPU_PERCENTAGE` | 篩選CPU使用率門檻。`CPU_TIME`(累計毫秒)較不適合當篩選門檻，這輪先不加，只做較常用的百分比篩選 |
| `journal_info` | `receiverName`／`receiverLibrary`／`messageQueue`／`messageQueueLibrary` | `ATTACHED_JOURNAL_RECEIVER_NAME`／`LIBRARY`、`MESSAGE_QUEUE`／`LIBRARY` | 4個都補上，跟現有 `journalName` 一樣是進階選項 |
| `output_queue_entries` | `spooledFileName` | `SPOOLED_FILE_NAME` | 已知檔名要查特定緩衝檔狀態時可用 |
| `netstat_info` | `localAddress`／`remoteAddress` | `LOCAL_ADDRESS`／`REMOTE_ADDRESS` | **改用 `LIKE` 部分比對**（你已確認），例如輸入 `192.168.1` 可以查到整個網段；SQL寫成 `(LOCAL_ADDRESS LIKE '%{localAddress}%' OR '{localAddress}' = '')`，跟其他欄位的完全比對OR trick風格不同，會在template裡註明這個例外 |
| `asp_info` | `aspNumber`／`deviceDescriptionName`／`maxAvailableMb` | `ASP_NUMBER`／`DEVICE_DESCRIPTION_NAME`／`TOTAL_CAPACITY_AVAILABLE` | `maxAvailableMb` 是新查到的重點：官方文件確認 `TOTAL_CAPACITY_AVAILABLE` 單位就是MB（不是bytes，不需要乘1024*1024），可以直接做「只看可用空間低於X MB的ASP」這種告警情境。百分比篩選(可用空間/總容量)這輪不做，因為官方文件註明總容量欄位有`-2`特殊值（超過欄位上限時回傳），算百分比要處理這個例外+除以零，複雜度較高，先用絕對值MB門檻 |
| `ifs_object_statistics`／`user_info`／`system_status_info` | 無 | — | 已核對無缺口（`system_status_info` 本質上是單列快照，`params:[]`是正確設計） |
| `object_lock_info` | 見下方「三」 | — | 語法本身要重寫，篩選欄位設計併入重寫一起做 |

## 三、`object_lock_info` 語法重寫（意外解掉了 `outstanding-tasks.md` 第1項）

為了幫這個service補篩選欄位，我去查了 `outputs/webfetch/rzajqpdf.pdf` 第1196-1199頁（book內頁碼1180-1182），找到官方權威資料：

- **確認是 View**（不是table function），跟 `outstanding-tasks.md` 第1項的既有判斷一致。官方範例：`SELECT * FROM QSYS2.OBJECT_LOCK_INFO WHERE SYSTEM_OBJECT_SCHEMA = 'TOYSTORE' AND SYSTEM_OBJECT_NAME = 'SALES'`
- 完整欄位清單（Table 301 OBJECT_LOCK_INFO view）含：`OBJECT_SCHEMA`/`OBJECT_NAME`(SQL長名稱)、`SYSTEM_OBJECT_SCHEMA`/`SYSTEM_OBJECT_NAME`(傳統10碼系統名稱)、`OBJECT_TYPE`、`SQL_OBJECT_TYPE`、`LOCK_STATE`、`LOCK_STATUS`、`LOCK_SCOPE`、`JOB_NAME`/`JOB_USER`/`JOB_NUMBER`、`ASP_NUMBER`/`ASPGRP`、`PROGRAM_LIBRARY_NAME`/`PROGRAM_NAME` 等共26欄。

**新的 `exampleSql`**（改用系統名稱欄位，跟官方範例與現有library/object參數的10碼大寫慣例一致）：
```sql
SELECT * FROM QSYS2.OBJECT_LOCK_INFO
WHERE SYSTEM_OBJECT_SCHEMA = 'MYLIB' AND SYSTEM_OBJECT_NAME = 'MYOBJ'
ORDER BY LOCK_STATE
```

**新的 `object_lock_check` template參數**：
- `library`(必填,upper) → `SYSTEM_OBJECT_SCHEMA`
- `object`(必填,upper) → `SYSTEM_OBJECT_NAME`
- `objectType`(進階,upper) → `OBJECT_TYPE`（沿用原本 `objType` 的用途，但改對應到真實存在的輸出欄位而不是不存在的函式參數）
- `lockState`(進階) → `LOCK_STATE`（選項：`*EXCL`/`*EXCLRD`/`*SHRNUP`/`*SHRRD`/`*SHRUPD`，官方文件列出的完整值域）
- `jobName`／`jobUser`(進階,upper) → `JOB_NAME`／`JOB_USER`（反向查詢「某工作持有哪些鎖」的情境）

**`verified` 狀態**：這筆之前是 `verified: false` 草稿。現在語法跟欄位都核對過官方PDF，加上 `outstanding-tasks.md` 第2項已經有從 `ibm-i-services-sql.html` 查到的真實PTF資料（7.6 Base+Enhanced SF99960 Level2、7.5 Base+Enhanced SF99950 Level11、7.4 Base、7.3 Base），**這輪一併把它從草稿升級成 `verified: true`**，`minOsVersion` 也從「概略記憶」改成精確版本。

## 四、`ifs_object_statistics` 參數簽名驗證結果（`outstanding-tasks.md` 第4項的一部分）

同樣去查了 `rzajqpdf.pdf` 第680-687頁，官方文件確認 `IFS_OBJECT_STATISTICS` 的實際參數是 `START_PATH_NAME`／`SUBTREE_DIRECTORIES`／`OBJECT_TYPE_LIST`／`OMIT_LIST`／`IGNORE_ERRORS`，**跟現有 `templates.json` 裡的寫法完全吻合**，不是憑印象亂寫的。`DATA_SIZE` 欄位確認型別是 `BIGINT`（bytes），現有 `* 1024 * 1024` 換算MB的邏輯也正確。這部分不需要改SQL，只需要把 `docSearchHint` 更新成「已核對官方文件」。

**`verified` 狀態**：函式簽名這輪核對完，加上 `outstanding-tasks.md` 第2項已經有從 `ibm-i-services-sql.html` 查到的真實PTF資料（7.6 Base、7.5 Base+Enhanced SF99950 Level4、7.4 SF99704 Level4+Enhanced Level13、7.3 SF99703 Level16+Enhanced Level24），**這輪一併把它從草稿升級成 `verified: true`**。

## 五、SQL 複製格式化（沿用前一份計畫的方案，未變動）

鎖定「複製前、後都格式化」，40行左右的 `formatSql()` 純函式，逐字元掃描、追蹤括號深度與是否在字串內，只在頂層插入換行，已在Artifact原型驗證過全部10個template（含OR trick寫法）。這輪要把它搬進 `src/lib/kbEngine.js` 並補上單元測試（`tests/unit/kbEngine.test.js`）。

## 六、兩條長期規則（已存進跨對話記憶，往後每份計畫書都要附）

1. **查詢面過窄**：每個service「可查證過的欄位」都要做成表單參數，不是做一次就結束——知識庫之後擴大到 `outputs/webfetch/ibm-i-services-sql.html` 涵蓋的幾百筆規模時，每批新增都要重新盤點一次。
2. **全部核實**：只有 `verified:true` 才能收錄進工具，沒有「草稿暫時上架」這個選項。每次新增/異動service，都要先確認核實狀態達標才能上架，達不到就先不收錄（而不是收錄後標草稿）。

這輪等於是把現有10筆的兩項欠款（查詢面+核實狀態）一次還清，之後新增的service從一開始就要兩項都做完整，不會再欠。

## 七、實作範圍（10筆全部達到verified:true，一次做完不分批）

1. `src/data/services.json`：`object_lock_info`／`ifs_object_statistics`／`systablestat` 三筆改 `verified:true`+精確PTF資料（`systablestat`的`minOsVersion`改成如實描述、`ptfTable`比照其他service格式），其餘視需要更新 `docSearchHint`
2. `src/data/templates.json`：8個template要改（`object_lock_check`重寫、`large_table_check`/`active_job_check`/`journal_check`/`output_queue_check`/`netstat_check`/`asp_check` 加新篩選參數，`netstat_check`的地址篩選用LIKE），`ifs_object_statistics`/`user_info`/`system_status_info`不動
3. `src/lib/kbEngine.js`：加 `formatSql()`，補單元測試
4. `scripts/build-kb-html.js`：表格式版面（沿用Artifact原型的配色/字體/抽屜互動，密度調整）、「狀態」改「類型」、拿掉已核實/草稿徽章（10筆全數verified，不再需要顯示）、複製按鈕加錯誤處理、必填驗證改inline提示
5. `docs/data-schema.md`：補充新欄位/`formatSql`說明，反映10筆全部核實的現況
6. `plans/2026-08-14-outstanding-tasks.md`：把第1項（object_lock_info語法）、第2項（PTF資料）、第3項（systablestat，這輪已核實）、第4項（IFS_OBJECT_STATISTICS）全部標記完成

## 八、驗證方式

1. `npm test`
2. `npm run build`
3. 瀏覽器直接開 `outputs/kb.html` 實際操作：10筆service逐一測試搜尋/分類篩選/展開詳情/產生SQL(含新增的篩選欄位)/複製SQL(確認真的有複製成功)/必填欄位留空時的inline提示

## 九、決策點狀態

1. ~~已核實/草稿徽章位置~~ → 已確認拿掉
2. ~~`asp_info` MB絕對值門檻~~ → 已確認OK
3. ~~`netstat_info` 地址篩選~~ → 已確認改LIKE
4. ~~`object_lock_info` 升級為verified~~ → 已確認要做
5. ~~`systablestat`/`SYSPARTITIONSTAT` 核實~~ → 這輪透過IBM官方文件網站補查到，已解決，10筆全數可達 `verified:true`

**全部決策點都已確認，等你這輪回覆同意後，就照「七、實作範圍」一次做完，中間不再分批確認。**
