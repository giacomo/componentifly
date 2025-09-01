import { Component, ComponentDecorator, Expose, StateProperty, InputProperty, getDecoratedInputProps } from "../../lib";

@ComponentDecorator({ 
    templatePath: './code-documentation.html', 
    stylePath: './code-documentation.scss', 
    selector: 'ao-code-documentation' 
})
export class CodeDocumentation extends Component {
    @InputProperty htmlCode: string = '';
    @InputProperty tsCode: string = '';
    @StateProperty activeTab: string = 'html';

    connectedCallback(): Promise<void> {
        console.log('[CodeDocumentation] === connectedCallback START ===');
        console.log('[CodeDocumentation] htmlCode initial value:', this.htmlCode);
        console.log('[CodeDocumentation] tsCode initial value:', this.tsCode);
        
        console.log('[CodeDocumentation] All HTML attributes:');
        for (let i = 0; i < this.attributes.length; i++) {
            const attr = this.attributes[i];
            console.log(`  ${attr.name} = "${attr.value.substring(0, 100)}..."`);
        }
        
        const inputProps = getDecoratedInputProps(this);
        console.log('[CodeDocumentation] Decorated input props:', Array.from(inputProps.entries()));
        
        // Call parent connectedCallback
        const result = super.connectedCallback();
        
        console.log('[CodeDocumentation] After super.connectedCallback:');
        console.log('[CodeDocumentation] htmlCode after super:', this.htmlCode);
        console.log('[CodeDocumentation] tsCode after super:', this.tsCode);
        console.log('[CodeDocumentation] === connectedCallback END ===');
        
        return result;
    }

    @Expose
    debugProps(): void {
        console.log('=== DEBUG PROPS ===');
        console.log('htmlCode property value:', this.htmlCode);
        console.log('tsCode property value:', this.tsCode);
        console.log('htmlCode descriptor:', Object.getOwnPropertyDescriptor(this, 'htmlCode'));
        console.log('tsCode descriptor:', Object.getOwnPropertyDescriptor(this, 'tsCode'));
        console.log('Proto htmlCode descriptor:', Object.getOwnPropertyDescriptor(Object.getPrototypeOf(this), 'htmlCode'));
        console.log('Proto tsCode descriptor:', Object.getOwnPropertyDescriptor(Object.getPrototypeOf(this), 'tsCode'));
        console.log('__originalAttributes:', (this as any).__originalAttributes);
        console.log('All attributes:');
        for (let i = 0; i < this.attributes.length; i++) {
            const attr = this.attributes[i];
            console.log(`  ${attr.name} = "${attr.value}"`);
        }
        
        // Test manual setting
        console.log('Testing manual property setting...');
        if (typeof (this as any).setInputProperty === 'function') {
            (this as any).setInputProperty('htmlCode', 'Manually set HTML code!');
            (this as any).setInputProperty('tsCode', 'Manually set TypeScript code!');
        }
    }

    @Expose
    testManualSet(): void {
        console.log('Setting properties manually...');
        this.htmlCode = 'Test HTML Code Set Directly';
        this.tsCode = 'Test TypeScript Code Set Directly';
        console.log('htmlCode after manual set:', this.htmlCode);
        console.log('tsCode after manual set:', this.tsCode);
    }

    @Expose
    showHtml(): void {
        this.activeTab = 'html';
    }

    @Expose
    showTs(): void {
        this.activeTab = 'ts';
    }

    @Expose
    isHtml(): boolean {
        return this.activeTab === 'html';
    }

    @Expose
    isTs(): boolean {
        return this.activeTab === 'ts';
    }

    @Expose
    isNotHtml(): boolean {
        return this.activeTab !== 'html';
    }

    @Expose
    isNotTs(): boolean {
        return this.activeTab !== 'ts';
    }
}
