/* 紫微斗數排盤引擎：包裝 iztro（vendor/iztro.min.js，MIT），整理成本站用的命盤物件 */
(function(){
'use strict';
var BR='子丑寅卯辰巳午未申酉戌亥'.split(''), ST='甲乙丙丁戊己庚辛壬癸'.split('');
var SHICHEN=['早子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥','晚子'];
var SHI_RANGE=['00:00–00:59','01:00–02:59','03:00–04:59','05:00–06:59','07:00–08:59','09:00–10:59','11:00–12:59','13:00–14:59','15:00–16:59','17:00–18:59','19:00–20:59','21:00–22:59','23:00–23:59'];
var MAJOR='紫微天機太陽武曲天同廉貞天府太陰貪狼巨門天相天梁七殺破軍'.match(/../g);
var LUCKY='左輔右弼文昌文曲天魁天鉞'.match(/../g), UNLUCKY='擎羊陀羅火星鈴星地空地劫'.match(/../g);
var HUA=['祿','權','科','忌'];
// 通行版四化（與 iztro 預設相同）
var BASE={甲:['廉貞','破軍','武曲','太陽'],乙:['天機','天梁','紫微','太陰'],丙:['天同','天機','文昌','廉貞'],丁:['太陰','天同','天機','巨門'],戊:['貪狼','太陰','右弼','天機'],
  己:['武曲','貪狼','天梁','文曲'],庚:['太陽','武曲','太陰','天同'],辛:['巨門','太陽','文曲','文昌'],壬:['天梁','紫微','左輔','武曲'],癸:['破軍','巨門','太陰','貪狼']};
function timeToIndex(hhmm){ var p=String(hhmm||'').split(':'), h=+p[0]; if(isNaN(h)) return 0; if(h===23) return 12; if(h===0) return 0; return Math.floor((h+1)/2); }
function table(id){ var T=(window.ZWData&&ZWData.sihua.tables[id])||{mutagens:{}}; var t={}; ST.forEach(function(s){ t[s]=(T.mutagens[s]||BASE[s]).slice(); }); return t; }

function compute(S){
  // S: {cal:'solar'|'lunar', date:'YYYY-MM-DD', leap:bool, tidx:0..12, gender:'男'|'女', zi:'forward'|'current', table:'default'|..., yearDivide:'normal'|'exact', flowYear:Number}
  var T=table(S.table||'default');
  var cfg={mutagens:T, dayDivide:S.zi||'forward', yearDivide:S.yearDivide||'normal', horoscopeDivide:S.yearDivide||'normal'};
  var a=iztro.astro.withOptions({type:S.cal||'solar',dateStr:S.date,timeIndex:+S.tidx,gender:S.gender,isLeapMonth:!!S.leap,fixLeap:true,language:'zh-TW',config:cfg});
  var C={S:S, T:T, a:a, raw:JSON.parse(JSON.stringify(a))};
  C.pal=C.raw.palaces.map(function(p,i){
    p.idx=i; p.br=p.earthlyBranch; p.stem=p.heavenlyStem; p.bi=BR.indexOf(p.br);
    p.major=p.majorStars; p.minor=p.minorStars; p.adj=p.adjectiveStars;
    p.all=p.major.concat(p.minor);
    p.names=p.all.map(function(s){return s.name;});
    return p; });
  C.byName={}; C.pal.forEach(function(p){ C.byName[p.name]=p; });
  C.byBr={}; C.pal.forEach(function(p){ C.byBr[p.br]=p; });
  C.ming=C.byName['命宮']; C.body=C.pal.filter(function(p){return p.isBodyPalace;})[0];
  C.yearStem=C.raw.rawDates.chineseDate.yearly[0]; C.yearBr=C.raw.rawDates.chineseDate.yearly[1];
  C.birthYear=+C.raw.solarDate.slice(0,4); C.lunarYear=C.raw.rawDates.lunarDate.lunarYear;
  // 生年四化
  C.sihua=HUA.map(function(h,i){ var star=T[C.yearStem][i]; return {hua:h,star:star,pal:findStar(C,star)}; });
  // 宮干飛化（含自化）
  C.pal.forEach(function(p){ p.fly=HUA.map(function(h,i){ var star=T[p.stem][i], to=findStar(C,star); return {hua:h,star:star,to:to,self:to===p}; }); });
  return C;
}
function findStar(C,name){ for(var i=0;i<12;i++) if(C.pal[i].names.indexOf(name)>=0) return C.pal[i]; return null; }
function rel(C,p,off){ return C.pal[(p.idx+off+12)%12]; }
function sanfang(C,p){ return [p, rel(C,p,6), rel(C,p,4), rel(C,p,8)]; } // 本、對、三合
function names(list){ var o=[]; list.forEach(function(p){ o=o.concat(p.names); }); return o; }
// 運限：Y 年（流年），以該年農曆年中（約七月一日）取大限／小限／流年
function flow(C,Y){
  var date=Y+'-07-01', h=C.a.horoscope(date, +C.S.tidx), J=JSON.parse(JSON.stringify(h));
  function mapNames(arr){ var m={}; arr.forEach(function(n,i){ m[n]=C.pal[i]; }); return m; }
  var F={year:Y, gz:J.yearly.heavenlyStem+J.yearly.earthlyBranch, decadal:J.decadal, yearly:J.yearly, age:J.age,
    nominalAge:J.age.nominalAge};
  F.dMap=mapNames(J.decadal.palaceNames); F.yMap=mapNames(J.yearly.palaceNames); F.aMap=mapNames(J.age.palaceNames);
  F.dMing=C.pal[J.decadal.index]; F.yMing=C.pal[J.yearly.index]; F.aMing=C.pal[J.age.index];
  F.dHua=HUA.map(function(hh,i){ var s=C.T[J.decadal.heavenlyStem][i]; return {hua:hh,star:s,pal:findStar(C,s)}; });
  F.yHua=HUA.map(function(hh,i){ var s=C.T[J.yearly.heavenlyStem][i]; return {hua:hh,star:s,pal:findStar(C,s)}; });
  F.dStars=J.decadal.stars; F.yStars=J.yearly.stars;
  var d=C.pal[J.decadal.index].decadal; F.dRange=d.range;
  // 流月：農曆一～十二月
  F.months=[];
  for(var m=1;m<=12;m++){ try{
    var sd=iztro.astro.withOptions({type:'lunar',dateStr:C.lunarYearOf(Y)+'-'+m+'-15',timeIndex:0,gender:'男',language:'zh-TW'}).solarDate;
    var hm=JSON.parse(JSON.stringify(C.a.horoscope(sd,+C.S.tidx))).monthly;
    F.months.push({m:m, solar:sd, gz:hm.heavenlyStem+hm.earthlyBranch, ming:C.pal[hm.index], map:mapNames(hm.palaceNames),
      hua:HUA.map(function(hh,i){ var s=C.T[hm.heavenlyStem][i]; return {hua:hh,star:s,pal:findStar(C,s)}; })});
  }catch(e){} }
  return F;
}
// 流日：指定西曆日期（YYYY-MM-DD）的流日命宮、流日四化與流日星（日羊、日陀等）
function day(C,ds,hi){
  // 流日以日期本身推算，不受出生時辰影響；hi 為流時時辰（0 子～11 亥，皆屬當日）
  hi=(hi==null||isNaN(+hi))?0:Math.max(0,Math.min(11,+hi));
  var h=C.a.horoscope(ds, hi), J=JSON.parse(JSON.stringify(h)), d=J.daily, m=J.monthly, t=J.hourly;
  function mapNames(arr){ var o={}; arr.forEach(function(n,i){ o[n]=C.pal[i]; }); return o; }
  function hua(st){ return HUA.map(function(hh,i){ var s=C.T[st][i]; return {hua:hh,star:s,pal:findStar(C,s)}; }); }
  return {date:ds, lunar:J.lunarDate, gz:d.heavenlyStem+d.earthlyBranch, stem:d.heavenlyStem, ming:C.pal[d.index], map:mapNames(d.palaceNames), hua:hua(d.heavenlyStem), stars:d.stars||[],
    month:{gz:m.heavenlyStem+m.earthlyBranch, ming:C.pal[m.index], map:mapNames(m.palaceNames), hua:hua(m.heavenlyStem)},
    year:{gz:J.yearly.heavenlyStem+J.yearly.earthlyBranch, ming:C.pal[J.yearly.index]}, nominalAge:J.age.nominalAge,
    hour:{idx:hi, name:SHICHEN[hi].replace('早','')+'時', range:SHI_RANGE[hi], gz:t.heavenlyStem+t.earthlyBranch, ming:C.pal[t.index], map:mapNames(t.palaceNames), hua:hua(t.heavenlyStem), stars:t.stars||[]}};
}
function addDays(ds,n){ var p=ds.split('-'), t=new Date(Date.UTC(+p[0],+p[1]-1,+p[2]+n)); return t.toISOString().slice(0,10); }
function decades(C){ return C.pal.slice().sort(function(x,y){return x.decadal.range[0]-y.decadal.range[0];}); }
window.ZW={BR:BR,ST:ST,SHICHEN:SHICHEN,SHI_RANGE:SHI_RANGE,MAJOR:MAJOR,LUCKY:LUCKY,UNLUCKY:UNLUCKY,HUA:HUA,BASE:BASE,
  compute:function(S){ var C=compute(S); C.lunarYearOf=function(Y){return Y;}; C.flow=function(Y,ds,hi){ var F=flow(C,Y); if(ds&&/^\d{4}-\d{2}-\d{2}$/.test(ds)){ try{ F.day=day(C,ds,hi); F.tMap=F.day.map; F.tStars=F.day.stars; F.hour=F.day.hour; F.hMap=F.hour.map; F.hStars=F.hour.stars; F.week=[0,1,2,3,4,5,6].map(function(n){ return n?day(C,addDays(ds,n),0):F.day; }); }catch(e){ F.day=null; F.hour=null; } } return F; }; C.day=function(ds,hi){return day(C,ds,hi);}; return C; },
  timeToIndex:timeToIndex, findStar:findStar, rel:rel, sanfang:sanfang, names:names, decades:decades, table:table, addDays:addDays};
})();
