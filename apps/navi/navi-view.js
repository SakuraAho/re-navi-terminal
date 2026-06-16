/* N.A.V.I. 体己师观测终端 - 观测委托视图 v3.1 */

(function() {
    if (document.getElementById('navi-app-styles')) return;
    const link = document.createElement('link');
    link.id = 'navi-app-styles'; link.rel = 'stylesheet';
    link.href = new URL('./navi.css?v=3.1.0', import.meta.url).href;
    document.head.appendChild(link);
})();

import { NAVI_DEFAULTS } from './navi-prompts.js';

const SITES = ['胸部', '胸部', '小穴', '小穴', '综合', '综合'];
const SITE_ICONS = { '胸部': '🍈', '小穴': '🍑', '综合': '💗' };
const DIFF_LABELS_OBS = ['简单', '中等', '困难'];
const DIFF_LABELS_PLAY = ['轻度把玩', '沉浸把玩', '深度交互'];
const DIFF_COLORS = { '简单': '#52c41a', '中等': '#faad14', '困难': '#ff4d4f', '轻度把玩': '#7c3aed', '沉浸把玩': '#db2777', '深度交互': '#dc2626' };
const DIFF_ICONS = { '简单': '🟢', '中等': '🟡', '困难': '🔴', '轻度把玩': '💜', '沉浸把玩': '💗', '深度交互': '❤️' };

export class NaviView {
    constructor(app) {
        this.app = app;
        this.currentView = 'mode'; // mode | options | detail | settings
        this.mode = '';  // 'observation' | 'play'
        this.selectedIdx = -1;
        this._generating = null;
        this._commissions = [];
        window.VirtualPhone._naviView = this;
    }

