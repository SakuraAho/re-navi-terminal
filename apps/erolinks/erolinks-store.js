/* EroLinks 角色档案存储 */
import Bridge from '../../bridge.js';

export const ARCHIVE_KEY = 'navi_erolinks_archive_v1';
export const PREFS_KEY = 'navi_erolinks_prefs';
export const MAX_ARCHIVES = 30;

export const STATIC_FIELDS = [
    'charName', 'race', 'age', 'role', 'affiliation',
    'sexExp', 'lastSex', 'mastFreq', 'lastMast', 'kink',
    'breast', 'vulva', 'sensitive', 'cycle'
];

export const DYNAMIC_FIELDS = [
    'activity', 'location', 'favorability', 'heartRate', 'temp', 'mood',
    'wetness', 'arousal', 'desire', 'fantasy', 'bodyChange', 'thought'
];

function safeParse(raw, fallback) {
    if (raw == null || raw === '') return fallback;
    if (typeof raw === 'object') return raw;
    try { return JSON.parse(raw); } catch (_) { return fallback; }
}

export function sanitizeName(n) {
    return String(n || '')
        .replace(/[^a-zA-Z0-9_\-\u4e00-\u9fff]/g, '_')
        .replace(/^[^a-zA-Z\u4e00-\u9fff]+/, '')
        .replace(/[_\-]+$/, '') || 'unknown';
}

export function loadPrefs() {
    const p = safeParse(Bridge.termGet(PREFS_KEY, null), null) || {};
    return {
        chatDepth: [1, 5, 10].includes(Number(p.chatDepth)) ? Number(p.chatDepth) : 5,
        lastTargetName: String(p.lastTargetName || '')
    };
}

export function savePrefs(patch) {
    const cur = loadPrefs();
    const next = { ...cur, ...patch };
    Bridge.termSet(PREFS_KEY, JSON.stringify(next), true);
    return next;
}

export function loadArchive() {
    const data = safeParse(Bridge.termGet(ARCHIVE_KEY, null), null);
    if (!data || !Array.isArray(data.items)) return [];
    return data.items.filter((x) => x && x.charName).map(normalizeProfile);
}

export function saveArchive(items) {
    const list = (items || []).slice(0, MAX_ARCHIVES).map(normalizeProfile);
    Bridge.termSet(ARCHIVE_KEY, JSON.stringify({ v: 1, items: list, updatedAt: Date.now() }), true);
    return list;
}

export function normalizeProfile(d) {
    const out = {
        charName: String(d.charName || '角色'),
        race: String(d.race || ''),
        age: String(d.age || ''),
        role: String(d.role || ''),
        affiliation: String(d.affiliation || ''),
        activity: String(d.activity || ''),
        location: String(d.location || ''),
        favorability: String(d.favorability || ''),
        heartRate: String(d.heartRate || ''),
        temp: String(d.temp || ''),
        mood: String(d.mood || ''),
        breast: String(d.breast || ''),
        vulva: String(d.vulva || ''),
        sexExp: String(d.sexExp || ''),
        lastSex: String(d.lastSex || ''),
        mastFreq: String(d.mastFreq || ''),
        lastMast: String(d.lastMast || ''),
        sensitive: String(d.sensitive || ''),
        wetness: String(d.wetness || ''),
        arousal: String(d.arousal || ''),
        cycle: String(d.cycle || ''),
        desire: String(d.desire || ''),
        fantasy: String(d.fantasy || ''),
        kink: String(d.kink || ''),
        bodyChange: String(d.bodyChange || ''),
        thought: String(d.thought || ''),
        outfit: normalizeOutfit(d.outfit && typeof d.outfit === 'object' ? d.outfit : {}),
        updatedAt: Number(d.updatedAt) || Date.now()
    };
    return out;
}

export function upsertProfile(profile) {
    const p = normalizeProfile({ ...profile, updatedAt: Date.now() });
    const key = sanitizeName(p.charName);
    let list = loadArchive().filter((x) => sanitizeName(x.charName) !== key);
    list = [p, ...list].slice(0, MAX_ARCHIVES);
    saveArchive(list);
    // 兼容旧 confirmed 文本
    const confirmed = {};
    STATIC_FIELDS.forEach((f) => {
        const v = p[f];
        if (v && v !== '未知' && v !== '—') confirmed[f] = v;
    });
    Bridge.termSet('navi_erolinks_' + key, Object.entries(confirmed).map(([k, v]) => k + '：' + v).join('\n'), true);
    return list;
}

