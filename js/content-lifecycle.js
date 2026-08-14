const normalize=value=>String(value??'').trim();
export const PUBLICATION_STATUSES=new Set(['published','draft','archived']);
export function publicationStatus(item){
  const raw=normalize(item?.publicationStatus||item?.publication?.status||'published').toLowerCase();
  return PUBLICATION_STATUSES.has(raw)?raw:'published';
}
const parseDate=value=>{const raw=normalize(value);if(!raw)return null;const t=Date.parse(raw);return Number.isFinite(t)?t:null};
export function isPublished(item,now=Date.now()){
  if(!item||typeof item!=='object')return true;
  if(item.hidden===true)return false;
  if(publicationStatus(item)!=='published')return false;
  const from=parseDate(item.publishedAt||item.publication?.publishedAt),until=parseDate(item.unpublishAt||item.publication?.unpublishAt);
  if(from!==null&&now<from)return false;
  if(until!==null&&now>=until)return false;
  return true;
}
export function contentTags(item){return Array.isArray(item?.tags)?item.tags.map(normalize).filter(Boolean):[]}
export function contentCategory(item){return normalize(item?.category)}