    _esc(v) { return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

    render() {
        let html;
        if (this.currentView === 'settings') html = this._renderSettings();
        else if (this.currentView === 'detail' && this._commissions[this.selectedIdx]) html = this._renderDetail();
        else if (this.currentView === 'options' && this.mode) html = this._renderOptions();
        else html = this._renderModeSelect();
        this.app.phoneShell.setContent(html, 'navi-' + this.currentView);
        if (this.currentView === 'settings') this._bindSettings();
    }

    // === 导航 ===
    selectMode(m) { this.mode = m; this.currentView = 'options'; this.render(); }
    goBack() { this.currentView = this.mode ? 'options' : 'mode'; this.render(); }
    goHome() { this.currentView = 'mode'; this.render(); }
    goSettings() { this.currentView = 'settings'; this.render(); }
    viewDetail(idx) { this.selectedIdx = idx; this.currentView = 'detail'; this.render(); }

    // === 选项读写 ===
    _opt(key) { return window.VirtualPhone?.storage?.get?.('navi_opt_' + key) || ''; }
    _setOpt(key, val) { window.VirtualPhone?.storage?.set?.('navi_opt_' + key, String(val || ''), true); }
    _optBool(key) { const v = this._opt(key); return v === 'true' || v === true || v === '1'; }

    // === 模式选择 ===
    _renderModeSelect() {
        return `<div class="navi-app"><div class="navi-bar">
            <div class="navi-bar-btn" onclick="window.VirtualPhone._naviView.goSettings()">⚙️</div>
        </div><div class="navi-scroll"><div class="navi-section">
            <div class="navi-section-title">📡 选择委托模式</div>
            <div class="navi-mode-cards">
                <div class="navi-mode-card" onclick="window.VirtualPhone._naviView.selectMode('observation')">
                    <div class="navi-mode-icon">🔍</div>
                    <div class="navi-mode-name">观测模式</div>
                    <div class="navi-mode-desc">以观察乳房和小穴的形态变化为目标<br>不主动干预肉体，通过姿态、环境、对比等方式观测</div>
                </div>
                <div class="navi-mode-card" onclick="window.VirtualPhone._naviView.selectMode('play')">
                    <div class="navi-mode-icon">✋</div>
                    <div class="navi-mode-name">把玩模式</div>
                    <div class="navi-mode-desc">主动对乳房和小穴进行物理把玩<br>支持手法、姿态、物品辅助、协助人员等</div>
                </div>
            </div>
        </div></div></div>`;
    }

    // === 选项面板 + 难度按钮 ===
    _renderOptions() {
        const modeName = this.mode === 'observation' ? '🔍 观测模式' : '✋ 把玩模式';
        const diffLabels = this.mode === 'observation' ? DIFF_LABELS_OBS : DIFF_LABELS_PLAY;
        return `<div class="navi-app"><div class="navi-bar">
            <div class="navi-bar-btn" onclick="window.VirtualPhone._naviView.goSettings()">⚙️</div>
        </div><div class="navi-scroll">
            <div class="navi-section" style="display:flex;align-items:center;gap:8px;padding-bottom:0;">
                <div class="navi-bar-btn" onclick="window.VirtualPhone._naviView.goHome()" style="margin-right:0;">← 切换模式</div>
            </div>
            <div class="navi-section">
                <div class="navi-section-title">${modeName}</div>
                ${this._renderOptToggle('action', '🏃 动作指示', '指定目标的身体姿态或动作（如弯腰、四足着地、跳跃等），留空则由AI随机生成')}
                ${this._renderOptToggle('items', '🧴 辅助物品', '指定辅助物品（如羽毛、精油、冰块、丝带、软刷等），留空则由AI随机生成')}
                ${this._renderOptToggle('assist', '👥 协助人员', '指定协助人员（如目标自己、另一位少女等），留空则由AI随机生成')}
                ${this._renderOptToggle('target', '🎯 对象指定', '指定目标角色名（如：美咲）。留空则由AI从世界书随机选择一名角色，统一为全部6个委托的目标')}
            </div>
            <div class="navi-section">
                <div class="navi-section-title">📊 选择难度</div>
                <div class="navi-diff-buttons">
                    ${diffLabels.map(d => {
                        const loading = this._generating === d;
                        return `<button class="navi-diff-btn" style="border-color:${DIFF_COLORS[d]};color:${DIFF_COLORS[d]}"
                            onclick="window.VirtualPhone._naviView.generate('${d}')" ${loading ? 'disabled' : ''}>
                            ${DIFF_ICONS[d]} ${loading ? '⏳' : d}
                        </button>`;
                    }).join('')}
                </div>
            </div>
            ${this._commissions.length > 0 ? this._renderResults() : ''}
        </div></div>`;
    }

    _renderOptToggle(key, label, hint) {
        const enabled = this._optBool(key);
        const text = enabled ? this._opt(key + '_text') : '';
        return `<div class="navi-opt-block">
            <div class="navi-opt-header">
                <span>${label}</span>
                <label class="toggle-switch" style="flex:0 0 auto;">
                    <input type="checkbox" id="navi-opt-${key}" ${enabled ? 'checked' : ''}
                        onchange="window.VirtualPhone._naviView._toggleOpt('${key}', this.checked)">
                    <span class="toggle-slider"></span>
                </label>
            </div>
            ${enabled ? `<div class="navi-opt-body">
                <textarea id="navi-opt-${key}-text" class="navi-opt-textarea"
                    placeholder="${hint}">${this._esc(text)}</textarea>
                <div class="navi-opt-hint">${hint}</div>
            </div>` : ''}
        </div>`;
    }

    _toggleOpt(key, checked) {
        this._setOpt(key, checked ? 'true' : 'false');
        if (!checked) this._setOpt(key + '_text', '');
        this.render();
    }

    // === 生成 ===
    async generate(difficulty) {
        if (this._generating) return;
        // 保存所有textarea内容
        ['action', 'items', 'assist', 'target'].forEach(key => {
            if (this._optBool(key)) {
                const ta = document.getElementById('navi-opt-' + key + '-text');
                if (ta) this._setOpt(key + '_text', ta.value);
            }
        });

        this._generating = difficulty;
        this._commissions = [];
        this.render();

        try {
            const pm = window.VirtualPhone?.promptManager;
            const api = window.VirtualPhone?.apiManager;
            const tm = window.VirtualPhone?.timeManager;
            const context = (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) ? SillyTavern.getContext() : null;
            if (!pm || !api) throw new Error('核心模块未就绪');

            const feature = this.mode === 'observation' ? 'observation' : 'play';
            let basePrompt = pm.getPromptForFeature('navi', feature);
            if (!basePrompt) basePrompt = NAVI_DEFAULTS[feature]?.content || '';
            if (!basePrompt) throw new Error('提示词为空');

            const buildHint = (key, label, mainWord, desc) => {
                if (!this._optBool(key)) return '';
                const text = this._opt(key + '_text').trim();
                if (text) {
                    return `【强制要求 - ${label}】以下指定的${label}必须作为全部6个委托的${mainWord}。每个委托的观测指标都要切实体现，${desc}：\n${text}\n【强制要求结束】`;
                }
                return `【强制要求 - ${label}】你必须为全部6个委托各自原创设计${mainWord}。每个委托的${mainWord}要具体、多样、互不重复。这是硬性要求，不是可选项。\n【强制要求结束】`;
            };

            const buildTargetHint = () => {
                if (!this._optBool('target')) return '';
                const text = this._opt('target_text').trim();
                if (text) {
                    return `【强制要求 - 对象指定】全部6个委托的目标固定为【${text}】。世界书有则提取其种族/年龄/胸穴，无则自行设定，6个委托中该角色的信息保持完全一致。需要生成6种不同的委托方式，互不重复。\n【强制要求结束】`;
                }
                return '【强制要求 - 对象指定】从世界书中随机选择一名角色（无世界书则自行创建一名），作为全部6个委托的统一目标。该角色的种族/年龄/胸穴信息在6个委托中保持完全一致，但委托方式需6种各不相同。\n【强制要求结束】';
            };

            // 世界书
            let worldbookText = '';
            try {
                const wbMsg = await window.VirtualPhone?.worldbookManager?.buildWorldbookMessage('navi');
                worldbookText = wbMsg?.content || '';
            } catch (e) { /* 无世界书管理器则跳过 */ }

            const systemPrompt = basePrompt
                .replace(/\{\{STORY_TIME\}\}/g, tm?.getFormattedTime?.() || '')
                .replace(/\{\{STORY_DATE\}\}/g, tm?.getFormattedDate?.() || '')
                .replace(/\{\{DIFFICULTY\}\}/g, difficulty)
                .replace(/\{\{SUPPLEMENT\}\}/g, this._getSupplement())
                .replace(/\{\{WORLDBOOK\}\}/g, worldbookText || '无')
                .replace(/\{\{ACTION_HINT\}\}/g, buildHint('action', '动作指示', '主要姿势', '具体描述该姿势如何影响乳房和小穴的形态变化'))
                .replace(/\{\{ITEMS_HINT\}\}/g, buildHint('items', '辅助物品', '主要道具', '具体描述该道具如何用于接触或改变目标状态'))
                .replace(/\{\{ASSIST_HINT\}\}/g, (()=>{const h=buildHint('assist','协助人员','协助人员及互动方式','具体描述该人员如何参与互动及对观测的贡献');if(!h)return'';const t=this._opt('assist_text').trim();if(t&&(t.includes('目标自己')||t.includes('自身')||t.includes('本人')))return h.replace('【强制要求结束】','若协助人员为【目标自己】，则全部委托必须由目标主动执行观测动作（如自己用手扒开小穴、自行摆出姿势、自慰展示、用自己的手揉捏乳房等），体己师转为辅助与观测角色，不主导交互。\n【强制要求结束】');return h;})())
                .replace(/\{\{TARGET_HINT\}\}/g, buildTargetHint());

            const result = await api.callAI([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: this.mode === 'observation' ? `请生成6个${difficulty}难度的观测委托。` : `请生成6个${difficulty}的把玩委托。` }
            ], { appId: 'navi', max_tokens: context?.max_response_length || 4096 });

            if (!result?.success) throw new Error(result?.error || 'AI请求失败');
            this._commissions = this._parse(String(result.summary || ''));
        } catch (err) {
            this.app.phoneShell?.showNotification?.('生成失败', err.message, '❌');
        }
        this._generating = null;
        this.render();
    }

