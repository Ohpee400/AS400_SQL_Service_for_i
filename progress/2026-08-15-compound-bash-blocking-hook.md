# 複合指令強制攔截 PreToolUse Hook — 記錄

最後更新：2026-08-15。

## 背景

Batch 7、Batch 8A查證過程中，我(AI agent)連續3次把「清暫存檔`rm -f`」或「`cd`」跟已在permission白名單的固定腳本用`&&`/換行串在同一次Bash呼叫裡，導致整個複合指令因為`rm -f`/`cd`那段沒有規則而整串跳出核准視窗——即使我已經先修過`scripts/webfetch-escalate.sh`讓它內建清舊檔，我後續在其他情境(PTF擷取的`python3 -c`)還是重蹈覆轍。

使用者明確拒絕接受任何形式的「我以後會記得/會注意」，要求換成不依賴AI agent意圖、記憶力或意願的機制——即使AI「忘記」或「不想」都必須確保結果正確。這對應到Claude Code官方文件的一句話：「Permission rules are enforced by Claude Code, not by the model. Instructions in your prompt or CLAUDE.md shape what Claude tries to do, but they don't change what Claude Code allows.」——CLAUDE.md規則跟我的承諾本質上都只是「意圖」，不是「強制」；唯一在我的意圖失效時仍然生效的機制是`PreToolUse` hook。

## 做了什麼

### 1. 新增 `.claude/hooks/block-compound-bash.py`

邏輯：
- 從stdin讀Claude Code傳入的hook JSON payload，取出`tool_input.command`
- 逐字元掃描該指令字串，用跟本專案`kbEngine.js`的`formatSql()`一樣的「引號狀態掃描器」手法，追蹤是否在單引號/雙引號內
- 只要偵測到**不在引號內**的複合指令分隔符（`&&`、`||`、`|&`、`;`、`|`、`&`、換行——跟Claude Code官方文件列的分隔符完全一致），就印出說明到stderr、**exit code 2**——這是唯一會讓Claude Code在核准流程開始前就直接擋下整次工具呼叫的方式，不是跳出詢問視窗，是直接失敗
- 沒有偵測到複合指令分隔符時exit 0，交還一般permission流程處理（不影響原本4支腳本的白名單機制）

### 2. 修改 `.claude/settings.json`

在`hooks`底下加了`PreToolUse`設定，`matcher: "Bash"`，指向這支腳本。這是專案層級設定，只在這個專案目錄下生效。

## 驗證

**單元測試（5案例，模擬stdin payload直接測試腳本邏輯）全數通過**：
1. 單純的白名單腳本呼叫 → exit 0(放行)
2. `bash scripts/webfetch-escalate.sh "https://...?topic=x&y=z" out.md`（URL query string裡有`&`，容易誤判的情境）→ exit 0（正確辨識`&`在雙引號內，沒有誤擋）
3. `cd "..." && rm -f out.md` → exit 2(擋下)，訊息正確標示分隔符是`&&`
4. 換行分隔的複合指令 → exit 2(擋下)
5. `grep foo file.txt | wc -l`(pipe) → exit 2(擋下)

**誠實回報一個尚未完全確認的部分**：我另外用真正的Bash工具在目前這個session裡送出一個明確的複合指令(`echo "test1" && echo "test2"`)做端對端測試，**結果沒有被擋下、指令正常執行完畢**。單元測試證明腳本邏輯本身正確，但這代表hook設定目前在「這個已經開著的session」裡還沒有實際生效——推測是Claude Code的hook設定在session一開始就載入、中途修改`.claude/settings.json`不會立即套用到當下這個session，需要重新開一個session(或這個session重啟)才會真正掛上去。**這件事我沒辦法自己驗證到底，需要使用者重啟session後自己找個複合指令實測一次確認。**

## 待你確認

請重啟這個Claude Code session（或開新session）後，隨意送一個複合指令（例如`pwd && ls`）測試看看是否會被hook擋下、跳出「偵測到複合指令」的錯誤訊息，而不是正常執行或跳出核准視窗。確認生效後這份記錄會補一行結果。

