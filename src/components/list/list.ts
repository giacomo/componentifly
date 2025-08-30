import { Component } from "../../lib/component";
import * as html from './list.template';
import styles from './list.style.scsx';
import { ListState } from "../../states/list.state";

export class List extends Component {
    state: ListState = {
        items: ['Item 1', 'Item 2', 'Item 3'],
        objItems: [{ id: 1, name: 'Object Item 1' }, { id: 2, name: 'Object Item 2' }]
    };

    get template(): typeof import("*.template") {
        return html;
    }

    get styleSheet(): string {
        return styles;
    }

    get binding(): Record<string, (...args: any[]) => any> {
        return {
            addItem: () => {
                const newItem = `Item ${this.state.items.length + 1}`;
                this.state.items.push(newItem);
            },
            removeItem: (text: string) => {
                const index = this.state.items.indexOf(text);
                if (index > -1) {
                    this.state.items.splice(index, 1);
                }
            },

            addObjItem: () => {
                const newId = this.state.objItems.length + 1;
                const newObjItem = { id: newId, name: `Object Item ${newId}` };
                this.state.objItems.push(newObjItem);
            },

            removeObjItem: (item: {id: number, name: string}) => {
                const index = this.state.objItems.findIndex(i => i.id === item.id);
                if (index > -1) {
                    this.state.objItems.splice(index, 1);
                }
            }
        };
    }
}