    // === 结果列表 ===
    _renderResults() {
        let html = '<div class="navi-section"><div class="navi-section-title">📋 结果 (' + this._commissions.length + ')</div>';
        this._commissions.forEach((c, i) => {
            const clr = DIFF_COLORS[c.difficulty] || '#8c8c8c';
            const site = SITES[i] || '综合';
            const tagHtml = this.mode === 'observation'
                ? `<span class="navi-site-tag">${SITE_ICONS[site]} ${site}</span>`
                : (c.playTag ? `<span class="navi-site-tag">🏷 ${this._esc(c.playTag)}</span>` : '');
            html += `<div class="navi-card" onclick="window.VirtualPhone._naviView.viewDetail(${i})" style="border-left:3px solid ${clr}">
                <div class="navi-card-header">
                    <span class="navi-diff-tag" style="background:${clr};color:#fff">${this._esc(c.difficulty)}</span>
                    ${tagHtml}
                    <button class="navi-copy-btn" onclick="event.stopPropagation();window.VirtualPhone._naviView.copyToChat(${i})">📋</button>
                </div>
                <div class="navi-card-target">🎯 ${this._esc(c.target)}</div>
                <div class="navi-card-indicator">${this._esc(c.indicator || '').substring(0, 100)}${(c.indicator||'').length > 100 ? '...' : ''}</div>
                <div class="navi-card-reward">💰 ${this._esc(c.reward)}</div>
            </div>`;
        });
        html += '</div>';
        return html;
    }

