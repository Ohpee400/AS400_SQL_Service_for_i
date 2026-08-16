# AS400 SQL Service 知識庫 — 使用說明

## 這是什麼

一個**本機靜態網頁**（`outputs/kb.html`），協助團隊：
1. 查詢特定 IBM i SQL Service 需要哪個 **最低 OS 版本 / PTF** 才能使用，並用中文說明讓你用前就知道這個 Service 能做什麼。
2. 用一句話描述問題，自動比對已知情境、把 library/object/time 等欄位帶入表單（含預設值可直接修改），按一下產生 **可複製** 的 SQL 語句。

> **重要**：內建知識庫（`src/data/services.json`、`src/data/templates.json`）每筆資料都已核對官方文件（`verified: true` 是收錄的必要條件，查不到依據的service不會收錄），但屬於文件比對、非實機測試，正式使用前仍建議在測試機驗證。頁面下方會固定顯示這則提醒。

## 怎麼開啟

不需要安裝任何東西、不需要啟動伺服器：

```
直接用瀏覽器（Chrome/Edge）雙擊開啟 outputs/kb.html
```

所有資料與程式邏輯都已內嵌在這個檔案裡，開啟後不會發出任何網路請求，離線也能用。

## 怎麼用

1. **搜尋 SQL Service**：在上方輸入框打關鍵字（如「鎖定」「大檔案」「IFS」），下方卡片會即時過濾。每張卡片顯示：Service 名稱、分類、中文用途說明、最低 OS 版本、PTF 資訊、是否已核實。
2. **用一句話描述你要做的事**：例如輸入「查詢 LIB01/FILE01 是否被鎖定」，按「自動比對並產生表單」。頁面會自動判斷情境、把能從句子擷取到的值（如 LIB01、FILE01）帶進表單，其餘欄位顯示預設值（如 objType 預設 `*FILE`）。
3. **確認/修改欄位後按「產生 SQL」**：畫面下方會顯示完整、可直接複製的 SQL 語句，旁邊有「複製 SQL」按鈕（使用瀏覽器剪貼簿）。
4. 若輸入的描述比對不到任何情境，頁面會提示改用上方搜尋，或請團隊在 `src/data/templates.json` 補充對應模板。

## 目前涵蓋範圍（第一批，3 個 Service）

| 主題 | SQL Service |
|---|---|
| 物件鎖定查詢 | `QSYS2.OBJECT_LOCK_INFO` |
| 資料庫檔案(資料表)大小分析 | `QSYS2.SYSTABSTAT` / `QSYS2.SYSPARTITIONSTAT` |
| IFS 大檔案分析 | `QSYS2.IFS_OBJECT_STATISTICS` |

方法驗證可行後，再擴大到更多 Service。

## 如何更新知識庫 / 重新產生網頁

1. 編輯 `src/data/services.json`（Service 資料）或 `src/data/templates.json`（NL 情境模板），欄位說明見 `docs/data-schema.md`。
2. 重新建置：
   ```
   npm run build
   ```
   會讀取兩份 JSON 與 `src/lib/kbEngine.js`，重新產出 `outputs/kb.html`。**請勿直接手改 `outputs/kb.html`**，下次 build 會被覆蓋。
3. 建議先跑 `npm test` 確認比對邏輯測試通過，再重新開啟 `outputs/kb.html` 手動檢查。

## 資料驗證的建議做法

由於外部網頁抓取（IBM 官方文件）目前在此開發環境中無法使用（`ibm.com` 網域一律回傳 403），最權威的驗證方式是在真實 IBM i 系統上執行：

```sql
SELECT SERVICE_NAME, SQL_OBJECT_TYPE, EXAMPLE, EARLIEST_RELEASE_LEVEL
FROM QSYS2.SERVICES_INFO
WHERE SERVICE_NAME IN ('OBJECT_LOCK_INFO', 'SYSTABSTAT', 'IFS_OBJECT_STATISTICS');
```

拿到真實結果後回填進 `services.json` 對應欄位，並把該筆的 `verified` 改成 `true`。PTF 資訊需另外用 `GO PTF` 或已知的群組 PTF 對照表核對。
