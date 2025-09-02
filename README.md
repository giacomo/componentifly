# componentifly

A small, focused framework for building modern web components with concise decorators, simple two-way state binding, and a minimal runtime.

Componentifly aims to make authoring reusable web components fast and predictable by providing a tiny compiler/runtime and a few intuitive decorators for inputs, state, slots and exposed methods.

## Key features

- Lightweight decorator-based API (see `lib/*.ts`) for defining components.
- Two-way state binding and simple state containers for shared state.
- Small runtime that wires templates, styles and lifecycle hooks.
- Optional services (for example `services/log.service.ts`) and small conventions to keep components isolated.

## Quick start

1. Install dependencies

```pwsh
yarn install
```

2. Start the dev server

```pwsh
yarn start
```

3. Build for production

```pwsh
yarn build
```

Files you will care about

- `src/` — example app and component demos.
- `src/components/` — sample components (button, list, counter, modal, etc.).
- `lib/` — framework source (decorators and runtime integration).

## Core concepts and API

The project uses a small set of decorators and primitives. The semantics below match the code in `lib/`.

- `@ComponentDecorator(options)` — attach template/style and metadata to a component class (see `lib/component.decorator.ts`).
- `@InputProperty()` — mark a property as an input that syncs with HTML attributes (see `lib/input.decorator.ts`).
- `@Expose` — mark methods as safe to call from templates or external code (see `lib/expose.decorator.ts`).
- `@StateProperty` — mark instance fields as reactive state that syncs with the component `state` object (see `lib/state.decorator.ts`).
- `@SlotProperty` — declare slot-backed properties for template use (see `lib/slot.decorator.ts`).

Example component (simplified)

```ts
// src/components/counter/counter.ts
import { Component, ComponentDecorator, Expose, StateProperty } from "../../lib";

@ComponentDecorator({ templatePath: './counter.html', stylePath: './counter.scss', selector: 'ao-counter' })
export class Counter extends Component {
	@StateProperty count: number = 0;

	@Expose
	addCounter(): void {
		this.count++;
	}
}
```

The runtime wires the template, binds state to the DOM, and syncs HTML attributes with `@InputProperty`-decorated fields.

## Examples and demos

Open `src/index.html` to see the demo pages. The `src/components/*` folder contains small, focused examples demonstrating:

- forms and two-way binding (`simpleform`)
- modal lifecycle and services (`modal`, `modal-demo`)
- lists and item rendering (`list`)
- documentation-oriented components (`code-documentation`)

## Contributing

Contribution is welcome. Suggested steps:

1. Fork and create a topic branch.
2. Run `yarn` and `yarn start` to iterate locally.
3. Add tests or a small demo in `src/components` for new features.
4. Open a PR with a clear description of the change.

Coding notes

- TypeScript is used across the project. Typecheck with `npx tsc --noEmit` before committing.
- Keep runtime changes small and keep the decorator surface stable.

## License

This repository doesn't include a license file by default. Add a `LICENSE` file if you want to specify one for reuse or distribution.

## Where to look in the repo

- `lib/framework.ts` — runtime primitives and lifecycle.
- `lib/state.decorator.ts` — state utilities and property decorator.
- `lib/input.decorator.ts` — input property decorator and helpers.
- `lib/slot.decorator.ts` — slot property decorator.
- `lib/component.decorator.ts` — component metadata decorator and asset loading.
- `plugins/` — snowpack loaders used for template/style handling during development.