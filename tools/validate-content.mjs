import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const issues=[];
const warnings=[];
const parsed=new Map();
const mediaRefs=[];
const ids=new Map();

const rel=p=>path.relative(root,p).replaceAll(path.sep,'/');
const addIssue=(file,message)=>issues.push({file,message});
const addWarning=(file,message)=>warnings.push({file,message});

function walk(dir){
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    const full=path.join(dir,entry.name);
    return entry.isDirectory()?walk(full):[full];
  });
}

function isMediaPath(value){
  return typeof value==='string' && /^\/?(?:assets|audio|video|downloads)\//.test(value);
}

function visit(value,file,keyPath=''){
  if(Array.isArray(value)) return value.forEach((item,i)=>visit(item,file,`${keyPath}[${i}]`));
  if(!value||typeof value!=='object'){
    if(isMediaPath(value)) mediaRefs.push({file,keyPath,value});
    return;
  }
  for(const [key,val] of Object.entries(value)){
    const next=keyPath?`${keyPath}.${key}`:key;
    if(key==='id'&&typeof val==='string'&&val.trim()){
      const id=val.trim();
      if(!ids.has(id)) ids.set(id,[]);
      ids.get(id).push({file,keyPath:next});
    }
    if(isMediaPath(val)) mediaRefs.push({file,keyPath:next,value:val});
    visit(val,file,next);
  }
}

function validateBlock(block,file,index,where){
  if(!block||typeof block!=='object'||Array.isArray(block)){
    addIssue(file,`${where}.blocks[${index}] nem objektum.`); return;
  }
  const type=String(block.type||'').trim();
  const supported=new Set(['text','image','video','embed','audio','gallery','card','download','quote','divider']);
  if(!type){addIssue(file,`${where}.blocks[${index}] mezőből hiányzik a type.`);return;}
  if(!supported.has(type)){addIssue(file,`${where}.blocks[${index}] ismeretlen blokktípus: ${type}.`);return;}
  if(block.hidden) return;
  const required={image:['src'],video:['src'],embed:['url'],audio:['src'],download:['file'],quote:['quote']};
  for(const key of required[type]||[]) if(!String(block[key]??'').trim()) addIssue(file,`${where}.blocks[${index}] (${type}) kötelező mezője üres: ${key}.`);
  if(type==='gallery'){
    if(!Array.isArray(block.images)||!block.images.length) addIssue(file,`${where}.blocks[${index}] galéria nem tartalmaz képet.`);
    else block.images.forEach((img,i)=>{if(!img?.src)addIssue(file,`${where}.blocks[${index}].images[${i}] képforrása hiányzik.`); if(img?.src&&!String(img.alt||'').trim())addWarning(file,`${where}.blocks[${index}].images[${i}] alt szövege üres.`);});
  }
  if(type==='image'&&block.src&&!String(block.alt||'').trim()) addWarning(file,`${where}.blocks[${index}] kép alt szövege üres.`);
  if(type==='embed'&&block.url&&!/^https?:\/\//i.test(block.url)) addIssue(file,`${where}.blocks[${index}] videó URL-je nem http/https cím.`);
}

const jsonFiles=walk(path.join(root,'content')).filter(f=>f.endsWith('.json'));
for(const file of jsonFiles){
  const name=rel(file);
  try{
    const data=JSON.parse(fs.readFileSync(file,'utf8'));
    parsed.set(name,data);
    visit(data,name);
    const blocks=data?.data?.blocks;
    if(blocks!==undefined){
      if(!Array.isArray(blocks)) addIssue(name,'data.blocks nem lista.');
      else blocks.forEach((block,i)=>validateBlock(block,name,i,'data'));
    }
  }catch(error){addIssue(name,`Érvénytelen JSON: ${error.message}`);}
}

const manifest=parsed.get('content/project.json');
if(!manifest) addIssue('content/project.json','A projekt manifest nem olvasható.');
else{
  const refs=[manifest.home,manifest.ui,manifest.assets,manifest.custom,manifest.shared?.competencies,manifest.shared?.onmagamData].filter(Boolean);
  for(const ref of refs){
    const target=`content/${String(ref).replace(/^\.\//,'')}`;
    if(!parsed.has(target)) addIssue('content/project.json',`Hiányzó hivatkozott JSON: ${target}`);
  }
  for(const moduleRef of manifest.modules||[]){
    const moduleTarget=`content/${String(moduleRef.file||'').replace(/^\.\//,'')}`;
    const module=parsed.get(moduleTarget);
    if(!module){addIssue('content/project.json',`Hiányzó modul index: ${moduleTarget}`);continue;}
    const moduleDir=path.posix.dirname(moduleTarget);
    for(const section of module.sections||[]){
      const sectionTarget=path.posix.normalize(`${moduleDir}/${section.file}`);
      if(!parsed.has(sectionTarget)) addIssue(moduleTarget,`Hiányzó aloldal JSON (${section.id||'?'}): ${sectionTarget}`);
    }
  }
}

for(const ref of mediaRefs){
  const target=path.join(root,ref.value.replace(/^\//,''));
  if(!fs.existsSync(target)) addIssue(ref.file,`Hiányzó média: ${ref.value} (${ref.keyPath})`);
}

for(const [id,places] of ids){
  if(places.length>1){
    // Root section/module ids and module-index section references are structural and may repeat.
    const structural=p=>p.keyPath==='id'||(/content\/modules\/[^/]+\/index\.json$/.test(p.file)&&/sections\[\d+\]\.id$/.test(p.keyPath));
    const meaningful=places.filter(p=>!structural(p));
    if(meaningful.length>1) addWarning(meaningful[0].file,`Többször használt tartalmi id: "${id}" (${meaningful.length} előfordulás).`);
  }
}

const pagesFile=path.join(root,'.pages.yml');
if(!fs.existsSync(pagesFile)) addIssue('.pages.yml','Pages CMS konfiguráció hiányzik.');
else{
  const yml=fs.readFileSync(pagesFile,'utf8');
  for(const name of parsed.keys()){
    if(!yml.includes(`path: ${name}`)) addIssue('.pages.yml',`A Pages CMS nem hivatkozik erre a JSON-ra: ${name}`);
  }
}

console.log('ÚTITERV – CONTENT VALIDATION');
console.log(`✓ ${parsed.size}/${jsonFiles.length} JSON parse-olható`);
console.log(`✓ ${mediaRefs.length} média-hivatkozás ellenőrizve`);
console.log(`✓ ${manifest?.modules?.length||0} modul-index ellenőrizve`);
if(warnings.length){
  console.log(`\nFIGYELMEZTETÉSEK (${warnings.length})`);
  warnings.forEach(x=>console.log(`! ${x.file}: ${x.message}`));
}
if(issues.length){
  console.error(`\nHIBÁK (${issues.length})`);
  issues.forEach(x=>console.error(`✗ ${x.file}: ${x.message}`));
  process.exitCode=1;
}else console.log('\n✓ Nincs blokkoló tartalmi hiba.');
