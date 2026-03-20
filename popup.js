// PromptMinify v1.0.0
// Creator: Dhanush D | dhanushd1812@gmail.com | github.com/Drdhx
"use strict";

function estimateTokens(text){
  if(!text||!text.trim()) return 0;
  const w=text.trim().split(/\s+/).length;
  return Math.ceil(/```|function |const |def |import |class /.test(text)?w*1.1:w*0.75+text.length/12);
}

// ════ REWRITER ════
function rewritePrompt(raw){
  const changes=[]; let text=raw;
  const pre=/^(hi[,!]?|hello[,!]?|hey[,!]?|good (morning|afternoon|evening)[,!]?|hope (you're|you are) (well|doing well)[,!]?)[^\n]*\n+/i;
  if(pre.test(text)){text=text.replace(pre,'');changes.push({type:'error',icon:'🗑',text:'Removed greeting/preamble.'});}
  const vo=[[/I\s+(?:would\s+like\s+(?:you\s+to|to)|want\s+(?:you\s+to|to)|need\s+(?:you\s+to|to))\s+/gi,''],[/(?:Could|Can|Would)\s+you\s+(?:please\s+|kindly\s+)?/gi,''],[/(?:Please\s+)?(?:help\s+me\s+(?:to\s+)?|assist\s+me\s+(?:in\s+|to\s+)?)/gi,''],[/I\s+was\s+wondering\s+if\s+(?:you\s+could\s+)?/gi,''],[/If\s+(?:you\s+don'?t\s+mind[,.]?\s*|possible[,.]?\s*)/gi,'']];
  let vc=0; for(const[p,r]of vo){const b=text;text=text.replace(p,r);if(text!==b)vc++;}
  if(vc)changes.push({type:'error',icon:'✂',text:`Removed ${vc} verbose opener(s).`});
  const ds=[/(?:I'm|I am)\s+(?:not\s+sure|a\s+(?:beginner|noob))[^.!?]*[.!?]\s*/gi,/(?:Sorry|I\s+apologize)\s+(?:if|for|in\s+advance)[^.!?]*[.!?]\s*/gi,/(?:Thank\s+you|Thanks)\s+(?:in\s+advance|so\s+much)[^.!?]*[.!?]?\s*/gi,/(?:I\s+(?:really\s+)?appreciate)[^.!?]*[.!?]?\s*/gi,/(?:Let\s+me\s+know\s+if\s+you\s+need)[^.!?]*[.!?]?\s*/gi,/(?:I\s+hope\s+this\s+makes?\s+sense)[^.!?]*[.!?]?\s*/gi,/(?:Feel\s+free\s+to)[^.!?]*[.!?]?\s*/gi];
  let dc=0; for(const p of ds){const b=text;text=text.replace(p,' ');if(text!==b)dc++;}
  if(dc)changes.push({type:'error',icon:'🧹',text:`Stripped ${dc} filler/disclaimer(s).`});
  let cr=0; text=text.replace(/```[\s\S]*?```/g,block=>{const lines=block.split('\n').filter(l=>{const bad=/^\s*\/\/\s*(TODO|FIXME|NOTE|this|the|a |we |it |is |just |here |set|get|init)\b/i.test(l)||/^\s*#\s*(TODO|FIXME|NOTE|this|the|a |we |it |is )\b/i.test(l);if(bad)cr++;return!bad;});return lines.join('\n');});
  if(cr)changes.push({type:'warn',icon:'💬',text:`Removed ${cr} obvious code comment(s).`});
  const vp=[[/\bin\s+order\s+to\b/gi,'to'],[/\bdue\s+to\s+the\s+fact\s+that\b/gi,'because'],[/\bat\s+this\s+point\s+in\s+time\b/gi,'now'],[/\bin\s+the\s+event\s+that\b/gi,'if'],[/\bprior\s+to\b/gi,'before'],[/\bwith\s+the\s+(?:goal|aim)\s+of\b/gi,'to'],[/\bplease\s+note\s+that\b/gi,'note:'],[/\bbasically[,]?\s*/gi,''],[/\bactually[,]?\s*/gi,''],[/\bkind\s+of\s+/gi,''],[/\bsort\s+of\s+/gi,''],[/\bvery\s+(?=\w)/gi,''],[/\breally\s+(?=\w)/gi,''],[/\bjust\s+(?=(?:want|need|try|do|make|add|fix|check))/gi,'']];
  let pc=0; for(const[p,r]of vp){const b=text;text=text.replace(p,r);if(text!==b)pc++;}
  if(pc)changes.push({type:'warn',icon:'🔤',text:`Simplified ${pc} verbose phrase(s).`});
  const seen=new Set();let dupes=0;
  text=text.replace(/([^.!?\n]{15,}[.!?])/g,s=>{const n=s.toLowerCase().replace(/\s+/g,' ').trim();if(seen.has(n)){dupes++;return'';}seen.add(n);return s;});
  if(dupes)changes.push({type:'error',icon:'♻',text:`Removed ${dupes} duplicate sentence(s).`});
  const pb=(text.match(/\n{3,}/g)||[]).length;
  text=text.replace(/[^\S\n]{2,}/g,' ').replace(/\n{3,}/g,'\n\n').replace(/[ \t]+$/gm,'').trim();
  if(pb)changes.push({type:'warn',icon:'↕',text:`Collapsed ${pb} excess blank line(s).`});
  if(!changes.length)changes.push({type:'ok',icon:'✅',text:'Already lean — no issues found.'});
  return{optimized:text,changes};
}

// ════ AI REWRITE ════
async function aiRewrite(prompt,apiKey){
  const res=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:1024,system:`You are a prompt minification expert. Rewrite the user's prompt to be maximally concise while preserving ALL technical intent. Remove greetings, apologies, filler, politeness. Use direct imperatives. Output ONLY the rewritten prompt — no explanation, no prefix, no quotes. Target 40-60% token reduction.`,messages:[{role:'user',content:prompt}]})});
  if(!res.ok){const e=await res.json().catch(()=>({}));throw new Error(e.error?.message||`API ${res.status}`);}
  const d=await res.json();return d.content?.[0]?.text?.trim()||'';
}

// ════ IMAGE PROMPT BUILDER ════
const PLAT={
  midjourney:{prefix:'',suffix:'--v 6.1',negPre:'--no ',negSuf:''},
  dalle:{prefix:'Create an image of: ',suffix:'',negPre:'Do not include: ',negSuf:''},
  stable:{prefix:'masterpiece, best quality, ',suffix:'',negPre:'\n\nNegative prompt: ',negSuf:''},
  ideogram:{prefix:'',suffix:'',negPre:'\n\nNegative: ',negSuf:''},
};
function buildImagePrompt(platform,subject,style,mood,ratio,quality,negative,extra){
  const p=PLAT[platform]||PLAT.midjourney,parts=[];
  if(platform==='stable')parts.push(p.prefix);
  if(subject.trim())parts.push(subject.trim());
  if(style)parts.push(style);if(mood)parts.push(mood);
  if(quality)parts.push(quality);if(extra)parts.push(extra);
  let prompt=parts.filter(Boolean).join(', ');
  if(platform==='dalle'&&p.prefix)prompt=p.prefix+prompt;
  if(platform==='midjourney'){if(ratio)prompt+=' '+ratio;if(p.suffix)prompt+=' '+p.suffix;if(negative)prompt+=' '+p.negPre+negative;}
  else if(negative)prompt+=p.negPre+negative;
  return prompt.trim();
}

// ════ CAPTION PROMPT BUILDER ════
const PLAT_LIMITS={instagram:{note:'up to 2,200 chars, first 125 most visible'},twitter:{note:'max 280 characters'},linkedin:{note:'up to 3,000 chars, first 200 before "see more"'},youtube:{note:'up to 5,000 chars for description'}};
function buildCaptionPrompt(platform,topic,tone,goal,length,variants,cta,hashtags,emoji){
  const pl=PLAT_LIMITS[platform]||PLAT_LIMITS.instagram;
  let p=`Write ${variants} for ${platform.charAt(0).toUpperCase()+platform.slice(1)} (${pl.note}).\n\nTopic: ${topic.trim()}\nTone: ${tone}\nGoal: ${goal}\nLength: ${length}`;
  if(cta)p+=`\nCTA: ${cta}`;
  if(hashtags)p+='\nInclude 5-10 relevant hashtags at the end.';
  if(emoji)p+='\nAdd relevant emojis to increase engagement.';
  p+=`\n\nRequirements:\n- Hook in the first line to stop the scroll\n- Clear conversational language\n- Optimized for ${goal}\n- Platform-native style for ${platform}`;
  if(platform==='twitter')p+='\n- Stay under 280 characters per tweet';
  if(platform==='linkedin')p+='\n- Professional tone, value-first approach';
  if(platform==='youtube')p+='\n- Include keywords naturally for YouTube SEO';
  p+='\n\nOutput only the caption(s), no explanation.';
  return p;
}

// ════ STORAGE ════
const getStorage=keys=>new Promise(r=>chrome.storage.local.get(keys,r));
const setStorage=obj=>new Promise(r=>chrome.storage.local.set(obj,r));

// ════ STATS ════
async function updateStats(orig,optim){
  const d=await getStorage(['stats']);
  const s=d.stats||{total:0,saved:0,reductions:[],today:0,todayDate:''};
  const saved=Math.max(0,orig-optim),pct=orig>0?Math.round((saved/orig)*100):0,today=new Date().toDateString();
  s.total++;s.saved+=saved;s.reductions.push(pct);
  if(s.todayDate!==today){s.today=0;s.todayDate=today;}s.today+=saved;
  await setStorage({stats:s});
}
async function saveHistory(preview,saved){
  const d=await getStorage(['history']);const h=d.history||[];
  h.unshift({preview:preview.slice(0,60),saved,time:Date.now()});
  await setStorage({history:h.slice(0,50)});
}
async function renderStats(){
  const d=await getStorage(['stats','history']);
  const s=d.stats||{total:0,saved:0,reductions:[],today:0},h=d.history||[];
  document.getElementById('statTotal').textContent=s.total;
  document.getElementById('statSaved').textContent=s.saved;
  const avg=s.reductions.length?Math.round(s.reductions.reduce((a,b)=>a+b,0)/s.reductions.length):0;
  document.getElementById('statAvg').textContent=avg+'%';
  document.getElementById('statToday').textContent=s.today||0;
  const hl=document.getElementById('historyList');hl.innerHTML='';
  if(!h.length){hl.innerHTML='<div class="no-history">No history yet.</div>';return;}
  h.slice(0,8).forEach(item=>{const el=document.createElement('div');el.className='history-item';el.innerHTML=`<span class="history-preview">${escHtml(item.preview)}…</span><span class="history-saved">-${item.saved} tkn</span>`;hl.appendChild(el);});
}

// ════ TRACKER ════
const COSTS={gpt4o:5,sonnet:3,mini:0.15,haiku:0.25};
let trackerInterval=null,sessionCache=0;
function formatCost(t,rate){const c=(t/1e6)*rate;return c<0.0001?'$0.0000':c<0.01?'$'+c.toFixed(4):'$'+c.toFixed(3);}
function formatTime(ts){return new Date(ts).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});}
async function renderTracker(){
  const d=await getStorage(['sessionTokens','sessionDate','sessionLog','dailyBudget','apiUsageLimit','totalUsage','totalUsageDate']);
  const today=new Date().toDateString();
  const tokens=d.sessionDate===today?(d.sessionTokens||0):0;
  const log=d.sessionDate===today?(d.sessionLog||[]):[];
  const budget=d.dailyBudget||10000;
  const apiLimit=d.apiUsageLimit||100000;
  // total cumulative usage (persists across days)
  const totalUsage=d.totalUsage||0;
  sessionCache=tokens;

  const big=document.getElementById('liveTokens');
  if(big){big.textContent=tokens.toLocaleString();const p=tokens/budget;big.className='tracker-big'+(p>=1?' danger':p>=.75?' warn':'');}

  // Cost cards
  [['costGpt4o','gpt4o'],['costSonnet','sonnet'],['costMini','mini'],['costHaiku','haiku']].forEach(([id,k])=>{const el=document.getElementById(id);if(el)el.textContent=formatCost(tokens,COSTS[k]);});

  // Daily budget meter
  const pct=Math.min(100,Math.round((tokens/budget)*100));
  const fill=document.getElementById('meterFill');
  if(fill){fill.style.width=pct+'%';fill.className='meter-fill'+(pct>=100?' danger':pct>=75?' warn':'');}
  const pctEl=document.getElementById('budgetPct');if(pctEl)pctEl.textContent=pct+'%';
  const bi=document.getElementById('budgetInfo');if(bi)bi.textContent=`${tokens.toLocaleString()} / ${budget.toLocaleString()} tokens`;

  // API usage limit meter
  const limitPct=Math.min(100,Math.round((totalUsage/apiLimit)*100));
  const limitFill=document.getElementById('apiLimitFill');
  if(limitFill){
    limitFill.style.width=limitPct+'%';
    limitFill.className='meter-fill api-fill'+(limitPct>=100?' danger':limitPct>=75?'':' safe');
  }
  const lpEl=document.getElementById('apiLimitPct');if(lpEl){lpEl.textContent=limitPct+'%';lpEl.style.color=limitPct>=100?'#e05555':limitPct>=75?'#c89a30':'';}
  const liEl=document.getElementById('apiLimitInfo');if(liEl)liEl.textContent=`${totalUsage.toLocaleString()} / ${apiLimit.toLocaleString()} tokens`;

  // Show red warning if limit exceeded
  const warnEl=document.getElementById('apiLimitWarning');
  if(warnEl){
    if(totalUsage>=apiLimit){
      warnEl.style.display='flex';
      const msgEl=document.getElementById('apiLimitMsg');
      if(msgEl)msgEl.textContent=`API usage limit reached — ${totalUsage.toLocaleString()} / ${apiLimit.toLocaleString()} tokens used!`;
    } else if(totalUsage>=apiLimit*0.9){
      warnEl.style.display='flex';
      warnEl.style.borderColor='rgba(200,154,48,.35)';warnEl.style.background='rgba(200,154,48,.07)';warnEl.style.color='#c89a30';
      const msgEl=document.getElementById('apiLimitMsg');
      if(msgEl)msgEl.textContent=`Approaching API limit — ${Math.round((totalUsage/apiLimit)*100)}% used`;
    } else {
      warnEl.style.display='none';
    }
  }

  // Session log
  const logEl=document.getElementById('sessionLog');
  if(logEl)logEl.innerHTML=log.length?log.slice(-10).reverse().map(e=>`<div class="log-item"><span class="log-time">${formatTime(e.time)}</span><span class="log-site">${escHtml(e.site||'Unknown')}</span><span class="log-tokens">+${e.tokens}</span></div>`).join(''):'<div class="no-history">Start typing on any AI page.</div>';
}
function startTracker(){
  if(trackerInterval)return;
  trackerInterval=setInterval(async()=>{
    try{
      const[tab]=await chrome.tabs.query({active:true,currentWindow:true});if(!tab)return;
      const res=await chrome.scripting.executeScript({target:{tabId:tab.id},func:()=>{for(const s of['#prompt-textarea','div[contenteditable="true"]','textarea']){const el=document.querySelector(s);if(el){const t=el.value||el.innerText||'';if(t.trim())return{text:t,host:location.hostname};}}return null;}});
      const r=res?.[0]?.result;if(!r)return;
      const tokens=Math.ceil(r.text.trim().split(/\s+/).length*0.75);
      if(Math.abs(tokens-sessionCache)>8){
        const d=await getStorage(['sessionTokens','sessionLog','sessionDate','totalUsage','apiUsageLimit']);
        const today=new Date().toDateString(),cur=d.sessionDate===today?(d.sessionTokens||0):0;
        const diff=Math.max(0,tokens-(sessionCache%500===0?0:sessionCache));
        if(diff>0){
          const logArr=(d.sessionDate===today?d.sessionLog:[])||[];
          logArr.push({time:Date.now(),tokens:diff,site:r.host});
          const newTotal=(d.totalUsage||0)+diff;
          await setStorage({sessionTokens:cur+diff,sessionDate:today,sessionLog:logArr.slice(-50),totalUsage:newTotal});
          sessionCache=tokens;renderTracker();
        }
      }
    }catch(_){}
  },2000);
}
function stopTracker(){if(trackerInterval){clearInterval(trackerInterval);trackerInterval=null;}}

