import { StateType } from "./state-type";
import { getDecoratedStateProps } from "./state.decorator";
import { getDecoratedSlotProps } from "./slot.decorator";
import { getExposedMethods } from "./expose.decorator";

export abstract class Component extends HTMLElement {
  public state: StateType = {};
  private __rendered = false;
  private __tmplModule: any | null = null;
  private __styleText: string | null = null;

  constructor() {
    super();
    // Initialize state bag early
    if (!this.state) this.state = {} as any;

    // Install instance-level accessors for decorated state properties immediately
    // so subclass field initializers (which run after super()) will invoke these
    // setters instead of creating own data properties that bypass state wiring.
    try {
      const props = Array.from(getDecoratedStateProps(this));
      for (const key of props) {
        try {
          const storageSym = Symbol.for(`__inst_state_${String(key)}`);
          const ownDesc = Object.getOwnPropertyDescriptor(this, key);
          // Only define if there's not already an accessor on the instance
          if (!ownDesc || (!ownDesc.get && !ownDesc.set)) {
            Object.defineProperty(this, key, {
              configurable: true,
              enumerable: true,
              get: () => {
                try {
                  if (Object.prototype.hasOwnProperty.call(this as any, storageSym)) {
                    return (this as any)[storageSym];
                  }
                } catch {}
                try { return (this.state as any)[key]; } catch { return undefined; }
              },
              set: (value: any) => {
                try { (this as any)[storageSym] = value; } catch {}
                try { if (!this.state || typeof this.state !== 'object') this.state = {}; (this.state as any)[key] = value; } catch {}
                try { this.updateBindings(key, value); } catch {}
                try { (this as any).evaluateDirectives?.(); } catch {}
                try { (this as any).syncBindings?.(); } catch {}
                try { queueMicrotask?.(() => { try { (this as any).syncBindings?.(); } catch {} }); } catch {}
                try { requestAnimationFrame?.(() => { try { (this as any).syncBindings?.(); } catch {} }); } catch {}
              }
            });
          }
          // If an own data property existed (even if its value is `undefined`),
          // migrate it through the accessor so it updates the state bag.
          try {
            const hadOwn = Object.prototype.hasOwnProperty.call(this, key);
            if (hadOwn) {
              const currentDesc = Object.getOwnPropertyDescriptor(this, key);
              const currentVal = currentDesc && Object.prototype.hasOwnProperty.call(currentDesc, 'value') ? (currentDesc as any).value : undefined;
              try { delete (this as any)[key]; } catch {}
              try { (this as any)[key] = currentVal; } catch {}
            }
          } catch {}
        } catch {}
      }
    } catch {}

    // Define accessors on the component's prototype so that subclass field
    // initializers (which run after `super()`) will invoke the prototype
    // setter instead of creating an own data property that bypasses state.
    try {
      const props = Array.from(getDecoratedStateProps(this));
      const proto = Object.getPrototypeOf(this) || (this as any).constructor?.prototype;
      for (const key of props) {
        const storageSym = Symbol.for(`__inst_state_${String(key)}`);
        try {
          const existing = Object.getOwnPropertyDescriptor(proto, key);
          if (!existing || !existing.set) {
            Object.defineProperty(proto, key, {
              configurable: true,
              enumerable: true,
              get: function (this: any) {
                try {
                  if (Object.prototype.hasOwnProperty.call(this, storageSym)) {
                    return this[storageSym];
                  }
                } catch {}
                try {
                  return this.state ? this.state[key] : undefined;
                } catch {
                  return undefined;
                }
              },
              set: function (this: any, value: any) {
                try { this[storageSym] = value; } catch {}
                try { if (!this.state || typeof this.state !== 'object') this.state = {}; this.state[key] = value; } catch {}
                try { if (typeof this.updateBindings === 'function') this.updateBindings(key, value); } catch {}
                try { if (typeof this.evaluateDirectives === 'function') this.evaluateDirectives(); } catch {}
                try { if (typeof this.syncBindings === 'function') this.syncBindings(); } catch {}
                try { queueMicrotask?.(() => { try { if (typeof this.syncBindings === 'function') this.syncBindings(); } catch {} }); } catch {}
                try { requestAnimationFrame?.(() => { try { if (typeof this.syncBindings === 'function') this.syncBindings(); } catch {} }); } catch {}
              }
            });
          }
        } catch {}

        // If a value was already set (via field initializer after super), reflect it
        // through the setter so it propagates into `this.state` and updates bindings.
        try {
          const current = (this as any)[key];
          if (current !== undefined) {
            try { (this as any)[key] = current; } catch {}
          }
        } catch {}
      }
    } catch {}

    // If a decorator provided async assets, wait briefly before initializing template
    // Kick off template init; can be async if decorator provided paths
    void this.ensureTemplate();

    // DEBUG: quick probe to show decorated props and descriptors at end of constructor
    try {
      const props = Array.from(getDecoratedStateProps(this));
      if (props.length) {
        const probe: any = {};
        for (const k of props) {
          probe[k] = {
            hasOwn: Object.prototype.hasOwnProperty.call(this, k),
            instanceDesc: Object.getOwnPropertyDescriptor(this, k),
            protoDesc: Object.getOwnPropertyDescriptor(Object.getPrototypeOf(this), k),
            stateValue: (this as any).state?.[k],
          };
        }
        try { console.debug('[Component debug] constructor props', probe); } catch (e) {}
      }
    } catch (e) {}

    // After constructor finishes (and subclass field initializers have run),
    // synchronously migrate any own data properties created by class-field initializers into the state-backed accessors.
    try {
      const props = Array.from(getDecoratedStateProps(this));
      for (const key of props) {
        try {
          if (Object.prototype.hasOwnProperty.call(this, key)) {
            const desc = Object.getOwnPropertyDescriptor(this, key);
            if (desc && Object.prototype.hasOwnProperty.call(desc, 'value')) {
              const val = (this as any)[key];
              try { delete (this as any)[key]; } catch (e) { console.error(`[Component migration] Failed to delete own property '${key}':`, e); }
              // Redefine the accessor
              const storageSym = Symbol.for(`__inst_state_${String(key)}`);
              try {
                Object.defineProperty(this, key, {
                  configurable: true,
                  enumerable: true,
                  get: () => {
                    try {
                      if (Object.prototype.hasOwnProperty.call(this as any, storageSym)) {
                        return (this as any)[storageSym];
                      }
                    } catch {}
                    try { return (this.state as any)[key]; } catch { return undefined; }
                  },
                  set: (value: any) => {
                    try { (this as any)[storageSym] = value; } catch {}
                    try { if (!this.state || typeof this.state !== 'object') this.state = {}; (this.state as any)[key] = value; } catch {}
                    try { this.updateBindings(key, value); } catch {}
                    try { (this as any).evaluateDirectives?.(); } catch {}
                    try { (this as any).syncBindings?.(); } catch {}
                    try { queueMicrotask?.(() => { try { (this as any).syncBindings?.(); } catch {} }); } catch {}
                    try { requestAnimationFrame?.(() => { try { if (typeof this.syncBindings === 'function') this.syncBindings(); } catch {} }); } catch {}
                  }
                });
              } catch (e) { console.error(`[Component migration] Failed to redefine accessor for '${key}':`, e); }
              // Set the value through the setter
              try { (this as any)[key] = val; } catch (e) { console.error(`[Component migration] Failed to set value for '${key}' through accessor:`, e); }
              // Force sync after migration
              try { if (typeof this.syncBindings === 'function') this.syncBindings(); } catch (e) { console.error(`[Component migration] Failed to sync bindings for '${key}':`, e); }
            }
          }
        } catch (e) { console.error(`[Component migration] Error migrating property '${key}':`, e); }
      }
    } catch (e) { console.error('[Component migration] Error in synchronous migration:', e); }
  }

