import { Component } from "../../lib/component";
import * as html from './modal.template';
import styles from './modal.style.scsx';
import { ModalState } from "../../states/modal.state";

export class Modal extends Component {
    state: ModalState = {
    isOpen: false,
    data: {},
    title: '',
    message: '',
    footerType: 'default',
    name: '',
    showForm: false
    };

    get template(): any {
        return html;
    }

    get styleSheet(): string {
        return styles;
    }

    get binding(): Record<string, (...args: any[]) => any> {
        return {
            close: () => {
                this.close();
            },
            confirm: () => {
                this.confirm();
            }
        };
    }

    // helper bindings for template conditional rendering (simplified)
    public showFooter(): boolean {
        return (this.state as any).footerType !== 'none';
    }

    public footerIsDefault(): boolean {
        return (this.state as any).footerType === 'default';
    }

    public footerIsConfirmOnly(): boolean {
        return (this.state as any).footerType === 'confirm-only';
    }

    public footerIsCustom(): boolean {
        return (this.state as any).footerType === 'custom';
    }

    static get observedAttributes() {
        return ['open'];
    }

    connectedCallback(): void {
        // ensure base wiring runs
        super.connectedCallback();

        // also wire footer buttons directly to avoid any shadow/bubbling issues
        const shadow = (this as any).shadowRoot as ShadowRoot | null;
        if (shadow) {
            try { /* debug listener removed */ } catch (e) {}
            const cancelEl = shadow.getElementById('modal-cancel');
            const confirmEl = shadow.getElementById('modal-confirm');
            if (cancelEl) {
                cancelEl.addEventListener('click', () => { this.close(); });
                const attachInnerCancel = () => {
                    try {
            const inner = (cancelEl as any).shadowRoot ? (cancelEl as any).shadowRoot.querySelector('button') : null;
                        if (inner) inner.addEventListener('click', () => { this.close(); });
                    } catch (e) {}
                };
        attachInnerCancel();
        setTimeout(attachInnerCancel, 0);
            }
            if (confirmEl) {
        confirmEl.addEventListener('click', () => { this.confirm(); });
                const attachInnerConfirm = () => {
                    try {
            const inner = (confirmEl as any).shadowRoot ? (confirmEl as any).shadowRoot.querySelector('button') : null;
            if (inner) inner.addEventListener('click', () => { this.confirm(); });
                    } catch (e) {}
                };
                attachInnerConfirm();
                setTimeout(attachInnerConfirm, 0);
            }
        }
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string): void {
        if (name === 'open') {
            const isOpen = this.hasAttribute('open');
            this.setState('isOpen', isOpen);
        }
    }

    open(data: any = {}): void {
        // normalize common fields for simple mustache bindings
        this.setState('data', data);
        this.setState('title', data.title || '');
        this.setState('message', data.message || '');
        this.setState('footerType', data.footerType || 'default');
    this.setState('name', data.name || '');
    this.setState('showForm', !!data.showForm);
        this.setState('isOpen', true);
        this.setAttribute('open', '');

        // runtime DOM adjustments for footer variants
        const shadow = (this as any).shadowRoot as ShadowRoot | null;
        if (shadow) {
            const footer = shadow.querySelector('.modal__footer') as HTMLElement | null;
            const cancelBtn = shadow.getElementById('modal-cancel') as HTMLElement | null;
            const confirmBtn = shadow.getElementById('modal-confirm') as HTMLElement | null;

            if (footer) {
                footer.style.display = (this.state as any).footerType === 'none' ? 'none' : '';
            }

            if (cancelBtn) {
                cancelBtn.style.display = (this.state as any).footerType === 'confirm-only' ? 'none' : '';
            }

            if (confirmBtn) {
                confirmBtn.style.display = '';
            }

            // show/hide name input form
            const form = shadow.querySelector('.modal__form') as HTMLElement | null;
            if (form) {
                form.style.display = (this.state as any).showForm ? 'block' : 'none';
            }
        }
    }

    close(): void {
        this.setState('isOpen', false);
        this.removeAttribute('open');
        // reset footer/ui state
        const shadow = (this as any).shadowRoot as ShadowRoot | null;
        if (shadow) {
            const footer = shadow.querySelector('.modal__footer') as HTMLElement | null;
            const cancelBtn = shadow.getElementById('modal-cancel') as HTMLElement | null;
            const confirmBtn = shadow.getElementById('modal-confirm') as HTMLElement | null;
            if (footer) footer.style.display = '';
            if (cancelBtn) cancelBtn.style.display = '';
            if (confirmBtn) confirmBtn.style.display = '';
        }
    }

    confirm(): void {
        try {
            // ensure name is forwarded in data
            if ((this.state as any).name) {
                this.state.data = Object.assign({}, this.state.data, {name: (this.state as any).name});
            }

            const event = new CustomEvent('confirm', {detail: this.state.data, bubbles: true, composed: true});
            this.dispatchEvent(event);

        } catch (err) {
            try { console.error('Modal.confirm error', err); } catch (e) {}
        } finally {
            this.close();
        }
    }
}