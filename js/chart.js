/* 命盤繪製：傳統 4×4 十二宮格，中宮放基本資料 */
(function(){
'use strict';
var POS={巳:[1,1],午:[1,2],未:[1,3],申:[1,4],辰:[2,1],酉:[2,4],卯:[3,1],戌:[3,4],寅:[4,1],丑:[4,2],子:[4,3],亥:[4,4]};
function e(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
function hb(C,star){ var r=''; C.sihua.forEach(function(x){ if(x.star===star) r+='<i class="h h'+x.hua+'">'+x.hua+'</i>'; }); return r; }
function selfMark(p,star){ var r=''; p.fly.forEach(function(f){ if(f.self&&f.star===star) r+='<i class="sh" title="自化'+f.hua+'">↻'+f.hua+'</i>'; }); return r; }
function render(C,F,el){
  var h='<div class="zwgrid">';
  C.pal.forEach(function(p){
    var pos=POS[p.br], cls='cell'+(p.name==='命宮'?' ming':'')+(p.isBodyPalace?' body':'');
    h+='<div class="'+cls+'" data-i="'+p.idx+'" style="grid-row:'+pos[0]+';grid-column:'+pos[1]+'">';
    h+='<div class="stars">';
    p.major.forEach(function(s){ h+='<span class="st mj"><b>'+e(s.name)+'</b><em>'+e(s.brightness||'')+'</em>'+hb(C,s.name)+selfMark(p,s.name)+'</span>'; });
    p.minor.forEach(function(s){ var bad=ZW.UNLUCKY.indexOf(s.name)>=0; h+='<span class="st mn'+(bad?' bad':'')+'"><b>'+e(s.name)+'</b><em>'+e(s.brightness||'')+'</em>'+hb(C,s.name)+selfMark(p,s.name)+'</span>'; });
    h+='</div><div class="adj">'+p.adj.map(function(s){return e(s.name);}).join(' ')+'</div>';
    if(F){ var tags=[]; ['dMap','yMap','aMap'].forEach(function(k,ki){ for(var n in F[k]) if(F[k][n]===p) tags.push(['大','年','小'][ki]+(n==='命宮'?'命':n.slice(0,1))); });
      var fs=[]; (F.dStars[p.idx]||[]).concat(F.yStars[p.idx]||[]).forEach(function(s){ fs.push(s.name); });
      h+='<div class="flow">'+tags.map(function(t){return '<span class="tg'+(/命$/.test(t)?' tm':'')+'">'+e(t)+'</span>';}).join('')+(fs.length?'<span class="fs">'+e(fs.join(' '))+'</span>':'')+'</div>'; }
    h+='<div class="foot"><span class="gods">'+e(p.changsheng12)+' '+e(p.boshi12)+'<br>'+e(p.jiangqian12)+' '+e(p.suiqian12)+'</span>';
    h+='<span class="pn"><span class="rg">'+p.decadal.range.join('–')+'</span><b>'+e(p.name)+(p.isBodyPalace?'<small>身</small>':'')+'</b><span class="gz">'+e(p.stem+p.br)+'</span></span></div>';
    h+='<div class="ages">小限 '+p.ages.slice(0,5).join('、')+'</div>';
    h+='</div>';
  });
  var R=C.raw, cd=R.chineseDate.split(' ');
  h+='<div class="center" style="grid-row:2/4;grid-column:2/4">';
  h+='<div class="ct">'+e(C.S.name||'紫微斗數命盤')+'</div>';
  h+='<div>'+e(C.S.gender==='男'?((ZW.ST.indexOf(C.yearStem)%2?'陰':'陽')+'男'):((ZW.ST.indexOf(C.yearStem)%2?'陰':'陽')+'女'))+'　'+e(R.zodiac)+'年　'+e(R.fiveElementsClass)+'</div>';
  h+='<div>西曆 '+e(R.solarDate)+' '+e(R.time)+'（'+e(R.timeRange)+'）</div>';
  h+='<div>農曆 '+e(R.lunarDate)+'</div>';
  h+='<div class="bz">'+cd.map(function(x,i){return '<span><small>'+['年','月','日','時'][i]+'</small>'+e(x)+'</span>';}).join('')+'</div>';
  h+='<div>命宮 '+e(C.ming.stem+C.ming.br)+'　身宮 '+e(C.body?C.body.br+'（'+C.body.name+'）':'')+'</div>';
  h+='<div>命主 '+e(R.soul)+'　身主 '+e(R.body)+'</div>';
  h+='<div>生年四化（'+e(C.yearStem)+'）：'+C.sihua.map(function(x){return e(x.star)+'化'+x.hua;}).join('　')+'</div>';
  if(F) h+='<div class="cf">'+F.year+' 流年 '+e(F.gz)+'（虛歲 '+F.nominalAge+'）<br>大限 '+F.dRange.join('–')+' '+e(F.decadal.heavenlyStem+F.decadal.earthlyBranch)+'：'+F.dHua.map(function(x){return e(x.star)+x.hua;}).join(' ')+'<br>流年四化：'+F.yHua.map(function(x){return e(x.star)+x.hua;}).join(' ')+'</div>';
  h+='<div class="lg"><i class="h h祿">祿</i><i class="h h權">權</i><i class="h h科">科</i><i class="h h忌">忌</i> 生年四化　<i class="sh">↻</i> 自化　點宮位看三方四正</div>';
  h+='</div></div>';
  el.innerHTML=h;
  el.querySelectorAll('.cell').forEach(function(c){ c.onclick=function(){ var i=+c.dataset.i, on=c.classList.contains('sel');
    el.querySelectorAll('.cell').forEach(function(x){x.classList.remove('sel','sf');}); if(on) return;
    c.classList.add('sel'); [6,4,8].forEach(function(o){ el.querySelector('.cell[data-i="'+((i+o)%12)+'"]').classList.add('sf'); }); }; });
}
window.ZWChart={render:render,POS:POS};
})();
