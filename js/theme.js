import {project} from './project-content.js';
const themeCopy=project.ui?.theme||{};
const THEME_KEY='utiterv-theme';
const root=document.documentElement;
const media=window.matchMedia('(prefers-color-scheme: dark)');

function preference(){return localStorage.getItem(THEME_KEY)||'system'}
function resolved(value=preference()){return value==='system'?(media.matches?'dark':'light'):value}
function themeColor(mode){return mode==='dark'?'#0b1114':'#ffffff'}
function apply(value=preference(),{announce=false}={}){
 const mode=resolved(value);
 root.dataset.themePreference=value;
 root.dataset.theme=mode;
 root.style.colorScheme=mode;
 document.querySelectorAll('meta[name="theme-color"]').forEach(meta=>meta.content=themeColor(mode));
 document.querySelectorAll('[data-theme-toggle]').forEach(button=>{
  button.setAttribute('aria-pressed',String(mode==='dark'));
  button.setAttribute('aria-label',mode==='dark'?(themeCopy.lightEnable||''):(themeCopy.darkEnable||''));
  button.title=mode==='dark'?(themeCopy.light||''):(themeCopy.dark||'');
  const icon=button.querySelector('[data-theme-icon]');if(icon)icon.textContent=mode==='dark'?'☀':'☾';
 });
 document.querySelectorAll('[data-theme-status]').forEach(node=>node.textContent=value==='system'?`${themeCopy.automatic||''} · ${mode==='dark'?(themeCopy.dark||'').toLowerCase():(themeCopy.light||'').toLowerCase()}`:(mode==='dark'?(themeCopy.dark||''):(themeCopy.light||'')));
 document.querySelectorAll('[data-theme-choice]').forEach(button=>{
  const active=button.dataset.themeChoice===value;
  button.classList.toggle('is-active',active);
  button.setAttribute('aria-pressed',String(active));
 });
 if(announce)document.dispatchEvent(new CustomEvent('utiterv:themechange',{detail:{preference:value,theme:mode}}));
}
function toggle(){const next=resolved()==='dark'?'light':'dark';localStorage.setItem(THEME_KEY,next);apply(next,{announce:true})}
function setPreference(value){if(!['light','dark','system'].includes(value))return;value==='system'?localStorage.removeItem(THEME_KEY):localStorage.setItem(THEME_KEY,value);apply(value,{announce:true})}

document.addEventListener('click',event=>{
 const toggleButton=event.target.closest('[data-theme-toggle]');
 if(toggleButton){event.preventDefault();event.stopPropagation();toggle();return}
 const choice=event.target.closest('[data-theme-choice]');
 if(choice){event.preventDefault();setPreference(choice.dataset.themeChoice);return}
 const reset=event.target.closest('[data-app-reset]');
 if(reset){
  event.preventDefault();
  const confirmed=window.confirm(themeCopy.resetConfirm||'');
  if(!confirmed)return;
  localStorage.clear();
  window.location.reload();
 }
});
const onSystemThemeChange=()=>{if(preference()==='system')apply('system',{announce:true})};
if(typeof media.addEventListener==='function')media.addEventListener('change',onSystemThemeChange);else if(typeof media.addListener==='function')media.addListener(onSystemThemeChange);
window.UtitervTheme={apply,toggle,setPreference,preference,resolved};
apply();
