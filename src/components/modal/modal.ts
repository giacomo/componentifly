import { Component } from "../../lib/component";
import * as html from './modal.template';
import styles from './modal.style.scsx';
import { ModalState } from "../../states/modal.state";

export class Modal extends Component {
    state: ModalState = {
        isOpen: false,
        data: {}
    };

    get template(): any {
        return html;
    }

    get styleSheet(): string {
        return styles;
    }

    get binding(): Record<string, () => void> {
        return {
            close: () => {
                this.state.isOpen = false;
            },
            confirm: () => {
                this.state.isOpen = false;
            }
        };
    }
}