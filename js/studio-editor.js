import {getStudio,patchStyle,setAsset,addInsertion,removeInsertion,setText,setClass,setCustomCss,setTheme,resetSelector,resetStudio,resetEverything,exportStudio,importStudio,getMedia,addMedia,removeMedia,undoStudio,redoStudio,getHistoryState,updateElement,addComponent,moveInsertion} from './studio-engine.js';
const $=s=>document.querySelector(s), preview=$('#studio-preview'), tree=$('#studio-tree'), form=$('#studio-style-form');
let selected=null,nodes=[],fieldBaseline={},dirtyFields=new Set();
const currentDevice=()=>$('#studio-style-device')?.value||'base';
const styleFields=['display','flexDirection','flexWrap','alignItems','justifyContent','gap','width','maxWidth','height','minHeight','padding','paddingTop','paddingRight','paddingBottom','paddingLeft','margin','marginTop','marginRight','marginBottom','marginLeft','textAlign','backgroundColor','backgroundImage','color','opacity','borderRadius','boxShadow','fontSize','fontWeight','lineHeight','letterSpacing','animation'];
const computedMap={display:'display',flexDirection:'flexDirection',flexWrap:'flexWrap',alignItems:'alignItems',justifyContent:'justifyContent',gap:'gap',width:'width',maxWidth:'maxWidth',height:'height',minHeight:'minHeight',padding:'padding',paddingTop:'paddingTop',paddingRight:'paddingRight',paddingBottom:'paddingBottom',paddingLeft:'paddingLeft',margin:'margin',marginTop:'marginTop',marginRight:'marginRight',marginBottom:'marginBottom',marginLeft:'marginLeft',textAlign:'textAlign',backgroundColor:'backgroundColor',backgroundImage:'backgroundImage',color:'color',opacity:'opacity',borderRadius:'borderRadius',boxShadow:'boxShadow',fontSize:'fontSize',fontWeight:'fontWeight',lineHeight:'lineHeight',letterSpacing:'letterSpacing',animation:'animation'};

