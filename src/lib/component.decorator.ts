export interface ComponentOptions {
  /**
   * The compiled template module (e.g., import * as tpl from './x.template')
   * or a raw HTML string. If a string is provided, it will be wrapped as { default: string }.
   */
  template?: any;
  /**
   * The compiled CSS string (e.g., import styles from './x.style.scsx') or a raw CSS string.
   */
  style?: string;
  /**
   * Optional: custom-element selector to auto-register.
   */
  selector?: string;
  /**
   * Whether to automatically call customElements.define. Defaults to false.
   * Prefer using Framework.registerComponent(s) for explicit registration.
   */
  autoRegister?: boolean;
  /**
  * Optional: relative or absolute path to the HTML template file (e.g., './list.html').
   */
  templatePath?: string;
  /**
  * Optional: relative or absolute path to the SCSS file; will be mapped to the corresponding '.style.scsx' module (e.g., './list.scss' -> './list.style.scsx').
   */
  stylePath?: string;
  /**
  * Base URL used to resolve relative paths. Pass `import.meta.url` from the component file.
  */
  baseUrl?: string | URL;
}

function hasOwnGetter(proto: any, key: string): boolean {
  if (!proto) return false;
  const desc = Object.getOwnPropertyDescriptor(proto, key);
  return !!(desc && typeof desc.get === "function");
}

function defineGetter(proto: any, key: string, getter: () => any) {
  Object.defineProperty(proto, key, {
    configurable: true,
    enumerable: true,
    get: getter,
  });
}

function normalizeTemplateModule(tpl: any): any {
  if (tpl && typeof tpl === "object" && "default" in tpl) return tpl;
  if (typeof tpl === "string") return { default: tpl };
  return tpl;
}

/**
 * Class decorator to attach template/style metadata to a Component subclass.
 * Usage:
 *   import { Component as ComponentBase } from './component';
 *   import { Component } from './component.decorator';
 *   import * as html from './list.template';
 *   import styles from './list.style.scsx';
 *   @Component({ template: html, style: styles })
 *   export class List extends ComponentBase { ... }
 */
import { installPrototypeStateAccessors } from "./state.decorator";

const SELECTOR_KEY = Symbol.for("__component_selector");
export function getComponentSelector(ctor: any): string | undefined {
  if (!ctor) return undefined;
  return (ctor as any)[SELECTOR_KEY] || (ctor as any).selector || (ctor as any).is;
}

export function Component(options: ComponentOptions): ClassDecorator {
  return function (target: any) {
    if (!target || typeof target !== "function") return;

    console.debug('[ComponentDecorator] Applying to:', target.name);

    const proto = target.prototype;
    const { template, style, selector, templatePath, stylePath, autoRegister } = (options || {}) as ComponentOptions;

    // Try to infer the caller module URL (the component file) for resolving relative paths
    const thisModuleUrl = (import.meta as any)?.url as string | undefined;
    const inferCallerUrl = (): string | undefined => {
      try {
        throw new Error("__stack");
      } catch (e: any) {
        const stack: string = String(e && e.stack ? e.stack : "");
        const lines = stack.split(/\n+/);
        for (const line of lines) {
          const m = line.match(/(https?:\/\/[^\s\)]+\.(?:ts|js)(?:\?[^\s\)]*)?)/i) || line.match(/(\/[^\s\)]+\.(?:ts|js)(?:\?[^\s\)]*)?)/i);
          if (m) {
            const url = m[1];
            if (!thisModuleUrl || !url.includes(thisModuleUrl)) {
              return url;
            }
          }
        }
      }
      return undefined;
    };
    const defaultBaseUrl = inferCallerUrl();

    if (template !== undefined && !hasOwnGetter(proto, "template")) {
      const normalized = normalizeTemplateModule(template);
      defineGetter(proto, "template", () => normalized);
    }

    if (style !== undefined && !hasOwnGetter(proto, "styleSheet")) {
      const css = typeof style === "string" ? style : String(style ?? "");
      defineGetter(proto, "styleSheet", () => css);
    }

    // If path-based options provided, set up dynamic loading and getters.
    if (templatePath || stylePath) {
      const mapTemplate = (p: string) => p; // keep .html or .template as-is
      const mapStyle = (p: string) => p.endsWith('.scss') ? p.replace(/\.scss$/, '.css') : p;

      const resolveUrl = (p: string): string => {
        if (!p) return p;
        if (/^https?:\/\//i.test(p)) return p;
        if (p.startsWith('/')) return p; // absolute from project root
        const b = (options as any).baseUrl ? (typeof (options as any).baseUrl === 'string' ? (options as any).baseUrl : (options as any).baseUrl.toString()) : (defaultBaseUrl || '');
        try {
          return b ? new URL(p, b).toString() : p;
        } catch {
          return p;
        }
      };

      let tplModule: any | null = null;
      let cssText: string | null = null;
      let assetsPromise: Promise<void> | null = null;
      const ensureLoad = (): Promise<void> => {
        if (assetsPromise) return assetsPromise;
        assetsPromise = (async () => {
          if (templatePath) {
            const p = mapTemplate(templatePath);
            const u = resolveUrl(p);
            try {
              if (p.endsWith('.template')) {
                tplModule = await import(/* @vite-ignore */ u);
              } else {
                const res = await fetch(u);
                const text = await res.text();
                tplModule = { default: text };
              }
            } catch (e) {
              console.error('[Component] template load failed', templatePath, e);
              tplModule = { default: '' };
            }
          }
          if (stylePath) {
            const original = stylePath;
            const mapped = mapStyle(stylePath);
            const u = resolveUrl(mapped);
            try {
              if (original.endsWith('.style.scsx')) {
                const mod: any = await import(/* @vite-ignore */ u);
                cssText = mod && mod.default ? String(mod.default) : '';
              } else {
                const res = await fetch(u);
                cssText = await res.text();
              }
            } catch (e) {
              console.error('[Component] style load failed', stylePath, e);
              cssText = '';
            }
          }
        })();
        return assetsPromise;
      };

      if (!hasOwnGetter(proto, 'template')) {
        defineGetter(proto, 'template', () => tplModule ?? { default: '' });
      }
      if (!hasOwnGetter(proto, 'styleSheet')) {
        defineGetter(proto, 'styleSheet', () => cssText ?? '');
      }
      Object.defineProperty(proto, '__componentAssetsPromise', {
        configurable: true,
        enumerable: false,
        get: () => ensureLoad(),
      });
      // Preload immediately
      try { void ensureLoad(); } catch {}
    }

    // Store selector metadata on the constructor for the Framework to use
    if (selector && typeof selector === 'string') {
      try { (target as any)[SELECTOR_KEY] = selector; } catch {}
      try { (target as any).selector = (target as any).selector || selector; } catch {}
      try { (target as any).is = (target as any).is || selector; } catch {}
    }

  // Ensure prototype state accessors are installed for any @StateProperty on this class
  try { installPrototypeStateAccessors(target); } catch {}

    // Optional: auto-define only when explicitly requested
    if (autoRegister && selector && typeof selector === "string") {
      try {
        if (!customElements.get(selector)) {
          customElements.define(selector, target as CustomElementConstructor);
        }
      } catch (e) {
        // ignore define errors (e.g., already defined in HMR)
      }
    }
  };
}
