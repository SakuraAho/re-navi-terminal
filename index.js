/* ========================================================
 *  N.A.V.I. Terminal — 独立扩展面板 v2.1
 *  桥接 yuzuki-phone API，不修改其任何代码
 * ======================================================== */

import Bridge from './bridge.js';

const TERM_VERSION = '2.6.6';
const TERM_BASE = new URL('./', import.meta.url).href;

if (window.NAVI_TERM_LOADED) {
    console.warn('[NAVI-Term] 已加载');
} else {
window.NAVI_TERM_LOADED = true;

window.NaviTerm = Object.assign(window.NaviTerm || {}, {
    version: TERM_VERSION,
    baseUrl: TERM_BASE,
    bridge: Bridge,
    naviView: null,
    erolinksView: null,
    playbookView: null,
    currentApp: null,
    currentAppId: null,
    panelOpen: false
});

// ========== 浮动按钮 ==========
function createFloatingBtn() {
    if (document.getElementById('navi-term-btn')) return;
    const btn = document.createElement('div');
    btn.id = 'navi-term-btn';
    btn.innerHTML = '📱';
    btn.title = 'N.A.V.I. Terminal';
    let dragging = false;
    let ox = 0;
    let oy = 0;
    let startX = 0;
    let startY = 0;
    const saved = loadPos();
    btn.style.cssText = `position:fixed;z-index:2147483640;width:44px;height:44px;border-radius:12px;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;font-size:22px;cursor:pointer;box-shadow:0 2px 12px rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.15);transition:box-shadow 0.2s;left:${saved.x}px;top:${saved.y}px;user-select:none;touch-action:none;`;

    const onDown = (e) => {
        const p = e.touches ? e.touches[0] : e;
        dragging = true;
        ox = p.clientX - btn.offsetLeft;
        oy = p.clientY - btn.offsetTop;
        startX = p.clientX;
        startY = p.clientY;
        btn.style.transition = 'none';
    };
    const onMove = (e) => {
        if (!dragging) return;
        const p = e.touches ? e.touches[0] : e;
        btn.style.left = (p.clientX - ox) + 'px';
        btn.style.top = (p.clientY - oy) + 'px';
        if (e.cancelable && e.touches) e.preventDefault();
    };
    const onUp = (e) => {
        if (!dragging) return;
        dragging = false;
        btn.style.transition = 'box-shadow 0.2s';
        savePos(parseInt(btn.style.left, 10) || 0, parseInt(btn.style.top, 10) || 0);
        const p = e.changedTouches ? e.changedTouches[0] : e;
        const dx = Math.abs((p?.clientX || 0) - startX);
        const dy = Math.abs((p?.clientY || 0) - startY);
        if (dx < 6 && dy < 6) togglePanel();
    };

    btn.addEventListener('mousedown', onDown);
    btn.addEventListener('touchstart', onDown, { passive: true });
    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchend', onUp);
    document.body.appendChild(btn);
}

function loadPos() {
    try {
        const s = localStorage.getItem('navi_term_btn_pos');
        if (s) {
            const p = JSON.parse(s);
            return { x: p.x || 20, y: p.y || 120 };
        }
    } catch (_) {}
    return { x: 20, y: 120 };
}

function savePos(x, y) {
    try {
        localStorage.setItem('navi_term_btn_pos', JSON.stringify({ x, y }));
    } catch (_) {}
}

// ========== 面板 ==========
let panel = null;

function closePanel() {
    if (!panel) return;
    panel.style.display = 'none';
    window.NaviTerm.panelOpen = false;
}

function refreshHomeStatus() {
    const el = document.getElementById('navi-term-status');
    if (!el) return;
    const status = Bridge.describeReadiness();
    const color = status.level === 'ok' ? '#52c41a' : status.level === 'warn' ? '#faad14' : '#ff4d4f';
    el.style.borderColor = color + '33';
    el.style.color = color;
    el.textContent = status.message || '';
}

function togglePanel() {
    if (panel && window.NaviTerm.panelOpen) {
        closePanel();
        return;
    }
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'navi-term-panel';
        panel.innerHTML = `
            <div id="navi-term-header">
                <span id="navi-term-title">N.A.V.I. Terminal</span>
                <span id="navi-term-close" role="button" tabindex="0">✕</span>
            </div>
            <div id="navi-term-body">
                <div id="navi-term-home">
                    <div id="navi-term-status" class="nt-bridge-status">检测手机桥接中…</div>
                    <div class="nt-app-grid">
                        <div class="nt-app-card" data-app="navi">
                            <div class="nt-app-icon">🎯</div>
                            <div class="nt-app-name">观测委托</div>
                        </div>
                        <div class="nt-app-card" data-app="erolinks">
                            <div class="nt-app-icon">🔗</div>
                            <div class="nt-app-name">EroLinks</div>
                        </div>
                        <div class="nt-app-card" data-app="playbook">
                            <div class="nt-app-icon">📗</div>
                            <div class="nt-app-name">玩法集</div>
                        </div>
                    </div>
                    <div class="nt-home-meta">v${TERM_VERSION} · bridge ${Bridge.version}</div>
                </div>
                <div id="navi-term-app" style="display:none;"></div>
            </div>`;
        panel.style.cssText = 'position:fixed;z-index:2147483630;right:10px;top:2%;width:420px;max-width:min(440px,calc(100vw-20px));height:min(820px,92vh);background:#1a1a2e;border-radius:20px;border:1px solid rgba(255,255,255,0.12);box-shadow:0 8px 40px rgba(0,0,0,0.5);display:flex;flex-direction:column;overflow:hidden;resize:both;min-width:340px;min-height:500px;';
        document.body.appendChild(panel);

        panel.querySelector('#navi-term-close')?.addEventListener('click', closePanel);

        const header = panel.querySelector('#navi-term-header');
        let pdrag = false;
        let px = 0;
        let py = 0;
        header?.addEventListener('mousedown', (e) => {
            if (e.target?.id === 'navi-term-close') return;
            pdrag = true;
            px = e.clientX - panel.offsetLeft;
            py = e.clientY - panel.offsetTop;
            panel.style.transition = 'none';
        });
        document.addEventListener('mousemove', (e) => {
            if (!pdrag) return;
            panel.style.left = (e.clientX - px) + 'px';
            panel.style.top = (e.clientY - py) + 'px';
            panel.style.right = 'auto';
        });
        document.addEventListener('mouseup', () => {
            pdrag = false;
            panel.style.transition = '';
        });

        panel.querySelectorAll('.nt-app-card').forEach((card) => {
            card.addEventListener('click', () => {
                openApp(card.dataset.app);
            });
        });
    }
    panel.style.display = 'flex';
    window.NaviTerm.panelOpen = true;
    refreshHomeStatus();
    Bridge.waitForPhoneReady({ timeoutMs: 4000 }).then(() => refreshHomeStatus());
}

