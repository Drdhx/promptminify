// PromptMinify Content Script
// Creator: Dhanush D | dhanushd1812@gmail.com | github.com/Drdhx
(function(){
'use strict';
if(window.__promptMinifyInjected)return;
window.__promptMinifyInjected=true;
function estimateTokens(t){return t?Math.ceil(t.trim().split(/\s+/).length*0.75):0;}
function findTextarea(){
  var sels=['#prompt-textarea','div[contenteditable="true"][data-lexical-editor]','div[contenteditable="true"]','textarea[placeholder]','textarea'];
  for(var i=0;i<sels.length;i++){var el=document.querySelector(sels[i]);if(el&&el.getBoundingClientRect().width>0)return el;}return null;
}
function getText(el){return el?(el.value||el.innerText||''):''}
function showToast(msg){
  var t=document.createElement('div');
  t.style.cssText='position:fixed;bottom:60px;left:50%;transform:translateX(-50%);background:#1e1e21;color:#eeeef4;border:1px solid rgba(255,255,255,.16);padding:8px 18px;border-radius:20px;font-weight:600;font-size:13px;z-index:2147483647;font-family:sans-serif;pointer-events:none;box-shadow:0 4px 20px rgba(0,0,0,.7)';
  t.textContent=msg;document.body.appendChild(t);setTimeout(function(){t.remove();},2200);
}
function analyzeQuick(text){
  var opt=text.trim(),issues=[],removed=0;
  var fillers=[/\b(please|kindly|could you|can you)\b[\s,]*/gi,/\b(thank you|thanks)[^.]*\./gi];
  fillers.forEach(function(f){var b=opt.length;opt=opt.replace(f,' ');if(opt.length<b)removed++;});
  if(removed)issues.push({icon:'🧹',text:'Filler phrases removed'});
  opt=opt.replace(/\n{3,}/g,'\n\n').trim();
  if((opt.match(/[^.!?]{200,}/g)||[]).length)issues.push({icon:'✂',text:'Long sentences detected'});
  return{optimized:opt,issues:issues};
}
var badge=document.createElement('div');
badge.id='pm-badge';
var inner=document.createElement('div');inner.id='pm-inner';
inner.innerHTML='<span id="pm-icon">⚡</span><span id="pm-label">PromptMinify</span><span id="pm-tokens">0 tkn</span>';
badge.appendChild(inner);document.body.appendChild(badge);
new MutationObserver(function(){
  var ta=findTextarea();if(!ta)return;
  var tokens=estimateTokens(getText(ta));
  var el=document.getElementById('pm-tokens');
  if(el){el.textContent=tokens+' tkn';el.style.color=tokens>2000?'#e05555':tokens>800?'#c89a30':'#c8c8d4';}
}).observe(document.body,{subtree:true,childList:true,characterData:true});
var panel=null,optText='';
badge.addEventListener('click',function(){
  if(!panel){
    panel=document.createElement('div');panel.id='pm-panel';
    panel.innerHTML='<div class="pm-header"><span>⚡ PromptMinify</span><button class="pm-close" id="pm-close">✕</button></div>'
      +'<div class="pm-section"><div class="pm-label">Current tokens</div><div class="pm-big" id="pm-cur">0</div></div>'
      +'<div class="pm-section"><div class="pm-label">Potential savings</div><div class="pm-big hi" id="pm-save">—</div></div>'
      +'<div class="pm-issues" id="pm-issues"></div>'
      +'<div class="pm-actions"><button class="pm-btn primary" id="pm-optimize">⚡ Minify</button><button class="pm-btn" id="pm-copy">📋 Copy</button></div>'
      +'<div class="pm-footer">For Vibe Coders &middot; Created by Dhanush D &middot; <a href="https://github.com/Drdhx" target="_blank">github.com/Drdhx</a></div>';
    document.body.appendChild(panel);
    document.getElementById('pm-close').addEventListener('click',function(){panel.style.display='none';});
  }
  panel.style.display=(panel.style.display==='none'?'block':'none');
  var ta=findTextarea(),text=getText(ta);
  var cur=document.getElementById('pm-cur');if(cur)cur.textContent=estimateTokens(text);
  if(text.trim()){
    var r=analyzeQuick(text);optText=r.optimized;
    var saved=Math.max(0,estimateTokens(text)-estimateTokens(r.optimized));
    var sv=document.getElementById('pm-save');if(sv)sv.textContent=saved>0?('-'+saved+' tokens'):'Looks lean!';
    var iss=document.getElementById('pm-issues');if(iss)iss.innerHTML=r.issues.map(function(i){return'<div class="pm-issue">'+i.icon+' '+i.text+'</div>';}).join('');
  }
});
document.addEventListener('click',function(e){
  if(e.target.id==='pm-optimize'){
    var ta=findTextarea();if(!ta||!optText)return;
    if(ta.tagName==='TEXTAREA'){var d=Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value');if(d&&d.set)d.set.call(ta,optText);else ta.value=optText;}else ta.textContent=optText;
    ta.dispatchEvent(new Event('input',{bubbles:true}));showToast('✅ Prompt minified!');if(panel)panel.style.display='none';
  }
  if(e.target.id==='pm-copy'&&optText){navigator.clipboard.writeText(optText).then(function(){showToast('📋 Copied!');});}
});
})();
