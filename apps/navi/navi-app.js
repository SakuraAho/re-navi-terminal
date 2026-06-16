/* ========================================================
 *  N.A.V.I. 体己师观测终端
 *  原作: yuzuki (柚月小手机)
 *
 * ⚠️ 版权声明 (Copyright Notice):
 * 1. 禁止商业化：本项目仅供交流学习，严禁任何形式的倒卖、盈利等商业行为。
 * 2. 禁止二改发布：严禁未经授权修改代码后作为独立项目二次发布或分发。
 * 3. 禁止抄袭：严禁盗用本项目的核心逻辑、UI设计与相关原代码。
 *
 * Copyright (c) yuzuki. All rights reserved.
 * ======================================================== */
// ========================================
// 🎯 观测委托APP - 核心控制器
// ========================================

import { NaviView } from './navi-view.js';
import { ensureNaviPrompts } from './navi-prompts.js';

export class NaviApp {
    constructor(phoneShell, storage) {
        this.phoneShell = phoneShell;
        this.storage = storage;
        ensureNaviPrompts(storage);
        this.naviView = new NaviView(this);

        window.addEventListener('phone:swipeBack', (e) => this.handleSwipeBack(e));
    }

    render() {
        this.naviView.render();
    }

    handleSwipeBack(e) {
        const now = Date.now();
        if (this._lastSwipeTime && now - this._lastSwipeTime < 400) return;
        this._lastSwipeTime = now;

        const domCurrentView = document.querySelector('.phone-view-current');
        if (!domCurrentView || !domCurrentView.querySelector('.navi-app')) return;

        const state = this.naviView.currentView;

        if (state === 'detail') {
            this.naviView.currentView = 'list';
            this.naviView.render();
            this.naviView.isBackNav = true;
        } else {
            window.dispatchEvent(new CustomEvent('phone:goHome'));
        }

        const screen = document.querySelector('.phone-screen');
        if (screen) {
            screen.style.pointerEvents = 'none';
            setTimeout(() => { screen.style.pointerEvents = ''; }, 400);
        }
    }
}
