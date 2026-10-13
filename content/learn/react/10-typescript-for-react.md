---
title: TypeScript for React developers
summary: Typing props, events, state and refs; modelling UI states with discriminated unions; unknown vs any; and the utility types you'll actually use.
level: intermediate
---

TypeScript catches the bugs React can't: a missing prop, a typo in an event name, a case you forgot to handle. You don't need advanced type gymnastics; a handful of patterns cover nearly everything in a React codebase.

## Props

```tsx
type ButtonProps = {
  label: string;
  tone?: "primary" | "ghost";          // optional, limited to two values
  onClick: () => void;
  children?: React.ReactNode;          // anything renderable
};

function Button({ label, tone = "ghost", onClick }: ButtonProps) { /* ... */ }

// extend a native element's props
type IconButtonProps = React.ComponentProps<"button"> & { icon: IconName };
```

`type` and `interface` both work for props. Pick one convention and stick with it.

## Events, state and refs

```tsx
function QtyInput() {
  const [qty, setQty] = useState(0);                       // inferred: number
  const [user, setUser] = useState<User | null>(null);     // annotate when it starts as null
  const inputRef = useRef<HTMLInputElement>(null);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => setQty(e.target.valueAsNumber);
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); };
  // ...
}
```

Hover over an inline handler in your editor to see its event type, then copy it when you extract the function.

## Discriminated unions for UI states

Instead of several booleans that can contradict each other (`isLoading && isError`?), model each state explicitly. A shared literal field (the **discriminant**) lets TypeScript narrow the type:

```tsx
type Fetch<T> =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "success"; data: T };

function View({ state }: { state: Fetch<Trade[]> }) {
  switch (state.status) {
    case "loading":
      return <Spinner />;
    case "error":
      return <ErrorBox message={state.error} />;          // `error` exists here
    case "success":
      return <TradeTable trades={state.data} />;           // `data` exists here
    default: {
      const _exhaustive: never = state;                    // compile error if a case is missing
      return _exhaustive;
    }
  }
}
```

Impossible states (an error **and** data) can't even be written.

## `unknown`, not `any`, for outside data

`any` turns type checking off. `unknown` means "could be anything; prove what it is before using it". Use it for `JSON.parse`, API responses and LLM tool arguments, then validate with a schema:

```tsx
import { z } from "zod";

const ToolCall = z.object({ name: z.string(), args: z.record(z.string(), z.unknown()) });
type ToolCall = z.infer<typeof ToolCall>;                 // the type comes from the schema

const raw: unknown = JSON.parse(text);
const call = ToolCall.parse(raw);                         // throws if the shape is wrong
call.name.toUpperCase();                                  // safe: it's a string now
```

## Utility types you'll actually use

```tsx
type Client = { id: string; name: string; email: string; riskScore: number };

type ClientPatch = Partial<Omit<Client, "id">>;   // any field except id, all optional
type ClientCard = Pick<Client, "name" | "email">;
type ById = Record<string, Client>;
type Price = Awaited<ReturnType<typeof fetchPrice>>;   // what an async function resolves to

const SIDES = ["BUY", "SELL"] as const;            // readonly ["BUY", "SELL"]
type Side = (typeof SIDES)[number];                // "BUY" | "SELL"

const routes = { home: "/", jobs: "/jobs" } satisfies Record<string, string>;
routes.jobs;          // OK, and routes.typo is an error: satisfies checks the shape but keeps the exact keys
```

## Generic components

```tsx
function List<T>({ items, render }: { items: T[]; render: (item: T) => React.ReactNode }) {
  return <ul>{items.map((item, i) => <li key={i}>{render(item)}</li>)}</ul>;
}

<List items={trades} render={(t) => t.isin} />          // T is inferred as Trade
```

## Key points

- Type props with a `type`; use `React.ReactNode` for children and `React.ComponentProps<"tag">` to extend native elements.
- Annotate `useState` when the initial value doesn't show the full type (`useState<User | null>(null)`).
- Model UI states as discriminated unions; use a `never` check for exhaustiveness.
- `unknown` + schema validation (Zod) for outside data; avoid `any`.
- Know `Partial`, `Pick`, `Omit`, `Record`, `ReturnType`, `Awaited`, `as const` and `satisfies`.

## Quick check

**Q:** `const [user, setUser] = useState(null);` then `setUser({ name: "Ana" })` is a type error. What's the fix?

- [ ] Use `any` for the whole component
- [x] `useState<User | null>(null)`
- [ ] `useState(undefined)`
- [ ] Cast in the setter: `setUser({ name: "Ana" } as null)`

> TypeScript infers the state type from the initial value, here just `null`. An explicit type argument widens it to `User | null`, and you narrow with `if (user)` before using it.

**Q:** What does `const _exhaustive: never = state;` in a switch's `default` branch give you?

- [ ] It makes the switch faster
- [ ] It throws at runtime when a case is missing
- [x] A compile-time error if a new variant is added to the union and no case handles it
- [ ] It turns off type checking for `state`

> In the default branch, `state` has been narrowed to whatever cases you haven't handled. If that's nothing, it's `never` and the assignment compiles; a new, unhandled variant makes it fail to compile.

**Q:** What's the benefit of `satisfies` in `const routes = { home: "/", jobs: "/jobs" } satisfies Record<string, string>`?

- [ ] It converts the object to a `Map`
- [x] It checks the object matches the type, while keeping the precise inferred type, so `routes.jobs` works and `routes.typo` is an error
- [ ] It makes `routes` immutable at runtime
- [ ] Nothing: it's the same as `const routes: Record<string, string> = …`

> An annotation (`: Record<string, string>`) would widen the type, so any key would be allowed, typos included. `satisfies` validates the shape without losing the literal keys.
