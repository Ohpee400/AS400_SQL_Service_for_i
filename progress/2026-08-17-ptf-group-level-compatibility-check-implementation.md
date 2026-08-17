# PTF Group Level相容性檢查 — 動手前記錄

最後更新：2026-08-17。分支：`feature/ptf-group-paste`。對應計畫：`plans/2026-08-17-ptf-group-level-compatibility-check.md`，使用者回覆「了解繼續吧」確認實作。

## 任務

依計畫在`scripts/build-kb-html.js`實作：①OS版本chip選中後顯示Level輸入框+動態SQL複製提示；②純前端判斷邏輯(PTF_GROUP_BY_VERSION對照、解析enhanced欄位第一個Level數字、7筆已知無法解析的誠實降級)；③`.svc-req`提示文字依比對結果狀態化(綠/橘/灰三色徽章)。

## 已知限制

- 純前端運算，不改`src/data/services.json`資料結構，只讀取既有`ptfTable`欄位。
- 只在`feature/ptf-group-paste`分支動作，不影響`master`。
- 7筆已知「官方未列PTF編號」的service(server_sbs_routing/server_share_info/set_server_sbs_routing/job_info/user_storage的特定版本)必須顯示「需人工確認」，不能誤判成可用或需PTF。

## 本次計畫怎麼做

1. 新增PTF_GROUP_BY_VERSION對照表＋Level輸入框UI＋動態SQL提示。
2. 新增判斷邏輯函式(含解析enhanced欄位、7筆已知邊界案例的優雅降級)。
3. 修改`.svc-req`渲染邏輯，依是否啟用Level比對切換顯示內容。
4. `npm test`→`npm run build`→`bash scripts/headless-check.sh`→headless Chrome實測：已知可解析案例(剛好等於門檻/低於門檻兩種情境)+7筆已知無法解析案例，確認顯示正確。
5. 補這份記錄的結果段落。

## 本輪動作範圍

分支：`feature/ptf-group-paste`。允許修改：`scripts/build-kb-html.js`、`outputs/kb.html`（僅透過`npm run build`產生）。不動`master`、不動`src/data/*.json`。

## 結果

### 實作內容
- HTML：OS版本chip列下方新增`ptf-level-panel`（顯示目前選中版本對應的PTF Group名稱、Level輸入框、動態SQL查詢提示+複製按鈕），只在有選OS版本時顯示。
- JS：新增`PTF_GROUP_BY_VERSION`固定對照表、`extractMinLevel()`(解析enhanced欄位第一個Level數字)、`servicePtfLevelStatus()`(三態判斷：available/needs-ptf/unknown)、`currentPtfUserLevel()`、`updatePtfLevelPanel()`、`svcReqLabel()`(依是否啟用Level比對切換`.svc-req`顯示內容)。
- CSS：新增`--success`色票、`.svc-req`三種狀態色(綠/橘/灰)、`.ptf-level-panel`樣式。

### 過程中發現並修正一個真實bug（非測試腳本問題，過程完整記錄如下）
- 第一輪驗證（`npm test`/`npm run build`/`headless-check.sh`都通過）後，用headless Chrome實際模擬選OS版本+輸入Level，發現**全部rows一律顯示「⚠ 官方未列PTF編號，需人工確認」**，不管輸入什麼Level值。
- 追查過程：先用Node.js直接測試`extractMinLevel`/`servicePtfLevelStatus`的邏輯本身，用真實`services.json`資料驗證完全正確（能正確解析出`SF99704 Level 23`並回傳`minLevel:23`）——證明「邏輯設計」沒問題。
- 進一步在**shipped的`outputs/kb.html`裡直接印出`extractMinLevel`函式的原始碼**，發現實際內容是`/Levels*(d+)/`——`\s`跟`\d`的反斜線不見了！
- 根本原因：`scripts/build-kb-html.js`的`buildHtml()`用一個**外層JS template literal(反引號字串)包住整個HTML頁面**，我新寫的regex `/Level\s*(\d+)/`是以「一般文字」的形式直接寫在這個外層template literal裡——`\s`、`\d`不是JS字串/template literal認得的跳脫字元，在**build腳本自己執行時**就被吃成純字母`s`、`d`，等HTML被寫出來時，regex早就已經壞了。這個bug在`npm test`（不涉及regex實際執行比對）、`npm run build`（純字串產出、不检查regex語意）、`headless-check.sh`（只看筆數）都測不出來，只有**實際模擬使用者操作、比對輸出結果是否符合預期**才抓得到。
- 修正：把regex改成`/Level\\s*(\\d+)/`（雙重跳脫），讓outer template literal吃掉一層反斜線後，shipped出來的HTML裡regex才是正確的`/Level\s*(\d+)/`。已用`grep`直接確認修正後`outputs/kb.html`裡的regex字面值正確。

### 修正後的完整驗證（全部用真實headless Chrome模擬使用者操作，非單純程式碼審閱）
- **needs-ptf情境**：選7.4+、輸入Level=22（門檻是23）→ `QSYS2.ADD_DEVICE_LOCKING_POLICY`正確顯示橘色「需 SF99704 Level 23+」。
- **available（比對後）情境**：同上但輸入Level=23（等於門檻）→ 正確顯示綠色「✓ 可直接使用」。
- **available（base原生）情境**：`QSYS2.NVME_INFO`在7.4版本`base:true`，輸入Level=22時仍正確顯示「✓ 可直接使用」，不受使用者輸入影響。
- **unknown情境**：由於實際掃描過全庫258筆資料，目前沒有「base=false且enhanced文字無法解析出Level數字」的真實案例(唯一7筆看似無法解析的row其實都是`base:true`，會被base檢查提前攔截，不會走到unknown分支)——這點已誠實記錄在對話與此檔案中，不假裝有真實案例測過。改用**與shipped程式碼完全一致的函式本體**在Node.js直接測試兩種會觸發unknown的情境(enhanced文字無法解析／查無對應版本row)，兩者都正確回傳`{status:'unknown'}`，確認這個分支的程式邏輯正確，只是目前資料集裡沒有真實觸發案例。
- 最終完整迴歸：`npm test`16/16 pass、`npm run build`成功、`bash scripts/headless-check.sh`確認「共 258 筆」不變。
- 已清除本次除錯過程產生的全部暫存測試檔案。

### 給未來的提醒
往後任何要寫進`scripts/build-kb-html.js`裡`buildHtml()`回傳的template literal內、屬於「頁面實際執行的JS」的regex或字串，只要用到`\d`、`\s`、`\w`、`\b`等反斜線跳脫字元，都要**雙重跳脫**(`\\d`等)，否則會在build階段被靜默吃掉且不會有任何錯誤訊息，只能靠實際跑起來比對行為才抓得到。
