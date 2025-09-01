// A decorator to mark component properties as input attributes that can be set via HTML attributes.
// It automatically syncs HTML attributes with component properties and provides default fallback values.
// Usage: @InputProperty name: string = 'default-name';

const INPUT_PROPS_KEY = Symbol.for("__inputProps");

export interface InputPropertyConfig {
  attributeName?: string; // Custom attribute name, defaults to property name
  defaultValue?: any; // Default value if attribute is not provided
}

export function InputProperty(config?: InputPropertyConfig): PropertyDecorator;
export function InputProperty(target: any, propertyKey: string | symbol): void;
export function InputProperty(...args: any[]): any {
  // Support both legacy (experimentalDecorators) and new decorators.
  // Legacy: (target, propertyKey) or (target, propertyKey, descriptor)
  if (
    typeof args[0] === "object" &&
    (typeof args[1] === "string" || typeof args[1] === "symbol") &&
    (args.length === 2 || args.length === 3)
  ) {
    const target = args[0];
    const propertyKey = String(args[1]);

    registerInputProperty(target.constructor, propertyKey, {});
    return;
  }

  // Decorator factory: @InputProperty(config)
  if (args.length === 1 && (args[0] === undefined || typeof args[0] === "object")) {
    const config = args[0] || {};
    return function (target: any, propertyKey: string | symbol) {
      registerInputProperty(target.constructor, String(propertyKey), config);
    };
  }

  // New TC39 decorators: (initialValue, context)
  const initialValue = args[0];
  const context = args[1] || {};
  if (context && typeof context === "object" && "kind" in context) {
    const key = String((context as any).name);
    
    (context as any).addInitializer?.(function (this: any) {
      registerInputProperty(this.constructor, key, { defaultValue: initialValue });
    });

    return initialValue;
  }
}

function registerInputProperty(ctor: any, propertyKey: string, config: InputPropertyConfig) {
  if (!ctor || !propertyKey) {
    return;
  }

  // Ensure the class has a map to track input properties
  if (!ctor[INPUT_PROPS_KEY]) {
    ctor[INPUT_PROPS_KEY] = new Map<string, InputPropertyConfig>();
  }

  const inputProps = ctor[INPUT_PROPS_KEY] as Map<string, InputPropertyConfig>;
  inputProps.set(propertyKey, config);
}

// Helper to read the map of decorated input properties from a component instance/ctor.
export function getDecoratedInputProps(instanceOrCtor: any): Map<string, InputPropertyConfig> {
  const ctor =
    typeof instanceOrCtor === "function"
      ? instanceOrCtor
      : instanceOrCtor?.constructor;

  const map = (ctor && ctor[INPUT_PROPS_KEY]) as Map<string, InputPropertyConfig> | undefined;
  const result = new Map(map ? Array.from(map.entries()) : []);

  return result;
}

// Install input property handling on the prototype for all decorated input properties.
export function installInputPropertyHandlers(ctor: any) {
  if (!ctor) {
    return;
  }

  const inputProps = getDecoratedInputProps(ctor);
  const proto = ctor.prototype;

  if (inputProps.size === 0) {
    return;
  }

  for (const [propertyKey, config] of inputProps.entries()) {
    const attributeName = config.attributeName || propertyKey.toLowerCase();
    const storageKey = Symbol(`__input_${propertyKey}`);

    Object.defineProperty(proto, propertyKey, {
      configurable: true,
      enumerable: true,
      get: function () {

        // FIRST check if we have a stored value (from programmatic assignment)
        if (Object.prototype.hasOwnProperty.call(this, storageKey)) {
          return (this as any)[storageKey];
        }
        // SECOND check ORIGINAL HTML attributes (before template processing)
        try {
          if (this && (this as any).__originalAttributes) {
            const originalAttrs = (this as any).__originalAttributes;
            const originalValue = originalAttrs.get(attributeName);
            if (originalValue !== undefined) {
              return originalValue;
            }
          }
        } catch (e) {
        }
        
        // Fallback to current HTML attribute (though it may have been processed)
        try {
          if (this && typeof this.getAttribute === "function") {
            const attrValue = this.getAttribute(attributeName);
            if (attrValue !== null) {
              return attrValue;
            }
          }
        } catch {}
        
        // Finally return default value
        return config.defaultValue;
      },
      set: function (value: any) {
        // Store the value
        (this as any)[storageKey] = value;
        
        // Update HTML attribute if this is a custom element
        try {
          if (this && typeof this.setAttribute === "function") {
            if (value !== null && value !== undefined) {
              this.setAttribute(attributeName, String(value));
            } else {
              this.removeAttribute(attributeName);
            }
          }
        } catch {}
        
        // Trigger updates
        try {
          if (typeof this.updateBindings === "function")
            this.updateBindings(propertyKey, value);
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

  // Add a method to sync all input properties from attributes
  if (!proto.syncInputPropertiesFromAttributes) {
    proto.syncInputPropertiesFromAttributes = function() {
      for (const [propertyKey] of inputProps.entries()) {
        // Trigger getter to sync from attribute and update UI bindings
        const value = (this as any)[propertyKey];
        try {
          if (typeof this.updateBindings === "function") {
            this.updateBindings(propertyKey, value);
          }
        } catch {}
      }
    };
  }
}
