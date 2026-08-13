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
const githubEscape=value=>String(value).replaceAll('%','%25').replaceAll('\r','%0D').replaceAll('\n','%0A');
const githubPropEscape=value=>githubEscape(value).replaceAll(':','%3A').replaceAll(',','%2C');
const githubAnnotation=(level,file,message,title)=>{
  if(!process.env.GITHUB_ACTIONS)return;
  const props=[`file=${githubPropEscape(file)}`];
  if(title)props.push(`title=${githubPropEscape(title)}`);
  console.log(`::${level} ${props.join(',')}::${githubEscape(message)}`);
};

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
  const supported=new Set(['text','image','video','embed','audio','gallery','card','download','quote','divider','quiz','carousel','flipcards','checklist','steps']);
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
  if(['quiz','carousel','flipcards','checklist'].includes(type)&&!String(block.id||'').trim())addIssue(file,`${where}.blocks[${index}] (${type}) interaktív blokkból hiányzik az id.`);
  if(['quiz','carousel','flipcards','checklist'].includes(type)&&block.id&&!/^[a-z0-9-]+$/.test(String(block.id)))addIssue(file,`${where}.blocks[${index}] (${type}) id csak kisbetűt, számot és kötőjelet tartalmazhat.`);
  if(['quiz','carousel','flipcards','checklist','steps'].includes(type)&&(!Array.isArray(block.items)||!block.items.length))addIssue(file,`${where}.blocks[${index}] (${type}) nem tartalmaz elemet.`);
  if(type==='quiz'&&Array.isArray(block.items))block.items.forEach((item,qi)=>{
    if(!String(item?.question||item?.situation||'').trim())addIssue(file,`${where}.blocks[${index}].items[${qi}] kérdése hiányzik.`);
    if(!Array.isArray(item?.options)||item.options.length<2)addIssue(file,`${where}.blocks[${index}].items[${qi}] legalább 2 válaszlehetőséget igényel.`);
    else{
      const optimal=item.options.filter(option=>option?.isOptimal===true).length;
      if(optimal!==1)addIssue(file,`${where}.blocks[${index}].items[${qi}] pontosan 1 helyes/optimális választ igényel (jelenleg ${optimal}).`);
      item.options.forEach((option,oi)=>{if(!String(option?.text||'').trim())addIssue(file,`${where}.blocks[${index}].items[${qi}].options[${oi}] válaszszövege hiányzik.`);if(!String(option?.feedback||option?.explanation||'').trim())addWarning(file,`${where}.blocks[${index}].items[${qi}].options[${oi}] visszajelzése üres.`);});
    }
  });
  if(type==='flipcards'&&Array.isArray(block.items))block.items.forEach((item,ci)=>{if(!String(item?.front||'').trim()||!String(item?.back||'').trim())addIssue(file,`${where}.blocks[${index}].items[${ci}] flip-card elő- és hátlapja kötelező.`);});
  if(type==='checklist'&&Array.isArray(block.items))block.items.forEach((item,ci)=>{if(!String(item?.text||'').trim())addIssue(file,`${where}.blocks[${index}].items[${ci}] checklist szövege hiányzik.`);});
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
    if(data?.schema==='utiterv-dynamic-pages-v1'){
      if(!Array.isArray(data.pages)) addIssue(name,'pages nem lista.');
      else {
        const localIds=new Set();
        data.pages.forEach((page,i)=>{
          if(!page||typeof page!=='object'){addIssue(name,`pages[${i}] nem objektum.`);return;}
          const id=String(page.id||'').trim();
          if(!id)addIssue(name,`pages[${i}] id mezője kötelező.`);
          else if(!/^[a-z0-9][a-z0-9-]*$/.test(id))addIssue(name,`pages[${i}] id csak kisbetűt, számot és kötőjelet tartalmazhat: ${id}.`);
          else if(localIds.has(id))addIssue(name,`Duplikált dinamikus aloldal id: ${id}.`);
          else localIds.add(id);
          if(page.hidden!==true&&!String(page.navTitle||page.page?.header?.title||'').trim())addIssue(name,`pages[${i}] navigációs címe hiányzik.`);
          const style=String(page.page?.stylePreset||'default');
          if(!['default','cards','highlight','minimal','dark','module'].includes(style))addIssue(name,`pages[${i}] ismeretlen stylePreset: ${style}.`);
          if(page.blocks!==undefined){
            if(!Array.isArray(page.blocks))addIssue(name,`pages[${i}].blocks nem lista.`);
            else page.blocks.forEach((block,bi)=>validateBlock(block,name,bi,`pages[${i}]`));
          }
        });
      }
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
    if(module.dynamic){
      const dynamicTarget=path.posix.normalize(`${moduleDir}/${module.dynamic}`);
      const dynamic=parsed.get(dynamicTarget);
      if(!dynamic)addIssue(moduleTarget,`Hiányzó dinamikus aloldal-lista: ${dynamicTarget}`);
      else {
        const staticIds=new Set((module.sections||[]).map(section=>String(section.id||'')));
        for(const page of dynamic.pages||[]){
          const id=String(page?.id||'');
          if(id&&staticIds.has(id))addIssue(dynamicTarget,`A dinamikus aloldal id ütközik beépített oldallal: ${id}.`);
        }
      }
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
  warnings.forEach(x=>{
    console.log(`! ${x.file}: ${x.message}`);
    githubAnnotation('warning',x.file,x.message,'Útiterv tartalomfigyelmeztetés');
  });
}
if(issues.length){
  console.error(`\nHIBÁK (${issues.length})`);
  issues.forEach(x=>{
    console.error(`✗ ${x.file}: ${x.message}`);
    githubAnnotation('error',x.file,x.message,'Útiterv tartalomvalidáció');
  });
  process.exitCode=1;
}else console.log('\n✓ Nincs blokkoló tartalmi hiba.');
