
const $=(s)=>document.querySelector(s);
const $$=(s)=>Array.from(document.querySelectorAll(s));
const NETLIFY_BACKEND={
 start:'/.netlify/functions/utiterv-agent-start',
 status:'/.netlify/functions/utiterv-agent-status',
 artifact:'/.netlify/functions/utiterv-agent-artifact',
 release:'/.netlify/functions/utiterv-agent-release'
};
const state={files:[],jobId:null,job:null,pollTimer:null,demo:false};

const elements={
 prompt:$('#agent-prompt'),files:$('#agent-files'),fileList:$('#agent-file-list'),
 version:$('#agent-version'),scope:$('#agent-scope'),protect:$('#agent-protect'),
 start:$('#agent-start'),package:$('#agent-package'),badge:$('#agent-state-badge'),
 steps:$('#agent-steps'),connection:$('#agent-connection'),settings:$('#agent-settings'),
 endpoint:$('#agent-endpoint'),saveSettings:$('#agent-save-settings'),demo:$('#agent-demo'),
 result:$('#agent-result'),resultVersion:$('#agent-result-version'),summary:$('#agent-summary'),
 changes:$('#agent-changes'),checks:$('#agent-checks'),preview:$('#agent-preview'),
 download:$('#agent-download'),release:$('#agent-release'),reject:$('#agent-reject'),
 releaseStatus:$('#agent-release-status'),
 usageCard:$('#agent-usage-card'),usageModel:$('#agent-usage-model'),usageInput:$('#agent-usage-input'),usageOutput:$('#agent-usage-output'),usageTotal:$('#agent-usage-total'),usageCost:$('#agent-usage-cost')
};

