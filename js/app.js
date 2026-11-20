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
  var cal=$('cal').value, S={cal:cal, tidx:$('tidx').value, gender:$('gender').value, lon:$('lon').value, place:$('place').value, time:cal==='solar'?$('stime').value:'', table:$('table').value, yearDivide:$('ydiv').value, flowYear:$('fyear').value, flowDay:$('fday').value, flowHour:$('fhour').value, name:$('name').value.trim()};
  if(cal==='solar') S.date=$('sdate').value; else { S.date=$('lyear').value+'-'+$('lmon').value+'-'+$('lday').value; S.leap=$('lleap').checked?1:0; }
  return S; }
function apply(S){
  $('cal').value=S.cal||'solar'; calSwitch();
  if(S.cal==='lunar'){ var p=String(S.date).split('-'); $('lyear').value=p[0]; $('lmon').value=+p[1]; $('lday').value=+p[2]; $('lleap').checked=!!+S.leap; } else $('sdate').value=S.date;
  if(S.lon!=null&&S.lon!==''){ $('lon').value=S.lon; } else $('lon').value=ZW.DEF_LON; syncPlace(S.place); if(S.cal!=='lunar') $('stime').value=S.time||'';
  ['tidx','gender','table'].forEach(function(k){ if(S[k]!=null) $(k).value=S[k]; }); if(S.yearDivide) $('ydiv').value=S.yearDivide; if(S.flowYear) $('fyear').value=S.flowYear; $('fday').value=S.flowDay||defDay($('fyear').value); $('fhour').value=(S.flowHour!=null&&S.flowHour!==''&&+S.flowHour>=0&&+S.flowHour<=11)?+S.flowHour:nowHour(); $('name').value=S.name||'';
  run(); }
