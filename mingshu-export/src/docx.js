// 命書 Word（.docx）：docx 函式庫產生可編輯文件；字型用使用者電腦上的中文字型（預設新細明體 PMingLiU）。
import { COLORS, BRANCH_POS, PENDING_LABEL, color } from './schema.js';
import { metaTable, baziTables, ziweiCenterRows, generatedLine } from './chart-tables.js';
import { listMarker } from './list-marker.js';

const PAGE_W = 11906, PAGE_H = 16838;              // A4（twip）
const MAR = { top: 1300, bottom: 1240, left: 1120, right: 1120, header: 560, footer: 560 };
const CONTENT_W = PAGE_W - MAR.left - MAR.right;   // 9666
const hex = c => color(c).slice(1).toUpperCase();
const hp = pt => Math.round(pt * 2);                 // 半點

export async function renderDocx(doc, opts = {}) {
  const D = await import('../vendor/docx.mjs');
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, Header, Footer, PageNumber,
    Tab, TabStopType, BorderStyle, ShadingType, HeightRule, VerticalAlign, TableLayoutType, SimpleField, PageBreak } = D;
  const m = doc.meta;
  const cjk = opts.docxFont?.cjk || 'PMingLiU', latin = opts.docxFont?.latin || 'Times New Roman';
  const FONT = { ascii: latin, hAnsi: latin, eastAsia: cjk, cs: latin };
  const BODY = 10.5;

  const runOf = (r, base = {}) => {
    const size = r.size || base.size || BODY;
    if (r.pending) return [new TextRun({ text: ' ' }), new TextRun({ text: r.text || PENDING_LABEL, font: FONT, size: hp(size * 0.8), color: hex(COLORS.pendingText), shading: { type: ShadingType.CLEAR, color: 'auto', fill: hex(COLORS.pendingFill) } })];
    const parts = String(r.text).split('\n');
    return parts.map((t, i) => new TextRun({ text: t, break: i ? 1 : undefined, font: FONT, size: hp(size), bold: r.bold ?? base.bold, color: r.color ? hex(r.color) : base.color ? hex(base.color) : undefined, underline: base.underline }));
  };
  const runsOf = (runs, base) => runs.flatMap(r => runOf(r, base));
  const ALIGN = { left: AlignmentType.LEFT, center: AlignmentType.CENTER, right: AlignmentType.RIGHT, justify: AlignmentType.JUSTIFIED };

  const out = [];
  // ───────── 表格（首頁命盤、內文表格共用）
  function table(b, opt = {}) {
    const size = b.size || 9.5;
    const all = (b.header ? [b.header] : []).concat(b.rows);
    const ncol = Math.max(1, ...all.map(r => r.reduce((a, c) => a + (c.colspan || 1), 0)));
    let ws = b.widths && b.widths.length === ncol ? b.widths.map(Number) : Array(ncol).fill(1);
    const tot = ws.reduce((a, v) => a + v, 0);
    ws = ws.map(v => Math.round((v / tot) * CONTENT_W));
    if (b.caption) out.push(new Paragraph({ keepNext: true, spacing: { before: 120, after: 60 }, children: runsOf([{ text: b.caption, bold: true }], { size: 11, color: COLORS.accent }) }));
    const keep = opt.keep ?? (b.chart || b.rows.length <= 12);
    const mkRow = (r, isHead, last) => {
      let ci = 0;
      return new TableRow({ tableHeader: isHead, cantSplit: true, children: r.map(c => {
        const span = c.colspan || 1, w = ws.slice(ci, ci + span).reduce((a, v) => a + v, 0); ci += span;
        const fill = c.fill || (isHead ? COLORS.fill : null);
        return new TableCell({
          columnSpan: span > 1 ? span : undefined, width: { size: w, type: WidthType.DXA },
          verticalAlign: c.valign === 'top' ? VerticalAlign.TOP : VerticalAlign.CENTER,
          margins: { top: 40, bottom: 40, left: 70, right: 70 },
          shading: fill ? { type: ShadingType.CLEAR, color: 'auto', fill: hex(fill) } : undefined,
          children: [new Paragraph({ alignment: ALIGN[c.align || b.align || 'center'], keepNext: keep && !last, spacing: { line: 276, before: 0, after: 0 }, children: runsOf(c.runs.length ? c.runs : [{ text: '' }], { size, color: isHead ? COLORS.accent : undefined }) })],
        });
      }) });
    };
    out.push(new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: ws, layout: TableLayoutType.FIXED,
      borders: tableBorders(),
      rows: (b.header ? [mkRow(b.header, true, !b.rows.length)] : []).concat(b.rows.map((r, i) => mkRow(r, false, i === b.rows.length - 1))) }));
    out.push(new Paragraph({ spacing: { after: 80 }, children: [] }));
  }
  const tableBorders = (c = COLORS.rule, sz = 4) => {
    const s = { style: BorderStyle.SINGLE, size: sz, color: hex(c) };
    return { top: s, bottom: s, left: s, right: s, insideHorizontal: s, insideVertical: s };
  };

  // ───────── 紫微盤（4×4 表格，中央 2×2 合併）
  function ziwei(ch) {
    const cw = Math.floor(CONTENT_W / 4), rowH = 2950;
    const byBranch = {}; ch.palaces.forEach(p => (byBranch[p.branch] = p));
    const at = {}; for (const [br, [r, c]] of Object.entries(BRANCH_POS)) at[r + ',' + c] = byBranch[br];
    const badge = (h, solid) => new TextRun({ text: h, font: FONT, size: 14, bold: true, color: solid ? 'FFFFFF' : hex(COLORS.hua[h]), shading: solid ? { type: ShadingType.CLEAR, color: 'auto', fill: hex(COLORS.hua[h]) } : undefined, border: solid ? undefined : { style: BorderStyle.SINGLE, size: 4, color: hex(COLORS.hua[h]) } });
    const starRuns = (stars, major) => stars.flatMap((s, i) => [
      ...(i ? [new TextRun({ text: ' ', size: 14 })] : []),
      new TextRun({ text: s.name, font: FONT, size: major ? 22 : 18, bold: major, color: hex(s.color || (major ? COLORS.h1 : COLORS.h2)) }),
      ...(s.bright ? [new TextRun({ text: s.bright, font: FONT, size: 13, color: hex(COLORS.muted) })] : []),
      ...s.hua.map(h => badge(h, true)), ...s.selfHua.map(h => badge(h, false)),
    ]);
    const P = (children, o = {}) => new Paragraph({ spacing: { after: 0, line: 260 }, children, ...o });
    const palaceCell = p => {
      if (!p) return new TableCell({ width: { size: cw, type: WidthType.DXA }, children: [P([])] });
      const kids = [];
      if (p.major.length) kids.push(P(starRuns(p.major, true)));
      if (p.minor.length) kids.push(P(starRuns(p.minor, false)));
      if (p.adjective.length) kids.push(P([new TextRun({ text: p.adjective.join(' '), font: FONT, size: 14, color: '4B5563' })]));
      if (p.labels.length) kids.push(P([new TextRun({ text: p.labels.join(' '), font: FONT, size: 13, color: hex(COLORS.gold) })], { alignment: AlignmentType.RIGHT }));
      const dec = Array.isArray(p.decade) ? `${p.decade[0]}–${p.decade[1]}` : p.decade;
      kids.push(P([
        new TextRun({ text: ' ' + p.name + ' ', font: FONT, size: 18, bold: true, color: 'FFFFFF', shading: { type: ShadingType.CLEAR, color: 'auto', fill: hex(p.isMing ? COLORS.red : COLORS.accent) } }),
        ...(p.isBody ? [new TextRun({ text: ' 身 ', font: FONT, size: 18, bold: true, color: 'FFFFFF', shading: { type: ShadingType.CLEAR, color: 'auto', fill: hex(COLORS.h2) } })] : []),
        new TextRun({ text: ' ' + (p.stem || '') + p.branch, font: FONT, size: 19, bold: true }),
        ...(dec ? [new TextRun({ children: [new Tab(), dec], font: FONT, size: 18, bold: true, color: hex(COLORS.h2) })] : []),
      ], { spacing: { before: 60, after: 0 }, tabStops: [{ type: TabStopType.RIGHT, position: cw - 160 }] }));
      if (p.ages.length) kids.push(P([new TextRun({ text: '小限 ' + p.ages.slice(0, 8).join(' '), font: FONT, size: 12, color: hex(COLORS.muted) })], { alignment: AlignmentType.RIGHT }));
      return new TableCell({ width: { size: cw, type: WidthType.DXA }, margins: { top: 50, bottom: 40, left: 60, right: 60 }, verticalAlign: VerticalAlign.TOP,
        shading: p.isMing ? { type: ShadingType.CLEAR, color: 'auto', fill: hex(COLORS.ming) } : undefined, children: kids });
    };
    const centerCell = () => {
      const kids = [P(runsOf([{ text: ch.title, bold: true }], { size: 14, color: COLORS.accent }), { alignment: AlignmentType.CENTER, spacing: { before: 120, after: 60 } })];
      if (ch.subtitle) kids.push(P(runsOf([{ text: ch.subtitle }], { size: 9, color: COLORS.muted }), { alignment: AlignmentType.CENTER }));
      if (m.example) kids.push(P(runsOf([{ text: '【範例資料・非真實命例】', bold: true }], { size: 9, color: COLORS.red }), { alignment: AlignmentType.CENTER, spacing: { after: 80 } }));
      for (const r of ziweiCenterRows(m, ch)) kids.push(P([...runsOf([{ text: r.label + '：', bold: true }], { size: 9, color: COLORS.accent }), ...runsOf([{ text: r.value }], { size: 9 })], { indent: { left: 200 } }));
      if (ch.center.note) kids.push(P(runsOf([{ text: ch.center.note }], { size: 7.5, color: COLORS.muted }), { spacing: { before: 120 }, indent: { left: 200, right: 200 } }));
      return new TableCell({ columnSpan: 2, rowSpan: 2, width: { size: cw * 2, type: WidthType.DXA }, verticalAlign: VerticalAlign.TOP, margins: { top: 60, bottom: 60, left: 80, right: 80 }, children: kids });
    };
    const rows = [];
    for (let r = 0; r < 4; r++) {
      const cells = [];
      for (let c = 0; c < 4; c++) {
        if (r === 1 && c === 1) cells.push(centerCell());
        else if ((r === 1 || r === 2) && (c === 1 || c === 2)) continue;
        else cells.push(palaceCell(at[r + ',' + c]));
      }
      rows.push(new TableRow({ height: { value: rowH, rule: HeightRule.ATLEAST }, cantSplit: true, children: cells }));
    }
    out.push(new Table({ width: { size: cw * 4, type: WidthType.DXA }, columnWidths: [cw, cw, cw, cw], layout: TableLayoutType.FIXED, borders: tableBorders(COLORS.accent, 6), rows }));
    out.push(new Paragraph({ spacing: { before: 80 }, children: [
      ...runsOf([{ text: ch.legend || '星曜後的小字為亮度（廟旺得利平不陷）。四化：' }], { size: 8, color: COLORS.muted }),
      ...'祿權科忌'.split('').map(h => badge(h, true)),
      ...runsOf([{ text: ' 實心＝生年四化，' }], { size: 8, color: COLORS.muted }), badge('忌', false),
      ...runsOf([{ text: ' 空心＝自化。' }], { size: 8, color: COLORS.muted }),
    ] }));
  }

  // ───────── 首頁
  out.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: runsOf([{ text: m.title || '命書', bold: true }], { size: 20, color: COLORS.accent }) }));
  if (doc.chart?.type === 'ziwei') ziwei(doc.chart);
  else {
    if (m.example) out.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: runsOf([{ text: '【範例資料・非真實命例】', bold: true }], { size: 10, color: COLORS.red }) }));
    table(metaTable(m));
    if (doc.chart?.type === 'bazi') baziTables(doc.chart).forEach(t => table(t));
  }

  // ───────── 內文
  let first = !!doc.chart;   // 有命盤時，第一個章標題一定換頁
  let started = false;       // 沒有命盤時，第一章接在標題下
  const quote = (b, isNote) => {
    const bar = isNote ? 'B8B2A6' : hex(COLORS.quoteBar), fill = isNote ? 'F5F4F1' : hex(COLORS.quoteFill);
    const pp = { indent: { left: isNote ? 120 : 280, right: 120 }, shading: { type: ShadingType.CLEAR, color: 'auto', fill },
      border: { left: { style: BorderStyle.SINGLE, size: 18, color: bar, space: 8 } } };
    out.push(new Paragraph({ ...pp, spacing: { before: 80, after: 0, line: 340 }, alignment: AlignmentType.JUSTIFIED, children: runsOf(b.runs, { size: isNote ? 9 : BODY, color: isNote ? COLORS.muted : '#3b2f22' }) }));
    if (!isNote && (b.cite || b.pending)) out.push(new Paragraph({ ...pp, alignment: AlignmentType.RIGHT, spacing: { after: 120 }, children: [
      ...(b.cite ? runsOf([{ text: '——' + b.cite }], { size: 9, color: COLORS.muted }) : []),
      ...(b.pending ? runOf({ text: PENDING_LABEL, pending: true, size: 9 }) : []),
    ] }));
    else out.push(new Paragraph({ spacing: { after: 80 }, children: [] }));
  };
  const list = (b, depth = 0) => {
    const markers = b.items.map((_, i) => listMarker(b.style, (b.start || 1) + i));
    const em = s => [...s].reduce((a, ch) => a + (ch.charCodeAt(0) < 0x2000 ? 0.55 : 1), 0);
    const mw = Math.round((Math.max(1, ...markers.map(em)) + 0.2) * BODY * 20);
    const left = depth * 420 + mw;
    b.items.forEach((it, i) => {
      out.push(new Paragraph({ indent: { left, hanging: mw }, alignment: AlignmentType.JUSTIFIED, spacing: { after: 40, line: 340 }, tabStops: [{ type: TabStopType.LEFT, position: left }],
        children: [new TextRun({ text: markers[i], font: FONT, size: hp(BODY), color: b.style === 'bullet' ? hex(COLORS.muted) : undefined }), new TextRun({ children: [new Tab()] }), ...runsOf(it.runs)] }));
      if (it.sub) list(it.sub, depth + 1);
    });
    if (!depth) out.push(new Paragraph({ spacing: { after: 40 }, children: [] }));
  };
  for (const b of doc.sections) {
    switch (b.type) {
      case 'heading': {
        const lv = [null, HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4][b.level];
        const br = b.level === 1 && (first || (b.pageBreak && (doc.chart || started)));
        out.push(new Paragraph({ heading: lv, pageBreakBefore: br, alignment: b.level === 1 ? AlignmentType.CENTER : undefined,
          children: [new TextRun({ text: b.text, font: FONT }), ...(b.pending ? runOf({ text: PENDING_LABEL, pending: true, size: 9 }) : [])] }));
        if (b.level === 1) first = false;
        break;
      }
      case 'paragraph': {
        const size = b.size || BODY;
        if (first) { out.push(new Paragraph({ children: [new PageBreak()] })); first = false; }
        out.push(new Paragraph({ alignment: ALIGN[b.align] || AlignmentType.JUSTIFIED, indent: b.indent ? { firstLine: Math.round(b.indent * size * 20) } : undefined, spacing: { after: 100, line: 360 }, children: runsOf(b.runs, { size }) }));
        break;
      }
      case 'list': list(b); break;
      case 'table': table(b); break;
      case 'quote': quote(b, false); break;
      case 'note': quote(b, true); break;
      case 'pageBreak': out.push(new Paragraph({ children: [new PageBreak()] })); break;
    }
    started = true;
  }
  quote({ runs: [{ text: (m.disclaimer ? m.disclaimer + '\n' : '') + generatedLine(m) }] }, true);

  // ───────── 頁首／頁尾
  const small = { font: FONT, size: 17, color: hex(COLORS.muted) };
  const header = new Header({ children: [new Paragraph({
    style: 'MsHeader',
    tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_W }],
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: hex(COLORS.rule), space: 2 } },
    children: [new TextRun({ text: (m.siteTitle || m.title) + (m.example ? '（範例資料）' : ''), ...small }), new TextRun({ children: [new Tab()], ...small }),
      opts.docxChapterField === false ? new TextRun({ text: m.title, ...small }) : new SimpleField('STYLEREF "Heading 1" \\* MERGEFORMAT', m.title)],
  })] });
  const footer = new Footer({ children: [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: ['第 ', PageNumber.CURRENT, ' 頁／共 ', PageNumber.TOTAL_PAGES, ' 頁'], ...small })] }),
    ...(m.example ? [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '範例資料・非真實命例', font: FONT, size: 15, color: hex(COLORS.red) })] })] : []),
  ] });
  const hStyle = (id, name, size, c, extra = {}) => ({ id, name, basedOn: 'Normal', next: 'Normal', quickFormat: true,
    run: { font: FONT, size: hp(size), bold: true, color: hex(c), ...(extra.run || {}) },
    paragraph: { keepNext: true, keepLines: true, spacing: extra.spacing || { before: 200, after: 80 }, ...(extra.paragraph || {}) } });
  const d = new Document({
    creator: m.siteTitle || 'mingshu-export', title: [m.title, m.name].filter(Boolean).join('－'), description: m.title, lastModifiedBy: 'mingshu-export',
    styles: {
      default: { document: { run: { font: FONT, size: hp(BODY) }, paragraph: { spacing: { line: 360 } } } },
      paragraphStyles: [
        { id: 'MsHeader', name: 'Mingshu Header', basedOn: 'Normal', run: { font: FONT, size: 17, color: hex(COLORS.muted) }, paragraph: { spacing: { line: 240, after: 0 } } },
        hStyle('Heading1', 'Heading 1', 17, COLORS.h1, { run: { underline: {} }, spacing: { before: 0, after: 240 }, paragraph: { alignment: AlignmentType.CENTER, outlineLevel: 0 } }),
        hStyle('Heading2', 'Heading 2', 13.5, COLORS.h2, { spacing: { before: 240, after: 80 }, paragraph: { outlineLevel: 1, border: { left: { style: BorderStyle.SINGLE, size: 24, color: hex(COLORS.quoteBar), space: 6 } } } }),
        hStyle('Heading3', 'Heading 3', 11.5, COLORS.h3, { spacing: { before: 160, after: 40 }, paragraph: { outlineLevel: 2 } }),
        hStyle('Heading4', 'Heading 4', BODY, COLORS.h4, { spacing: { before: 120, after: 20 }, paragraph: { outlineLevel: 3 } }),
      ],
    },
    sections: [{ properties: { page: { size: { width: PAGE_W, height: PAGE_H }, margin: MAR } }, headers: { default: header }, footers: { default: footer }, children: out }],
  });
  return Packer.toBlob ? (typeof Blob !== 'undefined' ? Packer.toBlob(d) : Packer.toBuffer(d)) : Packer.toBuffer(d);
}
