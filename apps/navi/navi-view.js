/* N.A.V.I. 观测委托视图 v4.1 — 委托板 + 部位焦点池 */

(function () {
    if (document.getElementById('navi-app-styles')) return;
    const link = document.createElement('link');
    link.id = 'navi-app-styles';
    link.rel = 'stylesheet';
    link.href = new URL('./navi.css?v=4.1.0', import.meta.url).href;
    document.head.appendChild(link);
})();

import Bridge from '../../bridge.js';
import { NAVI_DEFAULTS } from './navi-prompts.js';
import * as Store from './navi-store.js';

const DIFF_LABELS_OBS = ['静观', '诱导', '精测'];
const DIFF_LABELS_PLAY = ['轻度把玩', '沉浸把玩', '深度交互'];
const DIFF_COLORS = {
    静观: '#52c41a', 诱导: '#faad14', 精测: '#ff4d4f',
    简单: '#52c41a', 中等: '#faad14', 困难: '#ff4d4f',
    轻度把玩: '#7c3aed', 沉浸把玩: '#db2777', 深度交互: '#dc2626'
};
const DIFF_ICONS = {
    静观: '👁', 诱导: '✋', 精测: '🔥',
    简单: '🟢', 中等: '🟡', 困难: '🔴',
    轻度把玩: '💜', 沉浸把玩: '💗', 深度交互: '❤️'
};

export class NaviView {
    constructor(app) {
        this.app = app;
        this.currentView = 'home';
        this.mode = '';
        this.selectedId = null;
        this.selectedDifficulty = '';
        this.boardFilter = 'all';
        this._generating = null;
        this._board = Store.loadBoard();
        this._lastRaw = '';
        this._exportId = null;
        if (window.NaviTerm) window.NaviTerm.naviView = this;
    }

    _esc(v) { return Bridge.escapeHtml(v); }
    _opt(key) { return Bridge.termGetString('navi_opt_' + key, ''); }
    _setOpt(key, val) { Bridge.termSet('navi_opt_' + key, String(val || ''), true); }
    _optBool(key) { return Bridge.termGetBool('navi_opt_' + key, false); }
    _getSupplement() { return Bridge.termGetString('navi_supplement', ''); }
    _wbEnabled() { return Bridge.getWorldbookEnabled('navi', true); }

    _reloadBoard() { this._board = Store.loadBoard(); return this._board; }
    _find(id) { return this._board.find((x) => x.id === id) || null; }
    _active() { return this._board.find((x) => x.status === 'active') || null; }

    _saveOptTextsFromDom() {
        ['action', 'items', 'assist', 'target'].forEach((key) => {
            if (!this._optBool(key)) return;
            const ta = document.getElementById('navi-opt-' + key + '-text');
            if (ta) this._setOpt(key + '_text', ta.value);
        });
    }

    render() {
        let html;
        if (this.currentView === 'settings') html = this._renderSettings();
        else if (this.currentView === 'export' && this._find(this._exportId)) html = this._renderExport();
        else if (this.currentView === 'detail' && this._find(this.selectedId)) html = this._renderDetail();
        else if (this.currentView === 'options' && this.mode) html = this._renderOptions();
        else {
            this.currentView = 'home';
            html = this._renderHome();
        }
        this.app.phoneShell.setContent(html, 'navi-' + this.currentView);
        if (this.currentView === 'settings') this._bindSettings();
        if (this.currentView === 'home') this._bindHome();
        if (this.currentView === 'options') this._bindOptions();
    }

    // === 导航 ===
    goHome() { this.currentView = 'home'; this.mode = ''; this.render(); }
    goSettings() { this.currentView = 'settings'; this.render(); }
    goBack() {
        if (this.currentView === 'export') { this.currentView = 'detail'; this.render(); return; }
        if (this.currentView === 'detail') { this.currentView = 'home'; this.render(); return; }
        if (this.currentView === 'options') { this.currentView = 'home'; this.mode = ''; this.render(); return; }
        if (this.currentView === 'settings') { this.currentView = 'home'; this.render(); return; }
        this.goHome();
    }
    selectMode(m) {
        this.mode = m;
        this.selectedDifficulty = m === 'play' ? '轻度把玩' : '静观';
        this.currentView = 'options';
        this.render();
    }
    viewDetail(id) { this.selectedId = id; this.currentView = 'detail'; this.render(); }
    openExport(id) { this._exportId = id; this.currentView = 'export'; this.render(); }
    selectDifficulty(d) {
        this.selectedDifficulty = d;
        if (this.mode === 'observation' && d === '静观') {
            this._setOpt('action', 'false');
            this._setOpt('action_text', '');
        }
        this.render();
    }

    quickStart() {
        const cfg = Store.loadLastCfg();
        if (cfg?.mode) {
            this.mode = cfg.mode === 'play' ? 'play' : 'observation';
            this.selectedDifficulty = cfg.difficulty
                || (this.mode === 'play' ? '轻度把玩' : '静观');
            if (cfg.opts) {
                ['action', 'items', 'assist', 'target'].forEach((k) => {
                    this._setOpt(k, cfg.opts[k] ? 'true' : 'false');
                    this._setOpt(k + '_text', cfg.opts[k + '_text'] || '');
                });
                if (Array.isArray(cfg.opts.sites)) Store.saveSelectedSites(cfg.opts.sites);
            }
            if (cfg.count) Store.setGenCount(cfg.count);
            if (this.mode === 'observation' && this.selectedDifficulty === '静观') {
                this._setOpt('action', 'false');
                this._setOpt('action_text', '');
            }
            this.currentView = 'options';
            this.render();
            return;
        }
        this.app.phoneShell?.showNotification?.('暂无上次配置', '请先选择模式生成一次', 'ℹ️');
    }

    setFilter(f) { this.boardFilter = f; this.render(); }

