/* 观测委托本地订单存储 */
import Bridge from '../../bridge.js';

export const BOARD_KEY = 'navi_term_board_v1';
export const LAST_CFG_KEY = 'navi_term_last_cfg';
export const GEN_COUNT_KEY = 'navi_term_gen_count';
export const MAX_BOARD = 40;

const STATUSES = ['unused', 'active', 'used', 'starred'];

function safeParse(raw, fallback) {
    if (raw == null || raw === '') return fallback;
    if (typeof raw === 'object') return raw;
    try { return JSON.parse(raw); } catch (_) { return fallback; }
}

export function uid() {
    return 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
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
        site: String(c.site || ''),
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
    // 进行中最多保留 1 条：新接取时由 setStatus 处理
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

export function snapshotOpts(getBool, getText) {
    const keys = ['action', 'items', 'assist', 'target'];
    const opts = {};
    keys.forEach((k) => {
        opts[k] = !!getBool(k);
        opts[k + '_text'] = opts[k] ? String(getText(k + '_text') || '').trim() : '';
    });
    return opts;
}

export function formatOptTags(opts = {}) {
    const tags = [];
    if (opts.target) tags.push('🎯' + (opts.target_text || '随机目标'));
    if (opts.action) tags.push('🏃' + (opts.action_text || '随机动作'));
    if (opts.items) tags.push('🧴' + (opts.items_text || '随机道具'));
    if (opts.assist) tags.push('👥' + (opts.assist_text || '随机协助'));
    return tags;
}

export function statusLabel(s) {
    return ({ unused: '未用', active: '进行中', used: '已用', starred: '收藏' })[s] || s;
}

export function statusColor(s) {
    return ({ unused: '#8c8c8c', active: '#1677ff', used: '#bbb', starred: '#faad14' })[s] || '#8c8c8c';
}
