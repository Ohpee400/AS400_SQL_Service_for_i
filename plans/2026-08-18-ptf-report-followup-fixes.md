# PTF功能追加修正（5項，使用者已逐項確認方向）

最後更新：2026-08-18。分支：`feature/ptf-group-paste`。這份文件是在使用者要求「先產出計劃書避免斷片」時，把已經在對話中討論並確認方向、但還沒動手的項目統一整理成正式plan，供任何session接手時都能照著做。

## 背景

在`feature/ptf-group-paste`分支完成「PTF升級效益報告」後，使用者實測`outputs/kb.html`回報5個問題，逐項已確認修復方向（見下方「使用者確認的回覆」），但**全部都還沒實作**。

## 待修項目（依使用者原始編號）

### 1. 「需人工確認」誤判成「不支援」
- **現況bug**：`servicePtfLevelStatus()`裡`if (!row) return {status:'unknown'}`——「這個版本根本沒有ptfTable資料列（=官方標示Not Supported）」跟「有資料列但enhanced文字解析不出Level數字（=真的需要人工查證）」被當成同一種`unknown`狀態處理，畫面上都顯示「⚠ 需人工確認」，但前者其實有明確答案（就是不支援），不該跟後者混在一起。
- **已查證**：重新精確掃描全庫258筆，「base=false且enhanced有內容但解析不出Level數字」的筆數是**0筆**。也就是說修正後，「需人工確認」這個狀態在目前資料集裡不會被觸發，程式碼保留但不會顯示。
- **修法**：拆成兩個獨立status——沒有資料列的回傳新的`'unsupported'`狀態（畫面顯示類似「此版本不支援」，不要用「⚠」跟「需人工確認」字樣）；有資料列但解析不出Level的才維持`'unknown'`（需人工確認）。`svcReqLabel()`、`computePtfReport()`（分母計算）都要同步处理這個新狀態——`unsupported`不該計入報告的`total`（分母），因為那些service在這個版本本來就不適用，不是「PTF等級不夠」的問題。

### 2. 切換OS版本chip時，PTF Level輸入框沒有清空
- **現況bug**：`updatePtfLevelPanel()`只更新PTF Group名稱跟SQL文字，沒有重置`ptf-level-input`的值。使用者在7.6輸入的Level（對應SF99960）切到7.4後，數字會被誤當成SF99704的Level繼續比對，兩個Group的Level完全不能互通。
- **修法**：`updatePtfLevelPanel()`裡，當`activeVersion`確定改變時，把`ptfLevelInputEl.value`清空，並連帶重新渲染（服務列表跟報告都要跟著回到「未輸入」狀態）。

### 3. 查詢指令文字太長 → 方案A（使用者已選定）
- **現況**：`ptf-level-panel`裡用`<span class="ptf-level-hint">查詢指令：<code>SELECT ...</code></span>`把整段SQL攤開顯示。
- **修法（方案A）**：拿掉這段可見的SQL文字，把`<button id="ptf-level-copy">`的文字從「複製」改成「複製查詢SQL」，讓按鈕本身自我解釋用途。SQL字串本身還是要保留在某個地方（例如維持寫入`ptfLevelSqlEl.textContent`，但把這個元素隱藏`display:none`或改成`aria-hidden`），讓複製按鈕的click handler還讀得到，只是不在畫面上視覺呈現一大串SQL。

### 4. 全部可用時，複製報告內容空洞
- **現況bug**：`renderPtfReport()`在`report.nextLevel === null`（沒有blocked項目）且`report.unlocked.length === 0`且`report.unknownCount === 0`時，`ptfReportUnlockedEl.innerHTML`會是空字串——畫面上「解鎖清單」那個框看起來像壞掉的空白區塊。摘要文字本身雖然有寫「已經可以使用全部相關service」，但整體觀感單薄。
- **修法**：`renderPtfReport()`與`buildPtfReportText()`都要在「已全部可用」（`report.total > 0 && report.availableCount === report.total && report.nextLevel === null`）這個情境下，於解鎖清單區塊/複製文字裡明確填入一句正面確認訊息，例如「🎉 目前PTF等級已可支援篩選範圍內全部N個服務，無需升級」，不要讓這個區塊在任何情境下維持真正的空白。

