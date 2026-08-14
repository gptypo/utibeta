import fs from 'node:fs';
import process from 'node:process';

const raw = fs.readFileSync('.pages.yml','utf8');
const errors=[];
const checks = [
  ['jobb oldali fa gyökér', /label:\s*["']?▾ Szerkeszthető oldal/],
  ['fa ág jelölés', /label:\s*["']?.*├─/],
  ['fa záró ág jelölés', /label:\s*["']?.*└─/],
  ['CMS útvonal súgó', /CMS útvonal:/],
  ['összecsukható listák', /collapsible:/],
  ['hierarchikus bal oldali modulok', /label:\s*["']?2\. Tartalom modulok/],
];
for (const [name,re] of checks) if(!re.test(raw)) errors.push(`Hiányzik: ${name}`);

// Ensure the known Galaxy Guide chain remains visible in both sidebar and editor schema.
for (const token of ['Galaxy Guide','Aloldalak','Videók','Videókártyák','Belső oldal']) {
  if(!raw.includes(token)) errors.push(`A CMS-struktúrából hiányzik: ${token}`);
}

if(errors.length){
  for(const e of errors) console.error(`::error file=.pages.yml::${e}`);
  process.exit(1);
}
console.log('✓ Pages CMS jobb oldali szerkesztőfa valid');
