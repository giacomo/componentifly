// A lightweight property decorator to mark component fields as state-backed.
// It keeps the instance property and this.state[property] in sync and triggers UI updates.
// Usage: @StateProperty items: string[] = ["Item 1"]; 
const STATE_PROPS_KEY = Symbol.for("__stateProps");

export function StateProperty(...args: any[]): any {
  // Support both legacy (experimentalDecorators) and new decorators.
  // Legacy: (target, propertyKey)
  if (typeof args[0] === "object" && (typeof args[1] === "string" || typeof args[1] === "symbol") && args.length === 2) {
    const target = args[0];
    const propertyKey = String(args[1]);

    const ctor = target.constructor as any;
    if (!ctor[STATE_PROPS_KEY]) ctor[STATE_PROPS_KEY] = new Set<string>();
    (ctor[STATE_PROPS_KEY] as Set<string>).add(propertyKey);

    const storageKey = Symbol(`__state_${String(propertyKey)}`);
    Object.defineProperty(target, propertyKey, {
      configurable: true,
      enumerable: true,
      get: function () {
        if (Object.prototype.hasOwnProperty.call(this, storageKey)) {
          return (this as any)[storageKey];
        }
        try {
          if (this && this.state && Object.prototype.hasOwnProperty.call(this.state, propertyKey)) {
            return this.state[propertyKey];
          }
        } catch {}
        return undefined;
      },
      set: function (value: any) {
        (this as any)[storageKey] = value;
        try {
          if (!this.state || typeof this.state !== "object") this.state = {} as any;
          this.state[propertyKey] = value;
        } catch {}
        try { if (typeof this.updateBindings === "function") this.updateBindings(propertyKey, value); } catch {}
        try { if (typeof (this as any).evaluateDirectives === "function") (this as any).evaluateDirectives(); } catch {}
      },
    });
    return;
  }

  // New TC39 decorators: (initialValue, context)
  const initialValue = args[0];
  const context = args[1] || {};
  if (context && typeof context === "object" && "kind" in context) {
    const key = String((context as any).name);
    const storageKey = Symbol(`__state_${String(key)}`);

    (context as any).addInitializer?.(function (this: any) {
      const ctor = this.constructor as any;
      if (!ctor[STATE_PROPS_KEY]) ctor[STATE_PROPS_KEY] = new Set<string>();
      (ctor[STATE_PROPS_KEY] as Set<string>).add(key);

      Object.defineProperty(this, key, {
        configurable: true,
        enumerable: true,
        get: function () {
          if (Object.prototype.hasOwnProperty.call(this, storageKey)) {
            return (this as any)[storageKey];
          }
          try {
            if (this && this.state && Object.prototype.hasOwnProperty.call(this.state, key)) {
              return this.state[key];
            }
          } catch {}
          return undefined;
        },
        set: function (value: any) {
          (this as any)[storageKey] = value;
          try {
            if (!this.state || typeof this.state !== "object") this.state = {} as any;
            this.state[key] = value;
          } catch {}
          try { if (typeof this.updateBindings === "function") this.updateBindings(key, value); } catch {}
          try { if (typeof (this as any).evaluateDirectives === "function") (this as any).evaluateDirectives(); } catch {}
        },
      });

      // Seed initial value through the setter to trigger updates
      try {
        (this as any)[key] = initialValue;
      } catch {}
    });

    // Return nothing to keep original initializer; our addInitializer sets value
    return undefined;
  }
}

// Helper to read the set of decorated state properties from a component instance/ctor.
export function getDecoratedStateProps(instanceOrCtor: any): Set<string> {
  const ctor = typeof instanceOrCtor === "function" ? instanceOrCtor : instanceOrCtor?.constructor;
  const set = (ctor && ctor[STATE_PROPS_KEY]) as Set<string> | undefined;
  return new Set<string>(set ? Array.from(set) : []);
}
