# mingshu-export：命書 Word／PDF 共用匯出模組

給**紫微斗數站**（河洛主做，`/ziwei/`）和**盲派八字站**（八字主做，`/mangpai/`）共用。
各站把算好的命盤和論斷整理成一份 JSON（格式見 [docs/SCHEMA.md](docs/SCHEMA.md)），呼叫 `exportMingshu()`，瀏覽器裡就會直接產生 A4 的 PDF 或 Word 檔。資料不會上傳到任何伺服器，執行時也不連 CDN。

- PDF：首頁是命盤（紫微 4×4 十二宮盤，或八字四柱表加大運、流年），之後每一章換新頁；頁首左邊是站名、右邊是章名，頁尾有「第 n 頁／共 N 頁」。文字是向量字，可以選取和搜尋。
- Word：內容與 PDF 相同，可以編輯；標題套 Word 的「標題 1–4」樣式，導覽窗格看得到章節。

> 目前只在共用電腦的 `/workspace/shared/mingshu-export/`（本機 git），**還沒有上傳 GitHub，也還沒有公開**。

## 檔案

```
mingshu-export/
├─ src/mingshu-export.js   對外入口：exportMingshu、renderMingshu、validateMingshu、downloadBlob
├─ src/schema.js           驗證、正規化、配色、檔名
├─ src/chart-tables.js     首頁資料表、八字命盤表（PDF 與 Word 共用）
├─ src/pdf.js              PDF 排版（pdf-lib）
├─ src/docx.js             Word 輸出（docx）
├─ src/fonts.js            PDF 字型分檔載入與子集嵌入
├─ vendor/                 docx 9.15.0、pdf-lib 1.17.1、@pdf-lib/fontkit 1.1.1（皆 MIT，ES module）
├─ fonts/                  Noto Serif CJK TC（SIL OFL 1.1），core-regular/bold 各約 2.6 MB，ext/ 為罕用字分檔
├─ schema/mingshu.schema.json   JSON Schema（2020-12）
├─ examples/               兩份範例命書 JSON（虛構生辰、佔位文字）
├─ demo.html               示範頁：四個下載按鈕＋貼 JSON 測試
├─ tools/                  build_fonts.py（重建字型）、make-examples.mjs、make-schema.mjs
└─ test/                   node-smoke.mjs、browser-test.mjs
```

## 怎麼用（最少的程式碼）

把整個 `mingshu-export/` 資料夾（`src/`、`vendor/`、`fonts/` 三個都要）放進站裡，例如 `ziwei/mingshu-export/`：

```html
<button id="dlPdf">下載 PDF</button>
<button id="dlDocx">下載 Word</button>
<script type="module">
  import { exportMingshu } from './mingshu-export/src/mingshu-export.js';

  function buildDoc() {             // 把站上已經算好的結果整理成 mingshu/1 格式
    return {
      schema: 'mingshu/1',
      meta: { site: 'ziwei', siteTitle: '紫微斗數論命', title: '紫微斗數命書',
              name: '王小明', gender: '男',
              birth: { solar: '1990年5月7日 09:30', lunar: '庚午年四月十三 巳時' } },
      chart: { type: 'ziwei', palaces: [ /* 12 宮 */ ] },
      sections: [
        { type: 'heading', level: 1, text: '紫微斗數命中十二宮分析' },
        { type: 'heading', level: 2, text: '先天命宮分析' },
        { type: 'paragraph', text: '……' },
        { type: 'quote', text: '斗數至玄至微，理旨難明……', source: { book: '紫微斗數全書', chapter: '卷一・太微賦' } },
      ],
    };
  }
  async function go(format, btn) {
    btn.disabled = true;
    try {
      const r = await exportMingshu(buildDoc(), { format });   // 'pdf' 或 'docx'
      if (r.warnings.length) console.warn(r.warnings);
    } catch (e) { alert('產生失敗：' + e.message); }        // 資料格式有誤時，e.errors 是中文錯誤清單
    finally { btn.disabled = false; }
  }
  dlPdf.onclick  = e => go('pdf', e.currentTarget);
  dlDocx.onclick = e => go('docx', e.currentTarget);
</script>
```

