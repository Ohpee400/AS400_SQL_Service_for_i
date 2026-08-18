# 補上專案根目錄README.md（執行記錄）

使用者發現GitHub repo（`Ohpee400/AS400_SQL_Service_for_i`）沒有README，要求補上並push。

## 已知限制

`docs/usage.md`內容已過時（仍寫「目前涵蓋範圍(第一批,3個Service)」，實際現在是258筆），不能直接引用其涵蓋範圍段落，README要用目前實際資料重新統計。

## 本輪動作範圍

允許新增：專案根目錄`README.md`（新檔案，非修改既有檔案）。不改動`docs/usage.md`等既有文件內容（過時問題超出本次範圍，若使用者要一併更新需另外確認）。

## 本次怎麼做

- 用`package.json`(name/description/scripts)、`node -e`現查`services.json`實際筆數(258筆、5種type、16個分類、258筆verified=true)、`docs/usage.md`(使用方式邏輯，但涵蓋範圍改用現查數字)拼出內容。
- README聚焦：專案是什麼、怎麼開啟(純本機靜態頁不需啟動伺服器)、怎麼開發(npm test/npm run build)、專案結構、資料驗證方式的免責提醒(呼應services.json的meta.disclaimer)。
- 完成後：`git add README.md` → commit → push。
