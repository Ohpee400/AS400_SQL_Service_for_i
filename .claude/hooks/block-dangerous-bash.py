#!/usr/bin/env python3
"""PreToolUse hook：Bash專用，取代block-compound-bash.py。

背景：本專案的permissions.allow改成預設允許所有Bash指令(裸"Bash"規則)，
換取重複性、非敏感指令不再需要每次手動授權。作為交換條件，這支hook是
唯一的事前防線，逐段掃描指令(含複合指令的每一段)，只攔截明確、已知的
破壞性操作，其餘一律放行。

規則清單直接對應本專案AI agent既有行為準則(系統提示的Git Safety Protocol)
定義的破壞性操作分類，不是另外發明的範圍：
1. rm/del 同時帶遞迴+強制旗標，且目標不是全部落在安全前綴之內
2. git push --force / -f / --force-with-lease
3. git reset --hard
4. git clean 帶強制旗標
5. git checkout / git restore 接 . 或 -- (丟棄工作目錄變更，非切換分支)
6. git branch -D
7. --no-verify / --no-gpg-sign / -c commit.gpgsign=false
8. 用單一 > (非>>) 截斷式重導向寫入關鍵資料檔

用法：由 .claude/settings.json 的 PreToolUse hook 設定呼叫，
stdin傳入Claude Code的hook JSON payload，讀取 tool_input.command 檢查。
"""
import json
import re
import sys

SEPARATORS = ["&&", "||", "|&", ";", "|", "&"]

SAFE_RM_PREFIXES = (
    "temp/",
    "__pycache__",
    "node_modules",
    "dist/",
    "build/",
)

PROTECTED_OVERWRITE_TARGETS = (
    "src/data/services.json",
    "src/data/templates.json",
    ".claude/settings.json",
)


def split_subcommands(command: str):
    """依複合指令分隔符(不在引號內的才算)切成子指令清單，
    跟 audit-bash.py 的引號狀態掃描器邏輯一致。"""
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


def check_rm(tokens):
    if tokens[0] not in ("rm", "del"):
        return None
    flags = "".join(t for t in tokens[1:] if t.startswith("-") and not t.startswith("--"))
    long_flags = [t for t in tokens[1:] if t.startswith("--")]
    has_recursive = "r" in flags or "R" in flags or "--recursive" in long_flags
    has_force = "f" in flags or "--force" in long_flags
    if not (has_recursive and has_force):
        return None
    targets = [t for t in tokens[1:] if not t.startswith("-")]
    if targets and all(any(t.replace("\\", "/").startswith(p) or p in t.replace("\\", "/") for p in SAFE_RM_PREFIXES) for t in targets):
        return None
    return "偵測到 rm/del 遞迴+強制刪除，且目標不全在安全前綴(temp/、__pycache__、node_modules、dist/、build/)內"


def check_git(tokens):
    if tokens[0] != "git":
        return None
    rest = tokens[1:]
    if not rest:
        return None
    sub = rest[0]

    if sub == "push":
        if any(t in ("--force", "-f", "--force-with-lease") for t in rest[1:]):
            return "偵測到 git push --force/-f/--force-with-lease"
    if sub == "reset":
        if "--hard" in rest[1:]:
            return "偵測到 git reset --hard"
    if sub == "clean":
        for t in rest[1:]:
            if t.startswith("-") and not t.startswith("--") and "f" in t:
                return "偵測到 git clean 帶強制旗標"
            if t == "--force":
                return "偵測到 git clean --force"
    if sub in ("checkout", "restore"):
        if any(t == "." or t == "--" for t in rest[1:]):
            return "偵測到 git checkout/restore 接 . 或 --，判斷為丟棄工作目錄變更"
    if sub == "branch":
        if "-D" in rest[1:]:
            return "偵測到 git branch -D 強制刪除分支"
    return None


def check_skip_verification(tokens, full_segment):
    if "--no-verify" in tokens or "--no-gpg-sign" in tokens:
        return "偵測到 --no-verify 或 --no-gpg-sign，禁止跳過hook/簽章"
    if re.search(r"-c\s+commit\.gpgsign=false", full_segment):
        return "偵測到 -c commit.gpgsign=false，禁止停用簽章"
    return None


def check_overwrite(full_segment):
    m = re.search(r"(?<!>)>(?!>)\s*([^\s]+)", full_segment)
    if not m:
        return None
    target = m.group(1).strip("'\"")
    target_norm = target.replace("\\", "/")
    for protected in PROTECTED_OVERWRITE_TARGETS:
        if target_norm.endswith(protected):
            return f"偵測到用單一 > 截斷式重導向覆寫關鍵資料檔: {target}"
    return None


def check_segment(segment: str):
    stripped = segment.strip()
    if not stripped:
        return None
    tokens = stripped.split()
    if not tokens:
        return None

    for check_fn in (check_rm, check_git):
        reason = check_fn(tokens)
        if reason:
            return reason

    reason = check_skip_verification(tokens, stripped)
    if reason:
        return reason

    reason = check_overwrite(stripped)
    if reason:
        return reason

    return None


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

    for segment in split_subcommands(command):
        reason = check_segment(segment)
        if reason:
            print(
                "已擋下這次Bash呼叫：{reason}。\n"
                "這類操作屬於本專案定義的破壞性動作，需要使用者在對話中明確授權後，"
                "自行執行或另外調整這支hook，不會被AI agent自動放行。".format(reason=reason),
                file=sys.stderr,
            )
            sys.exit(2)

    sys.exit(0)


if __name__ == "__main__":
    main()
