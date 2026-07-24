/* ========================================================
 *  N.A.V.I. Terminal — yuzuki-phone 桥接层
 *  集中能力探测 / 就绪等待 / 安全读写，避免直接散落依赖宿主内部结构
 * ======================================================== */

export const BRIDGE_VERSION = '1.0.0';
export const TERM_STORAGE_PREFIX = 'navi_term_';
export const PROMPT_STORE_KEY = 'navi_term_prompt_store';
export const PROMPT_STORE_VERSION = 2;

const READY_POLL_MS = 250;
const READY_TIMEOUT_MS = 20000;

function safeJsonParse(raw, fallback = null) {
    if (raw == null || raw === '') return fallback;
    if (typeof raw === 'object') return raw;
    try {
        return JSON.parse(raw);
    } catch (_) {
        return fallback;
    }
}

function getVP() {
    return (typeof window !== 'undefined' && window.VirtualPhone && typeof window.VirtualPhone === 'object')
        ? window.VirtualPhone
        : null;
}

export function getPhoneVersion() {
    const vp = getVP();
    return String(vp?.version || '').trim() || null;
}

export function probeCapabilities() {
    const vp = getVP();
    const api = vp?.apiManager;
    const storage = vp?.storage;
    const pm = vp?.promptManager;
    const wb = vp?.worldbookManager;
    const tm = vp?.timeManager;
    return {
        phonePresent: !!vp,
        phoneVersion: getPhoneVersion(),
        storage: !!(storage && typeof storage.get === 'function' && typeof storage.set === 'function'),
        api: !!(api && typeof api.callAI === 'function'),
        promptManager: !!(pm && typeof pm.getPromptForFeature === 'function'),
        worldbook: !!(wb && typeof wb.buildWorldbookMessage === 'function'),
        timeManager: !!(tm && (typeof tm.getFormattedTime === 'function' || typeof tm.getFormattedDate === 'function')),
        loadPromptManager: typeof vp?.loadPromptManager === 'function',
        loadTimeManager: typeof vp?.loadTimeManager === 'function'
    };
}

export function isCoreReady(caps = probeCapabilities()) {
    return !!(caps.phonePresent && caps.storage && caps.api);
}

export function describeReadiness(caps = probeCapabilities()) {
    if (!caps.phonePresent) {
        return { ok: false, level: 'error', message: '未检测到 yuzuki-phone，请先安装并启用柚月小手机' };
    }
    if (!caps.storage) {
        return { ok: false, level: 'error', message: '手机 storage 未就绪，请等待手机插件完成初始化' };
    }
    if (!caps.api) {
        return { ok: false, level: 'error', message: '手机 ApiManager 未就绪，请打开手机设置确认线上 API' };
    }
    const warns = [];
    if (!caps.promptManager) warns.push('提示词管理器未就绪（将使用终端内置提示词）');
    if (!caps.worldbook) warns.push('世界书桥接不可用');
    if (!caps.timeManager) warns.push('剧情时间不可用');
    return {
        ok: true,
        level: warns.length ? 'warn' : 'ok',
        message: warns.length
            ? `已连接手机 v${caps.phoneVersion || '?' }（${warns.join('；')}）`
            : `已连接手机 v${caps.phoneVersion || '?'}`
    };
}

async function tryWarmManagers() {
    const vp = getVP();
    if (!vp) return;
    const tasks = [];
    if (typeof vp.loadPromptManager === 'function' && !vp.promptManager) {
        tasks.push(Promise.resolve().then(() => vp.loadPromptManager()).catch(() => null));
    }
    if (typeof vp.loadTimeManager === 'function' && !vp.timeManager) {
        tasks.push(Promise.resolve().then(() => vp.loadTimeManager()).catch(() => null));
    }
    if (tasks.length) await Promise.all(tasks);
}

