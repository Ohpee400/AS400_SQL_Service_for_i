#!/usr/bin/env python3
"""批次更新 plans/2026-08-14-full-catalog-roster.json 裡指定服務的status欄位。

用法：
  python scripts/roster-mark-added.py --category "分類名" --names NAME1 NAME2 ... [--status added]
"""
import argparse
import json
from collections import Counter

ROSTER_PATH = "plans/2026-08-14-full-catalog-roster.json"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--category", required=True)
    parser.add_argument("--names", nargs="+", required=True)
    parser.add_argument("--status", default="added")
    args = parser.parse_args()

    with open(ROSTER_PATH, encoding="utf-8") as f:
        items = json.load(f)

    count = 0
    missing = set(args.names)
    for i in items:
        if i["category"] == args.category and i["name"] in args.names:
            i["status"] = args.status
            count += 1
            missing.discard(i["name"])

    with open(ROSTER_PATH, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print("updated:", count)
    if missing:
        print("WARNING 找不到以下名稱(可能名稱或分類打錯):", sorted(missing))

    print(dict(Counter(i["status"] for i in items)))


if __name__ == "__main__":
    main()
