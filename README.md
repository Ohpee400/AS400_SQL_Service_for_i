# AS400 SQL Service Toolkit

IBM i（AS400）SQL Services 知識庫與 SQL 產生工具，以單一本機靜態網頁（`outputs/kb.html`）的形式提供，協助團隊：

1. 查詢特定 IBM i SQL Service 需要哪個**最低 OS 版本 / PTF** 才能使用，並用中文說明讓你用前就知道這個 Service 能做什麼。
2. 用一句話描述需求，自動比對已知情境、把 library/object/time 等欄位帶入表單（含預設值可直接修改），按一下產生**可複製**的 SQL 語句。

目前收錄 **258 筆**已核實的 IBM i SQL Service（112 個 View、66 個 Table function、49 個 Procedure、27 個 Scalar function、4 個 Table），涵蓋 16 個功能分類（物件鎖定、日誌管理、安全稽核、工作管理、IFS、儲存空間管理等）。

## 怎麼開啟

不需要安裝任何東西、不需要啟動伺服器：

```
直接用瀏覽器（Chrome/Edge）雙擊開啟 outputs/kb.html
```

所有資料與程式邏輯都已內嵌在這個檔案裡，開啟後不會發出任何網路請求，離線也能用。

## 開發

```bash
npm test          # 執行單元測試（tests/unit/*.test.js）
npm run build      # 讀取 src/data/*.json + src/lib/kbEngine.js，重新產出 outputs/kb.html
```

修改 `src/data/services.json`（Service 資料）或 `src/data/templates.json`（自然語言比對用的 SQL 模板）後，務必重新執行 `npm run build`。**請勿直接手改 `outputs/kb.html`**，下次 build 會被覆蓋。

## 專案結構

```
src/
  data/services.json    服務目錄（分類、版本/PTF需求、官方文件出處）
  data/templates.json   SQL 產生模板（欄位、預設值、比對關鍵字）
  lib/kbEngine.js        比對/填值/SQL排版共用邏輯（build 與網頁內嵌共用同一份）
scripts/build-kb-html.js  從上述資料產出 outputs/kb.html
tests/unit/                單元測試
outputs/kb.html             交付成品（唯一需要分發給使用者的檔案）
docs/                       使用說明、資料欄位說明
plans/ progress/ agent_logs/  開發過程的規劃、執行記錄、停損機制記錄
```

## 資料驗證方式

內建知識庫每筆資料都已比對 IBM 官方文件（`verified: true` 是收錄的必要條件，查無官方依據的 Service 不會收錄），但屬於文件比對整理，非實機測試結果。實際環境的 OS 版本、PTF 安裝狀況可能因主機而異，正式使用前建議先在測試機執行確認，也可用 `DSPPTF`、`GO PTF` 等指令或以下 SQL 複查：

```sql
SELECT SERVICE_NAME, SQL_OBJECT_TYPE, EXAMPLE, EARLIEST_RELEASE_LEVEL
FROM QSYS2.SERVICES_INFO
WHERE SERVICE_NAME = 'YOUR_SERVICE_NAME';
```

更多細節見 `docs/usage.md`（操作說明）與 `docs/data-schema.md`（資料欄位定義）。
