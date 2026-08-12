import Bridge from '../../bridge.js';
import { PACKS, getProject, getProjectFields, listProjectsByPack } from './catalog.js';
import { buildExport } from './playbook-export.js';

function setChatInput(text) {
    const t = String(text || '');
    const ta = document.getElementById('send_textarea');
    if (!ta) return false;
    ta.value = t;
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    try { ta.focus(); } catch (_) {}
    return true;
}

export class PlaybookView {
    constructor(app) {
        this.app = app;
        this.packId = PACKS[0]?.id || 'exam';
        this.projectId = listProjectsByPack(this.packId)[0]?.id || '';
        this.values = {};
    }

    render() {
        const shell = this.app.phoneShell;
        if (!shell?.setContent) return;
        this._ensureDefaults();
        shell.setContent(this._html(), 'playbook-main');
        this._bind();
    }

    _ensureDefaults() {
        const p = getProject(this.projectId);
        if (!p) {
            const list = listProjectsByPack(this.packId);
            this.projectId = list[0]?.id || '';
        }
        // 若当前 pack 已无项目（如删掉的分类），回到第一个 pack
        if (!getProject(this.projectId) && !listProjectsByPack(this.packId).length) {
            this.packId = PACKS[0]?.id || 'exam';
            this.projectId = listProjectsByPack(this.packId)[0]?.id || '';
        }
        const proj = getProject(this.projectId);
        if (!proj) return;
        const next = { ...this.values };
        getProjectFields(proj).forEach((f) => {
            if (next[f.id] === undefined || next[f.id] === null) {
                next[f.id] = f.default !== undefined ? f.default : (f.type === 'toggle' ? false : '');
            }
        });
        this.values = next;
    }

    _fieldVisible(f) {
        if (!f.showIf) return true;
        const dep = this.values[f.showIf];
        return dep === true || dep === 'true' || dep === '是' || dep === '1' || dep === 'on';
    }

    _html() {
        const packs = PACKS.map((p) => {
            const on = p.id === this.packId ? ' is-on' : '';
            return `<button type="button" class="pb-pack${on}" data-pack="${Bridge.escapeHtml(p.id)}">${p.icon || ''} ${Bridge.escapeHtml(p.name)}</button>`;
        }).join('');

        const projects = listProjectsByPack(this.packId).map((p) => {
            const on = p.id === this.projectId ? ' is-on' : '';
            return `<button type="button" class="pb-proj${on}" data-proj="${Bridge.escapeHtml(p.id)}">${Bridge.escapeHtml(p.name)}</button>`;
        }).join('') || '<div class="pb-empty">该分类暂无项目</div>';

        const proj = getProject(this.projectId);
        const fields = proj ? this._fieldsHtml(proj) : '';
        const preview = proj ? buildExport(proj, this.values) : '';

        return `
<div class="pb-root">
  <div class="pb-hint">选择玩法与参数，生成触发块并<strong>覆盖</strong>填入酒馆输入框。体检/运动会/学园祭/魔法道具可联动排尿与绝顶（写入同一触发块）。正文由全局世界书提供。</div>
  <div class="pb-packs">${packs}</div>
  <div class="pb-section-title">项目</div>
  <div class="pb-projs">${projects}</div>
  <div class="pb-section-title">参数</div>
  <div class="pb-fields" id="pb-fields">${fields}</div>
  <div class="pb-section-title">预览</div>
  <textarea class="pb-preview" id="pb-preview" spellcheck="false">${Bridge.escapeHtml(preview)}</textarea>
  <div class="pb-actions">
    <button type="button" class="pb-btn" id="pb-refresh">刷新预览</button>
    <button type="button" class="pb-btn pb-btn-primary" id="pb-fill">填入输入框</button>
    <button type="button" class="pb-btn" id="pb-copy">复制</button>
  </div>
</div>`;
    }