function pad(n){ return (n<10?'0':'')+n; }
function today(){ var d=new Date(); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
// 流日預設：流年即今年則取今天，否則取該年同月同日
function defDay(Y){ var t=today(); Y=+Y||+t.slice(0,4); if(+t.slice(0,4)===Y) return t; return ZW.addDays(Y+'-'+t.slice(5,7)+'-01',+t.slice(8)-1); }
// 流時：子～亥十二時辰，皆以流日當日日干起時干；23:00 以後的晚子時請選翌日子時
function nowHour(){ var h=new Date().getHours(); return h===23?0:ZW.timeToIndex(pad(h)+':00'); }
function fillHours(){ $('fhour').innerHTML=ZW.SHICHEN.slice(0,12).map(function(n,i){ return '<option value="'+i+'">'+n.replace('早','')+'時　'+ZW.SHI_RANGE[i]+'</option>'; }).join(''); }
var PLACES=[['taipei','臺北',121.57],['taichung','臺中',120.68],['tainan','臺南',120.21],['kaohsiung','高雄',120.31],['hongkong','香港',114.17],['macau','澳門',113.54],['beijing','北京',116.41],['shanghai','上海',121.47],['guangzhou','廣州',113.26],['singapore','新加坡',103.82],['kualalumpur','吉隆坡',101.69],['bangkok','曼谷',100.50],['tokyo','東京',139.69],['seoul','首爾',126.98],['sydney','雪梨',151.21],['london','倫敦',-0.13],['paris','巴黎',2.35],['newyork','紐約',-74.01],['toronto','多倫多',-79.38],['chicago','芝加哥',-87.63],['losangeles','洛杉磯',-118.24],['sanfrancisco','舊金山',-122.42],['portland','波特蘭',-122.68],['seattle','西雅圖',-122.33],['vancouver','溫哥華',-123.12],['custom','自訂經度',null]];
function fillPlaces(){ $('place').innerHTML=PLACES.map(function(p){ return '<option value="'+p[0]+'">'+p[1]+(p[2]!=null?'（'+(p[2]<0?'西經 ':'東經 ')+Math.abs(p[2])+'°）':'')+'</option>'; }).join('');
  $('place').onchange=function(){ var p=PLACES.filter(function(x){return x[0]===$('place').value;})[0]; if(p&&p[2]!=null) $('lon').value=p[2]; };
  $('lon').oninput=function(){ syncPlace(); }; }
function syncPlace(id){ var v=parseFloat($('lon').value), hit=PLACES.filter(function(p){ return id?p[0]===id&&(p[2]==null||p[2]===v):p[2]===v; })[0]; $('place').value=hit?hit[0]:'custom'; }
function calSwitch(){ var l=$('cal').value==='lunar'; $('solarBox').style.display=l?'none':''; $('lunarBox').style.display=l?'':'none'; }
function run(){
  var S=settings();
  if(!S.date||/-$|--/.test(S.date)) return msg('請輸入完整的出生日期');
  if($('lon').value===''||isNaN(parseFloat($('lon').value))) return msg('請輸入出生地經度（東經正、西經負）');
  try{
    if(!S.flowDay){ S.flowDay=defDay(S.flowYear); $('fday').value=S.flowDay; }
    var C=ZW.compute(S), Y=+S.flowYear||new Date().getFullYear(), F=C.flow(Y,S.flowDay,S.flowHour);
    ZWChart.render(C,F,$('chart'));
    var book=ZWBook.build(C,F,DATA); LAST=book;
    ZWRender.render(book,$('book'));
    $('out').style.display=''; $('tableNote').textContent=DATA.sihua.tables[S.table].note;
    msg('已排盤：'+C.raw.solarDate+' '+C.raw.time+'（'+C.cal.lonText+'），命宮 '+C.ming.stem+C.ming.br+'，'+C.raw.fiveElementsClass+(C.cal.error?'；出生地農曆無法計算，暫依中國農曆：'+C.cal.error:'')+(C.cal.fallback?'；'+C.cal.fallback:''));
    history.replaceState(null,'',ZWCases.toURL(S));
  }catch(e){ console.error(e); msg('排盤失敗：'+e.message); }
}
function act(btn,fn){ btn.onclick=function(){ if(!LAST) return msg('請先排盤'); var t=btn.textContent; btn.disabled=true; btn.textContent='產生中…';
  Promise.resolve().then(fn).then(function(){ msg('完成'); },function(e){ msg('失敗：'+e.message); }).then(function(){ btn.disabled=false; btn.textContent=t; }); }; }
function share(){ var url=ZWCases.toURL(settings());
  return ZWExport.exportShared(LAST,'pdf',{download:false}).then(function(r){ var f=new File([r.blob],r.filename,{type:'application/pdf'});
    if(navigator.canShare&&navigator.canShare({files:[f]})) return navigator.share({files:[f],title:LAST.title,text:LAST.title+'　'+url}).catch(function(e){ if(e.name!=='AbortError') throw e; });
    if(navigator.share) return navigator.share({title:LAST.title,url:url}).catch(function(){});
    return (navigator.clipboard?navigator.clipboard.writeText(url):Promise.resolve()).then(function(){ msg('此瀏覽器不支援分享，已複製連結'); }); }); }
function init(){
  var files=['quanshu','stars','palaces','sihua','patterns','lucky','remedy'];
  Promise.all(files.map(function(f){ return fetch('data/'+f+'.json').then(function(r){ if(!r.ok) throw new Error(f); return r.json(); }); })).then(function(arr){
    files.forEach(function(f,i){ DATA[f]=arr[i]; }); window.ZWData=DATA;
    fillTimes(); fillTables(); fillPlaces(); syncPlace('taipei'); lunarDays(); $('fyear').value=new Date().getFullYear(); $('fday').value=today(); fillHours(); $('fhour').value=nowHour();
    $('fyear').onchange=function(){ var v=$('fday').value; if(!v||v.slice(0,4)!==String(this.value)) $('fday').value=defDay(this.value); };
    $('fday').onchange=function(){ if(LAST) run(); }; $('fhour').onchange=function(){ if(LAST) run(); };
    $('cal').onchange=calSwitch; $('go').onclick=run;
    $('stime').onchange=function(){ if(this.value) $('tidx').value=ZW.timeToIndex(this.value); };
    act($('dlDocx'),function(){ return ZWExport.exportBook(LAST,'docx'); });
    act($('dlPdf'),function(){ return ZWExport.exportBook(LAST,'pdf'); });
    act($('print'),function(){ return ZWExport.exportBook(LAST,'print'); });
    act($('dlJson'),function(){ return ZWExport.exportBook(LAST,'json'); });
    act($('share'),share);
    document.querySelectorAll('.more .menu button').forEach(function(b){ b.addEventListener('click',function(){ b.closest('details').open=false; }); });
    ZWCases.init();
    var u=ZWCases.fromURL(); if(u) apply(u); else { $('sdate').value='1990-06-15'; $('tidx').value=5; run(); }
  }).catch(function(e){ msg('資料載入失敗：'+e.message+'（請以網址開啟本站）'); });
}
window.ZWApp={settings:settings,apply:apply,run:run,last:function(){return LAST;}};
document.addEventListener('DOMContentLoaded',init);
})();
