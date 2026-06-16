/* ========================================================
 *  N.A.V.I. Terminal — 独立扩展面板 v2.0
 *  桥接 yuzuki-phone API，不修改其任何代码
 * ======================================================== */

const TERM_VERSION = '2.0.0';
const TERM_BASE = new URL('./', import.meta.url).href;

// 防重复
if (window.NAVI_TERM_LOADED) { console.warn('[NAVI-Term] 已加载'); } else {
window.NAVI_TERM_LOADED = true;

// ========== 浮动按钮 ==========
function createFloatingBtn() {
    const btn = document.createElement('div');
    btn.id = 'navi-term-btn';
    btn.innerHTML = '📱';
    btn.title = 'N.A.V.I. Terminal';
    // 拖拽
    let dragging = false, ox = 0, oy = 0, sx = 0, sy = 0;
    const saved = loadPos();
    btn.style.cssText = `position:fixed;z-index:2147483640;width:44px;height:44px;border-radius:12px;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;font-size:22px;cursor:pointer;box-shadow:0 2px 12px rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.15);transition:box-shadow 0.2s;left:${saved.x}px;top:${saved.y}px;user-select:none;touch-action:none;`;
    btn.onmousedown = btn.ontouchstart = (e) => {
        if (e.touches) e = e.touches[0];
        dragging = true; ox = e.clientX - btn.offsetLeft; oy = e.clientY - btn.offsetTop;
        btn.style.transition = 'none';
    };
    document.addEventListener('mousemove', (e) => { if(!dragging)return; btn.style.left=(e.clientX-ox)+'px'; btn.style.top=(e.clientY-oy)+'px'; });
    document.addEventListener('touchmove', (e) => { if(!dragging)return; const t=e.touches[0]; btn.style.left=(t.clientX-ox)+'px'; btn.style.top=(t.clientY-oy)+'px'; },{passive:false});
    document.addEventListener('mouseup', (e) => {
        if(!dragging)return;
        dragging = false; btn.style.transition = 'box-shadow 0.2s';
        savePos(parseInt(btn.style.left), parseInt(btn.style.top));
        if(Math.abs(e.clientX-ox-btn.offsetLeft)<3 && Math.abs(e.clientY-oy-btn.offsetTop)<3) togglePanel();
    });
    document.addEventListener('touchend', (e) => {
        if(!dragging)return;
        dragging = false; btn.style.transition = 'box-shadow 0.2s';
        savePos(parseInt(btn.style.left), parseInt(btn.style.top));
        if(e.changedTouches&&e.changedTouches[0]){const t=e.changedTouches[0];if(Math.abs(t.clientX-ox-btn.offsetLeft)<5&&Math.abs(t.clientY-oy-btn.offsetTop)<5)togglePanel();}
    });
    document.body.appendChild(btn);
}
function loadPos() { try { const s=localStorage.getItem('navi_term_btn_pos'); if(s){const p=JSON.parse(s);return{x:p.x||20,y:p.y||120};} } catch(e){} return {x:20,y:120}; }
function savePos(x,y) { try { localStorage.setItem('navi_term_btn_pos',JSON.stringify({x,y})); } catch(e){} }

// ========== 面板 ==========
let panel = null, panelOpen = false;
function togglePanel() {
    if (panel && panelOpen) { panel.style.display = 'none'; panelOpen = false; return; }
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'navi-term-panel';
        panel.innerHTML = `<div id="navi-term-header"><span id="navi-term-title">N.A.V.I. Terminal</span><span id="navi-term-close" onclick="document.getElementById('navi-term-panel').style.display='none';window._naviTermOpen=false;">✕</span></div><div id="navi-term-body"><div id="navi-term-home"><div class="nt-app-grid"><div class="nt-app-card" data-app="navi"><div class="nt-app-icon">🎯</div><div class="nt-app-name">观测委托</div></div><div class="nt-app-card" data-app="erolinks"><div class="nt-app-icon">🔗</div><div class="nt-app-name">EroLinks</div></div></div></div><div id="navi-term-app"></div></div>`;
        panel.style.cssText = 'position:fixed;z-index:2147483630;right:10px;top:10%;width:380px;max-width:calc(100vw-20px);height:min(680px,80vh);background:#1a1a2e;border-radius:16px;border:1px solid rgba(255,255,255,0.1);box-shadow:0 8px 40px rgba(0,0,0,0.5);display:flex;flex-direction:column;overflow:hidden;resize:both;min-width:320px;min-height:400px;';
        document.body.appendChild(panel);

        // App cards click
        panel.querySelectorAll('.nt-app-card').forEach(card => {
            card.addEventListener('click', () => { openApp(card.dataset.app); });
        });
    }
    panel.style.display = 'flex'; panelOpen = true;
    if (!window._naviTermOpen) { window._naviTermOpen = true; }
}

