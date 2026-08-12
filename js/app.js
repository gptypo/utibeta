import './full-content-engine.js';
import * as onmagam from './onmagam.js';
import * as helyzeteim from './helyzeteim.js';
import * as kapcsolataim from './kapcsolataim.js';
import * as bonus from './bonus.js';
import {getCustomContent,contentTypeLabels,getContentSettings} from './content-engine.js';
import {project} from './project-content.js';

const moduleOrder=project.navigation.map(module=>module.id);
const modules=Object.fromEntries(project.navigation.map(module=>[module.id,{title:module.title,code:module.code,className:module.className,icon:module.icon,thin:module.thin,lead:module.lead,time:module.time,heroIconMode:module.heroIconMode||'auto'}]));
const moduleExperience={
 onmagam:{popupTitle:'QUIT & GO',cardText:'Minden kihívás egy lehetőség a fejlődésre. Kis lépések, gyors eredmények.',intro:'Ebben a modulban olyan tippeket és gyakorlati útmutatókat találsz, amelyek segítenek eligazodni a munkahelyi mindennapokban. A cél, hogy magabiztosabban kezeld az első munkahelyed kihívásait, könnyebben beilleszkedj, és sikeresen elindulj szakmai utadon.',closing:'Ne feledd: nem kell mindent tudnod az első napon. A fejlődés egy folyamat, minden tapasztalat közelebb visz a céljaidhoz.'},
 helyzeteim:{popupTitle:'QUICK WIN',cardText:'A probléma nem végleges kudarc, hanem egy új helyzet kezdete. Kis lépések, gyors eredmények.',intro:'Ebben a modulban olyan gyakorlati tippeket és útmutatókat találsz, amelyek segítenek eligazodni a munka világában, magabiztosabban állást keresni, felkészülni az állásinterjúkra, valamint tudatosan építeni szakmai jelenlétedet. Cél, hogy megismerd azokat a helyzeteket és figyelmeztető jeleket, amelyekre érdemes odafigyelned a karrierutad során, így felkészültebben és tudatosabban hozhatsz döntéseket.',closing:'Ne feledd: a tudás önbizalmat ad, az önbizalom pedig új lehetőségeket nyit meg előtted.'},
 kapcsolataim:{popupTitle:'WIN-WIN',cardText:'Értsd meg a másik oldalt is! Úgy működj, hogy mindenki nyerjen.',intro:'Ebben a modulban megismerheted a munkavállalói és munkáltatói nézőpontokat, valamint a különböző generációk együttműködésének sajátosságait. Olyan kommunikációs és együttműködési eszközöket kapsz, amelyek segítenek magabiztosan mozogni a munka világában és a digitális térben egyaránt. Cél, hogy megértsd a munkahelyi kapcsolatok működését, tudatosabban kommunikálj, és hatékonyan működj együtt másokkal a közös sikerek érdekében.',closing:'A sikeres együttműködés azzal kezdődik, hogy megértjük egymás szempontjait.'}
};

const sectionMap=Object.fromEntries(project.navigation.map(module=>[module.id,module.sections.map(section=>[section.id,section.title])]));

const sectionPagerMap={
 onmagam:{preboarding:[['preboarding',()=>onmagam.preboardingData.length]],survival:[['survival',()=>onmagam.survivalGuideData.length]],marketfacts:[['marketFacts',()=>onmagam.marketFacts.length]],breathing:[],mindfulness:[],careers:[],quiz:[['onmagamQuiz',()=>onmagam.onmagamQuizItems.length]]},
 helyzeteim:{world:[['workWorldCards',()=>helyzeteim.workWorldCards.length],['workWorldQuiz',()=>helyzeteim.workWorldQuiz.length]],jobhunt:[['jobHuntCards',()=>helyzeteim.jobHuntCards.length]],interview:[['interviewCards',()=>helyzeteim.interviewCards.length]],cv:[['cvCards',()=>helyzeteim.cvCards.length]],linkedin:[['linkedinCards',()=>helyzeteim.linkedinCards.length]],firstday:[['firstDayQuiz',()=>helyzeteim.firstDayQuiz.length]],redflags:[['redFlagQuiz',()=>helyzeteim.redFlagQuiz.length]],legal:[['legalBasicsCards',()=>helyzeteim.legalBasics.length],['legalQuiz',()=>helyzeteim.legalBasicsQuiz.length]],scenarios:[['helyzetQuiz',()=>helyzeteim.helyzeteiScenarios.length]]},
 kapcsolataim:{twosides:[['winwinTwoSides',()=>kapcsolataim.ketOldalData.length]],generations:[['generationCards',()=>kapcsolataim.generationCards.length]],communication:[['winwinCommunication',()=>kapcsolataim.communicationFlips.length],['commQuiz',()=>kapcsolataim.komunikációQuiz.length]],phrases:[['winwinPhrases',()=>kapcsolataim.proPhrases.length],['phraseQuiz',()=>kapcsolataim.proSzóhasználatQuiz.length]],digital:[['winwinDigital',()=>kapcsolataim.digitalBehavior.length],['digitalQuiz',()=>kapcsolataim.digitálisViselkedésQuiz.length]],glossary:[['winwinGlossary',()=>kapcsolataim.glossary.length],['glossaryQuiz',()=>kapcsolataim.fogalomtárQuiz.length]]},
 bonus:{materials:[],videos:[]}
};
function topicPosition(route){const sections=sectionMap[route]||[],current=sectionFor(route),index=sections.findIndex(([id])=>id===current);return {sections,index,current,previous:sections[index-1]||null,next:sections[index+1]||null}}

let previousRenderedRoute='home';
function ensureModuleIntroDialog(){if(document.querySelector('[data-module-intro-dialog]'))return;document.body.insertAdjacentHTML('beforeend',`<dialog class="module-intro-dialog" data-module-intro-dialog><div class="module-intro-dialog__inner"><span class="eyebrow eyebrow--dark">Mire számíthatsz?</span><h2 data-module-intro-title></h2><p data-module-intro-copy></p><button class="button" type="button" data-module-intro-close>Mehet →</button></div></dialog>`);document.querySelector('[data-module-intro-close]')?.addEventListener('click',()=>document.querySelector('[data-module-intro-dialog]')?.close())}
function showModuleIntro(route){const info=moduleExperience[route];if(!info)return;ensureModuleIntroDialog();const dlg=document.querySelector('[data-module-intro-dialog]');dlg.querySelector('[data-module-intro-title]').textContent=`${info.popupTitle} · ${modules[route]?.title||''}`;dlg.querySelector('[data-module-intro-copy]').textContent=info.intro;if(!dlg.open)dlg.showModal()}
function setSectionBoundaryState(route,section,direction){const entries=sectionPagerMap[route]?.[section]||[];const st=state(),indices={...(st.indices||{})};entries.forEach(([key,getLength])=>{const length=Math.max(1,Number(getLength?.()||1));indices[key]=direction<0?length-1:0});save({indices})}
function enhanceTopicBoundaryNavigation(route){
 if(!Object.prototype.hasOwnProperty.call(sectionMap,route))return;
 view.querySelectorAll('.topic-boundary-nav').forEach(node=>node.remove());
 const {previous,next,current}=topicPosition(route),entries=sectionPagerMap[route]?.[current]||[];
 const atStart=entries.length===0||entries.every(([key])=>idx(key)===0);
 const atEnd=entries.length===0||entries.every(([key,getLength])=>idx(key)>=Math.max(1,Number(getLength?.()||1))-1);
 if(!(previous&&atStart)&&!(next&&atEnd))return;
 const nav=document.createElement('nav');
 nav.className='topic-boundary-nav topic-boundary-nav--content-end';
 nav.setAttribute('aria-label','Témák közötti navigáció');
 if(previous&&atStart)nav.insertAdjacentHTML('beforeend',`<button type="button" class="button topic-boundary-nav__button" data-topic-direction="-1" aria-label="Előző téma: ${esc(previous[1])}">← ${esc(previous[1])}</button>`);
 nav.insertAdjacentHTML('beforeend','<span class="topic-boundary-nav__spacer" aria-hidden="true"></span>');
 if(next&&atEnd)nav.insertAdjacentHTML('beforeend',`<button type="button" class="button topic-boundary-nav__button" data-topic-direction="1" aria-label="Következő téma: ${esc(next[1])}">${esc(next[1])} →</button>`);
 // A témaváltó mindig a teljes aloldali tartalom után következik. Így a kvízhez
 // tartozó magyarázat, összegzés vagy segédlet sem kerülhet a navigáció alá.
 view.append(nav);
}
function navigateTopic(direction){const route=state().route;if(!Object.prototype.hasOwnProperty.call(sectionMap,route))return;const {sections,index}=topicPosition(route),target=sections[index+direction];if(!target)return;setSectionBoundaryState(route,target[0],direction);setSection(route,target[0]);render(route,{focusActiveTab:true,scrollToTabs:true})}

const KEY='utiterv-beta-110';
const LEGACY_STATE_KEYS=['utiterv-beta-100'];
const STATE_SCHEMA=2;
const view=document.querySelector('#view'),app=document.querySelector('#app'),splash=document.querySelector('#splash');
const asset=n=>`assets/SVG_ASSETS/BIG_CONS/${n}`;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const defaultState=()=>({schema:STATE_SCHEMA,route:'home',lastRoute:'onmagam',sections:{},indices:{},viewed:{},quizAnswers:{},checklist:[],activeBreath:null,mindfulness:{}});
function sanitizeState(raw){
 const next={...defaultState(),...(raw&&typeof raw==='object'?raw:{})};
 const validRoutes=new Set(['home','privacy','system',...moduleOrder]);
 if(!validRoutes.has(next.route)&&!String(next.route||'').startsWith('custom:'))next.route='home';
 if(!moduleOrder.includes(next.lastRoute))next.lastRoute='onmagam';
 next.sections=next.sections&&typeof next.sections==='object'?{...next.sections}:{};
 for(const route of moduleOrder){const valid=new Set((sectionMap[route]||[]).map(([id])=>id));if(!valid.has(next.sections[route]))delete next.sections[route]}
 next.indices=next.indices&&typeof next.indices==='object'?Object.fromEntries(Object.entries(next.indices).filter(([,v])=>Number.isFinite(Number(v))).map(([k,v])=>[k,Math.max(0,Number(v))])):{};
 next.viewed=next.viewed&&typeof next.viewed==='object'?next.viewed:{};
 next.quizAnswers=next.quizAnswers&&typeof next.quizAnswers==='object'?next.quizAnswers:{};
 next.checklist=Array.isArray(next.checklist)?next.checklist:[];
 next.mindfulness=next.mindfulness&&typeof next.mindfulness==='object'?next.mindfulness:{};
 next.schema=STATE_SCHEMA;
 return next;
}
function migrateState(){
 try{const current=JSON.parse(localStorage.getItem(KEY)||'null');if(current){const clean=sanitizeState(current);localStorage.setItem(KEY,JSON.stringify(clean));return clean}}catch{}
 for(const legacyKey of LEGACY_STATE_KEYS){try{const legacy=JSON.parse(localStorage.getItem(legacyKey)||'null');if(legacy){const clean=sanitizeState(legacy);localStorage.setItem(KEY,JSON.stringify(clean));return clean}}catch{}}
 const fresh=defaultState();localStorage.setItem(KEY,JSON.stringify(fresh));return fresh;
}
let stateCache=migrateState();
const state=()=>stateCache;
const save=p=>{stateCache=sanitizeState({...stateCache,...p});localStorage.setItem(KEY,JSON.stringify(stateCache))};
const sectionFor=r=>{const sections=sectionMap[r]||[];const stored=state().sections?.[r];return sections.some(([id])=>id===stored)?stored:sections[0]?.[0]};
const setSection=(r,s)=>{const st=state();save({sections:{...st.sections,[r]:s}})};
const idx=k=>Math.max(0,Number(state().indices?.[k]||0));
const setIdx=(k,v)=>{const st=state();save({indices:{...st.indices,[k]:Math.max(0,Number(v)||0)}})};
const viewed=k=>Array.isArray(state().viewed?.[k])?state().viewed[k]:[];
const markViewed=(k,n)=>{const st=state(),arr=[...new Set([...(st.viewed?.[k]||[]),n])];save({viewed:{...st.viewed,[k]:arr}})};


