# 全域規則改名(_agent_logs→agent_logs) + project-scaffold skill預設內容調整

最後更新：2026-08-18。**範圍聲明：本計畫的異動對象是全域`C:\Users\clarkyun\.claude\CLAUDE.md`與個人skill`C:\Users\clarkyun\.claude\skills\project-scaffold\`，不觸碰`AS400_SQL_Service_for_i`專案本身任何檔案**（本專案的`CLAUDE.md`/`AGENTS.md`/`.claude/rules/`維持現狀不動）。計畫檔放在本專案`plans/`只是延續本次session的工作記錄慣例，不代表對本專案有實際異動。**這份計畫尚未執行，等待使用者確認方向。**

## 背景/決策脈絡

- Q1：使用者決定把`_agent_logs`改名成`agent_logs`（去底線），全域CLAUDE.md第10條與project-scaffold skill要同步改，避免skill建出的資料夾名稱跟全域規則寫死的路徑對不上。
- Q2-a：已查證（透過claude-code-guide subagent核對官方文件`code.claude.com/docs/en/memory.md`）`.claude/rules/*.md`（無`paths:`前置資料）確實會每個session自動載入，效力跟CLAUDE.md同級——這點不需要額外動作。
- Q2-b：Bob/Antigravity的檔名慣例使用者自行查證，這輪不處理。
- Q2-c：4點規則（計畫先行、不遺漏使用者提出的事項、動手前記錄、唯讀查證模式）的通用化版本要寫進`AGENTS.md`預設內容，取代目前形同虛設的4行stub；`CLAUDE.md`維持現有精簡定位（只放Claude Code專屬behavior）不動。

## 已查明的現況（已實際讀取檔案確認，非猜測）

- 全域`C:\Users\clarkyun\.claude\CLAUDE.md`第10條，`_agent_logs`出現3處：第60行(資料夾自動建立說明)、第62行(`_agent_logs/errors.md`)、第69行(`_agent_logs/checkpoints.md`)。
- `project-scaffold`skill目前3個檔案完全沒有`agent_logs`這個節點：
  - `scripts/scaffold.js`第46-61行的核心節點清單只有`.claude/{rules,agents,hooks}`、`docs/*`、`specs`、`plans`、`progress`、`outputs/*`、`scripts`、`temp`，沒有`agent_logs`。
  - `SKILL.md`第3行frontmatter description列出的節點清單(`AGENTS.md, CLAUDE.md, .claude/rules|skills|agents|hooks, specs, plans, progress, docs, outputs, tests, temp`)沒有`agent_logs`。
  - `references/checklist.md`「Core nodes」段落(13-50行)沒有`agent_logs`的說明。
- `scaffold.js`第73-78行`AGENTS.md`預設內容目前只有4行通用meta敘述，沒有任何實質規則；已在本專案(AS400_SQL_Service_for_i)實測驗證：`AGENTS.md`確實長期維持0 bytes、`.claude/rules/`資料夾確實長期是空的——所有規則歷來都被塞進`CLAUDE.md`，證實現有stub形同虛設，這是這次要改的直接動機。
- `_agent_logs`機制在本專案從未觸發過（已查證：檔案系統不存在、7個commit的git歷史裡`git log --all --diff-filter=A --name-only`查無任何相關檔案），改名不影響任何現有已產生的資料，風險低。

## 修復/實作方向

### A. 全域CLAUDE.md改名
第60、62、69行的`_agent_logs`全部改成`agent_logs`（純文字取代，前後邏輯不變）。

### B. `scaffold.js`新增`agent_logs`核心節點
- 第46-61行的核心mkdirp清單加入`["agent_logs"]`，維持空資料夾。
- **不**預塞`errors.md`/`checkpoints.md`檔案：這兩份是append-only事件記錄，沒事件發生前沒內容可寫，預塞headers只是staleness filler，違反skill自己「Never pre-fill placeholder content」的原則；資料夾本身是空的，符合「empty folders are ~free」，不衝突。
- 不加進`.gitignore`（比照`plans/`、`progress/`不排除版控，這是要保留的稽核軌跡）。

### C. `SKILL.md`同步文件
frontmatter description的節點清單補上`agent_logs`。

### D. `checklist.md`補上`agent_logs`節點說明
在「Core nodes」段落新增一條：
- 用途：對應全域`~/.claude/CLAUDE.md`第8-10條「失敗停損機制」，存放`errors.md`(停損觸發時的完整錯誤/嘗試記錄)、`checkpoints.md`(回滾檢查點的人話說明)。
- 跟現有「Explicitly rejected: 頂層`memory/`」那條的差異講清楚：`memory/`被拒絕是因為跟`.claude/rules/`(跨session教訓/規則)功能重疊；`agent_logs/`是不同概念——「執行失敗事件的稽核軌跡」，不是「教訓/規則」，兩者不衝突。
- 預設空資料夾，內容只在真的觸發停損機制時才寫入；即使某個環境沒跑過這次更新的scaffold版本，全域規則本身也有「資料夾不存在時AI自動建立」的fallback，兩邊不互斥。

### E. `scaffold.js`的AGENTS.md預設內容改成4條通用規則
- 保留原本開頭的4行簡短說明。
- 追加4個小節，內容從本專案`CLAUDE.md`既有的4段規則抽象成跨工具通用版本（拿掉「TodoWrite」這種Claude Code專屬詞彙，改用「待辦追蹤機制」等通用講法；拿掉「outputs/kb.html」這種本專案專屬例子）。
- 這是刻意偏離skill自己「Never pre-fill placeholder content」原則的**明確例外**，範圍僅限這4條——不代表往後可以隨意增加其他預設內容，之後再擴充需要新的明確理由，不能拿這次當先例濫用。

## 附錄：AGENTS.md新預設內容草稿（供確認，非最終定案）

```
# AGENTS.md
Shared, cross-tool rules (Claude, Gemini, etc. all read this convention). Keep this lean — static
facts an agent needs on every task (build/test commands, style, hard
boundaries). Do not duplicate content the agent can already discover on its
own (e.g. a file tree it can just list).

## 計畫先行（Plan-first）
面對跨多檔案或邏輯複雜的任務，動手實作前先產出一份計畫（要做的步驟清單、已查明的根本原因、對應的修復或實作方向），使用者確認方向後才開始寫程式碼。計畫的詳細程度應對應任務的實際複雜度，不要為了「簡短」而省略掉該有的分析——這條規則要每次真的落地成文件執行，不能因為任務看起來簡單就跳過。

## 不遺漏使用者提出的事項
使用者在同一則訊息或跨多輪對話中提出多件事時，不能只處理當下被直接問到的那一件，其餘事項要嘛一併處理，要嘛在回覆裡明確列出「這件事還沒處理」並問清楚是否要現在做。每一件待處理事項都要留下記錄（待辦追蹤機制或計畫文件），不能只靠對話當下的印象判斷「晚點再說」。每次回覆結束前，檢查是否有先前記錄、使用者還沒鬆口說可以不用做的事項，主動提及目前狀態。

## 動手前記錄
只要是實作項目（寫入/修改任何檔案，不限於程式碼），一律要有執行記錄：動手前建立、完成後補上結果段落（做了什麼、依據哪次查證取得的實際資料、驗證方式）。這是預設行為，不需要使用者每次提醒才啟動。

## 唯讀查證模式
使用者說「僅能回覆/禁止實作」時，代表只做唯讀查證與回報，不寫入任何檔案，需等待使用者明確說可以動手才能寫入。
```

## 影響範圍確認

- 修改：`C:\Users\clarkyun\.claude\CLAUDE.md`（全域，影響使用者所有專案）
- 修改：`C:\Users\clarkyun\.claude\skills\project-scaffold\scripts\scaffold.js`
- 修改：`C:\Users\clarkyun\.claude\skills\project-scaffold\SKILL.md`
- 修改：`C:\Users\clarkyun\.claude\skills\project-scaffold\references\checklist.md`
- **不修改**：`AS400_SQL_Service_for_i`專案內任何檔案（含`CLAUDE.md`、`AGENTS.md`、`.claude/rules/`）——維持現狀，本次成果只影響「未來新建立的專案」。

## 驗證方式

- 全域CLAUDE.md：改完後`grep -n "_agent_logs\|agent_logs"`確認3處都已改名、沒有殘留舊名稱。
- `scaffold.js`：在暫存目錄實際跑一次`node scaffold.js <暫存路徑>`，確認產出的目錄樹裡有空的`agent_logs/`、`AGENTS.md`內容包含4個新章節、其餘既有節點(plans/progress/等)行為不變。
- 因為`_agent_logs`從未在任何已知專案觸發過寫入，這次改名不影響現有已產生資料，風險低。
