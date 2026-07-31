import { PlaybookView } from './playbook-view.js';

export class PlaybookApp {
    constructor(phoneShell, storage) {
        this.phoneShell = phoneShell;
        this.storage = storage;
        this.playbookView = new PlaybookView(this);
        if (window.NaviTerm) window.NaviTerm.playbookView = this.playbookView;
    }

    render() {
        this.playbookView.render();
    }
}