// ========== App Shell ==========
class TermShell {
    constructor(container) {
        this.container = container;
        this.screen = container;
    }
    setContent(html, id) {
        this.container.innerHTML = html;
        this.container.dataset.viewId = id || '';
    }
    showNotification(title, msg, icon) {
        const toast = document.createElement('div');
        toast.className = 'nt-toast';
        toast.textContent = `${icon || ''} ${title || ''}${msg ? ' — ' + msg : ''}`.trim();
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2400);
    }
}

function goHome() {
    const homeEl = document.getElementById('navi-term-home');
    const appEl = document.getElementById('navi-term-app');
    const titleEl = document.getElementById('navi-term-title');
    if (appEl) {
        appEl.innerHTML = '';
        appEl.style.display = 'none';
    }
    if (homeEl) homeEl.style.display = 'flex';
    if (titleEl) titleEl.textContent = 'N.A.V.I. Terminal';
    window.NaviTerm.currentApp = null;
    window.NaviTerm.currentAppId = null;
    window.NaviTerm.naviView = null;
    window.NaviTerm.erolinksView = null;
    window.NaviTerm.playbookView = null;
    refreshHomeStatus();
}

const appModules = {
    navi: './apps/navi/navi-app.js',
    erolinks: './apps/erolinks/erolinks-app.js',
    playbook: './apps/playbook/playbook-app.js'
};