### 5.（新提出）展開後的PTF對照表要固定顯示7.3~7.6四列，缺資料的顯示「不支援」
- **現況bug**：`buildPtfTableHtml(ptfTable)`直接`ptfTable.map(...)`，只渲染資料裡實際存在的版本列。像7.3不支援的service，展開後的表格只會看到7.4/7.5/7.6三列，7.3那一列完全消失，使用者無法從展開畫面判斷「是沒資料還是真的不支援」。
- **修法**：改成固定依`versionListAscending`（或既有的版本清單，由舊到新7.3→7.6）逐一迭代，對每個版本查`ptfTable`裡有沒有對應row：有就照舊渲染Base/需PTF+說明；沒有就該列固定顯示「不支援」（例如整列文字用`colspan`或維持三欄但都填「不支援」，樣式呼應現有`.not-base`橘字或改用`--muted`灰字，待實作時再看視覺效果決定，只要清楚跟「Base/需PTF」區分開即可）。

## 查詢面/欄位盤點

不涉及`src/data/*.json`資料結構異動，全部是`scripts/build-kb-html.js`裡的渲染/邏輯調整。

## 本輪動作範圍

分支：`feature/ptf-group-paste`。允許修改：`scripts/build-kb-html.js`、`outputs/kb.html`（僅透過`npm run build`重新產生）。

## 驗證方式（比照這個分支先前幾次修正的SOP，缺一不可）

1. `node --check scripts/build-kb-html.js`（外層build腳本語法）。
2. **從`outputs/kb.html`擷取兩個`<script>`區塊分別存檔、各自`node --check`**（這一步是這個分支踩過兩次`\d`/`\s`/`\n`雙重跳脫地雷後才加進SOP的，不能省略，只查build腳本本身語法查不出頁面JS的問題）。
3. `npm test`（16項既有迴歸測試）。
4. `npm run build`。
5. `bash scripts/headless-check.sh`（確認258筆不變）。
6. 針對每一項用**真實資料情境**+headless Chrome模擬使用者操作驗證，不能只靠程式碼審閱：
   - 第1項：找一筆有真實「Not Supported」版本的service（例如`add_device_locking_policy`在7.3），確認畫面顯示「不支援」而非「需人工確認」。
   - 第2項：選7.6輸入Level=2 → 切到7.4，確認輸入框變回空白、報告與per-row狀態都重新計算成「未輸入」的樣子。
   - 第3項：確認按鈕文字變成「複製查詢SQL」、點擊後複製到剪貼簿的內容仍是正確SQL、畫面上不再顯示整串SQL文字。
   - 第4項：用一個「目前等級已可使用全部相關service」的情境（例如7.6+極高Level），確認畫面解鎖清單區塊跟複製出來的文字都有明確正面訊息，不是空的。
   - 第5項：展開一個有「Not Supported」版本的service，確認固定看到4列（7.3~7.6），沒資料的那列明確寫「不支援」。
7. 全部驗證通過後，比照這個分支前幾次的模式：補`progress/`結果記錄、commit到`feature/ptf-group-paste`（不動`master`）。

## 尚待使用者回覆、非本次plan範圍的事項

- 使用者要重開一個新session，驗證`.claude/settings.json`裡的裸`"Bash"`規則跟`block-dangerous-bash.py`是否因為「mid-session設定不會熱重載」而還沒生效——這件事不屬於這份plan要修的功能，是另一條調查線，等使用者回報新session的實測結果再繼續。
- `.claude/settings.json`目前有一筆尚未commit的異動（新增`Bash(tasklist *)`），不影響這份plan的範圍，但下次commit時記得一併帶上。
