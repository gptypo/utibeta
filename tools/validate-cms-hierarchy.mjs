import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=path.join(root,'.pages.yml');
const yml=fs.readFileSync(file,'utf8');
const issues=[];
const need=(pattern,message)=>{if(!pattern.test(yml))issues.push(message);};

// The sidebar must keep the agreed three-root hierarchy and nested module/page groups.
need(/^content:\n- name: cms_app_settings\n  label: 1\. App beállításai\n  type: group\n  items:/m,'Hiányzik az 1. App beállításai gyökércsoport.');
need(/^- name: cms_content_modules\n  label: 2\. Tartalom modulok\n  type: group\n  items:/m,'Hiányzik a 2. Tartalom modulok gyökércsoport.');
need(/^- name: cms_other\n  label: 3\. Többi\n  type: group\n  items:/m,'Hiányzik a 3. Többi gyökércsoport.');
for(const [name,label] of [
  ['cms_module_quit_go','Quit & Go'],
  ['cms_module_quick_win','Quick Win'],
  ['cms_module_win_win','Win-Win'],
  ['cms_module_galaxy_guide','Galaxy Guide'],
]){
  need(new RegExp(`name: ${name}\\n\\s+label: ${label.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')}\\n\\s+type: group`),`Hiányzik a ${label} modulcsoport.`);
}
for(const name of ['cms_quit_go_pages','cms_quick_win_pages','cms_win_win_pages','cms_galaxy_guide_pages']){
  need(new RegExp(`name: ${name}\\n\\s+label: Aloldalak\\n\\s+type: group`),`Hiányzik az Aloldalak csoport: ${name}.`);
}
need(/name: cms_shared_data\n\s+label: Közös adatok\n\s+type: group/,'Hiányzik a Többi → Közös adatok alcsoport.');

// Every editable file/collection path should still occur exactly once after grouping.
const paths=[...yml.matchAll(/^\s*path:\s+(.+)$/gm)].map(m=>m[1].trim());
const duplicates=[...new Set(paths.filter((p,i)=>paths.indexOf(p)!==i))];
if(duplicates.length)issues.push(`Duplikált CMS path(ok): ${duplicates.join(', ')}`);

if(issues.length){
  console.error('❌ CMS hierarchy validation failed:');
  issues.forEach(x=>console.error(' - '+x));
  process.exit(1);
}
console.log('✓ CMS hierarchy: 3 root groups, 4 module groups, nested page groups');
console.log(`✓ CMS paths unique: ${paths.length}`);