function endpoint(){return 'netlify'}
function setBadge(text,type=''){elements.badge.textContent=text;elements.badge.className=`agent-state-badge ${type?`is-${type}`:''}`.trim()}
function setStep(name,status){
 const el=elements.steps.querySelector(`[data-step="${name}"]`); if(!el)return;
 el.classList.remove('is-active','is-done','is-error');
 if(status)el.classList.add(`is-${status}`);
}
function resetSteps(){$$('.agent-steps li').forEach(el=>el.classList.remove('is-active','is-done','is-error'))}
function updateConnection(){
 elements.connection.innerHTML=`<strong>Netlify példa backend aktív.</strong><p>A funkciók a <code>/.netlify/functions/</code> útvonalon futnak. A valódi AI használatához a <code>GEMINI_API_KEY</code> környezeti változót kell beállítani.</p><button id="agent-settings-toggle" class="text-button" type="button">Beállítási útmutató</button>`;
 $('#agent-settings-toggle')?.addEventListener('click',()=>elements.settings.open=true);
}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function formatBytes(bytes){if(bytes<1024)return `${bytes} B`;if(bytes<1024*1024)return `${(bytes/1024).toFixed(1)} KB`;return `${(bytes/1024/1024).toFixed(1)} MB`}
function renderFiles(){
 elements.fileList.innerHTML=state.files.map((f,i)=>`<div class="agent-file"><span><strong>${escapeHtml(f.name)}</strong> · ${formatBytes(f.size)}</span><button type="button" data-remove-file="${i}" aria-label="${escapeHtml(f.name)} eltávolítása">×</button></div>`).join('');
}
function buildRequestMeta(){
 return {
  product:'Útiterv Studio',
  sourceVersion:'BETA 3.0',
  requestedVersion:elements.version.value.trim()||'BETA 3.0.1',
  scope:elements.scope.value,
  prompt:elements.prompt.value.trim(),
  requireHumanApproval:elements.protect.checked,
  workflow:['analyze','edit','test','build','review','release'],
  constraints:{
   preserveVisualSystem:true,
   preserveWorkingFeatures:true,
   updateCacheVersion:true,
   createReleaseNotes:true,
   runValidation:true
  },
  attachments:state.files.map(f=>({name:f.name,type:f.type||'application/octet-stream',size:f.size}))
 };
}
async function startJob(){
 if(!elements.prompt.value.trim()){elements.prompt.focus();setBadge('Adj meg utasítást','error');return}
 stopPolling(); resetSteps(); elements.result.hidden=true; elements.releaseStatus.textContent='';
 setBadge('Dolgozik…','working'); setStep('analyze','active'); elements.start.disabled=true;
 try{
  const form=new FormData();
  form.append('request',new Blob([JSON.stringify(buildRequestMeta())],{type:'application/json'}),'request.json');
  state.files.forEach(file=>form.append('files',file,file.name));
  const response=await fetch(NETLIFY_BACKEND.start,{method:'POST',body:form,headers:{'Accept':'application/json'}});
  if(!response.ok)throw new Error(`AI Agent API: HTTP ${response.status}`);
  const data=await response.json();
  state.jobId=data.jobId||data.id;
  if(!state.jobId)throw new Error('A backend nem adott vissza jobId-t.');
  applyJob(data);
  pollJob();
 }catch(error){failJob(error)}
 finally{elements.start.disabled=false}
}
function pollJob(){
 stopPolling();
 const tick=async()=>{
  if(!state.jobId||state.demo)return;
  try{
   const response=await fetch(`${NETLIFY_BACKEND.status}?id=${encodeURIComponent(state.jobId)}`,{headers:{'Accept':'application/json'}});
   if(!response.ok)throw new Error(`Állapotlekérés: HTTP ${response.status}`);
   const job=await response.json();applyJob(job);
   if(!['ready','approved','failed','released','rejected'].includes(job.status))state.pollTimer=setTimeout(tick,1800);
  }catch(error){failJob(error)}
 };
 state.pollTimer=setTimeout(tick,800);
}
function stopPolling(){if(state.pollTimer){clearTimeout(state.pollTimer);state.pollTimer=null}}
function normalizedStage(job){
 if(job.status==='failed')return 'failed';
 if(job.status==='ready')return 'review';
 if(job.status==='released'||job.status==='approved')return 'release';
 return job.stage||job.status||'analyze';
}
function applyJob(job){
 state.job={...state.job,...job}; const stage=normalizedStage(state.job);
 const order=['analyze','edit','test','build','review','release'];
 resetSteps();
 if(stage==='failed'){setBadge('Hiba','error');const failAt=state.job.stage||'analyze';order.slice(0,Math.max(0,order.indexOf(failAt))).forEach(x=>setStep(x,'done'));setStep(failAt,'error');renderResult(state.job,true);return}
 const current=Math.max(0,order.indexOf(stage));
 order.slice(0,current).forEach(x=>setStep(x,'done'));
 setStep(order[current],state.job.status==='released'?'done':'active');
 if(state.job.status==='ready'){
  order.slice(0,4).forEach(x=>setStep(x,'done'));
  setStep('review','active');
  setBadge('Jóváhagyásra vár','ready');
  renderResult(state.job);
 }else if(state.job.status==='approved'){
  order.forEach(x=>setStep(x,'done'));
  setBadge('Jóváhagyva','ready');
  renderResult(state.job);
 }else if(state.job.status==='released'){
  order.forEach(x=>setStep(x,'done'));
  setBadge('Kiadva','ready');
  renderResult(state.job);
 }else setBadge('Dolgozik…','working');
}
function renderResult(job,failed=false){
 elements.result.hidden=false;
 elements.resultVersion.textContent=job.version||buildRequestMeta().requestedVersion;
 elements.summary.textContent=job.summary||(failed?'A kiadás nem készült el.':'A kiadás elkészült és ellenőrzésre vár.');
 const changes=job.changes||[];
 elements.changes.innerHTML=changes.length?changes.map(c=>`<div class="agent-change">${escapeHtml(typeof c==='string'?c:(c.description||c.title||JSON.stringify(c)))}</div>`).join(''):'<div class="agent-change">A backend nem adott részletes változáslistát.</div>';
 const checks=job.checks||[];
 elements.checks.innerHTML=checks.length?checks.map(c=>`<div class="agent-check-result ${c.ok===false?'is-fail':'is-ok'}"><strong>${c.ok===false?'✕':'✓'} ${escapeHtml(c.name||'Ellenőrzés')}</strong>${c.message?`<br><span>${escapeHtml(c.message)}</span>`:''}</div>`).join(''):'<div class="agent-check-result">Nincs ellenőrzési adat.</div>';
 const usage=job.aiUsage;
 if(usage){elements.usageCard.hidden=false;elements.usageModel.textContent=usage.model||'AI modell';elements.usageInput.textContent=Number(usage.inputTokens||0).toLocaleString('hu-HU');elements.usageOutput.textContent=Number(usage.outputTokens||0).toLocaleString('hu-HU');elements.usageTotal.textContent=Number(usage.totalTokens||0).toLocaleString('hu-HU');const usd=usage.cost?.estimatedUsd;elements.usageCost.textContent=typeof usd==='number'?`$${usd<0.01?usd.toFixed(4):usd.toFixed(3)}`:'n/a';}else{elements.usageCard.hidden=true;}
 if(job.previewUrl){elements.preview.href=job.previewUrl;elements.preview.hidden=false}else elements.preview.hidden=true;
 if(job.artifactUrl){elements.download.href=job.artifactUrl;elements.download.hidden=false}else elements.download.hidden=true;
 elements.release.disabled=failed||job.status==='released'||job.status==='approved';
 if(job.status==='approved'){
  elements.releaseStatus.textContent=job.releaseMessage||'Jóváhagyva. Töltsd le a build ZIP-et a kézi publikáláshoz.';
 }else if(job.status==='released'){
  elements.releaseStatus.textContent=job.releaseMessage||'A verzió kiadva.';
 }
 elements.result.scrollIntoView({behavior:'smooth',block:'start'});
}
function failJob(error){stopPolling();setBadge('Hiba','error');setStep(state.job?.stage||'analyze','error');elements.releaseStatus.textContent=error?.message||String(error);elements.start.disabled=false}
async function releaseJob(){
 if(!state.jobId){return}
 if(state.demo){setStep('review','done');setStep('release','active');setBadge('Kiadás…','working');setTimeout(()=>{setStep('release','done');setBadge('Demó kiadva','ready');elements.releaseStatus.textContent='Demó mód: valódi publikálás nem történt.'},700);return}
 elements.release.disabled=true;elements.releaseStatus.textContent='Kiadás folyamatban…';
 try{
  const response=await fetch(NETLIFY_BACKEND.release,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({approved:true,jobId:state.jobId})});
  if(!response.ok)throw new Error(`Kiadás: HTTP ${response.status}`);
  applyJob(await response.json());
 }catch(error){elements.releaseStatus.textContent=error.message;elements.release.disabled=false}
}
async function rejectJob(){elements.result.hidden=true;resetSteps();setBadge('Elvetve');elements.releaseStatus.textContent='A build elvetve. Production kiadás nem történt.'}

