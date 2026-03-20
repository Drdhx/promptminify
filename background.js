// PromptMinify Background Service Worker
// Created by Dhanush D | github.com/Drdhx
chrome.runtime.onInstalled.addListener(({reason})=>{
  if(reason==='install'){
    chrome.storage.local.set({stats:{total:0,saved:0,reductions:[],today:0,todayDate:''},history:[],settings:{showBadge:true,autoAnalyze:false,trackStats:true,apiKey:''},dailyBudget:10000,apiUsageLimit:100000,totalUsage:0});
    chrome.tabs.create({url:chrome.runtime.getURL('options.html')});
  }
  // Create context menu
  chrome.contextMenus.create({
    id:'promptminify-minify',
    title:'⚡ Minify selected text with PromptMinify',
    contexts:['selection']
  });
});

// Keyboard shortcut handler
chrome.commands.onCommand.addListener(async(command)=>{
  const[tab]=await chrome.tabs.query({active:true,currentWindow:true});
  if(!tab) return;
  if(command==='open-popup'){
    // Can't programmatically open popup in MV3, so we notify the page
    chrome.scripting.executeScript({target:{tabId:tab.id},func:()=>{
      const t=document.createElement('div');
      t.style.cssText='position:fixed;top:20px;right:20px;background:#1e1e21;color:#eeeef4;border:1px solid rgba(255,255,255,.18);padding:10px 16px;border-radius:10px;font-weight:600;font-size:13px;z-index:2147483647;font-family:sans-serif;box-shadow:0 4px 20px rgba(0,0,0,.7)';
      t.textContent='⚡ Click the PromptMinify icon to open';
      document.body.appendChild(t);setTimeout(()=>t.remove(),2500);
    }});
  }
  if(command==='auto-minify'){
    chrome.scripting.executeScript({target:{tabId:tab.id},func:()=>{
      // Trigger the content script minify if loaded
      if(window.__promptMinifyInjected){
        const btn=document.getElementById('pm-optimize');
        if(btn){btn.click();return;}
      }
      // Fallback — basic strip & notify
      const sels=['#prompt-textarea','div[contenteditable="true"]','textarea'];
      for(const s of sels){
        const el=document.querySelector(s);
        if(el&&(el.value||el.innerText||'').trim()){
          const t=document.createElement('div');
          t.style.cssText='position:fixed;top:20px;right:20px;background:#1e1e21;color:#5dcf95;border:1px solid rgba(74,172,120,.3);padding:10px 16px;border-radius:10px;font-weight:600;font-size:13px;z-index:2147483647;font-family:sans-serif';
          t.textContent='⚡ Open PromptMinify popup to minify this prompt';
          document.body.appendChild(t);setTimeout(()=>t.remove(),2500);
          return;
        }
      }
    }});
  }
  if(command==='copy-last'){
    const d=await chrome.storage.local.get(['lastMinified']);
    if(d.lastMinified){
      await chrome.scripting.executeScript({target:{tabId:tab.id},func:(text)=>{navigator.clipboard.writeText(text).then(()=>{const t=document.createElement('div');t.style.cssText='position:fixed;top:20px;right:20px;background:#1e1e21;color:#c8c8d4;border:1px solid rgba(255,255,255,.18);padding:10px 16px;border-radius:10px;font-weight:600;font-size:13px;z-index:2147483647;font-family:sans-serif';t.textContent='📋 Minified prompt copied!';document.body.appendChild(t);setTimeout(()=>t.remove(),2000);});},args:[d.lastMinified]});
    }
  }
});

// Context menu handler
chrome.contextMenus.onClicked.addListener(async(info,tab)=>{
  if(info.menuItemId==='promptminify-minify'&&info.selectionText){
    await chrome.storage.local.set({pendingMinify:info.selectionText});
    chrome.scripting.executeScript({target:{tabId:tab.id},func:()=>{
      const t=document.createElement('div');
      t.style.cssText='position:fixed;top:20px;right:20px;background:#1e1e21;color:#eeeef4;border:1px solid rgba(255,255,255,.18);padding:10px 16px;border-radius:10px;font-weight:600;font-size:13px;z-index:2147483647;font-family:sans-serif';
      t.textContent='⚡ Open PromptMinify popup — text is ready to minify!';
      document.body.appendChild(t);setTimeout(()=>t.remove(),3000);
    }});
  }
});

// Message passing
chrome.runtime.onMessage.addListener((msg,sender,sendResponse)=>{
  if(msg.type==='GET_ACTIVE_PROMPT'){
    chrome.tabs.query({active:true,currentWindow:true},([tab])=>{
      if(!tab){sendResponse({text:''});return;}
      chrome.scripting.executeScript({target:{tabId:tab.id},func:()=>{for(const s of['#prompt-textarea','div[contenteditable="true"]','textarea']){const el=document.querySelector(s);if(el)return el.value||el.innerText||'';}return'';}},results=>sendResponse({text:results?.[0]?.result||''}));
    });return true;
  }
  if(msg.type==='SAVE_LAST_MINIFIED'){
    chrome.storage.local.set({lastMinified:msg.text});
  }
});

