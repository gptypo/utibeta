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

const ELEMENT_STYLE_PRESETS=new Set(['default','card','highlight','minimal','dark','module','wide','compact','outline','soft']);
function validateStyledItems(file,items,where){if(!Array.isArray(items))return;items.forEach((item,index)=>{if(!item||typeof item!=='object')return;const style=String(item.stylePreset||'default');if(!ELEMENT_STYLE_PRESETS.has(style))addIssue(file,`${where}[${index}] ismeretlen stylePreset: ${style}.`);const custom=String(item.customClass||'').trim();if(custom&&!/^[a-z][a-z0-9-]{0,63}$/.test(custom))addIssue(file,`${where}[${index}] customClass érvénytelen: ${custom}.`);});}
const PAGE_STYLE_PRESETS=new Set(['default','cards','highlight','minimal','dark','module']);
function validatePresentation(value,file,keyPath=''){
  if(!value||typeof value!=='object'||Array.isArray(value))return;
  if(Object.prototype.hasOwnProperty.call(value,'customClass')){
    const custom=String(value.customClass||'').trim();
    if(custom&&!/^[a-z][a-z0-9-]{0,63}$/.test(custom))addIssue(file,`${keyPath}.customClass érvénytelen CSS osztály: ${custom}. Csak kisbetű, szám és kötőjel használható, kisbetűvel kezdve.`);
  }
  for(const [key,child] of Object.entries(value)){
    if(child&&typeof child==='object')validatePresentation(child,file,keyPath?`${keyPath}.${key}`:key);
  }
}


const PUBLICATION_STATUSES=new Set(['published','draft','archived']);
function validateLifecycle(value,file,keyPath=''){
  if(Array.isArray(value)){value.forEach((item,i)=>validateLifecycle(item,file,`${keyPath}[${i}]`));return;}
  if(!value||typeof value!=='object')return;
  if(Object.prototype.hasOwnProperty.call(value,'publicationStatus')){
    const status=String(value.publicationStatus||'published');
    if(!PUBLICATION_STATUSES.has(status))addIssue(file,`${keyPath}.publicationStatus érvénytelen: ${status}.`);
  }
  for(const key of ['publishedAt','unpublishAt'])if(value[key]){
    const time=Date.parse(String(value[key]));if(!Number.isFinite(time))addIssue(file,`${keyPath}.${key} nem érvényes dátum/idő: ${value[key]}.`);
  }
  if(value.tags!==undefined&&(!Array.isArray(value.tags)||value.tags.some(x=>typeof x!=='string')))addIssue(file,`${keyPath}.tags csak szöveges lista lehet.`);
  for(const [key,child] of Object.entries(value))if(child&&typeof child==='object')validateLifecycle(child,file,keyPath?`${keyPath}.${key}`:key);
}
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
  const elementStyle=String(block.stylePreset||'default');
  if(!ELEMENT_STYLE_PRESETS.has(elementStyle))addIssue(file,`${where}.blocks[${index}] ismeretlen elem stylePreset: ${elementStyle}.`);
  const custom=String(block.customClass||'').trim();
  if(custom&&!/^[a-z][a-z0-9-]{0,63}$/.test(custom))addIssue(file,`${where}.blocks[${index}] customClass érvénytelen: ${custom}.`);
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


