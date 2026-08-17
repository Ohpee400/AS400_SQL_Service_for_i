# PTF報告追加5項修正 — 動手前記錄

最後更新：2026-08-18。分支：`feature/ptf-group-paste`。對應計畫：`plans/2026-08-18-ptf-report-followup-fixes.md`。

## 任務

實作使用者實測後回報的5項問題修正，全部已在plan裡確認方向：
1. 拆分`unknown`狀態為`unsupported`(無資料列)與`unknown`(有資料列但解析不出Level)。
2. 切換OS版本chip時清空PTF Level輸入框。
3. 查詢SQL文字改為隱藏，複製按鈕文字改成「複製查詢SQL」。
4. 全部可用時，解鎖清單區塊補上正面確認訊息。
5. 展開後的PTF對照表固定顯示7.3~7.6四列，缺資料的顯示「不支援」。

## 已知限制

- 不涉及`src/data/*.json`資料結構異動，全部是`scripts/build-kb-html.js`裡的渲染/邏輯調整。
- 注意頁面內嵌JS是寫在build腳本outer template literal裡，正規表示式/字串跳脫字元(`\d`、`\s`、`\n`等)要雙重跳脫(`\\d`)——這個分支前兩次都踩過這個坑。
- `unsupported`狀態不該計入`computePtfReport()`的`total`分母，`unknown`狀態維持不算在available但要單獨計數（沿用既有`unknownCount`欄位）。

## 本次計畫怎麼做

1. `servicePtfLevelStatus()`：`if (!row) return {status:'unsupported'}`（原本回傳`unknown`）。
2. `svcReqLabel()`：新增`unsupported`分支，顯示文字改為「此版本不支援」，不使用「⚠」跟「需人工確認」字樣。
3. `computePtfReport()`：`if (!row) return;`維持不算入`applicableCount`（本來就是這樣，不需改動邏輯，只需確認註解與行為一致）。
4. `updatePtfLevelPanel()`：偵測`activeVersion`改變時清空`ptfLevelInputEl.value`，並在`renderVersionChips()`的click handler裡確保連動`renderServiceList`/`renderPtfReport`重新渲染。
5. HTML：拿掉`.ptf-level-hint`可見文字，`#ptf-level-sql`改成`display:none`或`aria-hidden`，`#ptf-level-copy`按鈕文字改成「複製查詢SQL」。
6. `renderPtfReport()`與`buildPtfReportText()`：在`report.total>0 && report.availableCount===report.total && report.nextLevel===null`情境下，補上正面訊息（如「🎉 目前PTF等級已可支援篩選範圍內全部N個服務，無需升級」）。
7. `buildPtfTableHtml()`：改成依`versionListAscending`固定迭代4個版本，沒資料的版本列顯示「不支援」（沿用或新增CSS class區分樣式）。
8. 驗證SOP：語法檢查(外層+兩個script區塊node --check) → `npm test` → `npm run build` → `headless-check.sh` → 5項各自用真實資料headless驗證。

## 本輪動作範圍

分支：`feature/ptf-group-paste`。允許修改：`scripts/build-kb-html.js`、`outputs/kb.html`（僅透過`npm run build`重新產生）。

## 結果

### 實作內容
- `servicePtfLevelStatus()`：`!row`（該版本在ptfTable裡完全沒有資料列）改回傳`{status:'unsupported'}`，與「有資料列但enhanced文字解析不出Level數字」的`unknown`狀態分開。
- `svcReqLabel()`：新增`unsupported`分支，顯示「此版本不支援」+`status-unsupported`（`--muted`灰字），不再跟`⚠ 官方未列PTF編號，需人工確認`共用文字。`computePtfReport()`本來就用`if (!row) return;`跳過分母，不需改動，行為已符合預期。
- `updatePtfLevelPanel()`：新增`ptfLevelPanelVersion`模組變數追蹤面板目前對應哪個版本，偵測到`activeVersion`改變時清空`ptfLevelInputEl.value`，讓不同PTF Group的Level輸入不會互相沿用。
- HTML：拿掉`.ptf-level-hint`可見SQL文字，`#ptf-level-sql`改成`class="ptf-level-sql-hidden" aria-hidden="true"`（CSS `display:none`），複製按鈕文字從「複製」改成「複製查詢SQL」；SQL字串仍寫入該隱藏元素供複製按鈕讀取，行為不變。
- `renderPtfReport()`/`buildPtfReportText()`：在`report.total>0 && report.availableCount===report.total && report.nextLevel===null`情境下，`ptf-report-unlocked`區塊補上`🎉 目前PTF等級已可支援篩選範圍內全部N個服務，無需升級`（新增`.ptf-report-all-clear`樣式，`--success`綠字），複製文字版同步補上一致訊息。
- `buildPtfTableHtml()`：改成固定依`versionList`（既有資料寫法，由新到舊7.6→7.3）逐一渲染每個版本一列，該版本若在`ptfTable`裡查無資料列，固定顯示「不支援」（新增`table.ptf td.not-supported`樣式，`--muted`灰斜體，跟`.not-base`的橘字區分）。

