/**
 * Studio App Builder Module - `js/studio-builder.js`
 * Integrálódik a meglévő content-engine és studio-runtime modulokkal.
 */

class AppContentBuilder {
  constructor(options = {}) {
    this.containerId = options.containerId || 'builder-root';
    this.initialData = options.initialData || [];
    this.onSave = options.onSave || null;
    this.state = [...this.initialData];
    this.selectedBlockId = null;

    // Támogatott blokk-típusok sémái
    this.blockSchemas = {
      text: {
        label: 'Szöveg / Cikk',
        icon: '📝',
        defaultData: {
          type: 'text',
          title: 'Új fejezet',
          content: 'Írd ide a fejezet tartalmát...',
          category: 'mindfulness'
        }
      },
      exercise: {
        label: 'Légzésgyakorlat',
        icon: '🫁',
        defaultData: {
          type: 'exercise',
          title: 'Dobozlégzés',
          inhale: 4,
          hold1: 4,
          exhale: 4,
          hold2: 4,
          cycles: 4
        }
      },
      audio: {
        label: 'Hanganyag / Vizualizáció',
        icon: '🎧',
        defaultData: {
          type: 'audio',
          title: 'Vezetett vizualizáció',
          src: 'audio/vizualizacio-biztonsagos-hely.mp3',
          duration: '05:00'
        }
      },
      quiz: {
        label: 'Kvíz / Önreflexió',
        icon: '❓',
        defaultData: {
          type: 'quiz',
          question: 'Hogy érzed magad most?',
          options: ['Nyugodt', 'Feszült', 'Fáradt', 'Kiegyensúlyozott']
        }
      }
    };

    this.init();
  }

  init() {
    const root = document.getElementById(this.containerId);
    if (!root) {
      console.error(`Root element #${this.containerId} not found.`);
      return;
    }

    root.classList.add('studio-builder-wrapper');
    root.innerHTML = `
      <style>
        .studio-builder-wrapper { display: flex; height: 100vh; font-family: system-ui, sans-serif; background: #f4f5f7; color: #333; }
        .builder-sidebar { width: 320px; background: #ffffff; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; }
        .builder-header { padding: 16px; border-bottom: 1px solid #e2e8f0; font-weight: bold; font-size: 1.1rem; display: flex; justify-content: space-between; align-items: center; }
        .builder-palette { padding: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; border-bottom: 1px solid #e2e8f0; }
        .palette-btn { padding: 8px; border: 1px solid #cbd5e1; background: #f8fafc; border-radius: 6px; cursor: pointer; text-align: center; font-size: 0.85rem; }
        .palette-btn:hover { background: #e2e8f0; }
        .block-tree { flex: 1; overflow-y: auto; padding: 12px; }
        .tree-item { padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 8px; background: #fff; cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
        .tree-item.active { border-color: #3b82f6; background: #eff6ff; }
        .builder-editor { flex: 1; padding: 24px; overflow-y: auto; background: #fafafa; }
        .builder-preview { width: 380px; border-left: 1px solid #e2e8f0; background: #fff; display: flex; flex-direction: column; }
        .preview-frame { flex: 1; padding: 16px; overflow-y: auto; }
        .form-group { margin-bottom: 16px; }
        .form-group label { display: block; margin-bottom: 6px; font-weight: 600; font-size: 0.85rem; }
        .form-group input, .form-group textarea { width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; box-sizing: border-box; }
        .btn-actions { display: flex; gap: 8px; margin-top: 16px; }
        .btn { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; }
        .btn-primary { background: #2563eb; color: white; }
        .btn-danger { background: #ef4444; color: white; }
      </style>

      <div class="builder-sidebar">
        <div class="builder-header">
          <span>App Builder</span>
          <button class="btn btn-primary" id="export-json-btn">Export</button>
        </div>
        <div class="builder-palette" id="palette-container"></div>
        <div class="block-tree" id="block-tree"></div>
      </div>

      <div class="builder-editor" id="block-editor">
        <p style="color: #64748b;">Válassz ki egy blokkot a szerkesztéshez, vagy adj hozzá egy újat a bal oldali menüből.</p>
      </div>

      <div class="builder-preview">
        <div class="builder-header">Élő előnézet</div>
        <div class="preview-frame" id="live-preview"></div>
      </div>
    `;

    this.renderPalette();
    this.renderTree();
    this.renderPreview();
    this.bindGlobalEvents();
  }

  renderPalette() {
    const palette = document.getElementById('palette-container');
    palette.innerHTML = '';
    Object.keys(this.blockSchemas).forEach(type => {
      const schema = this.blockSchemas[type];
      const btn = document.createElement('button');
      btn.className = 'palette-btn';
      btn.innerHTML = `${schema.icon} ${schema.label}`;
      btn.onclick = () => this.addBlock(type);
      palette.appendChild(btn);
    });
  }

  addBlock(type) {
    const schema = this.blockSchemas[type];
    if (!schema) return;

    const newBlock = {
      id: 'block_' + Date.now(),
      ...JSON.parse(JSON.stringify(schema.defaultData))
    };

    this.state.push(newBlock);
    this.selectedBlockId = newBlock.id;
    this.renderTree();
    this.renderEditor();
    this.renderPreview();
  }