const quizRegistry=()=>({
 onmagam:[{key:'onmagamQuiz',label:'Munkahelyi helyzetek',items:onmagam.onmagamQuizItems}],
 helyzeteim:[
  {key:'workWorldQuiz',label:'A munka világa',items:helyzeteim.workWorldQuiz},
  {key:'firstDayQuiz',label:'Első nap',items:helyzeteim.firstDayQuiz},
  {key:'redFlagQuiz',label:'Vészjelek',items:helyzeteim.redFlagQuiz},
  {key:'legalQuiz',label:'Munkajogi alapok',items:helyzeteim.legalBasicsQuiz},
  {key:'helyzetQuiz',label:'Gyakorlás',items:helyzeteim.helyzeteiScenarios}
 ],
 kapcsolataim:[
  {key:'commQuiz',label:'Kommunikáció',items:kapcsolataim.komunikációQuiz},
  {key:'phraseQuiz',label:'Pro mondatok',items:kapcsolataim.proSzóhasználatQuiz},
  {key:'digitalQuiz',label:'Digitális tér',items:kapcsolataim.digitálisViselkedésQuiz},
  {key:'glossaryQuiz',label:'Fogalomtár',items:kapcsolataim.fogalomtárQuiz}
 ]
});
function quizAnswersFor(key){return state().quizAnswers?.[key]||{}}
function recordQuizAnswer(key,questionIndex,optionIndex){const st=state(),current={...(st.quizAnswers?.[key]||{})};current[questionIndex]=optionIndex;save({quizAnswers:{...(st.quizAnswers||{}),[key]:current}})}
function quizQuestionCompleted(key,questionIndex,item){return Object.prototype.hasOwnProperty.call(quizAnswersFor(key),questionIndex)}
function quizStats(items,key){const answers=quizAnswersFor(key),answered=Object.keys(answers).length,total=items.length;let correct=0;Object.entries(answers).forEach(([qi,oi])=>{const item=items[Number(qi)];if(item?.options?.[Number(oi)]?.isOptimal)correct++});return {answered,total,correct,skipped:Math.max(0,total-answered),remainingToPerfect:Math.max(0,total-correct),percent:total?Math.round(correct/total*100):0,scorePercent:answered?Math.round(correct/answered*100):0}}
function quizEvaluation(stats){if(!stats.answered)return 'Kezdd el a kvízt, és minden válasz után azonnal kapsz visszajelzést.';if(stats.skipped)return 'Jó úton haladsz. A teljes értékeléshez válaszold meg a még kihagyott kérdéseket is.';if(stats.scorePercent===100)return 'Nagyszerű! Magabiztosan felismered a helyzetekben a legjobb megoldást.';if(stats.scorePercent>=75)return 'Szép eredmény. Nézd át a bizonytalanabb helyzeteket, és próbáld újra, ha szeretnéd.';if(stats.scorePercent>=50)return 'Jó alap. A hibás válaszok magyarázatai segítenek pontosítani a döntéseidet.';return 'Ez most gyakorlás. Nézd át a visszajelzéseket, majd indítsd újra a kvízt.'}
function quizResultMarkup(items,key){const stats=quizStats(items,key),answers=quizAnswersFor(key);const wrong=Object.entries(answers).filter(([qi,oi])=>{const qIndex=Number(qi),item=items[qIndex];return item&&!item.options?.[Number(oi)]?.isOptimal});return `<section class="quiz-progress-panel" data-quiz-progress-key="${key}"><div class="quiz-progress-panel__head"><div><span class="eyebrow eyebrow--dark">Haladás</span><strong>${stats.percent}%</strong></div><div class="quiz-progress-track" aria-label="${stats.percent}% teljesítve"><i style="width:${stats.percent}%"></i></div></div><div class="quiz-progress-metrics"><span><b>${stats.correct}</b><small>jó válasz</small></span><span><b>${Math.max(0,stats.answered-stats.correct)}</b><small>hibás válasz</small></span><span><b>${stats.answered}/${stats.total}</b><small>megválaszolt kérdés</small></span></div><p class="quiz-development">${esc(quizEvaluation(stats))}</p>${wrong.length?`<details class="quiz-review"><summary>Hibás válaszok áttekintése (${wrong.length})</summary><div>${wrong.map(([qi,oi])=>{const q=items[Number(qi)],o=q.options[Number(oi)];return `<article><strong>${Number(qi)+1}. ${esc(q.situation||q.question||'Kérdés')}</strong><p><b>Válaszod:</b> ${esc(o.text)}</p><p>${esc(o.feedback||o.explanation||'')}</p></article>`}).join('')}</div></details>`:''}${stats.answered?`<button class="button button--secondary quiz-restart" type="button" data-quiz-restart="${key}">Kvíz újrakezdése</button>`:''}</section>`}
function syncQuizProgressUI(key,items){const el=document.querySelector(`[data-quiz-progress-key="${key}"]`);if(el)el.outerHTML=quizResultMarkup(items,key)}
function moduleProgress(route){const entries=quizRegistry()[route]||[];if(!entries.length)return '';return `<section class="module-progress" aria-label="Kvízhaladás"><div class="module-progress__head"><span class="eyebrow eyebrow--dark">Összesített haladás</span><strong>Kvízek</strong></div><div class="module-progress__list">${entries.map(x=>{const st=quizStats(x.items,x.key);return `<div class="module-progress__item"><span>${esc(x.label)}</span><b>${st.correct}/${st.total}</b><i><em style="width:${st.percent}%"></em></i></div>`}).join('')}</div></section>`}
function resetQuiz(key){const st=state(),qa={...(st.quizAnswers||{})},vw={...(st.viewed||{})},indices={...(st.indices||{})};delete qa[key];Object.keys(vw).filter(k=>k.startsWith(`${key}-`)).forEach(k=>delete vw[k]);indices[key]=0;save({quizAnswers:qa,viewed:vw,indices});render(state().route,{preserveScroll:true})}

function customHomeSection(){const items=getCustomContent();return `<section class="custom-content-section"><div class="section-title"><div><span class="eyebrow eyebrow--dark">Bővíthető tartalom</span><h2 class="section-title__plain">Saját témák</h2></div></div>${items.length?`<div class="beta-grid">${items.map(x=>`<button class="custom-card" data-custom-route="${esc(x.id)}"><span class="custom-card__type">${esc(contentTypeLabels[x.type]||x.type)}</span><h3>${esc(x.title)}</h3><p>${esc(x.description||'Saját szerkesztésű tartalom')}</p></button>`).join('')}</div>`:'<p class="empty-custom">Még nincs saját tartalom. A szerkesztőben programozás nélkül hozhatsz létre új témákat.</p>'}<a class="button button--secondary content-manager-link" href="editor.html">Tartalomszerkesztő megnyitása</a></section>`}

function dashboardModuleLabel(route){
 const labels={
  onmagam:'QUIT & GO',
  helyzeteim:'QUICK WIN',
  kapcsolataim:'WIN-WIN',
  bonus:'GALAXY GUIDE'
 };
 return labels[route]||modules[route]?.title||route;
}
function homeProgressDashboard(){
 const routes=['onmagam','helyzeteim','kapcsolataim'];
 const rows=routes.map(route=>{
  const entries=quizRegistry()[route]||[];
  const totals=entries.reduce((acc,entry)=>{const st=quizStats(entry.items,entry.key);acc.total+=st.total;acc.answered+=st.answered;acc.correct+=st.correct;return acc},{total:0,answered:0,correct:0});
  totals.percent=totals.total?Math.round(totals.correct/totals.total*100):0;
  return {route,...totals};
 });
 const total=rows.reduce((acc,row)=>{acc.total+=row.total;acc.answered+=row.answered;acc.correct+=row.correct;return acc},{total:0,answered:0,correct:0});
 const percent=total.total?Math.round(total.correct/total.total*100):0;
 return `<details class="learning-dashboard" aria-labelledby="learning-dashboard-title"><summary class="learning-dashboard__toggle"><span class="learning-dashboard__toggle-row"><span class="learning-dashboard__heading"><svg class="learning-dashboard__trend" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17l6-6 4 4 6-7"></path><path d="M15 8h5v5"></path></svg><h2 id="learning-dashboard-title">Fejlődésed</h2></span><span class="learning-dashboard__chevron" aria-hidden="true"></span></span><span class="learning-dashboard__overall" aria-label="${percent}% teljesítve"><i style="width:${percent}%"></i></span></summary><div class="learning-dashboard__details"><div class="learning-dashboard__score" aria-label="${percent}% teljesítve"><strong>${percent}%</strong><span>${total.correct}/${total.total} helyes</span></div><div class="learning-dashboard__metrics"><span><b>${total.answered}</b><small>megválaszolt</small></span><span><b>${total.correct}</b><small>helyes</small></span><span><b>${Math.max(0,total.total-total.correct)}</b><small>100%-hoz hátra</small></span></div><div class="learning-dashboard__modules">${rows.map(row=>`<button type="button" class="learning-dashboard__module" data-route="${row.route}"><span><strong>${esc(dashboardModuleLabel(row.route))}</strong><small>${row.correct}/${row.total}</small></span><i aria-hidden="true"><em style="width:${row.percent}%"></em></i><b aria-hidden="true">→</b></button>`).join('')}</div></div></details>`;
}
function home(){const s=state(),continueRoute=modules[s.lastRoute]?s.lastRoute:'onmagam',last=modules[continueRoute]||modules.onmagam,homeContent=getContentSettings();return `<section class="hero"><div class="hero__copy"><span class="eyebrow">${esc(homeContent.heroEyebrow)}</span><h1 class="hero__title">${esc(homeContent.heroTitle)}</h1><p>${esc(homeContent.heroDescription)}</p></div><div class="hero__sky" aria-hidden="true"><img class="hero__sky-bottom" src="assets/SVG_ASSETS/INTRO/sky_rocket_hero_bottom.svg" alt=""><img class="hero__sky-ship" src="assets/SVG_ASSETS/INTRO/sky_rocket_ship.svg" alt=""></div></section><section class="continue-inline" data-route="${continueRoute}" role="link" tabindex="0" aria-label="Folytatás: ${esc(last.title)}"><div class="continue-inline__icon ${last.className}"><img src="${asset(last.icon)}" alt=""></div><div class="continue-inline__copy"><span class="eyebrow eyebrow--dark">Folytasd ott, ahol abbahagytad</span><h2 class="display-title">${last.code}</h2><p><strong>${last.title}</strong> · ${last.lead}</p></div><span class="circle-button" aria-hidden="true">→</span></section>${homeProgressDashboard()}<div class="section-title"><div><span class="eyebrow eyebrow--dark">Segédlet</span><h2 class="section-title__plain">Fedezd fel a témákat</h2></div></div><section class="module-grid">${Object.entries(modules).map(([k,m])=>`<button class="module-card ${m.className}" data-route="${k}"><span class="module-card__visual"><img src="${asset(m.icon)}" alt=""></span><span class="module-card__body"><span class="module-card__meta"><span>${m.time} perc</span></span><span class="module-card__display">${m.code}</span><span class="module-card__title">${m.title}</span><span class="module-card__lead">${esc(moduleExperience[k]?.cardText||m.lead)}</span><span class="module-card__action">Megnyitás <b>→</b></span></span></button>`).join('')}</section><section class="home-settings" aria-labelledby="home-settings-title"><div class="home-settings__head"><div><span class="eyebrow eyebrow--dark">Beállítások</span><h2 id="home-settings-title">Megjelenés és tesztelés</h2><p>A téma és az alkalmazás állapota ezen az eszközön marad meg.</p></div><strong class="home-settings__status" data-theme-status></strong></div><div class="home-theme-switch" role="group" aria-label="Színséma kiválasztása"><button type="button" data-theme-choice="light" aria-label="Világos mód">☀ <span>Világos</span></button><button type="button" data-theme-choice="system" aria-label="Automatikus színséma">◐ <span>Automatikus</span></button><button type="button" data-theme-choice="dark" aria-label="Sötét mód">☾ <span>Sötét</span></button></div><div class="home-settings__reset"><div><strong>Alkalmazás alaphelyzetbe állítása</strong><p>Törli a helyben mentett haladást, válaszokat és megjelenési beállításokat.</p></div><button class="button button--secondary home-reset-button" type="button" data-app-reset>Helyi adatok törlése</button></div><small class="home-settings__version">Útiterv Studio · BETA 1.2.5</small></section>`}

