#!/usr/bin/env python3
"""PreToolUse hook：Bash專用，強制擋下複合指令(compound command)。

背景：Claude Code的permission allow規則是逐一比對複合指令裡的每一段子指令
(用 && || ; | |& & 換行 分隔)，只要有任何一段沒有對應規則，整個複合指令
就要跳出核准視窗——即使其中一段本身已經在白名單裡。這支專案的AI agent
反覆把「清暫存檔的rm -f」或「cd」跟已白名單的固定腳本串在同一次Bash呼叫，
導致核准視窗一直跳出來。

這支hook的做法不是「提醒」或「建議」，是在Bash指令真正執行前，直接偵測
是否含有頂層(不在引號內)的複合指令分隔符，一旦偵測到就用exit code 2
強制擋下，逼呼叫端(AI agent)拆成多次獨立的Bash呼叫——不依賴AI agent
「記得」要拆開，是結構上不給它機會犯這個錯。

用法：由 .claude/settings.json 的 PreToolUse hook 設定呼叫，
stdin傳入Claude Code的hook JSON payload，讀取 tool_input.command 檢查。
"""
import json
import sys

# Claude Code自己承認的複合指令分隔符（跟官方文件Compound commands一節一致）
# 依長度由長到短排序，避免 "&" 提前比對掉 "&&"、"|" 提前比對掉 "||"/"|&"
SEPARATORS = ["&&", "||", "|&", ";", "|", "&"]


def find_top_level_separator(command: str):
    """掃描指令字串，找出第一個「不在引號內」的複合指令分隔符或換行。
    回傳 (分隔符文字, 出現位置) 或 None。邏輯比照本專案 kbEngine.js 的
    formatSql() 引號狀態掃描器：逐字元追蹤是否在單引號/雙引號內。
    """
    in_single = False
    in_double = False
    i = 0
    length = len(command)
    while i < length:
        ch = command[i]

        if in_single:
            if ch == "'":
                in_single = False
            i += 1
            continue
        if in_double:
            if ch == "\\" and i + 1 < length:
                i += 2
                continue
            if ch == '"':
                in_double = False
            i += 1
            continue

        if ch == "'":
            in_single = True
            i += 1
            continue
        if ch == '"':
            in_double = True
            i += 1
            continue
        if ch == "\n":
            return ("換行", i)

        for sep in SEPARATORS:
            if command[i : i + len(sep)] == sep:
                return (sep, i)

        i += 1

    return None


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        # 讀不到/解析不出payload時不擋，交還一般permission流程判斷
        sys.exit(0)

    command = (payload.get("tool_input") or {}).get("command", "")
    if not command:
        sys.exit(0)

    hit = find_top_level_separator(command)
    if hit is None:
        sys.exit(0)

    sep, pos = hit
    context = command[max(0, pos - 30) : pos + 30]
    print(
        "偵測到複合指令(分隔符: {sep})，本專案政策禁止Bash呼叫裡串接多個子指令，"
        "不論每一段本身是否已在permission白名單內。\n"
        "出現位置附近內容: ...{context}...\n"
        "請拆成多次獨立的Bash呼叫，一次只送出一件事"
        "（例如：清暫存檔一次呼叫、實際查證動作再另一次呼叫，不要用 && "
        "或換行接在一起）。".format(sep=sep, context=context),
        file=sys.stderr,
    )
    sys.exit(2)


if __name__ == "__main__":
    main()
