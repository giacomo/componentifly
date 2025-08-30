import { Component, Expose } from "../../lib";
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

    @Expose
    addCounter(): void {
        this.state.count++;
        this.updateBindings('count', this.state.count);
    }

    @Expose
    subtractCounter(): void {
        this.state.count--;
        this.updateBindings('count', this.state.count);
    }

    @Expose
    resetCounter(): void {
        this.state.count = 0;
        this.updateBindings('count', this.state.count);
    }

    @Expose
    isVisible(): boolean {
        return this.state.count === 9;
    }
}