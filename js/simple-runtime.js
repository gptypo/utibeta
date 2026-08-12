const STATE_URL = 'content/simple-editor-state.json';
const EMPTY_STATE = () => ({version:1, added:[], deleted:[], moved:[], edited:{}});
let state = EMPTY_STATE();
let applying = false;
let queued = false;

const esc = value => (window.CSS && CSS.escape) ? CSS.escape(String(value)) : String(value).replace(/([ #;.:[\],>+~*'"=])/g,'\\$1');

export function simpleSelector(el){
  if(!el || el.nodeType!==1) return '';
  if(el.dataset?.simpleId) return `[data-simple-id="${esc(el.dataset.simpleId)}"]`;
  if(el.id) return `#${esc(el.id)}`;
  const parts=[];
  let node=el;
  while(node && node.nodeType===1 && node!==document.body){
    if(node.id){ parts.unshift(`#${esc(node.id)}`); break; }
    let part=node.tagName.toLowerCase();
    const stableData=[...node.attributes].find(a=>a.name.startsWith('data-') && a.value && !a.name.startsWith('data-se-') && !a.name.startsWith('data-simple-'));
    if(stableData){
      const candidate=`${part}[${stableData.name}="${esc(stableData.value)}"]`;
      try{ if(document.querySelectorAll(candidate).length===1){parts.unshift(candidate);break;} }catch{}
    }
    const parent=node.parentElement;
    if(parent){
      const same=[...parent.children].filter(x=>x.tagName===node.tagName);
      if(same.length>1) part+=`:nth-of-type(${same.indexOf(node)+1})`;
    }
    parts.unshift(part);
    node=parent;
  }
  return parts.join(' > ');
}

function find(selector){
  if(!selector) return null;
  try{return document.querySelector(selector)}catch{return null}
}

function insertAt(parent,node,index){
  if(!parent || !node) return;
  const children=[...parent.children].filter(x=>!x.matches?.('[data-se-editor-only]'));
  const pos=Math.max(0,Math.min(Number.isFinite(index)?index:children.length,children.length));
  const ref=children[pos] || null;
  if(ref===node) return;
  parent.insertBefore(node,ref);
}

function createAdded(item){
  if(!item?.id || !item?.tag) return null;
  let el=document.querySelector(`[data-simple-id="${esc(item.id)}"]`);
  if(!el){
    el=document.createElement(item.tag);
    el.dataset.simpleId=item.id;
  }
  if(item.className!==undefined) el.className=item.className || '';
  if(item.text!==undefined && !['DIV','SECTION','ARTICLE','MAIN','NAV','UL','OL'].includes(el.tagName)) el.textContent=item.text || '';
  if(item.attrs) Object.entries(item.attrs).forEach(([k,v])=>{ if(v==null||v==='') el.removeAttribute(k); else el.setAttribute(k,String(v)); });
  if(item.styles) Object.entries(item.styles).forEach(([k,v])=>{el.style[k]=v||''});
  return el;
}

export function applySimpleState(nextState=state){
  if(applying) return;
  applying=true;
  state=nextState || EMPTY_STATE();
  try{
    // Edit original elements before structural moves so their original selectors still resolve.
    Object.entries(state.edited||{}).forEach(([selector,edit])=>{
      const el=find(selector); if(!el) return;
      if(edit.className!==undefined) el.className=edit.className || '';
      if(edit.text!==undefined && !['DIV','SECTION','ARTICLE','MAIN','NAV','UL','OL'].includes(el.tagName)) el.textContent=edit.text || '';
      Object.entries(edit.styles||{}).forEach(([k,v])=>{el.style[k]=v||''});
    });

    (state.added||[]).forEach(item=>{
      const parent=find(item.parentSelector);
      if(!parent) return;
      const el=createAdded(item);
      insertAt(parent,el,item.index);
    });

    (state.moved||[]).forEach(move=>{
      const el=find(move.selector), parent=find(move.parentSelector);
      if(el && parent && el!==parent && !el.contains(parent)) insertAt(parent,el,move.index);
    });

    (state.deleted||[]).forEach(selector=>{ const el=find(selector); if(el) el.remove(); });
  } finally {applying=false;}
}

function scheduleApply(){
  if(applying || queued) return;
  queued=true;
  setTimeout(()=>{queued=false;applySimpleState();},40);
}

async function load(){
  if(new URLSearchParams(location.search).has('simpleEditor')){
    try{
      const local=localStorage.getItem('utiterv-simple-editor-state');
      if(local) state=JSON.parse(local);
    }catch{}
  }else{
    try{
      const res=await fetch(`${STATE_URL}?v=${Date.now()}`,{cache:'no-store'});
      if(res.ok) state=await res.json();
    }catch{}
  }
  applySimpleState();
  new MutationObserver(scheduleApply).observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('message',event=>{
    if(event.data?.type==='simple-editor-state'){
      state=event.data.state || EMPTY_STATE();
      applySimpleState(state);
    }
  });
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',load,{once:true}); else load();
