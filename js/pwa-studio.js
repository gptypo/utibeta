const checks=[
 ['Manifest','manifest.webmanifest',async()=>{const r=await fetch('manifest.webmanifest',{cache:'no-store'});const m=await r.json();return !!(m.name&&m.start_url&&m.display==='standalone'&&m.icons?.some(i=>i.sizes==='512x512'))}],
 ['Service Worker','sw.js',async()=>{const r=await fetch('sw.js',{cache:'no-store'});return r.ok&&(await r.text()).includes('OFFLINE_URL')}],
 ['Offline fallback','offline.html',async()=>fetch('offline.html',{cache:'no-store'}).then(r=>r.ok)],
 ['App ikonok','192 + 512 px',async()=>Promise.all(['assets/icons/app-icon-192.png','assets/icons/app-icon-512.png'].map(x=>fetch(x).then(r=>r.ok))).then(x=>x.every(Boolean))],
 ['Safe-area','viewport-fit=cover',async()=>fetch('index.html').then(r=>r.text()).then(t=>t.includes('viewport-fit=cover')&&t.includes('css/pwa.css'))],
 ['Frissítéskezelés','SKIP_WAITING',async()=>fetch('js/pwa.js').then(r=>r.text()).then(t=>t.includes('SKIP_WAITING')&&t.includes('controllerchange'))]
];
async function run(){const out=document.querySelector('#pwa-results'),status=document.querySelector('#pwa-status');if(!out)return;status.textContent='Ellenőrzés folyamatban…';const results=[];for(const [name,detail,test] of checks){let ok=false;try{ok=await test()}catch{}results.push({name,detail,ok})}const score=Math.round(results.filter(x=>x.ok).length/results.length*100);document.querySelector('#pwa-score strong').textContent=score;out.innerHTML=results.map(x=>`<article class="quality-card"><header><h3>${x.name}</h3><span class="${x.ok?'is-ok':'is-error'}">${x.ok?'Kész':'Hiba'}</span></header><p>${x.detail}</p></article>`).join('');status.textContent=score===100?'A projekt telepíthető PWA-ként készen áll.':'Néhány PWA-feltétel még ellenőrzést igényel.'}
document.querySelector('#pwa-check')?.addEventListener('click',run);window.addEventListener('DOMContentLoaded',run);
