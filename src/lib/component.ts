import { StateType } from "./state-type";
import { getDecoratedStateProps } from "./state.decorator";
import { getExposedMethods } from "./expose.decorator";

export abstract class Component extends HTMLElement {
  public state: StateType = {};
  public inputAttributes = [];
  private __rendered = false;
  private __tmplModule: any | null = null;
  private __styleText: string | null = null;

  constructor() {
    super();
    // Initialize state bag early
    if (!this.state) this.state = {} as any;

    // Seed state with any @StateProperty defaults already set on the instance
    try {
      const props = Array.from(getDecoratedStateProps(this));
      for (const key of props) {
        // If the instance has an own property value (assigned by field initializer), reflect it into state
        const val = (this as any)[key];
        (this.state as any)[key] = val;
      }
    } catch {}

    // If a decorator provided async assets, wait briefly before initializing template
    // Kick off template init; can be async if decorator provided paths
    void this.ensureTemplate();
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

    this.onInit();
    this.syncBindings();

    shadow.innerHTML = shadow.innerHTML.replaceAll(/\(click\)/g, "data-click");
    shadow.innerHTML = shadow.innerHTML.replaceAll(/\(value\)/g, "data-value");

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
      if (this.state.hasOwnProperty(attrBindProperty)) {
        try {
          el.setAttribute(
            "value",
            (this.state as any)[attrBindProperty].toString()
          );
        } catch (e) {}
        el.addEventListener("keyup", (e: Event) => {
          const target = e.currentTarget as HTMLInputElement;
          this.setState(attrBindProperty, target.value);
        });
        el.setAttribute("data-listener-attached", "true");
      }
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
    // Allow setting if it's a known state key or a decorated property
    const known =
      this.state && Object.prototype.hasOwnProperty.call(this.state, name);
    const decorated = getDecoratedStateProps(this).has(name);
    if (!known && !decorated) return;

    (this.state as any)[name] = value as any;
    try {
      this.updateBindings(name, value);
    } catch {}
    try {
      this.evaluateDirectives();
    } catch {}
  }

  private setDefaultInputs(template: string): string {
    const regex = /\[\[\s?([a-zA-Z0-9\-\_]+)\s?\]\]/g;

    const raw = [...template.matchAll(regex)];
    const hostText = this.textContent ? this.textContent.trim() : "";
    const matches = raw.map((m) => {
      const inputName = (m[1] || "").trim();
      // prefer host text for the common `name` input so users can write <ao-button>Label</ao-button>
      const variable =
        inputName === "name" && hostText.length > 0
          ? hostText
          : this.getAttribute(inputName) ?? "";
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
    const bindings = Array.from(
      this.selectAll(`[data-bind$="${prop}"]`)
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