  deleteBlock(id) {
    this.state = this.state.filter(b => b.id !== id);
    if (this.selectedBlockId === id) {
      this.selectedBlockId = null;
    }
    this.renderTree();
    this.renderEditor();
    this.renderPreview();
  }

  moveBlock(id, direction) {
    const idx = this.state.findIndex(b => b.id === id);
    if (idx === -1) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= this.state.length) return;

    const temp = this.state[idx];
    this.state[idx] = this.state[newIdx];
    this.state[newIdx] = temp;

    this.renderTree();
    this.renderPreview();
  }

  renderTree() {
    const tree = document.getElementById('block-tree');
    tree.innerHTML = '';

    this.state.forEach((block, index) => {
      const schema = this.blockSchemas[block.type] || { icon: '📦' };
      const item = document.createElement('div');
      item.className = `tree-item ${block.id === this.selectedBlockId ? 'active' : ''}`;
      item.innerHTML = `
        <span>${schema.icon} <strong>${block.title || block.question || block.type}</strong></span>
        <div>
          <button onclick="builder.moveBlock('${block.id}', -1)">↑</button>
          <button onclick="builder.moveBlock('${block.id}', 1)">↓</button>
        </div>
      `;
      item.onclick = (e) => {
        if (e.target.tagName !== 'BUTTON') {
          this.selectedBlockId = block.id;
          this.renderTree();
          this.renderEditor();
        }
      };
      tree.appendChild(item);
    });
  }

  renderEditor() {
    const editor = document.getElementById('block-editor');
    const block = this.state.find(b => b.id === this.selectedBlockId);

    if (!block) {
      editor.innerHTML = '<p style="color: #64748b;">Nincs kiválasztott blokk.</p>';
      return;
    }

    let fieldsHtml = '';
    Object.keys(block).forEach(key => {
      if (key === 'id') return;

      const val = block[key];
      if (Array.isArray(val)) {
        fieldsHtml += `
          <div class="form-group">
            <label>${key.toUpperCase()}</label>
            <textarea data-key="${key}">${val.join('\n')}</textarea>
          </div>`;
      } else if (typeof val === 'number') {
        fieldsHtml += `
          <div class="form-group">
            <label>${key.toUpperCase()}</label>
            <input type="number" data-key="${key}" value="${val}">
          </div>`;
      } else {
        fieldsHtml += `
          <div class="form-group">
            <label>${key.toUpperCase()}</label>
            <input type="text" data-key="${key}" value="${val}">
          </div>`;
      }
    });

    editor.innerHTML = `
      <h3>Blokk szerkesztése: ${block.type}</h3>
      <form id="block-form">
        ${fieldsHtml}
        <div class="btn-actions">
          <button type="button" class="btn btn-danger" onclick="builder.deleteBlock('${block.id}')">Blokk törlése</button>
        </div>
      </form>
    `;

    // Élő mezőfrissítés
    editor.querySelectorAll('input, textarea').forEach(input => {
      input.oninput = (e) => {
        const key = e.target.getAttribute('data-key');
        let value = e.target.value;

        if (e.target.type === 'number') {
          value = Number(value);
        } else if (e.target.tagName === 'TEXTAREA') {
          value = value.split('\n');
        }

        block[key] = value;
        this.renderTree();
        this.renderPreview();
      };
    });
  }

  renderPreview() {
    const preview = document.getElementById('live-preview');
    preview.innerHTML = '';

    this.state.forEach(block => {
      const card = document.createElement('div');
      card.style.cssText = 'border: 1px solid #e2e8f0; padding: 12px; margin-bottom: 12px; border-radius: 8px; background: #fff;';

      if (block.type === 'text') {
        card.innerHTML = `<h4>${block.title}</h4><p>${block.content}</p>`;
      } else if (block.type === 'exercise') {
        card.innerHTML = `<h4>🧘 ${block.title}</h4><p>Belégzés: ${block.inhale}s | Tartás: ${block.hold1}s | Kilégzés: ${block.exhale}s</p>`;
      } else if (block.type === 'audio') {
        card.innerHTML = `<h4>🎧 ${block.title}</h4><audio controls src="${block.src}" style="width: 100%;"></audio>`;
      } else if (block.type === 'quiz') {
        const opts = (block.options || []).map(o => `<li>${o}</li>`).join('');
        card.innerHTML = `<h4>❓ ${block.question}</h4><ul>${opts}</ul>`;
      } else {
        card.innerHTML = `<pre>${JSON.stringify(block, null, 2)}</pre>`;
      }

      preview.appendChild(card);
    });
  }

  bindGlobalEvents() {
    document.getElementById('export-json-btn').onclick = () => {
      const jsonStr = JSON.stringify(this.state, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'app-content-schema.json';
      a.click();
    };
  }
}

// Inicializálás
window.initAppBuilder = (containerId, initialData) => {
  window.builder = new AppContentBuilder({ containerId, initialData });
};
