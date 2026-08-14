import fs from 'node:fs';
import process from 'node:process';
const raw=fs.readFileSync('.pages.yml','utf8');
const errors=[];
for(const token of ['name: editor','name: identity','name: page','name: content','name: extensions'])if(!raw.includes(token))errors.push(`Hiányzik a rekurzív editor ág: ${token}`);
for(const token of ['name: appearance','name: publication','name: discovery'])if(!raw.includes(token))errors.push(`Hiányzik a szemantikus alág: ${token}`);
if(!raw.includes('summary: \'{fields.card.profession} · {fields.card.title}\''))errors.push('A Galaxy Guide videókártyák nested summary-ja hiányzik.');
if(!raw.includes('summary: \'{fields.identity.navTitle}\''))errors.push('A dinamikus oldalak nested summary-ja hiányzik.');
if(errors.length){for(const e of errors)console.error(`::error file=.pages.yml::${e}`);process.exit(1);}console.log('✓ Pages CMS valódi rekurzív szerkesztőfa valid');