`exportMingshu(doc, opts)` 的選項：

| 選項 | 預設 | 說明 |
|---|---|---|
| `format` | `'pdf'` | `'pdf'` 或 `'docx'` |
| `filename` | 「標題_姓名_日期」 | 不用加副檔名 |
| `download` | `true` | `false` 時只回傳 `{blob, filename, pages, warnings}`，不下載（例如要自己做分享） |
| `share` | `false` | `true` 時，支援的手機（iPhone Safari、Android Chrome）改開系統分享單，可以存到「檔案」或傳 LINE |
| `fontBase` | 模組旁的 `fonts/` | 字型放在別處時指定網址 |
| `bold` | `true` | `false` 時不下載粗體字型（省 2.6 MB），標題改用加粗描邊 |
| `docxFont` | `{cjk:'PMingLiU', latin:'Times New Roman'}` | Word 檔指定的字型（Word 用使用者電腦上的字型） |

另有 `renderMingshu(doc, opts)`（只產生、不下載）和 `validateMingshu(doc)`（只驗證，回傳 `{ok, errors, warnings}`）。

**注意**：ES module 必須用 http(s) 開啟，直接雙擊 html（file://）不能用。本機測試可以在資料夾裡執行 `python3 -m http.server`，再開 `http://localhost:8000/demo.html`。

## PDF 為什麼用 pdf-lib 向量排版

可以選的有三種做法：

1. **瀏覽器列印成 PDF（列印樣式表）**：iPhone 要點「分享 → 列印 → 兩指放大 → 儲存到檔案」，一般使用者很難完成。頁碼和頁首在 Safari 不能自訂，因為 Safari 不支援 `@page` 頁邊框。分頁結果也會因瀏覽器而異。
2. **html2pdf（河洛站目前用的）**：把網頁截成圖片再塞進 PDF。中文不會亂碼，但文字是圖片，不能選取或搜尋，檔案大，放大會糊。iPhone 的 canvas 有大小上限，幾十頁的命書可能空白或當掉。
3. **pdf-lib＋字型子集嵌入（本模組採用，八字站 bazi-site 已經用過）**：純 JavaScript，桌機 Chrome 和 iPhone Safari 跑的是同一份程式，版面完全一致。文字是向量字，可以選取、搜尋，A4 頁首、頁碼、分頁都由程式控制。PDF 只嵌入用到的字形，範例 8 頁約 200 KB。

字型用 Noto Serif CJK TC（思源宋體），拆成兩種檔案：
- `core-regular.ttf`、`core-bold.ttf`：Big5 常用字 5401 字，加上標點、全形字、符號，共 6736 字。
- `ext/XX.ttf`：其餘的次常用字和罕用字，每 256 個碼位一個檔。文件裡出現了才下載，通常只會多抓一兩個小檔。

第一次匯出要下載約 5.3 MB 字型，之後走瀏覽器快取。

> 建字型時要把字形資料對齊 4 位元組（`build_fonts.py` 裡的 `f['glyf'].padding = 4`）。不這樣做的話，fontkit 子集化會把部分字形截斷，PDF 裡會有字變成空白。這是這次實測抓到的問題，bazi-site 現有的字型檔也有。

## 河洛：紫微資料怎麼對進來

紫微站用 iztro 的話，`tools/make-examples.mjs` 裡的 `iztroToChart()` 可以直接拿去用：

