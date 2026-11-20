/* 命書匯出：exportBook(book, 'docx'|'print'|'json')
   book 為 js/book.js 產生的資料物件（sections/blocks），與畫面無關，日後可直接換成共用匯出模組。
   Word／PDF 交給共用匯出模組 mingshu-export（mingshu/1 格式）；列印用瀏覽器；舊的 docx.js 匯出保留為 'docx-legacy'。 */
(function(){
'use strict';
function loadScript(src){ return new Promise(function(ok,bad){ var s=document.createElement('script'); s.src=src; s.onload=ok; s.onerror=function(){bad(new Error('載入 '+src+' 失敗'));}; document.head.appendChild(s); }); }
var lib;
function need(){ if(window.docx) return Promise.resolve(); return lib||(lib=loadScript('vendor/docx.js')); }
function download(blob,name){ var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },4000); }
function fname(book,ext){ return (book.title.replace(/[\\/:*?"<>|\s：]+/g,'_'))+'.'+ext; }
// 命盤 4×4 表格（Word 用）
var POS={巳:[0,0],午:[0,1],未:[0,2],申:[0,3],辰:[1,0],酉:[1,3],卯:[2,0],戌:[2,3],寅:[3,0],丑:[3,1],子:[3,2],亥:[3,3]};
function chartGrid(C){
  var g=[[],[],[],[]];
  C.pal.forEach(function(p){ var pos=POS[p.br];
    var hua=function(n){ return C.sihua.filter(function(x){return x.star===n;}).map(function(x){return '化'+x.hua;}).join(''); };
    g[pos[0]][pos[1]]=[p.major.map(function(s){return s.name+(s.brightness||'')+hua(s.name);}).join(' '), p.minor.map(function(s){return s.name+(s.brightness||'')+hua(s.name);}).join(' '),
      p.adj.map(function(s){return s.name;}).join(' '), p.changsheng12+' '+p.boshi12+' '+p.jiangqian12+' '+p.suiqian12, p.decadal.range.join('–')+'　'+p.stem+p.br+'　'+p.name+(p.isBodyPalace?'（身）':'')]; });
  var R=C.raw; g[1][1]=[R.solarDate+' '+R.time+'（'+C.cal.lonText+'）', '農曆 '+R.lunarDate, R.chineseDate, R.fiveElementsClass+'　命主'+R.soul+'　身主'+R.body, '生年四化：'+C.sihua.map(function(x){return x.star+x.hua;}).join(' ')];
  return g;
}
function buildDocx(book){
  return need().then(function(){
    var D=window.docx, ch=[], F='PMingLiU';
    function run(t,o){ o=o||{}; return new D.TextRun(Object.assign({text:String(t),font:{ascii:F,eastAsia:F,hAnsi:F,cs:F}},o)); }
    function para(t,o,po){ return new D.Paragraph(Object.assign({spacing:{after:80},children:[run(t,o)]},po||{})); }
    function cell(lines,o){ o=o||{}; return new D.TableCell(Object.assign({children:[].concat(lines).map(function(l,i){ return new D.Paragraph({alignment:o.center?D.AlignmentType.CENTER:undefined,children:[run(l,{size:o.size||18,bold:!!o.bold&&i===0})]}); })},o.cell||{})); }
    ch.push(new D.Paragraph({heading:D.HeadingLevel.TITLE,alignment:D.AlignmentType.CENTER,children:[run(book.title,{bold:true,size:40,color:'5B2A86'})]}));
    ch.push(new D.Table({width:{size:100,type:D.WidthType.PERCENTAGE},rows:book.meta.map(function(m){ return new D.TableRow({children:[cell(m[0],{bold:true,cell:{shading:{fill:'EEE6F5'},width:{size:20,type:D.WidthType.PERCENTAGE}}}),cell(m[1])]}); })}));
    book.sections.forEach(function(s){
      ch.push(new D.Paragraph({heading:D.HeadingLevel.HEADING_1,spacing:{before:300,after:120},children:[run(s.heading,{bold:true,size:30,color:'5B2A86'})]}));
      s.blocks.forEach(function(b){
        if(b.type==='h3') ch.push(new D.Paragraph({heading:D.HeadingLevel.HEADING_2,spacing:{before:160,after:60},children:[run(b.text,{bold:true,size:24,color:'7A4A1C'})]}));
        else if(b.type==='p') ch.push(para(b.text,{size:22}));
        else if(b.type==='note') ch.push(para(b.text,{size:18,color:'7A6A58',italics:true}));
        else if(b.type==='quote'){ ch.push(new D.Paragraph({indent:{left:400},spacing:{after:0},children:[run(b.text,{size:22,color:'3B2A55'})]})); ch.push(new D.Paragraph({indent:{left:400},alignment:D.AlignmentType.RIGHT,spacing:{after:100},children:[run('——'+b.source,{size:16,color:'7A6A58'})]})); }
        else if(b.type==='list') b.items.forEach(function(i){ ch.push(para('・'+i,{size:20})); });
        else if(b.type==='table'){ ch.push(new D.Table({width:{size:100,type:D.WidthType.PERCENTAGE},rows:[new D.TableRow({tableHeader:true,children:b.head.map(function(h){return cell(h,{bold:true,center:true,cell:{shading:{fill:'EEE6F5'}}});})})].concat(
            b.rows.map(function(r){ return new D.TableRow({children:r.map(function(c){return cell(c,{size:18});})}); }))})); ch.push(new D.Paragraph({children:[]})); }
        else if(b.type==='chart' && book.chartRef){ var g=chartGrid(book.chartRef);
          ch.push(new D.Table({width:{size:100,type:D.WidthType.PERCENTAGE},rows:g.map(function(row,ri){ var cells=[];
            row.forEach(function(c,ci){ if(ri===2&&(ci===1||ci===2)) return; if(ri===1&&ci===2) return;
              if(ri===1&&ci===1) cells.push(cell(c,{center:true,size:18,cell:{columnSpan:2,rowSpan:2,shading:{fill:'F7F2FB'}}}));
              else cells.push(cell(c||[''],{size:16,bold:true,cell:{width:{size:25,type:D.WidthType.PERCENTAGE}}})); });
            return new D.TableRow({children:cells}); })}));
          ch.push(new D.Paragraph({children:[]})); }
      });
    });
    ch.push(para('產生時間：'+book.generated+'　'+location.origin+location.pathname,{size:16,color:'7A6A58'}));
    var doc=new D.Document({creator:'紫微斗數論命站',title:book.title,styles:{default:{document:{run:{font:{ascii:F,eastAsia:F,hAnsi:F},size:22}}}},sections:[{properties:{},children:ch}]});
    return D.Packer.toBlob(doc);
  });
}
// 轉成共用匯出模組（Ab2 mingshu-export）的 mingshu/1 格式
function toMingshu(book){
  var C=book.chartRef, R=C.raw, pal=C.pal.map(function(p){
    var hua=function(n){ return C.sihua.filter(function(x){return x.star===n;}).map(function(x){return x.hua;}); };
    var self=function(n){ return p.fly.filter(function(f){return f.self&&f.star===n;}).map(function(f){return f.hua;}); };
    return {branch:p.br,stem:p.stem,name:p.name,isBody:!!p.isBodyPalace,
      major:p.major.map(function(s){return {name:s.name,bright:s.brightness||'',hua:hua(s.name),selfHua:self(s.name)};}),
      minor:p.minor.map(function(s){return {name:s.name,bright:s.brightness||'',hua:hua(s.name),selfHua:self(s.name)};}),
      adjective:p.adj.map(function(s){return s.name;}),labels:[p.changsheng12,p.boshi12,p.jiangqian12,p.suiqian12],decade:p.decadal.range,ages:p.ages.slice(0,5)}; });
  var sec=[];
  book.sections.forEach(function(s){ sec.push({type:'heading',level:1,text:s.heading});
    s.blocks.forEach(function(b){
      if(b.type==='h3') sec.push({type:'heading',level:3,text:b.text});
      else if(b.type==='p') sec.push({type:'paragraph',text:b.text});
      else if(b.type==='note') sec.push({type:'note',text:b.text});
      else if(b.type==='quote') sec.push({type:'quote',text:b.text,source:b.src||b.source});
      else if(b.type==='list') sec.push({type:'list',style:'bullet',items:b.items});
      else if(b.type==='table') sec.push({type:'table',header:b.head,rows:b.rows});
    }); });
  return {schema:'mingshu/1',
    meta:{title:'紫微斗數命書',siteTitle:'紫微斗數論命',site:'ziwei',siteUrl:'https://regulusab.github.io/ziwei/',name:C.S.name||'',gender:C.S.gender,
      birth:{solar:R.solarDate+' '+R.time+'（'+R.timeRange+'）'+'　出生地 '+C.cal.lonText,lunar:R.lunarDate+' '+R.time},generatedAt:new Date().toISOString()},
    chart:{type:'ziwei',title:'紫微斗數命盤',subtitle:'本命盤',palaces:pal,
      center:{rows:[['四柱',R.chineseDate],['五行局',R.fiveElementsClass],['命宮／身宮',C.ming.stem+C.ming.br+'／'+(C.body?C.body.br:'')],['命主／身主',R.soul+'／'+R.body],['生年四化',C.sihua.map(function(x){return x.star+x.hua;}).join(' ')]]}},
    sections:sec};
}
var MOD;
function mod(){ return MOD||(MOD=import(new URL('mingshu-export/src/mingshu-export.js',location.href).href)); }
// 用共用匯出模組（Ab2 mingshu-export，已複製到本站 mingshu-export/）產生 Word／PDF
function exportShared(book,format,opts){ return mod().then(function(m){ return m.exportMingshu(toMingshu(book),Object.assign({format:format,filename:book.title.replace(/[\\/:*?"<>|\s：]+/g,'_')},opts||{})); })
  .then(function(r){ if(r&&r.warnings&&r.warnings.length&&window.console) console.warn(r.warnings); return r; }); }
function exportBook(book,fmt){
  if(fmt==='pdf') return exportShared(book,'pdf');
  if(fmt==='docx') return exportShared(book,'docx');
  if(fmt==='share-pdf') return exportShared(book,'pdf',{share:true});
  if(fmt==='docx-legacy') return buildDocx(book).then(function(b){ download(b,fname(book,'docx')); return b; });
  if(fmt==='print'){ document.querySelectorAll('details').forEach(function(d){d.open=true;}); window.print(); return Promise.resolve(); }
  if(fmt==='json'){ var o=toMingshu(book);
    var b=new Blob([JSON.stringify(o,null,1)],{type:'application/json'}); download(b,fname(book,'json')); return Promise.resolve(b); }
  return Promise.reject(new Error('不支援的格式'));
}
window.ZWExport={exportBook:exportBook, exportShared:exportShared, toMingshu:toMingshu, buildDocx:buildDocx, download:download, fname:fname};
})();
