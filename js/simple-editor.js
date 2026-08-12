const $=s=>document.querySelector(s);
const frame=$('#se-preview'), tree=$('#se-tree'), form=$('#se-form'), noSelection=$('#se-no-selection');
const status=$('#se-status'), selectedLabel=$('#se-selected-label');
const STORAGE='utiterv-simple-editor-state';
const EMPTY=()=>({version:1,added:[],deleted:[],moved:[],edited:{}});
let state=loadState(), selected=null, editMode=true, originSelectors=new WeakMap();
let syncing=false;
const containerTags=new Set(['DIV','SECTION','ARTICLE','MAIN','NAV','HEADER','FOOTER','ASIDE','UL','OL','LI','FORM']);
const textTags=new Set(['BUTTON','P','H1','H2','H3','H4','H5','H6','SPAN','A','LABEL','SMALL','STRONG','EM']);

function loadState(){try{return {...EMPTY(),...JSON.parse(localStorage.getItem(STORAGE)||'{}')}}catch{return EMPTY()}}
function saveState(msg='Mentve helyben'){
  localStorage.setItem(STORAGE,JSON.stringify(state));
  postState(); status.textContent=msg; status.className='se-status';
}
function postState(){try{frame.contentWindow.postMessage({type:'simple-editor-state',state},location.origin)}catch{}}
function doc(){try{return frame.contentDocument}catch{return null}}
function win(){try{return frame.contentWindow}catch{return null}}
function setStatus(text,type=''){status.textContent=text;status.className='se-status'+(type?` ${type}`:'')}
function esc(v){return (window.CSS&&CSS.escape)?CSS.escape(String(v)):String(v).replace(/([ #;.:[\],>+~*'"=])/g,'\\$1')}

function selectorFor(el){
  if(!el||el.nodeType!==1) return '';
  if(el.dataset.simpleId) return `[data-simple-id="${esc(el.dataset.simpleId)}"]`;
  if(originSelectors.has(el)) return originSelectors.get(el);
  if(el.id){const s=`#${esc(el.id)}`;originSelectors.set(el,s);return s;}
  const d=doc(),parts=[];let node=el;
  while(node&&node.nodeType===1&&node!==d.body){
    if(node.id){parts.unshift(`#${esc(node.id)}`);break;}
    let part=node.tagName.toLowerCase();
    const stable=[...node.attributes].find(a=>a.name.startsWith('data-')&&a.value&&!a.name.startsWith('data-se-')&&!a.name.startsWith('data-simple-'));
    if(stable){const cand=`${part}[${stable.name}="${esc(stable.value)}"]`;try{if(d.querySelectorAll(cand).length===1){parts.unshift(cand);break}}catch{}}
    const parent=node.parentElement;if(parent){const same=[...parent.children].filter(x=>x.tagName===node.tagName);if(same.length>1)part+=`:nth-of-type(${same.indexOf(node)+1})`}
    parts.unshift(part);node=parent;
  }
  const s=parts.join(' > ');originSelectors.set(el,s);return s;
}

function displayName(el){
  const tag=el.tagName.toLowerCase();
  const text=(el.textContent||'').replace(/\s+/g,' ').trim().slice(0,42);
  const cls=(el.className&&typeof el.className==='string')?'.'+el.className.trim().split(/\s+/).filter(Boolean).slice(0,2).join('.') : '';
  return {tag,label:text||cls||el.id||'(üres)'};
}
function rootElements(){const d=doc();if(!d)return[];const root=d.querySelector('#app')||d.body;return [root]}
function isVisibleTreeEl(el){return el.nodeType===1&&!['SCRIPT','STYLE','LINK','META','NOSCRIPT','SVG','PATH','USE'].includes(el.tagName)&&!el.hasAttribute('data-se-editor-only')}
function flatten(root,depth=0,out=[]){if(!root||out.length>600)return out;if(isVisibleTreeEl(root))out.push({el:root,depth});[...root.children].forEach(ch=>{if(isVisibleTreeEl(ch))flatten(ch,depth+1,out)});return out}
function renderTree(){
  const d=doc();if(!d){tree.innerHTML='<p class="se-empty">Az előnézet még nem érhető el.</p>';return}
  const q=$('#se-search').value.trim().toLowerCase();
  const rows=[];rootElements().forEach(r=>flatten(r,0,rows));
  const frag=document.createDocumentFragment();
  rows.forEach(({el,depth})=>{
    const n=displayName(el), hay=`${n.tag} ${n.label} ${el.id||''} ${el.className||''}`.toLowerCase(); if(q&&!hay.includes(q))return;
    const row=document.createElement('div');row.className='se-tree-row'+(el===selected?' is-selected':'');row.style.paddingLeft=`${Math.min(depth,12)*10}px`;row.dataset.selector=selectorFor(el);
    const main=document.createElement('button');main.type='button';main.className='se-tree-main';main.innerHTML=`<code>${n.tag}</code><span>${escapeHtml(n.label)}</span>`;main.addEventListener('click',()=>selectElement(el,true));row.append(main);
    const actions=document.createElement('div');actions.className='se-tree-actions';
    [['↑','up'],['↓','down'],['→','in'],['←','out'],['×','delete']].forEach(([txt,act])=>{const b=document.createElement('button');b.type='button';b.textContent=txt;b.title={up:'Feljebb',down:'Lejjebb',in:'Beljebb',out:'Kijjebb',delete:'Törlés'}[act];b.addEventListener('click',e=>{e.stopPropagation();moveOrDelete(act)});actions.append(b)});row.append(actions);frag.append(row);
  });
  tree.replaceChildren(frag);
  if(!tree.children.length)tree.innerHTML='<p class="se-empty">Nincs találat.</p>';
  if(selected)scrollSelectedRow(false);
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function scrollSelectedRow(smooth=true){const row=tree.querySelector('.is-selected');row?.scrollIntoView({block:'nearest',behavior:smooth?'smooth':'auto'})}

function ensureOverlayStyle(){
  const d=doc();if(!d||d.querySelector('#se-editor-style'))return;
  const s=d.createElement('style');s.id='se-editor-style';s.dataset.seEditorOnly='1';s.textContent=`
    html.se-editing [data-se-hover]{outline:1px dashed #00a88f!important;outline-offset:2px}
    html.se-editing [data-se-selected]{outline:3px solid #00c8ad!important;outline-offset:3px}
    html.se-editing [data-simple-id]:empty{min-height:26px!important;min-width:54px!important;background-image:repeating-linear-gradient(135deg,rgba(0,200,173,.08),rgba(0,200,173,.08) 6px,transparent 6px,transparent 12px)!important}
  `;d.head.append(s);
}
function setEditingClass(){const d=doc();if(!d)return;d.documentElement.classList.toggle('se-editing',editMode)}
function wirePreview(){
  const d=doc();if(!d)return;ensureOverlayStyle();setEditingClass();postState();
  d.addEventListener('mouseover',e=>{if(!editMode)return;const el=e.target.closest?.('*');if(el&&el!==d.documentElement&&el!==d.body)el.setAttribute('data-se-hover','')},true);
  d.addEventListener('mouseout',e=>{e.target?.removeAttribute?.('data-se-hover')},true);
  d.addEventListener('click',e=>{if(!editMode)return;const el=e.target.closest?.('*');if(!el||el===d.documentElement||el===d.body)return;e.preventDefault();e.stopImmediatePropagation();selectElement(el,true)},true);
  setTimeout(()=>{renderTree();if(selected){const s=selectorFor(selected);const fresh=s&&d.querySelector(s);if(fresh)selectElement(fresh,false)}},150);
}
function selectElement(el,fromUser=false){
  const d=doc();if(!d||!el)return;
  d.querySelectorAll('[data-se-selected]').forEach(x=>x.removeAttribute('data-se-selected'));selected=el;el.setAttribute('data-se-selected','');
  const sel=selectorFor(el),n=displayName(el);selectedLabel.textContent=`${n.tag} · ${n.label}`;$('#se-selector').textContent=sel;$('#se-title').textContent=n.tag.toUpperCase();
  noSelection.hidden=true;form.hidden=false;syncForm(el);renderTree();if(fromUser)scrollSelectedRow(true);
}
function syncForm(el){
  syncing=true;
  $('#se-text').disabled=!textTags.has(el.tagName);$('#se-text').value=textTags.has(el.tagName)?(el.textContent||''):'';
  $('#se-class').value=(typeof el.className==='string'?el.className:'');
  const cs=win().getComputedStyle(el);
  const map={display:'se-display',gap:'se-gap',padding:'se-padding',margin:'se-margin',width:'se-width',minHeight:'se-min-height',background:'se-background',color:'se-color',borderRadius:'se-radius',textAlign:'se-text-align'};
  Object.entries(map).forEach(([prop,id])=>{const input=$('#'+id);const inline=el.style[prop]||'';input.value=inline||(input.tagName==='SELECT'?'':'')});
  syncing=false;
}
function currentKey(){return selected?selectorFor(selected):''}
function getEdit(key){state.edited[key] ||= {styles:{}};state.edited[key].styles ||= {};return state.edited[key]}
function applyInspector(){
  if(syncing||!selected)return;const key=currentKey();if(!key)return;const edit=getEdit(key);
  if(textTags.has(selected.tagName)){edit.text=$('#se-text').value;selected.textContent=edit.text}
  edit.className=$('#se-class').value.trim();selected.className=edit.className;
  const fields={display:'se-display',gap:'se-gap',padding:'se-padding',margin:'se-margin',width:'se-width',minHeight:'se-min-height',background:'se-background',color:'se-color',borderRadius:'se-radius',textAlign:'se-text-align'};
  Object.entries(fields).forEach(([prop,id])=>{const v=$('#'+id).value.trim();edit.styles[prop]=v;selected.style[prop]=v});
  const add=selected.dataset.simpleId&&state.added.find(x=>x.id===selected.dataset.simpleId);if(add){add.text=edit.text??add.text;add.className=edit.className;add.styles={...(add.styles||{}),...edit.styles}}
  saveState();renderTree();
}

function childIndex(el){return el.parentElement?[...el.parentElement.children].filter(isVisibleTreeEl).indexOf(el):0}
function selectedCanContain(){return selected&&containerTags.has(selected.tagName)}
function addElement(tag){
  const d=doc();if(!selected){setStatus('Előbb jelölj ki egy konténert.','is-error');return}
  if(!selectedCanContain()){setStatus('Az új elemet csak konténerbe lehet tenni. Jelöld ki a szülő div/section elemet.','is-error');return}
  const id=`se-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;const el=d.createElement(tag);el.dataset.simpleId=id;
  if(tag==='button')el.type='button';selected.append(el);
  const item={id,tag,parentSelector:selectorFor(selected),index:childIndex(el),text:'',className:'',styles:{}};state.added.push(item);saveState('Új elem hozzáadva');selectElement(el,true);
}
function moveOrDelete(action){
  if(!selected)return;if(action==='delete'){deleteSelected();return}
  const el=selected,parent=el.parentElement;if(!parent)return;let newParent=parent,newIndex=childIndex(el);
  if(action==='up'&&el.previousElementSibling){parent.insertBefore(el,el.previousElementSibling);newIndex=childIndex(el)}
  else if(action==='down'&&el.nextElementSibling){parent.insertBefore(el.nextElementSibling,el);newIndex=childIndex(el)}
  else if(action==='in'){
    const prev=el.previousElementSibling;if(prev&&containerTags.has(prev.tagName)){prev.append(el);newParent=prev;newIndex=childIndex(el)}else{setStatus('Beljebb mozgatáshoz az előző elemnek konténernek kell lennie.','is-error');return}
  }else if(action==='out'){
    const gp=parent.parentElement;if(gp&&parent!==doc().body&&parent.id!=='app'){gp.insertBefore(el,parent.nextElementSibling);newParent=gp;newIndex=childIndex(el)}else{setStatus('Ez az elem már nem mozgatható kijjebb.','is-error');return}
  }else if((action==='up'||action==='down')){setStatus('Ebben az irányban nincs több elem.','is-error');return}
  const add=el.dataset.simpleId&&state.added.find(x=>x.id===el.dataset.simpleId);
  if(add){add.parentSelector=selectorFor(newParent);add.index=newIndex}
  else{const key=selectorFor(el);const prev=state.moved.find(x=>x.selector===key);const move={selector:key,parentSelector:selectorFor(newParent),index:newIndex};if(prev)Object.assign(prev,move);else state.moved.push(move)}
  saveState('Sorrend módosítva');renderTree();scrollSelectedRow(true);
}
function deleteSelected(){
  if(!selected)return;const el=selected,key=selectorFor(el),parent=el.parentElement;
  if(el.dataset.simpleId){state.added=state.added.filter(x=>x.id!==el.dataset.simpleId);delete state.edited[key];state.moved=state.moved.filter(x=>x.selector!==key)}
  else if(!state.deleted.includes(key))state.deleted.push(key);
  el.remove();selected=parent&&parent.isConnected?parent:null;saveState('Elem törölve');if(selected)selectElement(selected,true);else{form.hidden=true;noSelection.hidden=false;renderTree()}
}
function resetSelected(){
  if(!selected)return;const key=selectorFor(selected);delete state.edited[key];state.deleted=state.deleted.filter(x=>x!==key);state.moved=state.moved.filter(x=>x.selector!==key);saveState('Elem módosításai törölve');frame.contentWindow.location.reload();
}

frame.addEventListener('load',()=>{setTimeout(wirePreview,200)});
$('#se-refresh-tree').addEventListener('click',renderTree);$('#se-search').addEventListener('input',renderTree);
document.querySelectorAll('[data-add]').forEach(b=>b.addEventListener('click',()=>addElement(b.dataset.add)));
['se-text','se-class','se-display','se-gap','se-padding','se-margin','se-width','se-min-height','se-background','se-color','se-radius','se-text-align'].forEach(id=>$('#'+id).addEventListener('input',applyInspector));
$('#se-delete').addEventListener('click',deleteSelected);$('#se-reset').addEventListener('click',resetSelected);
$('#se-mode').addEventListener('click',()=>{editMode=!editMode;$('#se-mode').textContent=editMode?'Kipróbálás':'Szerkesztés';setEditingClass();setStatus(editMode?'Szerkesztési mód':'Kipróbálási mód')});
document.querySelectorAll('[data-width]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-width]').forEach(x=>x.classList.toggle('is-active',x===b));frame.style.width=b.dataset.width+'px'}));

// ----- Complete build ZIP (store/no compression; no external library) -----
const te=new TextEncoder();
let crcTable=null;
function makeCrcTable(){const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);t[n]=c>>>0}return t}
function crc32(bytes){crcTable ||= makeCrcTable();let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0}
function u16(n){return new Uint8Array([n&255,(n>>>8)&255])}function u32(n){return new Uint8Array([n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255])}
function cat(parts){const len=parts.reduce((a,b)=>a+b.length,0),out=new Uint8Array(len);let o=0;for(const p of parts){out.set(p,o);o+=p.length}return out}
function dosDateTime(date=new Date()){const year=Math.max(1980,date.getFullYear());return{time:(date.getHours()<<11)|(date.getMinutes()<<5)|(date.getSeconds()>>1),date:((year-1980)<<9)|((date.getMonth()+1)<<5)|date.getDate()}}
function zipStore(files){let offset=0;const locals=[],centrals=[];const dt=dosDateTime();for(const f of files){const name=te.encode(f.name.replace(/^\/+/,'')),data=f.data instanceof Uint8Array?f.data:new Uint8Array(f.data),crc=crc32(data);const local=cat([u32(0x04034b50),u16(20),u16(0x0800),u16(0),u16(dt.time),u16(dt.date),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),name,data]);locals.push(local);const central=cat([u32(0x02014b50),u16(20),u16(20),u16(0x0800),u16(0),u16(dt.time),u16(dt.date),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),name]);centrals.push(central);offset+=local.length}const centralBlob=cat(centrals),localBlob=cat(locals);const end=cat([u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),u32(centralBlob.length),u32(localBlob.length),u16(0)]);return cat([localBlob,centralBlob,end])}
async function exportBuild(){
  try{setStatus('Teljes build összegyűjtése…','is-working');$('#se-export').disabled=true;const manifestRes=await fetch(`build-files.json?t=${Date.now()}`,{cache:'no-store'});if(!manifestRes.ok)throw new Error('A build fájllista nem tölthető be.');const names=await manifestRes.json();const files=[];let i=0;for(const name of names){i++;setStatus(`Build: ${i}/${names.length} · ${name}`,'is-working');let data;if(name==='content/simple-editor-state.json')data=te.encode(JSON.stringify(state,null,2));else{const r=await fetch(`${name}${name.includes('?')?'&':'?'}build=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(`Nem tölthető be: ${name} (${r.status})`);data=new Uint8Array(await r.arrayBuffer())}files.push({name,data})}const zip=zipStore(files),blob=new Blob([zip],{type:'application/zip'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='utiterv-studio-simple-editor-build.zip';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);setStatus(`Kész build: ${files.length} fájl`)}catch(err){console.error(err);setStatus(`Export hiba: ${err.message}`,'is-error')}finally{$('#se-export').disabled=false}}
$('#se-export').addEventListener('click',exportBuild);

window.addEventListener('beforeunload',()=>saveState());
