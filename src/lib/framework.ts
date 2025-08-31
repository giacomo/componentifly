import { getComponentSelector } from './component.decorator';

export class Framework {
    registerComponent(selector: string, component: CustomElementConstructor): void {
        if (!selector) {
            console.error('[Framework] No selector provided for component', component?.name || component);
            return;
        }
        if (customElements.get(selector)) {
            console.warn(`[Framework] Selector '${selector}' already registered.`);
            return;
        }
        try {
            window.customElements.define(selector, component);
            console.debug(`[Framework] Registered custom element: ${selector} for`, component?.name || component);
        } catch (e) {
            console.error(`[Framework] Failed to register custom element '${selector}':`, e);
        }
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