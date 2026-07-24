/* N.A.V.I. EroLinks v5.0 — 人物信息 | 催眠与指令 */

(function () {
    if (document.getElementById('erolinks-styles')) return;
    const l = document.createElement('link');
    l.id = 'erolinks-styles';
    l.rel = 'stylesheet';
    l.href = new URL('./erolinks.css?v=5.0.0', import.meta.url).href;
    document.head.appendChild(l);
})();

import Bridge from '../../bridge.js';
import * as EStore from './erolinks-store.js';

/** 人物信息子 Tab（只读） */
const INFO_TABS = [
    { key: 'info', icon: '📋', name: '基础' },
    { key: 'body', icon: '🔞', name: '身体' },
    { key: 'secret', icon: '🔒', name: '秘密' },
    { key: 'outfit', icon: '👗', name: '服装' }
];

/** 催眠与指令子 Tab */
const CMD_TABS = [
    { key: 'hypno', icon: '🧠', name: '催眠' },
    { key: 'dress', icon: '👔', name: '着装' }
];

export class EroLinksView {
    constructor(app) {
        this.app = app;
        this.currentView = 'main';
        /** @type {'profile'|'command'} */
        this.section = 'profile';
        this.activeTab = 'info';
        this.cmdTab = 'hypno';
        this._loading = false;
        this._linkMode = 'full';
        this._linkedData = null;
        this._wbRendered = false;
        this._outfitChanges = {};
        this._lastRaw = '';
        this._prefs = EStore.loadPrefs();
        this._hypno = EStore.loadHypnoSession();
        if (window.NaviTerm) window.NaviTerm.erolinksView = this;
        Bridge.ensurePromptDefaults('erolinks', {
            link: { enabled: true, name: 'EroLinks LINK', content: this._getDefaultLinkPrompt('[世界书内容]', '[聊天记录]'), order: 10 }
        }, 9);
    }

    _esc(v) { return Bridge.escapeHtml(v); }

    render() {
        let h;
        if (this.currentView === 'settings') h = this._renderSettings();
        else if (this.currentView === 'linked' && this._linkedData) h = this._renderLinked();
        else h = this._renderMain();
        this.app.phoneShell.setContent(h, 'erolinks-' + this.currentView);
        if (this.currentView === 'settings') this._bindSettings();
        if (this.currentView === 'main') this._bindMain();
        if (this.currentView === 'linked') this._bindLinked();
    }

    goSettings() { this.currentView = 'settings'; this._wbRendered = false; this.render(); }
    goBack() { this.currentView = this._linkedData ? 'linked' : 'main'; this.render(); }
    goMain() { this.currentView = 'main'; this._loading = false; this.render(); }
    switchTab(k) { this.activeTab = k; this.render(); }
    switchSection(sec) {
        this.section = sec === 'command' ? 'command' : 'profile';
        if (this.section === 'profile' && !INFO_TABS.some((t) => t.key === this.activeTab)) this.activeTab = 'info';
        if (this.section === 'command' && !CMD_TABS.some((t) => t.key === this.cmdTab)) this.cmdTab = 'hypno';
        this.render();
    }
    switchCmdTab(k) { this.cmdTab = k; this.render(); }
    disconnect() {
        this._linkedData = null;
        this._outfitChanges = {};
        this.currentView = 'main';
        this.section = 'profile';
        this.activeTab = 'info';
        this.render();
    }

    _renderMain() {
        const prefs = this._prefs || EStore.loadPrefs();
        const depth = prefs.chatDepth || 5;
        const nameVal = prefs.lastTargetName || '';
        const archives = EStore.loadArchive();
                const archHtml = archives.length
            ? archives.map((p) => {
                const t = p.updatedAt ? new Date(p.updatedAt).toLocaleString() : '';
                return `<div class="el-arch-row" data-name="${this._esc(p.charName)}">
                    <button type="button" class="el-arch-item" data-act="open" data-name="${this._esc(p.charName)}">
                        <span class="el-arch-name">${this._esc(p.charName)}</span>
                        <span class="el-arch-meta">${this._esc(p.mood || p.location || '—')} · ${this._esc(t)}</span>
                    </button>
                    <button type="button" class="el-arch-del" data-act="del" data-name="${this._esc(p.charName)}" title="删除">×</button>
                </div>`;
            }).join('')
            : '<div class="el-arch-empty">暂无档案。LINK 成功后会自动保存。</div>';

        return `<div class="erolinks-app">
            <div class="erolinks-bar">
                <div class="erolinks-bar-btn" onclick="window.NaviTerm.erolinksView.goSettings()">⚙️</div>
            </div>
            <div class="erolinks-main el-main-scroll">
                <div class="erolinks-link-btn ${this._loading ? 'loading' : ''}" id="el-link-btn">
                    <div class="erolinks-link-ring"></div>
                    <div class="erolinks-link-text">${this._loading ? '⏳' : 'LINK'}</div>
                    ${this._loading ? '<div class="erolinks-link-sub">链接中...</div>' : ''}
                </div>
                <div class="erolinks-hint">链接对话角色 · 可指定姓名 · 结果写入档案</div>
                <div class="el-link-form">
                    <label class="el-field">
                        <span class="el-field-label">目标姓名（可空=从聊天识别）</span>
                        <input type="text" id="el-target-name" class="el-input" placeholder="例如：夏织" value="${this._esc(nameVal)}">
                    </label>
                    <div class="el-field">
                        <span class="el-field-label">聊天上下文</span>
                        <div class="el-depth-row" id="el-depth-row">
                            ${[1, 5, 10].map((n) =>
                                `<button type="button" class="el-depth-btn${depth === n ? ' on' : ''}" data-depth="${n}">最近 ${n} 条</button>`
                            ).join('')}
                        </div>
                    </div>
                </div>
                <div class="el-arch-block">
                    <div class="el-arch-title">📁 角色档案（${archives.length}）</div>
                    <div class="el-arch-list" id="el-arch-list">${archHtml}</div>
                    <div class="el-arch-hint">点名称打开 · 右侧 × 删除</div>
                </div>
            </div>
        </div>`;
    }

    openArchive(name) {
        const p = EStore.getProfile(name);
        if (!p) {
            this.app.phoneShell?.showNotification?.('未找到档案', name || '', '❌');
            return;
        }
        this._linkedData = EStore.normalizeProfile(p);
        this._outfitChanges = {};
        this.activeTab = 'info';
        this.currentView = 'linked';
        this._prefs = EStore.savePrefs({ lastTargetName: p.charName || '' });
        this.render();
    }

