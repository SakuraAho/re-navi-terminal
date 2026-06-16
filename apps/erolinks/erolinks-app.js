/* N.A.V.I. 体己师观测终端 - EroLinks */

import { EroLinksView } from './erolinks-view.js';

export class EroLinksApp {
    constructor(phoneShell, storage) {
        this.phoneShell = phoneShell;
        this.storage = storage;
        this.view = new EroLinksView(this);
        window.addEventListener('phone:swipeBack', (e) => this.handleSwipeBack(e));
    }

    render() { this.view.render(); }

    handleSwipeBack(e) {
        const now = Date.now();
        if (this._lastSwipe && now - this._lastSwipe < 400) return;
        this._lastSwipe = now;
        const cv = document.querySelector('.phone-view-current');
        if (!cv || !cv.querySelector('.erolinks-app')) return;
        if (this.view.currentView === 'settings') {
            this.view.currentView = 'main';
            this.view.render();
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
