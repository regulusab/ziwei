// 命書文件（mingshu/1）：驗證與正規化。PDF、Word 兩個輸出端共用。
// 完整欄位說明見 docs/SCHEMA.md；JSON Schema 見 schema/mingshu.schema.json。

export const SCHEMA_ID = 'mingshu/1';

// 紫微十二宮在 4×4 盤面上的位置（[列, 欄]），依地支固定，與傳統盤式相同。
export const BRANCH_POS = {
  巳: [0, 0], 午: [0, 1], 未: [0, 2], 申: [0, 3],
  辰: [1, 0], 酉: [1, 3],
  卯: [2, 0], 戌: [2, 3],
  寅: [3, 0], 丑: [3, 1], 子: [3, 2], 亥: [3, 3],
};
export const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';
export const STEMS = '甲乙丙丁戊己庚辛壬癸';

const ELEM_OF = {};
'甲乙寅卯'.split('').forEach(c => (ELEM_OF[c] = '木'));
'丙丁巳午'.split('').forEach(c => (ELEM_OF[c] = '火'));
'戊己辰戌丑未'.split('').forEach(c => (ELEM_OF[c] = '土'));
'庚辛申酉'.split('').forEach(c => (ELEM_OF[c] = '金'));
'壬癸亥子'.split('').forEach(c => (ELEM_OF[c] = '水'));
export const elementOf = ch => ELEM_OF[ch] || null;

// 共用配色（PDF 與 Word 相同）
export const COLORS = {
  text: '#222222', muted: '#6b7280', rule: '#9a8c73', fill: '#f3ead6', accent: '#7a1f1f',
  h1: '#7a1f1f', h2: '#1f4e8c', h3: '#b42318', h4: '#3b2f22',
  red: '#c0392b', blue: '#1f4e8c', green: '#1e7b34', gray: '#6b7280', gold: '#9a6b16', purple: '#6b2fa0', brown: '#8a5a14', black: '#222222',
  pendingText: '#9a3412', pendingFill: '#fde8d0',
  quoteBar: '#b08a3e', quoteFill: '#faf6ee',
  elem: { 木: '#1e7b34', 火: '#c0392b', 土: '#8a5a14', 金: '#a87b00', 水: '#1f4e8c' },
  hua: { 祿: '#1e7b34', 權: '#6b2fa0', 科: '#1f4e8c', 忌: '#c0392b' },
  ming: '#fff7e6',
};
export const PENDING_LABEL = '來源待核';