export function getProfile(name) {
    const key = sanitizeName(name);
    return loadArchive().find((x) => sanitizeName(x.charName) === key) || null;
}

export function removeProfile(name) {
    const key = sanitizeName(name);
    const list = loadArchive().filter((x) => sanitizeName(x.charName) !== key);
    saveArchive(list);
    return list;
}

/** 是否有任意服装槽数据（含明确的未穿着/待确认标记） */
export function outfitHasItems(outfit) {
    if (!outfit || typeof outfit !== 'object') return false;
    return Object.values(outfit).some((arr) => Array.isArray(arr) && arr.length > 0);
}

/** 细槽位（与提示词【帽子】【胸罩】等一一对应，避免全挤在上身/下身） */
export const OUTFIT_SLOTS = Object.freeze([
    { id: 'hat', label: '帽子', match: (s) => s === '帽子' || (s.includes('帽') && !s.includes('发')) },
    { id: 'hair', label: '发型', hair: true, match: (s) => s === '发型' || s === '头发' },
    { id: 'hairAcc', label: '发饰', match: (s) => s.includes('发饰') || s === '发夹' || s === '发带' },
    { id: 'neck', label: '脖子', match: (s) => s.includes('脖') || s.includes('颈') || s.includes('领饰') },
    { id: 'coat', label: '外套', match: (s) => s.includes('外套') || s.includes('外衣') || s.includes('夹克') },
    { id: 'shirt', label: '内衬', match: (s) => s.includes('内衬') || s.includes('衬衫') || s === '上衣' },
    { id: 'bra', label: '胸罩', match: (s) => s.includes('胸罩') || s.includes('文胸') || s.includes('内衣') },
    { id: 'gloves', label: '手套', match: (s) => s.includes('手套') },
    { id: 'bottom', label: '裙子/裤子', match: (s) => (s.includes('裙') || s.includes('裤')) && !s.includes('内') },
    { id: 'panties', label: '内裤', match: (s) => s.includes('内裤') || s.includes('底裤') },
    { id: 'socks', label: '袜子', match: (s) => s.includes('袜') },
    { id: 'shoes', label: '鞋子', match: (s) => s.includes('鞋') || s.includes('靴') },
    { id: 'acc', label: '装饰', match: (s) => s.includes('装饰') || s.includes('饰品') || s.includes('首饰') }
]);

export function emptyOutfit() {
    const o = {};
    OUTFIT_SLOTS.forEach((s) => { o[s.id] = []; });
    // 兼容旧 zone 键
    o.head = o.head || [];
    o.neck = o.neck || [];
    o.upper = o.upper || [];
    o.hands = o.hands || [];
    o.lower = o.lower || [];
    o.legs = o.legs || [];
    return o;
}

export function matchOutfitSlotId(header) {
    const s = String(header || '').trim();
    for (const slot of OUTFIT_SLOTS) {
        if (slot.match(s)) return slot.id;
    }
    return '';
}

/** 短名称过糊时补上衣物种类，如「白色」+胸罩 →「白色胸罩」 */
export function clarifyGarmentName(slotLabel, name, desc) {
    let n = String(name || '').trim();
    const d = String(desc || '').trim();
    if (!n || n === '未穿着' || n === '待确认' || n === '无' || n === '保持' || /^保持/.test(n)) return n;
    if (slotLabel === '发型') return n;
    const typeRe = /衣|裙|裤|袜|鞋|靴|帽|罩|衫|袖|巾|带|饰|手套|外套|内衣|内裤|文胸|夹克|大衣|T恤|卫衣/;
    if (!typeRe.test(n) && slotLabel && !n.includes(slotLabel)) {
        // 「白色基本款」→「白色基本款胸罩」
        n = `${n}${slotLabel}`;
    }
    if (d && d !== n && !n.includes(d.slice(0, 4))) {
        // keep desc separate
    }
    return n;
}

/** 规范单槽：bare/pending/item/hair 都保留，禁止把「未穿着」丢成空数组 */
export function normalizeOutfitSlot(item) {
    const st = outfitSlotState(item);
    if (st.state === 'keep') return { name: '保持', desc: '', keep: true };
    if (st.state === 'bare') return { name: '未穿着', desc: '', bare: true };
    if (st.state === 'pending') return { name: '待确认', desc: '', pending: true };
    if (st.state === 'hair') return { name: st.name, desc: st.desc, hair: true };
    return { name: st.name, desc: st.desc || '' };
}

