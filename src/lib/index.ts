// Barrel exports for simpler imports across components

// Export the class-based component as `Component`
export { Component } from "./component";

// Export the decorator as `ComponentDecorator` to avoid name clash
export { Component as ComponentDecorator } from "./component.decorator";

// Convenience re-exports (optional but handy)
export { StateProperty, getDecoratedStateProps } from "./state.decorator";
export { SlotProperty, getDecoratedSlotProps } from "./slot.decorator";
export { InputProperty, getDecoratedInputProps, installInputPropertyHandlers } from "./input.decorator";
export type { StateType } from "./state-type";
export { Framework } from "./framework";
export { Expose } from "./expose.decorator";
