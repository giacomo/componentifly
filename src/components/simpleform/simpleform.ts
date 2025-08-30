import { Component } from "../../lib";
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

    // No methods to expose for this component
}