// Beta 2.2.1: same-origin direct inspector fallback.
// This keeps selection working even when the preview runtime's postMessage
// handshake is delayed or blocked by a browser extension/cache.
function cssEscape(value){
  if(window.CSS?.escape)return CSS.escape(String(value));
  return String(value).replace(/[^a-zA-Z0-9_-]/g,ch=>`\${ch}`);
}
function selectorForPreview(el){
  if(el.dataset?.studioInsertId)return `[data-studio-insert-id="${cssEscape(el.dataset.studioInsertId)}"]`;
  if(el.id)return `#${cssEscape(el.id)}`;
  const path=[];
  let n=el;
  while(n&&n!==n.ownerDocument.body&&path.length<6){
    let part=n.tagName.toLowerCase();
    const useful=[...n.classList]
      .filter(c=>!c.startsWith('is-')&&!c.startsWith('studio-'))
      .slice(0,2);
    if(useful.length){
      part+='.'+useful.map(cssEscape).join('.');
    }else if(n.parentElement){
      const same=[...n.parentElement.children].filter(x=>x.tagName===n.tagName);
      if(same.length>1)part+=`:nth-of-type(${same.indexOf(n)+1})`;
    }
    path.unshift(part);
    n=n.parentElement;
  }
  return path.join(' > ');
}
function previewLabel(el){
  return (el.getAttribute('aria-label')||el.getAttribute('alt')||el.textContent||el.tagName)
    .trim().replace(/\s+/g,' ').slice(0,55);
}
function previewInfo(el){
  const r=el.getBoundingClientRect();
  return {selector:selectorForPreview(el),tag:el.tagName.toLowerCase(),label:previewLabel(el),text:el.textContent?.trim()||'',rect:{width:Math.round(r.width),height:Math.round(r.height)}};
}
function rebuildDirectTree(doc){
  nodes=[...doc.querySelectorAll('#app header, #view > *, #view section, #view article, #view button, #view img, #view h1, #view h2, #view h3, #view p')]
    .slice(0,300)
    .map(el=>{const info=previewInfo(el);return {...info,depth:Math.min(5,info.selector.split(' > ').length-1)}});
  renderTree($('#studio-tree-search').value);
}
function directSelect(el){
  const doc=el.ownerDocument;
  doc.querySelectorAll('.studio-selected').forEach(x=>x.classList.remove('studio-selected'));
  el.classList.add('studio-selected');
  loadProperties(previewInfo(el));
}
function bindDirectInspector(){
  let doc;
  try{doc=preview.contentDocument||preview.contentWindow.document}catch{return}
  if(!doc||doc.__utitervStudioBound)return;
  doc.__utitervStudioBound=true;
  let style=doc.getElementById('utiterv-studio-direct-inspector');
  if(!style){
    style=doc.createElement('style');
    style.id='utiterv-studio-direct-inspector';
    style.textContent='.studio-selected{outline:3px solid #14e8c9!important;outline-offset:3px!important}.studio-hover{outline:2px dashed #14e8c9!important;outline-offset:2px!important;cursor:crosshair!important}';
    doc.head.append(style);
  }
  doc.addEventListener('pointerover',e=>{
    if(e.target.closest?.('#splash'))return;
    doc.querySelectorAll('.studio-hover').forEach(x=>x.classList.remove('studio-hover'));
    e.target.classList?.add('studio-hover');
  },true);
  doc.addEventListener('pointerout',e=>e.target.classList?.remove('studio-hover'),true);
  doc.addEventListener('click',e=>{
    const el=e.target.closest?.('img,button,a,h1,h2,h3,p,article,section,div,span');
    if(!el||el.closest('#splash'))return;
    // Az alkalmazás saját kattintáskezelője fusson le előbb.
    // A Studio csak utána, aszinkron jelöli ki a még létező elemet.
    setTimeout(()=>{if(el.isConnected)directSelect(el)},0);
  });
  rebuildDirectTree(doc);
  const view=doc.querySelector('#view');
  if(view)new MutationObserver(()=>{clearTimeout(preview.__studioDirectTimer);preview.__studioDirectTimer=setTimeout(()=>rebuildDirectTree(doc),180)}).observe(view,{childList:true,subtree:true});
  $('#studio-selected-label').textContent='Kattints egy elemre az előnézetben';
}
preview.addEventListener('load',()=>setTimeout(bindDirectInspector,250));
function refresh(){
  preview.contentWindow?.postMessage({type:'utiterv-studio-refresh'},'*');
  try{preview.contentWindow?.dispatchEvent(new CustomEvent('utiterv-studio-changed'))}catch{}
  setTimeout(()=>{bindDirectInspector();try{rebuildDirectTree(preview.contentDocument)}catch{}},80)
}
function esc(s){return String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]))}
function renderTree(q=''){const f=q.toLowerCase().trim();tree.innerHTML=nodes.filter(n=>!f||`${n.label} ${n.tag}`.toLowerCase().includes(f)).map(n=>`<button type="button" data-selector="${esc(n.selector)}" class="${selected?.selector===n.selector?'is-active':''}" style="padding-left:${8+n.depth*12}px"><span>${n.tag}</span>${esc(n.label||n.selector)}</button>`).join('')||'<p class="empty-state">Nincs találat.</p>'}

