import { Component } from "../../lib";
import * as html from './button.template';
import styles from './button.style.scsx';

export class Button extends Component {
    state = {};
    inputAttributes = ['name'];


    get template(): any {
        return html;
    }

    get styleSheet(): string {
        return styles;
    }

    get binding(): Record<string, (...args: any[]) => any> {
        return {};
    }
}
