import { Component, ComponentDecorator, Expose, StateProperty } from "../../lib";

@ComponentDecorator({ templatePath: './modal.html', stylePath: './modal.scss', selector: 'ao-modal' })
export class Modal extends Component {
    @StateProperty isOpen: boolean = false;
    @StateProperty data: any = {};
    @StateProperty title: string = '';
    @StateProperty message: string = '';
    @StateProperty formName: string = '';

    onInit(): void {
        // Initialize modal state when component loads
        if (this.data) {
            this.title = this.data.title || '';
            this.message = this.data.message || '';
            this.formName = this.data.name || '';
        }
    }

    @Expose
    confirm(): void {
        this.detach({ 
            action: 'confirm', 
            data: { name: this.formName }
        });
    }

    @Expose
    cancel(): void {
        this.detach({ 
            action: 'cancel',
            data: {}
        });
    }

    @Expose
    close(): void {
        this.cancel();
    }
}