export async function waitForPhoneReady(options = {}) {
    const timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : READY_TIMEOUT_MS;
    const pollMs = Number(options.pollMs) > 0 ? Number(options.pollMs) : READY_POLL_MS;
    const started = Date.now();

    while (Date.now() - started < timeoutMs) {
        await tryWarmManagers();
        const caps = probeCapabilities();
        if (isCoreReady(caps)) {
            return { ready: true, caps, status: describeReadiness(caps) };
        }
        await new Promise((r) => setTimeout(r, pollMs));
    }

    const caps = probeCapabilities();
    return { ready: false, caps, status: describeReadiness(caps) };
}

export function getStorage() {
    return getVP()?.storage || null;
}

/** 优先手机 storage，失败则 localStorage（仅终端自有 key） */
export function termGet(key, fallback = null) {
    const k = String(key || '');
    if (!k) return fallback;
    const storage = getStorage();
    if (storage) {
        try {
            const v = storage.get(k, null);
            if (v !== null && v !== undefined && v !== '') return v;
        } catch (_) {}
    }
    try {
        const s = localStorage.getItem(k);
        if (s == null) return fallback;
        const parsed = safeJsonParse(s, s);
        return parsed == null ? fallback : parsed;
    } catch (_) {
        return fallback;
    }
}

export function termSet(key, value, persistent = true) {
    const k = String(key || '');
    if (!k) return false;
    let ok = false;
    const storage = getStorage();
    if (storage) {
        try {
            storage.set(k, value, persistent);
            ok = true;
        } catch (_) {}
    }
    try {
        const raw = typeof value === 'string' ? value : JSON.stringify(value);
        localStorage.setItem(k, raw);
        ok = true;
    } catch (_) {}
    return ok;
}

export function termGetString(key, fallback = '') {
    const v = termGet(key, null);
    if (v == null) return fallback;
    return typeof v === 'string' ? v : String(v);
}

export function termGetBool(key, fallback = false) {
    const v = termGet(key, null);
    if (v == null || v === '') return fallback;
    if (v === true || v === 'true' || v === '1' || v === 1) return true;
    if (v === false || v === 'false' || v === '0' || v === 0) return false;
    return fallback;
}

function readPromptStore() {
    const raw = termGet(PROMPT_STORE_KEY, null);
    const store = safeJsonParse(raw, null);
    if (!store || typeof store !== 'object') {
        return { version: 0, apps: {} };
    }
    if (!store.apps || typeof store.apps !== 'object') store.apps = {};
    return store;
}

function writePromptStore(store) {
    termSet(PROMPT_STORE_KEY, JSON.stringify(store), true);
}

/**
 * 确保某 app 的功能提示词存在；defaultsMap: { feature: { content, name?, ... } }
 * 版本升级时：未自定义的条目自动覆盖为新默认。
 */
export function ensurePromptDefaults(appId, defaultsMap, defaultsVersion = PROMPT_STORE_VERSION) {
    const app = String(appId || '').trim();
    if (!app || !defaultsMap) return;
    const store = readPromptStore();
    if (!store.apps[app]) store.apps[app] = { features: {} };
    const bucket = store.apps[app];
    if (!bucket.features) bucket.features = {};

    let changed = false;
    const prevVer = Number(bucket.defaultsVersion || 0);
    for (const [feature, def] of Object.entries(defaultsMap)) {
        const cur = bucket.features[feature];
        const content = String(def?.content ?? def ?? '');
        if (!cur || typeof cur !== 'object') {
            bucket.features[feature] = {
                content,
                customized: false,
                updatedAt: Date.now()
            };
            changed = true;
            continue;
        }
        if (!cur.customized && prevVer < defaultsVersion && content) {
            cur.content = content;
            cur.updatedAt = Date.now();
            changed = true;
        }
        if (typeof cur.content !== 'string') {
            cur.content = content;
            changed = true;
        }
    }
    if (bucket.defaultsVersion !== defaultsVersion) {
        bucket.defaultsVersion = defaultsVersion;
        changed = true;
    }
    store.version = Math.max(Number(store.version || 0), defaultsVersion);
    if (changed) writePromptStore(store);

    // 可选：同步一份到手机 prompt 体系，便于手机设置页能看到（失败忽略）
    softSyncToPhonePromptManager(app, defaultsMap, bucket);
}

