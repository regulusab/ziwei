// 把首頁的基本資料與八字命盤轉成「表格區塊」，PDF 與 Word 共用同一份轉換，確保兩種格式欄位一致。
import { COLORS, elementOf, fmtTime } from './schema.js';

const T = (text, o = {}) => ({ text: text == null ? '' : String(text), ...o });
const C = (runs, o = {}) => ({ runs: Array.isArray(runs) ? runs : [typeof runs === 'string' ? T(runs) : runs], ...o });
const L = (text, o = {}) => C([T(text, { bold: true, color: COLORS.accent })], { fill: COLORS.fill, ...o });

/** 首頁基本資料表（八字用；紫微的基本資料放在盤中央） */
export function metaTable(meta) {
  const rows = [];
  rows.push([L('姓名'), C(meta.name || '—'), L('性別'), C(meta.gender || '—')]);
  if (meta.birth.solar) rows.push([L('西曆'), C(meta.birth.solar, { colspan: 3, align: 'left' })]);
  if (meta.birth.lunar) rows.push([L('農曆'), C(meta.birth.lunar, { colspan: 3, align: 'left' })]);
  if (meta.birth.place) rows.push([L('出生地'), C(meta.birth.place, { colspan: 3, align: 'left' })]);
  if (meta.birth.note) rows.push([L('備註'), C(meta.birth.note, { colspan: 3, align: 'left' })]);
  for (const r of meta.extra) rows.push([L(r.label), C(String(r.value ?? ''), { colspan: 3, align: 'left' })]);
  return { type: 'table', header: null, rows, widths: [1, 2.2, 1, 2.2], size: 10 };
}

const gz = (ch, size) => T(ch, { size, bold: true, color: COLORS.elem[elementOf(ch)] || COLORS.text });
const lines = arr => arr.flatMap((x, i) => (i ? [T('\n'), ...[].concat(x)] : [].concat(x)));

/** 八字命盤 → 數個表格區塊 */
export function baziTables(ch) {
  const out = [];
  const ks = ch.order, P = ch.pillars;
  const head = [L(''), ...ks.map(k => L(P[k]?.label || { year: '年柱', month: '月柱', day: '日柱', hour: '時柱' }[k]))];
  const row = (label, f, o = {}) => [L(label), ...ks.map(k => (P[k] ? C(f(P[k]), o) : C('—', o)))];
  const has = f => ks.some(k => P[k] && f(P[k]));
  const rows = [];
  rows.push(row('十神', p => T(p.stemTenGod || '', { size: 10 })));
  rows.push(row('天干', p => gz(p.stem, 20)));
  rows.push(row('地支', p => gz(p.branch, 20)));
  if (has(p => p.hidden.length)) rows.push(row('藏干', p => lines(p.hidden.map(h => [gz(h.stem, 10), T(h.tenGod ? ' ' + h.tenGod : '', { size: 9 })]))));
  if (has(p => p.nayin)) rows.push(row('納音', p => T(p.nayin, { size: 9.5 })));
  if (has(p => p.stage)) rows.push(row('星運', p => T(p.stage, { size: 9.5 })));
  if (has(p => p.selfStage)) rows.push(row('自坐', p => T(p.selfStage, { size: 9.5 })));
  if (has(p => p.kongwang)) rows.push(row('空亡', p => T(p.kongwang, { size: 9.5 })));
  for (const r of ch.extraRows) rows.push([L(r.label), ...ks.map(k => C(T(String(r.values?.[k] ?? ''), { size: 9.5 })))]);
  if (has(p => p.shensha.length)) rows.push(row('神煞', p => lines(p.shensha.map(s => T(s, { size: 8.5 }))), { valign: 'top' }));
  out.push({ type: 'table', caption: ch.title, header: head, rows, widths: [0.9, 1, 1, 1, 1], size: 10, chart: true });

  if (ch.info.length) {
    const cells = ch.info.flatMap(r => [L(r.label), C(String(r.value ?? ''), { align: 'left' })]);
    const rws = [];
    for (let i = 0; i < cells.length; i += 6) { const r = cells.slice(i, i + 6); while (r.length < 6) r.push(C('')); rws.push(r); }
    out.push({ type: 'table', header: null, rows: rws, widths: [1, 1.6, 1, 1.6, 1, 1.6], size: 9.5 });
  }
  const chunk = (items, n) => { const o = []; for (let i = 0; i < items.length; i += n) o.push(items.slice(i, i + n)); return o; };
  if (ch.dayun && ch.dayun.items.length) {
    chunk(ch.dayun.items, 10).forEach((part, pi) => {
      const rws = [
        [L('歲數'), ...part.map(u => C(T(u.age ?? '', { size: 8.5 })))],
        [L('年份'), ...part.map(u => C(T(u.years ?? u.year ?? '', { size: 8.5 })))],
        [L('干支'), ...part.map(u => C([...(u.gz || '').split('').map(c => gz(c, 13))]))],
        [L('十神'), ...part.map(u => C(T(u.tenGod ?? '', { size: 8.5 })))],
      ];
      out.push({ type: 'table', caption: pi ? '' : '大運' + (ch.dayun.note ? `（${ch.dayun.note}）` : ''), header: null, rows: rws, widths: [1.1, ...part.map(() => 1)], size: 9 });
    });
  }
  if (ch.liunian && ch.liunian.items.length) {
    chunk(ch.liunian.items, 10).forEach((part, pi) => {
      const rws = [
        [L('年份'), ...part.map(u => C(T(u.year ?? '', { size: 8.5 })))],
        [L('歲數'), ...part.map(u => C(T(u.age ?? '', { size: 8.5 })))],
        [L('干支'), ...part.map(u => C([...(u.gz || '').split('').map(c => gz(c, 12))]))],
        [L('十神'), ...part.map(u => C(T(String(u.tenGod ?? '').replace('／', '\n'), { size: 8.5 })))],
      ];
      out.push({ type: 'table', caption: pi ? '' : '流年' + (ch.liunian.note ? `（${ch.liunian.note}）` : ''), header: null, rows: rws, widths: [1.1, ...part.map(() => 1)], size: 9 });
    });
  }
  return out;
}

/** 紫微盤中央的資料列（基本資料 + chart.center.rows） */
export function ziweiCenterRows(meta, ch) {
  const rows = [];
  if (meta.name || meta.gender) rows.push({ label: '姓名', value: [meta.name, meta.gender].filter(Boolean).join('　') });
  if (meta.birth.solar) rows.push({ label: '西曆', value: meta.birth.solar });
  if (meta.birth.lunar) rows.push({ label: '農曆', value: meta.birth.lunar });
  if (meta.birth.place) rows.push({ label: '出生地', value: meta.birth.place });
  return rows.concat(ch.center.rows.map(r => ({ label: String(r.label ?? ''), value: String(r.value ?? '') })));
}

export const generatedLine = meta => `產生時間：${fmtTime(meta.generatedAt)}${meta.siteUrl ? '　來源：' + meta.siteUrl : ''}`;
