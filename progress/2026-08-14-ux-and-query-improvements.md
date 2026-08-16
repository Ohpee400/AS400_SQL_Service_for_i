# 進度記錄：UI/UX優化 + 大小寫處理 + 查詢面擴充 實作

## 動手前記錄

- **日期**：2026-08-14
- **任務**：使用者確認三項改善方向並要求開始實作：
  1. `plans/2026-08-14-ui-ux-optimization.md` 既有4項（拓寬版面/字體放大/多欄卡片/OS版本PTF拆欄位）+ 這輪討論新增的建議（Swagger風格參數表、progressive disclosure、reset按鈕、分類篩選chip）
  2. 大小寫：不限制使用者輸入，但代入SQL前依欄位性質轉大寫（IFS路徑除外，使用者實測過大小寫都能正確查到，不轉）
  3. 查詢面過窄：用「所有可客製化欄位都顯示+給預設值」+ progressive disclosure（常用欄位常駐、其餘收合）解決；技術做法用「字串代換OR trick」`(COL = '{x}' OR '{x}' = '')` 不改kbEngine.js核心比對邏輯；timestamp類參數同時做「相對天數」與「進階datetime-local選擇器」兩種
- **範圍邊界**：`object_lock_info` 的 table function 語法已知有bug（見 `plans/2026-08-14-outstanding-tasks.md` 第1項），這輪**不修正**該SQL本體語法，只對它的既有3個表單參數加上大寫轉換（正交、不涉及語法對錯）。`ifs_object_statistics` 的參數簽名也仍標記未驗證，這輪不擴充它的篩選欄位，避免疊加未查證的假設。
- **本輪允許寫入**：`src/lib/kbEngine.js`、`src/data/services.json`、`src/data/templates.json`、`scripts/build-kb-html.js`、`plans/2026-08-14-ui-ux-optimization.md`（補記決議）、`tests/unit/kbEngine.test.js`（補測試）。完成後 `npm test` + `npm run build` + 瀏覽器驗證。

## 技術設計筆記（供之後維護參考）

- **大小寫**：`kbEngine.js` 的 `fillTemplate()` 新增 `param.upper` 旗標，true則代入前 `.toUpperCase()`。逐參數控制，不對整段SQL字串做無差別轉換，保留未來個別欄位不轉大寫的彈性（例如IFS路徑）。
- **選填篩選(OR trick)**：文字欄位用 `(COL = '{x}' OR '{x}' = '')`；數值欄位若是直接比對用 `CHAR(COL)` 轉字串再比對避免留空時語法斷裂（`COL = ` 語法錯誤）；若參數是內嵌在運算式中（如 `CURRENT_TIMESTAMP - {days} DAYS`），OR trick會讓左式在留空時仍是無效語法，改用「安全的數值預設值」讓算式恆成立（例如 `daysSinceLastSignon` 預設 `0` 使 `PREVIOUS_SIGNON < CURRENT_TIMESTAMP - 0 DAYS` 恆真，等同不篩選）。
- **進階datetime-local**：`createdBefore` 這類絕對時間點篩選，預設值設成語法上永遠有效但邏輯上恆真的極端值（`9999-12-31 23:59:59`），不用OR trick；表單用原生 `<input type="datetime-local">`，送出時把 `YYYY-MM-DDTHH:mm` 轉成 `YYYY-MM-DD HH:mm:00` 再代入 `TIMESTAMP('{x}')`，轉換邏輯放在 `build-kb-html.js` 表單收值那段（`param.type === 'datetime-local'` 分支），`kbEngine.js` 保持通用不需要知道這個格式細節。
- **progressive disclosure**：`templates.json` 每個 param 新增選填的 `advanced: true`，表單渲染時沒標記的參數常駐顯示、有標記的收在「顯示更多N個進階選項」收合區。
- **已知殘留限制**：`netstat_check` 的 `state` 參數維持既有預設值 `'LISTEN'`（有意義的預設查詢，非純占位），因為 `fillTemplate` 目前的邏輯是「留空一律fallback到default」，沒有區分「使用者故意清空」跟「使用者沒填」，所以這個欄位沒辦法透過清空來達到「查詢全部狀態」——這是既有引擎設計的限制，這輪不特別改架構解決，其餘新增的選填欄位預設值都設為真正的空字串所以不受影響。

## 結果（完成後更新）