```js
function iztroToChart(a) {                   // a = iztro.astro.bySolar(...)，語系 'zh-TW'
  return {
    type: 'ziwei', title: '紫微斗數命盤', subtitle: '本命盤',
    palaces: a.palaces.map(p => ({
      branch: p.earthlyBranch, stem: p.heavenlyStem,
      name: p.name.endsWith('宮') ? p.name : p.name + '宮',
      isBody: p.isBodyPalace,
      major: p.majorStars.map(s => ({ name: s.name, bright: s.brightness || '', hua: s.mutagen ? [s.mutagen] : [] })),
      minor: p.minorStars.map(s => ({ name: s.name, bright: s.brightness || '', hua: s.mutagen ? [s.mutagen] : [] })),
      adjective: p.adjectiveStars.map(s => s.name),
      labels: [p.changsheng12, p.boshi12].filter(Boolean),
      decade: p.decadal.range, ages: p.ages.slice(0, 6),
    })),
    center: { rows: [['四柱', a.chineseDate], ['五行局', a.fiveElementsClass], ['命主', a.soul], ['身主', a.body]] },
  };
}
```

- 自化請放在 `selfHua`，會畫成空心框；大限、流年四化目前沒有獨立欄位，需要的話先放 `labels` 或 `adjective`。範本的「綜合盤」把大運、流年、流月、流日的宮名全疊在同一格，我們的第一版先只畫本命盤。
- 內文用 `heading` 第 1 層分章（每章自動換頁），第 2 層分「先天命宮分析」這類節，第 3 層放星名或「命宮化祿入夫妻宮」這類條目，條列用 `list` 的 `cjk`（（一）（二））或 `alpha`（Ａ、Ｂ、）。

## 八字：盲派資料怎麼對進來

| bazi-site／lunar-javascript | schema 欄位 |
|---|---|
| `getYearGan()`／`getYearZhi()` | `pillars.year.stem`／`.branch`（月日時同理，時柱是 `Time`） |
| `getYearShiShenGan()` | `pillars.year.stemTenGod`（日柱給「日主」或省略） |
| `getYearHideGan()`＋`getYearShiShenZhi()` | `pillars.year.hidden: [{stem, tenGod}]` |
| `getYearNaYin()`、`getYearDiShi()`、`getYearXunKong()` | `nayin`、`stage`、`kongwang` |
| `getYun(性別).getDaYun()` | `dayun.items: [{age, years, gz, tenGod}]` |
| 胎元、命宮、身宮、格局、喜用 | `info: [[標籤, 值], ...]` |
| 神煞 | `pillars.X.shensha: [...]` |

lunar-javascript 回傳的是簡體字（例如「正财」），請先轉成繁體（bazi-site 已有自己的字詞表；範例是用 opencc-js 轉的）。做功、賓主、體用這類盲派論斷，建議每項用第 2 層標題，再接 `table`，欄位放「項目／內容／出處」，或接段落。

## 範本 PDF 的結構（只看版面，文字不可照抄）

兩份範本都是市售軟體排出來的。最後一頁和盲派第 2 頁是廣告和聯絡資料，**不要放進我們的命書**。

**紫微斗數命書範本（63 頁）**
- 第 1 頁：紫微斗數星盤【綜合盤】。4×4 宮格，每宮有：主星和輔星直排，四化用色字，廟旺用符號；雜曜；大運、流年、流月、流日的宮名；長生、博士十二神；【宮名】加干支；小限歲數；大限歲數範圍。中央放姓名、性別、西元和農曆生日、小型四柱表（十神、藏干、神煞）、五行局、命主、身主。盤下有廟旺符號的圖例。
- 第 2–12 頁「紫微斗數命中十二宮分析」：十二宮各一節「先天某宮分析」。每節依序是：看法說明；Ａ–Ｆ條列「某宮是某宮的某宮」的宮位轉換；「因您某宮有以下星宿」之後，每顆星用紅色小標，下接（一）（二）條列。
- 第 13–19 頁「本命特質剖析」：本命格局、宮自化，以及「某宮化祿／權／科／忌入某宮」飛星條目，約 48 條。
- 第 20–27 頁「紫微大運分析」：大運某宮分析（附歲數範圍），「大運某歲：可能發生之現象」，「本命某宮化某入大運某宮」。
- 第 28–39 頁「紫微流年分析」：流年各宮分析，以及「大運某宮化某入流年某宮」。
- 第 40–51 頁「紫微流月流日分析」：流月的各種現象（分農曆月份）、四化星解說、流日的各種現象，以及流年到流月、流月到流日的飛化。
- 第 52–53 頁「由紫微看待各種現象」：幸運密碼、守護神、適合行業。
- 第 54–60 頁「特殊論斷功能」：學歷與考試運、婚姻時機、流年桃花、大限破財、家運、官非。
- 第 61–62 頁「用紫微方式來開運」：吉星、凶星怎麼化解，以及近期日期提醒。
- 頁尾為「Page x of 63」。標題分三層：章名置中加底線、節名用藍色、星名或條件用紅色。

