---
title: Components, JSX and props
summary: The React mental model (UI as a function of state), JSX rules, props and children, conditional rendering, and why rendering must be pure.
level: core
---

React's core idea is simple: **you describe what the UI should look like for the current data, and React updates the screen to match**. You don't write "add this row, hide that button" steps; you write a function that returns the whole UI for a given state.

## Components are functions that return JSX

```jsx
function TradeRow({ trade }) {
  return (
    <tr>
      <td>{trade.isin}</td>
      <td className="num">{trade.qty.toLocaleString()}</td>
    </tr>
  );
}
```

- Component names start with a capital letter; lowercase tags like `<tr>` are HTML elements.
- JSX compiles to function calls (`jsx("tr", ...)`), so it's just JavaScript underneath.
- `{ }` embeds any JavaScript **expression**: variables, calls, ternaries. Not statements like `if` or `for`.

## JSX rules that catch people out

```jsx
<>                                   {/* return a single root; <>...</> adds no DOM node */}
  <label htmlFor="qty">Qty</label>   {/* htmlFor, not for */}
  <input id="qty" className="field" />  {/* className, and every tag must close */}
  <div style={{ marginTop: 8 }} />   {/* style takes an object, camelCased */}
  <button onClick={save}>Save</button>  {/* pass the function; don't call it */}
</>
```

> **Pitfall:** `onClick={save()}` calls `save` during render and passes its return value as the handler. Write `onClick={save}`, or `onClick={() => save(id)}` when you need arguments.

## Props: inputs to a component

Props are the arguments a parent passes in. They're **read-only**: a component never changes its own props.

```jsx
function Badge({ label, tone = "neutral" }) {      // destructure, with a default
  return <span className={`badge badge-${tone}`}>{label}</span>;
}

<Badge label="filled" tone="good" />
```

`children` is whatever you put between the tags, which makes composition easy:

```jsx
function Card({ title, children }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

<Card title="Exposure">
  <ExposureChart />
</Card>
```

React favours composition (passing components and children) over inheritance between components.

## Conditional rendering

```jsx
function Status({ order }) {
  if (!order) return null;                       // render nothing

  return (
    <div>
      {order.filled ? <Check /> : <Spinner />}   {/* either / or */}
      {order.error && <ErrorText msg={order.error} />}   {/* only if truthy */}
    </div>
  );
}
```

> **Pitfall:** `{count && <Badge />}` renders a literal **0** when `count` is 0, because `0` is a value React prints. Write `{count > 0 && <Badge />}` or use a ternary.

## Rendering must be pure

React may call your component many times, and at times you don't control. A component must behave like a pure function of its props and state: same inputs, same JSX, no side effects while rendering.

```jsx
let renders = 0;
function Bad() {
  renders++;                       // mutates something outside: impure
  fetch("/api/log");               // side effect during render: wrong place
  return <p>{renders}</p>;
}
```

Side effects belong in event handlers (user actions) or effects (syncing with outside systems), covered in later lessons. In development, `<StrictMode>` deliberately renders components twice to expose impure code. Production renders once.

## Key points

- UI = f(state): return what the screen should show; React updates the DOM.
- JSX: one root (or a fragment), `className`, `htmlFor`, camelCase events and styles, `{expressions}`.
- Pass handlers, don't call them: `onClick={save}`.
- Props are read-only inputs; `children` enables composition.
- Beware `0 &&` in conditional rendering.
- Keep rendering pure; StrictMode's double render in development is how React helps you find impurity.

## Quick check

**Q:** `items` is an empty array. What does this render?

```jsx
<div>{items.length && <List items={items} />}</div>
```

- [ ] An empty `<div>`
- [x] `<div>0</div>`
- [ ] An empty `<List>`
- [ ] It throws, because `0` isn't a valid element

> `0 && anything` evaluates to `0`, and React renders numbers. Use `items.length > 0 && ...` so the left side is a boolean, which React renders as nothing.

**Q:** A child component needs to change a value it received as a prop. What's the React way?

- [ ] Assign to the prop: `props.value = next`
- [ ] Copy the prop into a global variable and mutate that
- [x] Keep the state in the parent and pass down a callback, such as `onChange`, that the child calls
- [ ] Use `document.querySelector` to update the parent's DOM

> Props are read-only. The component that owns the state changes it, and children request changes through callback props. This keeps one source of truth for every value.

**Q:** Why does a component's `console.log` run twice per render in development?

- [ ] A bug in React's development build
- [x] `<StrictMode>` intentionally calls components twice in development to surface impure rendering
- [ ] The browser renders every page twice
- [ ] Hooks always cause two renders

> StrictMode double-invokes component functions (and some hooks) in development only. A pure component gives the same result both times; impure code shows up as duplicated side effects. Production renders once.
