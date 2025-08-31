import { Component, ComponentDecorator, Expose, StateProperty } from "../../lib";

@ComponentDecorator({ templatePath: './modal.html', stylePath: './modal.scss', selector: 'ao-modal' })
export class Modal extends Component {
    @StateProperty isOpen: boolean = false;
    @StateProperty data: any = {};
    @StateProperty title: string = '';
    @StateProperty message: string = '';
    @StateProperty footerType: 'default' | 'confirm-only' | 'none' | 'custom' = 'default';
    @StateProperty name: string = '';
    @StateProperty showForm: boolean = false;
    private __lastAction: 'idle' | 'confirm' | 'cancel' = 'idle';

    // template & styles provided by decorator

    @Expose
    close(): void {
        const wasOpen = this.isOpen;
        const wasConfirm = this.__lastAction === 'confirm';
        this.isOpen = false;
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

        // If user closed without confirming, emit a cancel event
        if (wasOpen && !wasConfirm) {
            try {
                const evt = new CustomEvent('cancel', { detail: this.data, bubbles: true, composed: true });
                this.dispatchEvent(evt);
            } catch {}
        }
        this.__lastAction = 'idle';
    }

    @Expose
    confirm(): void {
        try {
            // ensure name is forwarded in data
            if (this.name) {
                this.data = Object.assign({}, this.data, {name: this.name});
            }

            this.__lastAction = 'confirm';
            const event = new CustomEvent('confirm', {detail: this.data, bubbles: true, composed: true});
            this.dispatchEvent(event);

        } catch (err) {
            try { console.error('Modal.confirm error', err); } catch (e) {}
        } finally {
            this.close();
        }
    }

    // helper bindings for template conditional rendering (simplified)
    public showFooter(): boolean {
    return this.footerType !== 'none';
    }

    public footerIsDefault(): boolean {
    return this.footerType === 'default';
    }

    public footerIsConfirmOnly(): boolean {
    return this.footerType === 'confirm-only';
    }

    public footerIsCustom(): boolean {
    return this.footerType === 'custom';
    }

    static get observedAttributes() {
        return ['open'];
    }

    async connectedCallback(): Promise<void> {
        // ensure base wiring runs
        await super.connectedCallback();

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
            this.isOpen = this.hasAttribute('open');
        }
    }

    async open(data: any = {}): Promise<{ action: 'confirm' | 'cancel'; data: any }> {
        // normalize common fields for simple mustache bindings
    // ensure template is ready to avoid timing issues where first click appears blank
    try { await (this as any).ensureTemplate?.(); } catch {}
    this.data = data;
    this.title = data.title || '';
    this.message = data.message || '';
    this.footerType = data.footerType || 'default';
    this.name = data.name || '';
    this.showForm = !!data.showForm;
    this.isOpen = true;
        this.setAttribute('open', '');
        this.__lastAction = 'idle';

        // force bindings/directives refresh immediately so UI reflects latest values
    try { this.updateBindings('title', this.title); } catch {}
    try { this.updateBindings('message', this.message); } catch {}
    try { this.updateBindings('name', this.name); } catch {}
    try { (this as any).evaluateDirectives(); } catch {}

        // runtime DOM adjustments for footer variants
        const shadow = (this as any).shadowRoot as ShadowRoot | null;
        if (shadow) {
            const footer = shadow.querySelector('.modal__footer') as HTMLElement | null;
            const cancelBtn = shadow.getElementById('modal-cancel') as HTMLElement | null;
            const confirmBtn = shadow.getElementById('modal-confirm') as HTMLElement | null;

            if (footer) {
                footer.style.display = this.footerType === 'none' ? 'none' : '';
            }

            if (cancelBtn) {
                cancelBtn.style.display = this.footerType === 'confirm-only' ? 'none' : '';
            }

            if (confirmBtn) {
                confirmBtn.style.display = '';
            }

            // show/hide name input form
            const form = shadow.querySelector('.modal__form') as HTMLElement | null;
            if (form) {
                form.style.display = this.showForm ? 'block' : 'none';
            }
        }

        // Provide a Promise that resolves on confirm or cancel
        return new Promise((resolve) => {
            const onConfirm = (e: Event) => {
                try { this.removeEventListener('cancel', onCancel); } catch {}
                resolve({ action: 'confirm', data: (e as CustomEvent).detail });
            };
            const onCancel = (e: Event) => {
                try { this.removeEventListener('confirm', onConfirm); } catch {}
                resolve({ action: 'cancel', data: (e as CustomEvent).detail });
            };
            this.addEventListener('confirm', onConfirm, { once: true });
            this.addEventListener('cancel', onCancel, { once: true });
        });
    }

}