function shell(route,content){const m=modules[route],section=sectionFor(route),moduleIndex=moduleOrder.indexOf(route),sections=sectionMap[route];const isLastSection=sections?.[sections.length-1]?.[0]===section;const closing=isLastSection&&moduleExperience[route]?.closing?`<aside class="module-closing-message"><span class="eyebrow eyebrow--dark">Vidd magaddal!</span><p>${esc(moduleExperience[route].closing)}</p></aside>`:'';return `<header class="page-head ${m.className}" data-module-hero="${route}" data-hero-icon-mode="${esc(m.heroIconMode||'auto')}" aria-label="${m.title}. Húzd jobbra vagy balra a fő témák közötti váltáshoz."><div><span class="eyebrow">Gyakorlati segédlet</span><h1>${m.code}</h1><p class="page-head__subtitle">${m.title}</p><div class="module-swipe-dots" aria-hidden="true">${moduleOrder.map((_,i)=>`<span class="${i===moduleIndex?'is-current':''}"></span>`).join('')}</div></div><span class="page-head__icon page-head__icon--${m.className}" aria-hidden="true"><img src="${asset(m.thin)}" alt=""></span></header><div class="journey-tabs-shell"><nav class="topic-tabs journey-tabs" aria-label="${esc(m.title)} tartalmai">${sections.map(([id,l])=>`<button type="button" data-section="${id}" data-module="${route}" class="${section===id?'is-active':''}">${l}</button>`).join('')}</nav></div>${moduleProgress(route)}${content}${closing}`}
const head=(t,p,label="Segédlet")=>`<div class="guide-head"><span class="eyebrow eyebrow--dark">${esc(label)}</span><h2>${t}</h2><p>${p}</p></div>`;
function carousel(content,key,i,len){return `<div class="carousel-shell" data-carousel="${key}" data-index="${i}" data-length="${len}"><div class="carousel-peek carousel-peek--left" aria-hidden="true"></div><div class="carousel-stage">${content}</div><div class="carousel-peek carousel-peek--right" aria-hidden="true"></div></div>`}
function pager(key,i,len){return `<div class="pager" role="group" aria-label="Lapozás"><button data-step="${key}" data-dir="-1" aria-label="Előző oldal" ${i===0?'disabled':''}>← Előző</button><span aria-live="polite" aria-atomic="true">${i+1} / ${len}</span><button data-step="${key}" data-dir="1" aria-label="Következő oldal" ${i===len-1?'disabled':''}>Következő →</button></div>`}
function cards(items,render){return `<div class="beta-grid">${items.map(render).join('')}</div>`}
function quiz(items,key,title,desc){
 const i=Math.min(idx(key),items.length-1),q=items[i],answers=quizAnswersFor(key),hasChosen=Object.prototype.hasOwnProperty.call(answers,i),chosen=hasChosen?Number(answers[i]):null,chosenOption=hasChosen?q.options[chosen]:null;
 const feedback=chosenOption?`<div class="quiz-feedback ${chosenOption.isOptimal?'is-success':'is-guidance'}"><strong>${chosenOption.isOptimal?'Ez jó irány.':'Nézzünk egy még jobb megoldást!'}</strong><p>${esc(chosenOption.feedback||chosenOption.explanation||'Ez a választás is segít megérteni a helyzetet.')}</p></div>`:'<div class="quiz-feedback" hidden></div>';
 const nextAction=hasChosen?(i<items.length-1?`<button class="button quiz-next-question" type="button" data-quiz-next="${key}">Lépés a következő kérdésre →</button>`:`<div class="quiz-finish-note"><strong>Kvíz vége</strong><p>Az eredményed az aktuális kitöltés alapján látható lent.</p></div>`):'';
 return `${head(title,desc,"Kvíz")}<article class="quiz-card quiz-card--swipe" data-quiz-swipe="${key}" data-index="${i}" data-length="${items.length}"><span class="quiz-count">${i+1} / ${items.length}</span><h3>${esc(q.situation||q.question)}</h3><div class="quiz-options">${q.options.map((o,n)=>`<button data-quiz="${key}" data-qindex="${i}" data-option="${n}" ${hasChosen?'disabled':''} class="${hasChosen&&chosen===n?(o.isOptimal?'is-good is-selected':'is-not-best is-selected'):''}"><span>${esc(o.text)}</span>${hasChosen&&chosen===n?'<b>Kiválasztva</b>':''}</button>`).join('')}</div>${feedback}${nextAction}</article>${quizResultMarkup(items,key)}`;
}
function sideText(x,side){return side==='front'?(x.zText||x.amateur||x.definition||x.content||x.description||''):(x.employerText||x.pro||x.when||x.action||x.goodToKnow||x.phrase||'')}
function pagedCard(items,key){const i=Math.min(idx(key),items.length-1),x=items[i];const card=`<article class="single-topic-card"><div class="flip-topic__head"><span class="beta-card__number">${i+1} / ${items.length}</span></div><div class="single-topic-card__body"><h3>${esc(x.title||x.situation||x.term||'')}</h3><p>${esc(x.content||x.description||x.definition||x.zText||'')}</p></div></article>`;return `<div class="paged-topic">${carousel(card,key,i,items.length)}${pager(key,i,items.length)}</div>`}
function pagedPhrase(items,key){const i=Math.min(idx(key),items.length-1),x=items[i];const card=`<article class="flip-topic"><div class="flip-topic__head"><span class="beta-card__number">${i+1} / ${items.length}</span></div><button class="flip-card flip-card--winwin" type="button" data-flip-card aria-pressed="false" aria-label="Kártya megfordítása: ${esc(x.situation||'')}"><span class="flip-card__inner"><span class="flip-card__face flip-card__front"><strong class="flip-card__question">${esc(x.situation||'Helyzet')}</strong><span>Gondold végig, hogyan fogalmaznád meg professzionálisan.</span><small>Érintsd meg a megoldásért <b>↻</b></small></span><span class="flip-card__face flip-card__back"><strong>Ezt mondhatod</strong><span>${esc(x.phrase||'')}</span><small>Érintsd meg a visszafordításhoz <b>↺</b></small></span></span></button></article>`;return `<div class="paged-topic">${carousel(card,key,i,items.length)}${pager(key,i,items.length)}</div>`}
function pagedFlip(items,key,a,b,options={}){const i=Math.min(idx(key),items.length-1),x=items[i],title=x.title||x.situation||x.term||'';const uniqueTitle=title&&title!==`${a} és ${b}`;const frontAudience=options.frontAudience||'';const backAudience=options.backAudience||'';const isWinWin=key.startsWith('winwin');const isTwoSides=key==='winwinTwoSides';const flipClasses=['flip-card',isWinWin?'flip-card--winwin':'',isTwoSides?'flip-card--two-sides':''].filter(Boolean).join(' ');const frontHeading=isTwoSides?`<strong>${esc(x.zTitle||x.amateurTitle||a)}</strong>`:(key==='winwinCommunication'?`<strong>${esc(a||'Amatőr')}</strong>`:'');const card=`<article class="flip-topic"><div class="flip-topic__head"><span class="beta-card__number">${i+1} / ${items.length}</span>${uniqueTitle?`<h3>${esc(title)}</h3>`:''}</div><button class="${flipClasses}" type="button" data-flip-card aria-pressed="false" aria-label="Kártya megfordítása${title?`: ${esc(title)}`:''}"><span class="flip-card__inner"><span class="flip-card__face flip-card__front">${frontAudience?`<small class="perspective-label">${esc(frontAudience)}</small>`:''}${frontHeading}<span>${esc(sideText(x,'front'))}</span><small>Érintsd meg a másik oldalért <b>↻</b></small></span><span class="flip-card__face flip-card__back">${backAudience?`<small class="perspective-label">${esc(backAudience)}</small>`:''}<strong>${esc(x.employerTitle||x.proTitle||b)}</strong><span>${esc(sideText(x,'back'))}</span><small>Érintsd meg a visszafordításhoz <b>↺</b></small></span></span></button>${x.tip?`<aside class="flip-topic__tip">${esc(x.tip)}</aside>`:''}</article>`;return `<div class="paged-topic">${carousel(card,key,i,items.length)}${pager(key,i,items.length)}</div>`}
function pagedDigital(items,key){const i=Math.min(idx(key),items.length-1),x=items[i];const card=`<article class="flip-topic"><div class="flip-topic__head"><span class="beta-card__number">${i+1} / ${items.length}</span></div><button class="flip-card flip-card--winwin" type="button" data-flip-card aria-pressed="false" aria-label="Kártya megfordítása: ${esc(x.title)}"><span class="flip-card__inner"><span class="flip-card__face flip-card__front"><strong class="flip-card__question">${esc(x.title)}</strong><span>Gondold végig, mi lenne a tudatos digitális viselkedés ebben a témában.</span><small>Érintsd meg az irányelvért <b>↻</b></small></span><span class="flip-card__face flip-card__back"><strong>Tudatos irány</strong><span>${esc(x.content)}</span><small>Érintsd meg a visszafordításhoz <b>↺</b></small></span></span></button></article>`;return `<div class="paged-topic">${carousel(card,key,i,items.length)}${pager(key,i,items.length)}</div>`}

