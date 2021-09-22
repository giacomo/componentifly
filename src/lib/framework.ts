export class Framework {
    registerComponent(selector: string, component: CustomElementConstructor): void {
        window.customElements.define(selector, component);
    } 
}