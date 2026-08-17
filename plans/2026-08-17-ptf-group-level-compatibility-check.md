# PTF Group Level相容性檢查（feature/ptf-group-paste）

最後更新：2026-08-17。分支：`feature/ptf-group-paste`。對應討論：把「相容性檢查器」構想從「使用者輸入OS+完整PTF清單」簡化為「使用者輸入OS+單一PTF Group Level數字」。

## 問題/需求

現有「OS版本」篩選chip只能回答「這個service的最低可用版本floor是不是≥X」，沒辦法回答「以我目前實際裝的PTF等級，這個service到底能不能用」。使用者要自己點開每一列、對照PTF對照表裡的Level數字，跟自己環境比對，麻煩且容易看錯。

## 已查明的資料現況（實際跑程式驗證，非猜測）

- 用正則`(SF\d{5})\s*Level\s*(\d+)`掃描`src/data/services.json`全部258筆的`ptfTable[].enhanced`欄位，**全庫只出現4個PTF Group**：`SF99703`(對應7.3)、`SF99704`(對應7.4)、`SF99950`(對應7.5)、`SF99960`(對應7.6)，且每個OS版本固定對應一個Group，這是IBM官方固定命名，不會因為這份資料而變。
- 同一次掃描發現**7筆row無法解析出Level數字**，內容是「官方對照表標示Base Enhanced，未列出對應PTF編號」——這是官方文件本身沒列PTF編號的已知資料缺口，不是regex寫錯，出現在`server_sbs_routing`(7.5/7.6)、`server_share_info`(7.5)、`set_server_sbs_routing`(7.5/7.6)、`job_info`(7.6)、`user_storage`(7.5)這幾筆。
- `enhanced`欄位裡「Level N」有時後面還接「；Enhanced Level M」（代表Level N就能用，Level M有加強功能），比對「能不能用」只需要抓**第一個**Level數字當門檻，後面的Enhanced Level是加分資訊，不是門檻。

## 實作方向

### A. UI：OS版本chip旁新增Level輸入
- 使用者點選某個OS版本chip後（現有機制），在chip列下方顯示一個小輸入框：「目前PTF Group Level」，並即時顯示對應要查的SQL（依選中版本動態換成`SF99703`/`SF99704`/`SF99950`/`SF99960`），附一鍵複製，比照既有drawer的複製SQL按鈕樣式。
- 沒選OS版本、或選了但沒填Level：畫面行為完全比照現況，不影響既有篩選/分組/展開功能，純附加不是取代。

### B. 判斷邏輯（純前端計算，不需要伺服器）
```
PTF_GROUP_BY_VERSION = {'7.3':'SF99703','7.4':'SF99704','7.5':'SF99950','7.6':'SF99960'}
對每個service在選中版本的ptfTable row：
  - 沒有這個版本的row → 不支援
  - row.base === true → 可直接使用（原生，跟使用者輸入的Level無關）
  - row.base === false：
      解析enhanced欄位第一個「Level N」
      - 解析不到 → 狀態=需人工確認（誠實顯示，不冒充算得出來）
      - 解析得到但使用者沒填Level → 狀態=需PTF(沿用現況，不比較數字)
      - 使用者有填Level → 比較 使用者Level >= N ? 可用 : 需升級到Level N
```

### C. 顯示：`.svc-req`提示文字狀態化
- 沒有啟用Level比對時：維持現況「查看 OS/PTF 需求」藍字提示。
- 啟用Level比對時：換成狀態徽章——綠「✓ 可直接使用」／橘「需升級到 Level N」／灰「⚠ 官方未列PTF編號，需人工確認」，顏色沿用既有CSS變數(`--accent`/`--warn`/`--muted`)，不新增調色盤（避免違背前面才做完的「顏色簡化」方向）。

## 查詢面/欄位盤點

不新增/修改services.json的資料結構，只讀取既有`ptfTable`欄位做前端運算；不涉及查詢面欄位盤點。

## 本輪動作範圍

分支：`feature/ptf-group-paste`。允許修改：`scripts/build-kb-html.js`、`outputs/kb.html`（僅透過`npm run build`重新產生）。不動`master`分支、不動`src/data/*.json`資料本身。

驗證方式：`npm test`確認既有16項迴歸測試不受影響 → `npm run build` → `bash scripts/headless-check.sh`確認筆數不變 → 針對前述7筆已知「無法解析Level」的service，用headless Chrome實際輸入測試值，確認正確顯示「需人工確認」而非誤判 → 另外針對已知可解析的service，實測輸入剛好等於門檻值/低於門檻值兩種情境，確認判斷正確。