function validateBuiltInQuizCollection(items,file,keyPath){
  if(!Array.isArray(items))return;
  items.forEach((item,qi)=>{
    if(!item||typeof item!=='object'||Array.isArray(item)){addIssue(file,`${keyPath}[${qi}] nem objektum.`);return;}
    const question=String(item.situation||item.question||'').trim();
    if(!question)addIssue(file,`${keyPath}[${qi}] kérdésszövege hiányzik.`);
    const options=item.options;
    if(!Array.isArray(options)||options.length<2){addIssue(file,`${keyPath}[${qi}] legalább 2 válaszlehetőséget igényel.`);return;}
    if(options.every(option=>typeof option==='string')){
      const correct=Number(item.correctAnswer);
      if(!Number.isInteger(correct)||correct<0||correct>=options.length)addIssue(file,`${keyPath}[${qi}].correctAnswer érvénytelen (${item.correctAnswer}); 0 és ${options.length-1} közötti index szükséges.`);
      options.forEach((option,oi)=>{if(!String(option||'').trim())addIssue(file,`${keyPath}[${qi}].options[${oi}] válaszszövege üres.`);});
      return;
    }
    if(options.some(option=>!option||typeof option!=='object'||Array.isArray(option))){addIssue(file,`${keyPath}[${qi}].options vegyes/érvénytelen szerkezetű.`);return;}
    const optimal=options.filter(option=>option.isOptimal===true).length;
    if(optimal!==1)addIssue(file,`${keyPath}[${qi}] pontosan 1 helyes/optimális választ igényel (jelenleg ${optimal}).`);
    options.forEach((option,oi)=>{
      if(!String(option.text||'').trim())addIssue(file,`${keyPath}[${qi}].options[${oi}] válaszszövege hiányzik.`);
      if(!String(option.feedback||option.explanation||'').trim())addWarning(file,`${keyPath}[${qi}].options[${oi}] visszajelzése üres.`);
    });
  });
}

function validateExtensibleCollections(value,file,keyPath=''){
  if(!value||typeof value!=='object')return;
  if(Array.isArray(value)){
    value.forEach((item,i)=>validateExtensibleCollections(item,file,`${keyPath}[${i}]`));
    return;
  }
  for(const [key,val] of Object.entries(value)){
    const next=keyPath?`${keyPath}.${key}`:key;
    if(Array.isArray(val)&&/quiz(?:items)?$/i.test(key))validateBuiltInQuizCollection(val,file,next);
    if(Array.isArray(val)&&key==='firstDayChecklist'){
      const seen=new Set();
      val.forEach((item,i)=>{
        const id=String(item?.id??'').trim();
        if(!id)addIssue(file,`${next}[${i}] technikai azonosítója hiányzik.`);
        else if(!/^[a-z0-9][a-z0-9-]*$/.test(id))addIssue(file,`${next}[${i}] id csak kisbetűt, számot és kötőjelet tartalmazhat: ${id}.`);
        else if(seen.has(id))addIssue(file,`${next}[${i}] duplikált id: ${id}.`);
        else seen.add(id);
        if(!String(item?.text||'').trim())addIssue(file,`${next}[${i}] checklist szövege hiányzik.`);
      });
    }
    validateExtensibleCollections(val,file,next);
  }
}


function validateEmbeddedDetails(value,file,keyPath='data',seen=new Set()){
  if(Array.isArray(value)){value.forEach((item,i)=>validateEmbeddedDetails(item,file,`${keyPath}[${i}]`,seen));return;}
  if(!value||typeof value!=='object')return;
  if(Object.prototype.hasOwnProperty.call(value,'detail')){
    const id=String(value.id||'').trim(),detail=value.detail;
    if(!id)addIssue(file,`${keyPath} belső oldalhoz a szülő elem id mezője kötelező.`);
    else if(!/^[a-z0-9][a-z0-9-]*$/.test(id))addIssue(file,`${keyPath}.id csak kisbetűt, számot és kötőjelet tartalmazhat: ${id}.`);
    else if(seen.has(id))addIssue(file,`${keyPath}.id duplikált beágyazott oldal-azonosító: ${id}.`);
    else seen.add(id);
    if(detail!==undefined&&detail!==null&&(typeof detail!=='object'||Array.isArray(detail))){addIssue(file,`${keyPath}.detail nem objektum.`);}
    else if(detail&&typeof detail==='object'){
      if(detail.enabled!==undefined&&typeof detail.enabled!=='boolean')addIssue(file,`${keyPath}.detail.enabled csak true/false lehet.`);
      const style=String(detail.stylePreset||'default');
      if(!['default','cards','highlight','minimal','dark','module'].includes(style))addIssue(file,`${keyPath}.detail ismeretlen stylePreset: ${style}.`);
      if(detail.enabled===true&&!String(detail.header?.title||'').trim())addIssue(file,`${keyPath}.detail belső oldal címe hiányzik.`);
      if(detail.blocks!==undefined){
        if(!Array.isArray(detail.blocks))addIssue(file,`${keyPath}.detail.blocks nem lista.`);
        else detail.blocks.forEach((block,bi)=>validateBlock(block,file,bi,`${keyPath}.detail`));
      }
    }
  }
  for(const [key,child] of Object.entries(value))if(key!=='detail'&&key!=='detailPages')validateEmbeddedDetails(child,file,keyPath?`${keyPath}.${key}`:key,seen);
}