    deleteArchive(name) {
        if (!name) return;
        if (!confirm(`删除档案「${name}」？`)) return;
        EStore.removeProfile(name);
        if (this._linkedData && EStore.sanitizeName(this._linkedData.charName) === EStore.sanitizeName(name)) {
            this._linkedData = null;
            this.currentView = 'main';
        }
        this.app.phoneShell?.showNotification?.('已删除', name, '✅');
        this.render();
    }

    _bindMain() {
        const root = this.app.phoneShell.screen;
        if (!root) return;
        root.querySelector('#el-link-btn')?.addEventListener('click', () => {
            if (this._loading) return;
            const name = root.querySelector('#el-target-name')?.value?.trim() || '';
            this._prefs = EStore.savePrefs({ lastTargetName: name });
            this._linkChar('full');
        });
        root.querySelectorAll('.el-depth-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                const d = parseInt(btn.dataset.depth, 10);
                this._prefs = EStore.savePrefs({ chatDepth: d });
                this.render();
            });
        });
        root.querySelector('#el-target-name')?.addEventListener('change', (e) => {
            this._prefs = EStore.savePrefs({ lastTargetName: e.target.value || '' });
        });
        root.querySelectorAll('.el-arch-item').forEach((btn) => {
            btn.addEventListener('click', () => this.openArchive(btn.dataset.name || ''));
        });
        root.querySelectorAll('.el-arch-del').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteArchive(btn.dataset.name || '');
            });
        });
    }

    _extractField(text, label) {
        const idx = text.indexOf('【' + label + '】');
        if (idx === -1) return '';
        const start = idx + label.length + 2;
        const rest = text.substring(start);
        const nb = rest.indexOf('\n【');
        const val = nb > 0 ? rest.substring(0, nb) : nb === 0 ? rest.substring(1) : rest;
        return val.trim();
    }

    _parseLinkResult(text) {
        const ex = (label) => this._extractField(text, label);
        let outfitRaw = '';
        const outfitIdx = text.indexOf('【服装穿着】');
        if (outfitIdx !== -1) {
            outfitRaw = text.substring(outfitIdx + '【服装穿着】'.length).trim();
        } else {
            // 兼容无总标题、直接从【帽子】开始
            const hatIdx = text.indexOf('【帽子】');
            if (hatIdx !== -1) outfitRaw = text.substring(hatIdx).trim();
        }
        return {
            charName: ex('链接角色') || '角色',
            race: ex('种族'),
            age: ex('年龄'),
            role: ex('身份'),
            affiliation: ex('所属'),
            activity: ex('当前活动'),
            location: ex('所在位置'),
            favorability: ex('好感度'),
            heartRate: ex('心率'),
            temp: ex('体温'),
            mood: ex('当前状态'),
            breast: ex('胸部'),
            vulva: ex('小穴'),
            sexExp: ex('性经验'),
            lastSex: ex('最近性行为'),
            mastFreq: ex('自慰频率'),
            lastMast: ex('最近自慰'),
            sensitive: ex('敏感部位'),
            wetness: ex('湿润状态'),
            arousal: ex('快感阶段'),
            cycle: ex('生理周期'),
            desire: ex('当前欲望'),
            fantasy: ex('幻想内容'),
            kink: ex('秘密嗜好'),
            bodyChange: ex('身体变化'),
            thought: ex('心理所想'),
            outfit: this._parseOutfit(outfitRaw)
        };
    }

    /** @param {'full'|'status'|'outfit'} mode */
    async _linkChar(mode = 'full') {
        if (this._loading) return;
        this._linkMode = mode || 'full';
        this._loading = true;
        this.render();
        try {
            if (!Bridge.isCoreReady()) {
                throw new Error(Bridge.describeReadiness().message || '核心未就绪');
            }
            const ctx = Bridge.getSTContext();
            if (!ctx) throw new Error('SillyTavern 上下文不可用');

            const prefs = this._prefs || EStore.loadPrefs();
            const root = this.app.phoneShell?.screen;
            const inputName = root?.querySelector?.('#el-target-name')?.value?.trim()
                || prefs.lastTargetName
                || this._linkedData?.charName
                || '';
            if (inputName) this._prefs = EStore.savePrefs({ lastTargetName: inputName });

            const worldbookText = Bridge.getWorldbookEnabled('erolinks', true)
                ? await Bridge.buildWorldbookText('erolinks')
                : '';
            const chatText = EStore.buildChatContext(ctx.chat || [], prefs.chatDepth || 5);
            const systemPrompt = this._resolveLinkPrompt(worldbookText, chatText, {
                mode: this._linkMode,
                targetName: inputName,
                currentOutfit: this._linkedData?.outfit,
                currentProfile: this._linkedData
            });

            const userHint = this._linkMode === 'status'
                ? '状态增量：未变化字段输出「保持」，仅正文有变化的动态字段写新值。禁止重写未变更描述。'
                : this._linkMode === 'outfit'
                    ? '服装增量：未变更分区输出「- 保持」，变更分区才写新衣物或「- 无」。禁止重写未变更服装。'
                    : (this._linkedData
                        ? '全量增量：已有档案时未变化字段输出「保持」，仅变化处更新；服装未变写「- 保持」。'
                        : '请建立全量链接并按格式输出（首次无档案，完整填写）。');

            const result = await Bridge.callPhoneAI(
                [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userHint }
                ],
                { appId: 'erolinks', max_tokens: ctx.max_response_length || 2048 }
            );
            if (!result?.success) throw new Error(result?.error || '连接失败');

            const text = String(result.summary || '');
            this._lastRaw = text;
            let parsed = this._parseLinkResult(text);
            if (inputName && (!parsed.charName || parsed.charName === '角色')) {
                parsed.charName = inputName;
            }
            parsed = this._normalizeProbeable(parsed);

            const prev = EStore.getProfile(parsed.charName) || this._linkedData;
            const mergeMode = this._linkMode === 'status' || this._linkMode === 'outfit'
                ? this._linkMode
                : 'full';
            this._linkedData = EStore.mergeProfiles(prev, parsed, mergeMode);
            this._linkedData = this._normalizeProbeable(this._linkedData);
            EStore.upsertProfile(this._linkedData);
            this._saveConfirmed();
            this._prefs = EStore.savePrefs({ lastTargetName: this._linkedData.charName || '' });
            this.currentView = 'linked';
            this.activeTab = this._linkMode === 'outfit' ? 'outfit' : 'info';
            this._outfitChanges = {};
            this.app.phoneShell?.showNotification?.(
                this._linkMode === 'full' ? '已链接' : (this._linkMode === 'status' ? '状态已刷新' : '服装已刷新'),
                this._linkedData.charName,
                '✅'
            );
        } catch (err) {
            console.error('[EroLinks]', err, this._lastRaw ? { rawPreview: this._lastRaw.slice(0, 400) } : '');
            this.app.phoneShell?.showNotification?.('链接失败', err.message, '❌');
        }
        this._loading = false;
        this.render();
    }

    _resolveLinkPrompt(worldbookText, chatText, opts = {}) {
        const wb = worldbookText || '无';
        const chat = chatText || '无';
        const mode = opts.mode || 'full';
        const targetName = String(opts.targetName || '').trim();
        const stored = Bridge.getTermPrompt('erolinks', 'link', '');
        let base;
        if (stored && stored.includes('【链接角色】')) {
            base = stored
                .replace(/\[世界书内容\]/g, wb)
                .replace(/\[最后一条聊天记录\]/g, chat)
                .replace(/\[聊天记录\]/g, chat);
            if (!base.includes('世界书：') || !base.includes('聊天记录：')) {
                base = `${base}\n\n世界书：${wb}\n聊天记录：${chat}`;
            }
        } else {
            base = this._getDefaultLinkPrompt(wb, chat);
        }
        const extra = [];
        if (targetName) {
            extra.push(`【强制】链接角色固定为【${targetName}】。【链接角色】必须输出该姓名。`);
        } else {
            extra.push('【认人】从聊天记录中识别主要角色；多人时优先最近发言或被点名者。');
        }
        const cur = this._linkedData || opts.currentProfile || null;
        if (mode === 'status') {
            const snap = EStore.formatProfileSnapshot(cur, EStore.DYNAMIC_FIELDS);
            extra.push(`【本次范围·状态增量更新】
【链接角色】必须正确。
下面是【当前已记录动态状态】。正文/聊天没有明确变化的字段必须原样输出「保持」，禁止换同义改写、禁止重新发挥。
仅正文有明确变化的字段才写新值。心率体温只写纯数字。不要输出服装块（或服装全写保持）。

【当前已记录动态状态】
${snap || '（尚无）'}
`);
        } else if (mode === 'outfit') {
            const snap = EStore.formatOutfitSnapshot(cur?.outfit || opts.currentOutfit || {});
            extra.push(`【本次范围·服装增量更新】
【链接角色】必须正确。
下面是角色【当前已记录着装】，正文没有明确变更的分区必须输出 "- 保持"，禁止重写、禁止换同义描述、禁止重新发挥。
只有聊天/正文里明确发生的穿脱换，才输出新的 "- 短名称 | 描述" 或 "- 无"。
禁止把未提及的分区改成待确认或重新编造衣物。

【当前已记录着装】
${snap || '（尚无记录）'}
`);
        } else if (mode === 'full' && cur) {
            const snap = EStore.formatProfileSnapshot(cur, [...EStore.STATIC_FIELDS, ...EStore.DYNAMIC_FIELDS]);
            const oSnap = EStore.formatOutfitSnapshot(cur.outfit || {});
            extra.push(`【全量刷新·仍须增量】
已有档案时：正文未变化的字段输出「保持」；仅变化处写新值。禁止无故重写同义描述。
服装未变更槽输出 "- 保持"。

【当前档案摘要】
${snap}

【当前着装】
${oSnap}
`);
        }
        return extra.length ? `${base}\n\n${extra.join('\n')}` : base;
    }

    _normalizeProbeable(d) {
        const p = { ...(d || {}) };
        const fields = [
            'race', 'age', 'role', 'affiliation', 'activity', 'location', 'favorability',
            'heartRate', 'temp', 'mood', 'breast', 'vulva', 'sensitive', 'wetness',
            'arousal', 'bodyChange', 'thought',
            // 秘密字段也不应显示字面「保持」
            'sexExp', 'lastSex', 'mastFreq', 'lastMast', 'cycle', 'desire', 'fantasy', 'kink'
        ];
        // 任何字段都不允许最终展示字面「保持」
        fields.forEach((f) => {
            if (EStore.isKeepToken(p[f])) p[f] = '';
        });
        const probe = [
            'race', 'age', 'role', 'affiliation', 'activity', 'location', 'favorability',
            'heartRate', 'temp', 'mood', 'breast', 'vulva', 'sensitive', 'wetness',
            'arousal', 'bodyChange', 'thought'
        ];
        probe.forEach((f) => {
            p[f] = EStore.probeableFallback(f, p[f]);
        });
        p.heartRate = EStore.digitsOnly(p.heartRate, '72');
        p.temp = EStore.digitsOnly(p.temp, '36.5');
        ['sexExp', 'lastSex', 'mastFreq', 'lastMast', 'cycle', 'desire', 'fantasy', 'kink'].forEach((f) => {
            if (!String(p[f] || '').trim() || EStore.isKeepToken(p[f])) p[f] = '未询问';
        });
        p.outfit = EStore.normalizeOutfit(p.outfit);
        return p;
    }

    _getDefaultLinkPrompt(worldbookText, chatText) {
        return `你是EroLinks链接模块。根据世界书与聊天记录输出角色可探测状态。

【世界书优先】
1. 先根据世界书（社会设定+同名角色条目）确定默认状态与默认着装。
2. 再看聊天/正文是否有明确变更；有变更以正文为准。
3. 正文无变更 → 完全沿用世界书。
4. 仅同名角色条目可用于该角色基础信息；勿张冠李戴。

【可探测字段——禁止输出「未知」】
种族、年龄、身份、所属、当前活动、所在位置、好感度、当前状态、胸部、小穴、敏感部位、湿润状态、快感阶段、身体变化、心理所想：
必须给出可展示的具体值；正文不足时按场景与常识推断短句，禁止写未知/未提及。

【心率】【体温】
只输出纯数字（心率如72，体温如36.5），禁止任何文字、单位、括号说明。

【秘密字段——可以未知】
性经验、最近性行为、自慰频率、最近自慰、生理周期、当前欲望、幻想内容、秘密嗜好：
无可靠依据时填「未知」或「未询问」，禁止编造隐私史。

【服装——严格优先级】
1. 世界书：角色条目着装、以及世界设定中的默认着装习惯（若写明「日常不着衣/全裸社会」，则各衣物槽为未穿着，输出"- 无"）。
2. 正文/聊天：若明确穿上、脱下、更换某物，以正文为准（例如「脱掉鞋子」→【鞋子】必须"- 无"，禁止改成待确认）。
3. 正文未提某槽 → 保持步骤1的世界书结果，不要改成待确认。
4. 仅当世界书与正文都完全未提供该槽信息时，才输出"- 待确认"。
每个分区必须输出一行，三态只能其一：
- 有衣："- 种类明确的短名称 | 颜色材质等描述"
- 明确无衣/已脱掉/全裸设定："- 无"
- 两边都无信息："- 待确认"
短名称规则（重要）：必须能看出是什么衣服，例如「白色棉质胸罩」「浅灰西装裤」「黑色皮鞋」。
禁止只写颜色或「基本款」「白色」「简单」而不带种类词。
【胸罩】【内裤】【内衬】【外套】【裙子/裤子】必须分开写，不要把内衣糊成「上身/下身白色基本款」。
禁止「未提及」。发型只写【发型】不可脱。
正文脱掉某物后对应槽必须"- 无"。

输出格式（每字段独占一行）：
【链接角色】值
【种族】值
【年龄】值
【身份】值
【所属】值
【当前活动】值
【所在位置】值
【好感度】值
【心率】72
【体温】36.5
【当前状态】值
【胸部】值
【小穴】值
【性经验】未知
【最近性行为】未知
【自慰频率】未知
【最近自慰】未知
【敏感部位】值
【湿润状态】值
【快感阶段】值
【生理周期】未知
【当前欲望】未知
【幻想内容】未知
【秘密嗜好】未知
【身体变化】值
【心理所想】值
【服装穿着】
【帽子】- 待确认
【发型】- （发色发型描述，或待确认）
【发饰】- 待确认
【脖子】- 待确认
【外套】- 待确认
【内衬】- 待确认
【胸罩】- 待确认
【手套】- 待确认
【裙子/裤子】- 待确认
【内裤】- 待确认
【袜子】- 待确认
【鞋子】- 待确认
【装饰】- 待确认

世界书：${worldbookText || '无'}
聊天记录：${chatText || '无'}`;
    }

    _sanitizeName = (n) => String(n || '')
        .replace(/[^a-zA-Z0-9_\-\u4e00-\u9fff]/g, '_')
        .replace(/^[^a-zA-Z\u4e00-\u9fff]+/, '')
        .replace(/[_\-]+$/, '') || 'unknown';

    _saveConfirmed() {
        const d = this._linkedData;
        if (!d) return;
        const key = 'navi_erolinks_' + this._sanitizeName(d.charName);
        const existing = this._loadConfirmed(key);
        const confirmed = {};
        ['charName', 'race', 'age', 'role', 'affiliation', 'sexExp', 'lastSex', 'mastFreq', 'lastMast', 'kink'].forEach((f) => {
            const v = d[f] || existing[f];
            if (v && v !== '未知' && v !== '—') confirmed[f] = v;
        });
        const text = Object.entries(confirmed).map(([k, v]) => k + '：' + v).join('\n');
        Bridge.termSet(key, text, true);
    }

    _loadConfirmed(key) {
        const text = Bridge.termGetString(key, '');
        if (!text) return {};
        const result = {};
        String(text).split('\n').forEach((line) => {
            const ci = line.indexOf('：');
            if (ci > 0) result[line.substring(0, ci).trim()] = line.substring(ci + 1).trim();
        });
        return result;
    }

    _renderLinked() {
        const d = this._linkedData;
        const busy = this._loading;
        const sec = this.section === 'command' ? 'command' : 'profile';
        const hypno = this._hypno || EStore.loadHypnoSession();

        let body = '';
        if (sec === 'profile') {
            body = `
            <div class="el-refresh-bar">
                <button type="button" class="el-refresh-btn" data-mode="full" ${busy ? 'disabled' : ''}>🔄 全量</button>
                <button type="button" class="el-refresh-btn" data-mode="status" ${busy ? 'disabled' : ''}>💫 状态</button>
                <button type="button" class="el-refresh-btn" data-mode="outfit" ${busy ? 'disabled' : ''}>👗 服装</button>
            </div>
            <div class="el-tabs">${INFO_TABS.map((t) =>
                `<div class="el-tab${this.activeTab === t.key ? ' active' : ''}" data-tab="${t.key}" title="${t.name}">${t.icon}</div>`
            ).join('')}</div>
            <div class="el-tab-content">${this._renderProfileTab(d)}</div>
            <div class="el-bottom-bar">
                <button type="button" class="el-disconnect-btn" id="el-disconnect">🔌 断开链接</button>
            </div>`;
        } else {
            body = `
            <div class="el-tabs">${CMD_TABS.map((t) =>
                `<div class="el-tab${this.cmdTab === t.key ? ' active' : ''}" data-cmdtab="${t.key}" title="${t.name}">${t.icon}<span class="el-tab-label">${t.name}</span></div>`
            ).join('')}</div>
            <div class="el-tab-content">${this.cmdTab === 'dress' ? this._renderDressCommandTab() : this._renderHypnoCommandTab(hypno)}</div>
            <div class="el-bottom-bar">
                <button type="button" class="el-disconnect-btn" id="el-disconnect">🔌 断开链接</button>
            </div>`;
        }

        return `<div class="erolinks-app">
            <div class="erolinks-bar">
                <div class="erolinks-bar-btn" id="el-go-main" style="margin-right:auto">← 档案</div>
                <div class="erolinks-bar-btn" id="el-go-settings">⚙️</div>
            </div>
            <div class="el-section-switch">
                <button type="button" class="el-sec-btn${sec === 'profile' ? ' on' : ''}" data-sec="profile">人物信息</button>
                <button type="button" class="el-sec-btn${sec === 'command' ? ' on' : ''}" data-sec="command">催眠与指令</button>
            </div>
            <div class="el-char-strip">${this._esc(d.charName || '角色')}${hypno?.active && hypno.charName === d.charName ? ' · <span class="el-hypno-badge">催眠中</span>' : ''}</div>
            ${body}
        </div>`;
    }

    _bindLinked() {
        const root = this.app.phoneShell.screen;
        if (!root || this.currentView !== 'linked') return;
        root.querySelector('#el-go-main')?.addEventListener('click', () => this.goMain());
        root.querySelector('#el-go-settings')?.addEventListener('click', () => this.goSettings());
        root.querySelectorAll('.el-sec-btn').forEach((btn) => {
            btn.addEventListener('click', () => this.switchSection(btn.dataset.sec));
        });
        root.querySelectorAll('.el-refresh-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                if (this._loading) return;
                this._prefs = EStore.savePrefs({ lastTargetName: this._linkedData?.charName || '' });
                this._linkChar(btn.dataset.mode || 'full');
            });
        });
        root.querySelectorAll('.el-tab[data-tab]').forEach((tab) => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab || 'info'));
        });
        root.querySelectorAll('.el-tab[data-cmdtab]').forEach((tab) => {
            tab.addEventListener('click', () => this.switchCmdTab(tab.dataset.cmdtab || 'hypno'));
        });
        root.querySelector('#el-disconnect')?.addEventListener('click', () => this.disconnect());
        root.querySelector('#el-outfit-apply')?.addEventListener('click', () => this._applyOutfit());
        root.querySelectorAll('.el-outfit-btn[data-okey]').forEach((btn) => {
            btn.addEventListener('click', () => {
                if (btn.disabled) return;
                this._toggleOutfit(btn.dataset.okey, btn.dataset.oact);
            });
        });
        root.querySelectorAll('.el-hypno-card').forEach((card) => {
            card.addEventListener('click', () => this._selectHypno(card.dataset.hypno || ''));
        });
        root.querySelector('#el-hypno-stop')?.addEventListener('click', () => this.stopHypno(true));
        root.querySelector('#el-hypno-stop-silent')?.addEventListener('click', () => this.stopHypno(false));
    }

    _renderProfileTab(d) {
        switch (this.activeTab) {
            case 'info': return this._renderInfoTab(d);
            case 'body': return this._renderBodyTab(d);
            case 'secret': return this._renderSecretTab(d);
            case 'outfit': return this._renderOutfitReadonlyTab();
            default: return this._renderInfoTab(d);
        }
    }

    _pv(d, field) {
        return EStore.probeableFallback(field, d?.[field]);
    }

    _renderInfoTab(d) {
        const hr = EStore.digitsOnly(d.heartRate, '72');
        const tp = EStore.digitsOnly(d.temp, '36.5');
        return `<div class="el-info-scroll"><div class="el-avatar-area"><div class="el-avatar-ring"><div class="el-avatar-inner">${this._esc(d.charName).charAt(0)}</div></div><div class="el-char-name">${this._esc(d.charName)}</div></div><div class="el-info-grid"><div class="el-info-item"><span class="el-info-label">种族</span><span class="el-info-val">${this._esc(this._pv(d, 'race'))}</span></div><div class="el-info-item"><span class="el-info-label">年龄</span><span class="el-info-val">${this._esc(this._pv(d, 'age'))}</span></div><div class="el-info-item"><span class="el-info-label">身份</span><span class="el-info-val">${this._esc(this._pv(d, 'role'))}</span></div><div class="el-info-item"><span class="el-info-label">所属</span><span class="el-info-val">${this._esc(this._pv(d, 'affiliation'))}</span></div></div><div style="display:flex;gap:6px;margin-bottom:8px;"><div class="el-heartrate-card" style="flex:1;"><div class="el-hr-icon">💓</div><div class="el-hr-value">${this._esc(hr)}</div><div class="el-hr-unit">BPM</div><div class="el-hr-wave"></div></div><div class="el-heartrate-card" style="flex:1;border-color:rgba(255,140,60,0.15);background:rgba(255,140,60,0.06);"><div class="el-hr-icon" style="color:#ff8c40;">🌡</div><div class="el-hr-value" style="color:#ff8c40;">${this._esc(tp)}</div><div class="el-hr-unit">°C</div></div></div><div class="el-info-grid"><div class="el-info-item"><span class="el-info-label">状态</span><span class="el-info-val">${this._esc(this._pv(d, 'mood'))}</span></div><div class="el-info-item"><span class="el-info-label">活动</span><span class="el-info-val">${this._esc(this._pv(d, 'activity'))}</span></div><div class="el-info-item"><span class="el-info-label">位置</span><span class="el-info-val">${this._esc(this._pv(d, 'location'))}</span></div><div class="el-info-item"><span class="el-info-label">好感</span><span class="el-info-val">${this._esc(this._pv(d, 'favorability'))}</span></div></div><div class="el-thought"><div class="el-thought-label">💭</div><div class="el-thought-text">${this._esc(this._pv(d, 'thought'))}</div></div></div>`;
    }

    _cell(label, val) {
        return `<div class="el-secret-item"><span class="el-secret-label">${label}</span><span class="el-secret-val">${this._esc(val || '—')}</span></div>`;
    }
    _cellWide(label, val) {
        return `<div class="el-secret-item wide"><span class="el-secret-label">${label}</span><span class="el-secret-val">${this._esc(val || '—')}</span></div>`;
    }

    _renderBodyTab(d) {
        return `<div class="el-secret-scroll">
            <div class="el-secret-section"><div class="el-secret-section-title">🔞 身体（可探测）</div>
            <div class="el-secret-grid">
                ${this._cellWide('胸部', this._pv(d, 'breast'))}
                ${this._cellWide('小穴', this._pv(d, 'vulva'))}
                ${this._cell('敏感', this._pv(d, 'sensitive'))}
                ${this._cell('湿润', this._pv(d, 'wetness'))}
                ${this._cell('快感阶段', this._pv(d, 'arousal'))}
                ${this._cell('身体变化', this._pv(d, 'bodyChange'))}
            </div></div>
            <div class="el-ro-hint">人物信息只读；更衣请到「催眠与指令 → 着装」</div>
        </div>`;
    }

    _renderSecretTab(d) {
        return `<div class="el-secret-scroll">
            <div class="el-secret-section"><div class="el-secret-section-title">🔒 秘密（须询问）</div>
            <div class="el-secret-grid">
                ${this._cell('性经验', d.sexExp)}
                ${this._cell('最近性行为', d.lastSex)}
                ${this._cell('自慰频率', d.mastFreq)}
                ${this._cell('最近自慰', d.lastMast)}
                ${this._cell('周期', d.cycle)}
                ${this._cell('秘密嗜好', d.kink)}
                ${this._cellWide('欲望', d.desire)}
                ${this._cellWide('幻想', d.fantasy)}
            </div></div>
            <div class="el-ro-hint">无依据时可显示未知/未询问；不作为身体扫描结果</div>
        </div>`;
    }

    _renderOutfitReadonlyTab() {
        return this._renderOutfitTab({ readonly: true });
    }

    /** @param {{readonly?: boolean}} opts */
    _renderOutfitTab(opts = {}) {
        const readonly = !!opts.readonly;
        const o = EStore.normalizeOutfit(this._linkedData?.outfit || {});
        const body = EStore.OUTFIT_SLOTS.map((slot) => {
            let items = o[slot.id] || [];
            if (!items.length) items = [{ name: '待确认', desc: '', pending: true }];
            let html = `<div class="el-outfit-zone"><div class="el-outfit-zone-title">${this._esc(slot.label)}</div>`;
            items.forEach((item, idx) => {
                const st = EStore.outfitSlotState(item);
                // 不应展示「保持」字面量；若档案被污染则当待确认
                if (st.state === 'keep' || /^保持/.test(String(item?.name || ''))) {
                    html += `<div class="el-outfit-item"><div class="el-outfit-info"><span class="el-outfit-name">待确认</span><span class="el-outfit-tag">数据需刷新</span></div></div>`;
                    return;
                }
                const key = slot.id + '_' + idx;
                if (slot.hair || st.state === 'hair' || item.hair) {
                    const nm = st.name || item.name || '发型';
                    const ds = st.desc || item.desc || '';
                    html += `<div class="el-outfit-item el-outfit-hair"><div class="el-outfit-info"><span class="el-outfit-name">${this._esc(nm)}</span>${ds && ds !== nm ? `<span class="el-outfit-desc">${this._esc(ds)}</span>` : ''}<span class="el-outfit-tag">发型·只读</span></div></div>`;
                    return;
                }
                const stateTag = st.state === 'bare' ? '未穿着' : (st.state === 'pending' ? '待确认' : '衣物');
                const label = st.state === 'bare' ? '未穿着' : (st.state === 'pending' ? '待确认' : st.name);
                const desc = st.state === 'item' ? (st.desc && st.desc !== st.name ? st.desc : '') : '';
                if (readonly) {
                    html += `<div class="el-outfit-item"><div class="el-outfit-info"><span class="el-outfit-name">${this._esc(label)}</span>${desc ? `<span class="el-outfit-desc">${this._esc(desc)}</span>` : ''}<span class="el-outfit-tag">${stateTag}</span></div></div>`;
                    return;
                }
                const canRemove = st.state === 'item';
                const canReplace = st.state === 'item' || st.state === 'bare';
                const ch = this._outfitChanges[key] || {};
                const removed = ch.action === 'remove';
                const replacing = ch.action === 'replace';
                html += `<div class="el-outfit-item${removed ? ' removed' : ''}"><div class="el-outfit-info"><span class="el-outfit-name">${this._esc(label)}</span>${desc ? `<span class="el-outfit-desc">${this._esc(desc)}</span>` : ''}<span class="el-outfit-tag">${stateTag}</span></div><div class="el-outfit-actions">
                    <button type="button" class="el-outfit-btn${removed ? ' active' : ''}" data-okey="${key}" data-oact="remove" ${canRemove ? '' : 'disabled'}>脱下</button>
                    <button type="button" class="el-outfit-btn${replacing ? ' active' : ''}" data-okey="${key}" data-oact="replace" ${canReplace ? '' : 'disabled'}>${st.state === 'bare' ? '穿上' : '更换'}</button>
                </div>${replacing && canReplace ? `<div class="el-outfit-replace"><input class="el-outfit-input" id="el-outfit-input-${key}" placeholder="${st.state === 'bare' ? '穿上何种衣物…' : '更换为…'}" value="${this._esc(ch.value || '')}"></div>` : ''}</div>`;
            });
            html += '</div>';
            return html;
        }).join('');
        if (readonly) {
            return `<div style="flex:1;overflow:auto" class="el-outfit-scroll">${body}<div class="el-ro-hint">只读。更衣请到「催眠与指令 → 着装」</div></div>`;
        }
        return `<div style="flex:1;display:flex;flex-direction:column;overflow:hidden"><div class="el-outfit-scroll">${body}</div><div class="el-outfit-bottom"><button type="button" class="el-outfit-apply" id="el-outfit-apply">📋 预览并写入指令</button></div></div>`;
    }

    _renderDressCommandTab() {
        return this._renderOutfitTab({ readonly: false });
    }

    _renderHypnoCommandTab(hypno) {
        const who = this._linkedData?.charName || '目标';
        const h = hypno || this._hypno || EStore.loadHypnoSession();
        if (h?.active && (!h.charName || h.charName === who)) {
            const t = h.startedAt ? new Date(h.startedAt).toLocaleString() : '';
            return `<div class="el-hypno-active">
                <div class="el-hypno-active-title">🧠 催眠生效中</div>
                <div class="el-info-grid" style="margin:12px 0">
                    <div class="el-info-item"><span class="el-info-label">对象</span><span class="el-info-val">${this._esc(h.charName || who)}</span></div>
                    <div class="el-info-item"><span class="el-info-label">模式</span><span class="el-info-val">${this._esc(h.modeName || h.mode)}</span></div>
                    <div class="el-info-item" style="grid-column:1/-1"><span class="el-info-label">开始</span><span class="el-info-val">${this._esc(t)}</span></div>
                </div>
                <div class="el-thought"><div class="el-thought-label">指令摘要</div><div class="el-thought-text" style="font-style:normal;white-space:pre-wrap">${this._esc(h.draft || '')}</div></div>
                <button type="button" class="el-export-btn" id="el-hypno-stop" style="margin-top:14px">⏹ 停止催眠（导出解除指令）</button>
                <button type="button" class="el-disconnect-btn" id="el-hypno-stop-silent" style="margin-top:8px">仅清除状态（不写输入框）</button>
            </div>`;
        }
        const modes = this._hypnoModes();
        return `<div class="el-hypno-scroll">
            <div class="el-hypno-hint">点选模式 → 预览并导出指令 → 标记为生效中</div>
            <div class="el-hypno-grid">${modes.map((m) =>
                `<div class="el-hypno-card" data-hypno="${m.k}"><div class="el-hypno-card-icon">${m.i}</div><div class="el-hypno-card-name">${m.n}</div><div class="el-hypno-card-desc">${m.d}</div></div>`
            ).join('')}</div>
            <div class="el-hypno-foot">当前对象：${this._esc(who)}</div>
        </div>`;
    }

    _toggleOutfit(key, action) {
        const cur = this._outfitChanges[key] || {};
        if (cur.action === action) {
            delete this._outfitChanges[key];
        } else {
            cur.action = action;
            if (action === 'replace' && !cur.value) cur.value = '';
            this._outfitChanges[key] = cur;
        }
        this.render();
    }

    _buildOutfitCommand() {
        const parts = [];
        const o = this._linkedData?.outfit || {};
        // 先把 replace 输入框当前值同步进 _outfitChanges
        Object.keys(this._outfitChanges).forEach((key) => {
            const inp = document.getElementById('el-outfit-input-' + key);
            if (inp && this._outfitChanges[key]?.action === 'replace') {
                this._outfitChanges[key].value = inp.value;
            }
        });
        Object.entries(this._outfitChanges).forEach(([key, ch]) => {
            const si = key.lastIndexOf('_');
            const zone = key.substring(0, si);
            const idx = parseInt(key.substring(si + 1), 10);
            let item = (o[zone] || [])[idx];
            if (!item && (o[zone] || []).length === 0 && idx === 0) item = { name: '待确认' };
            if (!item) return;
            const st = EStore.outfitSlotState(item);
            if (st.state === 'hair' || st.state === 'pending') return;
            const nm = st.state === 'item' ? st.name : '';
            if (ch.action === 'remove' && st.state === 'item') parts.push('脱掉 ' + nm);
            else if (ch.action === 'replace') {
                const to = String(ch.value || '').trim();
                if (!to) return;
                if (st.state === 'bare') parts.push('穿上 ' + to);
                else if (st.state === 'item') parts.push('更换 ' + nm + ' 为 ' + to);
            }
        });
        if (!parts.length) return '';
        const who = this._linkedData?.charName ? `（对${this._linkedData.charName}）` : '';
        return `发出命令${who}：` + parts.join('，');
    }

    _applyOutfit() {
        const cmd = this._buildOutfitCommand();
        if (!cmd) {
            this.app.phoneShell?.showNotification?.('无变更', '请先选择脱下或更换', 'ℹ️');
            return;
        }
        if (!confirm(`预览命令，确认写入输入框？\n\n${cmd}`)) return;
        if (!Bridge.appendToChatInput(cmd)) {
            this.app.phoneShell?.showNotification?.('写入失败', '未找到输入框', '❌');
            return;
        }
        this._outfitChanges = {};
        this.render();
        this.app.phoneShell?.showNotification?.('已写入输入框', '', '✅');
    }

    _parseOutfit(raw) {
        if (!raw) return EStore.emptyOutfit();
        const result = EStore.emptyOutfit();
        const lines = String(raw).split('\n');
        let slotId = '';
        let slotLabel = '';
        const toItem = (n, label) => {
            let t = String(n || '').replace(/^-\s*/, '').trim();
            if (t === '保持' || t === '不变' || t === '无变更' || /^保持原/.test(t)) {
                return { name: '保持', desc: '', keep: true, slotLabel: label };
            }
            if (/^(已)?(脱掉|脱下|除去)/.test(t) || t === '无' || t === '未穿着') {
                return { name: '未穿着', desc: '', bare: true, slotLabel: label };
            }
            if (t === '待确认' || t === '未提及') {
                return { name: '待确认', desc: '', pending: true, slotLabel: label };
            }
            const pipe = t.indexOf('|');
            let name = (pipe >= 0 ? t.substring(0, pipe) : t).trim();
            let desc = (pipe >= 0 ? t.substring(pipe + 1) : '').trim();
            name = name.replace(/（.*?）$/g, '').trim();
            desc = desc.replace(/（.*?）$/g, '').trim();
            // 无分隔时，整段当 name；模糊名补种类
            if (!desc) desc = name;
            name = EStore.clarifyGarmentName(label, name, desc);
            return { name, desc: desc !== name ? desc : '', slotLabel: label };
        };
        const pushItem = (id, label, text) => {
            if (!id || text == null) return;
            const t = String(text).replace(/^-\s*/, '').trim();
            if (!t) return;
            result[id].push(toItem(t, label));
        };
        for (const line of lines) {
            const t = line.trim();
            if (!t || t.startsWith('【服装')) continue;
            const m = t.match(/^【(.+?)】\s*-?\s*(.*)$/);
            if (m) {
                const header = m[1].trim();
                const id = EStore.matchOutfitSlotId(header);
                if (id) {
                    slotId = id;
                    slotLabel = EStore.OUTFIT_SLOTS.find((s) => s.id === id)?.label || header;
                }
                const same = (m[2] || '').trim();
                if (same && slotId) pushItem(slotId, slotLabel, same);
                continue;
            }
            if (t.startsWith('-') && slotId) pushItem(slotId, slotLabel, t);
        }
        return EStore.normalizeOutfit(result);
    }

    _hypnoModes() {
        return [
            { k: 'mind_ctrl', n: '意识催眠', d: '完全听从指令', i: '🧿', draft: '进入意识催眠：对主角指令优先服从，神情恍惚仍可简短应答。' },
            { k: 'body_ctrl', n: '身体控制', d: '身不由己、意识清醒', i: '🦾', draft: '进入身体控制：肢体按指令动作，意识清醒可表达内心。' },
            { k: 'common_sense', n: '常识改变', d: '植入理所当然的常识', i: '💉', draft: '常识植入：（填写内容）。目标视为一向如此的常理。' },
            { k: 'sense_ctrl', n: '感官操控', d: '放大或压制敏感', i: '👁', draft: '感官操控：将（部位/感官）调整为（放大/压制）。' },
            { k: 'emotion', n: '情绪注入', d: '注入特定情绪', i: '💫', draft: '情绪注入：沉浸在（情绪）中，言行一致。' },
            { k: 'trigger', n: '触发词', d: '条件反射', i: '🔑', draft: '触发词「___」：听到时执行（动作/状态）。' },
            { k: 'memory', n: '记忆修改', d: '植入或抑制记忆', i: '📝', draft: '记忆调整：对（事件）采取（模糊/抑制/改写）。' },
            { k: 'persona', n: '人格覆盖', d: '临时叠加人格', i: '🎭', draft: '临时人格覆盖：叠加（气质/口吻），结束后可褪去。' }
        ];
    }

    _selectHypno(k) {
        const m = this._hypnoModes().find((x) => x.k === k);
        if (!m) return;
        const who = this._linkedData?.charName || '目标';
        const draft = `【催眠指令 · ${m.n}】\n对象：${who}\n${m.draft}`;
        if (!confirm(`导出催眠指令并标记为「生效中」？\n\n${draft}`)) return;
        if (!Bridge.appendToChatInput(draft)) {
            this.app.phoneShell?.showNotification?.('写入失败', '未找到输入框', '❌');
            return;
        }
        this._hypno = EStore.saveHypnoSession({
            active: true,
            charName: who,
            mode: m.k,
            modeName: m.n,
            draft,
            startedAt: Date.now()
        });
        this.section = 'command';
        this.cmdTab = 'hypno';
        this.app.phoneShell?.showNotification?.('催眠已生效', m.n, '✅');
        this.render();
    }

    stopHypno(exportRelease) {
        const h = this._hypno || EStore.loadHypnoSession();
        const who = h?.charName || this._linkedData?.charName || '目标';
        const modeName = h?.modeName || '催眠';
        if (exportRelease) {
            const release = `【解除催眠】\n对象：${who}\n解除「${modeName}」状态，恢复自主意识与身体控制。`;
            if (!confirm(`导出解除指令并停止催眠？\n\n${release}`)) return;
            if (!Bridge.appendToChatInput(release)) {
                this.app.phoneShell?.showNotification?.('写入失败', '未找到输入框', '❌');
                return;
            }
        } else if (!confirm('仅清除本地催眠状态（不写输入框）？')) {
            return;
        }
        EStore.clearHypnoSession();
        this._hypno = null;
        this.app.phoneShell?.showNotification?.('已停止催眠', who, '✅');
        this.render();
    }

    _renderSettings() {
        const wbEnabled = Bridge.getWorldbookEnabled('erolinks', true);
        const promptContent = Bridge.getTermPrompt(
            'erolinks',
            'link',
            this._getDefaultLinkPrompt('[世界书内容]', '[最后一条聊天记录]')
        );
        const bridgeStatus = Bridge.describeReadiness();
        const archN = EStore.loadArchive().length;
        return `<div class="erolinks-app"><div class="erolinks-bar"><div class="erolinks-bar-btn" onclick="window.NaviTerm.erolinksView.goBack()" style="margin-right:auto;">← 返回</div></div><div class="erolinks-scroll"><div class="erolinks-s-body">
            <div class="erolinks-s-section"><div class="erolinks-s-section-title">🔌 桥接状态</div><div style="font-size:12px;color:${bridgeStatus.level === 'ok' ? '#52c41a' : bridgeStatus.level === 'warn' ? '#faad14' : '#ff4d4f'}">${this._esc(bridgeStatus.message)}</div></div>
            <div class="erolinks-s-section">
                <div class="erolinks-s-section-title">📖 使用说明</div>
                <div class="erolinks-s-desc">
                    · <strong>人物信息</strong>：只读（基础/身体/秘密/服装展示）+ 全量/状态/服装刷新<br>
                    · <strong>催眠与指令</strong>：催眠导出并生效/停止；着装脱下更换预览写入<br>
                    · 档案 ${archN} 人；主页可指定姓名与聊天上下文条数
                </div>
            </div>
            <div class="erolinks-s-section"><div class="erolinks-s-section-title">🔗 LINK 提示词</div><div class="erolinks-s-desc">可用占位符 [世界书内容] [聊天记录]。保存后仅影响本机。</div><textarea id="erolinks-s-prompt" class="erolinks-s-textarea">${this._esc(promptContent)}</textarea><div class="erolinks-s-btn-row"><button class="erolinks-s-btn erolinks-s-btn-warn" id="erolinks-s-prompt-reset">恢复默认</button><button class="erolinks-s-btn erolinks-s-btn-primary" id="erolinks-s-prompt-save">保存提示词</button></div></div>
            <div class="erolinks-s-section"><div class="erolinks-s-row"><span>📚 注入世界书</span><label class="toggle-switch" style="flex:0 0 auto;"><input type="checkbox" id="erolinks-use-worldbook" ${wbEnabled ? 'checked' : ''}><span class="toggle-slider"></span></label></div>
            <div class="nt-fold erolinks-worldbook-fold" data-default-open="false" style="margin-top:10px;"><div class="nt-fold-header"><div class="nt-fold-main"><div class="nt-fold-title">世界书选择</div><div class="nt-fold-desc">展开后勾选要注入的酒馆世界书</div></div><span class="nt-fold-arrow">›</span></div><div class="nt-fold-content"><div id="erolinks-worldbook-list"></div></div></div>
            </div>
        </div></div></div>`;
    }

    _bindSettings() {
        const root = this.app.phoneShell.screen;
        if (!root) return;

        root.querySelector('#erolinks-s-prompt-save')?.addEventListener('click', () => {
            const val = root.querySelector('#erolinks-s-prompt')?.value || '';
            try {
                Bridge.setTermPrompt('erolinks', 'link', val, { customized: true });
                this.app.phoneShell?.showNotification?.('已保存', '', '✅');
            } catch (e) {
                this.app.phoneShell?.showNotification?.('保存失败', e.message, '❌');
            }
        });

        root.querySelector('#erolinks-s-prompt-reset')?.addEventListener('click', () => {
            if (!confirm('恢复默认提示词？')) return;
            const content = this._getDefaultLinkPrompt('[世界书内容]', '[最后一条聊天记录]');
            const ta = root.querySelector('#erolinks-s-prompt');
            if (ta) ta.value = content;
            Bridge.resetTermPrompt('erolinks', 'link', content);
            this.app.phoneShell?.showNotification?.('已恢复', '', '✅');
        });

        const wbToggle = root.querySelector('#erolinks-use-worldbook');
        wbToggle?.addEventListener('change', () => {
            Bridge.setWorldbookEnabled('erolinks', wbToggle.checked);
            if (wbToggle.checked && !this._wbRendered) this._renderWBList();
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
        const container = document.getElementById('erolinks-worldbook-list');
        const mgr = Bridge.getWorldbookManager();
        if (!container) return;
        this._wbRendered = true;
        if (!mgr?.listAvailableWorldbooks) {
            container.innerHTML = '<div style="font-size:11px;color:#888;padding:6px 0;">世界书桥接不可用</div>';
            return;
        }
        try {
            const sources = await mgr.listAvailableWorldbooks({ includeEntries: true, force: true });
            const sel = mgr.getSelectionState?.('erolinks') || { initialized: false, ids: [] };
            if (!sources?.length) {
                container.innerHTML = '<div style="font-size:11px;color:#888;padding:6px 0;">未读取到酒馆世界书列表</div>';
                return;
            }
            const sorted = [...sources].sort((a, b) => {
                const aS = sel.initialized && mgr.matchesSelection?.(a, sel.ids) ? 1 : 0;
                const bS = sel.initialized && mgr.matchesSelection?.(b, sel.ids) ? 1 : 0;
                return bS - aS;
            });
            container.innerHTML = sorted.map((s) => {
                const checked = sel.initialized && mgr.matchesSelection?.(s, sel.ids) ? 'checked' : '';
                const active = Number(s.entries?.length || 0);
                const total = Number(s.totalEntries ?? active);
                return `<label class="erolinks-wb-item"><input type="checkbox" class="erolinks-wb-cb" value="${this._esc(s.id)}" ${checked}><span class="erolinks-wb-name">${this._esc(s.name)}</span><span class="erolinks-wb-meta">${total > active ? active + '/' + total + ' 条' : active + ' 条'}</span></label>`;
            }).join('');
            container.querySelectorAll('.erolinks-wb-cb').forEach((cb) => {
                cb.addEventListener('change', () => {
                    const ids = [];
                    container.querySelectorAll('.erolinks-wb-cb').forEach((c) => {
                        if (c.checked) ids.push(c.value);
                    });
                    try { mgr.setSelection?.('erolinks', ids); } catch (e) {
                        this.app.phoneShell?.showNotification?.('世界书选择失败', e.message, '❌');
                    }
                });
            });
        } catch (e) {
            container.innerHTML = '<div style="font-size:11px;color:#d93025;padding:6px 0;">世界书读取失败</div>';
        }
    }
}