function cleanFlipFront(value=''){return String(value).replace(/^\s*[💡❓📌🎯⚡🚀✅🔹]+\s*/u,'').trim()}
function pagedSimpleFlip(items,key,frontLabel='Előlap',backLabel='Hátlap'){if(!items?.length)return '';const i=Math.min(idx(key),items.length-1),x=items[i];const front=cleanFlipFront(x.front||x.title||''),back=x.back||x.content||'';const card=`<article class="flip-topic"><div class="flip-topic__head"><span class="beta-card__number">${i+1} / ${items.length}</span></div><button class="flip-card" type="button" data-flip-card aria-pressed="false" aria-label="Kártya megfordítása: ${esc(front)}"><span class="flip-card__inner"><span class="flip-card__face flip-card__front"><strong class="flip-card__question">${esc(front)}</strong><small>Érintsd meg a másik oldalért <b>↻</b></small></span><span class="flip-card__face flip-card__back"><strong>${esc(backLabel)}</strong><span>${esc(back)}</span><small>Érintsd meg a visszafordításhoz <b>↺</b></small></span></span></button></article>`;return `<div class="paged-topic">${carousel(card,key,i,items.length)}${pager(key,i,items.length)}</div>`}
function seriesClosing(closing){if(!closing)return '';if(typeof closing==='string')return `<aside class="series-closing"><span class="eyebrow eyebrow--dark">Vidd magaddal!</span><p>${esc(closing)}</p></aside>`;return `<aside class="series-closing"><span class="eyebrow eyebrow--dark">Záró gondolat</span><h3>${esc(closing.front||'')}</h3><p>${esc(closing.back||'')}</p></aside>`}
function cvComparison(items,key){if(!items?.length)return '';const i=Math.min(idx(key),items.length-1),x=items[i];const card=`<article class="flip-topic cv-flip"><div class="flip-topic__head"><span class="beta-card__number">${i+1} / ${items.length}</span><h3>${esc(x.topic)}</h3></div><button class="flip-card" type="button" data-flip-card aria-pressed="false" aria-label="CV-kártya megfordítása: ${esc(x.topic)}"><span class="flip-card__inner"><span class="flip-card__face flip-card__front"><strong>Mit ne írj!</strong><span>${esc(x.dont)}</span><small>Érintsd meg: mit írj helyette? <b>↻</b></small></span><span class="flip-card__face flip-card__back"><strong>Mit írj!</strong><span>${esc(x.do)}</span><small>Érintsd meg a visszafordításhoz <b>↺</b></small></span></span></button></article>`;return `<div class="paged-topic">${carousel(card,key,i,items.length)}${pager(key,i,items.length)}</div>`}
function cvTipsCards(items,key='cvTips'){if(!items?.length)return '';const i=Math.min(idx(key),items.length-1),x=items[i];const card=`<article class="flip-topic cv-tip-flip"><div class="flip-topic__head"><span class="beta-card__number">${i+1} / ${items.length}</span></div><button class="flip-card" type="button" data-flip-card aria-pressed="false" aria-label="Z generációs CV-tipp megfordítása"><span class="flip-card__inner"><span class="flip-card__face flip-card__front"><strong>Ne tedd!</strong><span>${esc(x.dont)}</span><small>Érintsd meg: mit tegyél helyette? <b>↻</b></small></span><span class="flip-card__face flip-card__back"><strong>Tedd!</strong><span>${esc(x.do)}</span><small>Érintsd meg a visszafordításhoz <b>↺</b></small></span></span></button></article>`;return `<div class="paged-topic">${carousel(card,key,i,items.length)}${pager(key,i,items.length)}</div>`}
function cvTipsMarkup(){const tips=helyzeteim.cvTips||[],rule=helyzeteim.cvQuickRule;if(!tips.length&&!rule)return '';return `<section class="cv-tips"><span class="eyebrow eyebrow--dark">Z generációs CV-tippek</span>${tips.length?cvTipsCards(tips):''}${rule?`<aside class="series-closing"><strong>Gyors szabály</strong><p><b>Mit írj?</b> ${esc(rule.do)}</p><p><b>Mit ne írj?</b> ${esc(rule.dont)}</p></aside>`:''}</section>`}
function competencyDialog(){return `<dialog class="competency-dialog" data-competency-dialog><form method="dialog"><button type="button" class="competency-dialog__close" data-competency-close aria-label="Bezárás">×</button><span class="eyebrow eyebrow--dark" data-competency-profession-label></span><h3 data-competency-name></h3><section><strong>Kompetencia leírása</strong><p data-competency-description></p></section><section><strong class="work-example-label">Munkahelyi példa</strong><p data-competency-example></p></section></form></dialog>`}
function openCompetencyDialog(profession,index){const career=onmagam.blueCollarExamples.find(x=>x.from===profession),item=career?.competencies?.[Number(index)],dialog=document.querySelector('[data-competency-dialog]');if(!item||!dialog)return;dialog.querySelector('[data-competency-profession-label]').textContent=profession;dialog.querySelector('[data-competency-name]').textContent=item.name;dialog.querySelector('[data-competency-description]').textContent=item.description;dialog.querySelector('[data-competency-example]').textContent=item.example;dialog.showModal?.()}

function accordion(items){return `<div class="accordion-list">${items.map((x,i)=>`<details class="accordion-item"><summary><span class="accordion-icon">${x.icon||'🚩'}</span><strong>${esc(x.title||x.term||x.situation||`Vészjel ${i+1}`)}</strong><span class="accordion-chevron">⌄</span></summary><div class="accordion-body"><p>${esc(x.definition||x.content||x.description||x.zText||'')}</p>${(x.action||x.goodToKnow||x.when||x.tip)?`<aside><strong>Mit tehetsz?</strong><span>${esc(x.action||x.goodToKnow||x.when||x.tip)}</span></aside>`:''}</div></details>`).join('')}</div>`}
const groundingSteps=[
 {count:5,sense:'látsz',icon:'◉',prompt:'Nevezz meg 5 dolgot, amit most látsz a körülötted lévő térben.'},
 {count:4,sense:'érzel',icon:'✋',prompt:'Nevezz meg 4 dolgot, amit fizikailag érzel: például a széket a hátadon vagy a levegőt a bőrödön.'},
 {count:3,sense:'hallasz',icon:'◖',prompt:'Nevezz meg 3 hangot, amit most hallasz: forgalmat, légkondicionálót vagy a saját légzésedet.'},
 {count:2,sense:'szagolsz',icon:'≈',prompt:'Nevezz meg 2 illatot, amit most érzékelsz.'},
 {count:1,sense:'ízlelsz',icon:'●',prompt:'Nevezz meg 1 ízt, amit a szádban érzel.'}
];
const bodySteps=[
 {zone:'Lábfejek',cue:'Érezd a talajt a lábad alatt. Engedd el a feszültséget a lábujjaidban.'},
 {zone:'Lábszár',cue:'Figyeld a vádlidat és a sípcsontod. Van-e benne feszültség? Engedd lazulni.'},
 {zone:'Comb és csípő',cue:'Érezd, hogyan támaszkodik a tested a széken vagy a talajon. Engedd ellazulni.'},
 {zone:'Has és mellkas',cue:'Figyeld a légzésedet. Minden kilégzésnél engedd mélyebbre süllyedni a relaxációt.'},
 {zone:'Hát és váll',cue:'Sok stresszt hordozunk a vállunkban. Engedd le, lélegezz és lazulj el.'},
 {zone:'Nyak és állkapocs',cue:'Engedd le az állkapcsodat. Figyeld meg, mennyire volt összeszorítva.'},
 {zone:'Arc és homlok',cue:'Simítsd el a homlokod. Engedd lazulni a szemed körüli izmokat.'},
 {zone:'Teljes test',cue:'Figyelj az egész testedre. Nyugodt vagy. Minden izmod ellazult.'}
];
const guidedAudio={
 3:{src:'audio/vizualizacio-biztonsagos-hely.mp3',icon:'☀',duration:'2:09',intro:'Rövid mentális utazás egy olyan elképzelt helyre, ahol nyugodtnak és biztonságban érzed magad.',done:'Hozd magaddal ezt a nyugalmat és biztonságérzetet a napod hátralévő részébe.'},
 4:{src:'audio/aranybuborek.mp3',icon:'✦',duration:'2:20',intro:'Vezetett vizualizáció, amely segít kialakítani a saját mentális védelmi teredet.',done:'Te döntöd el, mit engedsz közel magadhoz.'},
 5:{src:'audio/tedd-le-a-hatizsakot.mp3',icon:'▱',duration:'2:35',intro:'Segít szétválasztani, mivel kell most foglalkoznod, és mit tehetsz félre későbbre.',done:'Nem kell mindent egyszerre megoldanod. A következő kis lépés elég.'}
};
function groundingIcon(index){const icons=[
 `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M5 24s7-11 19-11 19 11 19 11-7 11-19 11S5 24 5 24Z"/><circle cx="24" cy="24" r="5"/></svg>`,
 `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M16 25V12a3 3 0 0 1 6 0v10-13a3 3 0 0 1 6 0v13-10a3 3 0 0 1 6 0v13-7a3 3 0 0 1 6 0v10c0 9-6 15-15 15h-2c-5 0-9-2-12-6l-5-7a3.5 3.5 0 0 1 5-5l5 4Z"/></svg>`,
 `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M26 40c-7 0-12-5-12-12V18C14 10 19 5 26 5s12 5 12 13c0 7-4 10-8 12-3 2-3 5-3 7"/><path d="M20 19c0-4 2-7 6-7s6 3 6 7c0 3-2 5-5 6-3 1-5 3-5 6"/></svg>`,
 `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M25 6c-1 9-5 15-5 22 0 5 3 8 8 8h5"/><path d="M20 36c3 4 8 5 13 2"/></svg>`,
 `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M7 25c5-6 11-9 17-9s12 3 17 9c-5 6-11 9-17 9S12 31 7 25Z"/><path d="M11 25h26"/></svg>`
];return icons[index]||icons[0]}
function phaseDots(length,current){return `<div class="phase-dots" aria-label="${current+1} / ${length}">${Array.from({length},(_,n)=>`<span class="${n===current?'is-current':''}" aria-hidden="true"></span>`).join('')}</div>`}
function groundingExperience(){
 const key='groundingStep',i=Math.min(idx(key),groundingSteps.length-1),x=groundingSteps[i];
 const content=`<article class="mindfulness-card grounding-card">${phaseDots(groundingSteps.length,i)}<div class="grounding-icon grounding-icon--outline" aria-hidden="true">${groundingIcon(i)}</div><div class="grounding-count"><strong>${x.count}</strong><span>dolgot</span></div><h3>amit ${esc(x.sense)}</h3><p>${esc(x.prompt)}</p></article>`;
 return `${carousel(content,key,i,groundingSteps.length)}${pager(key,i,groundingSteps.length)}`;
}
function bodyScanExperience(){
 const st=state().mindfulness||{},active=st.bodyScanActive,done=st.bodyScanDone,i=Math.min(st.bodyScanStep||0,bodySteps.length-1),left=st.bodyScanRemaining??20,x=bodySteps[i];
 if(done)return `<article class="mindfulness-card mindfulness-complete"><div class="mindfulness-complete__icon">✓</div><h3>Kész a pásztázás!</h3><p>Vidd magaddal ezt a nyugodtabb testi érzetet a nap hátralévő részébe.</p><button class="button" data-body-scan-start>Újra</button></article>`;
 if(!active)return `<article class="mindfulness-card mindfulness-intro"><div class="mindfulness-icon">◌</div><p>Végigpásztázod a tested, zónáról zónára oldva a feszültséget. Minden állomás 20 másodpercig tart, és automatikusan lép tovább.</p><button class="button" data-body-scan-start>Kezdjük</button></article>`;
 const progress=((20-left)/20)*100;
 return `<article class="mindfulness-card body-scan-card" data-body-scan-card>${phaseDots(bodySteps.length,i)}<span class="eyebrow eyebrow--dark" data-body-scan-count>${i+1} / ${bodySteps.length}</span><h3 data-body-scan-zone>${esc(x.zone)}</h3><p data-body-scan-cue>${esc(x.cue)}</p><div class="body-scan-timer"><strong>${left}</strong><span>mp</span></div><button class="button button--ghost" data-body-scan-stop>Leállítás</button></article>`;
}
function gratitudeExperience(item){
 const entries=state().mindfulness?.entries||['','',''];
 return `<article class="mindfulness-card"><div class="mindfulness-card__top"><span class="mindfulness-icon">♡</span><div><span class="eyebrow eyebrow--dark">${esc(item.tag)}</span><h3>${esc(item.title)}</h3></div></div><p class="mindfulness-description">${esc(item.description)}</p><div class="gratitude-fields">${entries.map((v,n)=>`<label><span>${n+1}. gondolat</span><input data-gratitude value="${esc(v)}" placeholder="Írj ide egy rövid gondolatot…"></label>`).join('')}</div><div class="mindfulness-controls"><button class="button" data-gratitude-save>Gondolatok mentése</button></div></article>`;
}
function guidedTranscriptMarkup(item,index){
 if(!item?.transcript?.length)return '';
 const panelId=`guided-transcript-panel-${index}`;
 const paragraphs=item.transcript.map(line=>{const cue=/^\s*\[.*\]\s*$/.test(line);return `<p class="${cue?'is-cue':''}">${esc(line)}</p>`}).join('');
 return `<section class="guided-transcript"><button type="button" class="guided-transcript__toggle" data-transcript-toggle aria-expanded="false" aria-controls="${panelId}"><span>${esc(item.fallbackTitle||'Nem működik a hang? Olvasd el a gyakorlatot!')}</span><span class="guided-transcript__chevron" aria-hidden="true"></span></button><div class="guided-transcript__body" id="${panelId}" data-transcript-panel hidden>${item.fallbackHelp?`<p class="guided-transcript__help">${esc(item.fallbackHelp)}</p>`:''}<h4>${esc(item.transcriptTitle||'Teljes felolvasási szöveg')}</h4>${paragraphs}</div></section>`;
}
function guidedAudioExperience(item,index){
 const cfg=guidedAudio[index],id=`mind-audio-${index}`;
 return `<article class="mindfulness-card guided-audio-card" data-guided-card><div class="guided-audio-intro"><div class="guided-audio-orb" data-audio-orb>${cfg.icon}</div><span class="eyebrow eyebrow--dark">Vezetett hanganyag · ~${cfg.duration}</span><h3>${esc(item.title)}</h3><p>${esc(cfg.intro)}</p></div><audio id="${id}" preload="metadata" src="${cfg.src}"></audio><div class="guided-player"><div class="guided-progress" data-audio-seek data-audio-id="${id}" role="slider" tabindex="0" aria-label="Lejátszási pozíció" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i data-audio-progress></i></div><div class="guided-time"><span data-audio-current>0:00</span><span data-audio-duration>${cfg.duration}</span></div><div class="guided-controls"><button data-audio-restart data-audio-id="${id}" aria-label="Újraindítás">↺</button><button class="guided-play" data-audio-toggle data-audio-id="${id}" aria-label="Lejátszás">▶</button></div><label class="guided-volume"><span>Hangerő</span><input type="range" min="0" max="1" step="0.05" value="0.85" data-audio-volume data-audio-id="${id}"></label></div><aside class="mindfulness-takeaway"><strong>Vidd magaddal!</strong><span>${esc(cfg.done)}</span></aside>${guidedTranscriptMarkup(item,index)}</article>`;
}
function mindfulnessExperience(items){
 return `<div class="mindfulness-accordion">${items.map((x,i)=>{
  let content='';
  if(i===0)content=groundingExperience();
  else if(i===1)content=bodyScanExperience();
  else if(i===2)content=gratitudeExperience(x);
  else content=guidedAudioExperience(x,i);
  return `<details class="mindfulness-accordion__item" data-mindfulness-index="${i}" ${i===0?'open':''}><summary><span class="mindfulness-accordion__index">${String(i+1).padStart(2,'0')}</span><span class="mindfulness-accordion__copy"><small>${esc(x.tag||'Gyakorlat')}</small><strong>${esc(x.title)}</strong></span><span class="mindfulness-accordion__chevron" aria-hidden="true">⌄</span></summary><div class="mindfulness-accordion__body">${content}</div></details>`;
 }).join('')}</div>`;
}
function onmagamPage(){const s=sectionFor('onmagam');let c='';if(s==='preboarding'){const i=Math.min(idx('preboarding'),onmagam.preboardingData.length-1),x=onmagam.preboardingData[i];c=`${head('Preboarding túlélőkészlet','12 gyakori kérdés az első munkanap előtt.')}${carousel(`<article class="qa-card"><h3>${esc(x.question)}</h3><div class="qa-answer"><p>${esc(x.answer)}</p></div></article>`,'preboarding',i,onmagam.preboardingData.length)}${pager('preboarding',i,onmagam.preboardingData.length)}`}
if(s==='survival'){const i=Math.min(idx('survival'),onmagam.survivalGuideData.length-1),x=onmagam.survivalGuideData[i];c=`${head('Pályakezdő mentőmellény','12 hónap – 12 kapaszkodó az első munkaévhez.')}${carousel(`<article class="month-card"><span class="month-badge">${x.month}. hónap</span><h3>${esc(x.title)}</h3><p>${esc(x.content)}</p><aside><strong>Vidd magaddal!</strong><span>${esc(x.takeaway)}</span></aside></article>`,'survival',i,onmagam.survivalGuideData.length)}${pager('survival',i,onmagam.survivalGuideData.length)}`}
if(s==='marketfacts')c=`${head('Tudtad-e?','Munkaerőpiaci érdekességek röviden, egy kártyán egy gondolat.')}${pagedSimpleFlip(onmagam.marketFacts,'marketFacts','Tudtad-e?','Érdekesség')}${seriesClosing(onmagam.marketFactsClosing)}`
if(s==='breathing'){const techniques=[
 {name:'Dobozlégzés',inhale:4,hold:4,exhale:4,ratio:'4–4–4',description:'Stabil, háromrészes ritmus: belégzés, bent tartás és kilégzés ugyanannyi ideig.'},
 {name:'Megnyugtató',inhale:4,hold:7,exhale:8,ratio:'4–7–8',description:'A hosszú kilégzés segíthet lelassítani a tested stresszreakcióját és megérkezni a jelenbe.'},
 {name:'Egyensúlyozó',inhale:5,hold:0,exhale:5,ratio:'5–5',description:'Egyszerű, egyenletes ritmus bent tartás nélkül: öt másodperc belégzés, öt másodperc kilégzés.'}
];c=`${head('Légzéstechnikák','Válassz egy technikát. Nyisd le, majd kövesd a kör ritmusát és az aktuális fázist.')}<div class="breathing-accordion">${techniques.map((x,n)=>`<details class="breathing-accordion__item"><summary><span class="breathing-accordion__index">${String(n+1).padStart(2,'0')}</span><span class="breathing-accordion__copy"><small>${x.ratio}</small><strong>${x.name}</strong></span><span class="breathing-accordion__chevron" aria-hidden="true">⌄</span></summary><div class="breathing-accordion__body"><p>${x.description}</p><div class="breath-player"><div class="breath-player__title"><span class="eyebrow eyebrow--dark">${x.ratio}</span><strong data-breath-name>${x.name}</strong></div><div class="breath-orb is-ready" aria-live="polite"><div class="breath-orb__content"><strong data-breath-phase>KÉSZEN ÁLLSZ?</strong><span data-breath-count>–</span></div></div><div class="breath-player__actions"><button class="button" data-restart-breath data-in="${x.inhale}" data-hold="${x.hold}" data-out="${x.exhale}" data-name="${x.name}">Kezdés</button><button class="button button--secondary" data-stop-breath hidden>Leállítás</button></div></div></div></details>`).join('')}</div>`}
if(s==='mindfulness')c=`${head('Mindfulness technikák','Rövid gyakorlatok stressz, szorongás és mentális túlterheltség esetére.')}${mindfulnessExperience(onmagam.mindfulnessExercises)}`
if(s==='careers')c=`${head('Kékgalléros karrierutak','Egy szakma nem végállomás, hanem fejlődési lehetőség. Érintsd meg a kompetenciákat a részletes leírásért és munkahelyi példáért.')}${cards(onmagam.blueCollarExamples,x=>`<article class="career-card"><span class="career-from">${esc(x.from)}</span><div class="career-steps">${x.steps.map(y=>`<span>${esc(y)}</span>`).join('<b>›</b>')}</div><p>${esc(x.motivation)}</p><div class="chip-row">${(x.competencies||[]).map((y,n)=>`<button class="chip competency-chip" type="button" data-competency-profession="${esc(x.from)}" data-competency-index="${n}">${esc(y.name)}</button>`).join('')}</div></article>`)}${competencyDialog()}`;
if(s==='quiz')c=quiz(onmagam.onmagamQuizItems,'onmagamQuiz','Munkahelyi helyzetek','Nézd végig bátran az összes lehetőséget.');return shell('onmagam',c)}

