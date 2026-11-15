/* 命例存檔（localStorage）、匯入匯出、分享連結；沿用河洛理數站的做法 */
(function(){
'use strict';
var KEY='ziwei-cases-v1';
function $(id){ return document.getElementById(id); }
function load(){ try{ return JSON.parse(localStorage.getItem(KEY))||[]; }catch(e){ return []; } }
function save(l){ localStorage.setItem(KEY,JSON.stringify(l)); }
function msg(t){ $('msg').textContent=t; }
var MAP={cal:'c',date:'d',leap:'l',tidx:'t',gender:'g',zi:'z',table:'s',yearDivide:'yd',flowYear:'y',flowDay:'fd',flowHour:'fh',name:'n'};
function toURL(S){ var q=[]; for(var k in MAP){ if(S[k]!==undefined&&S[k]!=='') q.push(MAP[k]+'='+encodeURIComponent(S[k])); } return location.origin+location.pathname+'#'+q.join('&'); }
function fromURL(){ var h=location.hash.replace(/^#/,''); if(!h) return null; var o={}, inv={}; for(var k in MAP) inv[MAP[k]]=k;
  h.split('&').forEach(function(kv){ var p=kv.split('='); if(inv[p[0]]) o[inv[p[0]]]=decodeURIComponent(p[1]||''); }); return o.date?o:null; }
function refresh(sel){ var l=load(), s=$('caseList'); s.innerHTML='<option value="">（已存命例 '+l.length+' 筆）</option>'+l.map(function(c){ return '<option value="'+c.id+'">'+ZWRender.esc(c.name)+'　'+ZWRender.esc(c.settings.date)+'</option>'; }).join(''); if(sel) s.value=sel; }
function find(id){ return load().filter(function(c){return c.id===id;})[0]; }
function init(){
  $('caseSave').onclick=function(){ var S=ZWApp.settings(), name=(S.name||'').trim(); if(!name) return msg('請先填寫姓名或命例名稱');
    var l=load(), ex=l.filter(function(c){return c.name===name;})[0];
    if(ex){ if(!confirm('已有「'+name+'」，要覆蓋嗎？')) return; ex.settings=S; ex.note=$('caseNote').value; ex.updated=Date.now(); }
    else { ex={id:'c'+Date.now(),name:name,note:$('caseNote').value,settings:S,created:Date.now()}; l.push(ex); }
    save(l); refresh(ex.id); msg('已儲存命例「'+name+'」'); };
  $('caseLoad').onclick=function(){ var c=find($('caseList').value); if(!c) return msg('請先選擇命例'); $('caseNote').value=c.note||''; ZWApp.apply(c.settings); msg('已載入「'+c.name+'」'); };
  $('caseDel').onclick=function(){ var id=$('caseList').value, c=find(id); if(!c) return msg('請先選擇命例'); if(!confirm('確定刪除「'+c.name+'」？')) return;
    save(load().filter(function(x){return x.id!==id;})); refresh(); msg('已刪除「'+c.name+'」'); };
  $('caseExport').onclick=function(){ ZWExport.download(new Blob([JSON.stringify({app:'ziwei',version:1,exported:new Date().toISOString(),cases:load()},null,2)],{type:'application/json'}),'紫微斗數命例_'+new Date().toISOString().slice(0,10)+'.json'); };
  $('caseImport').onchange=function(e){ var f=e.target.files[0]; if(!f) return; f.text().then(function(t){ var d=JSON.parse(t), l=load(), n=0;
      (d.cases||[]).forEach(function(c){ if(c&&c.settings&&!l.some(function(x){return x.id===c.id;})){ l.push(c); n++; } }); save(l); refresh(); msg('已匯入 '+n+' 筆命例'); })
    .catch(function(err){ msg('匯入失敗：'+err.message); }); e.target.value=''; };
  $('copyLink').onclick=function(){ var u=toURL(ZWApp.settings()); history.replaceState(null,'',u);
    (navigator.clipboard?navigator.clipboard.writeText(u):Promise.reject()).then(function(){ msg('已複製分享連結'); },function(){ prompt('複製此連結',u); }); };
  refresh();
}
window.ZWCases={init:init,toURL:toURL,fromURL:fromURL,load:load};
})();