    // === 详情 ===
    _renderDetail() {
        const c = this._commissions[this.selectedIdx];
        if (!c) return '';
        const clr = DIFF_COLORS[c.difficulty] || '#8c8c8c';
        const site = SITES[this.selectedIdx] || '综合';
        const detailTag = this.mode === 'observation'
            ? `<span class="navi-site-tag large">${SITE_ICONS[site]} ${site}</span>`
            : (c.playTag ? `<span class="navi-site-tag large">🏷 ${this._esc(c.playTag)}</span>` : '');
        return `<div class="navi-app"><div class="navi-bar">
            <div class="navi-bar-btn" onclick="window.VirtualPhone._naviView.goBack()" style="margin-right:auto;">← 返回</div>
            <div class="navi-bar-btn" onclick="window.VirtualPhone._naviView.copyToChat(${this.selectedIdx})">📋 发送</div>
        </div><div class="navi-scroll"><div class="navi-detail">
            <div class="navi-detail-header">
                <span class="navi-diff-tag large" style="background:${clr};color:#fff">${this._esc(c.difficulty)}</span>
                ${detailTag}
            </div>
            <div class="navi-detail-field"><div class="navi-detail-label">🎯 任务目标</div><div class="navi-detail-value">${this._esc(c.target)}</div></div>
            <div class="navi-detail-field"><div class="navi-detail-label">📋 观测指标</div><div class="navi-detail-value">${this._esc(c.indicator)}</div></div>
            <div class="navi-detail-field"><div class="navi-detail-label">📊 预估难度</div><div class="navi-detail-value" style="color:${clr}">${this._esc(c.difficulty)}</div></div>
            <div class="navi-detail-field"><div class="navi-detail-label">⏰ 委托时限</div><div class="navi-detail-value">${this._esc(c.deadline || '无')}</div></div>
            <div class="navi-detail-field"><div class="navi-detail-label">💰 预计报酬</div><div class="navi-detail-value reward">${this._esc(c.reward)}</div></div>
        </div></div></div>`;
    }

    copyToChat(idx) {
        const c = this._commissions[idx];
        if (!c) return;
        const site = SITES[idx] || '综合';
        const modeLabel = this.mode === 'observation' ? ` - ${site}` : '';
        const t = `【观测委托 - ${c.difficulty}${modeLabel}】
🎯 任务目标：${c.target || ''}
📋 观测指标：${c.indicator || ''}
📊 预估难度：${c.difficulty || ''}
⏰ 委托时限：${c.deadline || '无'}
💰 预计报酬：${c.reward || ''}`;
        const ta = document.getElementById('send_textarea');
        if (ta) { ta.value = ta.value + (ta.value && !ta.value.endsWith('\n') ? '\n\n' : '') + t; ta.dispatchEvent(new Event('input', { bubbles: true })); ta.focus(); }
    }

