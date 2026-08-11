const PWA_VERSION='BETA 1.2.6';
const KEYS={onboarding:'utiterv-pwa-onboarding-v1',ios:'utiterv-pwa-ios-help-v1',session:'utiterv-pwa-session-v1',samsungInstall:'utiterv-samsung-install-warning-v1'};
const isStandalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const isIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const isAndroid=()=>/android/i.test(navigator.userAgent);
const isSamsungInternet=()=>/SamsungBrowser\//i.test(navigator.userAgent);
let deferredInstall=null;
function shell(){
 if(document.querySelector('#pwa-layer'))return;
 document.body.insertAdjacentHTML('beforeend',`<div id="pwa-layer" class="pwa-layer" aria-live="polite">
 <section class="pwa-banner" data-install-banner hidden><div><strong>Telepítsd az Útitervet</strong><span>Gyorsabb indítás és offline használat.</span></div><div><button class="pwa-button" data-install>Telepítés</button><button class="pwa-icon-button" data-install-dismiss aria-label="Bezárás">×</button></div></section>
 <section class="pwa-banner pwa-banner--samsung" data-samsung-install hidden>
   <div>
     <strong>Telepítéshez Chrome ajánlott</strong>
     <span>Samsung Internetből a Play Protect téves „régi Android-verzió” figyelmeztetést jeleníthet meg. Az alkalmazást nyisd meg Chrome-ban, és onnan telepítsd.</span>
   </div>
   <div>
     <button class="pwa-button" data-open-chrome type="button">Megnyitás Chrome-ban</button>
     <button class="pwa-icon-button" data-samsung-dismiss type="button" aria-label="Bezárás">×</button>
   </div>
 </section>
 <section class="pwa-toast" data-update-toast hidden><div><strong>Új verzió elérhető</strong><span>Frissíts, hogy a legújabb Útitervet használd.</span></div><button class="pwa-button" data-update>Frissítés</button></section>
 <dialog class="pwa-dialog" data-ios-dialog><button class="pwa-dialog__close" data-ios-close aria-label="Bezárás">×</button><span class="pwa-dialog__eyebrow">iPhone és iPad</span><h2>Telepítés a Főképernyőre</h2><ol><li>Koppints a Safari <strong>Megosztás</strong> gombjára.</li><li>Válaszd a <strong>Hozzáadás a Főképernyőhöz</strong> lehetőséget.</li><li>Erősítsd meg a <strong>Hozzáadás</strong> gombbal.</li></ol><button class="pwa-button" data-ios-done>Értem</button></dialog>
 <dialog class="pwa-dialog pwa-onboarding" data-onboarding><div class="pwa-onboarding__mark">↗</div><span class="pwa-dialog__eyebrow">Útiterv Studio 8.1</span><h2>Az útiterved mostantól veled marad.</h2><p>Telepíthető, offline is használható, és automatikusan ott folytatja, ahol abbahagytad.</p><div class="pwa-onboarding__features"><span>✓ Offline tartalmak</span><span>✓ Automatikus visszaállítás</span><span>✓ Mobil app élmény</span></div><button class="pwa-button" data-onboarding-done>Indulhatunk</button></dialog>
 </div>`);
 document.querySelector('[data-install]')?.addEventListener('click',async()=>{if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;hide('[data-install-banner]')});
 document.querySelector('[data-install-dismiss]')?.addEventListener('click',()=>hide('[data-install-banner]'));
 document.querySelector('[data-open-chrome]')?.addEventListener('click',()=>{
   const scheme=location.protocol==='http:'?'http':'https';
   const target=`${location.host}${location.pathname}${location.search}${location.hash}`;
   location.href=`intent://${target}#Intent;scheme=${scheme};package=com.android.chrome;end`;
 });
 document.querySelector('[data-samsung-dismiss]')?.addEventListener('click',()=>{
   localStorage.setItem(KEYS.samsungInstall,'1');
   hide('[data-samsung-install]');
 });
 document.querySelector('[data-ios-close]')?.addEventListener('click',()=>document.querySelector('[data-ios-dialog]')?.close());
 document.querySelector('[data-ios-done]')?.addEventListener('click',()=>{localStorage.setItem(KEYS.ios,'1');document.querySelector('[data-ios-dialog]')?.close()});
 document.querySelector('[data-onboarding-done]')?.addEventListener('click',()=>{localStorage.setItem(KEYS.onboarding,'1');document.querySelector('[data-onboarding]')?.close()});
}
function show(s){const n=document.querySelector(s);if(n)n.hidden=false}function hide(s){const n=document.querySelector(s);if(n)n.hidden=true}
function openDialog(selector){const dialog=document.querySelector(selector);if(!dialog)return;if(typeof dialog.showModal==='function'){try{dialog.showModal();return}catch{}}dialog.setAttribute('open','');dialog.hidden=false}
function restoreSession(){try{const saved=JSON.parse(localStorage.getItem(KEYS.session)||'null');if(saved&&Date.now()-saved.savedAt<1000*60*60*24*30){if(saved.hash&&!location.hash)history.replaceState(null,'',saved.hash);requestAnimationFrame(()=>scrollTo({top:Number(saved.scrollY)||0,behavior:'instant'}))}}catch{}}
function persistSession(){localStorage.setItem(KEYS.session,JSON.stringify({hash:location.hash,scrollY:scrollY,savedAt:Date.now()}))}
async function registerSW(){
 if(!('serviceWorker'in navigator)||location.protocol==='file:')return;
 try{
  const swUrl=new URL('/sw.js',location.origin).href;
  const registration=await navigator.serviceWorker.register(swUrl,{scope:'/',updateViaCache:'none'});
  const announce=worker=>{if(!worker)return;show('[data-update-toast]');document.querySelector('[data-update]')?.addEventListener('click',()=>worker.postMessage({type:'SKIP_WAITING'}),{once:true})};
  if(registration.waiting&&navigator.serviceWorker.controller)announce(registration.waiting);
  registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)announce(worker)})});
  navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload());
  setTimeout(()=>{registration.update().catch(()=>{})},4000);
 }catch(err){console.warn('Service Worker registration failed',err)}
}
function showSamsungInstallNotice(){
 if(!isSamsungInternet()||isStandalone()||localStorage.getItem(KEYS.samsungInstall))return;
 hide('[data-install-banner]');
 show('[data-samsung-install]');
}
function scheduleSamsungInstallNotice(){
 if(!isSamsungInternet()||isStandalone()||localStorage.getItem(KEYS.samsungInstall))return;
 if(localStorage.getItem(KEYS.onboarding)){
   setTimeout(showSamsungInstallNotice,900);
 }else{
   document.querySelector('[data-onboarding-done]')?.addEventListener('click',()=>setTimeout(showSamsungInstallNotice,350),{once:true});
 }
}
function init(){
 document.documentElement.classList.toggle('is-standalone',isStandalone());document.documentElement.dataset.pwaVersion=PWA_VERSION;shell();restoreSession();
 addEventListener('beforeinstallprompt',e=>{
  e.preventDefault();
  deferredInstall=e;
  if(isSamsungInternet()){
    hide('[data-install-banner]');
    showSamsungInstallNotice();
    return;
  }
  if(isAndroid()&&!isStandalone())show('[data-install-banner]');
 });
 addEventListener('appinstalled',()=>{hide('[data-install-banner]');hide('[data-samsung-install]');document.documentElement.classList.add('is-standalone')});
 if(!localStorage.getItem(KEYS.onboarding)){setTimeout(()=>openDialog('[data-onboarding]'),2100)}
 else if(isIOS()&&!isStandalone()&&!localStorage.getItem(KEYS.ios)){setTimeout(()=>openDialog('[data-ios-dialog]'),3000)}
 let timer;addEventListener('scroll',()=>{clearTimeout(timer);timer=setTimeout(persistSession,180)},{passive:true});addEventListener('hashchange',persistSession);addEventListener('pagehide',persistSession);
 scheduleSamsungInstallNotice();
 registerSW();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
