import {getStudio} from './studio-engine.js';
const STYLE_ID='utiterv-studio-style';
let inspector=location.search.includes('studio=1');
let interactionMode='edit';
let applying=false;
function cssProp(k){return k.replace(/[A-Z]/g,m=>'-'+m.toLowerCase())}
function buildCss(data){
 const t=data.theme||{};let css=`:root{--studio-primary:${t.primary||'#007fff'};--studio-accent:${t.accent||'#14e8c9'};--studio-text:${t.text||'#050505'};--studio-surface:${t.surface||'#fff'};--blue:${t.primary||'#007fff'};--turq:${t.accent||'#14e8c9'};--ink:${t.text||'#050505'};--paper:${t.surface||'#fff'};}@keyframes studioFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}@keyframes studioSpin{to{transform:rotate(360deg)}}@keyframes studioPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}@keyframes studioFade{from{opacity:.55}to{opacity:1}}`;
 for(const [selector,styles] of Object.entries(data.styles||{})){css+=`\n${selector}{${Object.entries(styles).map(([k,v])=>`${cssProp(k)}:${v}!important`).join(';')}}`}
 const rs=data.responsiveStyles||{};const emit=(bucket)=>Object.entries(bucket||{}).map(([selector,styles])=>`${selector}{${Object.entries(styles).map(([k,v])=>`${cssProp(k)}:${v}!important`).join(';')}}`).join('\n');css+=`\n@media(max-width:599px){${emit(rs.mobile)}}\n@media(min-width:600px) and (max-width:899px){${emit(rs.tablet)}}\n@media(min-width:900px){${emit(rs.desktop)}}`;css+=`\n${data.customCss||''}`;return css;
}
function applyClasses(data){
 document.querySelectorAll('[data-studio-classes]').forEach(el=>{const selector=el.dataset.studioClassSelector;if(selector&&data.classes?.[selector])return;el.dataset.studioClasses.split(' ').filter(Boolean).forEach(c=>el.classList.remove(c));delete el.dataset.studioClasses;delete el.dataset.studioClassSelector});
 for(const [selector,value] of Object.entries(data.classes||{})){try{document.querySelectorAll(selector).forEach(el=>{const previous=(el.dataset.studioClasses||'').split(/\s+/).filter(Boolean);previous.forEach(c=>el.classList.remove(c));const cs=value.split(/\s+/).filter(Boolean);cs.forEach(c=>el.classList.add(c));el.dataset.studioClasses=cs.join(' ');el.dataset.studioClassSelector=selector})}catch{}}
}
function applyTexts(data){
 document.querySelectorAll('[data-studio-text-selector]').forEach(el=>{const selector=el.dataset.studioTextSelector;if(selector&&Object.prototype.hasOwnProperty.call(data.texts||{},selector))return;if(el.dataset.studioOriginalHtml!=null)el.innerHTML=el.dataset.studioOriginalHtml;delete el.dataset.studioOriginalHtml;delete el.dataset.studioTextSelector});
 for(const [selector,value] of Object.entries(data.texts||{})){let nodes=[];try{nodes=[...document.querySelectorAll(selector)]}catch{}nodes.forEach(el=>{if(el.dataset.studioOriginalHtml==null)el.dataset.studioOriginalHtml=el.innerHTML;el.dataset.studioTextSelector=selector;if(el.textContent!==String(value))el.textContent=value})}
}
function applyAssets(data){
 document.querySelectorAll('[data-studio-asset-selector]').forEach(el=>{const selector=el.dataset.studioAssetSelector;if(selector&&data.assets?.[selector])return;if(el.tagName==='IMG'&&el.dataset.studioOriginalSrc!=null)el.setAttribute('src',el.dataset.studioOriginalSrc);if(el.dataset.studioBg==='1'){el.style.removeProperty('background-image');el.style.removeProperty('background-size');el.style.removeProperty('background-position');el.style.removeProperty('background-repeat')}delete el.dataset.studioOriginalSrc;delete el.dataset.studioBg;delete el.dataset.studioAssetSelector});
 for(const [selector,a] of Object.entries(data.assets||{})){let nodes=[];try{nodes=[...document.querySelectorAll(selector)]}catch{}nodes.forEach(el=>{el.dataset.studioAssetSelector=selector;if(a.mode==='image'&&el.tagName==='IMG'){if(el.dataset.studioOriginalSrc==null)el.dataset.studioOriginalSrc=el.getAttribute('src')||'';if(el.getAttribute('src')!==a.src)el.setAttribute('src',a.src)}else{el.style.setProperty('background-image',`url("${a.src}")`,'important');el.style.setProperty('background-size',a.size||'contain','important');el.style.setProperty('background-position',a.position||'center','important');el.style.setProperty('background-repeat','no-repeat','important');el.dataset.studioBg='1'}})}
}
function placeInsertion(el,target,item){
 if(item.position==='prepend'){if(target.firstElementChild!==el)target.prepend(el);return}
 if(item.position==='before'){if(el.nextElementSibling!==target)target.before(el);return}
 if(item.position==='after'){if(target.nextElementSibling!==el)target.after(el);return}
 if(item.position==='child-index'){
  const wanted=Math.max(0,Number.isFinite(Number(item.childIndex))?Number(item.childIndex):target.children.length);
  const siblings=[...target.children].filter(x=>x!==el);
  const ref=siblings[wanted]||null;
  if(ref!==el.nextElementSibling)target.insertBefore(el,ref);
  return;
 }
 if(el.parentElement!==target||el!==target.lastElementChild)target.append(el);
}