function helyzeteimPage(){const s=sectionFor('helyzeteim');let c='';
 if(s==='world')c=`${head('A munka világa','Íratlan szabályok és gyakorlati kapaszkodók.')}${pagedCard(helyzeteim.workWorldCards,'workWorldCards')}${seriesClosing(helyzeteim.workWorldClosing)}${quiz(helyzeteim.workWorldQuiz,'workWorldQuiz','Ellenőrző kvíz','Valósághű helyzetek az első hetekből.')}`;
 if(s==='jobhunt')c=`${head('Állásvadászat Z módra','12 rövid tipp, hogy tudatosabban és magabiztosabban keress állást.')}${pagedSimpleFlip(helyzeteim.jobHuntCards,'jobHuntCards','Tipp','Mit jelent?')}${seriesClosing(helyzeteim.jobHuntClosing)}`;
 if(s==='interview')c=`${head('Interjú kérdés–válasz','Gyakori interjúkérdések és használható mintaválaszok.')}${pagedSimpleFlip(helyzeteim.interviewCards,'interviewCards','Interjúkérdés','Minta válasz')}${seriesClosing(helyzeteim.interviewClosing)}`;
 if(s==='cv')c=`${head('Önéletrajz: mit írj, mit kerülj?','Forgasd meg a kártyákat, és hasonlítsd össze a jó és kerülendő megoldásokat.')}${cvComparison(helyzeteim.cvCards,'cvCards')}${cvTipsMarkup()}`;
 if(s==='linkedin')c=`${head('LinkedIn tippek','12 praktikus lépés a hiteles és naprakész szakmai profilhoz.')}${pagedSimpleFlip(helyzeteim.linkedinCards,'linkedinCards','Tipp','Mit tegyél?')}${seriesClosing(helyzeteim.linkedinClosing)}`;
 if(s==='firstday'){const checked=state().checklist||[];c=`${head('Első napi ellenőrzőlista','Készülj fel nyugodtan, egy lépésben egyszerre.')}<div class="checklist">${helyzeteim.firstDayChecklist.map(x=>`<label><input type="checkbox" data-check="${x.id}" ${checked.includes(x.id)?'checked':''}><span>${esc(x.text)}</span></label>`).join('')}</div>${quiz(helyzeteim.firstDayQuiz,'firstDayQuiz','Ellenőrző kvíz','Gyakorold a nyugodt, felkészült reakciókat.')}`}
 if(s==='redflags')c=`${head('Munkahelyi vészjelek','Minden vészjel áttekinthető; érintésre lenyílik a magyarázat.')}${accordion(helyzeteim.redFlags)}${quiz(helyzeteim.redFlagQuiz,'redFlagQuiz','Ellenőrző kvíz','Fedezd fel a biztonságos, professzionális reakciókat.')}`;
 if(s==='legal')c=`${head('Munkajogi alapok','A legfontosabb tudnivalók közérthetően.')}${pagedFlip(helyzeteim.legalBasics,'legalBasicsCards','Lényeg','Jó tudni')}${quiz(helyzeteim.legalBasicsQuiz,'legalQuiz','Ellenőrző kvíz','Mit érdemes tenni aláírás és döntés előtt?')}`;
 if(s==='scenarios')c=quiz(helyzeteim.helyzeteiScenarios,'helyzetQuiz','Ellenőrző kvíz','Minden válasz tanít valamit a helyzetről.');
 return shell('helyzeteim',c)}

function kapcsolataimPage(){const s=sectionFor('kapcsolataim');let c='';
 if(s==='twosides')c=`${head('Két oldal, egy megoldás','Értsd meg egyszerre a saját és a munkaadói nézőpontot.')}${pagedFlip(kapcsolataim.ketOldalData,'winwinTwoSides','Fiatal nézőpont','Munkaadói nézőpont',{frontAudience:'Z-generáció elvárása',backAudience:'Munkaadó elvárása'})}`;
 if(s==='generations')c=`${head('Generációk együttműködése','A különböző tapasztalatok és munkastílusok akkor működnek jól, ha kiegészítik egymást.')}${pagedSimpleFlip(kapcsolataim.generationCards,'generationCards','Téma','Üzenet')}${seriesClosing(kapcsolataim.generationClosing)}`;
 if(s==='communication')c=`${head('Kommunikáció','Ugyanaz a mondat lehet amatőr vagy profi.')}${pagedFlip(kapcsolataim.communicationFlips,'winwinCommunication','Amatőr','Profi')}${quiz(kapcsolataim.komunikációQuiz,'commQuiz','Ellenőrző kvíz','Keresd a mindkét fél számára működő megoldást.')}`;
 if(s==='phrases')c=`${head('Pro mondatok','Használható mondatok nehéz helyzetekre.')}${pagedPhrase(kapcsolataim.proPhrases,'winwinPhrases')}${quiz(kapcsolataim.proSzóhasználatQuiz,'phraseQuiz','Ellenőrző kvíz','Válaszd a konkrét és együttműködő megfogalmazást.')}`;
 if(s==='digital')c=`${head('Digitális viselkedés','Chat, e-mail és online jelenlét a munkahelyen.')}${pagedDigital(kapcsolataim.digitalBehavior,'winwinDigital')}${quiz(kapcsolataim.digitálisViselkedésQuiz,'digitalQuiz','Ellenőrző kvíz','Találd meg a megfelelő csatornát és hangnemet.')}`;
 if(s==='glossary')c=`${head('Munkahelyi fogalomtár','12 kifejezés, amit jó ismerni az első naptól.')}${pagedFlip(kapcsolataim.glossary,'winwinGlossary','Mit jelent?','Mikor találkozol vele?')}${quiz(kapcsolataim.fogalomtárQuiz,'glossaryQuiz','Ellenőrző kvíz','Használd magabiztosan az alapfogalmakat.')}`;
 return shell('kapcsolataim',c)}
