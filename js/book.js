/* 命書產生器：由命盤 C、運限 F 與 data/*.json 產生「命書資料物件」
   命書物件格式（供匯出模組使用，與畫面無關）：
   { title, subtitle, meta:[[標籤,值]...], sections:[{id, heading, blocks:[block...]}], sources:[...], generated }
   block：{type:'chart'} | {type:'h3',text} | {type:'p',text} | {type:'quote',text,source} | {type:'list',items:[...]} |
          {type:'table',head:[...],rows:[[...]]} | {type:'note',text}                                                   */
(function(){
'use strict';
var D, C, F, used;
function Q(){ return D.quanshu; }
function src(s){ return '《'+s.book+'》'+s.juan+'・'+s.title; }
function cite(s){ var k=src(s); if(used.indexOf(k)<0) used.push(k); return k; }
function quote(text,s){ return {type:'quote',text:text,source:cite(s)}; }
function fuLine(key,find){ var f=Q().fu[key]; if(!f) return null; for(var i=0;i<f.lines.length;i++) if(f.lines[i].indexOf(find)>=0) return quote(f.lines[i],f.source); return null; }
function P(t){ return {type:'p',text:t}; } function H(t){ return {type:'h3',text:t}; } function N(t){ return {type:'note',text:t}; }
function star(n){ return D.stars.stars[n]; }
function bright(s){ return s.brightness? '（'+s.brightness+'）':''; }
function hasAny(list,arr){ return arr.some(function(x){return list.indexOf(x)>=0;}); }
function huaOf(name){ var r=[]; C.sihua.forEach(function(x){ if(x.star===name) r.push('化'+x.hua); }); return r.join('、'); }
function palName(p){ return p.name==='命宮'?'命宮':p.name+'宮'; }
var REL=['命宮','兄弟','夫妻','子女','財帛','疾厄','遷移','僕役','官祿','田宅','福德','父母'];
// 宮位互涉：p 是 q 的哪一宮（iztro 宮序逆時針：命宮 idx 往後為兄弟…）
function relName(C,ref,cur){ return REL[(ref.idx-cur.idx+12)%12]; }

function sec(id,heading,blocks){ return {id:id,heading:heading,blocks:blocks}; }

// ---------- 一、命盤 ----------
function secChart(){
  var rows=C.pal.slice().sort(function(a,b){ return a.decadal.range[0]-b.decadal.range[0]; }).map(function(p){
    return [palName(p)+(p.isBodyPalace?'（身）':''), p.stem+p.br, p.major.map(function(s){return s.name+(s.brightness||'')+(s.mutagen?'化'+s.mutagen:'');}).join('、')||'（無主星）',
      p.minor.map(function(s){return s.name+(s.mutagen?'化'+s.mutagen:'');}).join('、'), p.decadal.range.join('–')]; });
  return sec('chart','紫微斗數星盤【綜合盤】',[{type:'chart'},{type:'table',head:['宮位','干支','主星（亮度・四化）','輔星・煞星','大限'],rows:rows},
    N('亮度：廟、旺、得、利、平、不（不得地）、陷。四化依「'+D.sihua.tables[C.S.table||'default'].name+'」。')]);
}
// ---------- 二、命宮主星賦文 ----------
function secMingFu(){
  var b=[], p=C.ming, ms=p.major.length?p.major:ZW.rel(C,p,6).major, borrowed=!p.major.length;
  if(borrowed) b.push(P('命宮無主星，依通行說法借對宮（遷移宮）'+ms.map(function(s){return s.name;}).join('、')+'論命，以下賦文供參。'));
  ms.forEach(function(s){
    var n=s.name, w=Q().wenda[n], mg=Q().palace['命宮'].stars[n];
    b.push(H(n+bright(s)+(huaOf(n)?' '+huaOf(n):'')+(borrowed?'（借星）':'')));
    var st=star(n); if(st) b.push(P('【本站摘要】'+st.nature));
    if(w){ var ans=w.lines.filter(function(l){return /^答曰|^希夷/.test(l);}); if(ans[0]) b.push(quote(ans[0],w.source)); }
    if(mg){ if(mg.desc[0]) b.push(quote(mg.desc.slice(0,2).join(''),Q().palace['命宮'].source));
      mg.branch.forEach(function(l){ if(l.indexOf(p.br)>=0 && l.indexOf(p.br)<4) b.push(quote(l,Q().palace['命宮'].source)); });
      var verse=(C.S.gender==='女'&&mg.female.length)?mg.female:mg.male; if(verse[0]) b.push(quote(verse[0],Q().palace['命宮'].source)); }
    ['骨髓賦',C.S.gender==='女'?'女命骨髓賦':null,'形性賦'].forEach(function(k){ if(!k) return; var f=Q().fu[k], c=0;
      f.lines.forEach(function(l){ if(c<2 && l.indexOf(n)>=0 && l.length<80){ b.push(quote(l,f.source)); c++; } }); });
  });
  p.minor.forEach(function(s){ var st=star(s.name); if(st) b.push(P('同宮'+s.name+bright(s)+'：'+st.nature)); });
  return sec('mingfu','命宮主星賦文',b);
}
// ---------- 三、十二宮分析 ----------
function secPalaces(){
  var b=[];
  D.palaces.order.forEach(function(pn){
    var p=C.byName[pn], info=D.palaces.palaces[pn];
    b.push(H('先天'+palName(p)+'分析　'+p.stem+p.br+(p.isBodyPalace?'（身宮）':'')));
    b.push(P(palName(p)+'代表'+info.domain+'。'+info.desc));
    var opp=ZW.rel(C,p,6), t1=ZW.rel(C,p,4), t2=ZW.rel(C,p,8);
    b.push(P('宮位互涉：本宮是'+[opp,t1,t2].map(function(q){ return palName(q)+'的'+(relName(C,q,p)==='命宮'?'命宮':relName(C,q,p)+'宮'); }).join('、')+'；三方四正為'+[opp,t1,t2].map(palName).join('、')+'。'));
    var majors=p.major, qp=Q().palace[pn];
    if(!majors.length){ b.push(P('本宮無主星，借對宮'+palName(opp)+'的'+(opp.major.map(function(s){return s.name;}).join('、')||'星曜')+'來看，力量較弱，易受會照星曜影響。')); }
    majors.forEach(function(s){
      var st=star(s.name), br=s.brightness?D.sihua.brightness[s.brightness]:'';
      b.push(P('◆ '+s.name+bright(s)+(huaOf(s.name)?'・'+huaOf(s.name):'')+'：'+(pn==='命宮'?st.kw+'。':(info.domain.split('、')[0]+'方面帶有「'+st.kw+'」的色彩。'))+(br?'亮度'+s.brightness+'，'+br+'。':'')));
      if(qp){ var lines=pn==='命宮'?(qp.stars[s.name]?qp.stars[s.name].desc.slice(0,1):[]):(qp.stars[s.name]||[]); lines.slice(0,2).forEach(function(l){ b.push(quote(l,qp.source)); }); }
    });
    var helpers=p.minor.filter(function(s){return ZW.LUCKY.indexOf(s.name)>=0||s.name==='祿存'||s.name==='天馬';}), bad=p.minor.filter(function(s){return ZW.UNLUCKY.indexOf(s.name)>=0;});
    if(helpers.length) b.push(P('吉星：'+helpers.map(function(s){ return s.name+'（'+star(s.name).kw+'）'; }).join('；')+'。'));
    if(bad.length) b.push(P('煞星：'+bad.map(function(s){ return s.name+'（'+star(s.name).kw+'）'; }).join('；')+'。'));
    if(qp && pn!=='命宮'){ p.minor.forEach(function(s){ (qp.stars[s.name]||[]).slice(0,1).forEach(function(l){ b.push(quote(l,qp.source)); }); }); }
    var adj=p.adj.filter(function(s){return star(s.name);}); if(adj.length) b.push(P('雜曜：'+adj.map(function(s){return s.name+'（'+star(s.name).kw+'）';}).join('、')+'。'));
    var hz=C.sihua.filter(function(x){return x.pal===p;}); hz.forEach(function(x){ b.push(P('生年'+x.star+'化'+x.hua+'在本宮：'+D.sihua.into[pn][x.hua])); });
    // 三方吉煞統計
    var sf=ZW.names(ZW.sanfang(C,p)), g=sf.filter(function(n){return ZW.LUCKY.indexOf(n)>=0;}).length, x=sf.filter(function(n){return ZW.UNLUCKY.indexOf(n)>=0;}).length;
    b.push(P('三方四正會吉星 '+g+' 顆、煞星 '+x+' 顆，'+(g>x?'吉多於煞，本宮之事較易得助。':g<x?'煞多於吉，本宮之事宜多用心、穩健處理。':'吉煞參半，好壞互見。')));
  });
  return sec('palaces','命中十二宮分析',b);
}
// ---------- 四、格局 ----------
function borrowed(list){ var o=[]; list.forEach(function(q){ if(!q.major.length) ZW.rel(C,q,6).major.forEach(function(s){ o.push(s.name); }); }); return o; }
function detect(){
  var p=C.ming, sf=ZW.sanfang(C,p), sfN=ZW.names(sf).concat(borrowed(sf)), mN=p.names, prev=ZW.rel(C,p,1), next=ZW.rel(C,p,-1);
  function jia(a,b){ return (prev.names.indexOf(a)>=0&&next.names.indexOf(b)>=0)||(prev.names.indexOf(b)>=0&&next.names.indexOf(a)>=0); }
  function majorIn(q,n){ return q.major.some(function(s){return s.name===n;}); }
  function bright(n){ var q=ZW.findStar(C,n); if(!q) return ''; var s=q.all.filter(function(s){return s.name===n;})[0]; return s&&s.brightness; }
  var good=function(n){ return ['廟','旺'].indexOf(bright(n))>=0; };
  var noSha=!hasAny(sfN,ZW.UNLUCKY);
  var hj=C.sihua[3].pal, R={};
  R.zifu_tonggong=majorIn(p,'紫微')&&majorIn(p,'天府');
  R.zifu_chaoyuan=!R.zifu_tonggong&&sfN.indexOf('紫微')>=0&&sfN.indexOf('天府')>=0;
  R.fuxiang_chaoyuan=sfN.indexOf('天府')>=0&&sfN.indexOf('天相')>=0&&!(majorIn(p,'天府')&&majorIn(p,'天相'));
  R.shapolang=['七殺','破軍','貪狼'].some(function(n){return majorIn(p,n);});
  R.jiyue_tongliang=['天機','太陰','天同','天梁'].every(function(n){return sfN.indexOf(n)>=0;});
  R.junchen=majorIn(p,'紫微')&&sfN.indexOf('左輔')>=0&&sfN.indexOf('右弼')>=0;
  R.fubi_jiadi=majorIn(p,'紫微')&&jia('左輔','右弼');
  R.riyue_bingming=sfN.indexOf('太陽')>=0&&sfN.indexOf('太陰')>=0&&good('太陽')&&good('太陰')&&!(majorIn(p,'太陽')&&majorIn(p,'太陰'));
  R.riyue_tonglin=majorIn(p,'太陽')&&majorIn(p,'太陰');
  R.riyue_jia=jia('太陽','太陰');
  R.huotan=sf.some(function(q){return majorIn(q,'貪狼')&&q.names.indexOf('火星')>=0;});
  R.lingtan=sf.some(function(q){return majorIn(q,'貪狼')&&q.names.indexOf('鈴星')>=0;});
  R.yangtuo_jiaji=!!(hj&&hj.names.indexOf('祿存')>=0);
  R.qisha_chaodou=majorIn(p,'七殺')&&'寅申子午'.indexOf(p.br)>=0&&sfN.indexOf('紫微')>=0;
  R.juji_tonggong=majorIn(p,'巨門')&&majorIn(p,'天機');
  R.juri_tonggong=majorIn(p,'巨門')&&majorIn(p,'太陽');
  R.luma_jiaochi=[p,C.byName['財帛'],C.byName['遷移']].some(function(q){ var o=ZW.rel(C,q,6), lu=function(x){return x.names.indexOf('祿存')>=0||C.sihua[0].pal===x;}; return (lu(q)&&(q.names.indexOf('天馬')>=0||o.names.indexOf('天馬')>=0))||(q.names.indexOf('天馬')>=0&&lu(o)); });
  R.sanqi=[0,1,2].every(function(i){ return sf.indexOf(C.sihua[i].pal)>=0; });
  R.changqu_jia=jia('文昌','文曲'); R.kuiyue_jia=jia('天魁','天鉞'); R.kongjie_jia=jia('地空','地劫'); R.yangtuo_jia=jia('擎羊','陀羅');
  R.ming_wu_zhengyao=!p.major.length;
  R.shizhong_yinyu=majorIn(p,'巨門')&&'子午'.indexOf(p.br)>=0;
  R.wengui_wenhua=mN.indexOf('文昌')>=0&&mN.indexOf('文曲')>=0&&'丑未'.indexOf(p.br)>=0;
  R.xingqiu_jiayin=majorIn(p,'廉貞')&&majorIn(p,'天相')&&mN.indexOf('擎羊')>=0;
  R.rizhao_leimen=majorIn(p,'太陽')&&p.br==='卯';
  R.yuelang_tianmen=majorIn(p,'太陰')&&p.br==='亥';
  R.jincan_guanghui=majorIn(p,'太陽')&&p.major.length===1&&p.br==='午';
  R.ziwei_wu=majorIn(p,'紫微')&&p.br==='午'&&noSha;
  R.tianfu_xu=majorIn(p,'天府')&&p.br==='戌'&&hasAny(sfN,ZW.LUCKY);
  R.mingzhu_chuhai=p.br==='未'&&!p.major.length&&majorIn(C.byBr['卯'],'太陽')&&majorIn(C.byBr['亥'],'太陰');
  return R;
}
function secPatterns(){
  var R=detect(), b=[], hit=D.patterns.patterns.filter(function(x){return R[x.id];});
  var sfN=ZW.names(ZW.sanfang(C,C.ming)).concat(borrowed(ZW.sanfang(C,C.ming))), emp=ZW.sanfang(C,C.ming).filter(function(q){return !q.major.length;});
  b.push(P('命宮在'+C.ming.br+'，三方四正為'+ZW.sanfang(C,C.ming).map(palName).join('、')+'；會照主星：'+(ZW.MAJOR.filter(function(n){return sfN.indexOf(n)>=0;}).join('、')||'無')+'；吉星：'+(ZW.LUCKY.filter(function(n){return sfN.indexOf(n)>=0;}).join('、')||'無')+'；煞星：'+(ZW.UNLUCKY.filter(function(n){return sfN.indexOf(n)>=0;}).join('、')||'無')+'。'+(emp.length?emp.map(palName).join('、')+'無主星，依通行說法借對宮主星併入計算。':'')));
  if(!hit.length) b.push(P('本命未見下列常見格局；格局只是參考，仍以三方四正星曜組合與四化為主。'));
  hit.forEach(function(x){ b.push(H(x.name)); b.push(P('成立條件：'+x.cond));
    var any=false; x.quote.forEach(function(q){ var l=fuLine(q.fu,q.find); if(l){ b.push(l); any=true; } });
    if(!any) b.push(N('此格名稱為通行說法，未在本站所收《紫微斗數全書》錄文中找到原句（來源待核）。'));
    b.push(P(x.summary)); });
  b.push(N('本站檢查的格局：'+D.patterns.patterns.map(function(x){return x.name;}).join('、')+'。'));
  return sec('patterns','由紫微斗數看本命格局',b);
}
// ---------- 五、四化 ----------
function secSihua(){
  var b=[P('生年四化（'+C.yearStem+'干，'+D.sihua.tables[C.S.table||'default'].name+'）：'+C.sihua.map(function(x){return x.star+'化'+x.hua+(x.pal?'在'+palName(x.pal):'（不在盤中）');}).join('；')+'。')];
  C.sihua.forEach(function(x){ if(!x.pal) return; var pn=x.pal.name;
    b.push(H(x.star+'化'+x.hua+' → '+palName(x.pal))); b.push(P(D.sihua.hua[x.hua].desc+D.sihua.into[pn][x.hua]));
    var w=Q().wenda['化'+x.hua]; if(w){ var a=w.lines.filter(function(l){return /^答曰/.test(l);})[0]; if(a) b.push(quote(a.length>120?a.slice(0,a.indexOf('。',60)+1)||a:a,w.source)); } });
  // 自化
  b.push(H('本命自化'));
  var any=false;
  C.pal.forEach(function(p){ p.fly.forEach(function(f){ if(!f.self) return; any=true;
    var t={祿:'本宮之事有自得其樂、緣分來得快也去得快的傾向。',權:'本宮之事主觀強、凡事自己作主，易固執。',科:'本宮之事重形象，處理得體，但容易只求表面平順。',忌:'本宮之事易自我消耗、反覆不定，宜留意不必要的執著。'}[f.hua];
    b.push(P(palName(p)+'（'+p.stem+'干）'+f.star+'自化'+f.hua+'：'+t)); }); });
  if(!any) b.push(P('本命無自化。'));
  // 宮干飛化
  b.push(H('各宮四化入十二宮'));
  var rows=[];
  D.palaces.order.forEach(function(pn){ var p=C.byName[pn]; p.fly.forEach(function(f){ if(!f.to) return;
    rows.push([palName(p)+'（'+p.stem+'）','化'+f.hua,f.star,palName(f.to)+(f.self?'（自化）':''),D.sihua.into[f.to.name][f.hua]]); }); });
  b.push({type:'table',head:['發射宮','四化','星曜','入宮','現象（本站整理）'],rows:rows});
  b.push(N('飛化解讀為本站依宮位與四化通則整理的提示，非古籍原文；實際論斷須結合星曜與運限。'));
  return sec('sihua','四化分析',b);
}
// ---------- 六、大限 ----------
function secDecadal(){
  var b=[], rows=ZW.decades(C).map(function(p){ return [p.decadal.range.join('–')+' 歲',p.stem+p.br,palName(p),p.major.map(function(s){return s.name;}).join('、')||'（借對宮）',
    ZW.HUA.map(function(h,i){return C.T[p.stem][i]+h;}).join(' ')]; });
  b.push({type:'table',head:['大限','干支','本命宮位','主星','大限四化'],rows:rows});
  var j=Q().juan3['論大限十年禍福何如']; if(j&&j.lines[0]) b.push(quote(j.lines[0],j.source));
  var dm=F.dMing;
  b.push(H('目前大限：'+F.dRange.join('–')+' 歲（'+F.decadal.heavenlyStem+F.decadal.earthlyBranch+'，本命'+palName(dm)+'）'));
  b.push(P('大限命宮落在本命'+palName(dm)+'，這十年的重心偏向「'+D.palaces.palaces[dm.name].domain+'」。大限命宮主星：'+(dm.major.map(function(s){return s.name+bright(s);}).join('、')||'無主星，借對宮論')+'。'));
  dm.major.forEach(function(s){ var mg=Q().palace['命宮'].stars[s.name]; if(mg&&mg.xian.length) b.push(quote(mg.xian[0],Q().palace['命宮'].source)); });
  b.push(H('大限十二宮'));
  var rows2=[]; D.palaces.order.forEach(function(pn){ var q=F.dMap[pn]; rows2.push(['大限'+(pn==='命宮'?'命宮':pn),q.stem+q.br,'本命'+palName(q),q.major.map(function(s){return s.name;}).join('、')||'—',
    F.dHua.filter(function(x){return x.pal===q;}).map(function(x){return x.star+'化'+x.hua;}).join('、')]); });
  b.push({type:'table',head:['大限宮位','干支','落本命','主星','大限四化落入'],rows:rows2});
  b.push(H('大限四化'));
  F.dHua.forEach(function(x){ if(!x.pal) return; var dn=null; for(var k in F.dMap) if(F.dMap[k]===x.pal) dn=k;
    b.push(P(x.star+'化'+x.hua+'入大限'+(dn==='命宮'?'命宮':dn+'宮')+'（本命'+palName(x.pal)+'）：'+D.sihua.into[dn][x.hua])); });
  return sec('decadal','大限（十年大運）分析',b);
}
// ---------- 七、流年 ----------
function secYearly(){
  var b=[], ym=F.yMing;
  b.push(P(F.year+' 年為'+F.gz+'年，虛歲 '+F.nominalAge+' 歲。流年命宮在'+ym.br+'（本命'+palName(ym)+'），小限在'+F.aMing.br+'（本命'+palName(F.aMing)+'）。'));
  var j=Q().juan3['論流年太歲吉凶星殺']; if(j&&j.lines[0]) b.push(quote(j.lines[0],j.source));
  b.push(H('流年命宮星性'));
  if(ym.major.length) ym.major.forEach(function(s){ var st=star(s.name); b.push(P(s.name+bright(s)+'：'+st.nature)); });
  else b.push(P('流年命宮無主星，借對宮'+ZW.rel(C,ym,6).major.map(function(s){return s.name;}).join('、')+'論，今年較受外在環境牽動。'));
  b.push(H('流年四化'));
  F.yHua.forEach(function(x){ if(!x.pal) return; var yn=null; for(var k in F.yMap) if(F.yMap[k]===x.pal) yn=k;
    b.push(P(x.star+'化'+x.hua+'入流年'+(yn==='命宮'?'命宮':yn+'宮')+'（本命'+palName(x.pal)+'）：'+D.sihua.into[yn][x.hua])); });
  b.push(H('流年十二宮'));
  var rows=[]; D.palaces.order.forEach(function(pn){ var q=F.yMap[pn]; rows.push(['流年'+(pn==='命宮'?'命宮':pn),q.stem+q.br,'本命'+palName(q),q.major.map(function(s){return s.name;}).join('、')||'—',
    F.yHua.filter(function(x){return x.pal===q;}).map(function(x){return x.star+'化'+x.hua;}).join('、'), (F.yStars[q.idx]||[]).map(function(s){return s.name;}).join(' ')]); });
  b.push({type:'table',head:['流年宮位','干支','落本命','主星','流年四化','流年星'],rows:rows});
  // 疊忌提示
  var ji=[C.sihua[3].pal,F.dHua[3].pal,F.yHua[3].pal];
  if(ji[2]&&(ji[2]===ji[0]||ji[2]===ji[1])) b.push(N('流年化忌與'+(ji[2]===ji[0]?'生年':'大限')+'化忌同落本命'+palName(ji[2])+'（忌星重疊），今年此宮之事宜格外謹慎。'));
  return sec('yearly',F.year+' 流年分析',b);
}
// ---------- 八、流月 ----------
function secMonthly(){
  var rows=F.months.map(function(m){ return ['農曆'+m.m+'月',m.gz,m.ming.br+'（本命'+palName(m.ming)+'）',m.ming.major.map(function(s){return s.name;}).join('、')||'—',
    m.hua.map(function(x){return x.star+x.hua;}).join(' '), m.hua[3].pal?palName(m.hua[3].pal):'—']; });
  return sec('monthly',F.year+' 流月',[P('流月以流年命宮起正月，逐月順行（斗君法依 iztro 實作）。下表列出每月流月命宮與流月四化，化忌所落之宮為當月宜留意之事。'),
    {type:'table',head:['月份','月干支','流月命宮','主星','流月四化','化忌落入'],rows:rows}]);
}
// ---------- 九、專題 ----------
function where(n){ var p=ZW.findStar(C,n)||C.pal.filter(function(q){return q.adj.some(function(s){return s.name===n;});})[0]; return p?palName(p):'—'; }
function secTopics(){
  var b=[], gx=C.byName['官祿'], fq=C.byName['夫妻'], jb=C.byName['疾厄'], cb=C.byName['財帛'], tz=C.byName['田宅'], qy=C.byName['遷移'], fm=C.byName['父母'], py=C.byName['僕役'];
  function stars(p){ return (p.major.length?p.major:ZW.rel(C,p,6).major).map(function(s){return s.name;}); }
  function sha(p){ return p.minor.filter(function(s){return ZW.UNLUCKY.indexOf(s.name)>=0;}).map(function(s){return s.name;}); }
  b.push(H('學業與考試'));
  b.push(P('文昌在'+where('文昌')+'、文曲在'+where('文曲')+'，化科在'+(C.sihua[2].pal?palName(C.sihua[2].pal):'—')+'。官祿宮（學業）主星'+stars(gx).join('、')+'，父母宮（文書）主星'+stars(fm).join('、')+'。'
    +((ZW.sanfang(C,C.ming).concat([gx])).some(function(p){return p.names.indexOf('文昌')>=0||p.names.indexOf('文曲')>=0;})?'昌曲會照命宮或官祿，讀書考試較有利。':'昌曲未會命宮，學習宜靠持續累積。')));
  b.push(H('婚姻與感情'));
  b.push(P('夫妻宮主星'+stars(fq).join('、')+(fq.major.length?'':'（借對宮）')+'；'+star(stars(fq)[0]||'天同').kw+'。紅鸞在'+where('紅鸞')+'、天喜在'+where('天喜')+'。'+(sha(fq).length?'夫妻宮見'+sha(fq).join('、')+'，宜多溝通、晚婚較穩。':'夫妻宮無煞星，感情較平順。')));
  b.push(H('身體健康'));
  b.push(P('五行局為'+C.raw.fiveElementsClass+'。疾厄宮主星'+stars(jb).join('、')+'：'+stars(jb).map(function(n){return star(n).health;}).filter(Boolean).join('；')+'。'+(sha(jb).length?'疾厄宮見'+sha(jb).join('、')+'，宜定期檢查。':'')+'（僅為命理參考，健康問題請以醫師診斷為準。）'));
  b.push(H('財運與破財'));
  b.push(P('財帛宮主星'+stars(cb).join('、')+'，化祿在'+(C.sihua[0].pal?palName(C.sihua[0].pal):'—')+'、化忌在'+(C.sihua[3].pal?palName(C.sihua[3].pal):'—')+'。地空在'+where('地空')+'、地劫在'+where('地劫')+'。'
    +(hasAny(cb.names,['地空','地劫'])||C.sihua[3].pal===cb?'財帛宮見空劫或化忌，理財宜保守，避免借貸作保與高風險投資。':'財帛宮未見空劫化忌，財務較穩。')+'今年流年化忌入本命'+(F.yHua[3].pal?palName(F.yHua[3].pal):'—')+'，相關之事宜謹慎。'));
  b.push(H('田宅與置產'));
  b.push(P('田宅宮主星'+stars(tz).join('、')+'。'+(hasAny(tz.names,['祿存'])||C.sihua[0].pal===tz?'田宅見祿，有置產、守財之機。':'')+'大限化祿入本命'+(F.dHua[0].pal?palName(F.dHua[0].pal):'—')+'、流年化祿入本命'+(F.yHua[0].pal?palName(F.yHua[0].pal):'—')+'；化祿入田宅之年較有利購屋。'));
  b.push(H('事業與職業傾向'));
  var car=[]; stars(C.ming).concat(stars(gx)).forEach(function(n){ var s=star(n); if(s&&s.career&&car.indexOf(s.career)<0) car.push(s.career); });
  var boss=hasAny(stars(C.ming).concat(stars(gx)),['紫微','七殺','破軍','貪狼','武曲'])?'命官有開創或領導型主星，具備自行創業或擔任主管的條件。':'命官以穩健型主星為主，在組織中發揮專業較為合適。';
  b.push(P('官祿宮主星'+stars(gx).join('、')+'。'+boss+'適合方向：'+car.join('；')+'。'));
  b.push(H('官非與訴訟'));
  var gf=[C.ming,gx,qy].filter(function(p){return p.names.indexOf('擎羊')>=0||p.adj.some(function(s){return s.name==='天刑';})||C.sihua[3].pal===p&&hasAny(p.names,['廉貞','巨門']);});
  b.push(P(gf.length?'命、官、遷之中'+gf.map(palName).join('、')+'見擎羊、天刑或廉貞巨門化忌，簽約與法律文書宜謹慎。':'命、官、遷未見明顯官非組合。'));
  b.push(H('意外與出行'));
  b.push(P('遷移宮主星'+stars(qy).join('、')+(sha(qy).length?'，見'+sha(qy).join('、')+'，出行宜注意交通安全。':'，未見煞星，出外較平安。')));
  b.push(H('貴人與小人'));
  b.push(P('天魁在'+where('天魁')+'、天鉞在'+where('天鉞')+'、左輔在'+where('左輔')+'、右弼在'+where('右弼')+'，這些宮位所代表的人事容易帶來助力。'
    +'陰煞在'+(C.pal.filter(function(p){return p.adj.some(function(s){return s.name==='陰煞';});}).map(palName).join('、')||'—')+'；僕役宮主星'+stars(py).join('、')+(sha(py).length?'，見'+sha(py).join('、')+'，交友宜慎選。':'。')));
  return sec('topics','專題論斷',b);
}
// ---------- 十、附錄 ----------
function secAppendix(){
  var T=D.sihua.tables[C.S.table||'default'];
  var b=[H('排盤設定'),{type:'list',items:['四化表：'+T.name+'。'+T.note,'子時：'+(C.S.zi==='current'?'晚子時（23:00–24:00）仍算當日，0:00 才換日':'23:00 即換日，晚子時算翌日'),
    '年界：'+(C.S.yearDivide==='exact'?'以立春分年':'以農曆正月初一分年'),'排盤核心：iztro '+(window.iztro&&iztro.version?'':'')+'2.6.5（MIT 授權，已置於本站，不連外部 CDN）','旬空、截空等雜曜位置各家安法略有差異，本站依 iztro 預設。']},
    H('引文出處'),{type:'list',items:used.slice()},
    N('古籍引文取自維基文庫《紫微斗數全書》錄文（公有領域），經程式轉為正體字，個別字形可能與刻本不同。標示【本站摘要】與表格中「本站整理」的文字為依通行說法改寫的白話摘要，不是古籍原文。命理內容僅供參考。')];
  return sec('appendix','附錄：排盤設定與出處',b);
}
function build(chart,flowData,data){
  D=data; C=chart; F=flowData; used=[];
  var R=C.raw;
  var book={title:'紫微斗數命書'+(C.S.name?'：'+C.S.name:''), subtitle:R.solarDate+' '+R.time+'　'+C.S.gender,
    meta:[['姓名',C.S.name||'—'],['性別',C.S.gender],['西曆',R.solarDate+' '+R.time+'（'+R.timeRange+'）'],['農曆',R.lunarDate],['四柱',R.chineseDate],['五行局',R.fiveElementsClass],
      ['命宮／身宮',C.ming.stem+C.ming.br+'／'+(C.body?C.body.br+'（'+C.body.name+'）':'')],['命主／身主',R.soul+'／'+R.body],['流年',F.year+' '+F.gz+'（虛歲 '+F.nominalAge+'）']],
    sections:[]};
  [secChart,secMingFu,secPalaces,secPatterns,secSihua,secDecadal,secYearly,secMonthly,secTopics,secAppendix].forEach(function(fn){
    try{ book.sections.push(fn()); }catch(e){ book.sections.push(sec('err','（此節產生失敗）',[N(String(e&&e.message||e))])); if(window.console) console.error(e); } });
  book.sections.forEach(function(s,i){ s.heading=['一','二','三','四','五','六','七','八','九','十','十一'][i]+'、'+s.heading; });
  book.sources=used.slice(); book.generated=new Date().toLocaleString('zh-TW'); book.chartRef=C; book.flowRef=F;
  return book;
}
window.ZWBook={build:build, detect:function(c,d){ C=c; D=d; return detect(); }};
})();
