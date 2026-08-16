#!/usr/bin/env python3
"""PDF查證輔助工具：搜尋 outputs/webfetch/rzajqpdf.pdf 裡包含指定字串的頁碼，
或匯出指定頁碼範圍的文字內容到檔案(UTF-8寫檔，避免主控台編碼錯誤)。

用法：
  python scripts/pdf-search.py search "<搜尋字串>" ["<搜尋字串2>" ...]
  python scripts/pdf-search.py dump <起始頁> <結束頁> <輸出檔案路徑>
"""
import sys
import pypdf

PDF_PATH = "outputs/webfetch/rzajqpdf.pdf"


def search(terms):
    reader = pypdf.PdfReader(PDF_PATH)
    found = {t: [] for t in terms}
    for i, page in enumerate(reader.pages):
        text_lower = (page.extract_text() or "").lower()
        for t in terms:
            if t.lower() in text_lower:
                found[t].append(i + 1)
    for t in terms:
        print(t, "->", found[t][:10])


def dump(start, end, out_path):
    reader = pypdf.PdfReader(PDF_PATH)
    with open(out_path, "w", encoding="utf-8") as out:
        for p in range(start, end + 1):
            text = reader.pages[p - 1].extract_text() or ""
            out.write("=== page " + str(p) + " ===\n" + text + "\n\n")
    print("dumped pages " + str(start) + "-" + str(end) + " to " + out_path)


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    mode = sys.argv[1]
    if mode == "search":
        terms = sys.argv[2:]
        if not terms:
            print("需要至少一個搜尋字串")
            sys.exit(1)
        search(terms)
    elif mode == "dump":
        if len(sys.argv) != 5:
            print("用法: dump <起始頁> <結束頁> <輸出檔案>")
            sys.exit(1)
        dump(int(sys.argv[2]), int(sys.argv[3]), sys.argv[4])
    else:
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main()
