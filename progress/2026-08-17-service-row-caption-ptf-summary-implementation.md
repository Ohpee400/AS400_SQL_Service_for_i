# service列小字說明改成PTF門檻摘要 — 動手前記錄

最後更新：2026-08-17。對應計畫：`plans/2026-08-17-service-row-caption-ptf-summary.md`。

## 任務

把`.svc-cat`目前顯示的`service.category`（跟分組標題/分類色點重複）換成「最低可用版本＋是否需PTF」的一句話摘要，重用既有`versionFloorIndex`/`versionListAscending`邏輯。

## 已知限制

- 這是這次UI/UX回饋清單裡先前被hooks討論岔開、沒有即時建檔追蹤的項目，本次補上正式plan/progress記錄。
- 純前端渲染調整，不影響`src/data/*.json`與`npm test`既有16項迴歸測試。

## 本次計畫怎麼做

1. 新增helper函式計算floor版本＋是否需PTF的摘要字串。
2. 修改HTML/CSS：`.svc-cat`改名`.svc-req`，內容改用新helper輸出。
3. `npm test`→`npm run build`→`bash scripts/headless-check.sh`→headless Chrome抽查實際渲染文字。
4. 補這份記錄的結果段落。

## 本輪動作範圍

允許修改：`scripts/build-kb-html.js`、`outputs/kb.html`（僅透過`npm run build`產生）。

## 結果

- 新增`floorRequirementLabel(service)`helper，重用既有`versionFloorIndex`/`versionListAscending`，找出該service實際最低可用版本(floor)，查該版本在`ptfTable`裡`base`欄位，組成「{版本}+（原生支援）」或「{版本}+（需PTF）」。
- `.svc-cat`（顯示`service.category`，跟分組標題/分類色點重複）改名`.svc-req`，內容改用`floorRequirementLabel(service)`輸出；CSS樣式沿用原本位置/字級/顏色，只改class名稱與內容來源。
- 驗證：`node --check`語法通過 → `npm test`16/16 pass → `npm run build`成功 → `bash scripts/headless-check.sh`確認「共 258 筆」不變 → 用headless Chrome dump-dom抽查前15筆實際渲染文字，確認「原生支援」與「需PTF」兩種情境都正確出現（例如`QSYS2.OBJECT_LOCK_INFO`顯示「7.3+（原生支援）」、`QSYS2.JOB_LOCK_INFO`顯示「7.3+（需PTF）」），且`svc-cat`殘留數量為0 → 截圖確認視覺呈現正常，分組標題與小字說明不再重複顯示分類。
- 已清除本次驗證用的暫存截圖與腳本檔。

## 追加修正（使用者指正後）

使用者指出理解錯誤：不是要把計算出的「floor版本＋PTF需求」資料摘要印出來，而是要一句**引導點擊展開**的提示文字（因為完整OS/PTF明細本來就在點擊展開後看得到，小字這行的功能是「告訴使用者可以點開看」，不是「先幫使用者算好結果」）。

- 移除`floorRequirementLabel()`helper（不再需要）。
- `.svc-req`文字改為固定字串「查看 OS/PTF 需求」，顏色從`var(--muted)`改成`var(--accent)`（藍字），視覺上更像可互動提示而非純資訊文字。
- 重新驗證：`node --check`語法通過→`npm test`16/16 pass→`npm run build`成功→截圖確認畫面呈現「查看 OS/PTF 需求」藍字提示，每列一致、簡短。