- **`src/lib/kbEngine.js`**：`fillTemplate()` 新增 `param.upper` 支援，逐參數轉大寫，不動其他函式。`tests/unit/kbEngine.test.js` 補一組測試驗證這個行為。`npm test` 12項全過。
- **`src/data/services.json`**：10筆的 `minOsVersion` 都改成乾淨的版本號短字串（如 `7.3+`），把「已核對官方對照表...」這類驗證過程說明移除（改由 `verified` 徽章+`docSearchHint`傳達）；`ptfInfo` 只留PTF本身資訊。`ASP_INFO` 7.3非Base的例外仍保留在 `minOsVersion`/`ptfInfo` 裡（是實質資料而非填充文字，沒有移除）。
- **`src/data/templates.json`**：10組模板都重新設計：
  - 大小寫：識別字類參數（library/object/subsystem/user/status...）都加 `upper:true`；IFS路徑刻意不加（尊重使用者實測）。
  - 查詢面擴充：除了已知語法有bug的 `object_lock_check`（維持原SQL骨架不動，只加upper）與參數仍未驗證的 `large_ifs_check`（沒擴充新欄位），其餘8組都用OR trick把更多已核對過的欄位開放成選填篩選（留空=不篩選），必填欄位大幅減少。
  - Progressive disclosure：新增的次要欄位標記 `advanced:true`，共9組模板有進階欄位（1~4個不等），`system_status_check`本身無可篩選欄位維持0參數。
  - Timestamp：`user_info_check` 用「相對天數」（`daysSinceLastSignon`，預設0=不篩選，安全避免留空時算式語法斷裂）；`output_queue_check` 用「進階datetime-local」（`createdBefore`，預設極端未來時間戳9999-12-31當「不篩選」的安全預設值）。
- **`scripts/build-kb-html.js`**：CSS改寬版面(1320px)、基礎字級16px、`#service-list`改CSS Grid多欄卡片、OS版本改成tag樣式、新增分類篩選chip列；JS新增 `renderCategoryChips()`+`applyFilters()`（關鍵字+分類雙重篩選並存）、表單改成Swagger風格的欄位列（label+說明在左、輸入框在右）、常駐/進階欄位分兩區塊+「顯示更多N個進階選項」收合按鈕、「重設為預設值」按鈕、`datetime-local`輸入類型支援與送出時的格式轉換。
- **`docs/data-schema.md`**：補充 `upper`/`advanced`/`type` 三個新param屬性的說明，以及OR trick的寫法教學（含數值/運算式/datetime-local三種變體的安全預設值處理方式），供之後維護者依循同樣模式擴充。
- **驗證**：
  1. `npm test`（12項含新增的upper測試）+ `npm run build` 都成功。
  2. 寫了 `scratchpad/verify_kb2.js` 直接呼叫 `kbEngine.js` 的 `fillTemplate`/`getMissingParams`，逐一斷言驗證：(a) 小寫輸入正確轉大寫、IFS路徑正確不轉；(b) OR trick留空時產生恆真條件、有填時正確代入且轉大寫；(c) 數值/運算式類參數的安全預設值產生語法合法的SQL（`CURRENT_TIMESTAMP - 0 DAYS`、`TIMESTAMP('9999-12-31 23:59:59')`）；(d) 模擬 `datetime-local` 表單值轉換邏輯正確；(e) 10組模板的進階欄位分組數量; (f) 必填參數缺漏偵測仍正常。全部斷言通過，無FAIL訊息。
  3. 用本機Chrome `--headless=new --dump-dom` 開啟 `outputs/kb.html`，確認：10張service卡片、9個分類chip都正確渲染，stderr無錯誤訊息——由於這幾行渲染碼是整個IIFE執行到最後兩行才會跑到，能跑到代表前面所有函式定義/資料嵌入都沒有語法錯誤。
  4. **仍未做到**的是實際點擊互動（點卡片按鈕開表單、點進階選項展開、點重設、複製SQL），原因同上一輪：本機沒有Playwright/chromium-cli等瀏覽器自動化工具可用。表單組裝與事件綁定的程式碼邏輯已人工覆查，行為預期跟已驗證過的 `fillTemplate`/`getMissingParams` 邏輯一致，但沒有做到真正的瀏覽器互動點擊驗證。

## 已知殘留限制（誠實記錄，未修正）

- `netstat_check` 的 `state` 欄位無法透過清空來達到「查詢全部狀態」（見上方「技術設計筆記」，是 `fillTemplate` 留空一律fallback到default的既有限制，這輪沒有動架構解決）。
- `object_lock_info` 的table function語法bug、`ifs_object_statistics` 的參數簽名驗證，仍待 `plans/2026-08-14-outstanding-tasks.md` 處理，這輪沒有觸碰。