    _fieldsHtml(proj) {
        const fields = getProjectFields(proj);
        let bodySwitchHeader = false;
        return fields.map((f) => {
            if (!this._fieldVisible(f)) return '';
            let head = '';
            if (f.group === 'bodySwitch' && !bodySwitchHeader) {
                bodySwitchHeader = true;
                head = `<div class="pb-section-title" style="margin-top:4px">身体开关联动</div>`;
            }
            const val = this.values[f.id];
            const req = f.required ? ' <span class="pb-req">*</span>' : '';
            let control = '';
            if (f.type === 'textarea') {
                control = `<textarea class="pb-input" data-field="${Bridge.escapeHtml(f.id)}" rows="3" placeholder="${Bridge.escapeHtml(f.placeholder || '')}">${Bridge.escapeHtml(val || '')}</textarea>`;
            } else if (f.type === 'select') {
                const opts = (f.options || []).map((o) => {
                    const sel = String(val) === String(o) ? ' selected' : '';
                    return `<option value="${Bridge.escapeHtml(o)}"${sel}>${Bridge.escapeHtml(o)}</option>`;
                }).join('');
                control = `<select class="pb-input" data-field="${Bridge.escapeHtml(f.id)}">${opts}</select>`;
            } else if (f.type === 'toggle') {
                const checked = val === true || val === 'true' || val === '是' ? ' checked' : '';
                control = `<label class="pb-toggle"><input type="checkbox" data-field="${Bridge.escapeHtml(f.id)}"${checked}/> 开启</label>`;
            } else {
                control = `<input class="pb-input" type="text" data-field="${Bridge.escapeHtml(f.id)}" value="${Bridge.escapeHtml(val || '')}" placeholder="${Bridge.escapeHtml(f.placeholder || '')}"/>`;
            }
            return `${head}<div class="pb-field"><div class="pb-label">${Bridge.escapeHtml(f.label || f.id)}${req}</div>${control}</div>`;
        }).join('');
    }

    _readFields() {
        const root = this.app.phoneShell?.container || document;
        const next = { ...this.values };
        root.querySelectorAll('[data-field]').forEach((el) => {
            const id = el.getAttribute('data-field');
            if (!id) return;
            if (el.type === 'checkbox') next[id] = !!el.checked;
            else next[id] = el.value;
        });
        this.values = next;
        return next;
    }

    _refreshPreview() {
        const proj = getProject(this.projectId);
        const ta = this.app.phoneShell?.container?.querySelector('#pb-preview');
        if (!ta || !proj) return;
        this._readFields();
        ta.value = buildExport(proj, this.values);
    }

    _bind() {
        const root = this.app.phoneShell?.container;
        if (!root) return;

        root.querySelectorAll('.pb-pack').forEach((btn) => {
            btn.addEventListener('click', () => {
                this.packId = btn.getAttribute('data-pack') || this.packId;
                const list = listProjectsByPack(this.packId);
                this.projectId = list[0]?.id || '';
                this.values = {};
                this.render();
            });
        });

        root.querySelectorAll('.pb-proj').forEach((btn) => {
            btn.addEventListener('click', () => {
                this.projectId = btn.getAttribute('data-proj') || this.projectId;
                this.values = {};
                this.render();
            });
        });

        root.querySelectorAll('[data-field]').forEach((el) => {
            el.addEventListener('change', () => {
                this._readFields();
                const id = el.getAttribute('data-field');
                if (id === 'urineOn' || id === 'orgasmOn') {
                    const keep = { ...this.values };
                    this.values = keep;
                    this.render();
                    return;
                }
                this._refreshPreview();
            });
            el.addEventListener('input', () => {
                if (el.type === 'checkbox') return;
                this._refreshPreview();
            });
        });

        root.querySelector('#pb-refresh')?.addEventListener('click', () => this._refreshPreview());

        root.querySelector('#pb-fill')?.addEventListener('click', () => {
            this._refreshPreview();
            const text = root.querySelector('#pb-preview')?.value || '';
            if (!String(text).trim()) {
                this.app.phoneShell?.showNotification?.('玩法集', '预览为空', '⚠️');
                return;
            }
            const ok = setChatInput(text);
            this.app.phoneShell?.showNotification?.(
                '玩法集',
                ok ? '已覆盖填入输入框' : '未找到输入框 #send_textarea',
                ok ? '✅' : '❌'
            );
        });

        root.querySelector('#pb-copy')?.addEventListener('click', async () => {
            this._refreshPreview();
            const text = root.querySelector('#pb-preview')?.value || '';
            try {
                await navigator.clipboard.writeText(text);
                this.app.phoneShell?.showNotification?.('玩法集', '已复制', '✅');
            } catch (_) {
                const ta = root.querySelector('#pb-preview');
                ta?.select?.();
                this.app.phoneShell?.showNotification?.('玩法集', '请手动复制预览框', 'ℹ️');
            }
        });
    }
}