    // ========== 首页：委托板 ==========
    _renderHome() {
        this._reloadBoard();
        const active = this._active();
        const last = Store.loadLastCfg();
        const lastLabel = last?.mode
            ? `${last.mode === 'play' ? '把玩' : '观测'} · ${last.difficulty || '—'} · ${last.count || 3}条`
            : '尚无记录';
        const filtered = this._filteredBoard();

        return `<div class="navi-app"><div class="navi-bar">
            <div class="navi-bar-title">🎯 观测委托</div>
            <div class="navi-bar-btn" onclick="window.NaviTerm.naviView.goSettings()">⚙️</div>
        </div><div class="navi-scroll">

            <div class="navi-section">
                <div class="navi-quick" onclick="window.NaviTerm.naviView.quickStart()">
                    <div class="navi-quick-main">⚡ 继续上次配置</div>
                    <div class="navi-quick-sub">${this._esc(lastLabel)}</div>
                </div>
                <div class="navi-mode-row">
                    <div class="navi-mode-card compact" onclick="window.NaviTerm.naviView.selectMode('observation')">
                        <div class="navi-mode-icon">🔍</div>
                        <div class="navi-mode-name">观测</div>
                    </div>
                    <div class="navi-mode-card compact" onclick="window.NaviTerm.naviView.selectMode('play')">
                        <div class="navi-mode-icon">✋</div>
                        <div class="navi-mode-name">把玩</div>
                    </div>
                </div>
            </div>

            ${active ? `<div class="navi-section">
                <div class="navi-section-title">进行中</div>
                ${this._renderCard(active, true)}
            </div>` : ''}

            <div class="navi-section">
                <div class="navi-section-head">
                    <div class="navi-section-title" style="margin:0">委托板 (${filtered.length}/${this._board.length})</div>
                    <div class="navi-bar-btn" onclick="window.NaviTerm.naviView.clearUnused()">清空未用</div>
                </div>
                <div class="navi-filter-row">
                    ${[['all', '全部'], ['unused', '未用'], ['active', '进行中'], ['starred', '收藏'], ['used', '已用']].map(([k, lab]) =>
                        `<button class="navi-filter-btn${this.boardFilter === k ? ' on' : ''}" data-f="${k}">${lab}</button>`
                    ).join('')}
                </div>
                ${filtered.length
                    ? filtered.map((c) => this._renderCard(c, false)).join('')
                    : '<div class="navi-empty">暂无委托。选择上方模式开始生成。</div>'}
            </div>
        </div></div>`;
    }

    _bindHome() {
        const root = this.app.phoneShell.screen;
        root?.querySelectorAll('.navi-filter-btn').forEach((btn) => {
            btn.addEventListener('click', () => this.setFilter(btn.dataset.f));
        });
    }

    _filteredBoard() {
        const f = this.boardFilter;
        if (f === 'all') return this._board;
        return this._board.filter((x) => x.status === f);
    }

    _renderCard(c, emphasize) {
        const clr = DIFF_COLORS[c.difficulty] || '#8c8c8c';
        const modeIcon = c.mode === 'play' ? '✋' : '🔍';
        const focus = c.siteFocus || c.site || '';
        const tagHtml = focus
            ? `<span class="navi-site-tag">📍 ${this._esc(focus)}</span>`
            : (c.playTag ? `<span class="navi-site-tag">🏷 ${this._esc(c.playTag)}</span>` : '');
        const optTags = Store.formatOptTags(c.opts || {});
        const stClr = Store.statusColor(c.status);
        return `<div class="navi-card${emphasize ? ' navi-card-active' : ''}${c.status === 'used' ? ' navi-card-used' : ''}" onclick="window.NaviTerm.naviView.viewDetail('${c.id}')" style="border-left:3px solid ${clr}">
            <div class="navi-card-header">
                <span class="navi-st-dot" style="background:${stClr}" title="${Store.statusLabel(c.status)}"></span>
                <span class="navi-diff-tag" style="background:${clr};color:#fff">${modeIcon} ${this._esc(c.difficulty)}</span>
                ${tagHtml}
                ${c.mode === 'play' && c.playTag ? `<span class="navi-site-tag">🏷 ${this._esc(c.playTag)}</span>` : ''}
                ${c.incomplete ? '<span class="navi-site-tag warn">不完整</span>' : ''}
                <button class="navi-copy-btn" onclick="event.stopPropagation();window.NaviTerm.naviView.openExport('${c.id}')">导出</button>
            </div>
            <div class="navi-card-target">🎯 ${this._esc(c.target || '（无对象名）')}</div>
            <div class="navi-card-indicator">${this._esc((c.indicator || '').substring(0, 90))}${(c.indicator || '').length > 90 ? '…' : ''}</div>
            ${optTags.length ? `<div class="navi-opt-tags">${optTags.map((t) => `<span class="navi-opt-tag">${this._esc(t)}</span>`).join('')}</div>` : ''}
            <div class="navi-card-meta"><span>💰 ${this._esc(c.reward)}</span><span class="navi-st-label" style="color:${stClr}">${Store.statusLabel(c.status)}</span></div>
        </div>`;
    }

    clearUnused() {
        if (!confirm('清空所有「未用」委托？收藏/进行中/已用会保留。')) return;
        this._board = Store.clearByFilter(this._board, (x) => x.status === 'unused');
        this.app.phoneShell?.showNotification?.('已清空未用', '', '✅');
        this.render();
    }

    // ========== 生成配置页 ==========
    _isJinguan() {
        return this.mode === 'observation' && this.selectedDifficulty === '静观';
    }

