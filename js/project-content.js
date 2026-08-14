const MANIFEST_URL = new URL('../content/project.json', import.meta.url);
const ERRORS_URL = new URL('../content/errors.json', import.meta.url);
const PROJECT_KEY = 'utiterv-project-v7';
const LEGACY_V6_KEY = 'utiterv-project-v6';
const LEGACY_V5_KEY = 'utiterv-project-v5';
const LEGACY_V4_KEY = 'utiterv-project-v4';
const LEGACY_KEY = 'utiterv-full-content-v1';
const LEGACY_CUSTOM_KEY='utiterv-custom-content-v2';
const LEGACY_CUSTOM_KEY_V1='utiterv-custom-content-v1';
const LEGACY_SETTINGS_KEY='utiterv-content-settings-v1';

const clone = value => JSON.parse(JSON.stringify(value));
export const errorCopy = await fetch(ERRORS_URL,{cache:'no-store'}).then(r=>r.ok?r.json():{}).catch(()=>({}));
const tpl=(value,vars={})=>String(value??'').replace(/\{(\w+)\}/g,(_,key)=>vars[key]??'');
const fetchJson = async url => {
  const response=await fetch(url,{cache:'no-store'});
  if(!response.ok) throw new Error(tpl(errorCopy.contentLoad,{url,status:response.status}));
  return response.json();
};
const resolveFrom=(base,path)=>new URL(path,base);
export const contentLoadWarnings=[];
const warnContent=(message,detail={})=>{contentLoadWarnings.push({message,...detail});console.warn('[Útiterv content]',message,detail)};

async function fetchBaseProject(){
  const manifest=await fetchJson(MANIFEST_URL);
  if(manifest?.schema!=='utiterv-project-manifest-v5'||!Array.isArray(manifest.modules)) throw new Error(errorCopy.invalidManifest||'');
  const modules={},navigation=[] ,contentTree=[];
  for(const moduleRef of manifest.modules){
    const indexUrl=resolveFrom(MANIFEST_URL,moduleRef.file);
    const moduleIndex=await fetchJson(indexUrl);
    const namespace={__sections:{}};
    const sectionTree=[];
    const navigationSections=[];
    for(const sectionRef of moduleIndex.sections||[]){
      let sectionData={};
      try{
        const section=await fetchJson(resolveFrom(indexUrl,sectionRef.file));
        sectionData=clone(section.data||{});
      }catch(error){
        warnContent('Egy aloldal tartalma nem tölthető be; az app a többi oldallal tovább indul.',{module:moduleIndex.id,section:sectionRef.id,file:sectionRef.file,error:String(error?.message||error)});
      }
      namespace.__sections[sectionRef.id]=sectionData;
      const legacyData=clone(sectionData);
      delete legacyData.blocks;
      Object.assign(namespace,legacyData);
      sectionTree.push({id:sectionRef.id,title:sectionRef.title,file:sectionRef.file,dynamic:false,keys:Object.keys(sectionData)});
      navigationSections.push({id:sectionRef.id,title:sectionRef.title,dynamic:false});
    }
    if(moduleIndex.dynamic){
      try{
        const dynamicBundle=await fetchJson(resolveFrom(indexUrl,moduleIndex.dynamic));
        for(const page of dynamicBundle.pages||[]){
          if(!page||page.hidden===true)continue;
          const id=String(page.id||'').trim();
          if(!id){warnContent('Egy dinamikus aloldal id nélkül kimaradt.',{module:moduleIndex.id,file:moduleIndex.dynamic});continue;}
          if(namespace.__sections[id]){warnContent('Dinamikus aloldal azonosítója ütközik egy meglévő aloldallal; az elem kimaradt.',{module:moduleIndex.id,section:id,file:moduleIndex.dynamic});continue;}
          const header=clone(page.page?.header||{});
          const title=String(page.navTitle||header.title||page.title||id);
          const sectionData={page:{...clone(page.page||{}),header},blocks:clone(page.blocks||[]),dynamic:true};
          namespace.__sections[id]=sectionData;
          sectionTree.push({id,title,file:moduleIndex.dynamic,dynamic:true,keys:Object.keys(sectionData)});
          navigationSections.push({id,title,dynamic:true});
        }
      }catch(error){
        warnContent('A modul dinamikus aloldalai nem tölthetők be; a beépített oldalak tovább működnek.',{module:moduleIndex.id,file:moduleIndex.dynamic,error:String(error?.message||error)});
      }
    }
    if(moduleIndex.shared){
      const shared=await fetchJson(resolveFrom(indexUrl,moduleIndex.shared));
      Object.assign(namespace,clone(shared.data||{}));
    }
    modules[moduleIndex.id]=namespace;
    navigation.push({
      id:moduleIndex.id,slug:moduleIndex.slug,title:moduleIndex.title,code:moduleIndex.code,
      className:moduleIndex.className,icon:moduleIndex.icon,thin:moduleIndex.thin,
      lead:moduleIndex.lead,time:moduleIndex.time,heroIconMode:moduleIndex.heroIconMode||'auto',page:clone(moduleIndex.page||{}),
      sections:navigationSections
    });
    contentTree.push({id:moduleIndex.id,title:moduleIndex.title,sections:sectionTree});
  }
  const home=await fetchJson(resolveFrom(MANIFEST_URL,manifest.home));
  const competencies=await fetchJson(resolveFrom(MANIFEST_URL,manifest.shared.competencies));
  const onmagamData=await fetchJson(resolveFrom(MANIFEST_URL,manifest.shared.onmagamData));
  const custom=await fetchJson(resolveFrom(MANIFEST_URL,manifest.custom));
  const ui=await fetchJson(resolveFrom(MANIFEST_URL,manifest.ui));
  const assets=await fetchJson(resolveFrom(MANIFEST_URL,manifest.assets));
  modules.competencies={competencyInfo:clone(competencies.competencyInfo||{})};
  modules.onmagamData={onmagamData:clone(onmagamData.onmagamData||{})};
  return {
    schema:'utiterv-project-v5',version:manifest.version||'5.4.0',updatedAt:new Date().toISOString(),
    meta:clone(manifest.meta||{}),navigation,contentTree,modules,
    settings:clone(home.settings||{}),customContent:clone(custom.items||[]),ui:clone(ui||{}),assets:clone(assets||{}),manifest:clone(manifest)
  };
}

