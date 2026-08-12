const $=s=>document.querySelector(s);

const ui={
  file:$("#ai-file"),prompt:$("#ai-prompt"),run:$("#ai-run"),reload:$("#ai-reload"),
  status:$("#ai-status"),result:$("#ai-result"),model:$("#ai-model"),changes:$("#ai-changes"),
  diff:$("#ai-diff-list"),preview:$("#ai-preview"),previewRefresh:$("#ai-preview-refresh"),
  approve:$("#ai-approve"),download:$("#ai-download"),reject:$("#ai-reject"),
  approveStatus:$("#ai-approve-status")
};

const state={original:null,candidate:null,filePath:null,manifest:null};

function status(text,type=""){
  ui.status.textContent=text;
  ui.status.dataset.type=type;
}

function clone(v){return JSON.parse(JSON.stringify(v))}

function changedPaths(a,b,path="$",out=[]){
  if(JSON.stringify(a)===JSON.stringify(b))return out;
  if(Array.isArray(a)&&Array.isArray(b)){
    const n=Math.max(a.length,b.length);
    for(let i=0;i<n;i++)changedPaths(a[i],b[i],`${path}[${i}]`,out);
    return out;
  }
  if(a&&b&&typeof a==="object"&&typeof b==="object"&&!Array.isArray(a)&&!Array.isArray(b)){
    const keys=new Set([...Object.keys(a),...Object.keys(b)]);
    for(const key of keys)changedPaths(a[key],b[key],`${path}.${key}`,out);
    return out;
  }
  out.push(path);
  return out;
}

async function loadManifest(){
  const r=await fetch("content/ai-editable-files.json",{cache:"no-store"});
  if(!r.ok)throw new Error(`A tartalomlista nem tölthető be (${r.status}).`);
  state.manifest=await r.json();
  ui.file.innerHTML=state.manifest.files.map(x=>`<option value="${x.path}">${x.label}</option>`).join("");
  if(!state.manifest.files.length)throw new Error("Nincs szerkeszthető JSON fájl.");
  await loadSelected();
}

async function loadSelected(){
  const path=ui.file.value;
  if(!path)return;
  status("Az eredeti JSON betöltése…");
  const r=await fetch(`${path}?v=${Date.now()}`,{cache:"no-store"});
  if(!r.ok)throw new Error(`A JSON nem tölthető be: ${path} (${r.status}).`);
  state.original=await r.json();
  state.candidate=null;
  state.filePath=path;
  ui.result.hidden=true;
  ui.approveStatus.textContent="";
  status(`Betöltve: ${path}`,"ready");
}

function writePreview(){
  if(!state.candidate||!state.filePath)return;
  sessionStorage.setItem("utiterv-ai-preview-path",state.filePath);
  sessionStorage.setItem("utiterv-ai-preview-json",JSON.stringify(state.candidate));
  ui.preview.src=`index.html?aiPreview=1&t=${Date.now()}`;
}

function structuralTargetForPrompt(prompt){
  const q=String(prompt||"").toLocaleLowerCase("hu-HU");
  const galaxy=/(galaxy\s*guide|galaxy-guide|galaxy guide)/.test(q);
  const structural=/(új\s+(aloldal|fül|szekció)|aloldal\s+(hozzáad|létrehoz)|fül\s+(hozzáad|létrehoz)|szekció\s+(hozzáad|létrehoz))/.test(q);
  if(galaxy&&structural)return "content/modules/galaxy-guide/index.json";
  return null;
}

async function runAI(){
  const prompt=ui.prompt.value.trim();
  if(!prompt)return status("Írd le, mit szeretnél módosítani.","error");

  const structuralTarget=structuralTargetForPrompt(prompt);
  if(structuralTarget&&state.filePath!==structuralTarget){
    const option=[...ui.file.options].find(x=>x.value===structuralTarget);
    if(option){
      ui.file.value=structuralTarget;
      await loadSelected();
    }
  }
  if(!state.original)return status("Nincs betöltött tartalom.","error");

  ui.run.disabled=true;
  ui.result.hidden=true;
  status("Gemini dolgozik… egyetlen API-hívás fut.","working");

  try{
    const r=await fetch("/.netlify/functions/utiterv-ai-content",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({prompt,currentContent:state.original,filePath:state.filePath})
    });
    const data=await r.json();
    if(!r.ok)throw new Error(data.error||`HTTP ${r.status}`);

    state.candidate=data.updatedContent;
    const paths=changedPaths(state.original,state.candidate);
    ui.model.textContent=data.model||"Gemini";
    ui.changes.textContent=data.unchanged?"Nincs tartalmi változás":`${paths.length} módosított mező`;
    ui.diff.innerHTML=paths.length
      ? `<ul>${paths.slice(0,80).map(x=>`<li>${x}</li>`).join("")}</ul>${paths.length>80?`<p>+ ${paths.length-80} további mező</p>`:""}`
      : "<p>Az AI változatlanul adta vissza a JSON-t. A kérés valószínűleg nem tartalmi módosítás volt.</p>";

    ui.result.hidden=false;
    ui.approve.disabled=data.unchanged;
    ui.download.disabled=data.unchanged;
    status(data.unchanged?"Nem történt tartalmi módosítás.":"AI módosítás elkészült. Ellenőrizd az előnézetet.","ready");
    if(!data.unchanged)writePreview();
  }catch(err){
    status(`AI hiba: ${err.message}`,"error");
  }finally{
    ui.run.disabled=false;
  }
}

async function approve(){
  if(!state.candidate)return;
  ui.approve.disabled=true;
  ui.approveStatus.textContent="GitHub commit készül…";
  try{
    const r=await fetch("/.netlify/functions/utiterv-ai-content-approve",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        filePath:state.filePath,
        updatedContent:state.candidate,
        prompt:ui.prompt.value.trim()
      })
    });
    const data=await r.json();
    if(!r.ok)throw new Error(data.error||`HTTP ${r.status}`);
    ui.approveStatus.textContent=data.message||"Jóváhagyva.";
    if(data.commitUrl){
      const a=document.createElement("a");
      a.href=data.commitUrl;a.target="_blank";a.rel="noopener";a.textContent=" Commit megnyitása";
      ui.approveStatus.append(a);
    }
    state.original=clone(state.candidate);
    status("Jóváhagyva. A forrás JSON GitHubra került.","ready");
  }catch(err){
    ui.approveStatus.textContent=`Jóváhagyási hiba: ${err.message}`;
  }finally{
    ui.approve.disabled=false;
  }
}

function download(){
  if(!state.candidate)return;
  const blob=new Blob([JSON.stringify(state.candidate,null,2)+"\n"],{type:"application/json"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download=state.filePath.split("/").pop()||"content.json";
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

ui.file.addEventListener("change",()=>loadSelected().catch(e=>status(e.message,"error")));
ui.reload.addEventListener("click",()=>loadSelected().catch(e=>status(e.message,"error")));
ui.run.addEventListener("click",runAI);
ui.previewRefresh.addEventListener("click",writePreview);
ui.approve.addEventListener("click",approve);
ui.download.addEventListener("click",download);
ui.reject.addEventListener("click",()=>{
  state.candidate=null;ui.result.hidden=true;sessionStorage.removeItem("utiterv-ai-preview-path");
  sessionStorage.removeItem("utiterv-ai-preview-json");status("A módosítás elvetve.","ready");
});

loadManifest().catch(err=>status(`Hiba: ${err.message}`,"error"));
