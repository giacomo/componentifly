import { Component } from "../../lib/component";
import * as html from './tooltip.template';
import { TooltipState } from "../../states/tooltip.state";

export class Tooltip extends Component {
    state: TooltipState = {
        test: 'Foobar',
        count: 0,
        name: 'Fjord',
    };


    get template(): typeof import("*.template") {
        return html;
    }

    get binding(): Record<string, () => void> {
        return {
            updateCounter: () => {
                this.state.count++;
            },
            resetCounter: () => {
                this.state.count = 0;
            }
        };
    }
}