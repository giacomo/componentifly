import { Component } from "../../lib/component";
import * as html from './counter.template';
import styles from './counter.style.scsx';
import { CounterState } from "../../states/counter.state";

export class Counter extends Component {
    state: CounterState = {
        count: 0
    };

    get template(): any {
        return html;
    }

    get styleSheet(): string {
        return styles;
    }

    get binding(): Record<string, () => void> {
        return {
            addCounter: () => {
                this.state.count++;
            },
            subtractCounter: () => {
                this.state.count--;
            },
            resetCounter: () => {
                this.state.count = 0;
            }
        };
    }
}