export function normalizeOutfit(outfit) {
    const base = emptyOutfit();
    if (!outfit || typeof outfit !== 'object') return base;
    // 新槽位
    OUTFIT_SLOTS.forEach((slot) => {
        const arr = Array.isArray(outfit[slot.id]) ? outfit[slot.id] : [];
        base[slot.id] = arr.map((it) => {
            const st = normalizeOutfitSlot(it);
            // keep/bare/pending/hair 都原样保留，绝不能把「保持」拼成「保持裙子」
            if (st.keep || st.bare || st.pending || st.hair) return st;
            const name = clarifyGarmentName(slot.label, st.name, st.desc);
            return { ...st, name, slotLabel: slot.label };
        }).filter((it) => it && !it.keep); // 规范化结果里不落盘「保持」字面量
    });
    // 旧 zone → 迁入细槽（仅当细槽仍空）
    const legacyMap = {
        head: ['hat', 'hair', 'hairAcc'],
        neck: ['neck'],
        upper: ['coat', 'shirt', 'bra'],
        hands: ['gloves'],
        lower: ['bottom', 'panties'],
        legs: ['socks', 'shoes'],
        acc: ['acc']
    };
    Object.entries(legacyMap).forEach(([legacy, ids]) => {
        const arr = Array.isArray(outfit[legacy]) ? outfit[legacy] : [];
        if (!arr.length) return;
        const allEmpty = ids.every((id) => !base[id]?.length);
        if (!allEmpty) return;
        const target = ids.find((id) => id !== 'hair') || ids[0];
        const slot = OUTFIT_SLOTS.find((s) => s.id === target);
        base[target] = arr.map((it) => {
            const st = normalizeOutfitSlot(it);
            if (st.keep || st.bare || st.pending || st.hair) return st;
            return { ...st, name: clarifyGarmentName(slot?.label || '', st.name, st.desc), slotLabel: slot?.label || '' };
        }).filter((it) => it && !it.keep);
    });
    return base;
}

/**
 * 分区合并（增量刷新核心）：
 * - patch 空 / 全是 keep → 100% 沿用 base 原值（界面仍显示原来的裙子，绝不是字面「保持」）
 * - patch 有真实变更 → 用变更结果
 */
export function mergeOutfit(baseOutfit, patchOutfit) {
    const b = normalizeOutfit(baseOutfit);
    // 合并前先识别 keep，不能先 normalize 掉 keep
    const pRaw = patchOutfit && typeof patchOutfit === 'object' ? patchOutfit : {};
    const out = emptyOutfit();
    OUTFIT_SLOTS.forEach((slot) => {
        const id = slot.id;
        const baseArr = b[id] || [];
        const rawArr = Array.isArray(pRaw[id]) ? pRaw[id] : [];
        if (!rawArr.length) {
            out[id] = baseArr;
            return;
        }
        const slots = rawArr.map(normalizeOutfitSlot);
        if (slots.every((it) => it.keep || /^保持/.test(String(it.name || '')))) {
            out[id] = baseArr;
            return;
        }
        const changed = slots.filter((it) => !it.keep && !/^保持/.test(String(it.name || '')));
        if (!changed.length) {
            out[id] = baseArr;
            return;
        }
        out[id] = changed.map((st) => {
            if (st.bare || st.pending || st.hair) return st;
            return {
                ...st,
                name: clarifyGarmentName(slot.label, st.name, st.desc),
                slotLabel: slot.label
            };
        });
    });
    return out;
}

/** 把当前着装格式化成给 AI 的「已有状态」文本 */
export function formatOutfitSnapshot(outfit) {
    const o = normalizeOutfit(outfit || {});
    return OUTFIT_SLOTS.map((slot) => {
        const arr = o[slot.id] || [];
        if (!arr.length) return `【${slot.label}】- 待确认`;
        return arr.map((it) => {
            const st = outfitSlotState(it);
            if (st.state === 'bare') return `【${slot.label}】- 无`;
            if (st.state === 'pending') return `【${slot.label}】- 待确认`;
            if (st.state === 'hair' || slot.hair) return `【${slot.label}】- ${st.name}${st.desc && st.desc !== st.name ? ' | ' + st.desc : ''}`;
            return `【${slot.label}】- ${st.name}${st.desc && st.desc !== st.name ? ' | ' + st.desc : ''}`;
        }).join('\n');
    }).join('\n');
}

