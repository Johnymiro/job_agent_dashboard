---
title: Re-renders and memoization
summary: What makes a component render, why most renders are fine, structural fixes before memo, and when React.memo, useMemo and useCallback actually help.
level: advanced
---

React is fast by default, and most re-renders are cheap. When something does feel slow, the fix is usually structural (move state, pass children), and only sometimes memoisation. Measure first with the React DevTools Profiler.

## What triggers a render

A component renders when:

1. its own state changes,
2. its parent renders (by default, all children render too), or
3. a context it reads changes.

A render isn't a DOM update. React calls your component, compares the result with the previous one, and only touches the DOM where something changed. Props changing is **not** a separate trigger: props only change because the parent rendered.

## Structural fixes first

**Move state down.** If only the search box needs `query`, keep `query` inside a `SearchBox` component so typing doesn't re-render the whole page.

**Lift content up (pass children).** Elements created by a parent aren't re-created when a child's state changes:

```jsx
function Collapsible({ children }) {
  const [open, setOpen] = useState(true);
  return (
    <section>
      <button onClick={() => setOpen(!open)}>Toggle</button>
      {open && children}          {/* children was built by the parent; toggling doesn't re-render it */}
    </section>
  );
}

<Collapsible>
  <ExpensiveChart data={data} />
</Collapsible>
```

**Split contexts** so fast-changing values don't re-render readers of slow-changing ones.

## `React.memo`

`memo` skips re-rendering a component when its props are shallowly equal to last time (every prop compared with `Object.is`).

```jsx
const Row = memo(function Row({ trade, onSelect }) { /* ... */ });
```

It's defeated by props that are new on every render: inline objects (`style={{...}}`), inline arrays, and inline functions (`onSelect={() => ...}`).

## `useMemo` and `useCallback`

- `useMemo(() => compute(a, b), [a, b])` caches a **value** until `a` or `b` changes.
- `useCallback(fn, [deps])` caches a **function**; it's `useMemo(() => fn, deps)`.

```jsx
function Blotter({ trades, filter }) {
  const [selected, setSelected] = useState(null);

  const visible = useMemo(
    () => trades.filter((t) => matches(t, filter)),   // expensive on 50k rows
    [trades, filter],
  );
  const handleSelect = useCallback((id) => setSelected(id), []);  // stable for memo(Row)

  return visible.map((t) => <Row key={t.id} trade={t} onSelect={handleSelect} />);
}
```

They help in three situations:

1. The calculation is genuinely expensive (measure it).
2. The value or function is passed to a `memo` child.
3. The value or function is a dependency of an effect or another hook.

Otherwise they add code and bookkeeping for nothing: `useMemo(() => a + b, [a, b])` costs more than the addition.

> **Tip:** The React Compiler (stable since late 2025) adds this memoisation automatically at build time. In projects that use it, you rarely need to write `memo`, `useMemo` or `useCallback` yourself, but you'll still meet them in most existing codebases and in interviews.

## Keeping the UI responsive

- **Long lists:** render only the visible rows with virtualisation (TanStack Virtual, react-window), or paginate.
- **Heavy updates on typing:** `useDeferredValue(query)` lets the input update immediately while the expensive list catches up with a lag; `useTransition` marks a state update as non-urgent.
- **Context values:** memoise the provider value (`useMemo(() => ({ user, logout }), [user])`), or every consumer re-renders on every provider render.

## Key points

- Renders come from own state, a parent render, or a context change.
- Most renders are cheap. Profile before optimising.
- Try moving state down and passing `children` before reaching for memo.
- `memo` compares props shallowly; inline objects and functions defeat it.
- `useMemo`/`useCallback` pay off for expensive work, memo children and hook dependencies.
- `useDeferredValue`/`useTransition` and virtualisation keep big UIs responsive.

## Quick check

**Q:** `Row` is wrapped in `React.memo`, yet every row re-renders when one is selected. Why?

```jsx
{trades.map((t) => (
  <Row key={t.id} trade={t} onSelect={() => setSelected(t.id)} />
))}
```

- [ ] `memo` only works on class components
- [x] Each render creates new `onSelect` functions, so the shallow prop comparison fails for every row
- [ ] Keys must be strings
- [ ] Selecting always re-renders every child, whatever you do

> Inline arrows are new objects each render. Pass a stable callback, such as `const onSelect = useCallback(id => setSelected(id), [])`, and let `Row` call `onSelect(trade.id)`.

**Q:** Which `useMemo` is least worth having?

- [ ] Filtering and sorting 50,000 trades on every keystroke
- [ ] An object passed to a `memo` child
- [ ] A value used in an effect's dependency array
- [x] `useMemo(() => price * qty, [price, qty])`

> Multiplying two numbers is cheaper than memoising, and the result is a primitive, so it's already stable for comparisons. Memoise expensive work and values whose identity matters.

**Q:** Typing in a search box lags because each keystroke re-filters a huge list. Which hook lets the input stay instant while the list updates slightly later?

- [ ] `useRef`
- [ ] `useLayoutEffect`
- [x] `useDeferredValue`
- [ ] `useId`

> `const deferred = useDeferredValue(query)` gives the expensive list a version of the query that can lag behind, while the input renders with the latest value. Combine it with `memo` or `useMemo` on the list.
