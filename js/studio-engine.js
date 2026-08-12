const KEY='utiterv_studio_v1';
const MEDIA_KEY='utiterv_studio_media_v1';
const defaults={styles:{},responsiveStyles:{mobile:{},tablet:{},desktop:{}},assets:{},insertions:[],deletedSelectors:[],texts:{},classes:{},customCss:'',theme:{primary:'#007fff',accent:'#14e8c9',text:'#050505',surface:'#ffffff'},version:1};
const clone=x=>JSON.parse(JSON.stringify(x));
export function getStudio(){try{const saved=JSON.parse(localStorage.getItem(KEY)||'{}');const data={...clone(defaults),...saved,theme:{...clone(defaults.theme),...(saved.theme||{})}};if(['#14e8c9','#14e8c9'].includes(String(data.theme.accent).toLowerCase()))data.theme.accent='#14e8c9';if(String(data.theme.primary).toLowerCase()==='#14e8c9')data.theme.primary='#007fff';if(String(data.theme.text).toLowerCase()==='#172126')data.theme.text='#050505';data.insertions=data.insertions||[];data.deletedSelectors=data.deletedSelectors||[];return data}catch{return clone(defaults)}}
const HISTORY_KEY='utiterv_studio_history_v1';
function readHistory(){try{return JSON.parse(sessionStorage.getItem(HISTORY_KEY)||'{\"undo\":[],\"redo\":[]}')}catch{return {undo:[],redo:[]}}}
function baselineSnapshot(){return JSON.stringify(clone(defaults))}
function currentSnapshot(){return localStorage.getItem(KEY)||baselineSnapshot()}
function writeHistory(h){sessionStorage.setItem(HISTORY_KEY,JSON.stringify({undo:(h.undo||[]).slice(-50),redo:(h.redo||[]).slice(-50)}));window.dispatchEvent(new CustomEvent('utiterv-studio-history-changed'))}
function pushHistory(){const current=currentSnapshot();const h=readHistory();if(h.undo[h.undo.length-1]!==current)h.undo.push(current);h.redo=[];writeHistory(h)}
export function saveStudio(data,options={}){if(!options.skipHistory)pushHistory();localStorage.setItem(KEY,JSON.stringify({...data,version:2}));window.dispatchEvent(new CustomEvent('utiterv-studio-changed'));return data}
export function patchStyle(selector,patch,device='base'){
 if(device!=='base'){const d=getStudio();d.responsiveStyles=d.responsiveStyles||{mobile:{},tablet:{},desktop:{}};const bucket=d.responsiveStyles[device]||(d.responsiveStyles[device]={});bucket[selector]={...(bucket[selector]||{}),...patch};Object.keys(bucket[selector]).forEach(k=>{if(bucket[selector][k]===''||bucket[selector][k]==null)delete bucket[selector][k]});if(!Object.keys(bucket[selector]).length)delete bucket[selector];return saveStudio(d)}const d=getStudio();d.styles[selector]={...(d.styles[selector]||{}),...patch};Object.keys(d.styles[selector]).forEach(k=>{if(d.styles[selector][k]===''||d.styles[selector][k]==null)delete d.styles[selector][k]});if(!Object.keys(d.styles[selector]).length)delete d.styles[selector];return saveStudio(d)}
export function setAsset(selector,asset){const d=getStudio();if(asset)d.assets[selector]=asset;else delete d.assets[selector];delete d.classes[selector];return saveStudio(d)}