function bonusPage(){const s=sectionFor('bonus');let c='';if(s==='materials'){const cats=[...new Set(bonus.bonusMaterials.map(x=>x.category))];c=`${head('Galaxy Guide','Gyakorlati anyagok, amikor gyors kapaszkodóra van szükséged.')}${cats.map(cat=>`<section class="bonus-section"><h3>${esc(cat)}</h3>${cards(bonus.bonusMaterials.filter(x=>x.category===cat),x=>`<article class="beta-card bonus-card"><span class="status-pill ${x.status==='live'?'is-live':''}">${x.status==='live'?'Elérhető':'Hamarosan'}</span><h3>${esc(x.title)}</h3><p>${esc(x.description)}</p></article>`)}</section>`).join('')}`};if(s==='videos')c=`${head('Videós történetek','Valódi szakmák, valódi utak.')}${cards(bonus.videoStories,x=>`<article class="beta-card bonus-card"><span class="status-pill ${x.status==='live'?'is-live':''}">${x.status==='live'?'Elérhető':'Hamarosan'}</span><span class="eyebrow eyebrow--dark">${esc(x.profession)}</span><h3>${esc(x.title)}</h3><p>${esc(x.description)}</p></article>`)}`;return shell('bonus',c)}
function privacyPage(){return `${head('Adatvédelem','Helyi adattárolás és jogi információk.')}<section class="privacy-page" aria-labelledby="privacy-title"><article class="privacy-card"><span class="eyebrow eyebrow--dark">Adatkezelési tájékoztató</span><h2 id="privacy-title">Az alkalmazás adatkezelése</h2><p>Az Útiterv Studio használatához nem szükséges regisztráció vagy felhasználói fiók. Az alkalmazás felülete nem küldi el a kitöltött válaszokat, a haladási adatokat vagy a megjelenési beállításokat az OFA Nonprofit Kft. részére, illetve harmadik félnek.</p><h3>Helyi adattárolás</h3><p>A haladás, a válaszok és a megjelenési beállítások kizárólag a használt böngésző helyi tárhelyén tárolódnak. Ide tartozhat a Local Storage és a PWA offline működéséhez szükséges Cache Storage.</p><p>Az adatok a főoldali <strong>Helyi adatok törlése</strong> gombbal, a böngésző webhelyadatainak törlésével vagy az alkalmazás eltávolításával törölhetők.</p><h3>Offline működés és hálózati kapcsolatok</h3><p>Az alkalmazás a saját fájljait ugyanarról a tárhelyről tölti le, ahonnan az alkalmazás megnyílt, majd ezek egy részét az offline használathoz helyben gyorsítótárazza. Nem tartalmaz analitikai, reklám- vagy felhasználókövető kódot. A felület BBH Bartle és DM Sans betűkészletei jelenleg a Google Fonts szolgáltatásából töltődhetnek be, ezért online használatkor ehhez technikai hálózati kérés történhet; az alkalmazás válasz- és haladási adatokat ezen keresztül sem továbbít.</p><p>A weboldal elérésekor a tárhelyszolgáltató a működéshez és biztonsághoz szükséges technikai naplóadatokat – például IP-címet, időpontot és böngészőadatokat – kezelhet. Ennek részleteit a közzétételhez használt tárhelyszolgáltató adatkezelési feltételei határozzák meg.</p><h3>Cookie-k</h3><p>Az alkalmazás nem használ marketing- vagy analitikai cookie-kat. A helyi tárhely használata kizárólag az alkalmazás működését, a beállítások megőrzését és az offline elérést szolgálja.</p><h3>Adatkezelő és impresszum</h3><dl class="privacy-details"><div><dt>Adatkezelő és kiadó</dt><dd>OFA Nonprofit Kft.</dd></div><div><dt>Alkalmazás</dt><dd>Útiterv Studio – BETA 3.4.2</dd></div><div><dt>Kapcsolat</dt><dd>Az OFA Nonprofit Kft. hivatalos kapcsolattartási csatornáin.</dd></div></dl><p class="privacy-note"><strong>Fontos:</strong> ez a tájékoztató az alkalmazás jelenlegi BETA 3.4.2 verziójának technikai működését írja le. Új online funkció, analitika, hibajelentés, kapcsolatfelvételi űrlap vagy felhőszinkron bevezetése esetén a tájékoztatót frissíteni kell.</p></article><button class="button button--secondary" data-route="home">Vissza a főoldalra</button></section>`}

function systemPage(){return `${head('Design System 1.0','A Beta közös vizuális és interakciós alapjai.')}<section class="theme-settings"><div class="theme-settings__row"><div><span class="eyebrow">Megjelenés</span><h3>Világos és sötét mód</h3><p>A beállítás ezen az eszközön automatikusan megmarad. Jelenleg: <strong data-theme-status></strong>.</p></div><button class="theme-toggle" type="button" data-theme-toggle aria-label="Téma váltása"><span data-theme-icon aria-hidden="true">☾</span></button></div><div class="theme-choice"><button type="button" data-theme-choice="light">Világos</button><button type="button" data-theme-choice="dark">Sötét</button><button type="button" data-theme-choice="system">Rendszer szerint</button></div></section><section class="system-section"><h2>Alapelvek</h2><div class="principle-grid"><article><strong>Whitespace first</strong><span>A levegő a tartalom része.</span></article><article><strong>Egy döntés képernyőnként</strong><span>Nem terhelünk túl.</span></article><article><strong>Segíts, ne vizsgáztass</strong><span>Minden válasz tanít valamit.</span></article></div></section><button class="button button--secondary" data-route="home">Vissza</button>`}

const reducedMotion=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
function haptic(pattern=8){if(!reducedMotion()&&navigator.vibrate)navigator.vibrate(pattern)}
function enhanceRenderedUI(route){
 if(menuButton)menuButton.hidden=route==='home';
 document.querySelectorAll('.app-menu__nav [data-route]').forEach(button=>{const active=button.dataset.route===route;button.classList.toggle('is-active',active);button.setAttribute('aria-current',active?'page':'false')});
 document.querySelectorAll('.nav-item').forEach(button=>{
  const active=button.dataset.route===route;
  button.setAttribute('aria-current',active?'page':'false');
 });
 document.querySelectorAll('.journey-tabs').forEach(bindJourneyTabs);
 document.querySelectorAll('.journey-tabs button').forEach(button=>{
  const active=button.classList.contains('is-active');
  button.setAttribute('aria-current',active?'page':'false');
 });
 document.querySelectorAll('details').forEach((details,index)=>{
  const summary=details.querySelector(':scope > summary');
  const body=summary?.nextElementSibling;
  if(!summary||!body)return;
  if(!body.id)body.id=`accordion-panel-${index}`;
  summary.setAttribute('role','button');
  summary.setAttribute('aria-controls',body.id);
  summary.setAttribute('aria-expanded',String(details.open));
 });
 document.querySelectorAll('[data-carousel]').forEach(shell=>{
  shell.setAttribute('role','region');
  shell.setAttribute('aria-roledescription','carousel');
  shell.setAttribute('aria-label',`Kártya ${Number(shell.dataset.index)+1} / ${shell.dataset.length}`);
 });
 observeCareerCompetencyHints();
 showFlipCardHint();
}

function observeCareerCompetencyHints(){
 const cards=[...document.querySelectorAll('.career-card')].filter(card=>card.querySelector('.competency-chip'));
 if(!cards.length||reducedMotion())return;
 if(!('IntersectionObserver' in window)){cards.forEach(card=>card.classList.add('is-competency-visible'));return}
 const observer=new IntersectionObserver(entries=>{
  entries.forEach(entry=>{
   if(!entry.isIntersecting||entry.intersectionRatio<.42)return;
   entry.target.classList.add('is-competency-visible');
   observer.unobserve(entry.target);
  });
 },{threshold:[.42,.58],rootMargin:'0px 0px -8% 0px'});
 cards.forEach(card=>observer.observe(card));
}

function showFlipCardHint(){
 if(reducedMotion())return;
 const card=document.querySelector('[data-flip-card]');
 if(!card)return;
 window.setTimeout(()=>{
  if(!card.isConnected||card.classList.contains('is-flipped'))return;
  card.classList.remove('is-flip-hint');
  void card.offsetWidth;
  card.classList.add('is-flip-hint');
  card.addEventListener('animationend',()=>card.classList.remove('is-flip-hint'),{once:true});
 },180);
}
const menu=document.querySelector('#app-menu');
const menuBackdrop=document.querySelector('.menu-backdrop');
const menuButton=document.querySelector('[data-menu-open]');
let menuReturnFocus=null;
function openAppMenu(){
 if(!menu||!menuBackdrop||!menuButton)return;
 menuReturnFocus=document.activeElement;
 menu.hidden=false;menuBackdrop.hidden=false;
 requestAnimationFrame(()=>{document.body.classList.add('menu-is-open');menu.classList.add('is-open');menuBackdrop.classList.add('is-open')});
 menu.setAttribute('aria-hidden','false');menuButton.setAttribute('aria-expanded','true');
 menu.querySelector('[data-route]')?.focus();
}
function closeAppMenu(restoreFocus=true){
 if(!menu||!menuBackdrop||!menuButton)return;
 document.body.classList.remove('menu-is-open');menu.classList.remove('is-open');menuBackdrop.classList.remove('is-open');
 menu.setAttribute('aria-hidden','true');menuButton.setAttribute('aria-expanded','false');
 setTimeout(()=>{if(!menu.classList.contains('is-open')){menu.hidden=true;menuBackdrop.hidden=true}},260);
 if(restoreFocus)menuReturnFocus?.focus?.();
}
function updateJourneyTabsEdges(tabs){if(!tabs)return;const shell=tabs.closest('.journey-tabs-shell');if(!shell)return;const max=Math.max(0,tabs.scrollWidth-tabs.clientWidth);const overflowing=max>2;shell.classList.toggle('is-overflowing',overflowing);shell.classList.toggle('has-left-overflow',overflowing&&tabs.scrollLeft>2);shell.classList.toggle('has-right-overflow',overflowing&&tabs.scrollLeft<max-2)}
function bindJourneyTabs(tabs){if(!tabs||tabs.dataset.edgeBound==='true')return;tabs.dataset.edgeBound='true';const update=()=>updateJourneyTabsEdges(tabs);tabs.addEventListener('scroll',update,{passive:true});requestAnimationFrame(update)}
function centerActiveTopicTab(tabs,{smooth=false}={}){const active=tabs?.querySelector('.is-active');if(!tabs||!active)return;const target=Math.max(0,Math.min(tabs.scrollWidth-tabs.clientWidth,active.offsetLeft-(tabs.clientWidth-active.offsetWidth)/2));if(smooth&&!reducedMotion())tabs.scrollTo({left:target,behavior:'smooth'});else tabs.scrollLeft=target;requestAnimationFrame(()=>updateJourneyTabsEdges(tabs))}

function applyAdaptiveHeroIconTone(){
 const head=document.querySelector('.page-head[data-module-hero]');
 if(!head)return;
 const mode=(head.dataset.heroIconMode||'auto').toLowerCase();
 if(mode==='dark'||mode==='light'){head.dataset.heroIconTone=mode;return}
 const moduleId=head.dataset.moduleHero||'';
 const fallbackTone={onmagam:'light',helyzeteim:'dark',kapcsolataim:'light',bonus:'light'}[moduleId];
 const color=getComputedStyle(head).backgroundColor;
 const match=color.match(/rgba?\(([^)]+)\)/i);
 if(!match){head.dataset.heroIconTone=fallbackTone||'light';return}
 const values=match[1].split(',').slice(0,3).map(value=>Number.parseFloat(value.trim())/255);
 const linear=values.map(value=>value<=.04045?value/12.92:Math.pow((value+.055)/1.055,2.4));
 const luminance=.2126*linear[0]+.7152*linear[1]+.0722*linear[2];
 const alphaParts=match[1].split(',');
 const alpha=alphaParts.length>3?Number.parseFloat(alphaParts[3]):1;
 head.dataset.heroIconTone=alpha===0?(fallbackTone||'light'):(luminance>.38?'dark':'light');
}