function applyDeleted(data){
 const wanted=new Set(data.deletedSelectors||[]);
 document.querySelectorAll('[data-studio-deleted="1"]').forEach(el=>{
  const selector=el.dataset.studioDeletedSelector||'';
  if(!wanted.has(selector)){el.removeAttribute('data-studio-deleted');delete el.dataset.studioDeletedSelector}
 });
 for(const selector of wanted){
  let nodes=[];try{nodes=[...document.querySelectorAll(selector)]}catch{}
  nodes.forEach(el=>{el.dataset.studioDeleted='1';el.dataset.studioDeletedSelector=selector});
 }
}
function applyInsertions(data){
 const wanted=new Set((data.insertions||[]).map(x=>x.id));
 document.querySelectorAll('[data-studio-insert-id]').forEach(el=>{if(!wanted.has(el.dataset.studioInsertId))el.remove()});
 for(const item of data.insertions||[]){
  let target=null;try{target=document.querySelector(item.targetSelector)}catch{}if(!target)continue;
  let el=document.querySelector(`[data-studio-insert-id="${CSS.escape(item.id)}"]`);
  if(!el){
   if(item.kind==='component'){
    const tag=item.tag||'div';el=document.createElement(tag);el.textContent=item.text??'';
    if(item.componentType==='button'){el.className='button';el.setAttribute('type','button');el.setAttribute('aria-label','Új gomb')}
    else if(item.componentType==='card'){el.className='card';el.style.padding='20px'}
    else if(item.componentType==='spacer'){el.style.height='32px';el.setAttribute('aria-label','Térköz')}
   }else{
    el=document.createElement('img');el.src=item.src;el.alt=item.alt||item.name||'';el.className='studio-inserted-asset';el.style.maxWidth='100%';el.style.height='auto';
   }
   el.dataset.studioInsertId=item.id;
  }
  placeInsertion(el,target,item);
 }
}
function apply(){if(applying)return;applying=true;try{const d=getStudio();let style=document.getElementById(STYLE_ID);if(!style){style=document.createElement('style');style.id=STYLE_ID;document.head.append(style)}const css=buildCss(d)+'\n[data-studio-deleted=\"1\"]{display:none!important}';if(style.textContent!==css)style.textContent=css;applyInsertions(d);applyDeleted(d);applyClasses(d);applyTexts(d);applyAssets(d)}finally{queueMicrotask(()=>{applying=false})}}
function selectorFor(el){
 if(el.dataset?.studioInsertId)return `[data-studio-insert-id="${CSS.escape(el.dataset.studioInsertId)}"]`;
 if(el.id)return `#${CSS.escape(el.id)}`;
 const path=[];let n=el;
 while(n&&n.nodeType===1&&n!==document.body){
  if(n.id){path.unshift(`#${CSS.escape(n.id)}`);break}
  let part=n.tagName.toLowerCase();const parent=n.parentElement;
  if(parent){const same=[...parent.children].filter(x=>x.tagName===n.tagName);if(same.length>1)part+=`:nth-of-type(${same.indexOf(n)+1})`}
  path.unshift(part);n=parent;
 }
 return path.join(' > ')
}
function label(el){return (el.getAttribute('aria-label')||el.getAttribute('alt')||el.textContent||el.tagName).trim().replace(/\s+/g,' ').slice(0,55)}
function sendTree(){
 if(!inspector||window.parent===window)return;
 const root=document.querySelector('#view')||document.body;
 const allowed=el=>!el.closest?.('#splash,[data-studio-ui],[data-studio-deleted=\"1\"]')&&['DIV','SECTION','ARTICLE','HEADER','MAIN','NAV','ASIDE','BUTTON','A','IMG','H1','H2','H3','P','SPAN'].includes(el.tagName);
 const all=[...root.querySelectorAll('*')].filter(allowed).slice(0,420);
 const nodes=all.map(el=>{
  let depth=0,n=el.parentElement;while(n&&n!==root&&depth<8){depth++;n=n.parentElement}
  return {selector:selectorFor(el),tag:el.tagName.toLowerCase(),label:label(el),text:el.textContent?.trim()||'',depth,insertId:el.dataset?.studioInsertId||'',parentSelector:el.parentElement?selectorFor(el.parentElement):''}
 });
 window.parent.postMessage({type:'utiterv-studio-tree',nodes},'*')
}

