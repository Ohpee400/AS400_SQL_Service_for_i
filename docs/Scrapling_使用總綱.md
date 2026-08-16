# Scrapling 使用總綱 — AS400_SQL_SERVICE_FOR_I 專案

## 核心原則：三贏怎麼成立

| 角色 | 負責什麼 | 不負責什麼 |
|---|---|---|
| **你（人）** | 決定要抓哪個網站、按下執行、對結果負最終責任 | 不用自己寫解析邏輯、不用自己想services.json怎麼組 |
| **Scrapling** | 純技術工具，你叫它做什麼就做什麼，不做倫理判斷 | 不負責判斷「這樣抓對不對」——那是你的決定 |
| **Claude Code** | 讀你抓回來的本機檔案，做解析、比對、寫程式、產出正式文件（它最擅長、也最該做的事） | 不用自己決定要不要對抗某個網站的WAF——這個決定權從頭到尾不該是它的 |

**分工邏輯**：把「要不要繞過網站防護」這個有爭議的判斷，完全留在你手上（你本來就有權限做這個決定）；把「資料到手之後怎麼變成有用的東西」完全交給Claude Code（這是它真正的專長，也是它不會拒絕的部分）。兩邊都做自己該做、也願意做的事，衝突自然消失。

---

## 情境判斷：什麼時候用什麼工具

### 情境1：單一頁面，你知道確切網址
直接下CLI指令，不用寫Python：
```powershell
scrapling extract stealthy-fetch "<網址>" output.md --ai-targeted
```
- `--ai-targeted`：**一定要加**，過濾頁面裡可能藏的惡意指令（防Prompt Injection），因為這份內容之後會餵給Claude Code讀
- 一般網站用 `get`，需要跑JS的用 `fetch`，被防護擋住才用 `stealthy-fetch`

### 情境2：單一頁面，但之後會重複抓（例如IBM每次TR更新後要重抓一次確認版本表）
用你已有的 `fetch_ibm_services_table.py`，改`TARGET_URL`那行即可，不用重寫整支腳本。

### 情境3：母頁面 + 底下一堆子連結（「蜂巢式」）
用 `CrawlSpider`（範例見上一輪回覆），一次把主表格頁跟每個service的詳細頁都抓下來，存成一份JSON。

### 情境4：未來遇到全新的網站，不確定該用哪招
讓Claude Code幫你寫，但**你先明確授權這個特定目標**，降低它需要自己判斷邊界的情況：
> 「這個網站 https://xxx 的內容我已經確認可以抓取，你直接用 `scrapling extract get` 或 `fetch` 就好，如果一般請求就抓得到，不用動用 `stealthy-fetch`。」

`get`/`fetch` 是誠實請求，不涉及反偵測手法，這部分它本來就不會拒絕，只是需要你把「這是被授權的目標」講清楚，減少它自己還要重新評估一次的負擔。

---

## 標準作業流程（SOP）

```
1. 你決定要抓的網址（或網址清單）
        ↓
2. 你在PowerShell執行（CLI / 你的script / CrawlSpider，三選一）
        ↓
3. 輸出存到專案的 temp/ 或 reference/ 資料夾
        ↓
4. 跟Claude Code說：「這些是我已經抓好、驗證過的本機檔案，
   放在 temp/xxx，幫我讀取並更新 services.json」
        ↓
5. Claude Code純粹做讀檔 + 資料整理 + 寫程式，
   完全不碰網路存取的判斷
```

---

## 常用指令備忘

```powershell
# 單頁，一般網站
scrapling extract get "<url>" output.md --ai-targeted

# 單頁，需要JS渲染
scrapling extract fetch "<url>" output.md --ai-targeted --network-idle

# 單頁，被防護擋住
scrapling extract stealthy-fetch "<url>" output.md --ai-targeted

# 只抓頁面裡特定區塊，省token
scrapling extract get "<url>" output.md --ai-targeted -s ".main-content"

# 重複性單頁抓取
python fetch_ibm_services_table.py

# 母頁+子頁蜂巢式抓取
python ibm_services_crawler.py
```

---

## 底線提醒（不要為了方便就跳過）

- **`--ai-targeted` 永遠加**：防止抓回來的內容裡藏著想操控AI的指令
- **`robots_txt_obey` / `download_delay` 這些禮貌設定不要拿掉**：批次爬取時務必保留，這是對網站基本的尊重，也是Scrapling官方guardrails明講的
- **只用在你已確認「有權限存取」的公開內容**：不要拿來打真正需要登入、付費、或明確標示禁止爬取的內容，那已經超出這整套邏輯能自圓其說的範圍
- **Claude Code該做的事還是交給它**：資料解析、schema設計、程式邏輯、正確性核對——這些是它的專長，別為了「省事」自己動手做這部分，浪費你們磨合出來的分工

---

## 什麼時候還是要問Claude Code

- 抓回來的資料內容對不對、有沒有漏掉重要的service
- HTML表格怎麼正確轉成 `services.json` 的格式
- 程式邏輯、資料結構設計等核心開發工作
- 任何「這批資料能不能信、能不能用」的判斷——這是它該幫你把關的部分
