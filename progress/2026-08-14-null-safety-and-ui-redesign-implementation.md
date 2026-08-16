# 進度記錄：NULL安全性修復 + 主畫面UI重新規劃 實作

## 動手前記錄

- **日期**：2026-08-14
- **任務**：依 `plans/2026-08-14-null-safety-and-future-proofing.md` 與 `plans/2026-08-14-main-ui-redesign.md` 兩份計畫，使用者已確認「兩份都要做」，開始實作。
- **本輪允許寫入**：`src/data/services.json`、`src/data/templates.json`、`scripts/build-kb-html.js`、`docs/data-schema.md`。
- **範圍邊界**：3筆未驗證service（`object_lock_info`／`systablestat`／`ifs_object_statistics`）的 `ptfInfo` 維持文字形式，不勉強套用新的 `ptfTable` 結構化schema。`object_lock_info` 的table function語法bug仍不在本輪範圍。

## 結果（完成後更新）

### NULL安全性修復
- `user_info_check`：`daysUntilExpire`／`daysSinceLastSignon` 改用「哨兵值自我比對」寫法（`OR '{參數}' = '999999'`／`OR '{參數}' = '0'`），OR右側只比較參數字串跟寫死的預設值文字，不再觸及 `DAYS_UNTIL_PASSWORD_EXPIRES`／`PREVIOUS_SIGNON` 真實欄位，徹底解決使用者實測到的0筆問題。
- `large_table_check`：`minSizeMb` 比照同樣手法（`OR '{minSizeMb}' = '0'`），防範 `SYSTABLESTAT.DATA_SIZE` 未經驗證是否可為NULL的風險。
- `output_queue_check`：`createdBefore` 改用「代入後的運算式比對CURRENT_TIMESTAMP關鍵字」寫法（`OR {createdBefore} = CURRENT_TIMESTAMP`，不加引號），因為這個參數的值本身可能是完整的 `TIMESTAMP('...')` 運算式，不能再套用文字型的引號比對（會產生巢狀引號語法錯誤），這是跟前兩者不同的變體寫法。
- 移除「大小寫皆可輸入，系統會自動轉為大寫再查詢」的表單提示文字（`.hint` CSS也一併清掉，避免留下沒用到的樣式）。
- `docs/data-schema.md` 新增完整的Pattern A（文字類OR trick）／Pattern C（數值運算式類哨兵自比對，含兩種變體）說明，加上「為什麼不能直接比對真實欄位」的NULL排除機制解說、「新增欄位前查證Nullable」的規則、以及「離線Node測試測不出這類bug」的誠實限制說明，供之後新增/擴充service時對照。

### 主畫面UI重新規劃
- `services.json`：7筆已驗證service的 `ptfInfo` 全部改成結構化的 `ptfTable`（每版本一列，`base`/`enhanced`），查不到的PTF編號直接留空字串，不再寫「原文如此」「未列出」這類替代說明文字。3筆未驗證的維持原本的 `ptfInfo` 自由文字（`SYSTABLESTAT` 沒有官方Services對照表可拆表格，`OBJECT_LOCK_INFO`/`IFS_OBJECT_STATISTICS` 同理），兩種欄位在同一筆資料裡互斥、不重複。`asp_info` 原本額外的 `versionNotes` 欄位拿掉，改用 `ptfTable` 裡 `base:false` 那一列直接表達7.3版本的例外，不需要額外的說明文字。
- `docs/data-schema.md` 補上 `ptfTable` 的schema說明與範例。
- `scripts/build-kb-html.js` 卡片渲染整個重構：常駐顯示只留「名稱/分類/一句話說明/已核實徽章/產生SQL按鈕」，OS版本、PTF資訊（表格或文字）、版本例外提示全部收進「顯示規格詳情 ▾」收合區塊，預設收起——沿用表單那邊已經做好的收合互動模式，沒有另外設計一套新元件。PTF表格用真正的HTML `<table>`，`base:false` 的列用不同顏色標示「需PTF」。

## 驗證

1. `node -c scripts/build-kb-html.js` 語法檢查、`node -e "JSON.parse(...)"` 兩份JSON語法檢查、`npm test`（12項）、`npm run build` 全部通過。
2. 寫了 `scratchpad/verify_kb4.js`，針對這輪的核心修復逐一斷言：
   - `user_info_check`／`large_table_check`／`output_queue_check` 在「完全不填任何欄位」的狀態下，產生的SQL裡OR trick的右側都是「參數自己跟寫死常數比較」（用正規表達式明確檢查 `OR '999999' = '999999'`／`OR '0' = '0'` 這種恆真寫法有出現），不是碰真實欄位——這是這次NULL bug真正被繞開的關鍵證明，不是只驗證SQL語法長得對。
   - 使用者真的填了門檻值時，OR右側正確變成恆假（`'7' = '999999'`），左側真實篩選條件仍正常運作。
   - `output_queue_check` 用上一輪同款的「模擬含秒datetime-local值」情境重新測過一次，確認新寫法下沒有重蹈四段式時間字串的覆轍。
   - `ptfTable` 結構檢查：7筆已驗證service都有4列資料、都不殘留舊的 `ptfInfo` 欄位；3筆草稿維持 `ptfInfo`／沒有 `ptfTable`；所有 `enhanced` 欄位都掃過一次確認沒有殘留「原文如此」「未列出」這類替代文字。
   - 全部斷言通過，無FAIL訊息。
3. headless Chrome dump-dom：10張卡片、10個「顯示規格詳情」收合按鈕、7個PTF表格（對應7筆已驗證service）都正確渲染；大小寫提示文字、PTF替代說明文字在畫面上都確認完全不存在；stderr無錯誤。
4. **仍未做到**：實際點擊「顯示規格詳情」展開收合、確認表格视觉呈現是否符合預期，這部分同樣需要使用者在瀏覽器裡實際操作確認，本機沒有互動式瀏覽器自動化工具。

## 待你協助複測

- 點開「顯示規格詳情」確認PTF表格的視覺呈現是否符合你要的「獨立且對等」，尤其 `ASP_INFO` 那筆7.3版本「需PTF」的呈現方式。
- `USER_INFO` 查詢這次改完後，麻煩重新在SQL client跑一次確認真的不再是0筆（用完全不填任何欄位的狀態）。
- 整體卡片列表現在是否比之前清爽好掃視。
