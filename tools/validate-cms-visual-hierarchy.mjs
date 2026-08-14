import fs from 'node:fs';
import process from 'node:process';
const raw=fs.readFileSync('.pages.yml','utf8');
const errors=[];
const required=[
  "label: '▰ OLDALSTRUKTÚRA'",
  "label: ' ① OLDAL'",
  "label: ' ② FŐ TARTALOM'",
  "label: ' ③ BŐVÍTÉSEK'",
  "label: '  ↳ Fejléc'",
  "label: '  ↳ Megjelenés'",
  "label: '  ▸ VIDEÓKÁRTYÁK'",
  "label: '   ▾ BELSŐ OLDAL'"
];
for(const token of required) if(!raw.includes(token)) errors.push(`Hiányzó vizuális hierarchia-jelölés: ${token}`);
const roots=(raw.match(/label: '▰ OLDALSTRUKTÚRA'/g)||[]).length;
if(roots<20) errors.push(`Túl kevés vizuálisan kiemelt Oldalstruktúra gyökér: ${roots}`);
if(raw.includes('label: Oldalstruktúra')) errors.push('Maradt vizuálisan nem kiemelt Oldalstruktúra címke.');
if(errors.length){for(const e of errors)console.error(`::error file=.pages.yml::${e}`);process.exit(1);}
console.log(`✓ Pages CMS visual hierarchy valid (${roots} recursive page roots)`);
