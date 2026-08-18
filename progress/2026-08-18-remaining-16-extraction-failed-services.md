# 16筆自動抽取失敗服務的人工查證與修復（執行記錄）

對應todo清單A1（16筆抽取失敗）。這批不需要使用者系統配合，唯讀PDF查證+模板修復。

## 本輪動作範圍

允許修改：`src/data/templates.json`(16個模板)、`src/data/services.json`(2筆`docSearchHint`格式修正)、`outputs/kb.html`(僅透過`npm run build`)。

## 本次怎麼做

逐一用`pdftotext -layout`重新dump這16筆的PDF頁碼，人工核對官方參數簽章，發現：
- **2筆是`docSearchHint`頁碼記錄本身就是錯的**(`active_job_info`原記「原書第1104頁」缺實際PDF頁碼且頁碼本身有偏差、`output_queue_entries`同樣缺PDF頁碼)——這正是當初自動抽取腳本失敗的根本原因(腳本找的頁碼範圍本來就是錯的)。用`pdf-search.py`重新搜尋確認正確PDF頁碼(1121-1125、1038-1039)後修正格式。
- **1筆完全沒有缺口**(`output_queue_entries`本身參數已經全部收錄，只是文件格式問題導致自動抽取誤判)。
- **13筆確認有真的缺口**，逐一修復：

| 服務 | 補的欄位 |
|---|---|
| `ifs_object_statistics` | subtreeDirectories、objectTypeList、omitList、ignoreErrors |
| `active_job_info` | resetStatistics |
| `send_data_queue_binary`/`send_data_queue_utf8` | asynchronous |
| `add_user_index_entry_binary` | key |
| `change_user_space`(非attributes版)、`change_user_space_binary` | force |
| `remove_user_index_entry_binary` | removeValue、removeValueEnd |
| `ifs_job_info`、`ifs_object_lock_info`、`ifs_object_privileges` | ignoreErrors |
| `ifs_object_references_info` | detailedInfo、ignoreErrors |
| `ifs_read_binary` | maximumLineLength、ignoreErrors(END_OF_LINE固定NONE不開放選，因官方文件明說binary版本這個參數只能是NONE) |
| `ifs_read_utf8` | maximumLineLength、ignoreErrors |
| `ifs_write_utf8` | fileCcsid(預設1208，跟`ifs_write`預設0不同)、endOfLine |
| `split` | escape(改用具名參數語法方便未來擴充) |

其中`send_data_queue`(不含binary/utf8字尾的原始版本)也一併補上`asynchronous`——這在先前的「8個單缺欄位」批次裡沒抓到，這次連著binary/utf8變體一起查證時發現原版也漏了。

## 驗證

- `npm test`：19/19 pass。
- 對10個代表性模板逐一用`fillTemplate`+`formatSql`核對輸出，確認留空/必填情境SQL語法都正確、排版正常換行。
- `npm run build` → `headless-check.sh`：258筆不變。

## 結果

16筆全部處理完畢：2筆修正文件格式debt、1筆確認無缺口、13筆補齊真缺口。這批全部**沒有實機驗證**，套用的是今天已建立並部分驗證過的修法模式(NULLIF/條件式子句省略/BX'...'包裝)。

其餘4筆`docSearchHint`格式同樣缺PDF頁碼(`system_status_info`、`journal_info`、`user_info`、`netstat_info`、`asp_info`)——這些都是**View類型**，屬於todo清單B(116筆View/Table查詢面稽核)的範圍，這輪刻意不動，留給B階段一併處理。
