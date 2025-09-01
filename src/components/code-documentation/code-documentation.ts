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
    @StateProperty copySuccess: boolean = false;

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
    showHtml(): void {
        this.activeTab = 'html';
        this.copySuccess = false;
    }

    @Expose
    showTs(): void {
        this.activeTab = 'ts';
        this.copySuccess = false;
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

    @Expose
    async copyToClipboard(): Promise<void> {
        try {
            const textToCopy = this.activeTab === 'html' ? this.getFormattedHtmlCode() : this.getFormattedTsCode();
            
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(textToCopy);
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = textToCopy;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            
            this.copySuccess = true;
            
            // Reset copy success after 2 seconds
            setTimeout(() => {
                this.copySuccess = false;
            }, 2000);
            
        } catch (err) {
            console.error('Failed to copy text to clipboard:', err);
        }
    }

    @Expose
    getFormattedHtmlCode(): string {
        return this.formatCode(this.htmlCode);
    }

    @Expose
    getFormattedTsCode(): string {
        return this.formatCode(this.tsCode);
    }

    private formatCode(code: string): string {
        if (!code) return '';
        
        // Convert escaped newlines to actual newlines
        let formatted = code
            .replace(/\\n/g, '\n')
            .replace(/\\t/g, '    ') // Convert tabs to 4 spaces
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&amp;/g, '&');
        
        return formatted;
    }

    private applySyntaxHighlighting(code: string, language: 'html' | 'typescript'): string {
        if (!code) return '';
        
        if (language === 'html') {
            return this.highlightHtml(code);
        } else if (language === 'typescript') {
            return this.highlightTypeScript(code);
        }
        
        return code;
    }

    private highlightHtml(code: string): string {
        return code
            // HTML tags
            .replace(/(&lt;\/?)([\w-]+)([^&gt;]*&gt;)/g, 
                '<span class="tag">$1</span><span class="tag-name">$2</span><span class="tag">$3</span>')
            // Attributes
            .replace(/(\w+)(=)(&quot;[^&quot;]*&quot;)/g, 
                '<span class="attr">$1</span><span class="operator">$2</span><span class="string">$3</span>')
            // Angular directives
            .replace(/(\*\w+|\(\w+\)|\[\w+\])/g, '<span class="directive">$1</span>')
            // Interpolation
            .replace(/({{[^}]*}})/g, '<span class="interpolation">$1</span>')
            // Comments
            .replace(/(&lt;!--[^&gt;]*--&gt;)/g, '<span class="comment">$1</span>');
    }

    private highlightTypeScript(code: string): string {
        return code
            // Keywords
            .replace(/\b(export|class|function|interface|type|const|let|var|if|else|for|while|return|import|from|extends|implements|public|private|protected|static|async|await|try|catch|finally|throw|new|this|super)\b/g, 
                '<span class="keyword">$1</span>')
            // Decorators
            .replace(/(@\w+)/g, '<span class="decorator">$1</span>')
            // Types
            .replace(/:\s*(\w+)(\[\])?/g, ': <span class="type">$1$2</span>')
            // Strings
            .replace(/(["'`][^"'`]*["'`])/g, '<span class="string">$1</span>')
            // Numbers
            .replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>')
            // Functions
            .replace(/(\w+)(\s*\()/g, '<span class="function">$1</span>$2')
            // Comments
            .replace(/(\/\/[^\n]*)/g, '<span class="comment">$1</span>')
            .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="comment">$1</span>')
            // Class names (capitalized words)
            .replace(/\b([A-Z]\w+)\b/g, '<span class="class-name">$1</span>');
    }

    @Expose
    getCopyButtonText(): string {
        return this.copySuccess ? 'Copied!' : 'Copy';
    }

    @Expose
    getCopyButtonClass(): string {
        return this.copySuccess ? 'copy-btn copy-btn--success' : 'copy-btn';
    }
}
