# 紫微斗數論命

https://regulusab.github.io/ziwei/

- 排盤：輸入西曆或農曆（出生地農曆）生辰、時辰、性別、出生地經度，排出十二宮命盤（主星亮度、六吉六煞、祿存天馬、雜曜、生年四化、長生十二神、博士十二神、將前／歲前諸星、大限、小限、流年、流月）。
- 時間口徑：依出生地的地方平時排盤（出生日期時間照輸入使用，不另換算）；八字與河洛理數 0:00 換日，紫微斗數 23:00 換日；東經 70° 以西日柱干支進一位（日期不動）；紫微與河洛的農曆以出生地經度的地方平時合朔定初一。年柱、月柱以輸入時刻比對出生地地方平時（世界時＋經度×4 分鐘，不加夏令）的交節氣時刻；農曆月序、閏月依中國農曆。
- 派別設定：四化表（通行版／中州派／庚干陽武同陰）、年界（正月初一／立春）。
- 命書：命宮主星賦文、十二宮分析、格局、四化與飛化、大限、流年、流月、專題論斷；古籍引文均註明出處。
- 命例存檔（瀏覽器 localStorage）、匯入匯出、分享連結、Word 下載、列印存 PDF。
- 共用導覽：https://regulusab.github.io/nav/nav.js

## 程式結構
- `js/engine.js` 排盤（包裝 iztro）；出生地農曆與四柱，演算法與「生命之眼」紫微（heluo-ziwei `local_lunar.mjs` 的 `localZiweiInput`／`chartLocal`）相同；iztro 只認中國曆，出生地農曆與中國曆不同日時，以農曆年干支、月、閏、日相同的中國曆日期排星
- `js/chart.js` 命盤 4×4 格
- `js/book.js` 產生命書資料物件 `{title, meta, sections:[{id, heading, blocks}]}`
- `js/render.js` 命書 → 網頁
- `js/export.js` `toMingshu(book)` 轉成 mingshu/1，`exportBook(book, 'pdf'|'docx'|'print'|'json')`；Word／PDF 由共用匯出模組 `mingshu-export/`（Ab2 製作，複製自共用電腦 v1.0.0 956d811，請勿在此修改）產生
- `data/*.json` 古籍錄文與本站整理資料（每份都有 source 欄位）

## 授權與出處
- 曆法：`vendor/lunar.js`（[lunar-javascript](https://github.com/6tail/lunar-javascript)，MIT）、`vendor/lunation.js`（DE440s 合朔表 1899-10～2101-02）、`vendor/local_lunar.js`，三檔自河洛理數站 722b429 原樣複製（`vendor/lunar-LICENSE.txt`）。
- 排盤核心 [iztro](https://github.com/SylarLong/iztro) v2.6.5，MIT 授權（`vendor/iztro-LICENSE.txt`），已放在本站，不連外部 CDN。
- Word／PDF：mingshu-export（內含 docx、pdf-lib、fontkit，皆 MIT；Noto Serif CJK TC 字型，SIL OFL 1.1）。
- 古籍：《紫微斗數全書》，維基文庫錄文（公有領域），以 OpenCC 轉為正體字。
- 標示「本站整理／本站摘要」的文字是依通行說法改寫的白話摘要，不是古籍原文。
