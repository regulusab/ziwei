// 清單項目符號（PDF、Word 共用）
const CJK_NUM = n => {
  const d = '〇一二三四五六七八九';
  if (n <= 10) return n === 10 ? '十' : d[n];
  if (n < 20) return '十' + d[n - 10];
  return d[Math.floor(n / 10)] + '十' + (n % 10 ? d[n % 10] : '');
};
const FW_ALPHA = 'ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ';
export function listMarker(style, n) {
  switch (style) {
    case 'number': return `${n}、`;
    case 'cjk': return `（${CJK_NUM(n)}）`;
    case 'alpha': return `${FW_ALPHA[(n - 1) % 26]}、`;
    case 'none': return '';
    default: return '・';
  }
}