function parseStored(key){try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}}
function readStoredProject(){const parsed=parseStored(PROJECT_KEY);return parsed?.modules?parsed:null}
function migrateProjectStorage(base){
 const existing=readStoredProject();if(existing)return normalizeStored(existing,base);
 const legacy=parseStored(LEGACY_V6_KEY)||parseStored(LEGACY_V5_KEY);
 const next=clone(base);
 // BETA 1.1 deliberately refreshes built-in module content from the packaged JSON files.
 // Only editor-owned settings and custom topics are carried forward, so stale snapshots
 // from BETA 1.0 or the early content-expansion build cannot mask new module structures.
 if(legacy?.settings&&typeof legacy.settings==='object')next.settings={...next.settings,...clone(legacy.settings)};
 if(Array.isArray(legacy?.customContent))next.customContent=clone(legacy.customContent);
 next.updatedAt=new Date().toISOString();
 localStorage.setItem(PROJECT_KEY,JSON.stringify(next));
 return next;
}
function normalizeStored(stored,base){
  // Pages CMS-ready core: repository JSON is authoritative for all editable content.
  return clone(base);
}
function applyLegacyOverrides(project){return project}


export const baseProject=await fetchBaseProject();
export const project=applyLegacyOverrides(migrateProjectStorage(baseProject));
if(!localStorage.getItem(PROJECT_KEY)) localStorage.setItem(PROJECT_KEY,JSON.stringify(project));

export function getProject(){return project}
export function getBaseProject(){return clone(baseProject)}
export function saveProject(){project.updatedAt=new Date().toISOString();localStorage.setItem(PROJECT_KEY,JSON.stringify(project));window.dispatchEvent(new CustomEvent('utiterv-project-changed',{detail:{project}}))}
export function replaceProject(next){if(!next?.modules)throw new Error(errorCopy.invalidProject||'');for(const key of Object.keys(project))delete project[key];Object.assign(project,normalizeStored(next,baseProject));saveProject()}
export function resetProject(){[PROJECT_KEY,LEGACY_V6_KEY,LEGACY_V5_KEY,LEGACY_V4_KEY,LEGACY_KEY,LEGACY_CUSTOM_KEY,LEGACY_CUSTOM_KEY_V1,LEGACY_SETTINGS_KEY].forEach(k=>localStorage.removeItem(k))}
export function exportProject(){return JSON.stringify({...clone(project),schema:'utiterv-project-v5',exportedAt:new Date().toISOString()},null,2)}
export function exportModularBundle(){
  const files={};
  files['home.json']={schema:'utiterv-home-v5',settings:clone(project.settings||{})};
  files['custom/topics.json']={schema:'utiterv-custom-v5',items:clone(project.customContent||[])};
  files['shared/competencies.json']={schema:'utiterv-shared-v5',competencyInfo:clone(project.modules.competencies?.competencyInfo||{})};
  files['shared/onmagam-data.json']={schema:'utiterv-shared-v5',onmagamData:clone(project.modules.onmagamData?.onmagamData||{})};
  for(const module of project.contentTree||[]){
    const nav=project.navigation.find(x=>x.id===module.id),slug=nav?.slug||module.id;
    const sections=[],dynamicPages=[];
    for(const section of module.sections||[]){
      const data=clone(project.modules[module.id]?.__sections?.[section.id]||{});
      if(section.dynamic){
        dynamicPages.push({id:section.id,navTitle:section.title,hidden:false,page:clone(data.page||{}),blocks:clone(data.blocks||[])});
        continue;
      }
      const file=`modules/${slug}/${section.id}.json`;
      files[file]={schema:'utiterv-section-v5',id:section.id,title:section.title,data};
      sections.push({id:section.id,title:section.title,file:`${section.id}.json`});
    }
    files[`modules/${slug}/dynamic-pages.json`]={schema:'utiterv-dynamic-pages-v1',moduleId:module.id,pages:dynamicPages};
    files[`modules/${slug}/index.json`]={schema:'utiterv-module-v5',...clone(nav),sections,dynamic:'dynamic-pages.json'};
  }
  files['project.json']=clone(project.manifest||baseProject.manifest);
  return JSON.stringify({schema:'utiterv-modular-bundle-v5',version:'5.4.0',files},null,2);
}
export {PROJECT_KEY};