/** 把 'red' 之類的名稱或 #rgb/#rrggbb 轉成 #rrggbb；無法辨識時回傳 fallback。 */
export function color(c, fallback = COLORS.text) {
  if (!c) return fallback;
  if (COLORS[c] && typeof COLORS[c] === 'string') return COLORS[c];
  if (/^#[0-9a-f]{6}$/i.test(c)) return c.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(c)) return '#' + c.slice(1).split('').map(x => x + x).join('').toLowerCase();
  return fallback;
}

const isStr = v => typeof v === 'string';
const arr = v => (Array.isArray(v) ? v : v == null || v === '' ? [] : [v]);

/** 行內文字：字串或 runs 陣列 → [{text,bold,color,size,pending}] */
export function toRuns(b) {
  let runs;
  if (Array.isArray(b?.runs)) runs = b.runs.map(r => (isStr(r) ? { text: r } : { ...r }));
  else if (isStr(b)) runs = [{ text: b }];
  else runs = [{ text: b?.text == null ? '' : String(b.text) }];
  runs = runs.map(r => (r.tag === 'pending' ? { text: PENDING_LABEL, pending: true } : { ...r, text: String(r.text ?? '') }));
  if (b && !isStr(b) && b.pending) runs.push({ text: PENDING_LABEL, pending: true });
  return runs.filter(r => r.text !== '');
}

function normHua(v) {
  return arr(v).map(x => (isStr(x) ? x : x?.type || x?.hua || '')).filter(x => /^[祿權科忌]$/.test(x));
}
function normStar(s) {
  if (isStr(s)) return { name: s, bright: '', hua: [], selfHua: [] };
  return { name: String(s.name || ''), bright: s.bright || s.brightness || '', hua: normHua(s.hua ?? s.mutagen), selfHua: normHua(s.selfHua) , color: s.color };
}

function normZiwei(c, errs, warns) {
  const palaces = arr(c.palaces);
  if (palaces.length !== 12) errs.push(`chart.palaces 需要 12 宮，目前 ${palaces.length} 宮`);
  const seen = new Set();
  const out = palaces.map((p, i) => {
    const branch = p.branch || p.earthlyBranch;
    if (!BRANCH_POS[branch]) errs.push(`chart.palaces[${i}].branch 不是地支：${branch}`);
    if (seen.has(branch)) errs.push(`chart.palaces 地支重複：${branch}`);
    seen.add(branch);
    const dec = p.decade || p.decadal?.range;
    return {
      branch, stem: p.stem || p.heavenlyStem || '', name: p.name || '',
      isBody: !!(p.isBody ?? p.isBodyPalace), isMing: !!(p.isMing ?? /^命/.test(p.name || '')),
      major: arr(p.major).map(normStar), minor: arr(p.minor).map(normStar),
      adjective: arr(p.adjective).map(s => (isStr(s) ? s : s.name)).filter(Boolean),
      labels: arr(p.labels).map(String),
      decade: Array.isArray(dec) ? dec.slice(0, 2) : dec ? String(dec) : '',
      ages: arr(p.ages).map(String),
      highlight: p.highlight || '',
    };
  });
  return {
    type: 'ziwei', title: c.title || '紫微斗數命盤', subtitle: c.subtitle || '',
    palaces: out,
    center: { title: c.center?.title || '', rows: arr(c.center?.rows).map(r => (Array.isArray(r) ? { label: r[0], value: r[1] } : r)), note: c.center?.note || '' },
    legend: c.legend || '',
  };
}

const PILLAR_KEYS = ['year', 'month', 'day', 'hour'];
const PILLAR_LABEL = { year: '年柱', month: '月柱', day: '日柱', hour: '時柱' };
function normBazi(c, errs, warns) {
  const P = {};
  for (const k of PILLAR_KEYS) {
    const p = c.pillars?.[k];
    if (!p) { if (k !== 'hour') errs.push(`chart.pillars.${k} 缺少`); P[k] = null; continue; }
    if (!STEMS.includes(p.stem)) errs.push(`chart.pillars.${k}.stem 不是天干：${p.stem}`);
    if (!BRANCHES.includes(p.branch)) errs.push(`chart.pillars.${k}.branch 不是地支：${p.branch}`);
    P[k] = {
      label: p.label || PILLAR_LABEL[k], stem: p.stem, branch: p.branch,
      stemTenGod: p.stemTenGod || (k === 'day' ? '日主' : ''),
      hidden: arr(p.hidden).map(h => (isStr(h) ? { stem: h, tenGod: '' } : { stem: h.stem, tenGod: h.tenGod || '' })),
      nayin: p.nayin || '', stage: p.stage || '', selfStage: p.selfStage || '',
      kongwang: p.kongwang || '', shensha: arr(p.shensha).map(String),
    };
  }
  const order = (c.order || 'hour,day,month,year').split(',').map(s => s.trim()).filter(k => PILLAR_KEYS.includes(k));
  return {
    type: 'bazi', title: c.title || '八字命盤', order: order.length === 4 ? order : ['hour', 'day', 'month', 'year'],
    pillars: P,
    extraRows: arr(c.extraRows).map(r => ({ label: r.label, values: r.values || {} })),
    info: arr(c.info).map(r => (Array.isArray(r) ? { label: r[0], value: r[1] } : r)),
    dayun: c.dayun ? { note: c.dayun.note || '', items: arr(c.dayun.items) } : null,
    liunian: c.liunian ? { note: c.liunian.note || '', items: arr(c.liunian.items) } : null,
    wuxing: c.wuxing || null,
  };
}

const BLOCK_TYPES = new Set(['heading', 'paragraph', 'list', 'table', 'quote', 'note', 'pageBreak']);
function normBlock(b, i, errs, warns, path) {
  const at = `${path}[${i}]`;
  if (!b || !BLOCK_TYPES.has(b.type)) { errs.push(`${at}.type 不支援：${b && b.type}`); return null; }
  switch (b.type) {
    case 'heading': {
      const level = Math.min(4, Math.max(1, b.level | 0 || 1));
      return { type: 'heading', level, text: String(b.text || ''), pageBreak: b.pageBreak ?? level === 1, pending: !!b.pending };
    }
    case 'paragraph': return { type: 'paragraph', runs: toRuns(b), indent: +b.indent || 0, align: b.align || 'justify', size: b.size };
    case 'note': return { type: 'note', runs: toRuns(b) };
    case 'pageBreak': return { type: 'pageBreak' };
    case 'list': {
      const style = ['bullet', 'number', 'cjk', 'alpha', 'none'].includes(b.style) ? b.style : 'bullet';
      const items = arr(b.items).map((it, j) => ({ runs: toRuns(it), sub: it && it.items ? normBlock({ type: 'list', style: it.style || 'bullet', items: it.items }, j, errs, warns, at + '.items') : null }));
      return { type: 'list', style, start: b.start || 1, items };
    }
    case 'table': {
      const cell = c => (c == null ? { runs: [] } : isStr(c) || typeof c === 'number' ? { runs: [{ text: String(c) }] } : { ...c, runs: toRuns(isStr(c.text) || c.runs ? c : { text: c.text == null ? '' : String(c.text), pending: c.pending }) });
      const header = b.header ? arr(b.header).map(cell) : null;
      const rows = arr(b.rows).map(r => arr(r).map(cell));
      if (!rows.length && !header) warns.push(`${at} 表格沒有內容`);
      return { type: 'table', caption: b.caption || '', header, rows, widths: b.widths || null, align: b.align || 'center', size: b.size };
    }
    case 'quote': {
      const src = b.source || null;
      let cite = '';
      if (src) cite = isStr(src) ? src : [src.book ? `《${src.book.replace(/^《|》$/g, '')}${src.chapter ? '・' + src.chapter : ''}》` : '', src.author || '', src.edition || '', src.page || '', src.note || ''].filter(Boolean).join('，');
      const pending = !!b.pending || !src || src.verified === false;
      if (!src) warns.push(`${at} 引文沒有出處，已自動標「${PENDING_LABEL}」`);
      return { type: 'quote', runs: toRuns({ text: b.text, runs: b.runs }), cite, pending };
    }
  }
}

/**
 * 驗證並正規化命書文件。回傳 {doc, errors, warnings}；errors 非空代表無法輸出。
 */
export function normalize(input) {
  const errs = [], warns = [];
  if (!input || typeof input !== 'object') return { doc: null, errors: ['命書文件必須是物件'], warnings: [] };
  if (input.schema && input.schema !== SCHEMA_ID) warns.push(`schema 版本 ${input.schema} 與本模組 ${SCHEMA_ID} 不同`);
  const m = input.meta || {};
  if (!m.title) errs.push('meta.title 缺少');
  const birth = m.birth || {};
  const meta = {
    site: m.site || '', siteTitle: m.siteTitle || m.title || '', siteUrl: m.siteUrl || '',
    title: m.title || '', name: m.name || '', gender: m.gender || '',
    birth: { solar: birth.solar || '', lunar: birth.lunar || '', place: birth.place || '', note: birth.note || '' },
    generatedAt: m.generatedAt || new Date().toISOString(),
    example: !!m.example, disclaimer: m.disclaimer ?? '本命書依傳統命理規則由程式推算產生，引文均註明出處，僅供參考，不構成任何醫療、財務或法律建議。',
    extra: arr(m.extra).map(r => (Array.isArray(r) ? { label: r[0], value: r[1] } : r)),
  };
  let chart = null;
  if (input.chart) {
    if (input.chart.type === 'ziwei') chart = normZiwei(input.chart, errs, warns);
    else if (input.chart.type === 'bazi') chart = normBazi(input.chart, errs, warns);
    else errs.push(`chart.type 不支援：${input.chart.type}`);
  }
  if (!Array.isArray(input.sections)) errs.push('sections 必須是陣列');
  const sections = (input.sections || []).map((b, i) => normBlock(b, i, errs, warns, 'sections')).filter(Boolean);
  return { doc: { meta, chart, sections }, errors: errs, warnings: warns };
}

/** 產生時間的顯示字串（台北時間） */
export function fmtTime(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return String(iso);
  try {
    return new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(d) + '（台北時間）';
  } catch { return d.toISOString(); }
}

/** 預設檔名：站名_姓名_YYYYMMDD.副檔名 */
export function defaultFilename(doc, ext) {
  const d = new Date(doc.meta.generatedAt);
  const ymd = isNaN(d) ? '' : new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d).replace(/-/g, '');
  const base = [doc.meta.title || '命書', doc.meta.name, ymd].filter(Boolean).join('_').replace(/[\\/:*?"<>|\s]+/g, '_');
  return `${base}.${ext}`;
}

/** 收集文件中所有會出現的文字（PDF 依此決定要載入哪些字型分檔） */
export function allText(doc) {
  const o = [];
  const push = v => { if (v != null && v !== '') o.push(String(v)); };
  const runs = rs => rs.forEach(r => push(r.text));
  const m = doc.meta;
  [m.siteTitle, m.title, m.name, m.gender, m.birth.solar, m.birth.lunar, m.birth.place, m.birth.note, m.disclaimer, m.siteUrl, fmtTime(m.generatedAt), PENDING_LABEL, '範例資料非真實命例第頁共／姓名性別西曆農曆出生地產生時間'].forEach(push);
  m.extra.forEach(r => { push(r.label); push(r.value); });
  const c = doc.chart;
  if (c) push(JSON.stringify(c));
  push('時日月年柱天干地支藏干十神納音星運自坐空亡神煞大運流年歲起廟旺得利平不陷祿權科忌身宮小限—～–');
  const walk = b => {
    if (!b) return;
    if (b.text) push(b.text);
    if (b.runs) runs(b.runs);
    if (b.cite) push(b.cite);
    if (b.caption) push(b.caption);
    if (b.header) b.header.forEach(c => runs(c.runs));
    if (b.rows) b.rows.forEach(r => r.forEach(c => runs(c.runs)));
    if (b.items) b.items.forEach(it => { runs(it.runs); walk(it.sub); });
  };
  doc.sections.forEach(walk);
  push('（一二三四五六七八九十）ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ、・——');
  return o.join('\n');
}
