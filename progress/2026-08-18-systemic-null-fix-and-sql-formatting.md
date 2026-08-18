# 全面稽核CALL陳述式NULL風險 + 複製SQL多行排版優化（執行記錄）

對應計畫：[[2026-08-18-systemic-null-fix-and-sql-formatting]]

## 本輪動作範圍

允許修改：`src/lib/kbEngine.js`(`formatSql`)、`src/data/templates.json`(5個模板：`add_iscsi_target_call`、`change_iscsi_target_call`、`remove_iscsi_target_call`、`change_objectconnect_call`、`add_tracked_job_queue_call`)、`tests/unit/kbEngine.test.js`(新增測試)、`outputs/kb.html`(僅透過`npm run build`)。

## 本次計畫怎麼做

1. 用腳本掃描全部258筆模板，篩「Procedure類型+CALL陳述式+具名參數用NULLIF/CAST/CASE包住」，人工核對官方文件排除假陽性後，對9個真候選（5個模板）套用`end_jobs`已驗證的`[paramName:...]`條件式子句省略語法。
2. `kbEngine.js`的`formatSql`新增：逗號後面緊接`NAME => `具名參數寫法時，不論括號深度都換行(縮排依深度遞增)；既有的depth===0固定2格縮排行為完全不動。
3. `tests/unit/kbEngine.test.js`新增2則測試：CALL陳述式具名參數列表正確換行縮排、`CAST(x AS DECIMAL(21,0))`型別宣告裡的逗號不會被誤斷。

## 結果

- `npm test`：19/19 pass（17則既有+2則新增，既有測試全部維持原本斷言不變，確認沒有回歸）。
- 對9處異動的5個模板，逐一用`fillTemplate`+`formatSql`核對「留空」「填值」兩種情境：
  - 留空時：對應的數值參數整段不出現在SQL裡(不是NULL，是完全省略)。
  - 填值時：正確帶入該數值，且整段SQL自動換行、依括號深度縮排，不再是一整條長字串。
- `npm run build` → `headless-check.sh`：258筆不變。
- `formatSql`改動範例（`add_iscsi_target_call`填值後）：
  ```
  CALL QSYS2.ADD_ISCSI_TARGET(TARGET_NAME => 'iqn.test',
      TARGET_HOST_NAME => '1.2.3.4',
      TARGET_PORT => 3260,
      INITIATOR_NAME => NULLIF('', ''),
      INITIATOR_CHAP_NAME => NULLIF('', ''),
      INITIATOR_CHAP_SECRET => NULLIF('', ''))
  ```
- 這次的`formatSql`排版改進對**全部258筆服務**的「產生SQL」/「產生CALL指令」輸出都生效（已確認`build-kb-html.js`第1001行`sqlOutput.textContent = KBEngine.formatSql(sql)`是實際套用在使用者看到/複製的輸出上），不是只有這5個模板受益。
