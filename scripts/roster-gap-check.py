"""
全量比對 roster.json 與官方IBM i Services目錄(outputs/webfetch/ibm-i-services-sql.html)，
確認有沒有服務存在於官方目錄、但roster.json裡沒有。

做法：解析官方HTML裡全部 <tr> 列，抓每一列第一個 <td> 儲存格的純文字，
比對是否符合 SCHEMA.NAME 格式（不限定schema白名單，避免像SYSPROC那樣被排除在外）；
排除非服務列（章節標題、外部文件連結列）後，跟roster.json的name欄位做集合差集比對。

用法：
  python scripts/roster-gap-check.py
"""
import re
import json
from html import unescape

HTML_PATH = "outputs/webfetch/ibm-i-services-sql.html"
ROSTER_PATH = "plans/2026-08-14-full-catalog-roster.json"

SCHEMA_NAME_RE = re.compile(r"^[A-Z0-9_]+\.[A-Z0-9_]+$")


def extract_official_names(html: str):
    rows = re.findall(r"<tr>(.*?)</tr>", html, re.S)
    names = set()
    for row in rows:
        tds = re.findall(r"<td[^>]*>(.*?)</td>", row, re.S)
        if not tds:
            continue
        text = re.sub(r"<[^>]+>", "", tds[0])
        text = unescape(text).strip()
        text = re.sub(r"\s+", " ", text)
        text = re.sub(r"\(\)\s*$", "", text).strip()
        if not text:
            continue
        if SCHEMA_NAME_RE.match(text):
            names.add(text)
    return names


def main():
    with open(HTML_PATH, encoding="utf-8") as f:
        html = f.read()
    official = extract_official_names(html)
    official_bare = {n.split(".", 1)[1] for n in official}

    with open(ROSTER_PATH, encoding="utf-8") as f:
        roster = json.load(f)
    roster_names = {r["name"].upper() for r in roster}

    missing = sorted(official_bare - roster_names)
    extra = sorted(roster_names - official_bare)

    print(f"官方目錄去重後服務數: {len(official_bare)}")
    print(f"roster.json 服務數: {len(roster_names)}")
    print(f"roster.json 裡缺少（官方有、roster沒有）: {len(missing)}")
    for m in missing:
        print("  -", m)
    print(f"roster.json 多出的（roster有、官方目錄找不到，可能是名稱不符或已下架）: {len(extra)}")
    for e in extra:
        print("  -", e)

    if not missing and not extra:
        print("結論：roster.json 與官方目錄完全一致，0筆缺口。")


if __name__ == "__main__":
    main()
