// Decorator to mark class methods as safe to call from templates/events
const EXPOSED_KEY = Symbol.for("__exposedMethods");

export function Expose(target: any, propertyKey: string, _descriptor: PropertyDescriptor) {
  try {
    const ctor = target?.constructor as any;
    if (!ctor) return;
    if (!ctor[EXPOSED_KEY]) ctor[EXPOSED_KEY] = new Set<string>();
    (ctor[EXPOSED_KEY] as Set<string>).add(propertyKey);
  } catch {}
}

export function getExposedMethods(instanceOrCtor: any): Set<string> {
  const ctor = typeof instanceOrCtor === 'function' ? instanceOrCtor : instanceOrCtor?.constructor;
  const set = (ctor && ctor[EXPOSED_KEY]) as Set<string> | undefined;
  return new Set<string>(set ? Array.from(set) : []);
}