# PTF升級效益報告 — 動手前記錄

最後更新：2026-08-18。分支：`feature/ptf-group-paste`。對應計畫：`plans/2026-08-18-ptf-upgrade-impact-report.md`，使用者回覆「好」確認方向。

## 任務

在`ptf-level-panel`裡新增升級效益摘要報告（目前可用數/下一門檻可解鎖數+清單）+複製報告按鈕，取代per-row徽章作為主要賣點。

## 已知限制

- 計算範圍以`lastRenderedList`(目前篩選後清單)為準，不是固定258筆。
- 不新增/修改`src/data/services.json`，純前端運算。
- 沿用既有`servicePtfLevelStatus`/`extractMinLevel`/`PTF_GROUP_BY_VERSION`，注意新regex/字串若含`\d`、`\s`等跳脫字元要雙重跳脫(`\\d`)，因為整個頁面JS是寫在build腳本的outer template literal裡（上次已踩過這個坑）。

## 本次計畫怎麼做

1. 新增報告計算函式(依目前清單+選中版本+使用者Level分類：available/blocked-known/blocked-unknown/not-applicable，算出下一門檻與可解鎖清單)。
2. UI：`ptf-level-panel`新增摘要文字區塊+複製報告按鈕。
3. `npm test`→`npm run build`→`headless-check.sh`→用7.6版本Level=1（應解鎖10個到Level 2）、Level=2（應解鎖15個到Level 3）兩組真實資料情境實測。
4. 補這份記錄的結果段落。

## 本輪動作範圍

分支：`feature/ptf-group-paste`。允許修改：`scripts/build-kb-html.js`、`outputs/kb.html`（僅透過`npm run build`產生）。

## 結果

### 實作內容
- 新增`computePtfReport(list, version, userLevel)`：算出可用數/總相關數/下一門檻/該門檻可解鎖清單/無法解析筆數。
- 新增`buildPtfReportText()`：組成純文字版報告供複製。
- 新增`renderPtfReport()`：渲染摘要HTML+解鎖清單+無法解析提示。
- 新增`ptfReportBaseList()`：報告專用的篩選清單（只套用關鍵字/分類/類型，不套用主表格的版本floor篩選，原因見下方「過程中發現的第二個問題」）。
- HTML/CSS：`ptf-level-panel`下新增`ptf-report`區塊（摘要文字+解鎖清單+複製報告按鈕），`applyFilters()`與Level輸入框的input事件都會觸發`renderPtfReport()`重新計算。

### 過程中發現並修正的兩個問題

**問題1：`\n`跳脫字元被吃掉，整個頁面渲染異常（`headless-check.sh`回報「找不到筆數文字」）**
- 這是上次`\s`/`\d`那個bug的同類問題再犯一次——`buildPtfReportText()`裡`lines.join('\n')`，這個`\n`因為是寫在`build-kb-html.js`外層template literal裡的文字，被build腳本自己的字串解析吃成真正的換行符，導致shipped出來的JS裡出現一個裡面夾著真實換行的未終結字串，整個第二個`<script>`區塊語法錯誤，頁面完全無法執行。
- 這次用更嚴謹的方式抓出來：**直接從`outputs/kb.html`裡擷取兩個`<script>`區塊內容存成獨立`.js`檔，各自跑`node --check`**——這比先前只跑`node --check scripts/build-kb-html.js`更可靠，因為外層檔案的`--check`只檢查build腳本自己的Node.js語法，不會檢查它產出的字串內容(也就是頁面實際JS)是否語法正確。修正：`'\n'`改成`'\\n'`。
- **這件事往後要固定成驗證SOP的一部分**：不能只依賴`node --check scripts/build-kb-html.js`跟`npm test`，只要有改動到頁面內嵌的JS邏輯，一律要多做「擷取script區塊、單獨node --check」這一步，才抓得到這類雙重跳脫問題。

**問題2：報告分母錯誤縮小成只有9筆（使用真實資料測試才發現，不是靠程式碼審閱）**
- 第一版直接沿用`lastRenderedList`當報告的計算範圍，結果選7.6+時報告只計算9筆——因為主表格「OS版本」chip的篩選邏輯是「floor(最早可用版本) >= X」（找「哪些service是X版本才新增的」），不是「哪些service在X版本可用」，兩者語意完全不同。套用在報告上會把分母錯誤地縮小成「7.6版本才新增的極少數幾筆」，而不是「整個環境裡跟7.6相關的所有筆數」。
- 修正：新增`ptfReportBaseList()`，只套用關鍵字/分類/類型篩選，版本本身的可用性判斷交給`computePtfReport()`內部用「這個service在該版本有沒有ptfTable row」來決定，不再借用主表格的floor篩選。

### 驗證方式與結果（全部用真實headless Chrome模擬，數字對照過獨立的python資料調查結果）
- 修正前用python單獨掃描全庫：7.6版本Level 2門檻有10個service、Level 3門檻有15個。
- 修正後實測：選7.6+、輸入Level=1 → 摘要顯示「目前 SF99960 Level 1 可使用 233/258 個相關service，升級到 Level 2 可再解鎖 10 個」，解鎖清單逐筆核對跟python調查結果的前3筆(`JOURNAL_CODE_INFO`、`CERTIFICATE_USAGE_INFO`、`PROGRAM_RESOLVED_ACTIVATIONS`)完全一致，清單筆數剛好10筆。
- 輸入Level=2 → 「243/258 個相關service，升級到 Level 3 可再解鎖 15 個」，233+10=243、258-243=15，數字前後一致、無矛盾。
- `npm test`16/16 pass、`npm run build`成功、`bash scripts/headless-check.sh`確認258筆不變、兩個`<script>`區塊各自`node --check`都通過。
- 複製報告按鈕沿用既有已驗證過的clipboard寫入模式（跟複製SQL按鈕同一套邏輯），沒有另外重新測試clipboard互動本身。
- 已清除本次驗證用的全部暫存檔案。