### 驗證方式與結果
1. `node --check scripts/build-kb-html.js` → 通過。
2. 從`outputs/kb.html`擷取兩個`<script>`區塊各自存檔`node --check` → 皆通過（沒有再踩雙重跳脫的坑，這次改動沒有新增regex/`\n`等跳脫字元）。
3. `npm test` → 16/16 pass。
4. `npm run build` → 成功產出`outputs/kb.html`。
5. `bash scripts/headless-check.sh` → 「共 258 筆」，資料筆數不變。
6. **5項各自用真實資料+headless Chrome模擬使用者操作驗證**：因為專案沒有安裝Puppeteer/jsdom等瀏覽器自動化套件（也不想為了單次驗證臨時安裝套件），改用Node.js內建的`fetch`+`WebSocket`（Node 24原生支援，零額外安裝）直接對`chrome.exe --headless=new --remote-debugging-port`講Chrome DevTools Protocol，在真實headless Chrome分頁裡執行`Runtime.evaluate`模擬點擊OS版本chip、輸入Level、點擊複製按鈕，讀取DOM實際渲染結果——不是重新實作邏輯後自測，是直接操控`outputs/kb.html`本尊。驗證腳本與結果：
   - **第1項**：用`QSYS2.ADD_DEVICE_LOCKING_POLICY`（已確認其`ptfTable`只有7.6/7.5/7.4，無7.3列）。點擊「7.3+」chip後，該service該列顯示`{"text":"此版本不支援","className":"svc-req status-unsupported"}`，不再是「⚠ 需人工確認」。
   - **第2項**：選7.3(SF99703)、輸入Level=7 → 輸入框值變成`"7"`；切換到「7.4+」(SF99704)後，輸入框值回到`""`，確認清空生效。
   - **第3項**：`#ptf-level-copy`按鈕文字為`"複製查詢SQL"`；`#ptf-level-sql`元素`offsetParent === null`（確認`display:none`真的隱藏）；點擊按鈕後攔截到的複製內容為`"SELECT PTF_GROUP_LEVEL FROM QSYS2.GROUP_PTF_INFO WHERE PTF_GROUP_NAME = 'SF99704'"`，正確的SQL文字。
   - **第4項**：7.4版本輸入Level=9999（極高值，確保無blocked項目），摘要顯示「225 / 225」且解鎖清單區塊顯示`🎉 目前PTF等級已可支援篩選範圍內全部 225 個服務，無需升級`；複製報告文字同步包含此訊息，不再是空白。額外測試既有「部分可用」情境（7.4+Level=1）確保新增的`else if`分支沒有影響原本邏輯：摘要正確顯示「80/225，升級到Level 4可再解鎖18個」，解鎖清單18筆，跟獨立Python腳本掃描全庫的結果（Level 4門檻共18筆）完全一致。
   - **第5項**：展開`QSYS2.ADD_DEVICE_LOCKING_POLICY`的PTF對照表，固定顯示4列：`7.6 Base`、`7.5 需PTF SF99950 Level 3起可用`、`7.4 需PTF SF99704 Level 23起可用`、`7.3 不支援`——原本消失的7.3列現在明確標示「不支援」。
7. CDP驅動腳本(`cdp-drive.js`)與情境檔(`scenarios.json`)為本次驗證臨時產物，寫在系統scratchpad目錄（session-scoped temp，非專案目錄），驗證完成後已刪除，不留在repo裡。
8. 未使用`.claude/settings.json`裡尚未commit的異動（新增`Bash(tasklist *)`），維持原樣，等使用者下次commit時一併處理（見plan文件「尚待使用者回覆」段落，非本輪範圍）。