    _renderOptions() {
        const modeName = this.mode === 'observation' ? '🔍 观测 · 视觉镜头' : '✋ 把玩 · 触觉镜头';
        const diffLabels = this.mode === 'observation' ? DIFF_LABELS_OBS : DIFF_LABELS_PLAY;
        if (!this.selectedDifficulty || !diffLabels.includes(this.selectedDifficulty)) {
            this.selectedDifficulty = diffLabels[0];
        }
        const count = Store.getGenCount();
        const busy = !!this._generating;
        const sites = Store.loadSelectedSites();
        const jinguan = this._isJinguan();

        return `<div class="navi-app"><div class="navi-bar">
            <div class="navi-bar-btn" onclick="window.NaviTerm.naviView.goBack()" style="margin-right:auto">← 返回</div>
            <div class="navi-bar-btn" onclick="window.NaviTerm.naviView.goSettings()">⚙️</div>
        </div><div class="navi-scroll">
            <div class="navi-section">
                <div class="navi-section-title">${this.mode === 'observation' ? '🔍 观测模式' : '✋ 把玩模式'}</div>
                ${this._renderOptToggle('action', '🏃 动作指示', jinguan ? '静观档已禁用（保持自然）' : '关键动作融入步骤流程；留空则 AI 设计', jinguan)}
                ${this._renderOptToggle('items', '🧴 辅助物品', '主要交互物（道具/身体部位均可，肢体勿当道具写）；留空则 AI 设计')}
                ${this._renderOptToggle('assist', '👥 协助人员', '全程协助，方式自主；留空则 AI 设计')}
                ${this._renderOptToggle('target', '🎯 对象指定', '仅固定目标是谁；留空则统一随机/自创')}
            </div>
            <div class="navi-section">
                <div class="navi-section-title">部位焦点池（最多${Store.MAX_SITES}个 · 条数独立）</div>
                <div class="navi-site-grid" id="navi-site-grid">
                    ${Store.SITE_POOL.map((s) => {
                        const on = sites.includes(s);
                        return `<button type="button" class="navi-site-chip${on ? ' on' : ''}" data-site="${this._esc(s)}">${this._esc(s)}</button>`;
                    }).join('')}
                </div>
                <div class="navi-hint">多选作为本批焦点池（轮转分配到每条）。全不选=从全部部位随机。不决定生成条数。</div>
            </div>
            <div class="navi-section">
                <div class="navi-section-title">生成条数（追加，不覆盖）</div>
                <div class="navi-count-row">
                    ${[1, 3, 6].map((n) =>
                        `<button class="navi-count-btn${count === n ? ' on' : ''}" data-n="${n}" ${busy ? 'disabled' : ''}>${n} 条</button>`
                    ).join('')}
                </div>
            </div>
            <div class="navi-section">
                <div class="navi-section-title">${this.mode === 'observation' ? '观察档位（先点选，再生成）' : '交互尺度（先点选，再生成）'}</div>
                <div class="navi-diff-buttons">
                    ${diffLabels.map((d) => {
                        const on = this.selectedDifficulty === d;
                        return `<button class="navi-diff-btn${on ? ' on' : ''}" style="border-color:${DIFF_COLORS[d]};color:${on ? '#fff' : DIFF_COLORS[d]};${on ? `background:${DIFF_COLORS[d]}` : ''}"
                            onclick="window.NaviTerm.naviView.selectDifficulty('${d}')" ${busy ? 'disabled' : ''}>
                            ${DIFF_ICONS[d]} ${d}
                        </button>`;
                    }).join('')}
                </div>
                <div class="navi-hint">${this.mode === 'observation'
                    ? '👁静观：自然、不指示不碰　✋诱导：可指示+可碰（非性行为）　🔥精测：性主题可任意接触，全程视觉镜头'
                    : '💜轻度：浅触　💗沉浸：敏感区/X交/放尿　❤️深度：插入·玩具·SM·高潮　· 触觉镜头'
                }</div>
                <button class="navi-gen-btn" onclick="window.NaviTerm.naviView.generate()" ${busy ? 'disabled' : ''}>
                    ${busy ? '⏳ 生成中…' : `生成 ${count} 条 · ${this.selectedDifficulty}`}
                </button>
            </div>
        </div></div>`;
    }

