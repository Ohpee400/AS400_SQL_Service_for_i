# PTF升級效益報告（取代/補強per-row比對的商業價值）

最後更新：2026-08-18。分支：`feature/ptf-group-paste`。對應討論：使用者指出目前per-row的Level比對徽章「經濟價值不足」（因為點OS chip就已經看得到門檻，多打一個數字只省一個心算步驟），決定把重心從「逐列比對」轉成「升級效益摘要報告」。

## 問題

現有實作只在每一列旁顯示打勾/需升級，資訊量沒有比「點OS chip看門檻」高多少，沒有回答一個決策者真正關心的問題：「我值不值得排時間去升級PTF」。

## 已查明的資料現況（實際跑程式驗證）

- 以7.6版本(`SF99960`)為例，掃描全庫後：Level 2門檻的service有10個、Level 3門檻的有15個——代表「下一個門檻能解鎖多少service」這個數字是有意義、會隨等級變化的，不是空話。
- 沿用既有`servicePtfLevelStatus()`/`extractMinLevel()`/`PTF_GROUP_BY_VERSION`，不需要新的資料來源。

## 實作方向

### A. 摘要報告區塊
在`ptf-level-panel`裡，使用者輸入合法Level後，額外顯示一段摘要（不需要另外的區塊，直接接在輸入框下方）：
- 「目前可使用 X / N 個相關service」（N=目前篩選結果中，在選中版本有ptfTable row的service數；X=其中status為available的數量）。
- 若有blocked(status=needs-ptf)的service：找出其中`minLevel`最小值當作「下一個門檻」，列出「升級到 Level {門檻} 可再解鎖 {count} 個」，並列出這些service名稱清單。
- 若沒有blocked的（已經是能力範圍內最高等級，或全部available）：顯示「目前等級已可使用全部相關service」。
- 若有status=unknown（無法解析門檻）的，另外用一行單獨提示筆數，不混進主要統計，避免誤導。

### B. 複製報告
提供「複製報告」按鈕，把上述摘要文字（含被解鎖的service清單）組成純文字複製到剪貼簿，方便使用者貼到內部文件/信件去申請PTF維護時段。

### C. 計算範圍
以目前**篩選後**的清單(`lastRenderedList`)為準，不是整個258筆固定不變——如果使用者先篩了分類/類型/關鍵字，報告會反映「目前畫面看到的這些」，摘要文字裡要清楚寫出這是不是全庫（例如加註「(依目前篩選條件)」）。

### D. per-row徽章去留
維持既有per-row徽章（掃描列表時還是有輔助價值），但不再是這個功能的主要賣點，UI上摘要報告要比per-row徽章更顯眼(擺在上方、字體更大)。

## 查詢面/欄位盤點

不新增/修改services.json資料結構，純前端運算+新的彙總邏輯。

## 本輪動作範圍

分支：`feature/ptf-group-paste`。允許修改：`scripts/build-kb-html.js`、`outputs/kb.html`（僅透過`npm run build`重新產生）。

驗證方式：`npm test`→`npm run build`→`headless-check.sh`→用真實資料情境實測（7.6版本、Level=1時應顯示「升級到Level 2可解鎖10個」；Level=2時應顯示「升級到Level 3可解鎖15個」），確認數字與清單正確、複製按鈕功能正常。
