// 命書 PDF：pdf-lib 向量排版，Noto Serif CJK TC 子集嵌入（文字可選取、可搜尋，不靠瀏覽器列印）。
import { COLORS, BRANCH_POS, PENDING_LABEL, color, allText } from './schema.js';
import { metaTable, baziTables, ziweiCenterRows, generatedLine } from './chart-tables.js';
import { embedFonts } from './fonts.js';

const PW = 595.28, PH = 841.89;            // A4（pt）
const ML = 56, MR = 56, MT = 66, MB = 62;  // 版心邊界
const CW = PW - ML - MR;
const BODY = 10.5, LH = 1.7;
const ASC = 0.88;                          // Noto CJK 基線位置（em）
const NOSTART = '，。、；：？！）」』〉》】〕…—～·・%,.;:?!)]}』”’';
const NOEND = '（「『〈《【〔([{“‘';
import { listMarker } from './list-marker.js';

export async function renderPdf(doc, opts = {}) {
  const lib = await import('../vendor/pdf-lib.esm.min.js');
  const fontkit = (await import('../vendor/fontkit.esm.min.js')).default;
  const { PDFDocument, rgb, degrees } = lib;
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const m = doc.meta;
  pdf.setTitle([m.title, m.name].filter(Boolean).join('－'));
  pdf.setAuthor(m.siteTitle || '');
  pdf.setSubject(m.title || '');
  pdf.setCreator('mingshu-export（regulusab）');
  pdf.setProducer('pdf-lib');
  pdf.setLanguage('zh-TW');
  const F = await embedFonts(pdf, allText(doc), opts);
  const col = h => { const n = parseInt(color(h).slice(1), 16); return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255); };

  // ───────── 基本繪圖
  const S = { page: null, y: MT, pages: [], chapter: '', coverDone: false };
  const newPage = () => { S.page = pdf.addPage([PW, PH]); S.pages.push({ page: S.page, chapter: S.chapter }); S.y = MT; };
  const bottom = PH - MB;
  const ensure = h => { if (S.y + h > bottom + 0.01) newPage(); };
  const atTop = () => S.y <= MT + 0.5;
  const text = (s, x, top, size, o = {}) => {
    const c = col(o.color || COLORS.text);
    let cx = x;
    const base = PH - (top + size * ASC);
    for (const seg of F.segments(s, !!o.bold)) {
      const opt = { x: cx, y: base, size, font: seg.font, color: c };
      if (o.opacity != null) opt.opacity = o.opacity;
      S.page.drawText(seg.text, opt);
      if (seg.fake) S.page.drawText(seg.text, { ...opt, x: cx + size * 0.035 });
      cx += F.measure(seg.text, size, !!o.bold && !seg.fake);
    }
    return cx - x;
  };
  const W = (s, size, bold) => F.measure(s, size, !!bold);
  const rect = (x, top, w, h, o = {}) => S.page.drawRectangle({ x, y: PH - top - h, width: w, height: h, ...(o.fill ? { color: col(o.fill) } : {}), ...(o.stroke ? { borderColor: col(o.stroke), borderWidth: o.lw ?? 0.6 } : {}), ...(o.opacity != null ? { opacity: o.opacity } : {}) });
  const line = (x1, y1, x2, y2, lw = 0.6, c = COLORS.rule) => S.page.drawLine({ start: { x: x1, y: PH - y1 }, end: { x: x2, y: PH - y2 }, thickness: lw, color: col(c) });

  // ───────── 行內排版（中日文逐字斷行＋避頭尾＋英數詞不拆）
  function tokens(runs, size) {
    const out = [];
    for (const r of runs) {
      const st = { size: r.size || size, bold: !!r.bold, color: r.color ? color(r.color) : null, pending: !!r.pending };
      if (r.pending) { const s = st.size * 0.78; out.push({ text: r.text || PENDING_LABEL, st: { ...st, size: s }, w: W(r.text || PENDING_LABEL, s, false) + 8, pend: true, lead: 3 }); continue; }
      if (r.nobreak) { out.push({ text: r.text, st, w: W(r.text, st.size, st.bold) }); continue; }
      for (const mm of r.text.matchAll(/\n|[\x21-\x7E\u00C0-\u024F\u2013]+|[ \t\u00A0]+|./gsu)) {
        const t = mm[0];
        if (t === '\n') out.push({ br: true, st });
        else if (/^[ \t\u00A0]+$/.test(t)) out.push({ text: ' ', st, w: W(' ', st.size, st.bold), space: true });
        else out.push({ text: t, st, w: W(t, st.size, st.bold) });
      }
    }
    return out;
  }
  function layout(runs, width, size, firstIndent = 0) {
    const toks = [];
    for (const t of tokens(runs, size)) {
      if (!t.br && !t.pend && t.w > width && t.text.length > 1) for (const ch of t.text) toks.push({ ...t, text: ch, w: W(ch, t.st.size, t.st.bold) });
      else toks.push(t);
    }
    const lines = [];
    let cur = [], cw = firstIndent;
    const push = hard => {
      while (cur.length && cur[cur.length - 1].space) cur.pop();
      const h = Math.max(size, ...cur.map(t => t.st.size)) * LH;
      lines.push({ toks: cur, w: cur.reduce((a, t) => a + t.w + (t.lead || 0), 0), h, hard, indent: lines.length ? 0 : firstIndent });
      cur = []; cw = 0;
    };
    for (const t of toks) {
      if (t.br) { push(true); continue; }
      if (t.space && !cur.length) continue;
      const tw = t.w + (t.lead || 0);
      if (cw + tw <= width - (lines.length ? 0 : 0) + 0.01 || !cur.length) { cur.push(t); cw += tw; continue; }
      if (!t.pend && NOSTART.includes(t.text[0]) && t.text.length === 1 && cw + tw <= width + t.st.size * 1.01) { cur.push(t); cw += tw; push(false); continue; }
      const carry = [];
      if (cur.length > 1 && !cur[cur.length - 1].pend && NOEND.includes(cur[cur.length - 1].text)) carry.push(cur.pop());
      push(false);
      cur = carry; cw = carry.reduce((a, x) => a + x.w, 0);
      if (t.space) continue;
      cur.push(t); cw += tw;
    }
    if (cur.length || !lines.length) push(true);
    else lines[lines.length - 1].hard = true;
    return lines;
  }
  function drawLine(ln, x, top, width, align, baseColor) {
    const n = ln.toks.length;
    let extra = 0, ox = ln.indent;
    const avail = width - ln.indent;
    if (align === 'justify' && !ln.hard && n > 1) { extra = (avail - ln.w) / (n - 1); if (extra < 0 || extra > BODY * 0.6) extra = 0; }
    else if (align === 'center') ox += (avail - ln.w) / 2;
    else if (align === 'right') ox += avail - ln.w;
    const maxSz = Math.max(...ln.toks.map(t => t.st.size), 1);
    let cx = x + ox;
    for (const t of ln.toks) {
      cx += t.lead || 0;
      const sz = t.st.size;
      const tTop = top + (ln.h - maxSz) / 2 + (maxSz - sz) * ASC;
      if (t.pend) {
        rect(cx, tTop - sz * 0.22, t.w, sz * 1.42, { fill: COLORS.pendingFill });
        text(t.text, cx + 4, tTop, sz, { color: COLORS.pendingText });
      } else if (!t.space) text(t.text, cx, tTop, sz, { bold: t.st.bold, color: t.st.color || baseColor });
      cx += t.w + extra;
    }
  }
  // 流式段落：逐行換頁；onLine 可在每行前畫底色（引文框）
  function flow(runs, x, width, o = {}) {
    const size = o.size || BODY;
    const lines = layout(runs, width, size, o.firstIndent || 0);
    lines.forEach((ln, i) => {
      if (S.y + ln.h > bottom + 0.01) newPage();
      if (o.onLine) o.onLine(S.y, ln.h, i, lines.length);
      drawLine(ln, x, S.y, width, o.align || 'justify', o.color);
      S.y += ln.h;
    });
    return lines;
  }
  const linesHeight = ls => ls.reduce((a, l) => a + l.h, 0);

  // ───────── 區塊
  function heading(b) {
    const runs = [{ text: b.text, bold: true }].concat(b.pending ? [{ text: PENDING_LABEL, pending: true }] : []);
    if (b.level === 1) {
      if (b.pageBreak && !atTop() && S.coverDone) newPage();
      S.chapter = b.text;
      if (atTop()) S.pages[S.pages.length - 1].chapter = b.text;
      ensure(80);
      S.y += atTop() ? 0 : 14;
      const ls = flow(runs, ML, CW, { size: 17, align: 'center', color: COLORS.h1 });
      const w = Math.min(CW, ls[ls.length - 1].w);
      line(ML + (CW - w) / 2, S.y - 3, ML + (CW + w) / 2, S.y - 3, 0.9, COLORS.h1);
      S.y += 10;
      S.coverDone = true;
      return;
    }
    const conf = { 2: [13.5, COLORS.h2, 12, 4], 3: [11.5, COLORS.h3, 8, 2], 4: [BODY, COLORS.h4, 6, 1] }[b.level];
    const [size, c, before, after] = conf;
    ensure(size * LH + before + BODY * LH * 2);
    if (!atTop()) S.y += before;
    if (b.level === 2) { const lsTop = S.y; flow(runs, ML + 8, CW - 8, { size, align: 'left', color: c }); rect(ML, lsTop + size * 0.42, 3.2, size * 1.05, { fill: COLORS.quoteBar }); }
    else flow(runs, ML, CW, { size, align: 'left', color: c });
    S.y += after;
  }
  function paragraph(b, x = ML, width = CW) {
    const size = b.size || BODY;
    flow(b.runs, x, width, { size, firstIndent: (b.indent || 0) * size, align: b.align });
    S.y += 4;
  }
  function list(b, x = ML, width = CW, depth = 0) {
    const size = BODY;
    const markers = b.items.map((_, i) => listMarker(b.style, (b.start || 1) + i));
    const mw = Math.max(0, ...markers.map(mk => W(mk, size, false))) + (b.style === 'bullet' ? 2 : 1);
    b.items.forEach((it, i) => {
      const ls = layout(it.runs, width - mw, size);
      if (S.y + ls[0].h > bottom) newPage();
      text(markers[i], x, S.y + (ls[0].h - size) / 2, size, { color: b.style === 'bullet' ? COLORS.muted : COLORS.text });
      flow(it.runs, x + mw, width - mw, { size });
      if (it.sub) list(it.sub, x + mw, width - mw, depth + 1);
    });
    if (!depth) S.y += 4;
  }
  function quote(b, kind = 'quote') {
    const isNote = kind === 'note';
    const size = isNote ? 9 : BODY;
    const padX = 10, x = ML + (isNote ? 0 : 6), w = CW - (isNote ? 0 : 6);
    const bar = isNote ? '#b8b2a6' : COLORS.quoteBar, fill = isNote ? '#f5f4f1' : COLORS.quoteFill;
    const box = (top, h) => { rect(x, top, w, h, { fill }); rect(x, top, 2.4, h, { fill: bar }); };
    ensure(size * LH * 2 + 8);
    box(S.y, 5); S.y += 5;
    flow(b.runs, x + padX, w - padX * 2, { size, color: isNote ? COLORS.muted : '#3b2f22', onLine: (t, h) => box(t, h) });
    if (!isNote && (b.cite || b.pending)) {
      const runs = [];
      if (b.cite) runs.push({ text: '——' + b.cite, color: COLORS.muted, size: 9 });
      if (b.pending) runs.push({ text: PENDING_LABEL, pending: true, size: 9 });
      flow(runs, x + padX, w - padX * 2, { size: 9, align: 'right', onLine: (t, h) => box(t, h) });
    }
    if (S.y + 5 > bottom) newPage();
    box(S.y, 5); S.y += 5 + 8;
  }

  // 表格：欄寬依 widths 比例或內容估算；跨頁時重複表頭；支援 colspan
  function table(b, x = ML, width = CW) {
    const size = b.size || 9.5, pad = 3.2;
    const all = (b.header ? [b.header] : []).concat(b.rows);
    const ncol = Math.max(1, ...all.map(r => r.reduce((a, c) => a + (c.colspan || 1), 0)));
    let ws;
    if (b.widths && b.widths.length === ncol) ws = b.widths.map(Number);
    else {
      ws = Array(ncol).fill(0);
      for (const r of all) { let ci = 0; for (const c of r) { if ((c.colspan || 1) === 1) { const nat = Math.max(...c.runs.map(rr => rr.text.split('\n').map(s => W(s, rr.size || size, rr.bold)).reduce((a, v) => Math.max(a, v), 0)), 0); ws[ci] = Math.max(ws[ci], Math.min(nat, width * 0.45)); } ci += c.colspan || 1; } }
      ws = ws.map(v => Math.max(v + pad * 2, size * 2.5));
    }
    const tot = ws.reduce((a, v) => a + v, 0);
    ws = ws.map(v => (v / tot) * width);
    const lay = r => {
      let ci = 0;
      const cells = r.map(c => {
        const span = c.colspan || 1;
        const cx = x + ws.slice(0, ci).reduce((a, v) => a + v, 0), cw = ws.slice(ci, ci + span).reduce((a, v) => a + v, 0);
        ci += span;
        const runs = c.runs.length ? c.runs : [{ text: ' ' }];
        const ls = layout(runs, cw - pad * 2, size);
        ls.forEach(l => (l.h = Math.max(...l.toks.map(t => t.st.size), size) * 1.35));
        return { c, cx, cw, ls, h: linesHeight(ls) + pad * 2 };
      });
      return { cells, h: Math.max(...cells.map(c => c.h), size * 1.35 + pad * 2) };
    };
    const drawRow = (R, isHead) => {
      for (const k of R.cells) {
        const fill = k.c.fill || (isHead ? COLORS.fill : null);
        if (fill) rect(k.cx, S.y, k.cw, R.h, { fill: color(fill) });
        const inner = linesHeight(k.ls);
        let ty = S.y + (k.c.valign === 'top' ? pad : (R.h - inner) / 2);
        for (const l of k.ls) { drawLine(l, k.cx + pad, ty, k.cw - pad * 2, k.c.align || b.align || 'center', isHead ? COLORS.accent : null); ty += l.h; }
        rect(k.cx, S.y, k.cw, R.h, { stroke: COLORS.rule, lw: 0.5 });
      }
      S.y += R.h;
    };
    const head = b.header ? lay(b.header) : null;
    const rows = b.rows.map(lay);
    const capH = b.caption ? 11 * LH + 2 : 0;
    const total = capH + (head ? head.h : 0) + rows.reduce((a, r) => a + r.h, 0);
    if (b.chart || total < 260) ensure(Math.min(total, bottom - MT));
    else ensure(capH + (head ? head.h : 0) + (rows[0] ? rows[0].h : 0));
    if (b.caption) { flow([{ text: b.caption, bold: true }], x, width, { size: 11, align: 'left', color: COLORS.accent }); S.y += 2; }
    if (head) drawRow(head, true);
    for (const R of rows) {
      if (S.y + R.h > bottom + 0.01) { newPage(); if (head) drawRow(head, true); }
      drawRow(R, false);
    }
    S.y += 8;
  }

  // ───────── 紫微十二宮盤
  function ziwei(ch) {
    const top = S.y, legendH = 30;
    const gh = bottom - top - legendH, cw = CW / 4, chh = gh / 4;
    const byBranch = {};
    for (const p of ch.palaces) byBranch[p.branch] = p;
    for (const [br, [r, c]] of Object.entries(BRANCH_POS)) {
      const p = byBranch[br];
      if (p) palace(p, ML + c * cw, top + r * chh, cw, chh);
    }
    // 中央
    center(ch, ML + cw, top + chh, cw * 2, chh * 2);
    // 格線
    for (let i = 1; i < 4; i++) {
      const y = top + i * chh, xx = ML + i * cw;
      if (i === 2) { line(ML, y, ML + cw, y); line(ML + 3 * cw, y, ML + CW, y); line(xx, top, xx, top + chh); line(xx, top + 3 * chh, xx, top + gh); }
      else { line(ML, y, ML + CW, y); line(xx, top, xx, top + gh); }
    }
    rect(ML, top, CW, gh, { stroke: COLORS.accent, lw: 1.2 });
    rect(ML + cw, top + chh, cw * 2, chh * 2, { stroke: COLORS.accent, lw: 0.9 });
    // 圖例
    let lx = ML, ly = top + gh + 7;
    lx += text(ch.legend || '星曜後的小字為亮度（廟旺得利平不陷）。四化：', lx, ly, 8, { color: COLORS.muted });
    for (const h of '祿權科忌') { badge(lx + 2, ly - 0.5, h, true); lx += 13; }
    lx += text('實心＝生年四化，', lx + 3, ly, 8, { color: COLORS.muted }) + 3;
    badge(lx + 1, ly - 0.5, '忌', false); lx += 12;
    text('空心＝自化。', lx + 2, ly, 8, { color: COLORS.muted });
    S.y = top + gh + legendH;
  }
  function badge(x, top, h, solid) {
    const c = COLORS.hua[h] || COLORS.red, s = 9.2;
    rect(x, top, s, s, solid ? { fill: c } : { stroke: c, lw: 0.8, fill: '#ffffff' });
    text(h, x + (s - 7) / 2, top + 0.9, 7, { color: solid ? '#ffffff' : c, bold: true });
  }
  function palace(p, x, y, w, h) {
    if (p.isMing) rect(x, y, w, h, { fill: COLORS.ming });
    const bandH = 30, bandTop = y + h - bandH;
    const stars = p.major.map(s => ({ ...s, kind: 'major' })).concat(p.minor.map(s => ({ ...s, kind: 'minor' })));
    let cx = x + 4, maxB = y + 4;
    const overflow = [];
    for (const s of stars) {
      const sz = s.kind === 'major' ? 12.5 : 10.5, colW = sz + 3;
      if (cx + colW > x + w - 3) { overflow.push(s.name + (s.bright || '')); continue; }
      let yy = y + 5;
      for (const chr of s.name) { text(chr, cx + (colW - sz) / 2, yy, sz, { bold: s.kind === 'major', color: s.color ? color(s.color) : s.kind === 'major' ? COLORS.h1 : COLORS.h2 }); yy += sz * 1.1; }
      if (s.bright) { text(s.bright, cx + (colW - 7) / 2, yy + 0.5, 7, { color: COLORS.muted }); yy += 8.5; }
      for (const hh of s.hua) { badge(cx + (colW - 9.2) / 2, yy + 1, hh, true); yy += 10.5; }
      for (const hh of s.selfHua) { badge(cx + (colW - 9.2) / 2, yy + 1, hh, false); yy += 10.5; }
      maxB = Math.max(maxB, yy);
      cx += colW;
    }
    // 右下：長生、博士等小標籤
    const lsz = 7.5, labW = p.labels.length ? Math.max(...p.labels.map(l => W(l, lsz))) + 3 : 0;
    p.labels.slice(0, 5).forEach((l, i, a) => text(l, x + w - 3 - W(l, lsz), bandTop - 2 - (a.length - i) * (lsz * 1.25), lsz, { color: COLORS.gold }));
    // 雜曜
    const adj = overflow.concat(p.adjective);
    if (adj.length) {
      const runs = [];
      adj.forEach((a, i) => { if (i) runs.push({ text: ' ' }); runs.push({ text: a, nobreak: true }); });
      const aw = w - 8 - labW;
      const ls = layout(runs, aw, 8);
      let ay = Math.max(maxB + 3, y + 40);
      const lim = bandTop - 1;
      for (const l of ls) { l.h = 8 * 1.35; if (ay + l.h > lim) break; drawLine(l, x + 4, ay, aw, 'left', '#4b5563'); ay += l.h; }
    }
    // 宮名、干支、大限、小限
    const nm = p.name || '';
    const nW = W(nm, 9, true) + 6;
    rect(x + 3, bandTop + 1, nW, 13, { fill: p.isMing ? COLORS.red : COLORS.accent });
    text(nm, x + 6, bandTop + 3, 9, { bold: true, color: '#ffffff' });
    let nx = x + 3 + nW + 2;
    if (p.isBody) { rect(nx, bandTop + 1, 13, 13, { fill: COLORS.h2 }); text('身', nx + 2, bandTop + 3, 9, { bold: true, color: '#ffffff' }); nx += 15; }
    text((p.stem || '') + p.branch, x + 5, bandTop + 16.5, 9.5, { bold: true });
    const dec = Array.isArray(p.decade) ? `${p.decade[0]}–${p.decade[1]}` : p.decade;
    if (dec) text(dec, x + w - 4 - W(dec, 9, true), bandTop + 3, 9, { bold: true, color: COLORS.h2 });
    if (p.ages.length) {
      let s = '小限 ' + p.ages.join(' ');
      const maxW = w * 0.62;
      while (W(s, 6.5) > maxW && s.includes(' ')) s = s.slice(0, s.lastIndexOf(' '));
      text(s, x + w - 4 - W(s, 6.5), bandTop + 18, 6.5, { color: COLORS.muted });
    }
  }
  function center(ch, x, y, w, h) {
    let yy = y + 12;
    const t = ch.title;
    text(t, x + (w - W(t, 14, true)) / 2, yy, 14, { bold: true, color: COLORS.accent }); yy += 20;
    if (ch.subtitle) { text(ch.subtitle, x + (w - W(ch.subtitle, 9)) / 2, yy, 9, { color: COLORS.muted }); yy += 14; }
    if (m.example) { const e = '【範例資料・非真實命例】'; text(e, x + (w - W(e, 9, true)) / 2, yy, 9, { bold: true, color: COLORS.red }); yy += 15; }
    const rows = ziweiCenterRows(m, ch);
    const lw = Math.max(0, ...rows.map(r => W(r.label, 9, true))) + 8;
    const vx = x + 16 + lw, vw = w - 32 - lw;
    for (const r of rows) {
      const ls = layout([{ text: r.value }], vw, 9);
      ls.forEach(l => (l.h = 9 * 1.45));
      if (yy + linesHeight(ls) > y + h - 30) break;
      text(r.label, x + 16, yy + (9 * 1.45 - 9) / 2, 9, { bold: true, color: COLORS.accent });
      for (const l of ls) { drawLine(l, vx, yy, vw, 'left'); yy += l.h; }
      yy += 1.5;
    }
    if (ch.center.note) {
      const ls = layout([{ text: ch.center.note }], w - 32, 7.5);
      ls.forEach(l => (l.h = 7.5 * 1.4));
      let ny = y + h - 8 - linesHeight(ls);
      for (const l of ls) { drawLine(l, x + 16, ny, w - 32, 'left', COLORS.muted); ny += l.h; }
    }
  }

  // ───────── 首頁
  newPage();
  const title = m.title || '命書';
  const tsz = 20;
  text(title, ML + (CW - W(title, tsz, true)) / 2, S.y - 6, tsz, { bold: true, color: COLORS.accent });
  S.y += tsz * 1.25;
  const sub = [doc.chart && doc.chart.type === 'ziwei' && doc.chart.subtitle ? '' : '', m.example ? '' : ''].join('');
  if (doc.chart && doc.chart.type === 'ziwei') { S.y += 2; ziwei(doc.chart); }
  else {
    if (m.example) { const e = '【範例資料・非真實命例】'; text(e, ML + (CW - W(e, 10, true)) / 2, S.y, 10, { bold: true, color: COLORS.red }); S.y += 18; }
    table(metaTable(m));
    if (doc.chart && doc.chart.type === 'bazi') for (const t of baziTables(doc.chart)) table(t);
  }
  void sub;
  S.coverDone = !!doc.chart;   // 沒有命盤時，第一章接在標題下，不另起新頁
  if (doc.chart) newPage();
  else S.y += 6;

  // ───────── 內文
  for (const b of doc.sections) {
    switch (b.type) {
      case 'heading': heading(b); break;
      case 'paragraph': paragraph(b); break;
      case 'list': list(b); break;
      case 'table': table(b); break;
      case 'quote': quote(b); break;
      case 'note': quote(b, 'note'); break;
      case 'pageBreak': if (!atTop()) newPage(); break;
    }
  }
  // 結尾聲明
  S.y += 6;
  const tail = [{ text: (m.disclaimer ? m.disclaimer + '\n' : '') + generatedLine(m) }];
  quote({ runs: tail }, 'note');

  // ───────── 頁首、頁尾、範例浮水印
  const N = S.pages.length;
  S.pages.forEach((pg, i) => {
    S.page = pg.page;
    if (m.example) {
      const wm = '範例資料', sz = 72;
      S.page.drawText(wm, { x: PW / 2 - 150, y: PH / 2 - 120, size: sz, font: F.regular, color: col('#c9b99a'), opacity: 0.16, rotate: degrees(35) });
    }
    const hs = 8.5;
    text(m.siteTitle || title, ML, 30, hs, { color: COLORS.muted });
    const chap = pg.chapter || title;
    text(chap, PW - MR - W(chap, hs), 30, hs, { color: COLORS.muted });
    line(ML, 44, PW - MR, 44, 0.5, COLORS.rule);
    const pn = `第 ${i + 1} 頁／共 ${N} 頁`;
    text(pn, (PW - W(pn, hs)) / 2, PH - 40, hs, { color: COLORS.muted });
    if (m.example) text('範例資料・非真實命例', ML, PH - 40, 8, { color: COLORS.red });
    if (m.name) { const nm = m.name; text(nm, PW - MR - W(nm, 8), PH - 40, 8, { color: COLORS.muted }); }
  });
  const bytes = await pdf.save({ useObjectStreams: true });
  return { bytes, pages: N, missing: [...F.missing] };
}
