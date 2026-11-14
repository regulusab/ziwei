/* 命書資料物件 → 網頁 HTML（螢幕與列印共用） */
(function(){
'use strict';
function e(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
function block(b){
  switch(b.type){
    case 'chart': return '<div class="bookchart"></div>';
    case 'h3': return '<h3>'+e(b.text)+'</h3>';
    case 'p': return '<p>'+e(b.text)+'</p>';
    case 'note': return '<p class="note">'+e(b.text)+'</p>';
    case 'quote': return '<blockquote>'+e(b.text)+'<cite>——'+e(b.source)+'</cite></blockquote>';
    case 'list': return '<ul>'+b.items.map(function(i){return '<li>'+e(i)+'</li>';}).join('')+'</ul>';
    case 'table': return '<div class="tw"><table><thead><tr>'+b.head.map(function(h){return '<th>'+e(h)+'</th>';}).join('')+'</tr></thead><tbody>'+
      b.rows.map(function(r){return '<tr>'+r.map(function(c){return '<td'+(/^\d+[–-]\d+( 歲)?$/.test(String(c))?' class="nw"':'')+'>'+e(c)+'</td>';}).join('')+'</tr>';}).join('')+'</tbody></table></div>';
  } return '';
}
function render(book,el){
  var h='<div class="bookhead"><h1>'+e(book.title)+'</h1><table class="meta">'+book.meta.map(function(m){return '<tr><th>'+e(m[0])+'</th><td>'+e(m[1])+'</td></tr>';}).join('')+'</table></div>';
  h+='<nav class="toc noprint">'+book.sections.map(function(s){return '<a href="#bk-'+s.id+'">'+e(s.heading)+'</a>';}).join('')+'</nav>';
  book.sections.forEach(function(s){ h+='<section class="bks" id="bk-'+s.id+'"><h2>'+e(s.heading)+'</h2>'+s.blocks.map(block).join('')+'</section>'; });
  h+='<p class="note">產生時間：'+e(book.generated)+'</p>';
  el.innerHTML=h;
  var bc=el.querySelector('.bookchart'); if(bc&&book.chartRef) ZWChart.render(book.chartRef,book.flowRef,bc);
}
window.ZWRender={render:render,esc:e};
})();
