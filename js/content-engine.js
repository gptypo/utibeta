import {project,baseProject,saveProject} from './project-content.js';
export const defaultSettings={...(baseProject.settings||{})};
const clone=value=>JSON.parse(JSON.stringify(value));
export function getCustomContent(){return project.customContent||(project.customContent=[])}
export function saveCustomContent(items){project.customContent=clone(items);saveProject();window.dispatchEvent(new CustomEvent('utiterv-content-changed'))}
export function upsertCustomContent(item){const items=getCustomContent(),i=items.findIndex(x=>x.id===item.id);if(i>=0)items[i]=item;else items.push(item);saveCustomContent(items);return item}
export function deleteCustomContent(id){saveCustomContent(getCustomContent().filter(x=>x.id!==id))}
export function moveCustomContent(id,direction){const items=clone(getCustomContent()),i=items.findIndex(x=>x.id===id),j=i+direction;if(i<0||j<0||j>=items.length)return;[items[i],items[j]]=[items[j],items[i]];saveCustomContent(items)}
export function duplicateCustomContent(id){const source=getCustomContent().find(x=>x.id===id);if(!source)return;const copy=JSON.parse(JSON.stringify(source));copy.id=`custom-${Date.now()}`;copy.title=`${copy.title} – ${baseProject.ui?.editor?.copySuffix||''}`;copy.updatedAt=new Date().toISOString();saveCustomContent([...getCustomContent(),copy])}
export function getContentSettings(){return {...defaultSettings,...(project.settings||{})}}
export function saveContentSettings(settings){project.settings={...defaultSettings,...settings};saveProject();window.dispatchEvent(new CustomEvent('utiterv-content-changed'))}
export function exportCustomContent(){return JSON.stringify({schema:'utiterv-content-v4',exportedAt:new Date().toISOString(),settings:getContentSettings(),items:getCustomContent()},null,2)}
export function importCustomContent(raw){const parsed=JSON.parse(raw),items=Array.isArray(parsed)?parsed:parsed.items;if(!Array.isArray(items))throw new Error(baseProject.ui?.editor?.invalidContentList||'');saveCustomContent(items);if(parsed.settings)saveContentSettings(parsed.settings);return items.length}
export const contentTypeLabels=baseProject.ui?.contentTypeLabels||{story:'story',accordion:'accordion',flip:'flip',quiz:'quiz'};
