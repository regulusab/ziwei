/* 介面：輸入、排盤、命書、匯出 */
(function(){
'use strict';
function $(id){ return document.getElementById(id); }
var DATA={}, LAST=null;
function msg(t){ $('msg').textContent=t; }
function fillTimes(){ $('tidx').innerHTML=ZW.SHICHEN.map(function(n,i){ return '<option value="'+i+'">'+n+'時　'+ZW.SHI_RANGE[i]+'</option>'; }).join(''); }
function fillTables(){ var T=DATA.sihua.tables; $('table').innerHTML=Object.keys(T).map(function(k){ return '<option value="'+k+'">'+T[k].name+'</option>'; }).join(''); }
function lunarDays(){ var s='<option value="">日</option>'; for(var d=1;d<=30;d++) s+='<option value="'+d+'">'+['初一','初二','初三','初四','初五','初六','初七','初八','初九','初十','十一','十二','十三','十四','十五','十六','十七','十八','十九','二十','廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十'][d-1]+'</option>'; $('lday').innerHTML=s;
  var m=''; for(var i=1;i<=12;i++) m+='<option value="'+i+'">'+'正二三四五六七八九十冬臘'[i-1]+'月</option>'; $('lmon').innerHTML=m; }
function settings(){
  var cal=$('cal').value, S={cal:cal, tidx:$('tidx').value, gender:$('gender').value, zi:$('zi').value, table:$('table').value, yearDivide:$('ydiv').value, flowYear:$('fyear').value, name:$('name').value.trim()};
  if(cal==='solar') S.date=$('sdate').value; else { S.date=$('lyear').value+'-'+$('lmon').value+'-'+$('lday').value; S.leap=$('lleap').checked?1:0; }
  return S; }
function apply(S){
  $('cal').value=S.cal||'solar'; calSwitch();
  if(S.cal==='lunar'){ var p=String(S.date).split('-'); $('lyear').value=p[0]; $('lmon').value=+p[1]; $('lday').value=+p[2]; $('lleap').checked=!!+S.leap; } else $('sdate').value=S.date;
  ['tidx','gender','zi','table'].forEach(function(k){ if(S[k]!=null) $(k).value=S[k]; }); if(S.yearDivide) $('ydiv').value=S.yearDivide; if(S.flowYear) $('fyear').value=S.flowYear; $('name').value=S.name||'';
  run(); }
function calSwitch(){ var l=$('cal').value==='lunar'; $('solarBox').style.display=l?'none':''; $('lunarBox').style.display=l?'':'none'; }
function run(){
  var S=settings();
  if(!S.date||/-$|--/.test(S.date)) return msg('請輸入完整的出生日期');
  try{
    var C=ZW.compute(S), Y=+S.flowYear||new Date().getFullYear(), F=C.flow(Y);
    ZWChart.render(C,F,$('chart'));
    var book=ZWBook.build(C,F,DATA); LAST=book;
    ZWRender.render(book,$('book'));
    $('out').style.display=''; $('tableNote').textContent=DATA.sihua.tables[S.table].note;
    msg('已排盤：'+C.raw.solarDate+' '+C.raw.time+'，命宮 '+C.ming.stem+C.ming.br+'，'+C.raw.fiveElementsClass);
    history.replaceState(null,'',ZWCases.toURL(S));
  }catch(e){ console.error(e); msg('排盤失敗：'+e.message); }
}
function act(btn,fn){ btn.onclick=function(){ if(!LAST) return msg('請先排盤'); var t=btn.textContent; btn.disabled=true; btn.textContent='產生中…';
  Promise.resolve().then(fn).then(function(){ msg('完成'); },function(e){ msg('失敗：'+e.message); }).then(function(){ btn.disabled=false; btn.textContent=t; }); }; }
function share(){ var url=ZWCases.toURL(settings());
  return ZWExport.buildDocx(LAST).then(function(b){ var f=new File([b],ZWExport.fname(LAST,'docx'),{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
    if(navigator.canShare&&navigator.canShare({files:[f]})) return navigator.share({files:[f],title:LAST.title,text:LAST.title+'　'+url}).catch(function(e){ if(e.name!=='AbortError') throw e; });
    if(navigator.share) return navigator.share({title:LAST.title,url:url}).catch(function(){});
    return (navigator.clipboard?navigator.clipboard.writeText(url):Promise.resolve()).then(function(){ msg('此瀏覽器不支援分享，已複製連結'); }); }); }
function init(){
  var files=['quanshu','stars','palaces','sihua','patterns'];
  Promise.all(files.map(function(f){ return fetch('data/'+f+'.json').then(function(r){ if(!r.ok) throw new Error(f); return r.json(); }); })).then(function(arr){
    files.forEach(function(f,i){ DATA[f]=arr[i]; }); window.ZWData=DATA;
    fillTimes(); fillTables(); lunarDays(); $('fyear').value=new Date().getFullYear();
    $('cal').onchange=calSwitch; $('go').onclick=run;
    $('stime').onchange=function(){ if(this.value) $('tidx').value=ZW.timeToIndex(this.value); };
    act($('dlDocx'),function(){ return ZWExport.exportBook(LAST,'docx'); });
    act($('dlPdf'),function(){ return ZWExport.exportBook(LAST,'print'); });
    act($('dlJson'),function(){ return ZWExport.exportBook(LAST,'json'); });
    act($('share'),share);
    ZWCases.init();
    var u=ZWCases.fromURL(); if(u) apply(u); else { $('sdate').value='1990-06-15'; $('tidx').value=5; run(); }
  }).catch(function(e){ msg('資料載入失敗：'+e.message+'（請以網址開啟本站）'); });
}
window.ZWApp={settings:settings,apply:apply,run:run,last:function(){return LAST;}};
document.addEventListener('DOMContentLoaded',init);
})();