    _bindOptions() {
        const root = this.app.phoneShell.screen;
        root?.querySelectorAll('.navi-count-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                Store.setGenCount(parseInt(btn.dataset.n, 10));
                this.render();
            });
        });
        root?.querySelectorAll('.navi-site-chip').forEach((btn) => {
            btn.addEventListener('click', () => {
                const site = btn.dataset.site;
                let cur = Store.loadSelectedSites();
                if (cur.includes(site)) {
                    cur = cur.filter((s) => s !== site);
                } else {
                    if (cur.length >= Store.MAX_SITES) {
                        this.app.phoneShell?.showNotification?.('最多选 ' + Store.MAX_SITES + ' 个部位', '', 'ℹ️');
                        return;
                    }
                    cur = [...cur, site];
                }
                Store.saveSelectedSites(cur);
                this.render();
            });
        });
    }

    _renderOptToggle(key, label, hint, forcedOff = false) {
        const enabled = !forcedOff && this._optBool(key);
        const text = enabled ? this._opt(key + '_text') : '';
        return `<div class="navi-opt-block${forcedOff ? ' navi-opt-disabled' : ''}">
            <div class="navi-opt-header">
                <span>${label}${forcedOff ? ' <small style="color:#999">（静观禁用）</small>' : ''}</span>
                <label class="toggle-switch" style="flex:0 0 auto;${forcedOff ? 'opacity:0.4;pointer-events:none' : ''}">
                    <input type="checkbox" ${enabled ? 'checked' : ''} ${forcedOff ? 'disabled' : ''}
                        onchange="window.NaviTerm.naviView._toggleOpt('${key}', this.checked)">
                    <span class="toggle-slider"></span>
                </label>
            </div>
            ${enabled ? `<div class="navi-opt-body">
                <textarea id="navi-opt-${key}-text" class="navi-opt-textarea" placeholder="${this._esc(hint)}">${this._esc(text)}</textarea>
                <div class="navi-opt-hint">${this._esc(hint)}</div>
            </div>` : (forcedOff ? `<div class="navi-opt-hint" style="padding:0 0 0">${this._esc(hint)}</div>` : '')}
        </div>`;
    }

    _toggleOpt(key, checked) {
        if (key === 'action' && this._isJinguan()) return;
        this._setOpt(key, checked ? 'true' : 'false');
        if (!checked) this._setOpt(key + '_text', '');
        this.render();
    }

    _captureOpts() {
        this._saveOptTextsFromDom();
        const sites = Store.loadSelectedSites();
        const opts = Store.snapshotOpts((k) => this._optBool(k), (k) => this._opt(k), { sites });
        if (this._isJinguan()) {
            opts.action = false;
            opts.action_text = '';
        }
        return opts;
    }

    // ========== 生成 / 重 roll ==========
    async generate(difficulty) {
        if (this._generating) return;
        const diff = difficulty || this.selectedDifficulty
            || (this.mode === 'play' ? '轻度把玩' : '静观');
        this.selectedDifficulty = diff;
        const count = Store.getGenCount();
        const opts = this._captureOpts();
        const siteFocuses = Store.assignSiteFocuses(count, opts.sites || []);
        Store.saveLastCfg({ mode: this.mode, difficulty: diff, count, opts, at: Date.now() });
        this._generating = diff;
        this.render();
        try {
            const items = await this._runGenerate({
                mode: this.mode,
                difficulty: diff,
                count,
                opts,
                siteFocuses
            });
            this._board = Store.appendItems(this._board, items);
            this.app.phoneShell?.showNotification?.(
                `已追加 ${items.length} 条`,
                items.some((x) => x.incomplete) ? '部分解析不完整' : '',
                '✅'
            );
            this.currentView = 'home';
            this.boardFilter = 'unused';
            this.mode = '';
        } catch (err) {
            console.error('[NAVI][generate]', err, this._lastRaw ? { raw: this._lastRaw.slice(0, 600) } : '');
            this.app.phoneShell?.showNotification?.('生成失败', err.message, '❌');
        }
        this._generating = null;
        this.render();
    }

    async reroll(id) {
        if (this._generating) return;
        const old = this._find(id);
        if (!old) return;
        this._generating = 'reroll:' + id;
        this.render();
        try {
            const focus = old.siteFocus || old.site || '';
            const items = await this._runGenerate({
                mode: old.mode,
                difficulty: old.difficulty,
                count: 1,
                opts: old.opts || {},
                siteFocuses: focus ? [focus] : Store.assignSiteFocuses(1, old.opts?.sites || [])
            });
            if (!items.length) throw new Error('重 roll 未得到有效委托');
            const neu = { ...items[0], id: old.id, status: old.status, createdAt: old.createdAt };
            this._board = Store.updateItem(this._board, old.id, neu);
            this.app.phoneShell?.showNotification?.('已重新生成该条', '', '✅');
        } catch (err) {
            console.error('[NAVI][reroll]', err);
            this.app.phoneShell?.showNotification?.('重 roll 失败', err.message, '❌');
        }
        this._generating = null;
        this.render();
    }

    async _runGenerate({ mode, difficulty, count, opts, siteFocuses }) {
        if (!Bridge.isCoreReady()) {
            throw new Error(Bridge.describeReadiness().message || '手机桥接未就绪');
        }
        const context = Bridge.getSTContext();
        const feature = mode === 'play' ? 'play' : 'observation';
        let basePrompt = Bridge.getTermPrompt('navi', feature, NAVI_DEFAULTS[feature]?.content || '');
        if (!basePrompt) throw new Error('提示词为空');

        const n = count === 1 || count === 6 ? count : 3;
        const focuses = Array.isArray(siteFocuses) && siteFocuses.length
            ? siteFocuses
            : Store.assignSiteFocuses(n, opts?.sites || []);
        while (focuses.length < n) focuses.push(focuses[focuses.length - 1] || '胸部');

        // 静观强制关掉动作指示
        if (feature === 'observation' && difficulty === '静观') {
            opts = { ...(opts || {}), action: false, action_text: '' };
        }

        const optGet = (k) => !!opts?.[k];
        const optText = (k) => String(opts?.[k + '_text'] || '').trim();

        /** 辅助内容是否像人类肢体/器官（不当道具） */
        const looksLikeBodyPart = (t) => {
            const s = String(t || '');
            return /阴茎|肉棒|鸡巴|手指|指腹|指尖|舌头|唇|嘴|手掌|手|足|脚|脚趾|大腿|胸部|乳房|乳头|腰|腹|性器|器官|肢体/.test(s);
        };

        const buildActionHint = () => {
            if (!optGet('action')) return '';
            const t = optText('action');
            if (t) {
                return `【强制要求 - 动作指示】
下列动作必须融入全部${n}个委托的「步骤」流程中（作为过程中的关键行动，不是单独表演、也不写成长段描写）：
${t}
- 用短祈使句写进步骤；禁止把动作展开成过程描写或结果描写。
【强制要求结束】`;
            }
            return `【强制要求 - 动作指示】为全部${n}个委托各自设计不同的关键动作，并写入步骤（短句、融入流程）。\n【强制要求结束】`;
        };

        const buildItemsHint = () => {
            if (!optGet('items')) return '';
            const t = optText('items');
            if (!t) {
                return `【强制要求 - 辅助物品】为全部${n}个委托指定主要交互物，并在步骤中实际使用。\n【强制要求结束】`;
            }
            const body = looksLikeBodyPart(t);
            if (body) {
                return `【强制要求 - 辅助物品·身体部位】
下列内容是「身体部位/器官」，不是可拿起的分离道具：
${t}
- 必须作为全部${n}个委托的主要交互手段，在步骤中实际使用。
- 禁止写成「道具/工具/物品/拿起/取出/放下」。
- 应写成当事人身上的部位在使用（如主角用自身××接触、抵住、插入等，按用户所写归属理解）。
- 步骤仍保持短祈使句，不写体感/形态结论。
【强制要求结束】`;
            }
            return `【强制要求 - 辅助物品·实物/环境】
下列内容是主要交互物，必须在全部${n}个委托的步骤中被实际使用（接触主焦点或达成委托目的）：
${t}
- 禁止只在文案里提一句却不进入步骤。
- 步骤短句；禁止过程描写与结果描写。
【强制要求结束】`;
        };

        const buildAssistHint = () => {
            if (!optGet('assist')) return '';
            const t = optText('assist');
            if (t) {
                return `【强制要求 - 协助人员】
协助者：${t}
- 须全程协助本批委托完成。
- 具体如何协助由该人员自行决定，不要在步骤里写死其操作清单或手法教程。
- 步骤中最多点到「有其在场/配合」，不要规定其逐步动作。
- 若协助者为目标自己/本人：由目标自主配合，仍不要写死每一步手法。
【强制要求结束】`;
            }
            return `【强制要求 - 协助人员】为全部${n}个委托安排协助者；协助方式自主，步骤不写死手法。\n【强制要求结束】`;
        };

        const buildTargetHint = () => {
            if (!optGet('target')) return '';
            const text = optText('target');
            if (text) {
                return `【强制要求 - 对象指定】
全部${n}个委托的任务目标人物固定为【${text}】。
- 只固定「是谁」，不额外规定玩法。
- 世界书有同名则补种族/年龄/胸穴，无则自定；${n}条信息一致，步骤方式可不同。
【强制要求结束】`;
            }
            return `【强制要求 - 对象指定】从世界书选一人或自创一人，作为全部${n}个委托的统一目标；只固定身份，不锁玩法细节。\n【强制要求结束】`;
        };

        const buildSiteFocusHint = () => {
            const lines = focuses.slice(0, n).map((s, i) => `委托${i + 1}主焦点：${s}`);
            return `【强制要求 - 部位焦点】本批每条主焦点如下，步骤必须直接服务该焦点：\n${lines.join('\n')}\n【强制要求结束】`;
        };

        const buildConstraints = () => {
            const items = [`当前档【${difficulty}】。`, '步骤必须纯行动短句，禁止过程/结果/感受描写。'];
            const targetName = optGet('target') ? optText('target') : '';
            const assistName = optGet('assist') ? optText('assist') : '';
            const itemT = optGet('items') ? optText('items') : '';
            if (optGet('target')) {
                items.push(targetName
                    ? `对象指定：仅固定目标为【${targetName}】。`
                    : '对象指定：统一目标人物。');
            }
            if (optGet('action')) {
                const t = optText('action');
                items.push(t
                    ? `动作指示：将「${t}」融入步骤流程（短句）。`
                    : '动作指示：关键动作写入步骤。');
            }
            if (optGet('items')) {
                if (itemT && looksLikeBodyPart(itemT)) {
                    items.push(`辅助交互：身体部位「${itemT}」作主要交互手段，禁止写成道具。`);
                } else if (itemT) {
                    items.push(`辅助物品：「${itemT}」须在步骤中实际使用。`);
                } else {
                    items.push('辅助物品：主要交互物须写入步骤并实际使用。');
                }
            }
            if (optGet('assist')) {
                items.push(assistName
                    ? `协助人员：【${assistName}】全程协助，方式自主，步骤不写死手法。`
                    : '协助人员：全程协助，方式自主。');
            }
            return '⚠️ 强制约束（优先级最高）：\n' + items.map((s, i) => (i + 1) + '. ' + s).join('\n');
        };

        const story = Bridge.getStoryTimeParts();
        const worldbookText = Bridge.getWorldbookEnabled('navi', true)
            ? await Bridge.buildWorldbookText('navi')
            : '';

        let systemPrompt = basePrompt
            .replace(/\{\{COUNT\}\}/g, String(n))
            .replace(/恰好6个/g, `恰好${n}个`)
            .replace(/全部6个/g, `全部${n}个`)
            .replace(/生成6个/g, `生成${n}个`)
            .replace(/6个委托/g, `${n}个委托`)
            .replace(/6种/g, `${n}种`)
            .replace(/\{\{STORY_TIME\}\}/g, story.time || '')
            .replace(/\{\{STORY_DATE\}\}/g, story.date || '')
            .replace(/\{\{DIFFICULTY\}\}/g, difficulty)
            .replace(/\{\{SUPPLEMENT\}\}/g, this._getSupplement())
            .replace(/\{\{WORLDBOOK\}\}/g, worldbookText || '无')
            .replace(/\{\{ACTION_HINT\}\}/g, buildActionHint())
            .replace(/\{\{ITEMS_HINT\}\}/g, buildItemsHint())
            .replace(/\{\{ASSIST_HINT\}\}/g, buildAssistHint())
            .replace(/\{\{TARGET_HINT\}\}/g, buildTargetHint())
            .replace(/\{\{SITE_FOCUS_HINT\}\}/g, buildSiteFocusHint())
            .replace(/\{\{CONSTRAINTS\}\}/g, buildConstraints());

        // 清理旧提示词残留的「体己师」字样（用户未恢复默认时）
        systemPrompt = systemPrompt.replace(/体己师/g, '主角');

        const userMsg = feature === 'observation'
            ? `请严格按【${difficulty}】档生成恰好${n}个观测委托。姓名必填；主焦点依次：${focuses.slice(0, n).join('、')}。事前准备≤2句；步骤必须纯行动短句且条条服务主焦点；禁止过程/结果/感受描写；禁止要看/记录点/镜头字段；禁止使用「体己师」一词。`
            : `请严格按【${difficulty}】档生成恰好${n}个把玩委托。姓名必填；主焦点依次：${focuses.slice(0, n).join('、')}。事前准备≤2句；步骤必须纯行动短句且条条作用于主焦点；禁止过程/结果/体感结论；禁止要感受/记录点/镜头字段；禁止使用「体己师」一词。`;

        const result = await Bridge.callPhoneAI(
            [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMsg }
            ],
            { appId: 'navi', max_tokens: context?.max_response_length || 4096 }
        );
        if (!result?.success) throw new Error(result?.error || 'AI请求失败');
        this._lastRaw = String(result.summary || '');
        let parsed = this._parse(this._lastRaw, n);
        if (!parsed.length) throw new Error('未能解析出委托。可打开控制台查看原文后重试。');

        const incomplete = parsed.length < n;
        parsed = parsed.map((c, i) => Store.normalizeItem({
            ...c,
            id: Store.uid(),
            mode,
            difficulty: c.difficulty && c.difficulty !== '未知' ? c.difficulty : difficulty,
            siteFocus: focuses[i] || c.site || '',
            site: focuses[i] || c.site || '',
            status: 'unused',
            opts: { ...opts },
            createdAt: Date.now(),
            incomplete: incomplete && i === parsed.length - 1 ? true : incomplete
        }));
        // 标记批次不完整
        if (incomplete) parsed = parsed.map((c) => ({ ...c, incomplete: true }));
        return parsed;
    }

    // ========== 详情 ==========
    _renderDetail() {
        const c = this._find(this.selectedId);
        if (!c) return '';
        const clr = DIFF_COLORS[c.difficulty] || '#8c8c8c';
        const busy = this._generating === 'reroll:' + c.id;
        const focus = c.siteFocus || c.site || '';
        const tagHtml = focus
            ? `<span class="navi-site-tag large">📍 ${this._esc(focus)}</span>`
            : '';
        const optTags = Store.formatOptTags(c.opts || {});
        const indicatorLabel = c.mode === 'play' ? '交互要点' : '观测指标';
        const lensHint = c.mode === 'play'
            ? '导出时注入【触觉镜头】供正文读取'
            : '导出时注入【视觉镜头】供正文读取';

        return `<div class="navi-app"><div class="navi-bar">
            <div class="navi-bar-btn" onclick="window.NaviTerm.naviView.goBack()" style="margin-right:auto">← 返回</div>
            <div class="navi-bar-btn" onclick="window.NaviTerm.naviView.openExport('${c.id}')">导出</div>
        </div><div class="navi-scroll"><div class="navi-detail">
            <div class="navi-detail-header">
                <span class="navi-diff-tag large" style="background:${clr};color:#fff">${this._esc(c.difficulty)}</span>
                ${tagHtml}
                ${c.playTag ? `<span class="navi-site-tag large">🏷 ${this._esc(c.playTag)}</span>` : ''}
                <span class="navi-st-label" style="color:${Store.statusColor(c.status)}">${Store.statusLabel(c.status)}</span>
            </div>
            <div class="navi-hint" style="margin:0 0 10px">${lensHint}</div>
            ${optTags.length ? `<div class="navi-opt-tags" style="margin-bottom:10px">${optTags.map((t) => `<span class="navi-opt-tag">${this._esc(t)}</span>`).join('')}</div>` : ''}
            <div class="navi-detail-field navi-detail-target"><div class="navi-detail-label">🎯 观测对象 / 任务目标</div><div class="navi-detail-value">${c.target ? this._esc(c.target) : '<span style="color:#ff4d4f">（缺失：请重 roll 或检查提示词）</span>'}</div></div>
            ${focus ? `<div class="navi-detail-field"><div class="navi-detail-label">📍 主焦点</div><div class="navi-detail-value">${this._esc(focus)}</div></div>` : ''}
            <div class="navi-detail-field"><div class="navi-detail-label">📋 ${indicatorLabel}</div><div class="navi-detail-value">${this._esc(c.indicator)}</div></div>
            <div class="navi-detail-field"><div class="navi-detail-label">⏰ 委托时限</div><div class="navi-detail-value">${this._esc(c.deadline || '无')}</div></div>
            <div class="navi-detail-field"><div class="navi-detail-label">💰 预计报酬</div><div class="navi-detail-value reward">${this._esc(c.reward)}</div></div>

            <div class="navi-action-grid">
                <button class="navi-act" onclick="window.NaviTerm.naviView.setItemStatus('${c.id}','active')">▶ 接取</button>
                <button class="navi-act" onclick="window.NaviTerm.naviView.setItemStatus('${c.id}','starred')">★ 收藏</button>
                <button class="navi-act" onclick="window.NaviTerm.naviView.setItemStatus('${c.id}','used')">✓ 已用</button>
                <button class="navi-act" onclick="window.NaviTerm.naviView.setItemStatus('${c.id}','unused')">↺ 未用</button>
                <button class="navi-act" onclick="window.NaviTerm.naviView.reroll('${c.id}')" ${busy ? 'disabled' : ''}>${busy ? '⏳' : '🎲'} 重roll</button>
                <button class="navi-act danger" onclick="window.NaviTerm.naviView.deleteItem('${c.id}')">🗑 删除</button>
            </div>
            <div class="navi-hint">接取后会出现在首页「进行中」；导出可选多种模板写入酒馆输入框。</div>
        </div></div></div>`;
    }

    setItemStatus(id, status) {
        this._board = Store.setStatus(this._board, id, status);
        this.app.phoneShell?.showNotification?.(Store.statusLabel(status), '', '✅');
        this.render();
    }

    deleteItem(id) {
        if (!confirm('删除这条委托？')) return;
        this._board = Store.removeItem(this._board, id);
        this.currentView = 'home';
        this.app.phoneShell?.showNotification?.('已删除', '', '✅');
        this.render();
    }

    // ========== 导出 ==========
    _renderExport() {
        const c = this._find(this._exportId);
        if (!c) return '';
        return `<div class="navi-app"><div class="navi-bar">
            <div class="navi-bar-btn" onclick="window.NaviTerm.naviView.goBack()" style="margin-right:auto">← 返回</div>
        </div><div class="navi-scroll"><div class="navi-section">
            <div class="navi-section-title">导出到酒馆输入框</div>
            <div class="navi-export-list">
                <button class="navi-export-btn" onclick="window.NaviTerm.naviView.exportToChat('${c.id}','system')">📡 系统下发<br><span>N.A.V.I. 订单口吻</span></button>
                <button class="navi-export-btn" onclick="window.NaviTerm.naviView.exportToChat('${c.id}','accept')">▶ 接单行动<br><span>{{user}} 前往执行的简述</span></button>
                <button class="navi-export-btn" onclick="window.NaviTerm.naviView.exportToChat('${c.id}','focus')">📋 仅指标<br><span>本轮剧情焦点，精简</span></button>
                <button class="navi-export-btn" onclick="window.NaviTerm.naviView.exportToChat('${c.id}','full')">📄 完整卡片<br><span>目标+指标+时限+报酬</span></button>
                <button class="navi-export-btn" onclick="window.NaviTerm.naviView.copyClipboard('${c.id}')">📑 复制剪贴板<br><span>不写入输入框</span></button>
            </div>
            <label class="navi-check-row"><input type="checkbox" id="navi-export-mark-active" checked> 导出后标记为「进行中」</label>
        </div></div></div>`;
    }

    _lensBlock(mode) {
        if (mode === 'play') {
            return `【镜头指令】本段正文切入触觉镜头，不切入视觉镜头。具体怎么写跟随既有文风与描写规则，此处不另作枚举。`;
        }
        return `【镜头指令】本段正文切入视觉镜头，不切入触觉镜头。具体怎么写跟随既有文风与描写规则，此处不另作枚举。`;
    }

    _buildExportText(c, type) {
        const modeName = c.mode === 'play' ? '把玩' : '观测';
        const site = (c.siteFocus || c.site)
            ? ` · ${c.siteFocus || c.site}`
            : (c.playTag ? ` · ${c.playTag}` : '');
        const who = c.target || '（未指定对象）';
        const focus = c.siteFocus || c.site || '';
        const lens = this._lensBlock(c.mode);
        // 去掉指标里误生成的「镜头：」行，避免与导出指令重复冲突
        const indicator = String(c.indicator || '')
            .split('\n')
            .filter((line) => !/^\s*镜头\s*[：:]/.test(line))
            .join('\n')
            .trim();

        if (type === 'system') {
            return `${lens}

【N.A.V.I. ${modeName}委托 · ${c.difficulty}${site}】
对象：${who}
${focus ? `主焦点：${focus}\n` : ''}${indicator}
时限：${c.deadline || '无'}　报酬：${c.reward || ''}`;
        }
        if (type === 'accept') {
            return `${lens}

（接取委托 · ${c.difficulty}${site}）
对象：${who}
${indicator}`;
        }
        if (type === 'focus') {
            return `${lens}

【本轮焦点】${who}${focus ? ` · ${focus}` : ''}
${indicator}`;
        }
        return `${lens}

【观测委托 - ${c.difficulty}${site}】
🎯 对象：${who}
${focus ? `📍 主焦点：${focus}\n` : ''}📋 ${c.mode === 'play' ? '交互要点' : '观测指标'}：
${indicator}
⏰ ${c.deadline || '无'}　💰 ${c.reward || ''}`;
    }

    exportToChat(id, type) {
        const c = this._find(id);
        if (!c) return;
        const text = this._buildExportText(c, type);
        if (!Bridge.appendToChatInput(text)) {
            this.app.phoneShell?.showNotification?.('写入失败', '未找到酒馆输入框', '❌');
            return;
        }
        const mark = document.getElementById('navi-export-mark-active');
        if (!mark || mark.checked) {
            this._board = Store.setStatus(this._board, id, 'active');
        }
        this.app.phoneShell?.showNotification?.('已写入输入框', '', '✅');
        this.currentView = 'detail';
        this.selectedId = id;
        this.render();
    }

    async copyClipboard(id) {
        const c = this._find(id);
        if (!c) return;
        const text = this._buildExportText(c, 'full');
        try {
            if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
            else {
                const ta = document.createElement('textarea');
                ta.value = text;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                ta.remove();
            }
            this.app.phoneShell?.showNotification?.('已复制', '', '✅');
        } catch (e) {
            this.app.phoneShell?.showNotification?.('复制失败', e.message, '❌');
        }
    }

    // ========== 设置（沿用） ==========
    _renderSettings() {
        const promptObs = Bridge.getTermPrompt('navi', 'observation', NAVI_DEFAULTS.observation?.content || '');
        const promptPlay = Bridge.getTermPrompt('navi', 'play', NAVI_DEFAULTS.play?.content || '');
        const supp = this._getSupplement();
        const bridgeStatus = Bridge.describeReadiness();

        return `<div class="navi-app"><div class="navi-bar">
            <div class="navi-bar-btn" onclick="window.NaviTerm.naviView.goBack()" style="margin-right:auto">← 返回</div>
        </div><div class="navi-scroll"><div class="navi-settings-body">
            <div class="navi-s-section">
                <div class="navi-s-section-title">🔌 桥接状态</div>
                <div class="navi-s-desc" style="color:${bridgeStatus.level === 'ok' ? '#52c41a' : bridgeStatus.level === 'warn' ? '#faad14' : '#ff4d4f'}">${this._esc(bridgeStatus.message)}</div>
            </div>
            <div class="navi-s-section">
                <div class="navi-s-section-title">🗂 委托板</div>
                <div class="navi-s-desc">当前 ${this._board.length} / ${Store.MAX_BOARD} 条。超出时丢弃最旧记录。</div>
                <div class="navi-s-btn-row">
                    <button class="navi-s-btn navi-s-btn-warn" id="navi-clear-all">清空全部委托</button>
                </div>
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
                <div class="navi-s-desc">种族特征、特殊设定等，生成时注入。</div>
                <textarea id="navi-s-supplement" class="navi-s-textarea" style="min-height:100px">${this._esc(supp)}</textarea>
                <div class="navi-s-btn-row">
                    <button class="navi-s-btn navi-s-btn-primary" id="navi-s-supplement-save">保存设定补全</button>
                </div>
            </div>
            <div class="navi-s-section">
                <div class="navi-s-row"><span>📚 注入世界书</span>
                    <label class="toggle-switch" style="flex:0 0 auto"><input type="checkbox" id="navi-use-worldbook" ${this._wbEnabled() ? 'checked' : ''}><span class="toggle-slider"></span></label>
                </div>
                <div class="nt-fold" data-default-open="false" style="margin-top:10px">
                    <div class="nt-fold-header"><div class="nt-fold-main"><div class="nt-fold-title">世界书选择</div><div class="nt-fold-desc">勾选注入的酒馆世界书</div></div><span class="nt-fold-arrow">›</span></div>
                    <div class="nt-fold-content"><div id="navi-worldbook-list"></div></div>
                </div>
            </div>
        </div></div></div>`;
    }

    _bindSettings() {
        const root = this.app.phoneShell.screen;
        if (!root) return;

        root.querySelector('#navi-clear-all')?.addEventListener('click', () => {
            if (!confirm('清空委托板全部记录？')) return;
            this._board = Store.saveBoard([]);
            this.app.phoneShell?.showNotification?.('已清空', '', '✅');
        });

        root.querySelectorAll('[data-save]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const feature = btn.dataset.save;
                const ta = root.querySelector('#navi-s-prompt-' + (feature === 'observation' ? 'obs' : 'play'));
                if (!ta) return;
                try {
                    Bridge.setTermPrompt('navi', feature, ta.value, { customized: true });
                    this.app.phoneShell?.showNotification?.('已保存', '', '✅');
                } catch (e) {
                    this.app.phoneShell?.showNotification?.('保存失败', e.message, '❌');
                }
            });
        });

        root.querySelectorAll('[data-reset]').forEach((btn) => {
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
            Bridge.termSet('navi_supplement', root.querySelector('#navi-s-supplement')?.value || '', true);
            this.app.phoneShell?.showNotification?.('已保存', '', '✅');
        });

        const wbToggle = root.querySelector('#navi-use-worldbook');
        wbToggle?.addEventListener('change', () => {
            Bridge.setWorldbookEnabled('navi', wbToggle.checked);
            if (wbToggle.checked) this._renderWBList();
        });
        if (wbToggle?.checked) this._renderWBList();

        root.querySelectorAll('.nt-fold').forEach((fold) => {
            if (fold.dataset.foldInited === '1') return;
            fold.dataset.foldInited = '1';
            fold.classList.toggle('is-open', String(fold.dataset.defaultOpen || '').toLowerCase() === 'true');
            fold.querySelector('.nt-fold-header')?.addEventListener('click', () => fold.classList.toggle('is-open'));
        });
    }

    async _renderWBList() {
        const container = document.getElementById('navi-worldbook-list');
        const mgr = Bridge.getWorldbookManager();
        if (!container) return;
        if (!mgr?.listAvailableWorldbooks) {
            container.innerHTML = '<div style="font-size:11px;color:#888;padding:6px 0">世界书桥接不可用</div>';
            return;
        }
        try {
            const sources = await mgr.listAvailableWorldbooks({ includeEntries: true, force: true });
            const sel = mgr.getSelectionState?.('navi') || { initialized: false, ids: [] };
            if (!sources?.length) {
                container.innerHTML = '<div style="font-size:11px;color:#888;padding:6px 0">未读取到世界书列表</div>';
                return;
            }
            container.innerHTML = sources.map((s) => {
                const checked = sel.initialized && mgr.matchesSelection?.(s, sel.ids) ? 'checked' : '';
                return `<label class="navi-wb-item"><input type="checkbox" class="navi-wb-cb" value="${this._esc(s.id)}" ${checked}><span class="navi-wb-name">${this._esc(s.name)}</span></label>`;
            }).join('');
            container.querySelectorAll('.navi-wb-cb').forEach((cb) => {
                cb.addEventListener('change', () => {
                    const ids = [];
                    container.querySelectorAll('.navi-wb-cb').forEach((c) => { if (c.checked) ids.push(c.value); });
                    try { mgr.setSelection?.('navi', ids); } catch (e) {
                        this.app.phoneShell?.showNotification?.('世界书选择失败', e.message, '❌');
                    }
                });
            });
        } catch (_) {
            container.innerHTML = '<div style="font-size:11px;color:#d93025;padding:6px 0">世界书读取失败</div>';
        }
    }

    // ========== 解析 ==========
    _parse(content, maxN = 6) {
        let text = String(content || '')
            .replace(/```[\s\S]*?```/g, (block) => block.replace(/```\w*\n?/g, '').replace(/```/g, ''))
            .replace(/```/g, '');
        const m = text.match(/<委托列表>([\s\S]*?)<\/委托列表>/i)
            || text.match(/<委托列表>([\s\S]*)$/i);
        const inner = m ? m[1] : text;

        let blocks = inner.split(/---\s*委托\s*\d+\s*---/);
        if (blocks.length <= 1) blocks = inner.split(/【\s*委托\s*\d+\s*】/);
        if (blocks.length <= 1) blocks = inner.split(/(?:^|\n)\s*委托\s*\d+\s*[：:.\)]\s*/);
        const commissions = [];

        for (const block of blocks) {
            if (!block.trim()) continue;
            const c = { target: '', indicator: '', playTag: '', difficulty: '未知', deadline: '无', reward: '未知', site: '' };
            let inIndicator = false;
            for (const line of block.split('\n')) {
                const trimmed = line.trim();
                if (!trimmed) { if (inIndicator) c.indicator += '\n'; continue; }
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
        return commissions.slice(0, maxN);
    }
}
