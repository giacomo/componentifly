// A decorator to mark component properties as input attributes that can be set via HTML attributes.
// It automatically syncs HTML attributes with component properties and provides default fallback values.
// Usage: @InputProperty name: string = 'default-name';

const INPUT_PROPS_KEY = Symbol.for("__inputProps");

console.log('[input.decorator.ts] Module loaded, INPUT_PROPS_KEY:', INPUT_PROPS_KEY);

export interface InputPropertyConfig {
  attributeName?: string; // Custom attribute name, defaults to property name
  defaultValue?: any; // Default value if attribute is not provided
}

export function InputProperty(config?: InputPropertyConfig): PropertyDecorator;
export function InputProperty(target: any, propertyKey: string | symbol): void;
export function InputProperty(...args: any[]): any {
  console.log('[InputProperty] *** DECORATOR FUNCTION CALLED ***', args);
  console.debug('[InputProperty] Decorator called with args:', args.length, args.map(a => typeof a));
  
  // Support both legacy (experimentalDecorators) and new decorators.
  // Legacy: (target, propertyKey) or (target, propertyKey, descriptor)
  if (
    typeof args[0] === "object" &&
    (typeof args[1] === "string" || typeof args[1] === "symbol") &&
    (args.length === 2 || args.length === 3)
  ) {
    const target = args[0];
    const propertyKey = String(args[1]);
    
    console.log('[InputProperty] Legacy decorator applied to:', target.constructor.name, 'property:', propertyKey);
    
    registerInputProperty(target.constructor, propertyKey, {});
    console.log('[InputProperty] Registration completed for:', propertyKey);
    return;
  }

  console.log('[InputProperty] No matching decorator pattern, args:', args);

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
    console.log('[registerInputProperty] Invalid inputs:', { ctor: !!ctor, propertyKey });
    return;
  }

  console.log('[registerInputProperty] Registering:', ctor.name, propertyKey, config);

  // Ensure the class has a map to track input properties
  if (!ctor[INPUT_PROPS_KEY]) {
    ctor[INPUT_PROPS_KEY] = new Map<string, InputPropertyConfig>();
    console.log('[registerInputProperty] Created new INPUT_PROPS_KEY for:', ctor.name);
  }

  const inputProps = ctor[INPUT_PROPS_KEY] as Map<string, InputPropertyConfig>;
  inputProps.set(propertyKey, config);
  
  console.log('[registerInputProperty] Current input props for', ctor.name, ':', Array.from(inputProps.keys()));
}

// Helper to read the map of decorated input properties from a component instance/ctor.
export function getDecoratedInputProps(instanceOrCtor: any): Map<string, InputPropertyConfig> {
  const ctor =
    typeof instanceOrCtor === "function"
      ? instanceOrCtor
      : instanceOrCtor?.constructor;
  
  console.log('[getDecoratedInputProps] Called for:', ctor?.name);
  console.log('[getDecoratedInputProps] Constructor has INPUT_PROPS_KEY:', !!ctor?.[INPUT_PROPS_KEY]);
  console.log('[getDecoratedInputProps] Raw INPUT_PROPS_KEY value:', ctor?.[INPUT_PROPS_KEY]);
  
  const map = (ctor && ctor[INPUT_PROPS_KEY]) as Map<string, InputPropertyConfig> | undefined;
  const result = new Map(map ? Array.from(map.entries()) : []);
  
  console.log('[getDecoratedInputProps] Returning map with keys:', Array.from(result.keys()));
  
  return result;
}

// Install input property handling on the prototype for all decorated input properties.
export function installInputPropertyHandlers(ctor: any) {
  console.log('[installInputPropertyHandlers] Called for:', ctor?.name);
  
  if (!ctor) {
    console.log('[installInputPropertyHandlers] No constructor provided');
    return;
  }
  
  const inputProps = getDecoratedInputProps(ctor);
  const proto = ctor.prototype;
  
  console.log('[installInputPropertyHandlers] Installing for:', ctor.name, 'Properties:', Array.from(inputProps.keys()));
  console.log('[installInputPropertyHandlers] Input props size:', inputProps.size);
  console.log('[installInputPropertyHandlers] Constructor INPUT_PROPS_KEY:', ctor[INPUT_PROPS_KEY]);
  
  if (inputProps.size === 0) {
    console.log('[installInputPropertyHandlers] No input properties found for:', ctor.name);
    return;
  }
  
  console.log('[installInputPropertyHandlers] Starting property installation loop...');
  
  for (const [propertyKey, config] of inputProps.entries()) {
    console.log('[installInputPropertyHandlers] Installing accessor for property:', propertyKey, 'config:', config);
    const attributeName = config.attributeName || propertyKey.toLowerCase();
    const storageKey = Symbol(`__input_${propertyKey}`);
    
    console.log('[installInputPropertyHandlers] Installing on prototype for:', propertyKey, 'attributeName:', attributeName);
    
    Object.defineProperty(proto, propertyKey, {
      configurable: true,
      enumerable: true,
      get: function () {
        console.log(`[InputProperty getter] Getting ${propertyKey} (attr: ${attributeName}) for`, this.constructor.name);
        
        // FIRST check ORIGINAL HTML attributes (before template processing)
        try {
          if (this && (this as any).__originalAttributes) {
            const originalAttrs = (this as any).__originalAttributes;
            console.log(`[InputProperty getter] Original attributes for ${propertyKey}:`, Array.from(originalAttrs.entries()));
            const originalValue = originalAttrs.get(attributeName);
            console.log(`[InputProperty getter] Looking for attribute "${attributeName}", found:`, originalValue);
            if (originalValue !== undefined) {
              console.log('[InputProperty getter] Found original attribute value for', propertyKey, ':', originalValue);
              return originalValue;
            }
          }
        } catch (e) {
          console.log(`[InputProperty getter] Error reading original attributes for ${propertyKey}:`, e);
        }
        
        // Then check if we have a stored value (from programmatic assignment)
        if (Object.prototype.hasOwnProperty.call(this, storageKey)) {
          console.log(`[InputProperty getter] Found stored value for ${propertyKey}:`, (this as any)[storageKey]);
          return (this as any)[storageKey];
        }
        
        // Fallback to current HTML attribute (though it may have been processed)
        try {
          if (this && typeof this.getAttribute === "function") {
            const attrValue = this.getAttribute(attributeName);
            console.log(`[InputProperty getter] Current HTML attribute "${attributeName}":`, attrValue);
            if (attrValue !== null) {
              return attrValue;
            }
          }
        } catch {}
        
        // Finally return default value
        console.log(`[InputProperty getter] Using default value for ${propertyKey}:`, config.defaultValue);
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
    
    console.log('[installInputPropertyHandlers] Successfully installed accessor for:', propertyKey);
  }
  
  console.log('[installInputPropertyHandlers] Completed installing all accessors for:', ctor.name);
  
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
