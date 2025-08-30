import { getComponentSelector } from './component.decorator';

export class Framework {
    registerComponent(selector: string, component: CustomElementConstructor): void {
        if (!selector) return;
        if (customElements.get(selector)) return;
        window.customElements.define(selector, component);
    }

    registerComponents(components: Array<CustomElementConstructor>): void {
        for (const c of components) {
            const selector = getComponentSelector(c);
            if (!selector) {
                try { console.warn('No selector found on component; skip', c?.name || c); } catch {}
                continue;
            }
            this.registerComponent(selector, c);
        }
    }
}