function render(route='home',{preserveScroll=false,focusActiveTab=false,scrollToTabs=false}={}){const enteringModule=route!==previousRenderedRoute&&Boolean(moduleExperience[route]);closeAppMenu(false);const previousY=window.scrollY;const previousTabs=document.querySelector('.journey-tabs');const previousTabsScroll=previousTabs?.scrollLeft??0;const patch={route};if(route!=='home'&&Object.prototype.hasOwnProperty.call(modules,route))patch.lastRoute=route;save(patch);document.querySelector('.version').textContent='BETA 3.4.2';view.innerHTML=route==='home'?home():route==='onmagam'?onmagamPage():route==='helyzeteim'?helyzeteimPage():route==='kapcsolataim'?kapcsolataimPage():route==='bonus'?bonusPage():route==='privacy'?privacyPage():route.startsWith('custom:')?customPage(route.slice(7)):systemPage();document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('is-active',b.dataset.route===route));if(route!=='home'&&Object.prototype.hasOwnProperty.call(sectionMap,route)){const active=sectionFor(route);document.querySelectorAll('.journey-tabs button').forEach(b=>b.classList.toggle('is-active',b.dataset.section===active))}enhanceRenderedUI(route);window.UtitervTheme?.apply();applyAdaptiveHeroIconTone();enhanceTopicBoundaryNavigation(route);view.classList.toggle('is-entering',!preserveScroll);const initialTabs=document.querySelector('.journey-tabs');if(initialTabs&&!preserveScroll)centerActiveTopicTab(initialTabs);requestAnimationFrame(()=>{if(preserveScroll)window.scrollTo({top:previousY,behavior:'instant'});const tabs=document.querySelector('.journey-tabs');if(tabs&&preserveScroll&&!focusActiveTab){tabs.scrollLeft=previousTabsScroll;updateJourneyTabsEdges(tabs)}if(tabs&&focusActiveTab)centerActiveTopicTab(tabs,{smooth:true});if(scrollToTabs){const shell=document.querySelector('.journey-tabs-shell');if(shell){const topbar=document.querySelector('.topbar');const offset=(topbar?.offsetHeight||64)+10;const top=Math.max(0,shell.getBoundingClientRect().top+window.scrollY-offset);window.scrollTo({top,behavior:reducedMotion()?'auto':'smooth'})}}});if(!preserveScroll&&!scrollToTabs)window.scrollTo({top:0,behavior:'auto'});if(enteringModule)setTimeout(()=>{try{showModuleIntro(route)}catch(error){console.warn('Module intro skipped:',error)}},180);previousRenderedRoute=route}
window.addEventListener('resize',()=>document.querySelectorAll('.journey-tabs').forEach(updateJourneyTabsEdges),{passive:true});
let breathTimer=null,breathTickTimer=null,breathConfig=null;
function clearBreathTimers(){clearTimeout(breathTimer);clearInterval(breathTickTimer);breathTimer=null;breathTickTimer=null}
function startBreath(){
 if(!breathConfig)return;
 clearBreathTimers();
 const orb=breathConfig.player?.querySelector('.breath-orb');
 const phaseLabel=orb?.querySelector('[data-breath-phase]');
 const countLabel=orb?.querySelector('[data-breath-count]');
 if(!orb||!phaseLabel||!countLabel)return;
 const phases=[
  {key:'in',label:'BELÉGZÉS',seconds:breathConfig.inn},
  ...(breathConfig.hold>0?[{key:'hold',label:'TARTSD',seconds:breathConfig.hold}]:[]),
  {key:'out',label:'KILÉGZÉS',seconds:breathConfig.out}
 ];
 let phaseIndex=0;
 const runPhase=()=>{
  const phase=phases[phaseIndex];
  const seconds=phase.seconds;
  clearBreathTimers();
  orb.className=`breath-orb is-${phase.key}`;
  orb.style.setProperty('--breath-duration',`${seconds}s`);
  phaseLabel.textContent=phase.label;
  let remaining=seconds;
  countLabel.textContent=String(remaining);
  const deadline=Date.now()+seconds*1000;
  breathTickTimer=setInterval(()=>{
   remaining=Math.max(1,Math.ceil((deadline-Date.now())/1000));
   countLabel.textContent=String(remaining);
  },200);
  breathTimer=setTimeout(()=>{
   phaseIndex=(phaseIndex+1)%phases.length;
   runPhase();
  },seconds*1000);
 };
 // Force the first inhale transition to start from the smaller resting state.
 orb.className='breath-orb is-preparing';
 requestAnimationFrame(()=>requestAnimationFrame(runPhase));
}
document.addEventListener('click',e=>{if(e.target.closest('[data-menu-open]')){openAppMenu();return}if(e.target.closest('[data-menu-close]')){closeAppMenu();return}const routeTarget=e.target.closest('[data-route]');if(routeTarget){render(routeTarget.dataset.route);return}const b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-transcript-toggle')){const panel=document.getElementById(b.getAttribute('aria-controls'));if(!panel)return;const opening=panel.hidden;panel.hidden=!opening;b.setAttribute('aria-expanded',String(opening));b.closest('.guided-transcript')?.classList.toggle('is-open',opening);return;}if(b.hasAttribute('data-competency-close')){b.closest('dialog')?.close?.();return}if(b.dataset.competencyProfession){openCompetencyDialog(b.dataset.competencyProfession,b.dataset.competencyIndex);return}if(b.dataset.quizRestart){resetQuiz(b.dataset.quizRestart);return}if(b.dataset.customRoute){render(`custom:${b.dataset.customRoute}`);return}if(b.dataset.topicDirection){navigateTopic(Number(b.dataset.topicDirection));return}if(b.dataset.section){setSection(b.dataset.module,b.dataset.section);render(b.dataset.module,{preserveScroll:true,focusActiveTab:true});return}if(b.hasAttribute('data-reveal')){const a=b.nextElementSibling;a.hidden=!a.hidden;b.textContent=a.hidden?'Mutasd a választ':'Válasz elrejtése';return}if(b.hasAttribute('data-flip-card')){haptic(6);const flipped=b.classList.toggle('is-flipped');b.setAttribute('aria-pressed',String(flipped));return}if(b.dataset.step){haptic(5);const list={workWorldCards:helyzeteim.workWorldCards,marketFacts:onmagam.marketFacts,jobHuntCards:helyzeteim.jobHuntCards,interviewCards:helyzeteim.interviewCards,cvCards:helyzeteim.cvCards,cvTips:helyzeteim.cvTips,linkedinCards:helyzeteim.linkedinCards,generationCards:kapcsolataim.generationCards,redFlagsCards:helyzeteim.redFlags,legalBasicsCards:helyzeteim.legalBasics,winwinTwoSides:kapcsolataim.ketOldalData,winwinCommunication:kapcsolataim.communicationFlips,winwinPhrases:kapcsolataim.proPhrases,winwinDigital:kapcsolataim.digitalBehavior,winwinGlossary:kapcsolataim.glossary,preboarding:onmagam.preboardingData,survival:onmagam.survivalGuideData,mindfulnessCards:onmagam.mindfulnessExercises,groundingStep:groundingSteps,onmagamQuiz:onmagam.onmagamQuizItems,workWorldQuiz:helyzeteim.workWorldQuiz,firstDayQuiz:helyzeteim.firstDayQuiz,redFlagQuiz:helyzeteim.redFlagQuiz,legalQuiz:helyzeteim.legalBasicsQuiz,helyzetQuiz:helyzeteim.helyzeteiScenarios,commQuiz:kapcsolataim.komunikációQuiz,phraseQuiz:kapcsolataim.proSzóhasználatQuiz,digitalQuiz:kapcsolataim.digitálisViselkedésQuiz,glossaryQuiz:kapcsolataim.fogalomtárQuiz}[b.dataset.step]||getCustomContent().find(x=>`custom-${x.id}`===b.dataset.step)?.items;setIdx(b.dataset.step,Math.max(0,Math.min(list.length-1,idx(b.dataset.step)+Number(b.dataset.dir))));render(state().route,{preserveScroll:true});return}if(b.dataset.quiz){const data={onmagamQuiz:onmagam.onmagamQuizItems,workWorldQuiz:helyzeteim.workWorldQuiz,firstDayQuiz:helyzeteim.firstDayQuiz,redFlagQuiz:helyzeteim.redFlagQuiz,legalQuiz:helyzeteim.legalBasicsQuiz,helyzetQuiz:helyzeteim.helyzeteiScenarios,commQuiz:kapcsolataim.komunikációQuiz,phraseQuiz:kapcsolataim.proSzóhasználatQuiz,digitalQuiz:kapcsolataim.digitálisViselkedésQuiz,glossaryQuiz:kapcsolataim.fogalomtárQuiz}[b.dataset.quiz];const qi=Number(b.dataset.qindex),oi=Number(b.dataset.option);if(!data||Object.prototype.hasOwnProperty.call(quizAnswersFor(b.dataset.quiz),qi))return;recordQuizAnswer(b.dataset.quiz,qi,oi);render(state().route,{preserveScroll:true});return}if(b.hasAttribute('data-quiz-next')){const key=b.dataset.quizNext;setIdx(key,idx(key)+1);render(state().route,{preserveScroll:true});return}if(b.hasAttribute('data-body-scan-start')){startBodyScan();return}if(b.hasAttribute('data-body-scan-stop')){stopBodyScan();return}if(b.hasAttribute('data-audio-toggle')){toggleGuidedAudio(b.dataset.audioId,b);return}if(b.hasAttribute('data-audio-restart')){restartGuidedAudio(b.dataset.audioId);return}if(b.hasAttribute('data-gratitude-save')){const entries=[...document.querySelectorAll('[data-gratitude]')].map(x=>x.value.trim());const st=state();save({mindfulness:{...(st.mindfulness||{}),entries,saved:true}});b.textContent='Elmentve ✓';return}if(b.hasAttribute('data-restart-breath')){haptic(8);clearBreathTimers();const p=b.closest('.breath-player');if(!p)return;breathConfig={inn:Number(b.dataset.in),hold:Number(b.dataset.hold||0),out:Number(b.dataset.out),name:b.dataset.name,player:p};p.querySelector('[data-breath-name]').textContent=breathConfig.name;b.textContent='Újrakezdés';const stop=p.querySelector('[data-stop-breath]');if(stop)stop.hidden=false;startBreath();return}if(b.hasAttribute('data-stop-breath')){clearBreathTimers();const p=b.closest('.breath-player');const orb=p?.querySelector('.breath-orb');if(orb){orb.className='breath-orb is-paused';const phase=orb.querySelector('[data-breath-phase]');const count=orb.querySelector('[data-breath-count]');if(phase)phase.textContent='MEGÁLLÍTVA';if(count)count.textContent='–'}return}});
function stepCarousel(key,dir){const lists={workWorldCards:helyzeteim.workWorldCards,marketFacts:onmagam.marketFacts,jobHuntCards:helyzeteim.jobHuntCards,interviewCards:helyzeteim.interviewCards,cvCards:helyzeteim.cvCards,cvTips:helyzeteim.cvTips,linkedinCards:helyzeteim.linkedinCards,generationCards:kapcsolataim.generationCards,redFlagsCards:helyzeteim.redFlags,legalBasicsCards:helyzeteim.legalBasics,winwinTwoSides:kapcsolataim.ketOldalData,winwinCommunication:kapcsolataim.communicationFlips,winwinPhrases:kapcsolataim.proPhrases,winwinDigital:kapcsolataim.digitalBehavior,winwinGlossary:kapcsolataim.glossary,preboarding:onmagam.preboardingData,survival:onmagam.survivalGuideData,mindfulnessCards:onmagam.mindfulnessExercises,groundingStep:groundingSteps,onmagamQuiz:onmagam.onmagamQuizItems,workWorldQuiz:helyzeteim.workWorldQuiz,firstDayQuiz:helyzeteim.firstDayQuiz,redFlagQuiz:helyzeteim.redFlagQuiz,legalQuiz:helyzeteim.legalBasicsQuiz,helyzetQuiz:helyzeteim.helyzeteiScenarios,commQuiz:kapcsolataim.komunikációQuiz,phraseQuiz:kapcsolataim.proSzóhasználatQuiz,digitalQuiz:kapcsolataim.digitálisViselkedésQuiz,glossaryQuiz:kapcsolataim.fogalomtárQuiz};const list=lists[key]||getCustomContent().find(x=>`custom-${x.id}`===key)?.items;if(!list)return;const next=Math.max(0,Math.min(list.length-1,idx(key)+dir));if(next===idx(key))return;setIdx(key,next);render(state().route,{preserveScroll:true})}
let mindfulnessTimer=null;
function bodyScanContainer(){return document.querySelector('[data-mindfulness-index="1"] .mindfulness-accordion__body')}
function refreshBodyScan(){haptic(6);const box=bodyScanContainer();if(!box)return;const top=box.getBoundingClientRect().top;box.innerHTML=bodyScanExperience();const delta=box.getBoundingClientRect().top-top;if(Math.abs(delta)>1)window.scrollBy(0,delta)}
function updateBodyScanDOM(step,left){const card=document.querySelector('[data-body-scan-card]');if(!card)return;const x=bodySteps[step];card.querySelector('[data-body-scan-count]').textContent=`${step+1} / ${bodySteps.length}`;card.querySelector('[data-body-scan-zone]').textContent=x.zone;card.querySelector('[data-body-scan-cue]').textContent=x.cue;card.querySelector('.body-scan-timer strong').textContent=left;card.querySelectorAll('.phase-dots span').forEach((dot,n)=>dot.classList.toggle('is-current',n===step))}
function startBodyScan(){clearInterval(mindfulnessTimer);save({mindfulness:{...(state().mindfulness||{}),bodyScanActive:true,bodyScanDone:false,bodyScanStep:0,bodyScanRemaining:20}});refreshBodyScan();runBodyScanTimer()}
function runBodyScanTimer(){clearInterval(mindfulnessTimer);mindfulnessTimer=setInterval(()=>{const st=state(),m=st.mindfulness||{};if(!m.bodyScanActive){clearInterval(mindfulnessTimer);return}let left=(m.bodyScanRemaining??20)-1,step=m.bodyScanStep||0;if(left<=0){step+=1;if(step>=bodySteps.length){save({mindfulness:{...m,bodyScanActive:false,bodyScanDone:true,bodyScanStep:bodySteps.length-1,bodyScanRemaining:0}});clearInterval(mindfulnessTimer);refreshBodyScan();return}left=20}save({mindfulness:{...m,bodyScanStep:step,bodyScanRemaining:left}});updateBodyScanDOM(step,left)},1000)}
function stopBodyScan(){clearInterval(mindfulnessTimer);save({mindfulness:{...(state().mindfulness||{}),bodyScanActive:false,bodyScanDone:false,bodyScanStep:0,bodyScanRemaining:20}});refreshBodyScan()}
function getAudio(id){return document.getElementById(id)}
function fmtTime(v){if(!Number.isFinite(v))return '0:00';return `${Math.floor(v/60)}:${String(Math.floor(v%60)).padStart(2,'0')}`}
function syncAudioUI(audio){const card=audio.closest('[data-guided-card]');if(!card)return;const pct=audio.duration?audio.currentTime/audio.duration*100:0;card.querySelector('[data-audio-progress]').style.width=`${pct}%`;const seek=card.querySelector('[data-audio-seek]');if(seek)seek.setAttribute('aria-valuenow',String(Math.round(pct)));card.querySelector('[data-audio-current]').textContent=fmtTime(audio.currentTime);if(Number.isFinite(audio.duration))card.querySelector('[data-audio-duration]').textContent=fmtTime(audio.duration);const play=card.querySelector('[data-audio-toggle]');play.textContent=audio.paused?'▶':'■';play.setAttribute('aria-label',audio.paused?'Lejátszás':'Megállítás');card.querySelector('[data-audio-orb]')?.classList.toggle('is-playing',!audio.paused)}
function bindAudio(audio){if(audio.dataset.bound)return;audio.dataset.bound='1';['timeupdate','loadedmetadata','play','pause','ended'].forEach(ev=>audio.addEventListener(ev,()=>syncAudioUI(audio)));audio.addEventListener('error',()=>{const note=audio.closest('[data-guided-card]')?.querySelector('.audio-placeholder-note');if(note)note.classList.add('is-visible')})}
function toggleGuidedAudio(id){const a=getAudio(id);if(!a)return;bindAudio(a);if(a.paused)a.play().catch(()=>syncAudioUI(a));else a.pause();syncAudioUI(a)}
function restartGuidedAudio(id){const a=getAudio(id);if(!a)return;bindAudio(a);a.currentTime=0;a.play().catch(()=>{});syncAudioUI(a)}
let drag=null,suppressFlip=false;
function beginSwipe(target,e,type,key){drag={target,key,type,x:e.clientX,y:e.clientY,dx:0,active:false};target.setPointerCapture?.(e.pointerId)}
function finishSwipe(){if(!drag)return;const {target,key,type,dx,active}=drag;target.classList.remove('is-dragging');const moving=target.querySelector('.carousel-stage')||target.querySelector('.quiz-card__motion');if(moving)moving.style.transform='';drag=null;if(active&&Math.abs(dx)>58){haptic(5);if(type==='module'){const current=moduleOrder.indexOf(key),next=Math.max(0,Math.min(moduleOrder.length-1,current+(dx<0?1:-1)));if(next!==current)render(moduleOrder[next])}else stepCarousel(key,dx<0?1:-1)}setTimeout(()=>{suppressFlip=false},80)}

document.addEventListener('toggle',e=>{const details=e.target;if(!(details instanceof HTMLDetailsElement))return;const summary=details.querySelector(':scope > summary');summary?.setAttribute('aria-expanded',String(details.open));if(!details.open)return;haptic(5);const group=details.closest('.accordion-list,.mindfulness-accordion,.breathing-accordion');if(group){group.querySelectorAll(':scope > details[open]').forEach(item=>{if(item!==details)item.open=false})}},true);
document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;if(menu?.classList.contains('is-open')){closeAppMenu();e.preventDefault();return}const openDetails=e.target.closest?.('details[open]');if(openDetails){openDetails.open=false;openDetails.querySelector('summary')?.focus();e.preventDefault();return}const flipped=e.target.closest?.('[data-flip-card].is-flipped');if(flipped){flipped.classList.remove('is-flipped');flipped.setAttribute('aria-pressed','false');flipped.focus();e.preventDefault()}});
document.addEventListener('keydown',e=>{const resume=e.target.closest?.('.continue-inline[data-route]');if(!resume||e.target!==resume)return;if(e.key==='Enter'||e.key===' '){e.preventDefault();render(resume.dataset.route)}});

