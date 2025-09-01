// A lightweight property decorator to mark component fields as slot properties.
// Slot properties can be used in templates with [[propertyName]] syntax and support default values.
// Usage: @SlotProperty name = 'Default Text';
const SLOT_PROPS_KEY = Symbol.for("__slotProps");

export interface SlotPropertyConfig {
  name: string;
  defaultValue?: string;
}

export function SlotProperty(...args: any[]): any {
  
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
    if (!ctor[SLOT_PROPS_KEY]) ctor[SLOT_PROPS_KEY] = new Set<SlotPropertyConfig>();
    
    // Get the default value from the class field initializer if available
    const defaultValue = (target as any)[propertyKey];
    
    (ctor[SLOT_PROPS_KEY] as Set<SlotPropertyConfig>).add({
      name: propertyKey,
      defaultValue: defaultValue || undefined
    });

    return;
  }

  // New TC39 decorators: (initialValue, context)
  const initialValue = args[0];
  const context = args[1] || {};
  
  if (context && typeof context === "object" && "kind" in context) {
    const key = String((context as any).name);
    
    (context as any).addInitializer?.(function (this: any) {
      const ctor = this.constructor as any;
      if (!ctor[SLOT_PROPS_KEY]) ctor[SLOT_PROPS_KEY] = new Set<SlotPropertyConfig>();
      (ctor[SLOT_PROPS_KEY] as Set<SlotPropertyConfig>).add({
        name: key,
        defaultValue: initialValue || undefined
      });
    });

    return initialValue;
  }

  // If called without arguments, return a decorator function
  return function (target: any, propertyKey: string) {
    const ctor = target.constructor as any;
    if (!ctor[SLOT_PROPS_KEY]) ctor[SLOT_PROPS_KEY] = new Set<SlotPropertyConfig>();
    
    // Get the default value from the class field initializer if available
    const defaultValue = (target as any)[propertyKey];
    
    (ctor[SLOT_PROPS_KEY] as Set<SlotPropertyConfig>).add({
      name: propertyKey,
      defaultValue: defaultValue || undefined
    });
  };
}

// Helper to read the set of decorated slot properties from a component instance/ctor.
export function getDecoratedSlotProps(instanceOrCtor: any): Set<SlotPropertyConfig> {
  const ctor =
    typeof instanceOrCtor === "function"
      ? instanceOrCtor
      : instanceOrCtor?.constructor;
  const set = (ctor && ctor[SLOT_PROPS_KEY]) as Set<SlotPropertyConfig> | undefined;
  return new Set<SlotPropertyConfig>(set ? Array.from(set) : []);
}