function softSyncToPhonePromptManager(app, defaultsMap, bucket) {
    const pm = getVP()?.promptManager;
    const storage = getStorage();
    if (!storage) return;
    try {
        const raw = storage.get('phone-prompts', null);
        let prompts = safeJsonParse(raw, {}) || {};
        if (!prompts[app]) prompts[app] = {};
        let changed = false;
        for (const [feature, def] of Object.entries(defaultsMap)) {
            if (!prompts[app][feature]) {
                const content = bucket?.features?.[feature]?.content || def?.content || '';
                prompts[app][feature] = {
                    enabled: def?.enabled !== false,
                    name: def?.name || feature,
                    description: def?.description || '',
                    content,
                    order: def?.order ?? 50
                };
                changed = true;
            }
        }
        if (changed) storage.set('phone-prompts', JSON.stringify(prompts), true);
        if (pm && typeof pm.loadPrompts === 'function') {
            try { pm.loadPrompts(); } catch (_) {}
        }
    } catch (_) {}
}

export function getTermPrompt(appId, feature, fallback = '') {
    const app = String(appId || '').trim();
    const feat = String(feature || '').trim();
    const store = readPromptStore();
    const content = store.apps?.[app]?.features?.[feat]?.content;
    if (typeof content === 'string' && content.trim()) return content;

    // 回退：手机 promptManager
    try {
        const pm = getVP()?.promptManager;
        if (pm && typeof pm.getPromptForFeature === 'function') {
            const p = pm.getPromptForFeature(app, feat);
            if (typeof p === 'string' && p.trim()) return p;
        }
    } catch (_) {}
    return fallback || '';
}

export function setTermPrompt(appId, feature, content, { customized = true } = {}) {
    const app = String(appId || '').trim();
    const feat = String(feature || '').trim();
    if (!app || !feat) return false;
    const store = readPromptStore();
    if (!store.apps[app]) store.apps[app] = { features: {}, defaultsVersion: PROMPT_STORE_VERSION };
    if (!store.apps[app].features) store.apps[app].features = {};
    store.apps[app].features[feat] = {
        content: String(content ?? ''),
        customized: !!customized,
        updatedAt: Date.now()
    };
    writePromptStore(store);

    // 同步手机（若可用）
    try {
        const pm = getVP()?.promptManager;
        if (pm && typeof pm.updateActivePromptUserPreset === 'function') {
            pm.updateActivePromptUserPreset(app, feat, String(content ?? ''));
        } else if (pm && typeof pm.updatePrompt === 'function') {
            pm.updatePrompt(app, feat, String(content ?? ''));
        }
    } catch (_) {}
    return true;
}

export function resetTermPrompt(appId, feature, defaultContent = '') {
    return setTermPrompt(appId, feature, defaultContent, { customized: false });
}

export async function callPhoneAI(messages, options = {}) {
    const vp = getVP();
    const api = vp?.apiManager;
    if (!api || typeof api.callAI !== 'function') {
        return { success: false, summary: '', error: 'ApiManager 不可用，请确认 yuzuki-phone 已加载且线上 API 可用' };
    }
    if (!Array.isArray(messages) || !messages.length) {
        return { success: false, summary: '', error: '消息列表为空' };
    }

    let result;
    try {
        result = await api.callAI(messages, options);
    } catch (err) {
        return {
            success: false,
            summary: '',
            error: err?.message || String(err) || 'AI 调用异常'
        };
    }

    if (result == null) {
        return { success: false, summary: '', error: 'AI 返回为空' };
    }
    if (typeof result === 'string') {
        return { success: true, summary: result, error: '' };
    }
    if (typeof result !== 'object') {
        return { success: false, summary: '', error: 'AI 返回格式无法识别' };
    }

    const success = result.success !== false && !result.error;
    const summary = String(
        result.summary ?? result.content ?? result.text ?? result.message ?? ''
    );
    const error = String(result.error || (!success ? 'AI 请求失败' : '') || '');
    return { success: !!success && (!!summary || !error), summary, error, raw: result };
}

