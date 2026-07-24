/* N.A.V.I. Terminal - EroLinks App */

import { EroLinksView } from './erolinks-view.js';

export class EroLinksApp {
    constructor(phoneShell, storage) {
        this.phoneShell = phoneShell;
        this.storage = storage;
        this.view = new EroLinksView(this);
        if (window.NaviTerm) window.NaviTerm.erolinksView = this.view;
    }

    render() {
        this.view.render();
    }
}