function currentPreviewElement(selector){try{return preview.contentDocument?.querySelector(selector)||null}catch{return null}}
function computedValues(selector){const el=currentPreviewElement(selector);if(!el)return {};const cs=preview.contentWindow.getComputedStyle(el),out={};for(const [field,prop] of Object.entries(computedMap)){let v=cs[prop]||'';if(field==='backgroundImage'&&v==='none')v='';if(field==='boxShadow'&&v==='none')v='none';if(field==='animation'&&v==='none 0s ease 0s 1 normal none running')v='';out[field]=v}const r=el.getBoundingClientRect();out.__rect={width:Math.round(r.width),height:Math.round(r.height)};out.__parents=[];let n=el;while(n&&n!==el.ownerDocument.body&&out.__parents.length<6){out.__parents.unshift({selector:selectorForPreview(n),tag:n.tagName.toLowerCase(),label:previewLabel(n)});n=n.parentElement}return out}
function setFieldValue(field,value){const input=form.elements[field];if(!input)return;if(input.type==='color'){const m=String(value||'').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);if(m)value='#'+[m[1],m[2],m[3]].map(x=>(+x).toString(16).padStart(2,'0')).join('');if(!/^#[0-9a-f]{6}$/i.test(value))return}if(input.tagName==='SELECT'&&value&&![...input.options].some(o=>o.value===value)){const o=document.createElement('option');o.value=value;o.textContent=`Aktuális: ${value}`;input.prepend(o)}input.value=value??''}
function renderBreadcrumb(items=[]){const host=$('#studio-breadcrumb');if(!host)return;host.innerHTML=items.map((x,i)=>`<button type="button" data-crumb-selector="${esc(x.selector)}">${esc(x.tag)}${x.label?' · '+esc(x.label.slice(0,18)):''}</button>${i<items.length-1?'<span>›</span>':''}`).join('')}

function loadProperties(info){
 selected=info;dirtyFields.clear();
 $('#studio-empty-properties').hidden=true;form.hidden=false;
 $('#studio-element-title').textContent=info.label||info.tag;$('#studio-selector').textContent=info.selector;
 const computed=computedValues(info.selector),rect=computed.__rect||info.rect||{};
 $('#studio-selected-label').textContent=`${info.tag} · ${info.label||''} · ${rect.width||'?'}×${rect.height||'?'} px`;
 const d=getStudio(),device=currentDevice(),st=device==='base'?(d.styles[info.selector]||{}):(d.responsiveStyles?.[device]?.[info.selector]||{});
 form.reset();fieldBaseline={};
 styleFields.forEach(k=>{const v=st[k]!=null?st[k]:(computed[k]??'');setFieldValue(k,v);fieldBaseline[k]=form.elements[k]?.value??''});
 $('#studio-custom-class').value=d.classes?.[info.selector]||'';fieldBaseline.__class=$('#studio-custom-class').value;
 const textValue=d.texts?.[info.selector]??info.text??'';$('#studio-text-content').value=textValue;fieldBaseline.__text=textValue;
 const isText=!['img','svg','video','audio','canvas','input','textarea','select'].includes(info.tag);$('#studio-text-content').disabled=!isText;
 $('#studio-content-panel').open=true;$('#studio-direct-image-label').hidden=info.tag!=='img';$('#studio-direct-image-help').hidden=info.tag!=='img';
 const a=d.assets?.[info.selector];$('#studio-current-asset').textContent=a?`Hozzárendelve: ${a.name||'grafika'} (${a.mode})`:'Nincs grafika hozzárendelve.';if(a){$('#studio-asset-mode').value=a.mode||'background';$('#studio-asset-size').value=a.size||'contain'}
 renderBreadcrumb(computed.__parents||[]);renderTree($('#studio-tree-search').value)
}
window.addEventListener('message',e=>{if(e.data?.type==='utiterv-studio-shortcut'){const ok=e.data.key==='y'||(e.data.key==='z'&&e.data.shift)?redoStudio():undoStudio();if(ok){refresh();if(selected)loadProperties(selected)}updateHistoryButtons()}if(e.data?.type==='utiterv-studio-tree'){nodes=e.data.nodes||[];renderTree($('#studio-tree-search').value)}if(e.data?.type==='utiterv-studio-select')loadProperties(e.data);if(e.data?.type==='utiterv-studio-reorder'){moveInsertion(e.data.id,{targetSelector:e.data.parentSelector,position:'child-index',childIndex:Number(e.data.index)||0});refresh();setTimeout(()=>preview.contentWindow.postMessage({type:'utiterv-studio-focus',selector:`[data-studio-insert-id=\"${e.data.id}\"]`},'*'),120);$('#studio-selected-label').textContent='Elem áthelyezve a konténeren belül.'}});
tree.addEventListener('click',e=>{const b=e.target.closest('[data-selector]');if(!b)return;preview.contentWindow.postMessage({type:'utiterv-studio-focus',selector:b.dataset.selector},'*');try{const el=preview.contentDocument.querySelector(b.dataset.selector);if(el){el.scrollIntoView({behavior:'smooth',block:'center'});directSelect(el)}}catch{}});
$('#studio-tree-search').addEventListener('input',e=>renderTree(e.target.value));$('#studio-reload-tree').addEventListener('click',refresh);
$('#studio-breadcrumb')?.addEventListener('click',e=>{const b=e.target.closest('[data-crumb-selector]');if(!b)return;const el=currentPreviewElement(b.dataset.crumbSelector);if(el){el.scrollIntoView({behavior:'smooth',block:'center'});directSelect(el)}});
document.querySelectorAll('[data-auto-layout]').forEach(b=>b.addEventListener('click',()=>{if(!selected)return;const mode=b.dataset.autoLayout,patch=mode==='row'?{display:'flex',flexDirection:'row',alignItems:'center',gap:'16px'}:mode==='column'?{display:'flex',flexDirection:'column',alignItems:'stretch',gap:'16px'}:{display:'grid',gap:'16px'};Object.entries(patch).forEach(([k,v])=>{setFieldValue(k,v);dirtyFields.add(k)});saveSelectedLive()}));

$('#studio-gradient-preset').addEventListener('change',e=>{form.elements.backgroundImage.value=e.target.value;dirtyFields.add('backgroundImage');saveSelectedLive()});
let liveSaveTimer;
function saveSelectedLive(){
 if(!selected)return;clearTimeout(liveSaveTimer);
 liveSaveTimer=setTimeout(()=>{
  const patch={};dirtyFields.forEach(k=>{if(styleFields.includes(k))patch[k]=form.elements[k]?.value||''});
  const textField=$('#studio-text-content');
  const text=dirtyFields.has('__text')&&!textField.disabled?textField.value:undefined;
  const className=dirtyFields.has('__class')?$('#studio-custom-class').value.trim():undefined;
  if(!Object.keys(patch).length&&text===undefined&&className===undefined)return;
  updateElement(selected.selector,{style:patch,text,className},currentDevice());dirtyFields.clear();refresh();
  setTimeout(()=>selected&&loadProperties({...selected,text:textField.value}),140);
  $('#studio-selected-label').textContent='Élő előnézet frissítve.';
 },220)
}
form.addEventListener('input',e=>{const n=e.target.name;if(n)dirtyFields.add(n);if(e.target.id==='studio-text-content')dirtyFields.add('__text');if(e.target.id==='studio-custom-class')dirtyFields.add('__class');saveSelectedLive()});
form.addEventListener('change',e=>{const n=e.target.name;if(n)dirtyFields.add(n);saveSelectedLive()});
form.addEventListener('submit',e=>{e.preventDefault();styleFields.forEach(k=>{if(form.elements[k]?.value!==fieldBaseline[k])dirtyFields.add(k)});if($('#studio-text-content').value!==fieldBaseline.__text)dirtyFields.add('__text');if($('#studio-custom-class').value!==fieldBaseline.__class)dirtyFields.add('__class');saveSelectedLive()});
$('#studio-reset-element').addEventListener('click',()=>{if(selected&&confirm('Visszaállítod ezt az elemet?')){resetSelector(selected.selector);refresh();loadProperties(selected)}});
$('#studio-remove-asset').addEventListener('click',()=>{if(!selected)return;const match=selected.selector.match(/data-studio-insert-id=\"([^\"]+)/);if(match)removeInsertion(match[1]);else setAsset(selected.selector,null);refresh();setTimeout(()=>{selected=null;form.hidden=true;$('#studio-empty-properties').hidden=false},100)});
function renderMedia(){const media=getMedia();$('#studio-media').innerHTML=media.map(m=>`<div class="studio-media-item" title="${esc(m.name)}"><img src="${m.src}" alt=""><button type="button" data-use-media="${m.id}" aria-label="Használat"></button><button type="button" class="delete-media" data-delete-media="${m.id}" aria-label="Törlés">×</button></div>`).join('')||'<p class="empty-state">Még nincs feltöltött grafika.</p>'}
$('#studio-media-upload').addEventListener('change',async e=>{for(const file of e.target.files){if(file.size>900000){alert(`${file.name}: a fájl túl nagy. Legfeljebb 900 KB ajánlott.`);continue}const src=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)});try{addMedia({id:`media-${Date.now()}-${Math.random().toString(36).slice(2)}`,name:file.name,type:file.type,src})}catch{alert('A böngésző helyi tárhelye megtelt. Exportáld vagy töröld a régi grafikákat.')}}renderMedia();e.target.value=''});
$('#studio-media').addEventListener('click',e=>{const del=e.target.closest('[data-delete-media]'),use=e.target.closest('[data-use-media]');if(del){removeMedia(del.dataset.deleteMedia);renderMedia();return}if(use){if(!selected){alert('Előbb válassz ki egy elemet az előnézetben.');return}const m=getMedia().find(x=>x.id===use.dataset.useMedia);const mode=$('#studio-asset-mode').value;if(mode==='insert'){addInsertion({targetSelector:selected.selector,src:m.src,name:m.name,alt:$('#studio-asset-alt').value.trim(),position:$('#studio-insert-position').value});$('#studio-selected-label').textContent='Új kép beszúrva.'}else{setAsset(selected.selector,{src:m.src,name:m.name,mode,size:$('#studio-asset-size').value,position:'center'})}refresh();loadProperties(selected)}});
function loadGlobal(){const d=getStudio();$('#theme-primary').value=d.theme.primary;$('#theme-accent').value=d.theme.accent;$('#theme-text').value=d.theme.text;$('#theme-surface').value=d.theme.surface;$('#studio-custom-css').value=d.customCss||''}

$('#studio-reset-all')?.addEventListener('click',()=>{
 if(!confirm('Biztosan törlöd az összes Studio-, tartalom-, média- és stílusmódosítást? Ez visszaállítja az eredeti alkalmazást.'))return;
 resetEverything();
 alert('Minden módosítás törölve. Az eredeti alkalmazás töltődik vissza.');
 location.reload();
});

$('#studio-save-global').addEventListener('click',()=>{setTheme({primary:$('#theme-primary').value,accent:$('#theme-accent').value,text:$('#theme-text').value,surface:$('#theme-surface').value});setCustomCss($('#studio-custom-css').value);refresh()});
$('#studio-export').addEventListener('click',()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([exportStudio()],{type:'application/json'}));a.download='utiterv-studio-design.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)});
$('#studio-import').addEventListener('change',async e=>{try{importStudio(await e.target.files[0].text());loadGlobal();renderMedia();refresh();alert('A Studio-beállítások importálva.')}catch(err){alert(err.message)}});

function updateHistoryButtons(){const h=getHistoryState(),u=$('#studio-undo'),r=$('#studio-redo');if(u){u.disabled=!h.canUndo;u.querySelector('span')&&(u.querySelector('span').textContent=h.undoCount?` (${h.undoCount})`:'')}if(r){r.disabled=!h.canRedo;r.querySelector('span')&&(r.querySelector('span').textContent=h.redoCount?` (${h.redoCount})`:'')}}
function runUndo(){if(undoStudio()){refresh();if(selected)loadProperties(selected)}updateHistoryButtons()}
function runRedo(){if(redoStudio()){refresh();if(selected)loadProperties(selected)}updateHistoryButtons()}
$('#studio-undo')?.addEventListener('click',runUndo);
$('#studio-redo')?.addEventListener('click',runRedo);
$('#studio-style-device')?.addEventListener('change',()=>{if(selected)loadProperties(selected)});
document.addEventListener('keydown',e=>{if(!(e.ctrlKey||e.metaKey))return;const key=e.key.toLowerCase();if(key==='z'){e.preventDefault();e.shiftKey?runRedo():runUndo()}else if(key==='y'){e.preventDefault();runRedo()}},true);
window.addEventListener('utiterv-studio-history-changed',updateHistoryButtons);
window.addEventListener('utiterv-studio-changed',updateHistoryButtons);
updateHistoryButtons();

document.querySelector('.studio-component-grid')?.addEventListener('click',e=>{
 const b=e.target.closest('[data-component]');if(!b)return;if(!selected){alert('Előbb válassz ki egy befogadó elemet.');return}
 const type=b.dataset.component;const tags={heading:'h2',text:'p',button:'button',card:'article',spacer:'div'};
 const position=$('#studio-component-position').value;const id=`insert-${Date.now()}-${Math.random().toString(36).slice(2)}`;
 addComponent({id,targetSelector:selected.selector,position,componentType:type,tag:tags[type],text:{heading:'Új címsor',text:'',button:'',card:'Új kártya'}[type]??''});
 refresh();$('#studio-selected-label').textContent=position==='append'?'Új elem a kijelölt konténerben – húzd a kívánt helyre.':'Új komponens beszúrva.';
 setTimeout(()=>preview.contentWindow.postMessage({type:'utiterv-studio-focus',selector:`[data-studio-insert-id=\"${id}\"]`},'*'),160);
});

$('#studio-build-export')?.addEventListener('click',()=>{
 const d=getStudio();const cssText=preview.contentDocument?.getElementById('utiterv-studio-style')?.textContent||'';
 const manifest={type:'utiterv-studio-build',version:'2.5',createdAt:new Date().toISOString(),instructions:'Másold a studio-overrides.css fájlt a projekt css mappájába, és linkeld az app.css után. Az assets mező data URL-jeit a mellékelt tools/build_project.py képes fájlokká alakítani.',studio:d,media:getMedia(),css:cssText};
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(manifest,null,2)],{type:'application/json'}));a.download='utiterv-studio-build.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
});