    // === 设置 ===
    _renderSettings() {
        const promptObs = window.VirtualPhone?.promptManager?.getPromptForFeature('navi', 'observation') || '';
        const promptPlay = window.VirtualPhone?.promptManager?.getPromptForFeature('navi', 'play') || '';
        const supp = this._getSupplement();
        const presetObs = window.VirtualPhone?.promptManager?.renderPromptPresetControls?.('navi', 'observation') || '';
        const presetPlay = window.VirtualPhone?.promptManager?.renderPromptPresetControls?.('navi', 'play') || '';

        return `<div class="navi-app"><div class="navi-bar">
            <div class="navi-bar-btn" onclick="window.VirtualPhone._naviView.goBack()" style="margin-right:auto;">← 返回</div>
        </div><div class="navi-scroll"><div class="navi-settings-body">

            <div class="navi-s-section">
                <div class="navi-s-section-title">🔍 观测模式提示词</div>
                ${presetObs}
                <textarea id="navi-s-prompt-obs" class="navi-s-textarea">${this._esc(promptObs)}</textarea>
                <div class="navi-s-btn-row">
                    <button class="navi-s-btn navi-s-btn-warn" data-reset="observation">恢复默认</button>
                    <button class="navi-s-btn navi-s-btn-primary" data-save="observation">保存</button>
                </div>
            </div>

            <div class="navi-s-section">
                <div class="navi-s-section-title">✋ 把玩模式提示词</div>
                ${presetPlay}
                <textarea id="navi-s-prompt-play" class="navi-s-textarea">${this._esc(promptPlay)}</textarea>
                <div class="navi-s-btn-row">
                    <button class="navi-s-btn navi-s-btn-warn" data-reset="play">恢复默认</button>
                    <button class="navi-s-btn navi-s-btn-primary" data-save="play">保存</button>
                </div>
            </div>

            <div class="navi-s-section">
                <div class="navi-s-section-title">📝 设定补全</div>
                <div class="navi-s-desc">补充种族特征、特殊设定等，生成时自动注入。</div>
                <textarea id="navi-s-supplement" class="navi-s-textarea" style="min-height:100px;">${this._esc(supp)}</textarea>
                <div class="navi-s-btn-row">
                    <button class="navi-s-btn navi-s-btn-primary" id="navi-s-supplement-save">保存设定补全</button>
                </div>
            </div>

            <div class="navi-s-section">
                <div class="navi-s-row"><span>📚 注入世界书</span>
                    <label class="toggle-switch" style="flex:0 0 auto;"><input type="checkbox" id="navi-use-worldbook" ${this._wbEnabled()?'checked':''}><span class="toggle-slider"></span></label>
                </div>
                <div class="phone-prompt-fold navi-worldbook-fold" data-default-open="false" style="margin-top:10px;">
                    <div class="phone-prompt-fold-header"><div class="phone-prompt-fold-main"><div class="phone-prompt-fold-title">世界书选择</div><div class="phone-prompt-fold-desc">展开后勾选要注入的酒馆世界书</div></div><i class="fa-solid fa-chevron-right phone-prompt-fold-arrow"></i></div>
                    <div class="phone-prompt-fold-content"><div id="navi-worldbook-list"></div></div>
                </div>
            </div>

        </div></div></div>`;
    }

