import { Component } from "../../lib/component";
import { StateProperty } from "../../lib/state.decorator";
import * as html from './list.template';
import styles from './list.style.scsx';

export class List extends Component {
    @StateProperty items: string[] = ['Item 1', 'Item 2', 'Item 3'];
    @StateProperty objItems: {id: number, name: string}[] = [
        { id: 1, name: 'Object Item 1' },
        { id: 2, name: 'Object Item 2' }
    ];

    get template(): typeof import("*.template") {
        return html;
    }

    get styleSheet(): string {
        return styles;
    }

    get binding(): Record<string, (...args: any[]) => any> {
        return {
            addItem: () => {
                const newItem = `Item ${this.items.length + 1}`;
                this.items = [...this.items, newItem];
            },
            removeItem: (text: string) => {
                this.items = this.items.filter(i => i !== text);
            },

            addObjItem: () => {
                const newId = this.objItems.length + 1;
                const newObjItem = { id: newId, name: `Object Item ${newId}` };
                this.objItems = [...this.objItems, newObjItem];
            },

            removeObjItem: (item: {id: number, name: string}) => {
                this.objItems = this.objItems.filter(i => i.id !== item.id);
            }
        };
    }
}