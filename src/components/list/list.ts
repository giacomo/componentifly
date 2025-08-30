import { Component, ComponentDecorator, StateProperty, Expose } from "../../lib";

@ComponentDecorator({ templatePath: './list.html', stylePath: './list.scss'})
export class List extends Component {
    @StateProperty items: string[] = ['Item 1', 'Item 2', 'Item 3'];
    @StateProperty objItems: {id: number, name: string}[] = [
        { id: 1, name: 'Object Item 1' },
        { id: 2, name: 'Object Item 2' }
    ];

    @Expose
    addItem(): void {
        const newItem = `Item ${this.items.length + 1}`;
        this.items = [...this.items, newItem];
    }

    @Expose
    removeItem(text: string): void {
        this.items = this.items.filter(i => i !== text);
    }

    @Expose
    addObjItem(): void {
        const newId = this.objItems.length + 1;
        const newObjItem = { id: newId, name: `Object Item ${newId}` };
        this.objItems = [...this.objItems, newObjItem];
    }

    @Expose
    removeObjItem(item: {id: number, name: string}): void {
        this.objItems = this.objItems.filter(i => i.id !== item.id);
    }
}