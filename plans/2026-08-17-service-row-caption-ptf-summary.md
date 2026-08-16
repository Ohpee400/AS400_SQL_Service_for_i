# service列小字說明改成PTF門檻摘要

最後更新：2026-08-17。對應使用者回饋：「service下方不要顯示跟分組/分類標籤重複的分類文字，PTF需求資訊也很重要，請提供合適描述」，以及後續澄清：「點擊該列本來就會展開完整OS/PTF表格，只是要把小字那行換成更合適的描述而已」。

## 問題

`scripts/build-kb-html.js`的`renderServiceList()`裡，每個service名稱下方的小字（`.svc-cat`）目前直接印`service.category`，跟左側分類色點、（未鎖定分類時的）分組標題三處重複同一件事，資訊沒有新增價值。

## 已查明的現況

- 點擊整列本來就會展開`detail-row`，裡面`buildDetailHtml()`已經完整顯示`minOsVersion`文字與逐版本的PTF對照表（`buildPtfTableHtml`），所以小字這行**不需要**、也不應該嘗試塞下完整PTF明細，那是展開後才要看的資訊。
- 小字這行的定位應該是「不用展開就能看到的一句話摘要」，且不能跟分類重複。
- 專案已有現成的最低可用版本(floor)計算邏輯可重用：`versionListAscending`（版本由舊到新排序）＋`versionFloorIndex(service)`（找出該service實際最低可用版本在陣列中的索引）。

## 修復方向

新增一個小helper，從`versionFloorIndex`算出的floor版本，查`service.ptfTable`裡對應那個版本的`base`欄位，組出一句話：
- floor版本`base:true` → 顯示「{版本}+（原生支援）」
- floor版本`base:false`（只能靠Enhanced PTF） → 顯示「{版本}+（需PTF）」

取代`.svc-cat`目前印`service.category`的部分；CSS class沿用位置與樣式，但改名為`.svc-req`（語意上不再是分類，而是版本需求摘要），避免命名誤導。

## 查詢面/欄位盤點

不涉及services.json/templates.json資料異動，純渲染邏輯調整，不需要查詢面欄位盤點。

## 本輪動作範圍

允許修改：`scripts/build-kb-html.js`、`outputs/kb.html`（僅透過`npm run build`重新產生）。

驗證方式：`npm test`確認既有迴歸測試不受影響 → `npm run build` → `bash scripts/headless-check.sh`確認筆數不變 → 用headless Chrome dump-dom抽查幾筆不同minOsVersion情境（全原生/floor需PTF）的實際渲染文字是否符合預期。