  private async ensureTemplate(): Promise<void> {
    const self: any = this as any;
    try {
      const maybe: any = self.__componentAssetsPromise;
      if (maybe && typeof maybe.then === "function") {
        await maybe; // wait for assets to be ready
      } else if (typeof maybe === "function") {
        const p = maybe();
        if (p && typeof p.then === "function") await p;
      }
    } catch {}
    try {
      if (!this.shadowRoot) this.initTemplate();
    } catch {}
  }

  async connectedCallback(): Promise<void> {
  console.debug(`[Component] connectedCallback called for`, this.tagName, this.constructor.name);
    // Ensure template is present (synchronous for import-based, async for path-based)
    await this.ensureTemplate();

    // If template hasn't been initialized yet (async decorator), wait and retry once it's ready
    const shadow = this.shadowRoot;
    const self: any = this as any;
    if (!shadow) {
      const p: any = self.__componentAssetsPromise;
      if (p && typeof p.then === "function") {
        try {
          p.then(() => {
            try {
              this.connectedCallback();
            } catch {}
          });
        } catch {}
      }
      return;
    }

    // Ensure prototype accessors exist for decorated props. We do this here
    // (rather than only in the constructor) because TC39 decorator initializers
    // and class-field initializers may run after `super()`; running now ensures
    // the decorator has had a chance to register the props on the constructor.
    try {
      const props = Array.from(getDecoratedStateProps(this));
      const proto = Object.getPrototypeOf(this) || (this as any).constructor?.prototype;
      for (const key of props) {
        const storageSym = Symbol.for(`__inst_state_${String(key)}`);
        try {
          const existing = Object.getOwnPropertyDescriptor(proto, key);
          if (!existing || !existing.set) {
            Object.defineProperty(proto, key, {
              configurable: true,
              enumerable: true,
              get: function (this: any) {
                try {
                  if (Object.prototype.hasOwnProperty.call(this, storageSym)) {
                    return this[storageSym];
                  }
                } catch {}
                try {
                  return this.state ? this.state[key] : undefined;
                } catch {
                  return undefined;
                }
              },
              set: function (this: any, value: any) {
                try { this[storageSym] = value; } catch {}
                try { if (!this.state || typeof this.state !== 'object') this.state = {}; this.state[key] = value; } catch {}
                try { if (typeof this.updateBindings === 'function') this.updateBindings(key, value); } catch {}
                try { if (typeof this.evaluateDirectives === 'function') this.evaluateDirectives(); } catch {}
                try { if (typeof this.syncBindings === 'function') this.syncBindings(); } catch {}
                try { queueMicrotask?.(() => { try { if (typeof this.syncBindings === 'function') this.syncBindings(); } catch {} }); } catch {}
                try { requestAnimationFrame?.(() => { try { if (typeof this.syncBindings === 'function') this.syncBindings(); } catch {} }); } catch {}
              }
            });
          }
        } catch {}
      }
    } catch {}

    // Reconcile any decorated properties that may have been created as own
    // data properties by subclass field initializers (so they don't bypass
    // our prototype setters). For each decorated prop, if an own value
    // exists, delete that own property and reassign it so the setter runs
    // and writes into `this.state`.
    try {
      const props = Array.from(getDecoratedStateProps(this));
      for (const key of props) {
        try {
          if (Object.prototype.hasOwnProperty.call(this, key)) {
            const desc = Object.getOwnPropertyDescriptor(this, key);
            if (desc && Object.prototype.hasOwnProperty.call(desc, "value")) {
              const val = (this as any)[key];
              console.debug(`[connectedCallback] Reconciling property '${key}':`, {
                before: {
                  value: val,
                  desc,
                  protoDesc: Object.getOwnPropertyDescriptor(Object.getPrototypeOf(this), key),
                  stateValue: (this as any).state?.[key],
                }
              });
              try { delete (this as any)[key]; } catch (e) { console.error(`[connectedCallback] Failed to delete own property '${key}':`, e); }
              try { (this as any)[key] = val; } catch (e) { console.error(`[connectedCallback] Failed to set value for '${key}' through accessor:`, e); }
              console.debug(`[connectedCallback] After reconciliation for '${key}':`, {
                after: {
                  instanceDesc: Object.getOwnPropertyDescriptor(this, key),
                  protoDesc: Object.getOwnPropertyDescriptor(Object.getPrototypeOf(this), key),
                  stateValue: (this as any).state?.[key],
                  instanceValue: (this as any)[key],
                }
              });
            }
          }
        } catch (e) { console.error(`[connectedCallback] Error reconciling property '${key}':`, e); }
      }
    } catch (e) { console.error('[connectedCallback] Error in reconciliation:', e); }

    this.onInit();
    this.syncBindings();

    shadow.innerHTML = shadow.innerHTML.replaceAll(/\(click\)/g, "data-click");
    shadow.innerHTML = shadow.innerHTML.replaceAll(/\(value\)/g, "data-value");

    // After rewriting innerHTML, previously applied text bindings are lost. Re-sync now.
    try {
      this.syncBindings();
    } catch {}

    // wire event and value listeners for current DOM (including clones created later)
    try {
      this.wireInteractions();
    } catch (e) {
      console.error("wireInteractions error", e);
    }

    // handle simple structural directives like *if and *for
    try {
      const all = shadow.querySelectorAll("*");
      for (const el of Array.from(all)) {
        // find attributes that start with '*'
        for (const a of Array.from(el.attributes)) {
          if (!a.name.startsWith("*")) continue;
          const directive = a.name.slice(1); // e.g. 'if' or 'for'
          const expr = (a.value || "").trim();

          if (directive === "if") {
            // store expression for later re-evaluation
            el.setAttribute("data-if-expression", expr);
            // remove the '*' attribute so it doesn't appear in the shadow DOM
            el.removeAttribute(a.name);

            let show = false;
            try {
              if (expr.endsWith("()")) {
                const fnName = expr.replace(/\(\)$/, "");
                if (
                  getExposedMethods(this).has(fnName) &&
                  typeof (this as any)[fnName] === "function"
                ) {
                  try {
                    show = !!(this as any)[fnName].call(this);
                  } catch (e) {
                    show = false;
                  }
                }
              } else if (expr) {
                if (
                  (this as any).state &&
                  Object.prototype.hasOwnProperty.call(
                    (this as any).state,
                    expr
                  )
                ) {
                  show = !!(this as any).state[expr];
                } else if (
                  getExposedMethods(this).has(expr) &&
                  typeof (this as any)[expr] === "function"
                ) {
                  try {
                    show = !!(this as any)[expr].call(this);
                  } catch (e) {
                    show = false;
                  }
                }
              }
            } catch (e) {
              show = false;
            }

            (el as HTMLElement).style.display = show ? "" : "none";
          }

          if (directive === "for") {
            // parse expressions like: "let item of items" or "item of items"
            const m = expr.match(
              /^(?:let\s+)?([a-zA-Z0-9_\$]+)\s+of\s+([a-zA-Z0-9_\.\$]+)\s*$/
            );
            if (!m) {
              // keep attribute for later or fail silently
              el.setAttribute("data-for-expression", expr);
              el.removeAttribute(a.name);
              continue;
            }

            const itemName = m[1];
            const collectionName = m[2];

            // mark the element as a template for the for-loop
            const uid = `for-${Math.random().toString(36).slice(2, 9)}`;
            el.setAttribute("data-for-expression", expr);
            el.setAttribute("data-for-item", itemName);
            el.setAttribute("data-for-collection", collectionName);
            el.setAttribute("data-for-id", uid);
            // hide the template node from rendering (will be replaced by clones)
            try {
              (el as HTMLElement).style.display = "none";
            } catch (e) {
              /* ignore */
            }
            // remove the '*' attribute so it doesn't appear in the shadow DOM
            el.removeAttribute(a.name);
          }
        }
      }
    } catch (e) {
      console.error("error processing directives in connectedCallback", e);
    }

    // after registering directives (like data-for-expression), evaluate them to render initial state
    try {
      this.evaluateDirectives();
    } catch (e) {}
  }

