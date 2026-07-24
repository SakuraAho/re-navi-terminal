/* 观测委托本地订单存储 + 部位焦点池 */
import Bridge from '../../bridge.js';

export const BOARD_KEY = 'navi_term_board_v1';
export const LAST_CFG_KEY = 'navi_term_last_cfg';
export const GEN_COUNT_KEY = 'navi_term_gen_count';
export const SITES_KEY = 'navi_opt_sites';
export const MAX_BOARD = 40;
export const MAX_SITES = 5;

/** 部位焦点池（观测/把玩共用） */
export const SITE_POOL = Object.freeze([
    '胸部',
    '乳头',
    '小穴大阴唇/小阴唇',
    '阴蒂',
    '阴道外侧',
    '阴道里侧',
    '尿道口',
    '足部',
    '臀部'
]);

const STATUSES = ['unused', 'active', 'used', 'starred'];

function safeParse(raw, fallback) {
    if (raw == null || raw === '') return fallback;
    if (typeof raw === 'object') return raw;
    try { return JSON.parse(raw); } catch (_) { return fallback; }
}

export function uid() {
    return 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export function loadBoard() {
    const data = safeParse(Bridge.termGet(BOARD_KEY, null), null);
    if (!data || !Array.isArray(data.items)) return [];
    return data.items.filter((x) => x && x.id).map(normalizeItem);
}

export function saveBoard(items) {
    const list = (items || []).slice(0, MAX_BOARD).map(normalizeItem);
    Bridge.termSet(BOARD_KEY, JSON.stringify({ v: 1, items: list, updatedAt: Date.now() }), true);
    return list;
}

export function normalizeItem(c) {
    const status = STATUSES.includes(c.status) ? c.status : 'unused';
    return {
        id: String(c.id || uid()),
        mode: c.mode === 'play' ? 'play' : 'observation',
        difficulty: String(c.difficulty || '未知'),
        target: String(c.target || ''),
        indicator: String(c.indicator || ''),
        playTag: String(c.playTag || ''),
        site: String(c.site || c.siteFocus || ''),
        siteFocus: String(c.siteFocus || c.site || ''),
        deadline: String(c.deadline || '无'),
        reward: String(c.reward || '未知'),
        status,
        opts: c.opts && typeof c.opts === 'object' ? c.opts : {},
        createdAt: Number(c.createdAt) || Date.now(),
        incomplete: !!c.incomplete
    };
}

export function appendItems(board, newItems) {
    const next = [...(newItems || []).map(normalizeItem), ...(board || [])];
    return saveBoard(next.slice(0, MAX_BOARD));
}

export function updateItem(board, id, patch) {
    const next = (board || []).map((it) => (it.id === id ? normalizeItem({ ...it, ...patch, id }) : it));
    return saveBoard(next);
}

export function removeItem(board, id) {
    return saveBoard((board || []).filter((it) => it.id !== id));
}

export function setStatus(board, id, status) {
    let list = board || [];
    if (status === 'active') {
        list = list.map((it) => (it.status === 'active' && it.id !== id ? { ...it, status: 'unused' } : it));
    }
    return updateItem(list, id, { status });
}

export function clearByFilter(board, pred) {
    return saveBoard((board || []).filter((it) => !pred(it)));
}

export function loadLastCfg() {
    return safeParse(Bridge.termGet(LAST_CFG_KEY, null), null) || null;
}

export function saveLastCfg(cfg) {
    Bridge.termSet(LAST_CFG_KEY, JSON.stringify(cfg || {}), true);
}

export function getGenCount() {
    const n = parseInt(Bridge.termGetString(GEN_COUNT_KEY, '3'), 10);
    if (n === 1 || n === 3 || n === 6) return n;
    return 3;
}

export function setGenCount(n) {
    const v = n === 1 || n === 6 ? n : 3;
    Bridge.termSet(GEN_COUNT_KEY, String(v), true);
    return v;
}

/** @returns {string[]} */
export function loadSelectedSites() {
    const raw = safeParse(Bridge.termGet(SITES_KEY, '[]'), []);
    if (!Array.isArray(raw)) return [];
    const allowed = new Set(SITE_POOL);
    const out = [];
    for (const s of raw) {
        const t = String(s || '').trim();
        if (allowed.has(t) && !out.includes(t)) out.push(t);
        if (out.length >= MAX_SITES) break;
    }
    return out;
}

export function saveSelectedSites(sites) {
    const allowed = new Set(SITE_POOL);
    const out = [];
    for (const s of sites || []) {
        const t = String(s || '').trim();
        if (allowed.has(t) && !out.includes(t)) out.push(t);
        if (out.length >= MAX_SITES) break;
    }
    Bridge.termSet(SITES_KEY, JSON.stringify(out), true);
    return out;
}

/**
 * 条数独立：按 count 为每条分配 siteFocus。
 * 有多选：在所选池内轮转均分；无多选：全池随机，优先不重复。
 */
export function assignSiteFocuses(count, selectedSites = null) {
    const n = Math.max(1, Math.min(20, Number(count) || 1));
    const selected = Array.isArray(selectedSites) ? selectedSites.filter((s) => SITE_POOL.includes(s)) : loadSelectedSites();

    if (selected.length > 0) {
        const pool = selected.slice(0, MAX_SITES);
        const focuses = [];
        for (let i = 0; i < n; i++) focuses.push(pool[i % pool.length]);
        return focuses;
    }

    const shuffled = shuffle([...SITE_POOL]);
    if (n <= shuffled.length) return shuffled.slice(0, n);
    const focuses = [];
    for (let i = 0; i < n; i++) focuses.push(shuffled[i % shuffled.length]);
    return focuses;
}

export function snapshotOpts(getBool, getText, extra = {}) {
    const keys = ['action', 'items', 'assist', 'target'];
    const opts = {};
    keys.forEach((k) => {
        opts[k] = !!getBool(k);
        opts[k + '_text'] = opts[k] ? String(getText(k + '_text') || '').trim() : '';
    });
    opts.sites = Array.isArray(extra.sites) ? extra.sites : loadSelectedSites();
    return opts;
}

export function formatOptTags(opts = {}) {
    const tags = [];
    if (opts.target) tags.push('🎯' + (opts.target_text || '随机目标'));
    if (opts.action) tags.push('🏃' + (opts.action_text || '随机动作'));
    if (opts.items) tags.push('🧴' + (opts.items_text || '随机道具'));
    if (opts.assist) tags.push('👥' + (opts.assist_text || '随机协助'));
    if (Array.isArray(opts.sites) && opts.sites.length) {
        tags.push('📍' + opts.sites.slice(0, 3).join('/') + (opts.sites.length > 3 ? '…' : ''));
    }
    return tags;
}

export function statusLabel(s) {
    return ({ unused: '未用', active: '进行中', used: '已用', starred: '收藏' })[s] || s;
}

export function statusColor(s) {
    return ({ unused: '#8c8c8c', active: '#1677ff', used: '#bbb', starred: '#faad14' })[s] || '#8c8c8c';
}
