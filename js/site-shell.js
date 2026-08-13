import {project} from './project-content.js';
const ui=project.ui||{}, a=project.assets||{};
const q=s=>document.querySelector(s);
const setText=(s,v)=>{const n=q(s);if(n&&v!=null)n.textContent=v};
const setImg=(s,v,alt='')=>{const n=q(s);if(n&&v){n.src=v;n.alt=alt||''}};
document.title=ui.meta?.title||'';
q('meta[name=description]')?.setAttribute('content',ui.meta?.description||'');
q('meta[name=apple-mobile-web-app-title]')?.setAttribute('content',ui.shell?.brand||'');
q('link[rel=apple-touch-icon]')?.setAttribute('href',a.appIcons?.appleTouch||'');
q('link[rel=icon]')?.setAttribute('href',a.appIcons?.favicon||'');
setImg('.brand img',a.logos?.main);setText('.brand span',ui.shell?.brand);q('.brand')?.setAttribute('aria-label',ui.shell?.homeAria||'');
setText('.version',ui.meta?.version);q('.version')?.setAttribute('aria-label',ui.shell?.systemAria||'');q('[data-menu-open]')?.setAttribute('aria-label',ui.shell?.menuOpenAria||'');
setText('.app-footer > span',`${ui.shell?.footer||''} ${new Date().getFullYear()}`);setText('.app-footer button',ui.shell?.privacy);
setText('.menu-close',ui.shell?.menuCloseSymbol);setText('.app-menu__home',ui.shell?.menuHomeSymbol);setText('.app-menu__privacy',ui.shell?.menuPrivacySymbol);
q('#app-menu')?.setAttribute('aria-label',ui.shell?.menuAria||'');setText('.app-menu__head .eyebrow',ui.shell?.menuEyebrow);setText('.app-menu__head h2',ui.shell?.menuTitle);q('.menu-close')?.setAttribute('aria-label',ui.shell?.menuCloseAria||'');
for(const route of ['home','onmagam','helyzeteim','kapcsolataim','bonus','privacy']){const b=q(`.app-menu__nav [data-route="${route}"]`);const c=ui.shell?.menu?.[route];if(!b||!c)continue;const strong=b.querySelector('strong'),small=b.querySelector('small');if(strong)strong.textContent=c.strong||'';if(small)small.textContent=c.small||'';if(a.smallIcons?.[route])setImg(`.app-menu__nav [data-route="${route}"] img`,a.smallIcons[route]);}