const APP_TITLES = {
    navi: '🎯 观测委托',
    erolinks: '🔗 EroLinks',
    playbook: '📗 玩法集'
};

const APP_CLASS = {
    navi: 'NaviApp',
    erolinks: 'EroLinksApp',
    playbook: 'PlaybookApp'
};

async function openApp(appId) {
    const homeEl = document.getElementById('navi-term-home');
    const appEl = document.getElementById('navi-term-app');
    const titleEl = document.getElementById('navi-term-title');
    if (!appEl || !appModules[appId]) return;

    homeEl.style.display = 'none';
    appEl.style.display = 'flex';
    appEl.innerHTML = '<div class="nt-loading">⏳ 加载中…</div>';

    // 玩法集只写输入框，不强制手机桥接
    if (appId !== 'playbook') {
        const ready = await Bridge.waitForPhoneReady({ timeoutMs: 12000 });
        if (!ready.ready) {
            appEl.innerHTML = `<div class="nt-error">${Bridge.escapeHtml(ready.status?.message || '需要先加载 yuzuki-phone 插件')}</div>
                <div style="text-align:center;margin-top:12px;"><button class="nt-mini-btn" id="nt-retry-bridge">重试</button>
                <button class="nt-mini-btn" id="nt-back-home">返回</button></div>`;
            appEl.querySelector('#nt-retry-bridge')?.addEventListener('click', () => openApp(appId));
            appEl.querySelector('#nt-back-home')?.addEventListener('click', goHome);
            return;
        }
    }

    const storage = Bridge.getStorage();
    const appWrap = document.createElement('div');
    appWrap.className = 'nt-app-wrap';
    const backBar = document.createElement('div');
    backBar.className = 'nt-back-bar';
    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'nt-mini-btn';
    backBtn.textContent = '← 返回';
    backBtn.addEventListener('click', goHome);
    backBar.appendChild(backBtn);

    const appContent = document.createElement('div');
    appContent.id = 'nt-app-content';
    appContent.className = 'nt-app-content';
    appWrap.appendChild(backBar);
    appWrap.appendChild(appContent);
    appEl.innerHTML = '';
    appEl.appendChild(appWrap);

    try {
        if (appId === 'playbook') {
            const href = new URL('./apps/playbook/playbook.css', import.meta.url).href;
            if (!document.querySelector(`link[data-nt-playbook]`)) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = href;
                link.dataset.ntPlaybook = '1';
                document.head.appendChild(link);
            }
        }
        const mod = await import(new URL(appModules[appId], import.meta.url).href);
        const AppClass = mod[APP_CLASS[appId]];
        if (!AppClass) throw new Error('App 导出缺失');
        const shell = new TermShell(appContent);
        const inst = new AppClass(shell, storage);
        inst.phoneShell = shell;
        const view = inst.view || inst.naviView || inst.erolinksView || inst.playbookView;
        if (view) view.app = inst;
        inst.render();
        if (titleEl) titleEl.textContent = APP_TITLES[appId] || 'N.A.V.I. Terminal';
        window.NaviTerm.currentApp = inst;
        window.NaviTerm.currentAppId = appId;
    } catch (err) {
        console.error('[NAVI-Term] 加载失败:', err);
        appEl.innerHTML = `<div class="nt-error">加载失败: ${Bridge.escapeHtml(err?.message || '未知错误')}</div>
            <div style="text-align:center;margin-top:12px;"><button class="nt-mini-btn" id="nt-back-home">返回</button></div>`;
        appEl.querySelector('#nt-back-home')?.addEventListener('click', goHome);
    }
}

function init() {
    if (typeof SillyTavern === 'undefined') {
        setTimeout(init, 500);
        return;
    }
    createFloatingBtn();
    // 后台预热桥接，不阻塞 UI
    Bridge.waitForPhoneReady({ timeoutMs: 15000 }).then((r) => {
        console.log(`[NAVI-Term] 桥接状态: ${r.status?.message || (r.ready ? 'ready' : 'not ready')}`);
    });
    console.log(`🚀 N.A.V.I. Terminal v${TERM_VERSION} 已启动 (bridge ${Bridge.version})`);
}

init();

} // end NAVI_TERM_LOADED guard
