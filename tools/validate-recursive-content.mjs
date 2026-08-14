import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import {normalizeSectionDocument,normalizeModuleIndexDocument,normalizeDynamicBundleDocument} from '../js/content-schema.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const issues=[];const add=(file,msg)=>issues.push({file,msg});
const modules=path.join(root,'content/modules');
for(const moduleName of fs.readdirSync(modules)){
  const dir=path.join(modules,moduleName);if(!fs.statSync(dir).isDirectory())continue;
  for(const name of fs.readdirSync(dir).filter(x=>x.endsWith('.json'))){
    const file=path.join(dir,name),rel=path.relative(root,file).replaceAll(path.sep,'/'),doc=JSON.parse(fs.readFileSync(file,'utf8'));
    if(name==='index.json'){
      if(doc.schema!=='utiterv-module-v6')add(rel,`Várt schema: utiterv-module-v6, jelenlegi: ${doc.schema}`);
      for(const key of ['identity','appearance','introduction','navigation'])if(!doc.editor?.[key]||typeof doc.editor[key]!=='object')add(rel,`Hiányzó rekurzív modulág: editor.${key}`);
      const n=normalizeModuleIndexDocument(doc);if(!n.id||!n.slug||!Array.isArray(n.sections))add(rel,'A modul adapter nem állítja vissza a szükséges runtime mezőket.');
      continue;
    }
    if(name==='dynamic-pages.json'){
      if(doc.schema!=='utiterv-dynamic-pages-v2')add(rel,`Várt schema: utiterv-dynamic-pages-v2, jelenlegi: ${doc.schema}`);
      if(!doc.editor?.identity||!Array.isArray(doc.editor?.pages))add(rel,'Hiányzik editor.identity vagy editor.pages.');
      normalizeDynamicBundleDocument(doc);continue;
    }
    if(doc.schema!=='utiterv-section-v6')add(rel,`Várt schema: utiterv-section-v6, jelenlegi: ${doc.schema}`);
    for(const key of ['identity','page','content','extensions'])if(!doc.editor?.[key]||typeof doc.editor[key]!=='object'||Array.isArray(doc.editor[key]))add(rel,`Hiányzó rekurzív oldalág: editor.${key}`);
    const normalized=normalizeSectionDocument(doc);
    if(!normalized.page||!Array.isArray(normalized.blocks))add(rel,'A recursive → runtime adapter hibás eredményt adott.');
    if(name==='videos.json'&&moduleName==='galaxy-guide'){
      for(const [i,item] of (doc.editor?.content?.videoStories||[]).entries()){
        for(const key of ['card','appearance','detail'])if(!item?.[key]||typeof item[key]!=='object')add(rel,`videoStories[${i}] hiányzó ág: ${key}`);
        for(const key of ['settings','page','content'])if(!item?.detail?.[key]||typeof item.detail[key]!=='object')add(rel,`videoStories[${i}].detail hiányzó ág: ${key}`);
      }
    }
  }
}
if(issues.length){for(const {file,msg} of issues)console.error(`::error file=${file}::${msg}`);process.exit(1);}console.log('✓ 7.1 recursive content schema valid');