export function isKeepToken(val) {
    const v = String(val ?? '').trim();
    return !v || v === '—' || v === '保持' || v === '不变' || v === '无变更'
        || /^保持/.test(v) || v.endsWith('保持');
}

/** 非空才写入；「保持」/空 → 沿用旧值（界面仍是旧文案，绝不是字面「保持」） */
function pickFilled(baseVal, patchVal) {
    if (isKeepToken(patchVal)) return baseVal;
    return String(patchVal).trim();
}

export function mergeProfiles(base, patch, mode = 'full') {
    const b = normalizeProfile(base || {});
    const p = normalizeProfile(patch || {});
    if (mode === 'full') {
        const out = { ...b, charName: p.charName || b.charName, updatedAt: Date.now() };
        [...STATIC_FIELDS, ...DYNAMIC_FIELDS].forEach((f) => {
            if (f === 'charName') return;
            out[f] = pickFilled(b[f], p[f]);
        });
        out.outfit = mergeOutfit(b.outfit, p.outfit);
        return normalizeProfile(out);
    }
    if (mode === 'status') {
        const out = { ...b, updatedAt: Date.now() };
        DYNAMIC_FIELDS.forEach((f) => {
            out[f] = pickFilled(b[f], p[f]);
        });
        // 状态刷新不碰服装
        out.outfit = b.outfit;
        return normalizeProfile(out);
    }
    if (mode === 'outfit') {
        return normalizeProfile({
            ...b,
            outfit: mergeOutfit(b.outfit, p.outfit),
            updatedAt: Date.now()
        });
    }
    return b;
}

const FIELD_LABELS = {
    charName: '链接角色', race: '种族', age: '年龄', role: '身份', affiliation: '所属',
    activity: '当前活动', location: '所在位置', favorability: '好感度',
    heartRate: '心率', temp: '体温', mood: '当前状态',
    breast: '胸部', vulva: '小穴', sexExp: '性经验', lastSex: '最近性行为',
    mastFreq: '自慰频率', lastMast: '最近自慰', sensitive: '敏感部位',
    wetness: '湿润状态', arousal: '快感阶段', cycle: '生理周期',
    desire: '当前欲望', fantasy: '幻想内容', kink: '秘密嗜好',
    bodyChange: '身体变化', thought: '心理所想'
};

/** 当前档案快照，供状态/全量增量刷新 */
export function formatProfileSnapshot(profile, fields) {
    const p = normalizeProfile(profile || {});
    const list = Array.isArray(fields) ? fields : [...STATIC_FIELDS, ...DYNAMIC_FIELDS];
    return list.map((f) => {
        const lab = FIELD_LABELS[f] || f;
        const v = String(p[f] || '').trim() || '（空）';
        return `【${lab}】${v}`;
    }).join('\n');
}

export function buildChatContext(chat, depth = 5) {
    const arr = Array.isArray(chat) ? chat : [];
    const n = Math.max(1, Math.min(20, Number(depth) || 5));
    const slice = arr.slice(-n);
    if (!slice.length) return '（无）';
    return slice.map((m) => {
        const name = m?.name || '??';
        const mes = String(m?.mes || '').replace(/\s+/g, ' ').trim();
        const cut = mes.length > 400 ? mes.slice(0, 400) + '…' : mes;
        return `${name}: ${cut}`;
    }).join('\n');
}

export function formatStatusExport(d) {
    const p = normalizeProfile(d || {});
    const lines = [
        `【EroLinks 状态同步】`,
        `角色：${p.charName}`,
        p.race ? `种族：${p.race}` : '',
        p.age ? `年龄：${p.age}` : '',
        p.location ? `位置：${p.location}` : '',
        p.activity ? `活动：${p.activity}` : '',
        p.mood ? `状态：${p.mood}` : '',
        p.heartRate ? `心率：${p.heartRate}` : '',
        p.temp ? `体温：${p.temp}` : '',
        p.wetness ? `湿润：${p.wetness}` : '',
        p.arousal ? `快感：${p.arousal}` : '',
        p.thought ? `心声：${p.thought}` : '',
        `（正文描写请与以上状态一致；未列出的细节可按剧情补全。）`
    ].filter(Boolean);
    return lines.join('\n');
}

