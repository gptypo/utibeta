const UtitervContentState = (() => {
  let state=null, originalState=null, listeners=new Set(), loadingPromise=null;
  const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
  function notify(meta={}){
    const snapshot=clone(state);
    for(const fn of listeners){try{fn(snapshot,meta)}catch(err){console.error("ContentState listener hiba:",err)}}
    window.dispatchEvent(new CustomEvent("utiterv:content-changed",{detail:{state:snapshot,meta}}));
  }
  async function load(url="content/content.json"){
    if(loadingPromise)return loadingPromise;
    loadingPromise=fetch(`${url}?v=${Date.now()}`,{cache:"no-store"}).then(async r=>{
      if(!r.ok)throw new Error(`content.json betöltési hiba: HTTP ${r.status}`);
      const json=await r.json();state=clone(json);originalState=clone(json);notify({type:"load"});return clone(state);
    }).finally(()=>loadingPromise=null);
    return loadingPromise;
  }
  const get=()=>clone(state);
  function set(nextState,meta={}){
    if(!nextState||typeof nextState!=="object"||Array.isArray(nextState))throw new Error("A központi content state csak JSON objektum lehet.");
    state=clone(nextState);notify({type:"set",...meta});return clone(state);
  }
  function reset(){if(originalState){state=clone(originalState);notify({type:"reset"})}return clone(state)}
  function subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)}
  const getModule=name=>clone(state?.modules?.[name]);
  function setModule(name,value,meta={}){
    if(!state)state={schemaVersion:1,appVersion:"BETA 3.5",modules:{}};
    state.modules??={};state.modules[name]=clone(value);notify({type:"module",module:name,...meta});return clone(state.modules[name]);
  }
  function applyPreviewMessage(payload){
    if(!payload||payload.type!=="UTITERV_PREVIEW_CONTENT"||!payload.content||typeof payload.content!=="object")return false;
    set(payload.content,{source:"preview-message"});return true;
  }
  window.addEventListener("message",event=>{
    if(event.source!==window.parent&&event.source!==window.opener)return;
    applyPreviewMessage(event.data);
  });
  return{load,get,set,reset,subscribe,getModule,setModule,applyPreviewMessage};
})();
window.UtitervContentState=UtitervContentState;
