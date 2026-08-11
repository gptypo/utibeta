const $ = selector => document.querySelector(selector);

const escapeHtml = value => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replaceAll('"', '&quot;')
  .replace(/'/g, '&#039;');

const cssEscape = value => window.CSS?.escape ? CSS.escape(value) : String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&');

function elementSelector(element) {
  if (!element || element.nodeType !== 1) return '';
  if (element.id) return `#${cssEscape(element.id)}`;
  const parts = [];
  let node = element;
  while (node && node.nodeType === 1 && parts.length < 5) {
    let part = node.tagName.toLowerCase();
    const classes = [...node.classList].filter(Boolean).slice(0, 2);
    if (classes.length) part += `.${classes.map(cssEscape).join('.')}`;
    const parent = node.parentElement;
    if (parent) {
      const siblings = [...parent.children].filter(item => item.tagName === node.tagName);
      if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
    }
    parts.unshift(part);
    node = parent;
  }
  return parts.join(' > ');
}

const result = (ok, text, source = '', selector = '', details = '') => ({ ok, text, source, selector, details });

function setBadge(id, status, text) {
  const element = $(id);
  if (!element) return;
  element.textContent = text;
  element.className = status ? `is-${status}` : '';
}

function resultRow(item) {
  const source = item.source
    ? `<div class="quality-source"><span>Forrás</span><code>${escapeHtml(item.source)}</code>${item.selector ? `<button type="button" class="quality-locate" data-selector="${escapeHtml(item.selector)}">Megmutat az előnézetben</button>` : ''}</div>`
    : '';
  const details = item.details ? `<details class="quality-details"><summary>Részletek</summary><pre>${escapeHtml(item.details)}</pre></details>` : '';
  return `<div class="quality-result ${item.ok ? 'is-ok' : 'is-problem'}"><b aria-hidden="true">${item.ok ? '✓' : '⚠'}</b><div><span>${escapeHtml(item.text)}</span>${source}${details}</div></div>`;
}

async function getJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  try {
    return await response.json();
  } catch (error) {
    throw new Error(`Érvénytelen JSON: ${error.message}`);
  }
}

async function validateProject() {
  const out = [];
  const visited = new Set();
  async function check(ref, label = ref) {
    const url = ref.startsWith('content/') ? ref : `content/${ref}`;
    if (visited.has(url)) return null;
    visited.add(url);
    try {
      const data = await getJson(url);
      out.push(result(true, `${label} betölthető.`, url));
      return data;
    } catch (error) {
      out.push(result(false, `${label} nem tölthető be.`, url, '', error.message));
      return null;
    }
  }

  const manifest = await check('project.json', 'Projektmanifest');
  if (!manifest) return { ok: false, out };

  const simpleRefs = [manifest.home, ...Object.values(manifest.shared || {}), ...Object.values(manifest.custom || {})].filter(Boolean);
  for (const ref of simpleRefs) await check(ref);

  for (const moduleRef of manifest.modules || []) {
    const indexRef = typeof moduleRef === 'string' ? moduleRef : (moduleRef.index || moduleRef.file);
    if (!indexRef) {
      out.push(result(false, 'Egy modulhoz nem tartozik indexfájl.', 'content/project.json', '', JSON.stringify(moduleRef, null, 2)));
      continue;
    }
    const index = await check(indexRef, `Modulindex: ${indexRef}`);
    if (!index) continue;
    const base = indexRef.split('/').slice(0, -1).join('/');
    for (const [sectionIndex, section] of (index.sections || []).entries()) {
      if (!section?.file) {
        out.push(result(false, `A(z) ${section?.title || section?.id || sectionIndex + 1}. szekciónak nincs tartalomfájlja.`, `content/${indexRef} → sections[${sectionIndex}]`));
        continue;
      }
      await check(`${base}/${section.file}`, `${index.title || index.id || indexRef} / ${section.title || section.id}`);
    }
  }
  return { ok: out.every(item => item.ok), out };
}

function previewDocument() {
  return $('#app-preview')?.contentDocument || $('#studio-preview')?.contentDocument || null;
}