    _bindSettings() {
        const root = this.app.phoneShell.screen;
        if (!root) return;

        // 保存按钮
        root.querySelectorAll('[data-save]').forEach(btn => {
            btn.addEventListener('click', () => {
                const feature = btn.dataset.save;
                const ta = root.querySelector('#navi-s-prompt-' + (feature === 'observation' ? 'obs' : 'play'));
                if (!ta) return;
                try {
                    window.VirtualPhone?.promptManager?.updateActivePromptUserPreset('navi', feature, ta.value);
                    this.app.phoneShell?.showNotification?.('已保存', '', '✅');
                } catch (e) { this.app.phoneShell?.showNotification?.('保存失败', e.message, '❌'); }
            });
        });

        // 恢复按钮
        root.querySelectorAll('[data-reset]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!confirm('恢复默认提示词？')) return;
                const feature = btn.dataset.reset;
                const ta = root.querySelector('#navi-s-prompt-' + (feature === 'observation' ? 'obs' : 'play'));
                const content = NAVI_DEFAULTS[feature]?.content || '';
                if (ta && content) {
                    ta.value = content;
                    try { window.VirtualPhone?.promptManager?.updatePrompt('navi', feature, content); } catch (e) {}
                    this.app.phoneShell?.showNotification?.('已恢复', '', '✅');
                }
            });
        });

        // 设定补全
        root.querySelector('#navi-s-supplement-save')?.addEventListener('click', () => {
            const val = root.querySelector('#navi-s-supplement')?.value || '';
            window.VirtualPhone?.storage?.set?.('navi_supplement', val, true);
            this.app.phoneShell?.showNotification?.('已保存', '', '✅');
        });

        // 世界书开关
        const wbToggle = root.querySelector('#navi-use-worldbook');
        wbToggle?.addEventListener('change', () => {
            window.VirtualPhone?.worldbookManager?.setEnabled('navi', wbToggle.checked);
            if (wbToggle.checked) this._renderWBList();
        });
        if (wbToggle?.checked) this._renderWBList();

        // 折叠面板
        root.querySelectorAll('.phone-prompt-fold').forEach(fold => {
            if (fold.dataset.foldInited !== '1') {
                fold.dataset.foldInited = '1';
                fold.classList.toggle('is-open', String(fold.dataset.defaultOpen || '').toLowerCase() === 'true');
            }
        });
        root.querySelectorAll('.phone-prompt-fold-header').forEach(header => {
            if (header.dataset.foldBound === '1') return;
            header.dataset.foldBound = '1';
            header.addEventListener('click', () => {
                const fold = header.closest('.phone-prompt-fold');
                if (fold) fold.classList.toggle('is-open');
            });
        });

        // 预设控件绑定
        const scope = document.querySelector('.phone-view-current .navi-settings-body') || document;
        ['observation', 'play'].forEach(f => {
            window.VirtualPhone?.promptManager?.bindPromptPresetControls?.(scope, 'navi', f, '#navi-s-prompt-' + (f === 'observation' ? 'obs' : 'play'),
                { notify: (t, m, i) => this.app.phoneShell?.showNotification?.(t, m, i) }
            );
        });
    }

    _getSupplement() { return window.VirtualPhone?.storage?.get?.('navi_supplement') || ''; }
    _wbEnabled() { return window.VirtualPhone?.worldbookManager?.getEnabled?.('navi') ?? true; }

    async _renderWBList() {
        const container = document.getElementById('navi-worldbook-list');
        const mgr = window.VirtualPhone?.worldbookManager;
        if (!container || !mgr) return;
        try {
            const sources = await mgr.listAvailableWorldbooks({ includeEntries: true, force: true });
            const sel = mgr.getSelectionState('navi');
            if (!sources?.length) { container.innerHTML = '<div style="font-size:11px;color:#888;padding:6px 0;">未读取到世界书列表</div>'; return; }
            container.innerHTML = sources.map(s => {
                const checked = sel.initialized && mgr.matchesSelection?.(s, sel.ids) ? 'checked' : '';
                return `<label class="navi-wb-item"><input type="checkbox" class="navi-wb-cb" value="${this._esc(s.id)}" ${checked}><span class="navi-wb-name">${this._esc(s.name)}</span></label>`;
            }).join('');
            container.querySelectorAll('.navi-wb-cb').forEach(cb => {
                cb.addEventListener('change', () => {
                    const ids = [];
                    container.querySelectorAll('.navi-wb-cb').forEach(c => { if (c.checked) ids.push(c.value); });
                    mgr.setSelection('navi', ids);
                });
            });
        } catch (e) { container.innerHTML = '<div style="font-size:11px;color:#d93025;padding:6px 0;">世界书读取失败</div>'; }
    }

    // === 解析 ===
    _parse(content) {
        let text = String(content || '').replace(/```[\s\S]*?```/g, '').replace(/```/g, '');
        const m = text.match(/<委托列表>([\s\S]*?)<\/委托列表>/);
        const inner = m ? m[1] : text;

        // 按 ---委托N--- 硬分割，仿照蜜语的区块提取
        const blocks = inner.split(/---委托\d+---/);
        const commissions = [];

        for (const block of blocks) {
            if (!block.trim()) continue;

            const c = { target: '', indicator: '', playTag: '', difficulty: '未知', deadline: '无', reward: '未知', site: '' };
            let inIndicator = false;
            const lines = block.split('\n');

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) { if (inIndicator) c.indicator += '\n'; continue; }

                // 行首有"标签：值"格式
                const kvMatch = trimmed.match(/^(.+?)[：:]\s*(.*)/);
                if (kvMatch && !inIndicator) {
                    const key = kvMatch[1].trim();
                    const val = kvMatch[2].trim();
                    if (key === '任务目标') c.target = val;
                    else if (key === '观测指标') { c.indicator = val; inIndicator = true; }
                    else if (key === '玩法标签') c.playTag = val;
                    else if (key === '预估难度' || key === '难度') c.difficulty = val;
                    else if (key === '委托时限' || key === '时限') c.deadline = val;
                    else if (key === '预计报酬' || key === '报酬') c.reward = val;
                    else if (key === '观测部位' || key === '部位') c.site = val;
                } else if (inIndicator) {
                    // 观测指标的续行
                    c.indicator += '\n' + trimmed;
                }
            }

            if (c.target && (c.indicator || '').trim().length >= 3) {
                c.indicator = c.indicator.trim();
                commissions.push(c);
            }
        }

        return commissions.slice(0, 6);
    }
}