function validateDetailPages(data,file){
  const pages=data?.data?.detailPages;
  if(pages===undefined)return;
  if(!Array.isArray(pages)){addIssue(file,'data.detailPages nem lista.');return;}
  const ids=new Set();
  pages.forEach((page,i)=>{
    if(!page||typeof page!=='object'){addIssue(file,`data.detailPages[${i}] nem objektum.`);return;}
    const id=String(page.id||'').trim();
    if(!id)addIssue(file,`data.detailPages[${i}] id mezője kötelező.`);
    else if(!/^[a-z0-9][a-z0-9-]*$/.test(id))addIssue(file,`data.detailPages[${i}] id csak kisbetűt, számot és kötőjelet tartalmazhat: ${id}.`);
    else if(ids.has(id))addIssue(file,`Duplikált részletes oldal id: ${id}.`);
    else ids.add(id);
    const style=String(page.stylePreset||'default');
    if(!['default','cards','highlight','minimal','dark','module'].includes(style))addIssue(file,`data.detailPages[${i}] ismeretlen stylePreset: ${style}.`);
    if(page.hidden!==true&&!String(page.header?.title||'').trim())addIssue(file,`data.detailPages[${i}] címe hiányzik.`);
    if(page.blocks!==undefined){if(!Array.isArray(page.blocks))addIssue(file,`data.detailPages[${i}].blocks nem lista.`);else page.blocks.forEach((block,bi)=>validateBlock(block,file,bi,`data.detailPages[${i}]`));}
  });
  const linked=[];
  const collect=value=>{if(Array.isArray(value))return value.forEach(collect);if(!value||typeof value!=='object')return;for(const [k,val] of Object.entries(value)){if(k==='detailPage'&&String(val||'').trim())linked.push(String(val).trim());collect(val);}};
  collect(data?.data||{});
  for(const id of linked)if(!ids.has(id))addIssue(file,`Nem létező részletes oldalra mutató detailPage hivatkozás: ${id}.`);
}

const jsonFiles=walk(path.join(root,'content')).filter(f=>f.endsWith('.json'));
for(const file of jsonFiles){
  const name=rel(file);
  try{
    const data=JSON.parse(fs.readFileSync(file,'utf8'));
    parsed.set(name,data);
    validatePresentation(data,name);
    validateLifecycle(data,name);
    visit(data,name);
    const blocks=data?.data?.blocks;
    if(blocks!==undefined){
      if(!Array.isArray(blocks)) addIssue(name,'data.blocks nem lista.');
      else blocks.forEach((block,i)=>validateBlock(block,name,i,'data'));
    }
    validateDetailPages(data,name);
    validateEmbeddedDetails(data?.data,name,'data');
    validateExtensibleCollections(data,name);
    if(data?.schema==='utiterv-section-v5'){const style=String(data?.data?.page?.stylePreset||'default');if(!['default','cards','highlight','minimal','dark','module'].includes(style))addIssue(name,`data.page.stylePreset ismeretlen: ${style}.`);}
    if(name.endsWith('content/modules/galaxy-guide/videos.json'))validateStyledItems(name,data?.data?.videoStories,'data.videoStories');
    if(name.endsWith('content/modules/galaxy-guide/materials.json'))validateStyledItems(name,data?.data?.bonusMaterials,'data.bonusMaterials');
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
  if(String(manifest.version||'')!=='7.0.1') addIssue('content/project.json',`A release verziója nem 7.0.1: ${manifest.version||'hiányzik'}.`);
  if(!String(manifest.meta?.contentModel||'').includes('element-style-presets-v1')) addIssue('content/project.json','A 6.1 contentModel metaadata hiányos: element-style-presets-v1 hiányzik.');
  const uiData=parsed.get('content/ui.json');
  for(const key of ['title','placeholder','hint','empty']) if(!String(uiData?.search?.[key]||'').trim()) addIssue('content/ui.json',`A kereső UI mezője hiányzik: search.${key}.`);
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
