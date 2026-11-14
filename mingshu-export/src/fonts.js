// PDF 字型：Noto Serif CJK TC 拆成「常用字核心檔」＋「每 256 碼位一個擴充檔」，只下載文件真正用到的檔案，
// 再由 pdf-lib 子集嵌入（PDF 只包含用到的字形）。
const bufCache = new Map();

const IS_NODE = typeof process !== 'undefined' && !!process.versions?.node && typeof window === 'undefined';

// 字型資料夾位置 → URL 物件（結尾一定補 /）。
// 瀏覽器：相對網址以目前頁面為準。Node：接受 file:// 網址、絕對或相對檔案路徑（相對路徑以 process.cwd() 為準）、http(s) 網址。
async function resolveBase(fontBase) {
  if (!fontBase) return new URL('../fonts/', import.meta.url);
  let s = fontBase instanceof URL ? fontBase.href : String(fontBase);
  if (IS_NODE && !/^[a-z][a-z0-9+.-]*:/i.test(s)) {           // 純檔案路徑（Windows 的 C:\ 也會走這裡）
    const { pathToFileURL } = await import('node:url');
    s = pathToFileURL(s).href;
  } else if (IS_NODE && /^[a-z]:[\\/]/i.test(s)) {
    const { pathToFileURL } = await import('node:url');
    s = pathToFileURL(s).href;
  }
  if (!s.endsWith('/')) s += '/';
  return new URL(s, globalThis.location ? globalThis.location.href : undefined);
}

async function readUrl(url, name) {
  if (url.startsWith('file:')) {
    if (!IS_NODE) throw new Error(`字型載入失敗：${name}（瀏覽器不能讀 file:// 網址，請用 http(s) 開啟網頁）`);
    const [{ readFile }, { fileURLToPath }] = await Promise.all([import('node:fs/promises'), import('node:url')]);
    try { const b = await readFile(fileURLToPath(url)); return new Uint8Array(b.buffer, b.byteOffset, b.byteLength); }
    catch (e) { throw new Error(`字型載入失敗：${name}（${e.code || e.message}：${fileURLToPath(url)}）`); }
  }
  const r = await fetch(url);
  if (!r.ok) throw new Error(`字型載入失敗：${name}（HTTP ${r.status}）`);
  return r.arrayBuffer();
}

export function makeLoader(opts = {}) {
  if (opts.loadFont) return opts.loadFont; // 自訂：name => Promise<ArrayBuffer|Uint8Array>
  const baseP = resolveBase(opts.fontBase);
  return async name => {
    const url = new URL(name, await baseP).href;
    if (!bufCache.has(url)) bufCache.set(url, readUrl(url, name));
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
