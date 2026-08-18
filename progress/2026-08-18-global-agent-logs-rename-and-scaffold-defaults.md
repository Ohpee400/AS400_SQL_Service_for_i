# 全域規則改名(_agent_logs→agent_logs) + project-scaffold skill預設內容調整（執行記錄）

對應計畫：[[2026-08-18-global-agent-logs-rename-and-scaffold-defaults]]。使用者approve後執行。

**範圍聲明：本次異動全部發生在`C:\Users\clarkyun\.claude\`底下（全域CLAUDE.md + 個人skill），`AS400_SQL_Service_for_i`專案本身未被異動**，這份記錄純粹是本次session的工作軌跡存檔。

## 本輪動作範圍

允許修改：
- `C:\Users\clarkyun\.claude\CLAUDE.md`
- `C:\Users\clarkyun\.claude\skills\project-scaffold\scripts\scaffold.js`
- `C:\Users\clarkyun\.claude\skills\project-scaffold\SKILL.md`
- `C:\Users\clarkyun\.claude\skills\project-scaffold\references\checklist.md`

不修改：本專案(`AS400_SQL_Service_for_i`)內任何檔案。

## 本次計畫怎麼做

1. 全域`CLAUDE.md`第10條3處`_agent_logs`→`agent_logs`（純文字取代）。
2. `scaffold.js`核心mkdirp清單新增`["agent_logs"]`（空資料夾，不預塞errors.md/checkpoints.md）；`AGENTS.md`預設內容追加4個通用化規則章節（計畫先行、不遺漏使用者提出的事項、動手前記錄、唯讀查證模式），並依使用者要求拿掉「簡短計畫」的「簡短」二字，改成「計畫詳細程度對應任務複雜度」的表述；同步修正結尾console.log訊息，反映AGENTS.md不再只是純stub。
3. `SKILL.md`：frontmatter description節點清單補上`agent_logs`；「Never pre-fill」原則段落補上AGENTS.md 4條規則的明確例外說明（並註明不得當作濫用先例）。
4. `checklist.md`：「Core nodes」新增`agent_logs`節點說明，並解釋跟被拒絕的頂層`memory/`在概念上的差異（稽核軌跡 vs 跨session教訓）。

## 結果

- 全域CLAUDE.md：`grep -n "_agent_logs"`確認**無殘留**；`grep -n "agent_logs"`確認3處(第60/62/69行)都已改名成功。
- `scaffold.js`：實際在暫存目錄(`scratchpad/scaffold-verify-test`)跑`node scaffold.js <path> --skills --llms-txt --src`驗證：
  - 目錄樹裡出現空的`agent_logs/`資料夾（跟`plans/`、`progress/`同層）。
  - 讀取產出的`AGENTS.md`，確認4個新章節文字正確寫入，且「計畫先行」章節已採用使用者要求的「計畫詳細程度應對應任務的實際複雜度，不要為了『簡短』而省略掉該有的分析」措辭，不是原本的「簡短計畫」。
  - 驗證完畢後已用`rm -rf`清掉暫存測試目錄，不留殘留。
- `SKILL.md`、`checklist.md`：純文件更新，人工覆核內容通順、沒有跟既有段落矛盾（尤其確認`agent_logs/`跟「Explicitly rejected: 頂層memory/」那段的區分寫得夠清楚，避免未來誤刪）。
- 未執行：沒有額外對本專案(`AS400_SQL_Service_for_i`)做任何檔案異動，符合範圍聲明。
