import fs from 'node:fs';import path from 'node:path';import process from 'node:process';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');const issues=[];
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
for(const file of ['index.html','offline.html']){const html=read(file);if(!/<html[^>]+lang=["'][^"']+["']/i.test(html))issues.push(`${file}: hiányzik a lang attribútum.`);if(!/<meta[^>]+name=["']viewport["']/i.test(html))issues.push(`${file}: hiányzik a viewport meta.`);if(!/<title>[^<]+<\/title>/i.test(html))issues.push(`${file}: hiányzik a title.`);for(const match of html.matchAll(/<img\b[^>]*>/gi)){if(!/\balt\s*=/.test(match[0]))issues.push(`${file}: alt nélküli <img> található.`)}}
const ui=JSON.parse(read('content/ui.json'));if(!ui?.shell?.menuOpenAria||!ui?.shell?.menuCloseAria)issues.push('content/ui.json: menü ARIA felirat hiányzik.');
console.log(`ÚTITERV – ACCESSIBILITY SMOKE\n${issues.length?'✗':'✓'} ${issues.length?issues.join('\n✗ '):'alap akadálymentességi ellenőrzések rendben'}`);if(issues.length)process.exitCode=1;