document.querySelectorAll('[data-device]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-device]').forEach(x=>x.classList.toggle('is-active',x===b));preview.style.width=`${b.dataset.device}px`}));
document.querySelector('[data-editor-tab="studio"]')?.addEventListener('click',()=>setTimeout(refresh,100));
loadGlobal();renderMedia();setTimeout(()=>{refresh();bindDirectInspector()},800);

async function fileToDataUrl(file){return await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file)})}
$('#studio-direct-image')?.addEventListener('change',async e=>{
 const file=e.target.files?.[0];
 if(!file||!selected)return;
 if(file.size>1500000){alert('A fájl túl nagy. Legfeljebb 1,5 MB ajánlott.');e.target.value='';return}
 const src=await fileToDataUrl(file);
 const media={id:`media-${Date.now()}-${Math.random().toString(36).slice(2)}`,name:file.name,type:file.type,src};
 try{addMedia(media)}catch{alert('A böngésző helyi tárhelye megtelt.');e.target.value='';return}
 setAsset(selected.selector,{src,name:file.name,mode:'image',size:'contain',position:'center'});
 renderMedia();refresh();loadProperties(selected);e.target.value='';
});

// Beta 2.4: önálló, hibabiztos felső navigáció.
function activateEditorTab(name){
 document.querySelectorAll('[data-editor-tab]').forEach(button=>button.classList.toggle('is-active',button.dataset.editorTab===name));
 document.querySelectorAll('[data-editor-panel]').forEach(panel=>{panel.hidden=panel.dataset.editorPanel!==name});
 if(name==='studio')setTimeout(refresh,80);
 if(name==='preview'){const appPreview=document.querySelector('#app-preview');if(appPreview)appPreview.src=`index.html?preview=${Date.now()}`}
}
document.querySelector('.editor-tabs')?.addEventListener('click',event=>{const button=event.target.closest('[data-editor-tab]');if(!button)return;event.preventDefault();activateEditorTab(button.dataset.editorTab)});

const saveState=document.querySelector('#studio-save-state');let saveStateTimer;function markDirty(){if(!saveState)return;saveState.textContent='Mentés…';saveState.classList.add('is-dirty');clearTimeout(saveStateTimer);saveStateTimer=setTimeout(()=>{saveState.textContent='Mentve';saveState.classList.remove('is-dirty')},500)}
window.addEventListener('utiterv-studio-changed',markDirty);
document.querySelectorAll('[data-studio-mode]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('[data-studio-mode]').forEach(x=>x.classList.toggle('is-active',x===btn));const mode=btn.dataset.studioMode;preview.contentWindow.postMessage({type:'utiterv-studio-mode',mode},'*');document.querySelector('.studio-properties').classList.toggle('is-disabled',mode==='test');$('#studio-selected-label').textContent=mode==='test'?'Kipróbálás mód – az app interakciói aktívak':'Szerkesztés mód – kattints egy elemre';}));

window.addEventListener('utiterv-editor-tab-changed',event=>{if(event.detail?.tab==='studio')setTimeout(refresh,100)});
