# 紫微斗數論命

https://regulusab.github.io/ziwei/

- 排盤：輸入西曆或農曆生辰、時辰、性別，排出十二宮命盤（主星亮度、六吉六煞、祿存天馬、雜曜、生年四化、長生十二神、博士十二神、將前／歲前諸星、大限、小限、流年、流月）。
- 派別設定：子時換日（23:00／0:00）、四化表（通行版／中州派／庚干陽武同陰）、年界（正月初一／立春）。
- 命書：命宮主星賦文、十二宮分析、格局、四化與飛化、大限、流年、流月、專題論斷；古籍引文均註明出處。
- 命例存檔（瀏覽器 localStorage）、匯入匯出、分享連結、Word 下載、列印存 PDF。
- 共用導覽：https://regulusab.github.io/nav/nav.js

## 程式結構
- `js/engine.js` 排盤（包裝 iztro）
- `js/chart.js` 命盤 4×4 格
- `js/book.js` 產生命書資料物件 `{title, meta, sections:[{id, heading, blocks}]}`
- `js/render.js` 命書 → 網頁
- `js/export.js` `exportBook(book, 'docx'|'print'|'json')`，日後可替換為共用匯出模組
- `data/*.json` 古籍錄文與本站整理資料（每份都有 source 欄位）

## 授權與出處
- 排盤核心 [iztro](https://github.com/SylarLong/iztro) v2.6.5，MIT 授權（`vendor/iztro-LICENSE.txt`），已放在本站，不連外部 CDN。
- Word 產生：[docx](https://github.com/dolanmiu/docx)（MIT）。
- 古籍：《紫微斗數全書》，維基文庫錄文（公有領域），以 OpenCC 轉為正體字。
- 標示「本站整理／本站摘要」的文字是依通行說法改寫的白話摘要，不是古籍原文。
