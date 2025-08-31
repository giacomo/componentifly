// A lightweight property decorator to mark component fields as state-backed.
// It keeps the instance property and this.state[property] in sync and triggers UI updates.
// Usage: @StateProperty items: string[] = ["Item 1"];
const STATE_PROPS_KEY = Symbol.for("__stateProps");

export function StateProperty(...args: any[]): any {
  
  // Support both legacy (experimentalDecorators) and new decorators.
  // Legacy: (target, propertyKey) or (target, propertyKey, descriptor)
  if (
    typeof args[0] === "object" &&
    (typeof args[1] === "string" || typeof args[1] === "symbol") &&
    (args.length === 2 || args.length === 3)
  ) {
    const target = args[0];
    const propertyKey = String(args[1]);

    const ctor = target.constructor as any;
    if (!ctor[STATE_PROPS_KEY]) ctor[STATE_PROPS_KEY] = new Set<string>();
    (ctor[STATE_PROPS_KEY] as Set<string>).add(propertyKey);

    // Register the property for prototype accessor installation
    registerStatePropForClass(ctor, propertyKey);

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
            if (
              this &&
              this.state &&
              Object.prototype.hasOwnProperty.call(this.state, key)
            ) {
              console.debug('[StateProperty] Getting value:', {
                propertyKey: key,
                storageValue: (this as any)[storageKey],
                stateValue: this.state?.[key],
              });
              return this.state[key];
            }
          } catch {}
          return undefined;
        },
        set: function (value: any) {
          (this as any)[storageKey] = value;
          try {
            if (!this.state || typeof this.state !== "object")
              this.state = {} as any;
            this.state[key] = value;
          } catch {}
          try {
            if (typeof this.updateBindings === "function")
              this.updateBindings(key, value);
          } catch {}
          try {
            if (typeof (this as any).evaluateDirectives === "function")
              (this as any).evaluateDirectives();
          } catch {}
          try {
            if (typeof (this as any).syncBindings === "function")
              (this as any).syncBindings();
          } catch {}
          console.debug('[StateProperty] Setting value:', {
            propertyKey: key,
            newValue: value,
            stateBefore: this.state,
          });
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
  const ctor =
    typeof instanceOrCtor === "function"
      ? instanceOrCtor
      : instanceOrCtor?.constructor;
  const set = (ctor && ctor[STATE_PROPS_KEY]) as Set<string> | undefined;
  return new Set<string>(set ? Array.from(set) : []);
}

// Install accessor properties on the prototype for all decorated state properties.
export function installPrototypeStateAccessors(ctor: any) {
  if (!ctor) return;
  
  const props = getDecoratedStateProps(ctor);
  const proto = ctor.prototype;
  
  if (props.size === 0) return;
  
  for (const key of props) {
    const storageKey = Symbol(`__state_${String(key)}`);
    
    Object.defineProperty(proto, key, {
      configurable: true,
      enumerable: true,
      get: function () {
        // First check storage key
        if (Object.prototype.hasOwnProperty.call(this, storageKey)) {
          return (this as any)[storageKey];
        }
        
        // Then check state
        try {
          if (this && this.state && Object.prototype.hasOwnProperty.call(this.state, key)) {
            return this.state[key];
          }
        } catch {}
        
        return undefined;
      },
      set: function (value: any) {
        // Store in private storage
        (this as any)[storageKey] = value;
        
        // Update state
        try {
          if (!this.state || typeof this.state !== "object") {
            this.state = {} as any;
          }
          this.state[key] = value;
        } catch {}
        
        // Trigger updates
        try {
          if (typeof this.updateBindings === "function")
            this.updateBindings(key, value);
        } catch {}
        try {
          if (typeof (this as any).evaluateDirectives === "function")
            (this as any).evaluateDirectives();
        } catch {}
        try {
          if (typeof (this as any).syncBindings === "function")
            (this as any).syncBindings();
        } catch {}
      },
    });
  }
}

// Helper to register a state property for a class and ensure prototype accessors are installed.
function registerStatePropForClass(ctor: any, propertyKey: string) {
  if (!ctor || !propertyKey) return;

  // Ensure the class has a set to track state properties
  if (!ctor[STATE_PROPS_KEY]) {
    ctor[STATE_PROPS_KEY] = new Set<string>();
  }

  // Add the property key to the set
  (ctor[STATE_PROPS_KEY] as Set<string>).add(propertyKey);
}
