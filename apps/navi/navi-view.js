/* N.A.V.I. 体己师观测终端 - 观测委托视图 v3.2 */

(function() {
    if (document.getElementById('navi-app-styles')) return;
    const link = document.createElement('link');
    link.id = 'navi-app-styles'; link.rel = 'stylesheet';
    link.href = new URL('./navi.css?v=3.2.0', import.meta.url).href;
    document.head.appendChild(link);
})();

import Bridge from '../../bridge.js';
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
        this._lastRaw = '';
        if (window.NaviTerm) window.NaviTerm.naviView = this;
    }

    _esc(v) { return Bridge.escapeHtml(v); }

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

    // === 选项读写（经 bridge，手机 storage + localStorage 双写） ===
    _opt(key) { return Bridge.termGetString('navi_opt_' + key, ''); }
    _setOpt(key, val) { Bridge.termSet('navi_opt_' + key, String(val || ''), true); }
    _optBool(key) { return Bridge.termGetBool('navi_opt_' + key, false); }

    // === 模式选择 ===
    _renderModeSelect() {
        return `<div class="navi-app"><div class="navi-bar">
            <div class="navi-bar-btn" onclick="window.NaviTerm.naviView.goSettings()">⚙️</div>
        </div><div class="navi-scroll"><div class="navi-section">
            <div class="navi-section-title">📡 选择委托模式</div>
            <div class="navi-mode-cards">
                <div class="navi-mode-card" onclick="window.NaviTerm.naviView.selectMode('observation')">
                    <div class="navi-mode-icon">🔍</div>
                    <div class="navi-mode-name">观测模式</div>
                    <div class="navi-mode-desc">以观察乳房和小穴的形态变化为目标<br>不主动干预肉体，通过姿态、环境、对比等方式观测</div>
                </div>
                <div class="navi-mode-card" onclick="window.NaviTerm.naviView.selectMode('play')">
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
            <div class="navi-bar-btn" onclick="window.NaviTerm.naviView.goSettings()">⚙️</div>
        </div><div class="navi-scroll">
            <div class="navi-section" style="display:flex;align-items:center;gap:8px;padding-bottom:0;">
                <div class="navi-bar-btn" onclick="window.NaviTerm.naviView.goHome()" style="margin-right:0;">← 切换模式</div>
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
                            onclick="window.NaviTerm.naviView.generate('${d}')" ${loading ? 'disabled' : ''}>
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
                        onchange="window.NaviTerm.naviView._toggleOpt('${key}', this.checked)">
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
            if (!Bridge.isCoreReady()) {
                const st = Bridge.describeReadiness();
                throw new Error(st.message || '手机桥接未就绪');
            }
            const context = Bridge.getSTContext();
            const feature = this.mode === 'observation' ? 'observation' : 'play';
            let basePrompt = Bridge.getTermPrompt('navi', feature, NAVI_DEFAULTS[feature]?.content || '');
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

            const buildConstraints = () => {
                const items = [];
                const targetName = this._optBool('target') ? this._opt('target_text').trim() : '';
                const assistName = this._optBool('assist') ? this._opt('assist_text').trim() : '';
                const isSelf = assistName && targetName && assistName === targetName;
                if (this._optBool('target')) {
                    items.push(targetName ?
                        `对象指定：全部6个委托目标固定为【${targetName}】，同一角色6种不同委托方式${isSelf?'（目标同时担任协助者，需主动执行观测动作）':''}。` :
                        '对象指定：从世界书随机选一名角色作为全部6个委托的统一目标。');
                }
                if (this._optBool('action')) {
                    const t = this._opt('action_text').trim();
                    items.push(t ?
                        `动作指示：主要姿势固定为"${t}"。` :
                        '动作指示：为每个委托设计不同的主要姿势。');
                }
                if (this._optBool('items')) {
                    const t = this._opt('items_text').trim();
                    items.push(t ?
                        `辅助物品：核心交互工具固定为"${t}"，必须出现在每个委托中并实际参与互动。` :
                        '辅助物品：为每个委托指定不同的核心交互工具，必须实际参与互动。');
                }
                if (this._optBool('assist')) {
                    items.push(assistName ?
                        `协助人员：协助者为"${assistName}"${isSelf||assistName.includes('目标自己')||assistName.includes('自身')?'（由目标主动执行全部观测动作，体己师转为辅助与观测角色）':''}。` :
                        '协助人员：为每个委托指定不同的协助者。');
                }
                if (!items.length) return '';
                return '⚠️ 当前生效的强制约束（以下规则优先级最高，必须全部遵守）：\n' + items.map((s,i) => (i+1)+'. '+s).join('\n');
            };

            const story = Bridge.getStoryTimeParts();
            const worldbookText = Bridge.getWorldbookEnabled('navi', true)
                ? await Bridge.buildWorldbookText('navi')
                : '';

            const systemPrompt = basePrompt
                .replace(/\{\{STORY_TIME\}\}/g, story.time || '')
                .replace(/\{\{STORY_DATE\}\}/g, story.date || '')
                .replace(/\{\{DIFFICULTY\}\}/g, difficulty)
                .replace(/\{\{SUPPLEMENT\}\}/g, this._getSupplement())
                .replace(/\{\{WORLDBOOK\}\}/g, worldbookText || '无')
                .replace(/\{\{ACTION_HINT\}\}/g, buildHint('action', '动作指示', '主要姿势', '具体描述该姿势如何影响乳房和小穴的形态变化'))
                .replace(/\{\{ITEMS_HINT\}\}/g, (()=>{if(!this._optBool('items'))return'';const t=this._opt('items_text').trim();if(t)return`【强制要求 - 辅助物品】以下道具必须出现在全部6个委托中，并作为核心交互工具被实际使用。每个委托的观测指标必须具体描写该道具参与互动的过程和效果：\n${t}\n【强制要求结束】`;return'【强制要求 - 辅助物品】你必须为全部6个委托各自指定一个核心交互工具。每个委托的工具必须不同，且必须在观测指标中具体描写该工具实际参与互动的过程和效果。这是硬性要求，不是可选项。\n【强制要求结束】';})())
                .replace(/\{\{ASSIST_HINT\}\}/g, (()=>{const h=buildHint('assist','协助人员','协助人员及互动方式','具体描述该人员如何参与互动及对观测的贡献');if(!h)return'';const t=this._opt('assist_text').trim();if(t&&(t.includes('目标自己')||t.includes('自身')||t.includes('本人')))return h.replace('【强制要求结束】','若协助人员为【目标自己】，则全部委托必须由目标主动执行观测动作（如自己用手扒开小穴、自行摆出姿势、自慰展示、用自己的手揉捏乳房等），体己师转为辅助与观测角色，不主导交互。\n【强制要求结束】');return h;})())
                .replace(/\{\{TARGET_HINT\}\}/g, buildTargetHint())
                .replace(/\{\{CONSTRAINTS\}\}/g, buildConstraints());

            const result = await Bridge.callPhoneAI([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: this.mode === 'observation' ? `请生成6个${difficulty}难度的观测委托。` : `请生成6个${difficulty}的把玩委托。` }
            ], { appId: 'navi', max_tokens: context?.max_response_length || 4096 });

            if (!result?.success) throw new Error(result?.error || 'AI请求失败');
            this._lastRaw = String(result.summary || '');
            this._commissions = this._parse(this._lastRaw);
            if (!this._commissions.length) {
                throw new Error('未能解析出委托（可在设置外查看控制台原文）。请重试或检查提示词格式约束。');
            }
        } catch (err) {
            console.error('[NAVI][generate]', err, this._lastRaw ? { rawPreview: this._lastRaw.slice(0, 500) } : '');
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
            html += `<div class="navi-card" onclick="window.NaviTerm.naviView.viewDetail(${i})" style="border-left:3px solid ${clr}">
                <div class="navi-card-header">
                    <span class="navi-diff-tag" style="background:${clr};color:#fff">${this._esc(c.difficulty)}</span>
                    ${tagHtml}
                    <button class="navi-copy-btn" onclick="event.stopPropagation();window.NaviTerm.naviView.copyToChat(${i})">📋</button>
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
            <div class="navi-bar-btn" onclick="window.NaviTerm.naviView.goBack()" style="margin-right:auto;">← 返回</div>
            <div class="navi-bar-btn" onclick="window.NaviTerm.naviView.copyToChat(${this.selectedIdx})">📋 发送</div>
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
        if (!Bridge.appendToChatInput(t)) {
            this.app.phoneShell?.showNotification?.('发送失败', '未找到酒馆输入框', '❌');
            return;
        }
        this.app.phoneShell?.showNotification?.('已写入输入框', '', '✅');
    }

    // === 设置 ===
    _renderSettings() {
        const promptObs = Bridge.getTermPrompt('navi', 'observation', NAVI_DEFAULTS.observation?.content || '');
        const promptPlay = Bridge.getTermPrompt('navi', 'play', NAVI_DEFAULTS.play?.content || '');
        const supp = this._getSupplement();
        const bridgeStatus = Bridge.describeReadiness();

        return `<div class="navi-app"><div class="navi-bar">
            <div class="navi-bar-btn" onclick="window.NaviTerm.naviView.goBack()" style="margin-right:auto;">← 返回</div>
        </div><div class="navi-scroll"><div class="navi-settings-body">

            <div class="navi-s-section">
                <div class="navi-s-section-title">🔌 桥接状态</div>
                <div class="navi-s-desc" style="color:${bridgeStatus.level === 'ok' ? '#52c41a' : bridgeStatus.level === 'warn' ? '#faad14' : '#ff4d4f'}">${this._esc(bridgeStatus.message)}</div>
            </div>

            <div class="navi-s-section">
                <div class="navi-s-section-title">🔍 观测模式提示词</div>
                <textarea id="navi-s-prompt-obs" class="navi-s-textarea">${this._esc(promptObs)}</textarea>
                <div class="navi-s-btn-row">
                    <button class="navi-s-btn navi-s-btn-warn" data-reset="observation">恢复默认</button>
                    <button class="navi-s-btn navi-s-btn-primary" data-save="observation">保存</button>
                </div>
            </div>

            <div class="navi-s-section">
                <div class="navi-s-section-title">✋ 把玩模式提示词</div>
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
                <div class="nt-fold navi-worldbook-fold" data-default-open="false" style="margin-top:10px;">
                    <div class="nt-fold-header"><div class="nt-fold-main"><div class="nt-fold-title">世界书选择</div><div class="nt-fold-desc">展开后勾选要注入的酒馆世界书</div></div><span class="nt-fold-arrow">›</span></div>
                    <div class="nt-fold-content"><div id="navi-worldbook-list"></div></div>
                </div>
            </div>

        </div></div></div>`;
    }

    _bindSettings() {
        const root = this.app.phoneShell.screen;
        if (!root) return;

        root.querySelectorAll('[data-save]').forEach(btn => {
            btn.addEventListener('click', () => {
                const feature = btn.dataset.save;
                const ta = root.querySelector('#navi-s-prompt-' + (feature === 'observation' ? 'obs' : 'play'));
                if (!ta) return;
                try {
                    Bridge.setTermPrompt('navi', feature, ta.value, { customized: true });
                    this.app.phoneShell?.showNotification?.('已保存', '', '✅');
                } catch (e) { this.app.phoneShell?.showNotification?.('保存失败', e.message, '❌'); }
            });
        });

        root.querySelectorAll('[data-reset]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!confirm('恢复默认提示词？')) return;
                const feature = btn.dataset.reset;
                const ta = root.querySelector('#navi-s-prompt-' + (feature === 'observation' ? 'obs' : 'play'));
                const content = NAVI_DEFAULTS[feature]?.content || '';
                if (ta && content) {
                    ta.value = content;
                    Bridge.resetTermPrompt('navi', feature, content);
                    this.app.phoneShell?.showNotification?.('已恢复', '', '✅');
                }
            });
        });

        root.querySelector('#navi-s-supplement-save')?.addEventListener('click', () => {
            const val = root.querySelector('#navi-s-supplement')?.value || '';
            Bridge.termSet('navi_supplement', val, true);
            this.app.phoneShell?.showNotification?.('已保存', '', '✅');
        });

        const wbToggle = root.querySelector('#navi-use-worldbook');
        wbToggle?.addEventListener('change', () => {
            Bridge.setWorldbookEnabled('navi', wbToggle.checked);
            if (wbToggle.checked) this._renderWBList();
        });
        if (wbToggle?.checked) this._renderWBList();

        root.querySelectorAll('.nt-fold').forEach(fold => {
            if (fold.dataset.foldInited === '1') return;
            fold.dataset.foldInited = '1';
            fold.classList.toggle('is-open', String(fold.dataset.defaultOpen || '').toLowerCase() === 'true');
            fold.querySelector('.nt-fold-header')?.addEventListener('click', () => fold.classList.toggle('is-open'));
        });
    }

    _getSupplement() { return Bridge.termGetString('navi_supplement', ''); }
    _wbEnabled() { return Bridge.getWorldbookEnabled('navi', true); }

    async _renderWBList() {
        const container = document.getElementById('navi-worldbook-list');
        const mgr = Bridge.getWorldbookManager();
        if (!container) return;
        if (!mgr?.listAvailableWorldbooks) {
            container.innerHTML = '<div style="font-size:11px;color:#888;padding:6px 0;">世界书桥接不可用</div>';
            return;
        }
        try {
            const sources = await mgr.listAvailableWorldbooks({ includeEntries: true, force: true });
            const sel = mgr.getSelectionState?.('navi') || { initialized: false, ids: [] };
            if (!sources?.length) {
                container.innerHTML = '<div style="font-size:11px;color:#888;padding:6px 0;">未读取到世界书列表</div>';
                return;
            }
            container.innerHTML = sources.map(s => {
                const checked = sel.initialized && mgr.matchesSelection?.(s, sel.ids) ? 'checked' : '';
                return `<label class="navi-wb-item"><input type="checkbox" class="navi-wb-cb" value="${this._esc(s.id)}" ${checked}><span class="navi-wb-name">${this._esc(s.name)}</span></label>`;
            }).join('');
            container.querySelectorAll('.navi-wb-cb').forEach(cb => {
                cb.addEventListener('change', () => {
                    const ids = [];
                    container.querySelectorAll('.navi-wb-cb').forEach(c => { if (c.checked) ids.push(c.value); });
                    try { mgr.setSelection?.('navi', ids); } catch (e) {
                        this.app.phoneShell?.showNotification?.('世界书选择失败', e.message, '❌');
                    }
                });
            });
        } catch (e) {
            container.innerHTML = '<div style="font-size:11px;color:#d93025;padding:6px 0;">世界书读取失败</div>';
        }
    }

    // === 解析 ===
    _parse(content) {
        let text = String(content || '')
            .replace(/```[\s\S]*?```/g, (block) => block.replace(/```\w*\n?/g, '').replace(/```/g, ''))
            .replace(/```/g, '');
        const m = text.match(/<委托列表>([\s\S]*?)<\/委托列表>/i)
            || text.match(/<委托列表>([\s\S]*)$/i);
        const inner = m ? m[1] : text;

        // 兼容 ---委托N--- / 【委托N】 / 委托N：
        let blocks = inner.split(/---\s*委托\s*\d+\s*---/);
        if (blocks.length <= 1) blocks = inner.split(/【\s*委托\s*\d+\s*】/);
        if (blocks.length <= 1) blocks = inner.split(/(?:^|\n)\s*委托\s*\d+\s*[：:.\)]\s*/);
        const commissions = [];

        for (const block of blocks) {
            if (!block.trim()) continue;

            const c = { target: '', indicator: '', playTag: '', difficulty: '未知', deadline: '无', reward: '未知', site: '' };
            let inIndicator = false;
            const lines = block.split('\n');

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) { if (inIndicator) c.indicator += '\n'; continue; }

                // 观测指标续行中若遇到新字段，结束指标
                const kvMatch = trimmed.match(/^([^\s：:]{1,12})[：:]\s*(.*)/);
                if (kvMatch) {
                    const key = kvMatch[1].trim();
                    const val = kvMatch[2].trim();
                    const known = ['任务目标', '观测指标', '玩法标签', '预估难度', '难度', '委托时限', '时限', '预计报酬', '报酬', '观测部位', '部位'];
                    if (known.includes(key)) {
                        inIndicator = false;
                        if (key === '任务目标') c.target = val;
                        else if (key === '观测指标') { c.indicator = val; inIndicator = true; }
                        else if (key === '玩法标签') c.playTag = val;
                        else if (key === '预估难度' || key === '难度') c.difficulty = val || c.difficulty;
                        else if (key === '委托时限' || key === '时限') c.deadline = val || c.deadline;
                        else if (key === '预计报酬' || key === '报酬') c.reward = val || c.reward;
                        else if (key === '观测部位' || key === '部位') c.site = val;
                        continue;
                    }
                }
                if (inIndicator) c.indicator += '\n' + trimmed;
            }

            if (c.target && (c.indicator || '').trim().length >= 3) {
                c.indicator = c.indicator.trim();
                commissions.push(c);
            }
        }

        return commissions.slice(0, 6);
    }
}