**盲派八字命書範本（56 頁）**
- 第 1 頁命盤：姓名、性別；西元和農曆分列時日月年；主星（十神）、天干（附五行小字）；柱與柱之間畫合、沖、剋的箭頭；地支、藏干、副星、十二運星（附歲數區間）、特星神煞。左邊是五行分數圖，以及天運五行、胎息、胎元、命宮、格局、血型、空亡、喜用神、忌神、星座、強弱。下方是大運列和 15 年流年格（年、歲、干支、十神）。最底下的客戶資料欄不要做。
- 每頁頁首都印章名（置中加底線）。
- 第 3–17 頁「八字基本命理分析」：由五行論性格；編號條件用紅色粗體標題，例如「日地支是劫財」「日主坐比劫」，下接說明；健康與飲食；由八字看職業取向；八字補述；干支合；天乙貴人等；最後兩頁是干支統計表格。
- 第 18–27 頁「八字斷一生運勢演變」：一生財富演變；大運條件，例如「走某運所發生事情」；流年；流月（「在這個月中……」）。
- 第 28–50 頁「開運制煞篇」：補運法則、未來日期列表、一生壞運點，以及許多民俗或宗教開運法和祈禱文。
- 第 51–56 頁「星座特質分析」：西洋星座，不是八字內容。
- 這份範本其實是一般的八字命書，**沒有盲派特有的做功、賓主、體用、象法**；這些要由八字站自己決定章節。

## 測試

```bash
node test/node-smoke.mjs      # Node 直接產生四個檔到 out/node/
node test/browser-test.mjs    # 用 Chrome（桌機和 iPhone 尺寸）開 demo.html 按四個按鈕，
                              # PDF 轉 PNG 到 out/png/，Word 經 LibreOffice 轉 PDF 再轉 PNG
node tools/make-examples.mjs  # 重新產生範例 JSON
python3 tools/build_fonts.py  # 重建字型（需要 fontTools 和 Noto Serif CJK）
```

## 已知限制

- **iPhone Safari 還沒在真機測過**。共用電腦上的 WebKit 缺系統函式庫跑不起來，目前只用 Chrome 模擬 iPhone 尺寸（390×844）測過。pdf-lib、docx 都是純 JavaScript，也沒有用到 Safari 不支援的語法，但上線前請在真的 iPhone 上各按一次 PDF 和 Word。
- 第一次產生 PDF 要下載約 5.3 MB 字型；網路慢的手機可以用 `bold: false` 省下一半。
- Word 檔用的是使用者電腦上的字型（預設新細明體），所以分頁和 PDF 不會完全一樣。在 Word 裡，紫微盤的星曜是橫排，不是直排。
- 頁首右邊的章名在 Word 是 STYLEREF 功能變數，Word 和 LibreOffice 會自動更新；少數 App 只會顯示命書標題。
- 表格支援跨欄（colspan），不支援跨列（rowspan）。一列如果高過一整頁，不會拆開。
- 八字盤沒有畫合沖箭頭，也沒有五行分數圖；命書裡不能放圖片。
- 只有 Noto Serif CJK TC 一種字體，沒有標楷體。CJK 擴充 B 以後的罕用字（BMP 以外）會印成「□」，`warnings` 會列出是哪些字。