export function addInsertion(insertion){const d=getStudio();d.insertions=d.insertions||[];d.insertions.push({...insertion,id:insertion.id||`insert-${Date.now()}-${Math.random().toString(36).slice(2)}`});return saveStudio(d)}
export function removeInsertion(id){const d=getStudio();d.insertions=(d.insertions||[]).filter(x=>x.id!==id);return saveStudio(d)}
export function deleteElement(selector){const d=getStudio();d.deletedSelectors=d.deletedSelectors||[];if(!d.deletedSelectors.includes(selector))d.deletedSelectors.push(selector);delete d.styles[selector];delete d.assets[selector];delete d.texts[selector];delete d.classes[selector];for(const bucket of Object.values(d.responsiveStyles||{}))delete bucket?.[selector];return saveStudio(d)}
export function moveInsertion(id,patch={}){const d=getStudio();d.insertions=d.insertions||[];const item=d.insertions.find(x=>x.id===id);if(!item)return d;Object.assign(item,patch);return saveStudio(d)}
export function setText(selector,text){const d=getStudio();if(text!=null)d.texts[selector]=text;else delete d.texts[selector];return saveStudio(d)}
export function setClass(selector,className){const d=getStudio();if(className)d.classes[selector]=className;else delete d.classes[selector];return saveStudio(d)}
export function setCustomCss(css){const d=getStudio();d.customCss=css;return saveStudio(d)}
export function setTheme(theme){const d=getStudio();d.theme={...d.theme,...theme};return saveStudio(d)}
export function resetSelector(selector){const d=getStudio();delete d.styles[selector];delete d.assets[selector];delete d.texts[selector];delete d.classes[selector];return saveStudio(d)}
export function resetStudio(){localStorage.removeItem(KEY);localStorage.removeItem(MEDIA_KEY);sessionStorage.removeItem(HISTORY_KEY);window.dispatchEvent(new CustomEvent('utiterv-studio-changed'))}
export function resetEverything(){['utiterv_studio_v1','utiterv_studio_media_v1','utiterv-full-content-v1','utiterv-project-v4','utiterv-custom-content-v2','utiterv-custom-content-v1','utiterv-content-settings-v1'].forEach(k=>localStorage.removeItem(k));sessionStorage.removeItem(HISTORY_KEY);window.dispatchEvent(new CustomEvent('utiterv-studio-changed'));window.dispatchEvent(new CustomEvent('utiterv-content-changed'));}
export function exportStudio(){return JSON.stringify({type:'utiterv-studio',exportedAt:new Date().toISOString(),studio:getStudio(),media:getMedia()},null,2)}
export function importStudio(text){const p=JSON.parse(text);if(p.type!=='utiterv-studio'||!p.studio)throw new Error('Nem Útiterv Studio exportfájl.');localStorage.setItem(KEY,JSON.stringify(p.studio));localStorage.setItem(MEDIA_KEY,JSON.stringify(p.media||[]));window.dispatchEvent(new CustomEvent('utiterv-studio-changed'));return true}
export function getMedia(){try{return JSON.parse(localStorage.getItem(MEDIA_KEY)||'[]')}catch{return []}}
export function addMedia(item){const list=getMedia();list.unshift(item);localStorage.setItem(MEDIA_KEY,JSON.stringify(list));return list}
export function removeMedia(id){const list=getMedia().filter(x=>x.id!==id);localStorage.setItem(MEDIA_KEY,JSON.stringify(list));return list}

export function getHistoryState(){const h=readHistory();return {canUndo:h.undo.length>0,canRedo:h.redo.length>0,undoCount:h.undo.length,redoCount:h.redo.length}}
export function undoStudio(){try{const h=readHistory();const prev=h.undo.pop();if(!prev)return false;h.redo.push(currentSnapshot());localStorage.setItem(KEY,prev);writeHistory(h);window.dispatchEvent(new CustomEvent('utiterv-studio-changed'));return true}catch{return false}}
export function redoStudio(){try{const h=readHistory();const next=h.redo.pop();if(!next)return false;h.undo.push(currentSnapshot());localStorage.setItem(KEY,next);writeHistory(h);window.dispatchEvent(new CustomEvent('utiterv-studio-changed'));return true}catch{return false}}
export function addComponent(item){return addInsertion({...item,kind:item.kind||'component'})}

export function updateElement(selector,{style={},text,className}={},device='base'){
 const d=getStudio();
 if(device!=='base'){
  d.responsiveStyles=d.responsiveStyles||{mobile:{},tablet:{},desktop:{}};
  const bucket=d.responsiveStyles[device]||(d.responsiveStyles[device]={});
  bucket[selector]={...(bucket[selector]||{}),...style};
  Object.keys(bucket[selector]).forEach(k=>{if(bucket[selector][k]===''||bucket[selector][k]==null)delete bucket[selector][k]});
  if(!Object.keys(bucket[selector]).length)delete bucket[selector];
 }else{
  d.styles[selector]={...(d.styles[selector]||{}),...style};
  Object.keys(d.styles[selector]).forEach(k=>{if(d.styles[selector][k]===''||d.styles[selector][k]==null)delete d.styles[selector][k]});
  if(!Object.keys(d.styles[selector]).length)delete d.styles[selector];
 }
 if(text!==undefined){if(text!==null)d.texts[selector]=text;else delete d.texts[selector]}
 if(className!==undefined){if(className)d.classes[selector]=className;else delete d.classes[selector]}
 return saveStudio(d)
}

