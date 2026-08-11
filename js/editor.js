import {getCustomContent,upsertCustomContent,deleteCustomContent,moveCustomContent,duplicateCustomContent,exportCustomContent,importCustomContent,contentTypeLabels,getContentSettings,saveContentSettings,defaultSettings} from './content-engine.js';
const form=document.querySelector('#content-form'),itemsEditor=document.querySelector('#items-editor'),typeSelect=form.elements.type,list=document.querySelector('#content-list');
const heroForm=document.querySelector('#hero-form'),heroStatus=document.querySelector('#hero-status'),preview=document.querySelector('#app-preview');
const help={story:'Egy elem jelenik meg egyszerre, Előző/Következő lapozással.',accordion:'Minden cím látható; érintésre lenyílik a magyarázat.',flip:'A kártya eleje és hátulja érintésre vált.',quiz:'Minden válasz felfedezhető, és saját magyarázatot kap.'};
const templates={story:{title:'Új oldal',body:''},accordion:{title:'Új pont',body:''},flip:{title:'Új kártya',frontLabel:'Első oldal',front:'',backLabel:'Másik oldal',back:''},quiz:{question:'Új helyzet',answers:[{text:'Első válasz',feedback:'',optimal:true},{text:'Második válasz',feedback:'',optimal:false}]}};
let draftItems=[];
const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
function showStatus(message){heroStatus.textContent=message;setTimeout(()=>heroStatus.textContent='',2200)}
function loadHero(){const s=getContentSettings();Object.entries(s).forEach(([k,v])=>{if(heroForm.elements[k])heroForm.elements[k].value=v})}
function refreshPreview(){preview.src=`index.html?preview=${Date.now()}`}
function renderItems(){const type=typeSelect.value;document.querySelector('#type-help').textContent=help[type];itemsEditor.innerHTML=draftItems.map((x,i)=>{if(type==='story'||type==='accordion')return `<article class="editor-item"><div class="editor-item__head"><strong>${i+1}. elem</strong><button type="button" class="remove-item" data-remove="${i}">×</button></div><label>Cím<input data-field="title" data-index="${i}" value="${esc(x.title)}"></label><label>Szöveg<textarea data-field="body" data-index="${i}" rows="4">${esc(x.body)}</textarea></label></article>`;if(type==='flip')return `<article class="editor-item"><div class="editor-item__head"><strong>${i+1}. flip kártya</strong><button type="button" class="remove-item" data-remove="${i}">×</button></div><label>Cím<input data-field="title" data-index="${i}" value="${esc(x.title)}"></label><div class="field-grid"><label>Első oldal címkéje<input data-field="frontLabel" data-index="${i}" value="${esc(x.frontLabel)}"></label><label>Másik oldal címkéje<input data-field="backLabel" data-index="${i}" value="${esc(x.backLabel)}"></label></div><div class="field-grid"><label>Első oldal<textarea data-field="front" data-index="${i}" rows="4">${esc(x.front)}</textarea></label><label>Másik oldal<textarea data-field="back" data-index="${i}" rows="4">${esc(x.back)}</textarea></label></div></article>`;return `<article class="editor-item"><div class="editor-item__head"><strong>${i+1}. kérdés</strong><button type="button" class="remove-item" data-remove="${i}">×</button></div><label>Helyzet / kérdés<textarea data-field="question" data-index="${i}" rows="2">${esc(x.question)}</textarea></label>${x.answers.map((a,j)=>`<div class="answer-row"><div><label>Válasz ${j+1}<input data-answer-field="text" data-index="${i}" data-answer="${j}" value="${esc(a.text)}"></label><label>Magyarázat<textarea data-answer-field="feedback" data-index="${i}" data-answer="${j}" rows="2">${esc(a.feedback)}</textarea></label></div><label><input type="radio" name="optimal-${i}" data-optimal data-index="${i}" data-answer="${j}" ${a.optimal?'checked':''}> Legjobb irány</label></div>`).join('')}<button type="button" class="button button--secondary" data-add-answer="${i}">+ Válasz</button></article>`}).join('')||'<p class="empty-state">Adj hozzá legalább egy elemet.</p>'}
function reset(type=typeSelect.value){form.reset();typeSelect.value=type;form.elements.id.value='';draftItems=[structuredClone(templates[type])];renderItems()}
function renderList(){const items=getCustomContent();list.innerHTML=items.length?items.map((x,i)=>`<article class="editor-list-item"><div><strong>${esc(x.title)}</strong><span>${contentTypeLabels[x.type]} · ${x.items.length} elem</span></div><div class="editor-list-item__actions"><button data-move="-1" data-id="${x.id}" title="Feljebb" ${i===0?'disabled':''}>↑</button><button data-move="1" data-id="${x.id}" title="Lejjebb" ${i===items.length-1?'disabled':''}>↓</button><button data-copy="${x.id}" title="Másolás">⧉</button><button data-edit="${x.id}" title="Szerkesztés">✎</button><button data-delete="${x.id}" title="Törlés">🗑</button></div></article>`).join(''):'<p class="empty-state">Még nincs saját tartalom.</p>'}
// A felső tabokat az editor.html azonnali, tartalombetöltéstől független vezérlője kezeli.
heroForm.addEventListener('submit',e=>{e.preventDefault();saveContentSettings(Object.fromEntries(new FormData(heroForm)));showStatus('A hero elmentve.');refreshPreview()});
document.querySelector('#reset-hero').addEventListener('click',()=>{saveContentSettings(defaultSettings);loadHero();showStatus('Az alapértékek visszaállítva.');refreshPreview()});
typeSelect.addEventListener('change',()=>{draftItems=[structuredClone(templates[typeSelect.value])];renderItems()});
document.querySelector('#add-item').addEventListener('click',()=>{draftItems.push(structuredClone(templates[typeSelect.value]));renderItems()});
itemsEditor.addEventListener('input',e=>{const i=Number(e.target.dataset.index);if(e.target.dataset.field)draftItems[i][e.target.dataset.field]=e.target.value;if(e.target.dataset.answerField){const j=Number(e.target.dataset.answer);draftItems[i].answers[j][e.target.dataset.answerField]=e.target.value}});
itemsEditor.addEventListener('change',e=>{if(e.target.hasAttribute('data-optimal')){const i=Number(e.target.dataset.index),j=Number(e.target.dataset.answer);draftItems[i].answers.forEach((a,n)=>a.optimal=n===j)}});
itemsEditor.addEventListener('click',e=>{const remove=e.target.closest('[data-remove]');if(remove){draftItems.splice(Number(remove.dataset.remove),1);renderItems();return}const add=e.target.closest('[data-add-answer]');if(add){draftItems[Number(add.dataset.addAnswer)].answers.push({text:'Új válasz',feedback:'',optimal:false});renderItems()}});
form.addEventListener('submit',e=>{e.preventDefault();const id=form.elements.id.value||`custom-${Date.now()}`;upsertCustomContent({id,type:typeSelect.value,title:form.elements.title.value.trim(),description:form.elements.description.value.trim(),items:draftItems,updatedAt:new Date().toISOString()});reset(typeSelect.value);renderList();refreshPreview();alert('A tartalom elmentve és megjelenik az alkalmazás főoldalán.')});
list.addEventListener('click',e=>{const edit=e.target.closest('[data-edit]'),del=e.target.closest('[data-delete]'),copy=e.target.closest('[data-copy]'),move=e.target.closest('[data-move]');if(edit){const x=getCustomContent().find(y=>y.id===edit.dataset.edit);form.elements.id.value=x.id;form.elements.title.value=x.title;form.elements.description.value=x.description||'';typeSelect.value=x.type;draftItems=structuredClone(x.items);renderItems();window.scrollTo({top:0,behavior:'smooth'})}if(del&&confirm('Biztosan törlöd ezt a témát?')){deleteCustomContent(del.dataset.delete);renderList();refreshPreview()}if(copy){duplicateCustomContent(copy.dataset.copy);renderList();refreshPreview()}if(move){moveCustomContent(move.dataset.id,Number(move.dataset.move));renderList();refreshPreview()}});
document.querySelector('#new-content').addEventListener('click',()=>reset());
document.querySelector('#export-content').addEventListener('click',()=>{const blob=new Blob([exportCustomContent()],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='utiterv-tartalomcsomag.json';a.click();URL.revokeObjectURL(a.href)});
document.querySelector('#import-content').addEventListener('change',async e=>{try{const count=importCustomContent(await e.target.files[0].text());renderList();loadHero();refreshPreview();alert(`${count} tartalom importálva.`)}catch(err){alert(err.message)}});
document.querySelector('#refresh-preview').addEventListener('click',refreshPreview);
window.addEventListener('utiterv-content-changed',refreshPreview);
loadHero();reset('story');renderList();

// Beta 2.1 – a teljes beépített tartalom szerkesztése
import {getBuiltInCatalog,getFullOverrides,saveFullOverride,resetFullOverride,resetAllFullOverrides,exportFullOverrides,importFullOverrides} from './full-content-engine.js';
const builtInList=document.querySelector('#built-in-list');
const builtInForm=document.querySelector('#built-in-form');
const datasetFields=document.querySelector('#dataset-fields');
const datasetEmpty=document.querySelector('#dataset-empty');
const datasetJson=document.querySelector('#dataset-json');
const datasetError=document.querySelector('#dataset-error');
const datasetTitle=document.querySelector('#dataset-title');
const datasetGroup=document.querySelector('#dataset-group');
let activeDatasetId='';
const originalCatalog=getBuiltInCatalog();
function datasetLabel(name){return name.replace(/Data$|Items$|Quiz$/g,'').replace(/([a-záéíóöőúüű])([A-Z])/g,'$1 $2')||name}
function renderBuiltInList(filter=''){
 const overrides=getFullOverrides(),q=filter.trim().toLocaleLowerCase('hu');
 const groups=new Map();
 originalCatalog.filter(x=>`${x.groupLabel} ${x.name}`.toLocaleLowerCase('hu').includes(q)).forEach(x=>{if(!groups.has(x.groupLabel))groups.set(x.groupLabel,[]);groups.get(x.groupLabel).push(x)});
 builtInList.innerHTML=[...groups].map(([group,items])=>`<h3 class="dataset-group-title">${esc(group)}</h3>${items.map(x=>`<button type="button" class="dataset-button ${activeDatasetId===x.id?'is-active':''}" data-dataset="${x.id}"><strong>${esc(datasetLabel(x.name))}${overrides[x.id]?' •':''}</strong><span>${Array.isArray(x.value)?`${x.value.length} elem`:'Összetett beállítás'}</span></button>`).join('')}`).join('')||'<p class="empty-state">Nincs találat.</p>';
}
function openDataset(id){
 const entry=originalCatalog.find(x=>x.id===id);if(!entry)return;
 activeDatasetId=id;const current=getFullOverrides()[id]??entry.value;
 builtInForm.elements.datasetId.value=id;datasetGroup.textContent=entry.groupLabel;datasetTitle.textContent=datasetLabel(entry.name);datasetJson.value=JSON.stringify(current,null,2);datasetError.textContent='';datasetEmpty.hidden=true;datasetFields.hidden=false;renderBuiltInList(document.querySelector('#built-in-search').value);
}
builtInList.addEventListener('click',e=>{const b=e.target.closest('[data-dataset]');if(b)openDataset(b.dataset.dataset)});
document.querySelector('#built-in-search').addEventListener('input',e=>renderBuiltInList(e.target.value));
builtInForm.addEventListener('submit',e=>{e.preventDefault();try{const value=JSON.parse(datasetJson.value);saveFullOverride(activeDatasetId,value);datasetJson.value=JSON.stringify(value,null,2);datasetError.textContent='';renderBuiltInList(document.querySelector('#built-in-search').value);refreshPreview();alert('A beépített tartalom módosítása elmentve.')}catch(err){datasetError.textContent=`Hibás JSON: ${err.message}`}});
document.querySelector('#format-json').addEventListener('click',()=>{try{datasetJson.value=JSON.stringify(JSON.parse(datasetJson.value),null,2);datasetError.textContent=''}catch(err){datasetError.textContent=`Hibás JSON: ${err.message}`}});
document.querySelector('#reset-dataset').addEventListener('click',()=>{if(activeDatasetId&&confirm('Visszaállítod ennek a tartalomcsoportnak az eredeti változatát?'))resetFullOverride(activeDatasetId)});
document.querySelector('#reset-full').addEventListener('click',()=>{if(confirm('Minden beépített tartalommódosítást törölsz? A saját témák megmaradnak.'))resetAllFullOverrides()});
document.querySelector('#export-full').addEventListener('click',()=>{const blob=new Blob([exportFullOverrides()],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='utiterv-project.json';a.click();URL.revokeObjectURL(a.href)});
document.querySelector('#import-full').addEventListener('change',async e=>{try{const count=importFullOverrides(await e.target.files[0].text());alert(`${count} módosított tartalomcsoport importálva.`);location.reload()}catch(err){alert(err.message)}});
renderBuiltInList();
