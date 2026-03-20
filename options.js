// PromptMinify Options JS
// Creator: Dhanush D | dhanushd1812@gmail.com | github.com/Drdhx
async function load(){
  const d=await new Promise(r=>chrome.storage.local.get(['settings'],r));
  const s=d.settings||{};
  document.getElementById('showBadge').checked=s.showBadge!==false;
  document.getElementById('autoAnalyze').checked=!!s.autoAnalyze;
  document.getElementById('trackStats').checked=s.trackStats!==false;
  if(s.apiKey)document.getElementById('apiKeyInput').value=s.apiKey;
}
document.getElementById('toggleKey').addEventListener('click',()=>{const i=document.getElementById('apiKeyInput');i.type=i.type==='password'?'text':'password';});
document.getElementById('saveBtn').addEventListener('click',async()=>{
  const settings={showBadge:document.getElementById('showBadge').checked,autoAnalyze:document.getElementById('autoAnalyze').checked,trackStats:document.getElementById('trackStats').checked,apiKey:document.getElementById('apiKeyInput').value.trim()};
  await new Promise(r=>chrome.storage.local.set({settings},r));
  const t=document.getElementById('toast');t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2000);
});
load();