async function validateAssets() {
  const doc = previewDocument();
  if (!doc) return { ok: false, out: [result(false, 'Az előnézet még nem töltődött be.', 'editor.html → iframe')] };
  const nodes = [...doc.querySelectorAll('img[src],source[src],audio[src],video[src]')];
  const grouped = new Map();
  nodes.forEach(node => {
    const url = node.getAttribute('src');
    if (!url || url.startsWith('data:')) return;
    if (!grouped.has(url)) grouped.set(url, []);
    grouped.get(url).push(node);
  });
  const out = [];
  for (const [url, elements] of grouped) {
    const selector = elementSelector(elements[0]);
    try {
      const response = await fetch(url, { method: 'HEAD', cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      out.push(result(true, `${url} elérhető.`, url, selector));
    } catch (error) {
      out.push(result(false, `${url} nem érhető el.`, url, selector, error.message));
    }
  }
  if (!out.length) out.push(result(true, 'Nincs ellenőrizendő külső asset az aktuális nézetben.', 'Aktuális iframe DOM'));
  return { ok: out.every(item => item.ok), out };
}

function validateA11y() {
  const doc = previewDocument();
  if (!doc) return { ok: false, out: [result(false, 'Az előnézet még nem töltődött be.', 'editor.html → iframe')] };
  const out = [];
  const missingAlt = [...doc.querySelectorAll('img:not([alt])')];
  if (missingAlt.length) {
    missingAlt.forEach(img => out.push(result(false, 'A képnek nincs alt attribútuma.', elementSelector(img), elementSelector(img), img.getAttribute('src') || 'Nincs src')));
  } else out.push(result(true, 'Minden kép rendelkezik alt attribútummal.', 'Aktuális iframe DOM → img'));

  const unnamed = [...doc.querySelectorAll('button,a')].filter(node => !(node.textContent || node.getAttribute('aria-label') || node.getAttribute('title') || '').trim());
  if (unnamed.length) {
    unnamed.forEach(node => out.push(result(false, 'Névtelen interaktív elem található.', elementSelector(node), elementSelector(node), node.outerHTML.slice(0, 500))));
  } else out.push(result(true, 'Minden gombnak és linknek van hozzáférhető neve.', 'Aktuális iframe DOM → button, a'));

  const headings = [...doc.querySelectorAll('h1')];
  out.push(result(headings.length <= 1, `${headings.length} darab H1 található az aktuális nézetben.`, headings.length ? elementSelector(headings[0]) : 'Aktuális iframe DOM', headings[0] ? elementSelector(headings[0]) : '', headings.map(elementSelector).join('\n')));
  return { ok: out.every(item => item.ok), out };
}

function validateRuntime() {
  const doc = previewDocument();
  if (!doc) return { ok: false, out: [result(false, 'Az előnézet még nem töltődött be.', 'editor.html → iframe')] };
  const out = [];
  const app = doc.querySelector('#app');
  const view = doc.querySelector('#view');
  out.push(result(Boolean(app), 'Az alkalmazás gyökéreleme elérhető.', '#app', '#app'));
  out.push(result(Boolean(view), 'A renderelt nézet gyökéreleme elérhető.', '#view', '#view'));

  const byId = new Map();
  [...doc.querySelectorAll('[id]')].forEach(node => {
    if (!byId.has(node.id)) byId.set(node.id, []);
    byId.get(node.id).push(node);
  });
  const duplicates = [...byId.entries()].filter(([, nodes]) => nodes.length > 1);
  if (duplicates.length) {
    duplicates.forEach(([id, nodes]) => out.push(result(false, `A(z) #${id} DOM ID ${nodes.length} alkalommal szerepel.`, `#${id}`, `#${cssEscape(id)}`, nodes.map(elementSelector).join('\n'))));
  } else out.push(result(true, 'Nincsenek duplikált DOM ID-k az aktuális nézetben.', 'Aktuális iframe DOM → [id]'));
  return { ok: out.every(item => item.ok), out };
}

function bindLocateButtons() {
  document.querySelectorAll('.quality-locate').forEach(button => {
    button.addEventListener('click', () => {
      const selector = button.dataset.selector;
      const frame = $('#app-preview') || $('#studio-preview');
      const doc = frame?.contentDocument;
      if (!doc || !selector) return;
      let target;
      try { target = doc.querySelector(selector); } catch { return; }
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      const previousOutline = target.style.outline;
      const previousOffset = target.style.outlineOffset;
      target.style.outline = '4px solid #ffb000';
      target.style.outlineOffset = '4px';
      setTimeout(() => {
        target.style.outline = previousOutline;
        target.style.outlineOffset = previousOffset;
      }, 2200);
    });
  });
}

async function run() {
  const button = $('#quality-run');
  if (!button) return;
  button.disabled = true;
  button.textContent = 'Ellenőrzés…';
  const groups = [
    ['json', await validateProject()],
    ['assets', await validateAssets()],
    ['a11y', validateA11y()],
    ['runtime', validateRuntime()]
  ];
  let checks = 0;
  let passed = 0;
  for (const [name, group] of groups) {
    const list = group.out || [];
    checks += list.length;
    passed += list.filter(item => item.ok).length;
    const target = $(`#quality-${name}-results`);
    if (target) target.innerHTML = list.map(resultRow).join('');
    setBadge(`#quality-${name}-badge`, group.ok ? 'ok' : 'warn', group.ok ? 'Rendben' : 'Figyelmeztetés');
  }
  const score = checks ? Math.round((passed / checks) * 100) : 0;
  const scoreElement = $('#quality-score');
  if (scoreElement) {
    scoreElement.style.setProperty('--score', `${score}%`);
    scoreElement.querySelector('strong').textContent = score;
  }
  const lastRun = $('#quality-last-run');
  if (lastRun) lastRun.textContent = `Utolsó futás: ${new Date().toLocaleTimeString('hu-HU')}`;
  button.disabled = false;
  button.textContent = 'Ellenőrzések futtatása';
  bindLocateButtons();
}

$('#quality-run')?.addEventListener('click', run);
$('#quality-refresh-preview')?.addEventListener('click', () => {
  const frame = $('#app-preview') || $('#studio-preview');
  if (!frame) return;
  frame.src = `index.html?quality=${Date.now()}`;
  frame.addEventListener('load', run, { once: true });
});

const initialFrame = $('#studio-preview') || $('#app-preview');
if (initialFrame) {
  if (initialFrame.contentDocument?.readyState === 'complete') run();
  else initialFrame.addEventListener('load', run, { once: true });
}
