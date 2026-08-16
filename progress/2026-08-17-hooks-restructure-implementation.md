# Hooks重構：預設允許Bash＋擋危險操作 — 動手前記錄

最後更新：2026-08-17。對應計畫：`plans/2026-08-17-hooks-default-allow-bash-with-danger-block.md`，使用者已透過AskUserQuestion選擇「選項B」確認方向。

## 任務

依計畫：①`.claude/settings.json`加裸`"Bash"`allow規則、解除`block-compound-bash.py`註冊、改註冊新的`block-dangerous-bash.py`；②新增`block-dangerous-bash.py`實作8條危險操作偵測；③`.gitignore`補`.claude/settings.local.json`。

## 已知限制

- hot-reload是否生效無法在本輪驗證，需使用者自行重開session。
- 危險偵測規則直接對應系統提示既有的Git Safety Protocol定義，不是另外發明範圍。
- `block-compound-bash.py`檔案本體保留不刪除，只解除settings.json裡的註冊。

## 本次計畫怎麼做

1. 新增`.claude/hooks/block-dangerous-bash.py`。
2. 修改`.claude/settings.json`：hooks.PreToolUse移除block-compound-bash.py、加入block-dangerous-bash.py；permissions.allow新增`"Bash"`。
3. 修改`.gitignore`補`.claude/settings.local.json`。
4. 驗證JSON合法性、python語法檢查、列出最終設定內容供使用者複核。
5. 補這份記錄的結果段落。

## 本輪動作範圍

允許修改：`.claude/settings.json`、新增`.claude/hooks/block-dangerous-bash.py`、`.gitignore`。

## 結果

- 新增`.claude/hooks/block-dangerous-bash.py`：PreToolUse hook，逐段掃描複合指令(沿用`audit-bash.py`的引號感知切割邏輯)，命中以下任一條就`exit 2`擋下：①`rm`/`del`同時帶遞迴+強制旗標且目標不全在安全前綴(`temp/`、`__pycache__`、`node_modules`、`dist/`、`build/`)內；②`git push --force`/`-f`/`--force-with-lease`；③`git reset --hard`；④`git clean`帶強制旗標；⑤`git checkout`/`git restore`接`.`或`--`；⑥`git branch -D`；⑦`--no-verify`/`--no-gpg-sign`/`-c commit.gpgsign=false`；⑧單一`>`截斷式重導向覆寫`src/data/services.json`/`src/data/templates.json`/`.claude/settings.json`。
- 驗證：`python3 -m py_compile`語法通過；用`subprocess`實際跑24組測試案例(涵蓋每條規則各1組"應擋"+1組"應放行"的對照，例如`git checkout .`應擋但`git checkout main`/`git checkout -b`應放行、`rm -rf src/`應擋但`rm -rf temp/foo`應放行)，**全部24組結果符合預期**，包含複合指令案例(`ls -la && rm -rf .git`能正確擋在第二段)。
- 修改`.claude/settings.json`：`hooks.PreToolUse`從`block-compound-bash.py`改指向`block-dangerous-bash.py`(`block-compound-bash.py`檔案本體保留在`.claude/hooks/`目錄，只是不再被註冊生效)；`hooks.PostToolUse`維持`audit-bash.py`不變；`permissions.allow`在原有10條規則後新增裸的`"Bash"`規則。用python重新讀取確認JSON合法、hook路徑與allow清單內容如預期。
- 修改`.gitignore`補上`.claude/settings.local.json`。
- **未驗證項目**：hot-reload是否對這次修改生效，需使用者重新開一個新session，觀察`.claude/bash-audit.log`是否開始持續累積新紀錄來確認；這部分非本輪可代為驗證。
