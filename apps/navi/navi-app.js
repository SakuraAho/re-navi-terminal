/* ========================================================
 *  N.A.V.I. 体己师观测终端
 *  原作: yuzuki (柚月小手机) / Terminal 改装
 * ======================================================== */

import { NaviView } from './navi-view.js';
import { ensureNaviPrompts } from './navi-prompts.js';

export class NaviApp {
    constructor(phoneShell, storage) {
        this.phoneShell = phoneShell;
        this.storage = storage;
        ensureNaviPrompts();
        this.naviView = new NaviView(this);
        if (window.NaviTerm) window.NaviTerm.naviView = this.naviView;
    }

    render() {
        this.naviView.render();
    }
}