  // attach click/value listeners for elements; idempotent (marks nodes with data-listener-attached)
  private wireInteractions(): void {
    const shadow = this.shadowRoot;
    if (!shadow) return;

    // click handlers
    const eventSelectors = this.selectAll("[data-click]");
    for (const eventSelector of Array.from(eventSelectors)) {
      const el = eventSelector as HTMLElement;
      // don't attach listeners to *for template nodes; they should act as templates only
      if (el.hasAttribute("data-for-expression")) continue;
      if (el.getAttribute("data-listener-attached") === "true") continue;
      el.addEventListener("click", (e: Event) => {
        const target = e.currentTarget as HTMLElement;
        const callback = target.getAttribute("data-click") || "";
        const m = callback.match(/^\s*([a-zA-Z0-9_\$]+)\s*(?:\((.*)\))?\s*$/);
        if (!m) {
          try {
            console.warn("could not parse callback", callback);
          } catch (e) {}
          this.syncBindings();
          return;
        }
        const name = m[1];
        const argsRaw = m[2];
        // Only allow explicitly exposed methods
        let fn: any = null;
        if (
          getExposedMethods(this).has(name) &&
          typeof (this as any)[name] === "function"
        ) {
          fn = (this as any)[name];
        }
        if (typeof fn === "function") {
          let args: any[] = [];
          // prefer actual JS values attached during clone time
          try {
            if (
              (target as any).__forArgs &&
              Array.isArray((target as any).__forArgs)
            ) {
              args = (target as any).__forArgs;
            }
          } catch (e) {}
          if (!args.length && argsRaw && argsRaw.length > 0) {
            try {
              args = argsRaw
                .split(",")
                .map((a) => a.trim())
                .map((a) => {
                  // parse simple literal strings or numbers, or lookup state property
                  if (/^\'([^]*)\'$/.test(a) || /^\"([^]*)\"$/.test(a)) {
                    return a.replace(/^\"|\"$/g, "").replace(/^\'|\'$/g, "");
                  }
                  if (/^-?\d+(?:\.\d+)?$/.test(a)) return Number(a);
                  // fallback: try state lookup
                  try {
                    if (
                      (this as any).state &&
                      Object.prototype.hasOwnProperty.call(
                        (this as any).state,
                        a
                      )
                    )
                      return (this as any).state[a];
                  } catch (e) {}
                  return a;
                });
            } catch (e) {
              args = [];
            }
          }
          try {
            (fn as any).apply(this, args);
          } catch (err) {
            console.error("binding error", err);
          }
        } else {
          try {
            console.warn("exposed method not found:", name);
          } catch (e) {}
        }
        this.syncBindings();
      });
      el.setAttribute("data-listener-attached", "true");
    }

    // value bindings
    const valueSelectors = this.selectAll("[data-value]");
    for (const event of Array.from(valueSelectors)) {
      const el = event as HTMLElement;
      if (el.getAttribute("data-listener-attached") === "true") continue;
      const attrBindProperty = el.getAttribute("data-value");
      if (!attrBindProperty) continue;
      try {
        // Prefer value from state; if absent, read from the component property (e.g., @StateProperty)
        let current: any;
        if (Object.prototype.hasOwnProperty.call(this.state, attrBindProperty)) {
          current = (this.state as any)[attrBindProperty];
        } else {
          try { current = (this as any)[attrBindProperty]; } catch { current = undefined; }
        }
        // set both the attribute and the live property when possible
        try { el.setAttribute("value", current != null ? String(current) : ""); } catch {}
        try {
          const anyEl: any = el as any;
          if ("value" in anyEl) anyEl.value = current != null ? String(current) : "";
        } catch {}
      } catch (e) {}
      // keep keyup for compatibility, but also listen to input/change for reliability
      const updateFrom = (ev: Event) => {
        const target = ev.currentTarget as HTMLInputElement;
        this.setState(attrBindProperty, (target as any).value);
      };
      el.addEventListener("keyup", updateFrom);
      el.addEventListener("input", updateFrom);
      el.addEventListener("change", updateFrom);
      el.setAttribute("data-listener-attached", "true");
    }
  }

  public onInit(): void {
    // add some initial code
  }

  private syncBindings(): void {
    const bindSelectors = this.selectAll("[data-bind]");
    for (const selector of Array.from(bindSelectors)) {
      const attr = selector.attributes.getNamedItem("data-bind");
      if (!attr) continue;
      const bindName = attr.value;
      if (this.state.hasOwnProperty(bindName)) {
        this.updateBindings(bindName, this.state[bindName]);
        continue;
      }
      // Fallback: read direct/decorated property value
      try {
        const direct = (this as any)[bindName];
        if (direct !== undefined) {
          this.updateBindings(bindName, direct);
        }
      } catch (e) {}
    }
    // re-evaluate structural directives (e.g. *if) after bindings update
    try {
      this.evaluateDirectives();
    } catch (e) {}
  }

  private initTemplate(): void {
    const renderer = this.getPreRenderedTemplate();
    this.attachShadow({ mode: "open" });
    if (this.shadowRoot)
      this.shadowRoot.appendChild(renderer.template.content.cloneNode(true));
    
    // Clean up slot elements from the host after processing
    this.cleanupSlotElements();
    
    this.__rendered = true;
    try {
      this.syncBindings();
    } catch {}
  }

  // Template module for rendering. Subclasses can override or use @Component decorator to inject it.
  get template(): any {
    // Prefer dynamically loaded module if present
    if (this.__tmplModule) return this.__tmplModule;
    return { default: "" };
  }

  get styleSheet(): string {
    if (this.__styleText != null) return this.__styleText;
    return "";
  }

  // Legacy binding getter removed; use @Expose on methods to make them callable from templates.

  static get observedAttributes() {
    return this.observedAttributes;
  }

  setState(name: string, value: unknown): void {
    // Reflect into the state bag so bindings read the latest value
    (this.state as any)[name] = value as any;

    // If decorated, also try writing via the property to trigger any decorator hooks
    const decorated = getDecoratedStateProps(this).has(name);
    if (decorated) {
      try {
        (this as any)[name] = value as any;
      } catch {
        // ignore; state already updated above
      }
    }

    try {
      this.updateBindings(name, value);
    } catch {}
    try {
      this.evaluateDirectives();
    } catch {}
  // Ensure full refresh for any missed nodes or freshly inserted DOM
  try { (this as any).syncBindings?.(); } catch {}
  try { queueMicrotask?.(() => { try { (this as any).syncBindings?.(); } catch {} }); } catch {}
  try { requestAnimationFrame?.(() => { try { (this as any).syncBindings?.(); } catch {} }); } catch {}
  }

  private setDefaultInputs(template: string): string {
    const regex = /\[\[\s?([a-zA-Z0-9\-\_]+)\s?\]\]/g;

    const raw = [...template.matchAll(regex)];
    const hostText = this.textContent ? this.textContent.trim() : "";
    
    // Get slot properties from the class decorator
    const slotProps = getDecoratedSlotProps(this);
    const slotPropsMap = new Map<string, string>();
    
    for (const slotProp of slotProps) {
      slotPropsMap.set(slotProp.name, slotProp.defaultValue || "");
    }
    
    // Extract slot content from the host element
    const slotContentMap = this.extractSlotContent();
    
    const matches = raw.map((m) => {
      const inputName = (m[1] || "").trim();
      
      let variable = "";
      
      // 1. First priority: Check for slot content (HTML slots)
      if (slotContentMap.has(inputName)) {
        variable = slotContentMap.get(inputName) || "";
      }
      // 2. Second priority: Check if user provided attribute
      else if (this.getAttribute(inputName) !== null) {
        variable = this.getAttribute(inputName) || "";
      }
      // 3. Third priority: For 'name' slot, use host text if available
      else if (inputName === "name" && hostText.length > 0) {
        variable = hostText;
      }
      // 4. Fourth priority: Use default value from @SlotProperty decorator
      else if (slotPropsMap.has(inputName)) {
        variable = slotPropsMap.get(inputName) || "";
      }
      // 5. Fallback: empty string (backward compatibility)
      else {
        variable = "";
      }
      
      return {
        match: m[0],
        variable,
      };
    });

    for (const match of matches) {
      template = template.replaceAll(match.match, `${match.variable}`);
    }

    return template;
  }

  private extractSlotContent(): Map<string, string> {
    const slotContentMap = new Map<string, string>();
    
    // Find all slot elements in the host element
    const slots = this.querySelectorAll('slot[name]');
    
    for (const slotElement of Array.from(slots)) {
      const slotName = slotElement.getAttribute('name');
      if (slotName) {
        // Get the innerHTML of the slot element
        const content = slotElement.innerHTML.trim();
        slotContentMap.set(slotName, content);
      }
    }
    
    // Also check for unnamed slot content (fallback to textContent for 'name' slot)
    const unnamedSlots = this.querySelectorAll('slot:not([name])');
    if (unnamedSlots.length > 0) {
      const content = unnamedSlots[0].innerHTML.trim();
      if (content) {
        slotContentMap.set('name', content); // Default to 'name' slot
      }
    }
    
    return slotContentMap;
  }

  private cleanupSlotElements(): void {
    // Remove all slot elements from the host after they've been processed
    const slots = this.querySelectorAll('slot');
    for (const slot of Array.from(slots)) {
      slot.remove();
    }
  }

  private getPreRenderedTemplate(): {
    template: HTMLTemplateElement;
    matches: { match: string; variable: string }[];
  } {
    const template = document.createElement("template");

    const renderStyleSheet = `<style>${this.styleSheet}</style>`;
    let renderTemplate = renderStyleSheet + this.template.default;

    renderTemplate = this.setDefaultInputs(renderTemplate);

    // extract simple properties
    const regex = /\{\{\s?([a-zA-Z0-9\-\_\.]+)\s?\}\}/g;
    const raw = [...renderTemplate.matchAll(regex)];
    const matches: { match: string; variable: string }[] = raw.map((m) => ({
      match: m[0],
      variable: (m[1] || "").trim(),
    }));

    for (const match of matches) {
      renderTemplate = renderTemplate.replaceAll(
        match.match,
        `<span data-bind="${match.variable}"></span>`
      );
    }

    template.innerHTML = renderTemplate;

    try {
      /* pre-render debug removed */
    } catch (e) {}

    return { template, matches };
  }

  // Re-evaluate structural directives stored on elements (e.g. data-if-expression)
  private evaluateDirectives(): void {
    const shadow = this.shadowRoot;
    if (!shadow) return;

    try {
      // handle *if
      const ifElems = shadow.querySelectorAll("[data-if-expression]");
      for (const el of Array.from(ifElems)) {
        const expr = el.getAttribute("data-if-expression") || "";
        let show = false;
        try {
          if (expr.endsWith("()")) {
            const fnName = expr.replace(/\(\)$/, "");
            if (
              getExposedMethods(this).has(fnName) &&
              typeof (this as any)[fnName] === "function"
            ) {
              try {
                show = !!(this as any)[fnName].call(this);
              } catch (e) {
                show = false;
              }
            }
          } else if (expr) {
            if (
              (this as any).state &&
              Object.prototype.hasOwnProperty.call((this as any).state, expr)
            ) {
              show = !!(this as any).state[expr];
            } else if (
              getExposedMethods(this).has(expr) &&
              typeof (this as any)[expr] === "function"
            ) {
              try {
                show = !!(this as any)[expr].call(this);
              } catch (e) {
                show = false;
              }
            }
          }
        } catch (e) {
          show = false;
        }

        (el as HTMLElement).style.display = show ? "" : "none";
      }

      // handle *for: find template nodes with data-for-expression
      const forTemplates = shadow.querySelectorAll("[data-for-expression]");
      for (const tpl of Array.from(forTemplates)) {
        const expr = tpl.getAttribute("data-for-expression") || "";
        const itemName = tpl.getAttribute("data-for-item") || "item";
        const collectionName = tpl.getAttribute("data-for-collection") || "";
        const forId = tpl.getAttribute("data-for-id") || "";

        // remove previously generated nodes for this template (marked with data-for-parent)
        if (forId) {
          const prev = shadow.querySelectorAll(`[data-for-parent="${forId}"]`);
          for (const p of Array.from(prev)) {
            p.remove();
          }
        }

        // resolve collection value from state or component property
        let collection: any[] = [];
        try {
          if (
            (this as any).state &&
            Object.prototype.hasOwnProperty.call(
              (this as any).state,
              collectionName
            )
          ) {
            collection = (this as any).state[collectionName] || [];
          } else {
            // support dotted paths like obj.items
            const parts = collectionName.split(".");
            let cur: any = this;
            for (const p of parts) {
              if (cur == null) {
                cur = undefined;
                break;
              }
              cur = cur[p];
            }
            collection = cur || [];
          }
        } catch (e) {
          collection = [];
        }

        if (!Array.isArray(collection)) continue;

        // insert clones before the template node
        for (let i = 0; i < collection.length; i++) {
          const item = collection[i];

          try {
            // clone the template node and perform targeted replacements on the clone
            const clone = tpl.cloneNode(true) as HTMLElement;
            clone.setAttribute("data-for-parent", forId);
            // remove template-specific attrs from the clone
            clone.removeAttribute("data-for-expression");
            clone.removeAttribute("data-for-item");
            clone.removeAttribute("data-for-collection");
            clone.removeAttribute("data-for-id");
            try {
              clone.style.display = "";
            } catch (e) {}

            // prepare a literal for attribute substitution (e.g. removeItem('Item 1'))
            let literal = "";
            if (item === null || item === undefined) literal = "''";
            else if (typeof item === "string") {
              const esc = String(item)
                .replace(/\\/g, "\\\\")
                .replace(/'/g, "\\'");
              literal = `'${esc}'`;
            } else if (typeof item === "number" || typeof item === "boolean") {
              literal = String(item);
            } else {
              literal = `'${JSON.stringify(item)
                .replace(/\\/g, "\\\\")
                .replace(/'/g, "\\'")}'`;
            }

            // walk clone and update attributes and text nodes
            const nodes = [
              clone,
              ...Array.from(clone.querySelectorAll("*")),
            ] as Element[];

            for (const node of nodes) {
              // attributes: replace loop variable occurrences safely inside attribute values
              for (const attr of Array.from(node.attributes)) {
                try {
                  const name = attr.name;
                  let val = attr.value;
                  // handle data-bind specially: if it's the loop var or loop.var, populate text
                  if (name === "data-bind") {
                    if (val === itemName) {
                      (node as HTMLElement).textContent =
                        item !== undefined && item !== null ? String(item) : "";
                      continue;
                    } else if (val.startsWith(itemName + ".")) {
                      const prop = val.slice(itemName.length + 1);
                      try {
                        (node as HTMLElement).textContent =
                          (item as any)[prop] ?? "";
                      } catch (e) {
                        (node as HTMLElement).textContent = "";
                      }
                      continue;
                    }
                  }

                  // replace mustache-like bindings in attribute values if present
                  const mustAttrRegex = new RegExp(
                    `\\{\\{\\s*${itemName}(?:\\.[a-zA-Z0-9_\\$]+)?\\s*\\}\\}`,
                    "g"
                  );
                  if (mustAttrRegex.test(val)) {
                    val = val.replace(
                      mustAttrRegex,
                      String(item != null ? item : "")
                    );
                  }

                  // detect references to the loop variable inside attribute values (e.g. item or item.prop)
                  const varRefRegex = new RegExp(
                    `\\b${itemName}(?:\\.([a-zA-Z0-9_\\$]+))?\\b`
                  );
                  const vr = val.match(varRefRegex);
                  if (vr) {
                    try {
                      const prop = vr[1];
                      (node as any).__forArgs = [
                        prop ? (item as any)[prop] : item,
                      ];
                    } catch (e) {
                      (node as any).__forArgs = [item];
                    }
                  }

                  if (val !== attr.value) node.setAttribute(name, val);
                } catch (e) {
                  /* ignore per-attr errors */
                }
              }

              // text nodes: replace mustache bindings like {{ item }} or {{ item.prop }}
              for (const child of Array.from(node.childNodes)) {
                if (child.nodeType === Node.TEXT_NODE) {
                  const text = child.textContent || "";
                  const regex = /\{\{\s*([a-zA-Z0-9_\.\$]+)\s*\}\}/g;
                  const replaced = text.replace(
                    regex,
                    (match: string, varName: string) => {
                      if (varName === itemName)
                        return String(item != null ? item : "");
                      if (varName.startsWith(itemName + ".")) {
                        const prop = varName.slice(itemName.length + 1);
                        try {
                          return (item as any)[prop] !== undefined &&
                            (item as any)[prop] !== null
                            ? String((item as any)[prop])
                            : "";
                        } catch (e) {
                          return "";
                        }
                      }
                      return match;
                    }
                  );
                  if (replaced !== text) child.textContent = replaced;
                }
              }
            }

            // ensure cloned subtree does not inherit listener-attached markers
            try {
              const marked = clone.querySelectorAll("[data-listener-attached]");
              for (const m of Array.from(marked)) {
                m.removeAttribute("data-listener-attached");
              }
              if (clone.hasAttribute("data-listener-attached"))
                clone.removeAttribute("data-listener-attached");
            } catch (e) {}

            tpl.parentNode?.insertBefore(clone, tpl);
          } catch (e) {
            // skip rendering this item on error
          }
        }
      }
    } catch (e) {
      console.error("evaluateDirectives error", e);
    }

    // after rendering clones, wire interactions for elements that may have been added
    try {
      this.wireInteractions();
    } catch (e) {
      console.error("wireInteractions error", e);
    }
  }

  updateBindings(prop: string, value: unknown = ""): void {
    // Only update exact matches (data-bind="prop") or nested paths starting with prop.
    // Using ends-with caused collisions like updating submittedName when prop was name.
    const bindings = Array.from(
      this.selectAll(`[data-bind="${prop}"],[data-bind^="${prop}."]`)
    ) as Element[];

    bindings.forEach((node) => {
      const dataProp = node.getAttribute("data-bind") || "";
      if (!dataProp) return;
      let bindValue: any = value;
      if (dataProp.includes(".")) {
        try {
          const parts = dataProp.split(".");
          bindValue = parts
            .slice(1)
            .reduce(
              (obj: any, p: string) => (obj ? obj[p] : undefined),
              value as any
            );
        } catch (e) {
          bindValue = value;
        }
      }
      (node as HTMLElement).textContent =
        bindValue !== undefined && bindValue !== null ? String(bindValue) : "";
    });

    // Also propagate to inputs bound with data-value for true two-way syncing
    try {
      const valueNodes = Array.from(this.selectAll(`[data-value="${prop}"]`));
      for (const node of valueNodes) {
        try { node.setAttribute("value", value != null ? String(value) : ""); } catch {}
        try {
          const anyEl: any = node as any;
          if ("value" in anyEl) anyEl.value = value != null ? String(value) : "";
        } catch {}
      }
    } catch {}
  }

  /**
   * Find a child component or element inside this component.
   * - If `selectorOrId` is an id (like "demoModal" or "#demoModal"), it prefers getElementById on the shadow root.
   * - Falls back to querySelector / querySelectorAll on shadow root then host if not found.
   * Returns typed element or null.
   */
  public getComponent<T extends Element = Element>(
    selectorOrId: string
  ): T | null {
    if (!selectorOrId) return null;

    const shadow = (this as any).shadowRoot as ShadowRoot | null;
    const isHash = selectorOrId.startsWith("#");
    const id = isHash ? selectorOrId.slice(1) : selectorOrId;

    // prefer id lookup in shadow root when possible
    if (shadow) {
      try {
        const byId = shadow.getElementById(id) as unknown as T | null;
        if (byId) return byId;
      } catch (e) {
        // ignore and continue
      }

      const byQuery = shadow.querySelector(selectorOrId) as unknown as T | null;
      if (byQuery) return byQuery;

      const all = shadow.querySelectorAll(selectorOrId);
      if (all && all.length > 0) return all[0] as unknown as T;
    }

    // fallback to light DOM searches
    try {
      if (isHash) {
        const hostById = this.querySelector(`#${id}`) as unknown as T | null;
        if (hostById) return hostById;
      }
    } catch (e) {}

    const hostQuery = this.querySelector(selectorOrId) as unknown as T | null;
    if (hostQuery) return hostQuery;

    const hostAll = this.querySelectorAll(selectorOrId);
    if (hostAll && hostAll.length > 0) return hostAll[0] as unknown as T;

    return null;
  }

  selectAll<E extends Element = Element>(selector: string): NodeListOf<E> {
    return this.shadowRoot
      ? this.shadowRoot.querySelectorAll(selector)
      : this.querySelectorAll(selector);
  }
}
