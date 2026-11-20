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

/* ---------- 出生地農曆與四柱（依老師 2026-11-19 裁定；演算法與「生命之眼」紫微相同：heluo-ziwei/src/local_lunar.mjs） ----------
   依出生地的地方平時排盤（出生日期時間照輸入使用，不另換算）；紫微斗數 23:00 換日；
   農曆以出生地經度的地方平時合朔定初一（月序、閏月依中國農曆）；東經 70° 以西日柱干支進一位（日期不動），時干依新日干五鼠遁。 */
var DAY=864e5;
var TIME_BASIS='依出生地的地方平時排盤（出生日期時間照輸入使用，不另換算）；八字與河洛理數 0:00 換日，紫微斗數 23:00 換日；東經 70° 以西日柱干支進一位（日期不動）；紫微與河洛的農曆以出生地經度的地方平時合朔定初一。';
var DEF_LON=121.57; // 臺北
function LL(){ return window.HeluoLocalLunar; }
function dayNum(s){ return Math.floor(Date.UTC(+s.slice(0,4),+s.slice(5,7)-1,+s.slice(8,10))/DAY); }
function ymdOf(n){ return new Date(n*DAY).toISOString().slice(0,10); }
function gzDay(n){ var i=(((n+7397)%60)+60)%60; return ST[i%10]+BR[i%12]; }   // 1949-10-01（日序 -7397）甲子
function hourGz(dayStem,bi){ return ST[((ST.indexOf(dayStem)%5)*2+bi)%10]+BR[bi]; } // 五鼠遁
function pad2(n){ return (n<10?'0':'')+n; }
function parseLon(v){ if(v==null||v==='') return DEF_LON; var n=parseFloat(v); return isNaN(n)?DEF_LON:Math.max(-180,Math.min(180,n)); }
function lonText(lon){ return (lon<0?'西經 ':'東經 ')+Math.abs(lon)+'°'; }
function sameLunar(a,b){ return a.year===b.year&&a.month===b.month&&!!a.leap===!!b.leap&&a.day===b.day; }
function chinaLunar(ymd){ var p=ymd.split('-').map(Number), L=Solar.fromYmd(p[0],p[1],p[2]).getLunar(); return {year:L.getYear(),month:Math.abs(L.getMonth()),leap:L.getMonth()<0,day:L.getDay()}; }
function localLunarOf(lon,dn){ var L=LL().localLunar({lon:lon},dn); L.text=LL().lunarText(L); return L; }
// 時辰序（0 早子…12 晚子）→ 出生時刻：有輸入時間且落在該時辰就用，否則取時辰中點（只用於比對交節氣）
function clockOf(tidx,t){
  if(t&&/^\d{1,2}:\d{2}/.test(t)&&timeToIndex(t)===tidx) return pad2(+t.split(':')[0])+':'+t.split(':')[1].slice(0,2);
  return tidx===0?'00:30':tidx===12?'23:30':pad2(tidx*2)+':00'; }
// 農曆輸入（出生地農曆）→ 出生日期（西曆）：在中國曆換算結果 ±3 日內找出生地農曆相同的那一天
function solarFromLocalLunar(lon,y,m,d,leap){
  var p, base;
  try{ base=dayNum(Lunar.fromYmd(y,leap?-m:m,Math.min(d,29)).getSolar().toYmd()); }catch(e){ throw new Error('農曆日期不存在'); }
  for(var k=-3;k<=4;k++){ var L=localLunarOf(lon,base+k); if(L.year===y&&L.month===m&&!!L.leap===!!leap&&L.day===d) return ymdOf(base+k); }
  throw new Error('出生地農曆沒有這一天（'+y+'年'+(leap?'閏':'')+m+'月'+d+'日）');
}
function makeAstro(date,tidx,S,cfg){ return iztro.astro.withOptions({type:'solar',dateStr:date,timeIndex:tidx,gender:S.gender,isLeapMonth:false,fixLeap:true,language:'zh-TW',config:cfg}); }