// ════ UTILS ════
function escHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
let _tt=null;
function showToast(msg,type=''){
  let t=document.querySelector('.toast');if(!t){t=document.createElement('div');t.className='toast';document.body.appendChild(t);}
  t.textContent=msg;t.className='toast'+(type?' '+type:'');t.classList.add('show');
  if(_tt)clearTimeout(_tt);_tt=setTimeout(()=>t.classList.remove('show'),2500);
}
function updateTokenCount(){const el=document.getElementById('tokenCount');if(el)el.textContent=estimateTokens(document.getElementById('promptInput').value);}
function switchTab(name){
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===name));
  document.querySelectorAll('.tab-content').forEach(tc=>tc.classList.toggle('active',tc.id==='tab-'+name));
  if(name==='stats')renderStats();
  if(name==='tracker'){renderTracker();startTracker();}else stopTracker();
}
function showResult(optimized,original,changes,mode='auto'){
  const ot=estimateTokens(original),nt=estimateTokens(optimized);
  const saved=Math.max(0,ot-nt),pct=ot>0?Math.round((saved/ot)*100):0;
  const isOptimized = saved > 0;
  document.getElementById('resultPanel').style.display='flex';
  const rtEl=document.getElementById('resultText');
  rtEl.textContent=optimized;
  rtEl.className='result-text '+(isOptimized?'is-optimized':'not-optimized');
  document.getElementById('resultMode').textContent=mode==='ai'?'🤖 AI Minified':'⚡ Auto-Minified';
  const badge=document.getElementById('savingsBadge');
  badge.textContent=isOptimized?`–${saved} tokens (${pct}%)`:'No changes — already lean';
  badge.className='savings-badge '+(mode==='ai'?'ai-badge':isOptimized?'saved':'no-save');
  buildDiff(original,optimized);
  const il=document.getElementById('issuesList');il.innerHTML='';
  changes.forEach(c=>{const el=document.createElement('div');el.className='issue-item'+(c.type==='warn'?' warn':c.type==='ok'?' ok':'');el.innerHTML=`<span class="issue-icon">${c.icon}</span><span class="issue-text">${escHtml(c.text)}</span>`;il.appendChild(el);});
  window._lastOptimized=optimized;
  // Save for keyboard shortcut
  chrome.runtime.sendMessage({type:'SAVE_LAST_MINIFIED',text:optimized});
  return{saved,pct};
}
function buildDiff(orig,opt){
  const el=document.getElementById('diffText');if(!el)return;
  const ow=new Set(opt.split(/\s+/));let html='';
  for(const w of orig.split(/(\s+)/)){if(/^\s+$/.test(w)){html+=w;continue;}html+=ow.has(w)?escHtml(w):`<span class="diff-rem">${escHtml(w)}</span>`;}
  el.innerHTML=html||escHtml(opt);
}
async function injectToPage(text){
  const[tab]=await chrome.tabs.query({active:true,currentWindow:true});if(!tab)return false;
  try{const res=await chrome.scripting.executeScript({target:{tabId:tab.id},func:(text)=>{for(const s of['#prompt-textarea','div[contenteditable="true"][data-lexical-editor]','div[contenteditable="true"]','textarea[placeholder]','textarea']){const el=document.querySelector(s);if(el&&(el.offsetWidth>0||el.offsetHeight>0)){el.focus();if(el.tagName==='TEXTAREA'||el.tagName==='INPUT'){const sv=Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value')?.set;if(sv)sv.call(el,text);else el.value=text;}else el.textContent=text;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return true;}}return false;},args:[text]});return res?.[0]?.result===true;}catch(_){return false;}
}
async function checkApiKey(){
  const d=await getStorage(['settings']);const key=d.settings?.apiKey||'';
  const n=document.getElementById('apiNotice');if(n)n.style.display=key?'none':'flex';return key;
}
function initPlatform(id,def){
  let sel=def;const c=document.getElementById(id);if(!c)return()=>sel;
  c.querySelectorAll('.plat-btn').forEach(btn=>btn.addEventListener('click',()=>{c.querySelectorAll('.plat-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');sel=btn.dataset.p;}));
  return()=>sel;
}

// ════ INIT ════
document.addEventListener('DOMContentLoaded',async()=>{
  // ── Theme toggle ──
  async function initTheme(){
    const d=await getStorage(['theme']);
    const t=d.theme||'cyber';
    document.documentElement.setAttribute('data-theme',t);
  }
  await initTheme();
  document.getElementById('themeToggle').addEventListener('click',async()=>{
    const cur=document.documentElement.getAttribute('data-theme')||'cyber';
    const next=cur==='cyber'?'classic':'cyber';
    document.documentElement.setAttribute('data-theme',next);
    await setStorage({theme:next});
    showToast(next==='cyber'?'◈ CYBER MODE':'◇ Classic Mode');
  });

  document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>switchTab(t.dataset.tab)));
  document.getElementById('promptInput').addEventListener('input',updateTokenCount);
  checkApiKey();
  const getImgPlatform=initPlatform('imgPlatform','midjourney');
  const getCapPlatform=initPlatform('capPlatform','instagram');

  // Auto-Minify
  document.getElementById('analyzeBtn').addEventListener('click',async()=>{
    const input=document.getElementById('promptInput').value.trim();
    if(!input){showToast('Paste a prompt first!');return;}
    const btn=document.getElementById('analyzeBtn');btn.innerHTML='<span class="btn-icon">⏳</span> Minifying…';btn.disabled=true;
    await new Promise(r=>setTimeout(r,80));
    const{optimized,changes}=rewritePrompt(input);
    const{saved}=showResult(optimized,input,changes,'auto');
    if(saved>0){await saveHistory(input,saved);await updateStats(estimateTokens(input),estimateTokens(optimized));}
    btn.innerHTML='<span class="btn-icon">⚡</span> Auto-Minify';btn.disabled=false;
  });

  // AI Minify
  document.getElementById('aiRewriteBtn').addEventListener('click',async()=>{
    const input=document.getElementById('promptInput').value.trim();
    if(!input){showToast('Paste a prompt first!');return;}
    const key=await checkApiKey();if(!key){showToast('Add API key in Settings!','err-toast');return;}
    const btn=document.getElementById('aiRewriteBtn');btn.innerHTML='⏳ Minifying…';btn.disabled=true;
    try{
      const optimized=await aiRewrite(input,key);if(!optimized)throw new Error('Empty response');
      const changes=[{type:'ok',icon:'🤖',text:'AI minified using Claude Haiku.'},{type:'ok',icon:'💡',text:`${estimateTokens(input)} → ${estimateTokens(optimized)} tokens.`}];
      const{saved}=showResult(optimized,input,changes,'ai');
      if(saved>0){await saveHistory(input,saved);await updateStats(estimateTokens(input),estimateTokens(optimized));}
      showToast('AI minify complete!');
    }catch(e){showToast('API error: '+e.message,'err-toast');}
    finally{btn.innerHTML='🤖 AI Minify';btn.disabled=false;}
  });

  document.getElementById('clearBtn').addEventListener('click',()=>{document.getElementById('promptInput').value='';document.getElementById('resultPanel').style.display='none';updateTokenCount();});
  document.getElementById('copyBtn').addEventListener('click',()=>{if(window._lastOptimized)navigator.clipboard.writeText(window._lastOptimized).then(()=>showToast('Copied!'));});
  document.getElementById('injectBtn').addEventListener('click',async()=>{if(!window._lastOptimized)return;const ok=await injectToPage(window._lastOptimized);if(!ok)navigator.clipboard.writeText(window._lastOptimized);showToast(ok?'⬆ Sent to page!':'Copied — paste manually');});
  document.getElementById('useAsInputBtn').addEventListener('click',()=>{if(window._lastOptimized){document.getElementById('promptInput').value=window._lastOptimized;document.getElementById('resultPanel').style.display='none';updateTokenCount();showToast('Loaded for re-editing!');}});
  document.querySelectorAll('.vt-btn').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.vt-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');const v=btn.dataset.view;document.getElementById('resultText').style.display=v==='optimized'?'block':'none';document.getElementById('diffText').style.display=v==='diff'?'block':'none';}));
  document.getElementById('noticeSettingsBtn')?.addEventListener('click',()=>chrome.runtime.openOptionsPage());
  document.getElementById('settingsBtn').addEventListener('click',()=>chrome.runtime.openOptionsPage());

  // Image Prompt
  document.getElementById('buildImgPrompt').addEventListener('click',()=>{
    const subject=document.getElementById('imgSubject').value.trim();
    if(!subject){showToast('Add a subject first!','img-toast');return;}
    const prompt=buildImagePrompt(getImgPlatform(),subject,document.getElementById('imgStyle').value,document.getElementById('imgMood').value,document.getElementById('imgRatio').value,document.getElementById('imgQuality').value,document.getElementById('imgNegative').value.trim(),document.getElementById('imgExtra').value.trim());
    document.getElementById('imgResultPanel').style.display='flex';
    document.getElementById('imgResultText').textContent=prompt;
    document.getElementById('imgTokenBadge').textContent=estimateTokens(prompt)+' tokens';
    window._lastImgPrompt=prompt;showToast('Image prompt built!','img-toast');
  });
  document.getElementById('copyImgBtn').addEventListener('click',()=>{if(window._lastImgPrompt)navigator.clipboard.writeText(window._lastImgPrompt).then(()=>showToast('Copied!','img-toast'));});
  document.getElementById('injectImgBtn').addEventListener('click',async()=>{if(!window._lastImgPrompt)return;const ok=await injectToPage(window._lastImgPrompt);if(!ok)navigator.clipboard.writeText(window._lastImgPrompt);showToast(ok?'⬆ Sent to page!':'Copied — paste manually','img-toast');});

  // Caption Prompt
  document.getElementById('buildCapPrompt').addEventListener('click',()=>{
    const topic=document.getElementById('capTopic').value.trim();
    if(!topic){showToast('Add your topic first!','cap-toast');return;}
    const prompt=buildCaptionPrompt(getCapPlatform(),topic,document.getElementById('capTone').value,document.getElementById('capGoal').value,document.getElementById('capLength').value,document.getElementById('capVariants').value,document.getElementById('capCta').value.trim(),document.getElementById('capHashtags').checked,document.getElementById('capEmoji').checked);
    document.getElementById('capResultPanel').style.display='flex';
    document.getElementById('capResultText').textContent=prompt;
    document.getElementById('capTokenBadge').textContent=estimateTokens(prompt)+' tokens';
    window._lastCapPrompt=prompt;showToast('Caption prompt built!','cap-toast');
  });
  document.getElementById('copyCapBtn').addEventListener('click',()=>{if(window._lastCapPrompt)navigator.clipboard.writeText(window._lastCapPrompt).then(()=>showToast('Copied!','cap-toast'));});
  document.getElementById('injectCapBtn').addEventListener('click',async()=>{if(!window._lastCapPrompt)return;const ok=await injectToPage(window._lastCapPrompt);if(!ok)navigator.clipboard.writeText(window._lastCapPrompt);showToast(ok?'⬆ Sent to page!':'Copied — paste manually','cap-toast');});

  // Tracker
  document.getElementById('editBudget').addEventListener('click',()=>{document.getElementById('budgetModal').style.display='flex';});
  document.getElementById('cancelBudget').addEventListener('click',()=>{document.getElementById('budgetModal').style.display='none';});
  document.getElementById('saveBudget').addEventListener('click',async()=>{const v=parseInt(document.getElementById('budgetInput').value,10);if(!v||v<100){showToast('Enter a valid number!');return;}await setStorage({dailyBudget:v});document.getElementById('budgetModal').style.display='none';renderTracker();showToast('Budget updated!');});
  document.getElementById('budgetModal').addEventListener('click',e=>{if(e.target===document.getElementById('budgetModal'))document.getElementById('budgetModal').style.display='none';});
  document.getElementById('resetSession').addEventListener('click',async()=>{await setStorage({sessionTokens:0,sessionLog:[],sessionDate:new Date().toDateString()});sessionCache=0;renderTracker();showToast('Session reset!');});

  // API Limit modal
  document.getElementById('editApiLimit').addEventListener('click',()=>{document.getElementById('apiLimitModal').style.display='flex';});
  document.getElementById('cancelApiLimit').addEventListener('click',()=>{document.getElementById('apiLimitModal').style.display='none';});
  document.getElementById('saveApiLimit').addEventListener('click',async()=>{
    const v=parseInt(document.getElementById('apiLimitInput').value,10);
    if(!v||v<1000){showToast('Enter at least 1,000!');return;}
    await setStorage({apiUsageLimit:v});
    document.getElementById('apiLimitModal').style.display='none';
    renderTracker();showToast('API limit set!');
  });
  document.getElementById('apiLimitModal').addEventListener('click',e=>{if(e.target===document.getElementById('apiLimitModal'))document.getElementById('apiLimitModal').style.display='none';});

  // Stats
  document.getElementById('clearStats').addEventListener('click',async()=>{await setStorage({stats:{total:0,saved:0,reductions:[],today:0,todayDate:''},history:[]});renderStats();showToast('Stats cleared!');});
});
