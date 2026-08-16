#!/usr/bin/env python3
"""PostToolUse hook：Bash專用，稽核用途（不是攔截）。

背景：查證GitHub issue後確認Claude Code對「cd+其他指令」這種複合型態，
內建偵測器會搶在permissions.allow跟PreToolUse hook之前跳出核准視窗，
第三方機制(包含這個專案的block-compound-bash.py)對這個特定情境
無法保證攔得住(官方issue #67947已結案為not planned)。

既然事前防不了，這支hook退而求其次做「事後一定看得到」：
1. 把每一次Bash呼叫(指令內容、退出碼)記錄到稽核log，不會無聲無息發生。
2. 只要偵測到任何一段子指令是cd，用exit code 2讓提醒文字直接出現在
   Claude自己的對話脈絡裡(不是攔截，但很難被忽略)——本專案政策是
   任何情境都不使用cd(工作目錄本來就會維持，牽涉專案外路徑一律用
   絕對路徑當參數傳遞，不透過cd切換)。

用法：由 .claude/settings.json 的 PostToolUse hook 設定呼叫。
"""
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

LOG_PATH = Path(__file__).resolve().parent.parent / "bash-audit.log"

# 跟 block-compound-bash.py 用同一套分隔符規則切子指令
SEPARATORS = ["&&", "||", "|&", ";", "|", "&"]


def split_subcommands(command: str):
    """依複合指令分隔符(不在引號內的才算)切成子指令清單，邏輯跟
    block-compound-bash.py 的引號狀態掃描器一致。"""
    segments = []
    current = []
    in_single = False
    in_double = False
    i = 0
    length = len(command)
    while i < length:
        ch = command[i]

        if in_single:
            current.append(ch)
            if ch == "'":
                in_single = False
            i += 1
            continue
        if in_double:
            if ch == "\\" and i + 1 < length:
                current.append(ch)
                current.append(command[i + 1])
                i += 2
                continue
            current.append(ch)
            if ch == '"':
                in_double = False
            i += 1
            continue

        if ch == "'":
            in_single = True
            current.append(ch)
            i += 1
            continue
        if ch == '"':
            in_double = True
            current.append(ch)
            i += 1
            continue
        if ch == "\n":
            segments.append("".join(current))
            current = []
            i += 1
            continue

        matched_sep = None
        for sep in SEPARATORS:
            if command[i : i + len(sep)] == sep:
                matched_sep = sep
                break
        if matched_sep:
            segments.append("".join(current))
            current = []
            i += len(matched_sep)
            continue

        current.append(ch)
        i += 1

    segments.append("".join(current))
    return segments


CD_PATTERN = re.compile(r"^\s*cd(\s|$)")


def contains_cd(command: str) -> bool:
    for seg in split_subcommands(command):
        if CD_PATTERN.match(seg):
            return True
    return False


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        sys.exit(0)

    if payload.get("tool_name") != "Bash":
        sys.exit(0)

    command = (payload.get("tool_input") or {}).get("command", "")
    if not command:
        sys.exit(0)

    exit_code = (payload.get("tool_response") or {}).get("exit_code", "")
    timestamp = datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")
    has_cd = contains_cd(command)

    flag = "[違規:含cd] " if has_cd else ""
    log_line = "[{ts}] {flag}exit={exit} command={cmd}\n".format(
        ts=timestamp, flag=flag, exit=exit_code, cmd=command.replace("\n", "\\n")
    )

    try:
        with open(LOG_PATH, "a", encoding="utf-8") as f:
            f.write(log_line)
    except Exception:
        pass

    if has_cd:
        print(
            "稽核提醒：剛剛這次Bash呼叫含有cd。本專案政策是任何情境都不使用cd"
            "（工作目錄本來就會維持，牽涉專案外路徑請直接用絕對路徑當參數傳遞）。"
            "已記錄到 .claude/bash-audit.log，請留意不要再次發生。",
            file=sys.stderr,
        )
        sys.exit(2)

    sys.exit(0)


if __name__ == "__main__":
    main()