function downloadRequestPackage(){
 const meta=buildRequestMeta();
 const blob=new Blob([JSON.stringify(meta,null,2)],{type:'application/json'});
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`utiterv-ai-request-${Date.now()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function runDemo(){
 if(!elements.prompt.value.trim())elements.prompt.value='A csatolt tartalmi észrevételeket vezesd át az alkalmazásban. Tartsd meg a jelenlegi arculatot, frissítsd a verziót, majd ellenőrizd a projektet.';
 state.demo=true;state.jobId='demo-'+Date.now();resetSteps();elements.result.hidden=true;setBadge('Demó fut…','working');
 const stages=['analyze','edit','test','build','review'];let i=0;
 const next=()=>{if(i>0)setStep(stages[i-1],'done');if(i>=stages.length){applyJob({jobId:state.jobId,status:'ready',stage:'review',version:elements.version.value,summary:'Demó workflow elkészült. Ez csak a felület működését mutatja; AI-modell és valódi build nem futott.',changes:['A kérés elemzése megtörtént (demó).','Projektmódosítás szimulálva (demó).','Automatikus ellenőrzések szimulálva (demó).','Új build előkészítve (demó).'],checks:[{name:'JavaScript szintaxis',ok:true,message:'Demó eredmény'},{name:'Projektvalidáció',ok:true,message:'Demó eredmény'},{name:'Regressziós ellenőrzés',ok:true,message:'Demó eredmény'}],aiUsage:{model:'gemini-3.6-flash (demó)',inputTokens:24000,outputTokens:5200,totalTokens:29200,freeTierEligible:true,cost:null,provider:'Gemini'}});return}setStep(stages[i],'active');i++;setTimeout(next,650)};next();
}
function init(){
 $('#agent-year').textContent=new Date().getFullYear();
 elements.endpoint.value='Netlify Functions (beépítve)';elements.endpoint.disabled=true;
 updateConnection();
 elements.files.addEventListener('change',e=>{state.files.push(...Array.from(e.target.files||[]));e.target.value='';renderFiles()});
 elements.fileList.addEventListener('click',e=>{const b=e.target.closest('[data-remove-file]');if(!b)return;state.files.splice(Number(b.dataset.removeFile),1);renderFiles()});
 $$('.agent-suggestions [data-example]').forEach(b=>b.addEventListener('click',()=>{elements.prompt.value=b.dataset.example;elements.prompt.focus()}));
 elements.start.addEventListener('click',startJob);
 elements.package.addEventListener('click',downloadRequestPackage);
 elements.saveSettings.addEventListener('click',()=>{elements.settings.open=false;setBadge('Backend kész')});
 elements.demo.addEventListener('click',runDemo);
 elements.release.addEventListener('click',releaseJob);
 elements.reject.addEventListener('click',rejectJob);
}
init();
