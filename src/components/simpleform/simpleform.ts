import { Component } from "../../lib/component";
import * as html from './simpleform.template';
import styles from './simpleform.style.scsx';
import { SimpleformState } from "../../states/simpleform.state";

export class Simpleform extends Component {
    state: SimpleformState = {
        name: 'Bob',
    };

    get template(): typeof import("*.template") {
        return html;
    }

    get styleSheet(): string {
        return styles;
    }

    get binding(): Record<string, () => void> {
        return {};
    }
}