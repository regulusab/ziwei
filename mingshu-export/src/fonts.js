// PDF 字型：Noto Serif CJK TC 拆成「常用字核心檔」＋「每 256 碼位一個擴充檔」，只下載文件真正用到的檔案，
// 再由 pdf-lib 子集嵌入（PDF 只包含用到的字形）。
const bufCache = new Map();

export function makeLoader(opts = {}) {
  if (opts.loadFont) return opts.loadFont; // 自訂：name => Promise<ArrayBuffer|Uint8Array>（Node 測試或特殊部署用）
  const base = opts.fontBase
    ? new URL(opts.fontBase, globalThis.location ? globalThis.location.href : undefined)
    : new URL('../fonts/', import.meta.url);
  return async name => {
    const url = new URL(name, base).href;
    if (!bufCache.has(url)) {
      bufCache.set(url, fetch(url).then(r => {
        if (!r.ok) throw new Error(`字型載入失敗：${name}（HTTP ${r.status}）`);
        return r.arrayBuffer();
      }));
    }
    try { return await bufCache.get(url); } catch (e) { bufCache.delete(url); throw e; }
  };
}

export async function embedFonts(pdf, text, opts = {}) {
  const get = makeLoader(opts);
  const manRaw = await get('manifest.json');
  const man = JSON.parse(typeof manRaw === 'string' ? manRaw : new TextDecoder().decode(manRaw));
  const wantBold = opts.bold !== false;
  const [rb, bb] = await Promise.all([get(man.core.regular), wantBold ? get(man.core.bold).catch(() => null) : null]);
  const reg = await pdf.embedFont(rb, { subset: true });
  const bold = bb ? await pdf.embedFont(bb, { subset: true }) : null;
  const regSet = new Set(reg.getCharacterSet());
  const boldSet = bold ? new Set(bold.getCharacterSet()) : new Set();
  const extAvail = new Set(man.ext || []);
  const need = new Set();
  for (const ch of new Set(text)) {
    const cp = ch.codePointAt(0);
    if (cp < 0x20 || regSet.has(cp)) continue;
    if (extAvail.has(cp >> 8)) need.add(cp >> 8);
  }
  const ext = {}, extSet = {};
  await Promise.all([...need].map(async b => {
    const h = b.toString(16).toUpperCase().padStart(2, '0');
    try {
      const f = await pdf.embedFont(await get(`ext/${h}.ttf`), { subset: true });
      ext[b] = f; extSet[b] = new Set(f.getCharacterSet());
    } catch (e) { /* 擴充檔缺漏時以□替代，並在 missing 回報 */ }
  }));
  const missing = new Set();
  // 回傳 {font, ch}：找不到字形的字以「□」代替
  const pick = (ch, isBold) => {
    const cp = ch.codePointAt(0);
    if (isBold && boldSet.has(cp)) return { font: bold, ch, fake: false };
    if (regSet.has(cp)) return { font: reg, ch, fake: isBold };
    const b = cp >> 8;
    if (ext[b] && extSet[b].has(cp)) return { font: ext[b], ch, fake: isBold };
    if (/\s/u.test(ch)) return { font: reg, ch: ' ', fake: false };
    if (cp > 0x20) missing.add(ch);
    return { font: reg, ch: '□', fake: isBold };
  };
  const wcache = new Map();
  const width = (ch, size, isBold) => {
    const k = (isBold ? 'b' : 'r') + ch;
    let u = wcache.get(k);
    if (u == null) {
      const p = pick(ch, isBold);
      try { u = p.font.widthOfTextAtSize(p.ch, 1000); } catch { u = 1000; }
      wcache.set(k, u);
    }
    return (u * size) / 1000;
  };
  const measure = (s, size, isBold) => { let w = 0; for (const ch of s) w += width(ch, size, isBold); return w; };
  // 依字型切段，供 drawText 使用
  const segments = (s, isBold) => {
    const out = [];
    for (const ch of s) {
      const p = pick(ch, isBold);
      const last = out[out.length - 1];
      if (last && last.font === p.font && last.fake === p.fake) last.text += p.ch;
      else out.push({ font: p.font, text: p.ch, fake: p.fake });
    }
    return out;
  };
  return { measure, segments, missing, regular: reg, bold };
}