---

## 後續更新（同日，發現PreToolUse hook對cd這個情境有結構性限制）

實測`cd "..." && python -c "..."`這種組合又跳出核准視窗（跟前面修過的問題同一類），使用者要求上網查GitHub跟其他權威來源查證業界做法，而不是繼續憑我自己猜測。

### 查證發現（有來源、非猜測）

1. **[GitHub issue #67947](https://github.com/anthropics/claude-code/issues/67947)**（官方repo，已結案為「not planned」）：Claude Code對「`cd`+其他指令」這種組合，有一個**內建的複合指令偵測器**，這個偵測器的檢查時機**在`permissions.allow`規則比對之前、也在`PreToolUse` hook執行之前**。原文：「The check appears to fire before permissions.allow is consulted and before PreToolUse hooks run, so neither admins nor users can carve out exceptions for safe shapes.」——**代表任何第三方hook(包含我寫的`block-compound-bash.py`)對這個特定情境都沒有介入機會，這是Claude Code官方架構本身的限制，官方明確表態不打算修。**
2. **[GitHub issue #30524](https://github.com/anthropics/claude-code/issues/30524)**：Windows + Git Bash環境下(就是我們目前的環境)，Claude Code對工作目錄的比對用字面字串比對而非路徑正規化比對(`D:\path`跟`D:/path`跟`/d/path`這三種Git Bash視為等價的寫法會被誤判成不同路徑)，會額外觸發不必要的cd——這點目前查到的資料沒有官方修復進度。

### 結論（跟使用者換位思考討論後定案）

`PreToolUse` hook**對cd相關情境不能保證有效**，這是誠實的技術結論，不是還沒寫好。真正的解法分兩層：

1. **消除誘因**：這個專案的Bash工具本身工作目錄整個session都會維持，`cd`從頭到尾沒有存在的必要性。往後規則：**任何情境都不使用cd，牽涉專案外路徑一律用完整絕對路徑當參數直接傳遞**，不透過cd切換目錄。
2. **事前防不了，補事後看得到（稽核，不是攔截）**：新增`PostToolUse` hook `.claude/hooks/audit-bash.py`，在每次Bash呼叫**執行完之後**（不受內建偵測器的優先權影響，因為是不同的hook事件、在指令跑完後才觸發）：
   - 把每次Bash呼叫的指令內容跟退出碼記錄到`.claude/bash-audit.log`，累積成看得見的紀錄，不會無聲無息發生
   - 只要偵測到任何一段子指令是`cd`(用跟`block-compound-bash.py`同一套引號感知的複合指令切分邏輯，避免誤判路徑字串裡剛好出現"cd"或`cdrecord`這種命令名稱)，用exit code 2讓提醒文字直接出現在我自己的對話脈絡裡，並在log裡標記`[違規:含cd]`

已在`.claude/settings.json`的`hooks.PostToolUse`註冊。

### 驗證

單元測試(模擬stdin payload，3案例全通過)：
1. 不含cd的正常指令 → exit 0，log正常寫入、無違規標記
2. `cd "..." && rm -f out.md` → exit 2，log標記`[違規:含cd]`，stderr提醒文字正確印出
3. 邊界案例`cdrecord --version`(指令名稱剛好以cd開頭但不是cd本身) → exit 0，正確沒有誤判

直接讀取`.claude/bash-audit.log`確認前兩筆紀錄內容正確（時間戳記、exit code、違規標記都符合預期）。

### 誠實的殘留風險

跟`PreToolUse` hook一樣，**這支`PostToolUse` hook的cd偵測是「事後才知道」，沒辦法在cd真的被誤用之前擋下來**——這是根據GitHub官方issue確認過的架構限制，不是我不想做到事前攔截。真正杜絕cd的做法終究要回到「往後任何Bash呼叫都不使用cd」這個行為規則本身，hook只是確保這件事被違反時「一定會被記錄、一定會被提醒」，不是保證不會發生。
