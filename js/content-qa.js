import {getProject,saveProject} from './project-content.js';

const $=selector=>document.querySelector(selector);
const clone=value=>JSON.parse(JSON.stringify(value));
const escapeHtml=value=>String(value??'').replace(/[&<>\"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[char]));
const IGNORED_KEY='utiterv-copy-qa-ignored-v1';
let issues=[];
let ignored=new Set(JSON.parse(localStorage.getItem(IGNORED_KEY)||'[]'));

const exactFixes=new Map([
  ['Kérdezhetem, kihez fordulhatna X ügyben?','Kérdezhetem, kihez fordulhatok X ügyben?'],
  ['Lemondja az ebédet – a feladat az első.','Lemondom az ebédet – a feladat az első.'],
  ['Elmegyek az ebédre, és elmondja a kollégáknak, hogy még nem végzett – majd ebéd után folytatom.','Elmegyek az ebédre, és elmondom a kollégáknak, hogy még nem végeztem – majd ebéd után folytatom.'],
  ['A főnök érdeklőjik az igazi tapasztalataidról is.','A főnök érdeklődik a valódi tapasztalataidról is.'],
  ['Nem gondolkodok munka után – az egyensúly fontos.','Nem gondolkodom munka után – az egyensúly fontos.'],
  ['Biztonságosan eltárolom, lehetőleg fejből megjegyzem a fontosabbakat, és lejegyzeteltem a belépési folyamatot.','Biztonságosan eltárolom, lehetőleg megjegyzem a fontosabbakat, és lejegyzem a belépési folyamatot.']
]);

function sourceMap(project){
  const map=new Map();
  for(const module of project.contentTree||[]){
    const nav=(project.navigation||[]).find(item=>item.id===module.id);
    const slug=nav?.slug||module.id;
    for(const section of module.sections||[])for(const key of section.keys||[])map.set(`${module.id}.${key}`,`content/modules/${slug}/${section.file}`);
  }
  map.set('competencies.competencyInfo','content/shared/competencies.json');
  map.set('onmagamData.onmagamData','content/shared/onmagam-data.json');
  return map;
}
function makeId(dataset,path,kind){return `${dataset}|${path.join('.')}|${kind}`}
function add(out,{dataset,path,kind,category,message,current,suggestion=null,source,severity='warning'}){
  const id=makeId(dataset,path,kind);
  out.push({id,dataset,path,kind,category,message,current,suggestion,source,severity,ignored:ignored.has(id)});
}
function normalizedText(text){
  return text
    .replace(/[ \t]{2,}/g,' ')
    .replace(/\s+([,.;:!?])/g,'$1')
    .replace(/([,.;:!?])(?=[A-Za-zÁÉÍÓÖŐÚÜŰáéíóöőúüű])/g,'$1 ')
    .replace(/\n{3,}/g,'\n\n')
    .trim();
}
function inspectString(out,dataset,path,text,source){
  const exact=exactFixes.get(text);
  if(exact)add(out,{dataset,path,kind:'exact',category:'Nyelvhelyesség',message:'Valószínű nyelvtani vagy ragozási hiba.',current:text,suggestion:exact,source,severity:'fixable'});
  const normalized=normalizedText(text);
  if(normalized!==text&&!exact)add(out,{dataset,path,kind:'spacing',category:'Központozás',message:'Felesleges szóköz vagy hiányzó írásjelközi szóköz.',current:text,suggestion:normalized,source,severity:'fixable'});
  const clean=text.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
  const words=clean.split(/\s+/).filter(Boolean);
  if(clean.length>260||words.length>42)add(out,{dataset,path,kind:'long',category:'Olvashatóság',message:`Hosszú szöveg mobilos kártyához (${words.length} szó, ${clean.length} karakter). Érdemes két rövidebb mondatra vagy bekezdésre bontani.`,current:text,source,severity:'warning'});
  if(path.some(part=>/title|label|question|situation|headline/i.test(String(part)))&&clean.length>110)add(out,{dataset,path,kind:'heading-length',category:'UX microcopy',message:`A cím vagy kérdés hosszú (${clean.length} karakter). Mobilon nehezebben pásztázható.`,current:text,source,severity:'warning'});
  const bangs=(text.match(/!/g)||[]).length;
  if(bangs>2)add(out,{dataset,path,kind:'exclamation',category:'Hangnem',message:'Sok felkiáltójel szerepel egyetlen szövegben. A visszafogottabb írásjelhasználat hitelesebb lehet.',current:text,source,severity:'warning'});
  if(/\b(kell|muszáj|kötelező)\b/i.test(clean)&&clean.length>100)add(out,{dataset,path,kind:'directive',category:'Hangnem',message:'A megfogalmazás erősen előíró lehet. Érdemes ellenőrizni, hogy támogató marad-e a hangnem.',current:text,source,severity:'warning'});
}
function walk(out,dataset,value,path,source){
  if(typeof value==='string'){inspectString(out,dataset,path,value,`${source} → ${path.join('.')}`);return}
  if(Array.isArray(value)){value.forEach((item,index)=>walk(out,dataset,item,[...path,index],source));return}
  if(value&&typeof value==='object')Object.entries(value).forEach(([key,item])=>walk(out,dataset,item,[...path,key],source));
}
function runAudit(){
  const project=getProject(),map=sourceMap(project),out=[];
  for(const [moduleId,namespace] of Object.entries(project.modules||{}))for(const [key,value] of Object.entries(namespace||{})){
    const dataset=`${moduleId}.${key}`,source=map.get(dataset)||`project.modules.${dataset}`;
    walk(out,dataset,value,[],source);
  }
  walk(out,'settings',project.settings||{},[],'content/home.json');
  walk(out,'customContent',project.customContent||[],[],'content/custom/topics.json');
  issues=out;
  render();
}
function getAt(root,path){return path.reduce((value,key)=>value?.[key],root)}
function setAt(root,path,value){
  if(!path.length)return value;
  let node=root;
  for(let i=0;i<path.length-1;i++)node=node[path[i]];
  node[path[path.length-1]]=value;
  return root;
}
function datasetRoot(project,dataset){
  if(dataset==='settings')return {value:project.settings,set:value=>project.settings=value};
  if(dataset==='customContent')return {value:project.customContent,set:value=>project.customContent=value};
  const dot=dataset.indexOf('.'),moduleId=dataset.slice(0,dot),key=dataset.slice(dot+1);
  return {value:project.modules[moduleId][key],set:value=>project.modules[moduleId][key]=value};
}
function applyIssue(id){
  const issue=issues.find(item=>item.id===id);if(!issue?.suggestion)return;
  const project=getProject(),root=datasetRoot(project,issue.dataset);
  root.set(setAt(root.value,issue.path,issue.suggestion));
  saveProject();
  window.dispatchEvent(new CustomEvent('utiterv-full-content-changed'));
  runAudit();
}
function openSource(id){
  const issue=issues.find(item=>item.id===id);if(!issue)return;
  if(issue.dataset==='settings'){
    document.querySelector('[data-content-panel="hero"]')?.click();
    document.querySelector('[data-editor-panel="hero"]')?.scrollIntoView({behavior:'smooth',block:'start'});
    return;
  }
  if(issue.dataset==='customContent'){
    document.querySelector('[data-content-panel="topics"]')?.click();
    document.querySelector('[data-editor-panel="topics"]')?.scrollIntoView({behavior:'smooth',block:'start'});
    return;
  }
  document.querySelector('[data-content-panel="built-in"]')?.click();
  const button=document.querySelector(`[data-dataset="${CSS.escape(issue.dataset)}"]`);
  button?.click();
  document.querySelector('[data-editor-panel="built-in"]')?.scrollIntoView({behavior:'smooth',block:'start'});
}
function toggleIgnored(id){
  if(ignored.has(id))ignored.delete(id);else ignored.add(id);
  localStorage.setItem(IGNORED_KEY,JSON.stringify([...ignored]));
  issues.forEach(item=>item.ignored=ignored.has(item.id));
  render();
}
function render(){
  const results=$('#copy-qa-results'),filter=$('#copy-qa-filter')?.value||'all';if(!results)return;
  const visible=issues.filter(item=>filter==='all'?!item.ignored:filter==='ignored'?item.ignored:filter==='fixable'?!item.ignored&&Boolean(item.suggestion):!item.ignored&&!item.suggestion);
  const active=issues.filter(item=>!item.ignored),fixable=active.filter(item=>item.suggestion).length,warnings=active.length-fixable;
  const score=Math.max(0,Math.round(100-(fixable*2.5+warnings*1.1)));
  const scoreNode=$('#copy-qa-score');if(scoreNode){scoreNode.style.setProperty('--score',`${score}%`);scoreNode.querySelector('strong').textContent=score}
  $('#copy-qa-meta').textContent=`${active.length} aktív észrevétel · ${fixable} automatikusan javítható · ${warnings} stílusjavaslat`;
  if(!visible.length){results.innerHTML='<div class="copy-qa-empty">Ebben a szűrésben nincs találat.</div>';return}
  results.innerHTML=visible.map(item=>`<article class="copy-qa-item ${item.suggestion?'is-fixable':'is-warning'} ${item.ignored?'is-ignored':''}"><div class="copy-qa-head"><div><span class="copy-qa-badge">${escapeHtml(item.category)}</span><h3>${escapeHtml(item.message)}</h3><code class="copy-qa-source">${escapeHtml(item.source)}</code></div></div><div class="copy-qa-compare"><div class="copy-qa-text"><b>Jelenlegi</b>${escapeHtml(item.current)}</div>${item.suggestion?`<div class="copy-qa-text is-suggestion"><b>Javaslat</b>${escapeHtml(item.suggestion)}</div>`:'<div class="copy-qa-text"><b>Teendő</b>Kézi nyelvi vagy szerkesztői döntést igényel.</div>'}</div><div class="copy-qa-item-actions">${item.suggestion?`<button data-apply="${escapeHtml(item.id)}" type="button">Javítás elfogadása</button>`:''}<button data-open="${escapeHtml(item.id)}" type="button">Forrás megnyitása</button><button data-ignore="${escapeHtml(item.id)}" type="button">${item.ignored?'Visszaállítás':'Mellőzés'}</button></div></article>`).join('');
}

$('#copy-qa-run')?.addEventListener('click',runAudit);
$('#copy-qa-filter')?.addEventListener('change',render);
$('#copy-qa-results')?.addEventListener('click',event=>{
  const apply=event.target.closest('[data-apply]'),open=event.target.closest('[data-open]'),ignore=event.target.closest('[data-ignore]');
  if(apply)applyIssue(apply.dataset.apply);
  if(open)openSource(open.dataset.open);
  if(ignore)toggleIgnored(ignore.dataset.ignore);
});
window.addEventListener('utiterv-project-changed',()=>{if(issues.length)runAudit()});
setTimeout(runAudit,450);
