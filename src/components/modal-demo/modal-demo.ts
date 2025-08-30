import { Component, Expose } from "../../lib";
import * as html from './modal-demo.template';
import styles from './modal-demo.style.scsx';

export class ModalDemo extends Component {
    state = { submittedName: '' };

    get template(): any {
        return html;
    }

    get styleSheet(): string {
        return styles;
    }

    @Expose openSimple() {
        this.openTestcase({title: 'Simple', message: 'A simple modal message.'});
    }
    @Expose openWithTitle() {
        this.openTestcase({title: 'Titled Modal', message: 'Modal with a custom title.'});
    }
    @Expose openConfirmOnly() {
        this.openTestcase({title: 'Confirm Only', message: 'Only a confirm button is shown.', footerType: 'confirm-only'});
    }
    @Expose openNoFooter() {
        this.openTestcase({title: 'No Footer', message: 'This modal has no footer.', footerType: 'none'});
    }
    @Expose openLargeContent() {
        this.openTestcase({title: 'Large Content', message: new Array(100).fill('Long content line.').join('\n')});
    }
    @Expose openForm() {
        this.openTestcase({title: 'Form in modal', message: 'Please enter your name', footerType: 'default', showForm: true});
    }

    private openTestcase(data: any): void {
        const modal = this.getComponent<any>('demoModal');
        if (!modal) return;
        if (typeof modal.open === 'function') {
            modal.open(data);
        }
    }

    public onInit(): void {
        const modal = this.getComponent<any>('demoModal');
        if (!modal) return;
    const onConfirm = (e: any) => {
        const name = e.detail && e.detail.name ? e.detail.name : '';
        this.setState('submittedName', name);
        // ensure binding rendered
        try { this.updateBindings('submittedName', name); } catch (err) {}
        const node = (this as any).shadowRoot ? (this as any).shadowRoot.querySelector('[data-bind="submittedName"]') : null;
        if (node) node.textContent = name;
    };

    // prefer direct listener on modal host
    modal.addEventListener('confirm', onConfirm);
    // also listen on the demo host to catch composed events that bubble up
    this.addEventListener('confirm', onConfirm);
    }
}
