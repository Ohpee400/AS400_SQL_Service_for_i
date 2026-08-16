# Hooks重構：預設允許Bash＋PreToolUse擋危險操作

最後更新：2026-08-17。對應使用者在權限/hook討論後選擇的方向：「選項B：預設允許Bash＋hook擋危險操作」。

## 問題/需求清單

1. 現有`.claude/settings.json`是「預設prompt＋10條narrow allow規則」模式，任何沒被列進allow清單的指令都要手動授權，不管風險高低——不符合使用者「非敏感、重複性高的不要煩我，真的有疑慮的才擋」的期待。
2. 現有`block-compound-bash.py`會強制擋下所有複合指令逼AI拆成多次呼叫，官方文件證實Claude Code現在原生就支援複合指令拆解與逐段記憶核准，這支hook的原始立案依據（GitHub issue #67947"not planned"）很可能是舊版行為，在新模式下這支hook反而變成不必要的額外阻力。
3. `audit-bash.py`稽核紀錄先前被查出整個session沒在運作（詳見對話記錄的診斷），需要使用者自行重開session驗證hot-reload是否生效，這部分我方無法代為觸發。
4. `.gitignore`未排除`.claude/settings.local.json`（官方慣例這是個人授權紀錄，不該進版控）。

## 已查明的根本原因（查證依據見對話記錄，非猜測）

- 官方文件（[Configure permissions](https://code.claude.com/docs/en/permissions)）明確給出建議模式：「add "Bash" to your allow list and register a PreToolUse hook that rejects those specific commands」——這正是選項B。
- 官方文件證實：「A hook that exits with code 2 stops the tool call before permission rules are evaluated」——hook擋下優先於allow規則，即使加了裸`"Bash"`，hook照樣能擋。
- 官方文件證實複合指令的原生拆解機制：「Claude Code saves a separate rule for each subcommand that requires approval...Up to 5 rules may be saved for a single compound command」，佐證`block-compound-bash.py`的立案依據可能已過時。

## 修復方向

### A. `.claude/settings.json`
- `permissions.allow`新增裸的`"Bash"`規則（現有10條narrow規則保留不動，變成備註性質，不刪除）。
- `hooks.PreToolUse`：移除`block-compound-bash.py`的註冊（選項B下複合指令不再需要強制拆分，且新的危險偵測hook會逐段掃描複合指令的每一段，不會漏掉夾帶在複合指令裡的危險操作）。改註冊新的`block-dangerous-bash.py`。
- `hooks.PostToolUse`：`audit-bash.py`維持註冊（在「預設允許」模式下，稽核紀錄的重要性不減反增，是主要的事後可視性機制）。

### B. 新增 `.claude/hooks/block-dangerous-bash.py`（PreToolUse，取代block-compound-bash.py）
沿用專案既有的引號感知子指令切割邏輯（跟`audit-bash.py`的`split_subcommands`一致寫法），對複合指令的**每一段**分別檢查以下規則，命中任一條就`exit 2`擋下並說明原因：

1. `rm`／`del`同時帶遞迴(`-r`/`-R`/`--recursive`)＋強制(`-f`/`--force`)旗標，且目標路徑不是全部落在安全前綴（scratchpad暫存目錄、`__pycache__`、`node_modules`、`dist/`、`build/`）之內。
2. `git push`帶`--force`／`-f`／`--force-with-lease`。
3. `git reset --hard`。
4. `git clean`帶強制旗標（`-f`/`-fd`/`-fdx`等）。
5. `git checkout`／`git restore`後面接`.`或`--`（判斷為丟棄工作目錄變更的用法，非切換分支）。
6. `git branch -D`（強制刪除分支）。
7. `--no-verify`／`--no-gpg-sign`／`-c commit.gpgsign=false`（跳過hook或簽章）。
8. 用單一`>`（非`>>`）截斷式重導向寫入`src/data/services.json`／`src/data/templates.json`／`.claude/settings.json`。

以上清單直接對應本次對話系統提示裡既有的「Git Safety Protocol」定義的破壞性操作分類，不是另外發明新規則，只是把AI agent原本就該遵守的行為準則，用技術手段在「預設允許」模式下做成硬性防線。

### C. 其他
- `.gitignore`補上`.claude/settings.local.json`。
- 是否保留或移除`block-compound-bash.py`檔案本體：改為不在settings.json註冊（即不再生效），檔案先保留在`.claude/hooks/`目錄不刪除，避免誤刪還在參考的邏輯；如使用者之後確認不需要可另外清理。

## 查詢面/欄位盤點

不涉及services.json/templates.json，純設定與hook腳本異動，不需要查詢面欄位盤點。

## 本輪動作範圍

允許修改：`.claude/settings.json`、新增`.claude/hooks/block-dangerous-bash.py`、`.gitignore`。不刪除`block-compound-bash.py`檔案本體，只解除註冊。

驗證方式：確認`.claude/settings.json`為合法JSON、`node --check`類等效的python語法檢查跑過新hook腳本、列出最終allow清單與hooks註冊內容供使用者複核；hot-reload是否生效需使用者自行重開session驗證，非本輪可驗證項目。
