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
        outfit: d.outfit && typeof d.outfit === 'object' ? d.outfit : {},
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

function outfitHasItems(outfit) {
    if (!outfit || typeof outfit !== 'object') return false;
    return Object.values(outfit).some((arr) => Array.isArray(arr) && arr.length > 0);
}

export function emptyOutfit() {
    return { head: [], neck: [], upper: [], hands: [], lower: [], legs: [], acc: [] };
}

/** 非空才写入；避免 AI 漏字段把旧档案刷成空白 */
function pickFilled(baseVal, patchVal) {
    const v = patchVal == null ? '' : String(patchVal).trim();
    if (!v || v === '—') return baseVal;
    return v;
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
        out.outfit = outfitHasItems(p.outfit) ? p.outfit : b.outfit;
        return normalizeProfile(out);
    }
    if (mode === 'status') {
        const out = { ...b, updatedAt: Date.now() };
        DYNAMIC_FIELDS.forEach((f) => {
            out[f] = pickFilled(b[f], p[f]);
        });
        return normalizeProfile(out);
    }
    if (mode === 'outfit') {
        return normalizeProfile({
            ...b,
            outfit: outfitHasItems(p.outfit) ? p.outfit : b.outfit,
            updatedAt: Date.now()
        });
    }
    return b;
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

/** 服装槽展示态：bare | item | pending | hair */
export function outfitSlotState(item) {
    // 空槽默认未穿着（全裸世界观优先），不是待确认
    if (!item) return { state: 'bare', name: '未穿着', desc: '' };
    const name = String(item.name || item || '').trim();
    const desc = String(item.desc || '').trim();
    const raw = (name + ' ' + desc).trim();
    if (!raw || raw === '无' || raw === '无。' || raw === '未穿着' || raw === '裸' || raw === '赤裸') {
        return { state: 'bare', name: '未穿着', desc: '' };
    }
    if (/^待确认$|未提及|不明|看不清|无法确认/.test(raw)) {
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

/** 可探测字段：禁止展示「未知」时的回退 */
export function probeableFallback(field, val) {
    const v = String(val ?? '').trim();
    if (v && v !== '未知' && v !== '—' && v !== '不明') {
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
