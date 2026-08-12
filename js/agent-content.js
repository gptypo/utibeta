const $=sel=>document.querySelector(sel);
const state={current:null,candidate:null,summary:"",model:""};
const els={
 prompt:$("#content-prompt"),run:$("#content-run"),badge:$("#agent-badge"),status:$("#content-status"),
 section:$("#preview-section"),frame:$("#preview-frame"),summary:$("#content-summary"),model:$("#preview-model"),
 approve:$("#content-approve"),reject:$("#content-reject"),approveStatus:$("#approve-status")
};
function setStatus(text,badge){els.status.textContent=text;if(badge)els.badge.textContent=badge}
async function load(){
 try{state.current=await window.UtitervContentState.load("content/content.json");setStatus("A központi content.json betöltve. Írd le a módosítást.","Kész")}
 catch(err){setStatus(`Nem sikerült betölteni a content.json-t: ${err.message}`,"Hiba")}
}
function sendPreview(){if(!state.candidate||!els.frame.contentWindow)return;els.frame.contentWindow.postMessage({type:"UTITERV_SET_PREVIEW_CONTENT",content:state.candidate},"*")}
els.frame.addEventListener("load",()=>setTimeout(sendPreview,300));
els.run.addEventListener("click",async()=>{
 const prompt=els.prompt.value.trim();
 if(!prompt)return setStatus("Írj be egy módosítási kérést.","Hiányzó kérés");
 if(!state.current)return setStatus("A content.json még nincs betöltve.","Hiba");
 els.run.disabled=true;els.section.hidden=true;setStatus("A Gemini a tartalmi JSON-t módosítja…","Dolgozik");
 try{
  const resp=await fetch("/.netlify/functions/utiterv-content-generate",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({prompt,content:state.current})});
  const data=await resp.json();if(!resp.ok)throw new Error(data.error||`HTTP ${resp.status}`);
  if(data.requiresDeveloperMode){setStatus("Ez a kérés kód- vagy UI-módosítást igényel. Használd a Developer módot.","Developer mód");return}
  state.candidate=data.content;state.summary=data.summary||"Tartalmi módosítás elkészült.";state.model=data.model||"Gemini";
  els.summary.textContent=state.summary;els.model.textContent=state.model;els.section.hidden=false;
  els.approveStatus.textContent="Az előnézet csak memóriában módosult. GitHubra még semmi nem került.";
  setStatus("A módosítás elkészült. Ellenőrizd az előnézetet.","Előnézet");setTimeout(sendPreview,300);
 }catch(err){setStatus(`A tartalommódosítás sikertelen: ${err.message}`,"Hiba")}
 finally{els.run.disabled=false}
});
els.reject.addEventListener("click",()=>{state.candidate=null;state.summary="";els.section.hidden=true;setStatus("A módosítás elvetve. A publikus tartalom nem változott.","Elvetve")});
els.approve.addEventListener("click",async()=>{
 if(!state.candidate)return;els.approve.disabled=true;els.approveStatus.textContent="GitHub commit készül…";
 try{
  const resp=await fetch("/.netlify/functions/utiterv-content-approve",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({content:state.candidate,summary:state.summary})});
  const data=await resp.json();if(!resp.ok)throw new Error(data.error||`HTTP ${resp.status}`);
  state.current=JSON.parse(JSON.stringify(state.candidate));els.approveStatus.textContent=`Jóváhagyva. ${data.message}`;
  setStatus("A content.json GitHub commit elkészült. A Netlify deploy automatikusan indul.","Kiadva");
  if(data.commitUrl){const link=document.createElement("a");link.href=data.commitUrl;link.target="_blank";link.rel="noopener";link.textContent="Commit megnyitása";link.className="agent-secondary";els.approveStatus.append(" ");els.approveStatus.append(link)}
 }catch(err){els.approveStatus.textContent=`A GitHub commit sikertelen: ${err.message}`;setStatus("A jóváhagyás nem fejeződött be.","Hiba")}
 finally{els.approve.disabled=false}
});
load();
