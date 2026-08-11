import {project,baseProject,saveProject,resetProject,exportProject,replaceProject} from './project-content.js';

const moduleLabels={
 onmagam:'QUIT & GO · Önmagam',
 onmagamData:'QUIT & GO · Kiegészítő adatok',
 helyzeteim:'QUICK WIN · Helyzeteim',
 kapcsolataim:'WIN-WIN · Kapcsolataim',
 bonus:'GALAXY GUIDE · Bónusz',
 competencies:'Kompetenciák'
};
const clone=value=>JSON.parse(JSON.stringify(value));
function editableEntries(source=project){
 const out=[],seen=new Set();
 for(const module of source.contentTree||[]){
  for(const section of module.sections||[]){
   for(const name of section.keys||[]){
    const value=source.modules?.[module.id]?.[name],id=`${module.id}.${name}`;
    if(value!==undefined){out.push({id,group:module.id,name,label:name,value,sectionTitle:section.title,moduleTitle:module.title});seen.add(id)}
   }
  }
 }
 for(const [group,ns] of Object.entries(source.modules||{}))for(const [name,value] of Object.entries(ns||{})){const id=`${group}.${name}`;if(!seen.has(id)&&(Array.isArray(value)||(value&&typeof value==='object')))out.push({id,group,name,label:name,value})}
 return out;
}
function resolve(id,source=project){
 const dot=id.indexOf('.');
 if(dot<1)return null;
 const group=id.slice(0,dot),name=id.slice(dot+1);
 return source.modules?.[group]&&name in source.modules[group]?{group,name,value:source.modules[group][name]}:null;
}
function overwrite(target,incoming){
 const next=clone(incoming);
 if(Array.isArray(target)&&Array.isArray(next)) target.splice(0,target.length,...next);
 else if(target&&typeof target==='object'&&next&&typeof next==='object'){
  for(const key of Object.keys(target))delete target[key];
  Object.assign(target,next);
 }else return next;
 return target;
}
export function getBuiltInCatalog(){return editableEntries().map(x=>({...x,groupLabel:x.sectionTitle?`${moduleLabels[x.group]||x.moduleTitle} · ${x.sectionTitle}`:(moduleLabels[x.group]||x.group),value:clone(x.value)}))}
export function getFullOverrides(){
 const overrides={};
 for(const entry of editableEntries()){
  const original=resolve(entry.id,baseProject)?.value;
  if(JSON.stringify(entry.value)!==JSON.stringify(original))overrides[entry.id]=clone(entry.value);
 }
 return overrides;
}
export function saveFullOverride(id,value){
 const target=resolve(id);
 if(!target)throw new Error('Ismeretlen tartalomcsoport.');
 const replaced=overwrite(target.value,value);
 if(replaced!==target.value) project.modules[target.group][target.name]=replaced;
 saveProject();
 window.dispatchEvent(new CustomEvent('utiterv-full-content-changed'));
}
export function resetFullOverride(id){
 const target=resolve(id),original=resolve(id,baseProject);
 if(!target||!original)return;
 const replaced=overwrite(target.value,original.value);
 if(replaced!==target.value)project.modules[target.group][target.name]=replaced;
 saveProject();
 location.reload();
}
export function resetAllFullOverrides(){resetProject();location.reload()}
export function exportFullOverrides(){return exportProject()}
export function importFullOverrides(raw){
 const parsed=JSON.parse(raw);
 if((parsed?.schema==='utiterv-project-v5'||parsed?.schema==='utiterv-project-v4')&&parsed.modules){replaceProject(parsed);return editableEntries(parsed).length}
 const overrides=parsed.overrides||parsed;
 if(!overrides||typeof overrides!=='object'||Array.isArray(overrides))throw new Error('Érvénytelen tartalomcsomag.');
 let count=0;
 for(const [id,value] of Object.entries(overrides)){
  const target=resolve(id);if(!target)continue;
  const replaced=overwrite(target.value,value);
  if(replaced!==target.value)project.modules[target.group][target.name]=replaced;
  count++;
 }
 saveProject();return count;
}
export function applyFullOverrides(){return project}
