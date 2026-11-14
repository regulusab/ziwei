// 命書匯出模組（紫微斗數站、盲派八字站共用）
//   import { exportMingshu } from './mingshu-export/src/mingshu-export.js';
//   await exportMingshu(doc, { format: 'pdf' });   // 或 'docx'
// PDF 與 Word 的程式和函式庫都在第一次呼叫時才載入（dynamic import），不影響網站首頁速度。
import { normalize, defaultFilename, SCHEMA_ID } from './schema.js';

export { SCHEMA_ID };
export const VERSION = '1.0.0';

const MIME = { pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };

/** 只驗證不輸出：回傳 {ok, errors, warnings} */
export function validateMingshu(doc) {
  const r = normalize(doc);
  return { ok: !r.errors.length, errors: r.errors, warnings: r.warnings };
}

/**
 * 產生命書檔案（不下載）。回傳 {blob, bytes, filename, mime, pages?, missingGlyphs?, warnings}
 * opts: format 'pdf'|'docx'；filename；fontBase（字型資料夾網址，預設為本模組旁的 fonts/）；
 *       bold（PDF 是否載入粗體字型，預設 true）；docxFont {cjk, latin}；loadFont（自訂字型讀取函式）
 */
export async function renderMingshu(input, opts = {}) {
  const format = opts.format === 'docx' ? 'docx' : opts.format === 'pdf' || !opts.format ? 'pdf' : null;
  if (!format) throw new Error(`format 只支援 'pdf' 或 'docx'：${opts.format}`);
  const { doc, errors, warnings } = normalize(input);
  if (errors.length) { const e = new Error('命書資料有誤：\n' + errors.join('\n')); e.errors = errors; e.warnings = warnings; throw e; }
  const filename = opts.filename ? (opts.filename.endsWith('.' + format) ? opts.filename : `${opts.filename}.${format}`) : defaultFilename(doc, format);
  let bytes, pages, missing;
  if (format === 'pdf') {
    const { renderPdf } = await import('./pdf.js');
    const r = await renderPdf(doc, opts);
    bytes = r.bytes; pages = r.pages; missing = r.missing;
    if (missing.length) warnings.push(`字型缺字 ${missing.length} 個，已以「□」代替：${missing.join('')}`);
  } else {
    const { renderDocx } = await import('./docx.js');
    bytes = await renderDocx(doc, opts);
  }
  const blob = typeof Blob !== 'undefined' ? (bytes instanceof Blob ? bytes : new Blob([bytes], { type: MIME[format] })) : null;
  return { blob, bytes, filename, mime: MIME[format], pages, missingGlyphs: missing || [], warnings };
}

/** 觸發瀏覽器下載（桌機 Chrome／Edge／Safari、iPhone Safari 15+ 都會出現下載或預覽） */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.rel = 'noopener';
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 10000);
}

/**
 * 主要入口：產生並下載。
 * opts.download === false 時只產生不下載；opts.share === true 時在支援的手機上改用系統分享單（可存到「檔案」或傳 LINE）。
 */
export async function exportMingshu(doc, opts = {}) {
  const r = await renderMingshu(doc, opts);
  if (opts.download === false || typeof document === 'undefined') return r;
  if (opts.share && typeof navigator !== 'undefined' && navigator.canShare) {
    const file = new File([r.blob], r.filename, { type: r.mime });
    if (navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: r.filename }); r.shared = true; return r; }
      catch (e) { if (e && e.name === 'AbortError') { r.shared = false; return r; } }
    }
  }
  downloadBlob(r.blob, r.filename);
  return r;
}