export async function buildWorldbookText(appKey) {
    const wb = getVP()?.worldbookManager;
    if (!wb || typeof wb.buildWorldbookMessage !== 'function') return '';
    try {
        const msg = await wb.buildWorldbookMessage(String(appKey || ''));
        if (!msg) return '';
        if (typeof msg === 'string') return msg;
        return String(msg.content || msg.text || '');
    } catch (e) {
        console.warn('[NAVI-Term][bridge] 世界书构建失败:', e);
        return '';
    }
}

export function getStoryTimeParts() {
    const tm = getVP()?.timeManager;
    let time = '';
    let date = '';
    try {
        if (tm?.getFormattedTime) time = String(tm.getFormattedTime() || '');
        if (tm?.getFormattedDate) date = String(tm.getFormattedDate() || '');
    } catch (_) {}
    return { time, date };
}

export function getWorldbookEnabled(appKey, fallback = true) {
    const wb = getVP()?.worldbookManager;
    if (!wb || typeof wb.getEnabled !== 'function') return fallback;
    try {
        return wb.getEnabled(String(appKey || '')) ?? fallback;
    } catch (_) {
        return fallback;
    }
}

export function setWorldbookEnabled(appKey, enabled) {
    const wb = getVP()?.worldbookManager;
    if (!wb || typeof wb.setEnabled !== 'function') return false;
    try {
        wb.setEnabled(String(appKey || ''), !!enabled);
        return true;
    } catch (_) {
        return false;
    }
}

export function getWorldbookManager() {
    return getVP()?.worldbookManager || null;
}

export function getSTContext() {
    try {
        if (typeof SillyTavern !== 'undefined' && typeof SillyTavern.getContext === 'function') {
            return SillyTavern.getContext();
        }
    } catch (_) {}
    return null;
}

export function appendToChatInput(text) {
    const t = String(text || '');
    if (!t) return false;
    const ta = document.getElementById('send_textarea');
    if (!ta) return false;
    const sep = ta.value && !ta.value.endsWith('\n') ? '\n\n' : '';
    ta.value = (ta.value || '') + sep + t;
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    try { ta.focus(); } catch (_) {}
    return true;
}

export function createStatusHtml(status) {
    const st = status || describeReadiness();
    const color = st.level === 'ok' ? '#52c41a' : st.level === 'warn' ? '#faad14' : '#ff4d4f';
    return `<div class="nt-bridge-status" style="border-color:${color}33;color:${color}">${escapeHtml(st.message || '')}</div>`;
}

export function escapeHtml(v) {
    return String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export const Bridge = {
    version: BRIDGE_VERSION,
    getVP,
    getPhoneVersion,
    probeCapabilities,
    isCoreReady,
    describeReadiness,
    waitForPhoneReady,
    getStorage,
    termGet,
    termSet,
    termGetString,
    termGetBool,
    ensurePromptDefaults,
    getTermPrompt,
    setTermPrompt,
    resetTermPrompt,
    callPhoneAI,
    buildWorldbookText,
    getStoryTimeParts,
    getWorldbookEnabled,
    setWorldbookEnabled,
    getWorldbookManager,
    getSTContext,
    appendToChatInput,
    createStatusHtml,
    escapeHtml,
    PROMPT_STORE_KEY,
    PROMPT_STORE_VERSION
};

export default Bridge;