// ========== App Shell ==========
class TermShell {
    constructor(container) { this.container = container; this.screen = container; }
    setContent(html, id) { this.container.innerHTML = html; this.container.dataset.viewId = id || ''; }
    showNotification(title, msg, icon) {
        // Simple toast
        const toast = document.createElement('div');
        toast.style.cssText = 'position:fixed;z-index:2147483650;bottom:20px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);color:#fff;padding:10px 20px;border-radius:10px;font-size:13px;pointer-events:none;';
        toast.textContent = (icon||'') + ' ' + title + (msg?' — '+msg:'');
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    }
}

// ========== App Loader ==========
const appModules = {
    navi: './apps/navi/navi-app.js',
    erolinks: './apps/erolinks/erolinks-app.js'
};

async function openApp(appId) {
    const homeEl = document.getElementById('navi-term-home');
    const appEl = document.getElementById('navi-term-app');
    const titleEl = document.getElementById('navi-term-title');
    if (!appEl) return;

    // Check yuzuki-phone bridge
    const VP = window.VirtualPhone;
    if (!VP?.apiManager) {
        appEl.innerHTML = '<div style="color:#888;text-align:center;padding:40px;">⚠️ 需要先加载 yuzuki-phone 插件</div>';
        return;
    }

    appEl.innerHTML = '<div style="color:#888;text-align:center;padding:60px;">加载中...</div>';
    homeEl.style.display = 'none';
    appEl.style.display = 'flex';

    try {
        const mod = await import(appModules[appId]);
        const AppClass = mod[appId === 'navi' ? 'NaviApp' : 'EroLinksApp'];
        const shell = new TermShell(appEl);
        const inst = new AppClass(shell, VP.storage);
        // Override: use our shell instead of phoneShell
        inst.phoneShell = shell;
        inst.view.app = inst;
        if (inst.view) inst.view.app = inst;
        inst.render();
        if (appId === 'navi') titleEl.textContent = '🎯 观测委托';
        else if (appId === 'erolinks') titleEl.textContent = '🔗 EroLinks';
        // Store for potential use
        window._naviTermCurrentApp = inst;
        window._naviTermAppId = appId;

        // Back button handling — add a back bar
        const backBar = document.createElement('div');
        backBar.innerHTML = '<button style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:#aaa;padding:3px 12px;border-radius:8px;cursor:pointer;font-size:12px;">← 返回</button>';
        backBar.style.cssText = 'position:absolute;top:6px;left:10px;z-index:10;';
        backBar.querySelector('button').onclick = () => {
            appEl.innerHTML = ''; appEl.style.display = 'none';
            homeEl.style.display = 'block';
            titleEl.textContent = 'N.A.V.I. Terminal';
            delete window._naviTermCurrentApp;
        };
        appEl.style.position = 'relative';
        appEl.appendChild(backBar);
    } catch (err) {
        console.error('[NAVI-Term] 加载失败:', err);
        appEl.innerHTML = '<div style="color:#ff8080;text-align:center;padding:40px;">加载失败: ' + (err.message||'未知错误') + '</div>';
    }
}

// ========== Init ==========
function init() {
    if (typeof SillyTavern === 'undefined') { setTimeout(init, 500); return; }
    createFloatingBtn();
    console.log(`🚀 N.A.V.I. Terminal v${TERM_VERSION} 已启动`);
}
init();

} // end NAVI_TERM_LOADED guard