function select(el){if(interactionMode!=='edit')return;document.querySelectorAll('.studio-selected').forEach(x=>x.classList.remove('studio-selected'));el.classList.add('studio-selected');const r=el.getBoundingClientRect();window.parent.postMessage({type:'utiterv-studio-select',selector:selectorFor(el),tag:el.tagName.toLowerCase(),label:label(el),text:el.textContent?.trim()||'',rect:{width:Math.round(r.width),height:Math.round(r.height)}},'*')}
if(inspector){const s=document.createElement('style');s.id='studio-inspector-style';s.textContent='.studio-selected{outline:2px solid #14e8c9!important;outline-offset:3px!important}.studio-hover{outline:1px dashed #14e8c9!important;outline-offset:2px!important;cursor:pointer!important}[data-studio-insert-id]:empty:not(img){min-height:28px!important;min-width:56px!important;outline:1px dashed rgba(20,232,201,.75)!important;outline-offset:2px!important}';document.head.append(s);document.addEventListener('mouseover',e=>{if(interactionMode!=='edit'||e.target.closest('#splash'))return;document.querySelectorAll('.studio-hover').forEach(x=>x.classList.remove('studio-hover'));e.target.classList.add('studio-hover')},true);document.addEventListener('mouseout',e=>e.target.classList.remove('studio-hover'),true);document.addEventListener('click',e=>{if(interactionMode!=='edit'||e.target.closest('[data-studio-ui]'))return;const el=e.target.closest('img,button,a,h1,h2,h3,p,article,section,div,span');if(!el)return;setTimeout(()=>{if(el.isConnected)select(el)},0)})}
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&['z','y'].includes(e.key.toLowerCase())){e.preventDefault();window.parent.postMessage({type:'utiterv-studio-shortcut',key:e.key.toLowerCase(),shift:e.shiftKey},'*')}},true);
window.addEventListener('message',e=>{if(e.data?.type==='utiterv-studio-mode'){interactionMode=e.data.mode==='test'?'test':'edit';document.documentElement.dataset.studioMode=interactionMode;document.querySelectorAll('.studio-selected,.studio-hover').forEach(x=>x.classList.remove('studio-selected','studio-hover'));const st=document.getElementById('studio-inspector-style');if(st)st.disabled=interactionMode!=='edit';if(interactionMode==='edit')sendTree();}if(e.data?.type==='utiterv-studio-refresh'){apply();sendTree()}if(e.data?.type==='utiterv-studio-focus'){try{const el=document.querySelector(e.data.selector);if(el){el.scrollIntoView({behavior:'smooth',block:'center'});select(el)}}catch{}}});
window.addEventListener('storage',apply);window.addEventListener('utiterv-studio-changed',apply);
new MutationObserver(()=>{if(applying)return;apply();clearTimeout(window.__studioTreeTimer);window.__studioTreeTimer=setTimeout(sendTree,300)}).observe(document.documentElement,{childList:true,subtree:true});
apply();setTimeout(sendTree,700);
