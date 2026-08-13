const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));

const textMarkup=value=>String(value??'')
  .trim()
  .split(/\n\s*\n/)
  .filter(Boolean)
  .map(paragraph=>`<p>${esc(paragraph).replace(/\n/g,'<br>')}</p>`)
  .join('');

function safeHref(value){
  const raw=String(value??'').trim();
  if(!raw)return'';
  if(raw.startsWith('/')||raw.startsWith('./')||raw.startsWith('../')||raw.startsWith('#'))return esc(raw);
  try{
    const url=new URL(raw,location.origin);
    if(['http:','https:','mailto:','tel:'].includes(url.protocol))return esc(raw);
  }catch{}
  return'';
}

function embedUrl(value){
  const raw=String(value??'').trim();
  if(!raw)return'';
  try{
    const url=new URL(raw,location.origin);
    const host=url.hostname.replace(/^www\./,'').toLowerCase();
    if(host==='youtu.be'){
      const id=url.pathname.split('/').filter(Boolean)[0];
      return id?`https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`:'';
    }
    if(host==='youtube.com'||host==='m.youtube.com'||host==='youtube-nocookie.com'){
      let id='';
      if(url.pathname==='/watch')id=url.searchParams.get('v')||'';
      else if(url.pathname.startsWith('/shorts/'))id=url.pathname.split('/')[2]||'';
      else if(url.pathname.startsWith('/embed/'))id=url.pathname.split('/')[2]||'';
      return id?`https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`:'';
    }
    if(host==='vimeo.com'){
      const id=url.pathname.split('/').filter(Boolean).find(part=>/^\d+$/.test(part));
      return id?`https://player.vimeo.com/video/${encodeURIComponent(id)}`:'';
    }
    if(host==='player.vimeo.com'&&url.pathname.startsWith('/video/'))return raw;
  }catch{}
  return'';
}

function blockHeading(block){
  return `${block.eyebrow?`<span class="eyebrow eyebrow--dark cms-block__eyebrow">${esc(block.eyebrow)}</span>`:''}${block.title?`<h3 class="cms-block__title">${esc(block.title)}</h3>`:''}`;
}

function renderBlock(block){
  if(!block||typeof block!=='object'||block.hidden)return'';
  const type=String(block.type||'').toLowerCase();
  if(type==='text'){
    return `<article class="cms-block cms-block--text">${blockHeading(block)}<div class="cms-block__body">${textMarkup(block.body)}</div></article>`;
  }
  if(type==='image'){
    const src=safeHref(block.src);if(!src)return'';
    return `<figure class="cms-block cms-block--image"><img src="${src}" alt="${esc(block.alt||'')}" loading="lazy" decoding="async">${block.caption?`<figcaption>${esc(block.caption)}</figcaption>`:''}</figure>`;
  }
  if(type==='video'){
    const src=safeHref(block.src);if(!src)return'';
    const poster=safeHref(block.poster);
    return `<figure class="cms-block cms-block--video">${blockHeading(block)}<video controls playsinline preload="metadata"${poster?` poster="${poster}"`:''}><source src="${src}"></video>${block.caption?`<figcaption>${esc(block.caption)}</figcaption>`:''}</figure>`;
  }
  if(type==='embed'){
    const src=embedUrl(block.url);if(!src)return'';
    return `<figure class="cms-block cms-block--embed">${blockHeading(block)}<div class="cms-block__embed"><iframe src="${esc(src)}" title="${esc(block.title||'Beágyazott videó')}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>${block.caption?`<figcaption>${esc(block.caption)}</figcaption>`:''}</figure>`;
  }
  if(type==='audio'){
    const src=safeHref(block.src);if(!src)return'';
    return `<figure class="cms-block cms-block--audio">${blockHeading(block)}<audio controls preload="metadata" src="${src}"></audio>${block.caption?`<figcaption>${esc(block.caption)}</figcaption>`:''}</figure>`;
  }
  if(type==='gallery'){
    const images=Array.isArray(block.images)?block.images.filter(item=>safeHref(item?.src)):[];
    if(!images.length)return'';
    return `<section class="cms-block cms-block--gallery">${blockHeading(block)}<div class="cms-gallery">${images.map(item=>`<figure class="cms-gallery__item"><img src="${safeHref(item.src)}" alt="${esc(item.alt||'')}" loading="lazy" decoding="async">${item.caption?`<figcaption>${esc(item.caption)}</figcaption>`:''}</figure>`).join('')}</div></section>`;
  }
  if(type==='card'){
    const image=safeHref(block.image),url=safeHref(block.linkUrl);
    return `<article class="cms-block cms-block--card${image?' has-image':''}">${image?`<img class="cms-block__card-image" src="${image}" alt="${esc(block.imageAlt||'')}" loading="lazy" decoding="async">`:''}<div class="cms-block__card-copy">${blockHeading(block)}<div class="cms-block__body">${textMarkup(block.body)}</div>${url&&block.linkLabel?`<a class="button cms-block__action" href="${url}"${/^https?:/i.test(String(block.linkUrl||''))?' target="_blank" rel="noopener noreferrer"':''}>${esc(block.linkLabel)}</a>`:''}</div></article>`;
  }
  if(type==='download'){
    const file=safeHref(block.file);if(!file)return'';
    return `<article class="cms-block cms-block--download">${blockHeading(block)}${block.description?`<div class="cms-block__body">${textMarkup(block.description)}</div>`:''}<a class="button cms-block__action" href="${file}" download>${esc(block.label||block.title||'Letöltés')}</a></article>`;
  }
  if(type==='quote'){
    if(!block.quote)return'';
    return `<figure class="cms-block cms-block--quote"><blockquote>${textMarkup(block.quote)}</blockquote>${block.attribution?`<figcaption>${esc(block.attribution)}</figcaption>`:''}</figure>`;
  }
  if(type==='divider')return '<hr class="cms-block cms-block--divider" aria-hidden="true">';
  return'';
}

export function getSectionBlocks(project,moduleId,sectionId){
  const blocks=project?.modules?.[moduleId]?.__sections?.[sectionId]?.blocks;
  return Array.isArray(blocks)?blocks:[];
}

export function renderCmsBlocks(blocks){
  if(!Array.isArray(blocks)||!blocks.length)return'';
  const markup=blocks.map(renderBlock).filter(Boolean).join('');
  return markup?`<div class="cms-blocks">${markup}</div>`:'';
}
