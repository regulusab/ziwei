# 更新紀錄

## v1.0.1（2026-11-15）

河洛整合到紫微站後回報的兩個 Node 端問題（瀏覽器不受影響）：

- **修正**：在 Node 產生 Word 檔時，`bytes` 回傳的是 `Blob`。現在 `renderMingshu`／`exportMingshu` 的 `bytes` 一律是 `Uint8Array`，PDF、Word、瀏覽器、Node 都一樣。`blob` 欄位不變：有全域 `Blob` 時是 `Blob`，否則是 `null`。
- **修正**：在 Node 產生 PDF 時，`fontBase` 給 `file://` 網址會讀不到字型；沒給 `fontBase` 時，預設位置也是 `file://`，同樣失敗。現在 Node 端的字型位置接受這幾種寫法：`file://` 網址字串、`URL` 物件、絕對路徑、相對路徑（以 `process.cwd()` 為準）、http(s) 網址。`file:` 用 `fs` 讀檔，其他用 `fetch`。結尾沒有 `/` 也可以。找不到檔案時，錯誤訊息會寫出完整路徑。
- 瀏覽器端行為不變，仍用 `fetch`。在瀏覽器給 `file://` 會出現明確的中文錯誤訊息。
- **新增**：`test/node-api.mjs`，共 9 項測試。`npm test` 現在會同時跑 smoke 和 API 測試。

## v1.0.0（2026-11-15）

- 第一版：命書 schema `mingshu/1`、PDF（pdf-lib，字型子集嵌入）、Word（docx）、兩份範例、demo.html、Node 和瀏覽器測試。
