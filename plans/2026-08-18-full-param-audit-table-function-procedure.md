# 115筆Table function/Procedure全面參數稽核（(b)批次）

最後更新：2026-08-18。對應[[2026-08-18-header-highlight-and-param-gap-audit]]決議的(b)項，使用者確認「現在開始」。承接[[project-param-gap-from-doc-example-copying]]記憶記錄的根本原因假設：`exampleSql`/`templates.json`很可能是照抄官方手冊「Example」小節，而非「完整參數簽章」區塊，導致有預設值的可選參數被系統性漏收（`SYSTOOLS.SPOOLED_FILE_DATA`已確認一筆真實案例）。

## 問題/需求清單

- `services.json`裡`type`為`Table function`（66筆）與`Procedure`（49筆），共115筆，都是「函式/程序呼叫帶具名參數」型態，都有跟`SPOOLED_FILE_DATA`同樣的風險。
- 目前完全不知道還有多少筆中招——先前的自動化交叉比對（`exampleSql` vs `templates.json`具名參數）只抓到2筆疑似落差（`PING`、`CHANGE_DEVICE_LOCKING_POLICY`），但這個方法**抓不到「exampleSql自己就漏參數」的情況**（`SPOOLED_FILE_DATA`就是這種），所以無法用它宣稱範圍。

## 已查明的方法論限制（非猜測，上次已實測驗證）

- 唯一可靠的查證方式是**逐筆對照`docSearchHint`指向的PDF頁碼原文的「完整參數簽章」區塊**（不是「Example」小節），用`pdftotext -layout`（已驗證比`scripts/pdf-search.py`用的`pypdf`更能保留表格版面，能看出「This is the default」實際對應到哪個選項）。
- 115筆全部人工逐頁查證，工作量非常大。採用**自動化初篩+人工複核**兩階段，降低工作量但不犧牲準確性：
  1. **自動化初篩（本輪先做）**：寫一次性node腳本，對115筆逐一讀`docSearchHint`裡的頁碼範圍，用`pdftotext -layout`把該頁範圍文字dump出來，用正則抓出「服務名稱 (」開頭到對應「)」結尾的參數簽章區塊，取出裡面所有`PARAM_NAME =>`的參數名稱清單，跟`templates.json`對應模板`sqlTemplate`裡實際出現的具名參數做差集比對，抓出「PDF簽章有、模板沒有」的落差，輸出候選清單。
  2. **人工複核（每筆候選都要做，不能只信任自動化結果）**：自動抓取PDF簽章區塊用正則比對版面不規則的PDF文字，一定會有誤判（抓錯區塊、漏抓多頁簽章、CONST/特殊值誤判成參數名稱等），所以**候選清單只是「值得看」的名單，不是「確認有問題」的名單**——每一筆都要重新讀一次dump出來的原文段落，人工判斷是否真的是漏收的可選參數，才能列入要修的清單，比照這次`SPOOLED_FILE_DATA`的查證強度。
- 這個方法論本身也有已知盲點需要在報告裡誠實揭露：如果某個服務簽章本身橫跨的頁碼超出`docSearchHint`記載的範圍（例如簽章在第N頁但docSearchHint只寫了N+1頁起的Example頁），自動抓取會抓不全；這種情況只能等人工複核階段肉眼發現「這筆看起來簽章不完整」時額外往前後多抓幾頁。

## 執行方向

1. 寫`scripts/`底下的一次性稽核腳本（暫定放`scratchpad`，不進版控，因為是稽核用的一次性工具非專案常駐腳本——若使用者希望保留在`scripts/`供未來新增service時重跑，屆時再移入並補文件）。
2. 跑一輪初篩，產出候選清單（服務id、疑似缺漏的參數名稱、PDF頁碼、原文片段）。
3. **先回報候選清單規模給使用者看過，再決定要不要接著做逐筆人工複核**——115筆如果初篩後候選數量很大（例如超過20-30筆），人工複核+修復會是好幾輪對話量級的工作，不適合一次悶頭做完，中途要回報進度。
4. 每筆複核後確認為真的缺口，才修`templates.json`的`params`/`sqlTemplate`與`services.json`的`exampleSql`/`docSearchHint`，做法比照這次`SPOOLED_FILE_DATA`的修法（可選/有預設值的參數用`advanced:true`、數值型參數比照`CASE WHEN...CAST(...AS INTEGER)`包裝避免kbEngine.fillTemplate留空產生無效SQL）。

## 查詢面/欄位盤點

本批次是「函式呼叫帶具名參數」型態的缺口稽核，不是`View`/`Table`的SELECT輸出欄位vs可篩選參數問題（那是[[project-query-surface-checklist-in-plans]]記憶記錄的另一條、範圍不同的既有規則，116筆View/Table尚未針對258筆規模重新盤點過，不在這次(b)批次範圍內，需要另外排程）。

## 核實狀態

本次是既有`verified:true`資料的參數完整度複查，不是新增service，沿用[[project-full-verification-required]]的查證強度標準（每筆修復都要有PDF頁碼實際dump出來的原文依據，不能只憑自動化比對結果下修）。

## 本輪動作範圍

允許：讀取`src/data/services.json`、`src/data/templates.json`、`outputs/webfetch/rzajqpdf.pdf`（唯讀）；在scratchpad寫一次性稽核腳本並執行（唯讀分析，不寫回專案資料）。
本輪初篩+回報候選清單規模為止；**逐筆修復需要看過候選清單規模後再確認要不要接著做**，不在本輪自動往下做完，避免大範圍修改缺乏使用者中途確認。
