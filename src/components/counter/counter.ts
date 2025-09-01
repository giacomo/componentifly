import { Component, ComponentDecorator, Expose, StateProperty } from "../../lib";

@ComponentDecorator({ templatePath: './counter.html', stylePath: './counter.scss', selector: 'ao-counter' })
export class Counter extends Component {
    @StateProperty count: number = 0;

    @Expose
    addCounter(): void {
        this.count++;
    }

    @Expose
    subtractCounter(): void {
        this.count--;
    }

    @Expose
    resetCounter(): void {
        this.count = 0;
    }

    @Expose
    isVisible(): boolean {
        return this.count === 9;
    }
}