const clone=value=>JSON.parse(JSON.stringify(value));

const mergeGroups=(...groups)=>Object.assign({},...groups.filter(x=>x&&typeof x==='object'&&!Array.isArray(x)).map(clone));

export function normalizePageTree(tree={}){
  const out={};
  if(tree.header!==undefined)out.header=clone(tree.header||{});
  Object.assign(out,mergeGroups(tree.appearance,tree.publication,tree.discovery,tree.settings));
  if(tree.quiz!==undefined)out.quiz=clone(tree.quiz||{});
  if(tree.labels!==undefined)out.labels=clone(tree.labels||{});
  return out;
}
export function toRecursivePage(page={}){
  const out={};
  if(page.header!==undefined)out.header=clone(page.header||{});
  const appearance={},publication={},discovery={},settings={};
  for(const [key,val] of Object.entries(page||{})){
    if(key==='header'||key==='quiz'||key==='labels')continue;
    if(['stylePreset','customClass'].includes(key))appearance[key]=clone(val);
    else if(['publicationStatus','publishedAt','unpublishAt'].includes(key))publication[key]=clone(val);
    else if(['category','tags'].includes(key))discovery[key]=clone(val);
    else settings[key]=clone(val);
  }
  if(Object.keys(appearance).length)out.appearance=appearance;
  if(Object.keys(publication).length)out.publication=publication;
  if(Object.keys(discovery).length)out.discovery=discovery;
  if(page.quiz!==undefined)out.quiz=clone(page.quiz||{});
  if(page.labels!==undefined)out.labels=clone(page.labels||{});
  if(Object.keys(settings).length)out.settings=settings;
  return out;
}
function normalizeDetail(tree={}){
  const out=mergeGroups(tree.settings);
  const page=normalizePageTree(tree.page||{}),header=page.header;
  if(header!==undefined)out.header=header;
  delete page.header; Object.assign(out,page);
  out.blocks=clone(tree.content?.blocks||[]);
  return out;
}
function toRecursiveDetail(detail={}){
  const settings={};for(const key of ['enabled','backLabel'])if(detail[key]!==undefined)settings[key]=clone(detail[key]);
  const pageSrc={};for(const [key,val] of Object.entries(detail||{}))if(!['enabled','backLabel','blocks'].includes(key))pageSrc[key]=clone(val);
  return {settings,page:toRecursivePage(pageSrc),content:{blocks:clone(detail.blocks||[])}};
}
function normalizeVideoStory(item={}){return {id:item.id||'',...mergeGroups(item.card,item.appearance),detail:normalizeDetail(item.detail||{})};}
function toRecursiveVideoStory(item={}){return {id:item.id||'',card:Object.fromEntries(['profession','title','description','status'].filter(k=>k in item).map(k=>[k,clone(item[k])])),appearance:Object.fromEntries(['stylePreset','customClass'].filter(k=>k in item).map(k=>[k,clone(item[k])])),detail:toRecursiveDetail(item.detail||{})};}
function normalizeBonusMaterial(item={}){return {id:item.id||'',...mergeGroups(item.card,item.appearance)};}
function toRecursiveBonusMaterial(item={}){return {id:item.id||'',card:Object.fromEntries(['category','icon','title','description','status'].filter(k=>k in item).map(k=>[k,clone(item[k])])),appearance:Object.fromEntries(['stylePreset','customClass'].filter(k=>k in item).map(k=>[k,clone(item[k])]))};}

export function normalizeSectionDocument(doc={}){
  if(doc.schema!=='utiterv-section-v6')return clone(doc.data||{});
  const editor=doc.editor||{},data=clone(editor.content||{});
  if(Array.isArray(data.videoStories))data.videoStories=data.videoStories.map(normalizeVideoStory);
  if(Array.isArray(data.bonusMaterials))data.bonusMaterials=data.bonusMaterials.map(normalizeBonusMaterial);
  data.blocks=clone(editor.extensions?.blocks||[]);
  data.page=normalizePageTree(editor.page||{});
  return data;
}
export function sectionIdentity(doc={}){
  if(doc.schema==='utiterv-section-v6')return clone(doc.editor?.identity||{});
  return {id:doc.id||'',title:doc.title||''};
}
export function toRecursiveSectionDocument({id='',title='',data={}}={}){
  const main=clone(data||{});delete main.page;delete main.blocks;
  if(Array.isArray(main.videoStories))main.videoStories=main.videoStories.map(toRecursiveVideoStory);
  if(Array.isArray(main.bonusMaterials))main.bonusMaterials=main.bonusMaterials.map(toRecursiveBonusMaterial);
  return {schema:'utiterv-section-v6',editor:{identity:{id,title},page:toRecursivePage(data.page||{}),content:main,extensions:{blocks:clone(data.blocks||[])}}};
}

export function normalizeModuleIndexDocument(doc={}){
  if(doc.schema!=='utiterv-module-v6')return clone(doc);
  const editor=doc.editor||{},out={schema:'utiterv-module-v5',...mergeGroups(editor.identity,editor.appearance,editor.introduction)};
  out.sections=clone(editor.navigation?.sections||[]);out.dynamic=editor.navigation?.dynamic||'dynamic-pages.json';return out;
}
export function toRecursiveModuleIndexDocument(doc={}){
  return {schema:'utiterv-module-v6',editor:{identity:Object.fromEntries(['id','slug','title','code','className'].filter(k=>k in doc).map(k=>[k,clone(doc[k])])),appearance:Object.fromEntries(['icon','thin','heroIconMode'].filter(k=>k in doc).map(k=>[k,clone(doc[k])])),introduction:Object.fromEntries(['lead','time','page'].filter(k=>k in doc).map(k=>[k,clone(doc[k])])),navigation:{sections:clone(doc.sections||[]),dynamic:doc.dynamic||'dynamic-pages.json'}}};
}

export function normalizeDynamicBundleDocument(doc={}){
  if(doc.schema!=='utiterv-dynamic-pages-v2')return clone(doc);
  const editor=doc.editor||{};
  return {schema:'utiterv-dynamic-pages-v1',moduleId:editor.identity?.moduleId||'',pages:(editor.pages||[]).map(page=>({...mergeGroups(page.identity,page.visibility,page.discovery),page:normalizePageTree(page.page||{}),blocks:clone(page.content?.blocks||[])}))};
}
export function toRecursiveDynamicBundleDocument(doc={}){
  return {schema:'utiterv-dynamic-pages-v2',editor:{identity:{moduleId:doc.moduleId||''},pages:(doc.pages||[]).map(page=>{const visibility={},discovery={};for(const k of ['hidden','publicationStatus','publishedAt','unpublishAt'])if(page[k]!==undefined)visibility[k]=clone(page[k]);for(const k of ['category','tags'])if(page[k]!==undefined)discovery[k]=clone(page[k]);return {identity:Object.fromEntries(['id','navTitle'].filter(k=>k in page).map(k=>[k,clone(page[k])])),visibility,discovery,page:toRecursivePage(page.page||{}),content:{blocks:clone(page.blocks||[])}};})}};
}
