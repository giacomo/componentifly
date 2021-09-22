import { StateType } from "./state-type";

export abstract class Component extends HTMLElement {
    public state: StateType = {};

    constructor() {
        super();
        this.initTemplate();
    }

    connectedCallback(): void {
        this.onInit();
        this.syncBindings();

        this.shadowRoot.innerHTML = this.shadowRoot.innerHTML.replaceAll(/\(click\)/g, 'data-click');
        this.shadowRoot.innerHTML = this.shadowRoot.innerHTML.replaceAll(/\(value\)/g, 'data-value');

        const eventSelectors = this.selectAll('[data-click]');
        for (const eventSelector of Array.from(eventSelectors)) {
            eventSelector.addEventListener('click', () => {
                const callback = eventSelector.getAttribute('data-click');
                this.binding[callback.replace('()', '')]();
                this.syncBindings();
            })
        }

        const valueSelectors = this.selectAll('[data-value]');
        for (const event of Array.from(valueSelectors)) {
            const attrBindProperty = event.getAttribute('data-value');
            if (this.state.hasOwnProperty(attrBindProperty)) {
                event.setAttribute('value', this.state[attrBindProperty].toString());
                event.addEventListener('keyup', (e: Event) => {
                    const target = e.currentTarget as HTMLInputElement;
                    this.setState(attrBindProperty, target.value);
                });
            }
        }
    }

    public onInit(): void {
        // add some initial code
    }

    private syncBindings(): void {
        const bindSelectors = this.selectAll('[data-bind]');
        for (const selector of Array.from(bindSelectors)) {
            const bindName = selector.attributes.getNamedItem('data-bind').value;
            if (this.state.hasOwnProperty(bindName)) {
                this.updateBindings(bindName, this.state[bindName].toString());
            }
        }
    }

    private initTemplate(): void {
        const renderer = this.getPreRenderedTemplate();
        this.attachShadow({mode: 'open'});
        this.shadowRoot.appendChild(renderer.template.content.cloneNode(true));
    }

    abstract get template(): typeof import("*.template");

    get binding(): Record<string, () => void> {
        return {};
    }

    setState(name: string, value: unknown): void {
        if (this.state.hasOwnProperty(name)) {
            this.state[name] = value;
            this.updateBindings(name, this.state[name].toString());
        }
    }

    private getPreRenderedTemplate(): {template: HTMLTemplateElement, matches: {match: string, variable: string}[]} {
        const template = document.createElement('template')

        let renderTemplate = this.template.default;

        // extract simple properties
        const regex = /\{\{\s?([a-zA-Z0-9\-\_]+)\s?\}\}/g;
        const matches = renderTemplate.match(regex).map((match) => {
            return {
                match,
                variable: match.replace(/[\{\}]+/g, '').trim(),
            };
        });

        for (const match of matches) {
            renderTemplate = renderTemplate.replaceAll(match.match, `<span data-bind="${match.variable}"></span>`);
        }

        template.innerHTML = renderTemplate;

        return {template, matches};
    }

    updateBindings(prop: string, value: unknown = ''): void {
        const bindings = [...Array.from(this.selectAll(`[data-bind$="${prop}"]`))];

        bindings.forEach((node: HTMLElement) => {
            const dataProp = node.dataset.bind;
            // const bindProp = dataProp.includes(':') ? dataProp.split(':').shift() : dataProp;
            const bindValue = dataProp.includes('.') ? dataProp.split('.').slice(1).reduce((obj, p) => obj[p], value) : value;
            node.textContent = bindValue.toString();
        });
    }

    selectAll<E extends Element = Element>(selector: string): NodeListOf<E> {
        return this.shadowRoot ? this.shadowRoot.querySelectorAll(selector) : this.querySelectorAll(selector);
    }
}