function compute(S){
  // S: {cal:'solar'|'lunar', date, leap, tidx:0..12, time:'HH:MM'(可省), lon:經度（東正西負）, gender, table, yearDivide:'normal'|'exact', flowYear}
  var T=table(S.table||'default'), tidx=+S.tidx||0, lon=parseLon(S.lon), late=tidx===12;
  var cfg={mutagens:T, dayDivide:'forward', yearDivide:S.yearDivide||'normal', horoscopeDivide:S.yearDivide||'normal'};
  var cal={lon:lon, lonText:lonText(lon), basis:TIME_BASIS, late:late, shift:lon<70?1:0};
  // 1. 出生日期（地方平時，照輸入）
  if(S.cal==='lunar'){ var q=String(S.date).split('-').map(Number); cal.civilDate=solarFromLocalLunar(lon,q[0],q[1],q[2],!!+S.leap); }
  else cal.civilDate=S.date;
  cal.clock=clockOf(tidx,S.time);
  // 2. 紫微 23:00 換日：晚子時屬翌日
  var dn=dayNum(cal.civilDate)+(late?1:0); cal.ziweiDate=ymdOf(dn);
  // 3. 出生地農曆
  var L=null; try{ L=localLunarOf(lon,dn); }catch(e){ cal.error=String(e&&e.message||e); }
  var china=chinaLunar(cal.ziweiDate); cal.china=china;
  var a, used={date:cal.civilDate,tidx:tidx};
  if(!L||sameLunar(L,china)){ a=makeAstro(cal.civilDate,tidx,S,cfg); }
  else {
    // iztro 只認中國曆：改用「農曆年干支、月、閏、日都相同」的中國曆日期排盤（與生命之眼紫微相同）
    var t0=late?0:tidx, yd=S.yearDivide||'normal';
    var target=yd==='normal'?L.yearGanZhi:(function(){ var r=makeAstro(cal.ziweiDate,t0,S,cfg).rawDates.chineseDate.yearly; return r[0]+r[1]; })();
    var ks=[0]; for(var k=1;k<=15;k++) ks.push(-k,k);
    var forms=L.leap?[[L.month,true],[L.day>15?L.month%12+1:L.month,false]]:[[L.month,false]];
    outer: for(var fi=0;fi<forms.length;fi++){ var mm=forms[fi][0], lp=forms[fi][1], dys=yd==='normal'?[0]:[0,-1,1];
      for(var di=0;di<dys.length;di++) for(var ki=0;ki<ks.length;ki++){
        var yy=L.year+dys[di]+60*ks[ki], s, back; if(yy<1000||yy>3000) continue;
        try{ s=Lunar.fromYmd(yy,lp?-mm:mm,L.day).getSolar().toYmd(); back=Solar.fromYmd.apply(null,s.split('-').map(Number)).getLunar();
          if(back.getDay()!==L.day||Math.abs(back.getMonth())!==mm||(back.getMonth()<0)!==lp) continue; }catch(e){ continue; }
        var c=makeAstro(s,t0,S,cfg), r=c.rawDates.chineseDate.yearly;
        if(r[0]+r[1]===target){ a=c; used={date:s,tidx:t0}; cal.substitute=s; break outer; } } }
    if(!a){ a=makeAstro(cal.civilDate,tidx,S,cfg); cal.fallback='找不到同干支年、月、日的中國曆日期，暫依中國曆'; }
    // 替代日期與實際出生不同年（相差 60 年倍數）時，運限虛歲改以實際農曆年計
    if(cal.substitute&&a.rawDates.lunarDate.lunarYear!==L.year) a.rawDates.lunarDate.lunarYear=L.year;
  }
  cal.lunar=L; cal.used=used;
  // 4. 四柱：年月柱以輸入時刻比對出生地地方平時的節氣；日柱依紫微日（23:00 換日），東經 70° 以西干支進一位；時干五鼠遁
  var hh=+cal.clock.slice(0,2), mi=+cal.clock.slice(3,5), cd=cal.civilDate.split('-').map(Number);
  var ym=LL().yearMonth({Solar:Solar,Lunar:Lunar},Solar.fromYmdHms(cd[0],cd[1],cd[2],hh,mi,0),lon);
  var dgz=gzDay(dn+cal.shift), bi=late?0:(tidx===0?0:tidx);
  cal.pillars={year:ym&&!ym.error?ym.year:null, month:ym&&!ym.error?ym.month:null, day:dgz, hour:hourGz(dgz.charAt(0),bi)};
  if(!cal.pillars.year){ var rc=a.rawDates.chineseDate; cal.pillars.year=rc.yearly.join(''); cal.pillars.month=rc.monthly.join(''); }
  var C={S:S, T:T, a:a, raw:JSON.parse(JSON.stringify(a)), cal:cal};
  // 顯示用：出生日期、農曆、四柱改為出生地版本
  C.raw.solarDate=cal.civilDate;
  if(L) C.raw.lunarDate=L.text+(late?'（晚子時，23:00 換日）':'');
  C.raw.chineseDate=[cal.pillars.year,cal.pillars.month,cal.pillars.day,cal.pillars.hour].join(' ');
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
  C.birthYear=+cal.civilDate.slice(0,4); C.lunarYear=L?L.year:C.raw.rawDates.lunarDate.lunarYear;
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
  timeToIndex:timeToIndex, TIME_BASIS:TIME_BASIS, DEF_LON:DEF_LON, parseLon:parseLon, lonText:lonText, findStar:findStar, rel:rel, sanfang:sanfang, names:names, decades:decades, table:table, addDays:addDays};
})();