document.addEventListener('click',e=>{const seek=e.target.closest?.('[data-audio-seek]');if(!seek)return;const a=getAudio(seek.dataset.audioId);if(!a||!Number.isFinite(a.duration)||a.duration<=0)return;bindAudio(a);const rect=seek.getBoundingClientRect();const ratio=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width));a.currentTime=ratio*a.duration;syncAudioUI(a)});
document.addEventListener('keydown',e=>{const seek=e.target.closest?.('[data-audio-seek]');if(!seek||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;const a=getAudio(seek.dataset.audioId);if(!a||!Number.isFinite(a.duration)||a.duration<=0)return;e.preventDefault();bindAudio(a);if(e.key==='Home')a.currentTime=0;else if(e.key==='End')a.currentTime=a.duration;else a.currentTime=Math.max(0,Math.min(a.duration,a.currentTime+(e.key==='ArrowRight'?5:-5)));syncAudioUI(a)});
document.addEventListener('pointerdown',e=>{const interactive=e.target.closest('button,input,label,a,summary,select,textarea,[role=\"button\"]');const carousel=e.target.closest('[data-carousel]');if(carousel&&!interactive){beginSwipe(carousel,e,'content',carousel.dataset.carousel);return}const quiz=e.target.closest('[data-quiz-swipe]');if(quiz&&!interactive){return}const hero=e.target.closest('[data-module-hero]');if(hero&&!interactive)beginSwipe(hero,e,'module',hero.dataset.moduleHero)});
document.addEventListener('pointermove',e=>{if(!drag)return;drag.dx=e.clientX-drag.x;const dy=e.clientY-drag.y;if(!drag.active&&Math.abs(drag.dx)>12&&Math.abs(drag.dx)>Math.abs(dy)*1.25){drag.active=true;drag.target.classList.add('is-dragging');suppressFlip=true}if(drag.active){e.preventDefault();const moving=drag.target.querySelector('.carousel-stage');if(moving)moving.style.transform=`translateX(${drag.dx*.62}px) rotate(${drag.dx*.012}deg)`;else drag.target.style.setProperty('--swipe-offset',`${drag.dx*.18}px`)}} ,{passive:false});
document.addEventListener('pointerup',()=>{if(drag?.target)drag.target.style.removeProperty('--swipe-offset');finishSwipe()});
document.addEventListener('pointercancel',()=>{if(drag?.target)drag.target.style.removeProperty('--swipe-offset');finishSwipe()});
document.addEventListener('click',e=>{if(suppressFlip&&e.target.closest('[data-flip-card]')){e.preventDefault();e.stopImmediatePropagation()}},true);
document.addEventListener('input',e=>{if(e.target.matches('[data-audio-volume]')){const a=getAudio(e.target.dataset.audioId);if(a)a.volume=Number(e.target.value);return}if(e.target.matches('[data-gratitude]')){const entries=[...document.querySelectorAll('[data-gratitude]')].map(x=>x.value);const st=state();save({mindfulness:{...(st.mindfulness||{}),entries}})}});
document.addEventListener('change',e=>{if(e.target.matches('[data-check]')){const st=state(),id=Number(e.target.dataset.check),set=new Set(st.checklist||[]);e.target.checked?set.add(id):set.delete(id);save({checklist:[...set]})}});
let hasEntered=false;function enter(){if(hasEntered)return;hasEntered=true;splash.classList.add('is-leaving');setTimeout(()=>{splash.hidden=true;app.hidden=false;const remembered=state().route||'home';render(remembered,{preserveScroll:true})},420)};document.querySelector('[data-skip-splash]')?.addEventListener('click',enter);setTimeout(enter,1800);


/* BETA 1.2.5 — Trigger competency hint only when the career card enters view */
(function () {
  const SELECTOR = '.career-card, .career-path-card, [data-career-card]';
  const BUTTONS = '.career-competency-btn, .competency-btn, [data-competency]';

  function animateCard(card) {
    if (!card || card.dataset.competencyHintPlayed === '1') return;
    const buttons = Array.from(card.querySelectorAll(BUTTONS));
    if (!buttons.length) return;
    card.dataset.competencyHintPlayed = '1';

    buttons.forEach((btn, index) => {
      window.setTimeout(() => {
        btn.classList.remove('competency-hint');
        void btn.offsetWidth;
        btn.classList.add('competency-hint');
        window.setTimeout(() => btn.classList.remove('competency-hint'), 520);
      }, index * 90);
    });
  }

  function setupCareerCompetencyHints() {
    const cards = Array.from(document.querySelectorAll(SELECTOR));
    if (!cards.length) return;

    if (!('IntersectionObserver' in window)) {
      cards.forEach(animateCard);
      return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.45) {
          animateCard(entry.target);
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: [0.45] });

    cards.forEach(card => observer.observe(card));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupCareerCompetencyHints, { once: true });
  } else {
    setupCareerCompetencyHints();
  }

  document.addEventListener('app:content-rendered', setupCareerCompetencyHints);
})();


// BETA 3.5 — central JSON content state / preview support.
// Existing module loaders remain compatible through content-fetch-bridge.js.
window.addEventListener("utiterv:content-changed", event => {
  const meta=event.detail?.meta||{};
  if(meta.source==="preview-message" || meta.type==="set"){
    if(new URLSearchParams(location.search).get("preview")==="1"){
      document.documentElement.dataset.previewContent="1";
      window.dispatchEvent(new CustomEvent("utiterv:preview-refresh",{detail:event.detail}));
    }
  }
});
