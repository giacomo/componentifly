import { StateType } from "./state-type";
import { getDecoratedStateProps } from "./state.decorator";
import { getDecoratedSlotProps } from "./slot.decorator";
import { getExposedMethods } from "./expose.decorator";
import { getDecoratedInputProps } from "./input.decorator";

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
                try { (this as any).updateAllFunctionBindings?.(); } catch {}
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
                    try { (this as any).updateAllFunctionBindings?.(); } catch {}
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

    // Process input properties from HTML attributes
    try {
      this.processInputPropertiesFromAttributes();
    } catch (e) { console.error('[connectedCallback] Error processing input properties:', e); }

    this.onInit();
    this.syncBindings();

  // Safely rewrite Angular-like attributes (click)/(value) to data-* without nuking existing nodes
  try { this.rewriteTemplateEventAttributes(); } catch {}

    // After rewriting innerHTML, previously applied text bindings are lost. Re-sync now.
    try {
      this.syncBindings();
    } catch {}

  // Fill any residual single-mustache text nodes that escaped preprocessing
  try { this.fillResidualMustachesTextNodes(); } catch {}

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

  // Traverse shadow DOM and rename attributes like (click) or (value) to data-click/data-value
  private rewriteTemplateEventAttributes(): void {
    const root = this.shadowRoot;
    if (!root) return;
    const all = root.querySelectorAll('*');
    for (const el of Array.from(all)) {
      const attrs = Array.from(el.attributes);
      for (const a of attrs) {
        const m = a.name.match(/^\(([^)]+)\)$/);
        if (!m) continue;
        const name = m[1];
        const val = a.value ?? '';
        try { el.setAttribute(`data-${name}`, val); } catch {}
        try { el.removeAttribute(a.name); } catch {}
      }
    }
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

    // Handle function bindings
    const functionBindSelectors = this.selectAll("[data-bind-function]");
    for (const selector of Array.from(functionBindSelectors)) {
      const attr = selector.attributes.getNamedItem("data-bind-function");
      if (!attr) continue;
      const fnName = attr.value;
      this.updateFunctionBinding(fnName, selector as HTMLElement);
    }

    // re-evaluate structural directives (e.g. *if) after bindings update
    try {
      this.evaluateDirectives();
    } catch (e) {}

    // Update any attribute-based mustache templates
    try {
      this.updateAttributeBindings();
    } catch {}

  // Final pass: evaluate any residual single-mustache text nodes
  try { this.fillResidualMustachesTextNodes(); } catch {}
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
    
    // Update all function bindings since they might depend on this state change
    try {
      this.updateAllFunctionBindings();
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

    // Assign HTML first, then walk DOM to safely transform text-node mustaches
    // and record attribute templates without corrupting markup.
    template.innerHTML = renderTemplate;
    try {
      this.preprocessTemplateBindings(template);
    } catch {}

    try {
      /* pre-render debug removed */
    } catch (e) {}

    // matches are not used downstream anymore; return an empty list for compatibility
    return { template, matches: [] };
  }

  // Walk the template DOM to:
  // - Convert text-node {{ expr }} into span binding nodes
  // - Detect attribute values with {{ expr }} and store their templates on data-attrs
  private preprocessTemplateBindings(template: HTMLTemplateElement): void {
    const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    const mustache = /\{\{\s*([^}]+)\s*\}\}/g;

    const processTextNode = (textNode: Text) => {
      const text = textNode.textContent ?? "";
      if (!mustache.test(text)) return;
      mustache.lastIndex = 0; // reset

      // If the entire text node is a single mustache, prefer binding on the parent element itself.
      const singleRe = /^\s*\{\{\s*([^}]+)\s*\}\}\s*$/;
      const single = text.match(singleRe);
      const parentEl = textNode.parentElement as HTMLElement | null;
      if (single && parentEl) {
        const exprRaw = (single[1] || '').trim();
        if (exprRaw.endsWith('()')) {
          const fnName = exprRaw.replace(/\(\)$/, '');
          parentEl.setAttribute('data-bind-function', fnName);
        } else {
          parentEl.setAttribute('data-bind', exprRaw);
        }
        // Clear existing content; parent will be populated by syncBindings/updateAllFunctionBindings
        parentEl.textContent = '';
        textNode.remove();
        return;
      }

      const frag = document.createDocumentFragment();
      let lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = mustache.exec(text)) !== null) {
        const before = text.slice(lastIndex, m.index);
        if (before) frag.appendChild(document.createTextNode(before));
        const exprRaw = (m[1] || "").trim();
        if (exprRaw.endsWith("()")) {
          const fnName = exprRaw.replace(/\(\)$/, "");
          const span = document.createElement("span");
          span.setAttribute("data-bind-function", fnName);
          frag.appendChild(span);
        } else {
          const span = document.createElement("span");
          span.setAttribute("data-bind", exprRaw);
          frag.appendChild(span);
        }
        lastIndex = (m.index ?? 0) + (m[0]?.length ?? 0);
      }
      const after = text.slice(lastIndex);
      if (after) frag.appendChild(document.createTextNode(after));
      textNode.replaceWith(frag);
    };

    const processElementAttributes = (el: Element) => {
      // Build list first; we'll modify during iteration
      const attrs = Array.from(el.attributes);
      const templatedKeys: string[] = [];
      for (const a of attrs) {
        const name = a.name;
        // Skip event-like attributes (click) and similar Angular-style inputs; those are handled elsewhere
        if (name.startsWith("(") && name.endsWith(")")) continue;
        const val = a.value ?? "";
        if (!mustache.test(val)) { mustache.lastIndex = 0; continue; }
        mustache.lastIndex = 0;
        // Store original template string and set initial static value (mustaches removed)
        const staticVal = val.replace(mustache, "").trim();
        try { el.setAttribute(name, staticVal); } catch {}
        try { el.setAttribute(`data-attr-template-${name}`, val); } catch {}
        templatedKeys.push(name);
      }
      if (templatedKeys.length) {
        try { el.setAttribute("data-attr-template-keys", templatedKeys.join(",")); } catch {}
      }
    };

    let node: Node | null = walker.currentNode;
    while (node) {
      if (node.nodeType === Node.TEXT_NODE) {
        processTextNode(node as Text);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        processElementAttributes(node as Element);
      }
      node = walker.nextNode();
    }
  }

  // Replace {{ expr }} inside recorded attribute templates using current state/props/functions
  private updateAttributeBindings(): void {
    const root: ParentNode | null = this.shadowRoot ?? this;
    if (!root) return;
    const els = root.querySelectorAll('[data-attr-template-keys]');
    for (const el of Array.from(els)) {
      const keysAttr = el.getAttribute('data-attr-template-keys') || '';
      if (!keysAttr) continue;
      const keys = keysAttr.split(',').map(k => k.trim()).filter(Boolean);
      for (const key of keys) {
        const tmpl = el.getAttribute(`data-attr-template-${key}`);
        if (!tmpl) continue;
        const evaluated = this.evaluateAttributeTemplate(tmpl);
        try { el.setAttribute(key, evaluated); } catch {}
        // Optionally reflect to the live property for common attributes like value
        try {
          const anyEl: any = el as any;
          if (key === 'value' && 'value' in anyEl) anyEl.value = evaluated;
        } catch {}
      }
    }
  }

  private evaluateAttributeTemplate(tmpl: string): string {
    const re = /\{\{\s*([^}]+)\s*\}\}/g;
    return tmpl.replace(re, (_match, g1) => {
      const expr = String(g1 || '').trim();
      try {
        // simple negation support (!var)
        if (expr.startsWith('!')) {
          const inner = expr.slice(1).trim();
          const v = this.lookupExpression(inner);
          return (!v ? 'true' : '');
        }
        // function call
        if (/^[_$a-zA-Z][_$a-zA-Z0-9]*\(\)$/.test(expr)) {
          const fnName = expr.replace(/\(\)$/, '');
          if (getExposedMethods(this).has(fnName) && typeof (this as any)[fnName] === 'function') {
            const out = (this as any)[fnName].call(this);
            return out != null ? String(out) : '';
          }
          return '';
        }
        // property/path lookup
        const v = this.lookupExpression(expr);
        return v != null ? String(v) : '';
      } catch {
        return '';
      }
    }).trim();
  }

  private lookupExpression(expr: string): any {
    const parts = expr.split('.');
    // Try state first
    let cur: any = this.state;
    for (const p of parts) {
      if (cur == null) break;
      cur = cur[p];
    }
    if (cur !== undefined) return cur;
    // Fallback to component instance path
    cur = this as any;
    for (const p of parts) {
      if (cur == null) break;
      cur = cur[p];
    }
    return cur;
  }

  // Fallback: evaluate leftover text nodes containing a single mustache and write the result
  private fillResidualMustachesTextNodes(): void {
    const root: ParentNode | null = this.shadowRoot ?? this;
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const singleRe = /^\s*\{\{\s*([^}]+)\s*\}\}\s*$/;
    let node = walker.currentNode as Text | null;
    while (node) {
      try {
        const txt = node.textContent ?? '';
        const m = txt.match(singleRe);
        const parent = node.parentElement as HTMLElement | null;
        if (!m || !parent) {
          node = walker.nextNode() as Text | null;
          continue;
        }
        if (parent.hasAttribute('data-bind') || parent.hasAttribute('data-bind-function')) {
          node = walker.nextNode() as Text | null;
          continue;
        }
        const exprRaw = (m[1] || '').trim();
        // Convert to real binding on the parent so future updates work automatically
        if (exprRaw.endsWith('()')) {
          const fnName = exprRaw.replace(/\(\)$/, '');
          parent.setAttribute('data-bind-function', fnName);
          parent.textContent = '';
          // immediate update
          this.updateFunctionBinding(fnName, parent);
        } else {
          parent.setAttribute('data-bind', exprRaw);
          parent.textContent = '';
          // try to get initial value from state/props
          let v: any;
          try { v = this.lookupExpression(exprRaw); } catch {}
          if (v !== undefined) parent.textContent = v != null ? String(v) : '';
        }
        // remove the original text node
        try { node.remove(); } catch {}
      } catch {}
      node = walker.nextNode() as Text | null;
    }
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

              // text nodes: replace mustache bindings like {{ item }} or {{ item.prop }} or {{ functionName() }}
              for (const child of Array.from(node.childNodes)) {
                if (child.nodeType === Node.TEXT_NODE) {
                  const text = child.textContent || "";
                  const regex = /\{\{\s*([a-zA-Z0-9_\.\$]+(?:\(\))?)\s*\}\}/g;
                  const replaced = text.replace(
                    regex,
                    (match: string, varName: string) => {
                      // Handle function calls
                      if (varName.endsWith("()")) {
                        const fnName = varName.replace(/\(\)$/, "");
                        if (
                          getExposedMethods(this).has(fnName) &&
                          typeof (this as any)[fnName] === "function"
                        ) {
                          try {
                            const result = (this as any)[fnName].call(this);
                            return result !== undefined && result !== null ? String(result) : "";
                          } catch (e) {
                            console.warn(`[evaluateDirectives] Error calling function '${fnName}':`, e);
                            return "";
                          }
                        } else {
                          console.warn(`[evaluateDirectives] Function '${fnName}' is not exposed or does not exist`);
                          return "";
                        }
                      }
                      
                      // Handle regular variable bindings
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

  // After structural changes, refresh attribute bindings as well
  try { this.updateAttributeBindings(); } catch {}
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

  private updateFunctionBinding(fnName: string, element: HTMLElement): void {
    try {
      // Only allow explicitly exposed methods
      if (
        getExposedMethods(this).has(fnName) &&
        typeof (this as any)[fnName] === "function"
      ) {
        try {
          const result = (this as any)[fnName].call(this);
          element.textContent = result !== undefined && result !== null ? String(result) : "";
        } catch (e) {
          element.textContent = "";
          console.warn(`[updateFunctionBinding] Error calling function '${fnName}':`, e);
        }
      } else {
        element.textContent = "";
        console.warn(`[updateFunctionBinding] Function '${fnName}' is not exposed or does not exist`);
      }
    } catch (e) {
      element.textContent = "";
      console.error(`[updateFunctionBinding] Error in updateFunctionBinding for '${fnName}':`, e);
    }
  }

  private updateAllFunctionBindings(): void {
    try {
      const functionBindSelectors = this.selectAll("[data-bind-function]");
      for (const selector of Array.from(functionBindSelectors)) {
        const attr = selector.attributes.getNamedItem("data-bind-function");
        if (!attr) continue;
        const fnName = attr.value;
        this.updateFunctionBinding(fnName, selector as HTMLElement);
      }
    } catch (e) {
      console.error("[updateAllFunctionBindings] Error updating function bindings:", e);
    }
  }

  /**
   * Attach this component to the DOM and return a promise that resolves when the component is done.
   * This is a generic method that handles the lifecycle of showing the component.
   */
  public async attach(): Promise<any> {
    // Append to body if not already attached
    if (!this.parentNode) {
      document.body.appendChild(this);
    }
    
    // Wait for the component to be connected and initialized
    if (!this.isConnected) {
      await new Promise(resolve => {
        const observer = new MutationObserver(() => {
          if (this.isConnected) {
            observer.disconnect();
            resolve(void 0);
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
      });
    }
    
    // Create a promise that will be resolved when detach is called
    return new Promise((resolve) => {
      (this as any).__attachResolve = resolve;
    });
  }

  /**
   * Remove this component from the DOM and resolve the attach promise.
   */
  public detach(result?: any): void {
    // Resolve the attach promise with the result
    if ((this as any).__attachResolve) {
      (this as any).__attachResolve(result || { action: 'cancel', data: {} });
      (this as any).__attachResolve = null;
    }
    
    // Remove from DOM
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  }

  /**
   * Create a new component instance dynamically.
   * The component will be created but not attached to the DOM automatically.
   * Returns the created component instance.
   */
  public createComponent<T extends Component>(
    ComponentClass: new () => T,
    initialData?: any
  ): T {
    // Get the selector from the component class
    const selector = (ComponentClass as any)[Symbol.for("__component_selector")] || 
                    (ComponentClass as any).selector || 
                    (ComponentClass as any).is;
    
    if (!selector) {
      throw new Error(`Component ${ComponentClass.name} does not have a selector defined. Use @ComponentDecorator with a selector.`);
    }

    // Create the component element using the custom element
    const component = document.createElement(selector) as T;
    
    // Set the data property if initialData is provided
    if (initialData && typeof initialData === 'object') {
      (component as any).data = initialData;
    }
    
    // Override onInit to be called with initialData when the component is connected
    if (initialData) {
      const originalOnInit = component.onInit;
      component.onInit = function() {
        // Call original onInit first
        originalOnInit.call(this);
        // Then call with initialData if it accepts parameters
        if (this.onInit.length > 0) {
          try {
            originalOnInit.call(this, initialData);
          } catch (e) {
            // If the override fails, try calling a custom onInitWithData method
            if (typeof (this as any).onInitWithData === 'function') {
              (this as any).onInitWithData(initialData);
            }
          }
        }
      };
    }
    
    return component;
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

  private processInputPropertiesFromAttributes(): void {
    try {
      const inputProps = getDecoratedInputProps(this);
      console.log('[processInputPropertiesFromAttributes] Processing input props for:', this.constructor.name, 'Properties:', Array.from(inputProps.keys()));
      
      if (inputProps.size === 0) {
        console.log('[processInputPropertiesFromAttributes] No input properties found');
        return;
      }
      
      // Store original attributes before template processing
      const originalAttributes = new Map<string, string>();
      for (const [propertyKey, config] of inputProps.entries()) {
        const attributeName = config.attributeName || propertyKey.toLowerCase();
        console.log(`[processInputPropertiesFromAttributes] Looking for property '${propertyKey}' with attribute name '${attributeName}'`);
        
        let found = false;
        let foundValue = '';
        let foundAttrName = '';
        
        // Try multiple attribute name formats:
        // 1. [propertyKey] (camelCase in brackets)
        // 2. [attributeName] (lowercase in brackets)  
        // 3. propertyKey (camelCase without brackets)
        // 4. attributeName (lowercase without brackets)
        
        const attrsToTry = [
          `[${propertyKey}]`,
          `[${attributeName}]`,
          propertyKey,
          attributeName
        ];
        
        for (const attrName of attrsToTry) {
          const attrValue = this.getAttribute(attrName);
          if (attrValue !== null) {
            console.log(`[processInputPropertiesFromAttributes] Found attribute '${attrName}' with value:`, attrValue.substring(0, 100) + '...');
            foundValue = attrValue;
            foundAttrName = attrName;
            found = true;
            break;
          }
        }
        
        if (found) {
          // Remove quotes if present and store the value
          const cleanValue = foundValue.replace(/^['"]|['"]$/g, '');
          
          // Store using both the property key and the attribute name as keys
          // so the getter can find it regardless of which it looks for
          originalAttributes.set(propertyKey, cleanValue);
          originalAttributes.set(attributeName, cleanValue);
          
          console.log('[processInputPropertiesFromAttributes] Cleaned and stored value:', cleanValue.substring(0, 100) + '...');
          
          // Remove the bracket attribute since we've processed it
          if (foundAttrName.startsWith('[') && foundAttrName.endsWith(']')) {
            this.removeAttribute(foundAttrName);
          }
        } else {
          console.log(`[processInputPropertiesFromAttributes] No attribute found for property '${propertyKey}'`);
        }
      }
      
      // Store original attributes on the component for later retrieval by property getters
      (this as any).__originalAttributes = originalAttributes;
      
      // Mark that we're initializing to prevent default values from overwriting
      (this as any).__initializingInputProps = true;
      
      // Initialize stored values with original attribute values
      for (const [propertyKey] of inputProps.entries()) {
        try {
          const originalValue = originalAttributes.get(propertyKey);
          if (originalValue !== undefined) {
            // Directly set the property to store the original value
            // This will trigger the setter but should not be blocked since it's a real value
            (this as any)[propertyKey] = originalValue;
          }
          
          // Manually trigger binding updates for input properties
          const currentValue = (this as any)[propertyKey];
          this.updateBindings(propertyKey, currentValue);
        } catch (e) {
          // Silent error handling
        }
      }
      
      // Clear the initialization flag
      (this as any).__initializingInputProps = false;
      
      // Also call the sync method if it exists
      try {
        if (typeof (this as any).syncInputPropertiesFromAttributes === "function") {
          (this as any).syncInputPropertiesFromAttributes();
        }
      } catch (e) {
        // Silent error handling
      }
    } catch (e) {
      console.error('[processInputPropertiesFromAttributes] Error:', e);
    }
  }
}
