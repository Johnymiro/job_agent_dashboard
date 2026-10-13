---
title: "Refs: the escape hatch"
summary: useRef for DOM nodes and for values that shouldn't trigger renders, when to use a ref instead of state, and passing refs to your own components in React 19.
level: intermediate
---

Sometimes you need to step outside React's "describe the UI" model: focus an input, measure an element, keep a timer id, or hold an instance of a non-React library. Refs are the tool for that.

## A ref is a box that survives renders

```jsx
const ref = useRef(initialValue);   // { current: initialValue }
```

- `ref.current` keeps its value between renders, like state.
- Changing `ref.current` does **not** trigger a re-render, unlike state.
- The same object is returned on every render.

| | `useState` | `useRef` |
|---|---|---|
| survives re-renders | yes | yes |
| changing it re-renders | yes | no |
| read it during render | yes | avoid (it may be stale) |
| typical use | anything the UI shows | DOM nodes, timer ids, instances, latest values for callbacks |

## Pointing at DOM nodes

```jsx
function SearchBox() {
  const inputRef = useRef(null);
  return (
    <>
      <input ref={inputRef} />
      <button onClick={() => inputRef.current.focus()}>Search</button>
    </>
  );
}
```

React sets `inputRef.current` to the DOM node after mounting, and back to `null` on unmount. Use it in event handlers or effects, not during rendering.

## Values that shouldn't cause renders

```jsx
function Stopwatch() {
  const [elapsed, setElapsed] = useState(0);
  const timer = useRef(null);                      // the id isn't shown, so a ref

  function start() {
    timer.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  }
  function stop() {
    clearInterval(timer.current);
  }
  // ...
}
```

Other good uses: the previous value of a prop, a flag saying a request is in flight, or a chart or map instance created in an effect.

> **Pitfall:** Don't show `ref.current` in your JSX and expect it to update. Changing a ref doesn't re-render, so the screen keeps showing the old value until something else causes a render. If it's on screen, it's state.

## Passing a ref to your own component (React 19)

In React 19, function components receive `ref` as a normal prop, so you can forward it to the element you want to expose:

```jsx
function TextField({ label, ref, ...props }) {
  return (
    <label>
      {label}
      <input ref={ref} {...props} />
    </label>
  );
}

<TextField label="ISIN" ref={isinRef} />
```

Before React 19 this needed `forwardRef`, which you'll still see in older code. `useImperativeHandle` lets a component expose a smaller custom API (say, `focus()` and `clear()`) instead of the raw DOM node.

## Callback refs

A function passed as `ref` is called with the node when it mounts. In React 19 it can return a cleanup function, which is handy for observers:

```jsx
const measure = useCallback((node) => {
  const ro = new ResizeObserver(() => setWidth(node.offsetWidth));
  ro.observe(node);
  return () => ro.disconnect();
}, []);

<div ref={measure} />
```

Keep the function stable (`useCallback` or a function defined outside the component). A new inline arrow on every render makes React detach and re-attach the ref each time.

## Key points

- `useRef` gives a stable `{ current }` box; changing it doesn't re-render.
- Use refs for DOM access, timer ids, instances, and values that aren't shown.
- Read and write refs in handlers and effects, not during render.
- If the UI displays it, use state.
- React 19: `ref` is a regular prop on function components; `forwardRef` is legacy.

## Quick check

**Q:** After three clicks, what does the button show?

```jsx
function Clicks() {
  const n = useRef(0);
  return <button onClick={() => { n.current++; }}>{n.current}</button>;
}
```

- [ ] `3`
- [x] `0`
- [ ] `1`
- [ ] It throws, because refs are read-only

> `n.current` does reach 3, but changing a ref doesn't trigger a render, so the button still shows what it rendered last: 0. Use `useState` for values on screen.

**Q:** Where should you keep an interval id that `stop()` needs to clear later?

- [ ] In state, so the component re-renders when it's set
- [x] In a ref
- [ ] In a module-level variable shared by every instance
- [ ] In the component's props

> The id isn't displayed, so changing it shouldn't cause a render, and it must survive renders. A module-level variable would be shared between all instances of the component.

**Q:** In React 19, how does your own `Input` component let a parent focus the inner `<input>`?

- [ ] It's impossible without a class component
- [ ] Wrap it in `forwardRef`, the only option in React 19
- [x] Accept `ref` as a normal prop and pass it to the `<input>`
- [ ] Call `document.getElementById` in the parent

> React 19 passes `ref` to function components like any other prop. `forwardRef` still works but is no longer needed. Reaching into the DOM by id bypasses React and breaks with multiple instances.