/* —— 催眠会话 —— */
export const HYPNO_KEY = 'navi_erolinks_hypno_v1';

export function loadHypnoSession() {
    const raw = safeParse(Bridge.termGet(HYPNO_KEY, null), null);
    if (!raw || !raw.active) return null;
    return {
        active: true,
        charName: String(raw.charName || ''),
        mode: String(raw.mode || ''),
        modeName: String(raw.modeName || ''),
        draft: String(raw.draft || ''),
        startedAt: Number(raw.startedAt) || Date.now()
    };
}

export function saveHypnoSession(session) {
    if (!session || !session.active) {
        Bridge.termSet(HYPNO_KEY, JSON.stringify({ active: false }), true);
        return null;
    }
    const s = {
        active: true,
        charName: String(session.charName || ''),
        mode: String(session.mode || ''),
        modeName: String(session.modeName || ''),
        draft: String(session.draft || ''),
        startedAt: Number(session.startedAt) || Date.now()
    };
    Bridge.termSet(HYPNO_KEY, JSON.stringify(s), true);
    return s;
}

export function clearHypnoSession() {
    return saveHypnoSession(null);
}

/** 服装槽展示态：bare | item | pending | hair
 * 空/无信息 → 待确认（不默认全裸，避免非琉夏岛世界被剥光）
 * 明确无衣 → 未穿着
 * 有描述 → 衣物
 */
export function outfitSlotState(item) {
    if (!item) return { state: 'pending', name: '待确认', desc: '' };
    const name = String(item.name || item || '').trim();
    const desc = String(item.desc || '').trim();
    const raw = (name + ' ' + desc).trim();
    if (!raw) return { state: 'pending', name: '待确认', desc: '' };
    // 刷新时「保持」= 仅合并标记，禁止展示、禁止写进档案外观
    if (
        raw === '保持' || raw === '不变' || raw === '无变更'
        || /^保持/.test(raw) || raw.endsWith('保持')
    ) {
        return { state: 'keep', name: '保持', desc: '' };
    }
    // 明确未穿着（世界书/正文写明无衣）
    if (raw === '无' || raw === '无。' || raw === '未穿着' || raw === '裸' || raw === '赤裸' || /^无衣|未着|一丝不挂|全裸$/.test(raw)) {
        return { state: 'bare', name: '未穿着', desc: '' };
    }
    if (/^待确认$|未提及|不明|看不清|无法确认|不确定/.test(raw)) {
        return { state: 'pending', name: '待确认', desc: '' };
    }
    if (/发型|头发|发色|发尾|长发|短发|马尾|双马尾|卷发|直发/.test(raw) && !/饰|夹|绳|箍|帽|发卡|发带/.test(raw)) {
        return { state: 'hair', name: name || '发型', desc: desc || name };
    }
    return { state: 'item', name: name || '衣物', desc: desc && desc !== name ? desc : '' };
}

/** 心率/体温：只保留数字（可含小数） */
export function digitsOnly(val, fallback = '') {
    const s = String(val ?? '').trim();
    if (!s || s === '未知' || s === '—') return fallback;
    const m = s.match(/-?\d+(?:\.\d+)?/);
    return m ? m[0] : fallback;
}

/** 可探测字段：禁止展示「未知/保持」时的回退 */
export function probeableFallback(field, val) {
    const v = String(val ?? '').trim();
    // 「保持」不是展示值
    if (v && v !== '未知' && v !== '—' && v !== '不明' && !isKeepToken(v)) {
        if (field === 'heartRate') return digitsOnly(v, '72');
        if (field === 'temp') return digitsOnly(v, '36.5');
        return v;
    }
    const fb = {
        race: '人类',
        age: '—',
        role: '岛民',
        affiliation: '—',
        activity: '日常活动中',
        location: '琉夏岛',
        favorability: '普通',
        heartRate: '72',
        temp: '36.5',
        mood: '平静',
        breast: '可见，细节随场景',
        vulva: '可见，细节随场景',
        sensitive: '常规敏感',
        wetness: '常态',
        arousal: '平静无波',
        bodyChange: '无显著变化',
        thought: '（神情平静）'
    };
    return fb[field] != null ? fb[field] : '—';
}
