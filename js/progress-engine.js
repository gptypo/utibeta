const STORAGE_KEY='utiterv-progress-platform-v1';
const empty=()=>({schema:'utiterv-progress-v1',visited:{},completed:{},updatedAt:null});
const read=()=>{try{const x=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');return x&&x.schema==='utiterv-progress-v1'?x:empty()}catch{return empty()}};
const write=data=>{data.updatedAt=new Date().toISOString();localStorage.setItem(STORAGE_KEY,JSON.stringify(data));window.dispatchEvent(new CustomEvent('utiterv:progress-changed',{detail:{progress:data}}));return data};
export const progressKey=(route,section='',detail='')=>[route,section,detail].filter(Boolean).join(':');
export function markVisited(route,section='',detail=''){
  if(!route||route==='home'||route==='privacy'||route==='system')return;
  const key=progressKey(route,section,detail),data=read(),prev=data.visited[key]||{};
  data.visited[key]={route,section,detail,firstSeen:prev.firstSeen||new Date().toISOString(),lastSeen:new Date().toISOString(),count:Number(prev.count||0)+1};write(data);
}
export function markCompleted(key,meta={}){if(!key)return;const data=read();data.completed[key]={...meta,completedAt:new Date().toISOString()};write(data)}
export function clearCompleted(key){const data=read();delete data.completed[key];write(data)}
export function getProgress(){return read()}
export function resetProgress(){localStorage.removeItem(STORAGE_KEY)}
export function progressSummary({routes=[],quizRows=[]}={}){
  const data=read(),visited=Object.values(data.visited||{}),completed=Object.keys(data.completed||{});
  const routeRows=routes.map(route=>{
    const v=visited.filter(x=>x.route===route).length,q=quizRows.filter(x=>x.route===route),quizTotal=q.reduce((a,x)=>a+x.total,0),quizAnswered=q.reduce((a,x)=>a+x.answered,0);
    const quizPercent=quizTotal?Math.round(quizAnswered/quizTotal*100):0;
    return {route,visited:v,quizTotal,quizAnswered,quizPercent};
  });
  return {visitedCount:visited.length,completedCount:completed.length,routeRows};
}
export {STORAGE_KEY as PROGRESS_STORAGE_KEY};
