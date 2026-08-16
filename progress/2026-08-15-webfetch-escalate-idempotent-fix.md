# webfetch-escalate.sh 內建清舊檔修正 — 記錄

最後更新：2026-08-15。

## 任務

Batch 7執行過程中，多次因為把「清暫存檔的`rm -f`」跟「已在permission白名單的`bash scripts/webfetch-escalate.sh ...`」用`&&`或換行串在同一次Bash呼叫裡，導致整個複合指令因為`rm -f`那段沒有對應規則而整串卡住核准視窗（Claude Code的Bash權限比對規則：`&&`/`||`/`;`/`|`/`|&`/`&`/換行都會被拆成獨立子指令逐一比對，見[官方文件](https://code.claude.com/docs/en/permissions)「Compound commands」一節）。

使用者不接受「以後我自己記得拆開呼叫」這種靠行為記憶的解法（等同這次出包的成因本身），要求把清舊檔動作直接寫進腳本內部，結構性排除掉「呼叫端還要外接rm」這件事的發生可能。

## 已知限制

- 只有`scripts/webfetch-escalate.sh`有這個問題。另外3支腳本(`pdf-search.py`的dump模式用`open(path,'w')`會自動截斷覆寫、`headless-check.sh`的截圖跟dump-dom都是Chrome/shell redirect直接覆寫、`roster-mark-added.py`用`open(path,'w')`覆寫roster.json)本身輸出都是「每次呼叫都完整覆寫目標檔案」，從未需要呼叫端額外`rm -f`，不需要比照修改。

## 本次做了什麼

修改`scripts/webfetch-escalate.sh`：在參數檢查之後、真正呼叫scrapling之前，加一行`rm -f "$OUT"`（冪等操作，目標檔案不存在也不會報錯），並加註解說明「呼叫端不應該在呼叫本腳本前額外接一段rm -f，那樣會讓複合指令因為rm那段沒有permission規則而整串卡住」。內部原本在「升級fetch前」的那段`rm -f "$OUT"`保留不動（那是同一次執行內部get→fetch切換用的，跟外部呼叫端的問題無關）。

## 驗證

1. `bash -n scripts/webfetch-escalate.sh`語法檢查通過。
2. 測試1：正常單次呼叫（`bash scripts/webfetch-escalate.sh <url> <輸出檔案>`，目標檔案原本不存在），確認正常取得內容(54行)。
3. 測試2（關鍵測試）：**故意在呼叫前手動寫入一段垃圾文字到目標輸出檔案路徑，模擬「上一輪失敗留下的舊檔」，然後不加任何外部`rm -f`、直接單獨呼叫腳本**，確認：
   - 腳本內建的`rm -f`正確清掉了垃圾內容（`grep -c "STALE_GARBAGE"`結果為0）
   - get→fetch升級流程正常運作、抓到真實內容(`grep -c "EKM"`結果為10)
   - 全程只用了**一次**Bash呼叫，沒有任何`rm`/`cd`需要外接，不會再觸發複合指令卡住核准視窗的問題

測試通過後已清除測試用的暫存檔案。

## 效果

往後查證流程遇到需要重試/清舊檔的情境，只需要單獨呼叫`bash scripts/webfetch-escalate.sh <url> <輸出檔案>`一行，不再需要（也不應該）額外接`rm -f`或`cd`——這是結構性排除掉問題，不依賴之後每次操作時是否記得規則。
