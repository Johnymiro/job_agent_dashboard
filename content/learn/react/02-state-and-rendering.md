---
title: State, re-renders and immutable updates
summary: useState as a snapshot, updater functions and batching, updating objects and arrays without mutation, and deriving values instead of storing them.
level: core
---

State is data a component remembers between renders. Changing it tells React to render again. Most state bugs come from three misunderstandings: state is a **snapshot**, updates are **batched**, and React detects changes by **reference**.

## useState and re-rendering

```jsx
function Counter() {
  const [count, setCount] = useState(0);   // [current value, setter]
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

Calling the setter doesn't change `count` in the running code. It schedules a re-render, and in **that** render `useState` returns the new value.

## State is a snapshot

Inside one render, `count` is a constant. Every handler created in that render sees the same value.

```jsx
function handleClick() {
  setCount(count + 1);    // count is 0 here: "set to 1"
  setCount(count + 1);    // still 0: "set to 1"
  console.log(count);     // 0: not updated yet
}
// after the click, count is 1, not 2
```

When the next value depends on the previous one, pass an **updater function**. React queues the updaters and runs them in order:

```jsx
setCount((c) => c + 1);
setCount((c) => c + 1);   // count ends up +2
```

```viz
re-snapshot
```

## Batching

React 18+ batches all state updates made in the same event, timeout or promise callback into **one** re-render. Three setters in a row means one render, not three.

## Update objects and arrays immutably

React compares old and new state with `Object.is`. If you mutate the existing object and set it again, the reference hasn't changed, so React may skip the render, and memoised children won't see the change.

```jsx
// wrong: mutates, same reference
items.push(newItem);
setItems(items);

// right: build a new array or object
setItems([...items, newItem]);                                  // add
setItems(items.filter((i) => i.id !== id));                     // remove
setItems(items.map((i) => (i.id === id ? { ...i, qty } : i)));  // update one
setItems(items.toSorted((a, b) => a.price - b.price));          // sort a copy
setOrder({ ...order, side: "SELL" });                           // object field
setForm((f) => ({ ...f, address: { ...f.address, city } }));    // nested: copy each level
```

```viz
re-immutable
```

| Avoid (mutates) | Use instead |
|---|---|
| `push`, `unshift` | `[...arr, x]`, `[x, ...arr]` |
| `splice` | `filter`, `slice`, `toSpliced` |
| `sort`, `reverse` | `toSorted`, `toReversed` (or copy first) |
| `arr[i] = x` | `map`, or `arr.with(i, x)` |

> **Tip:** For deeply nested state, a reducer (`useReducer`) or a library like Immer keeps updates readable.

## Don't store what you can compute

If a value can be calculated from props or other state, calculate it during render. Storing it means keeping two copies in sync, and they will drift.

```jsx
// wrong: duplicated state plus an effect to sync it
const [visible, setVisible] = useState([]);
useEffect(() => setVisible(trades.filter((t) => t.desk === desk)), [trades, desk]);

// right: derive it
const visible = trades.filter((t) => t.desk === desk);
// if it's genuinely expensive: useMemo(() => ..., [trades, desk])
```

## Where state lives

- Put state in the **closest common parent** of the components that need it ("lifting state up"), and pass it down as props.
- `useState(() => expensiveInit())` runs the initialiser only on the first render.
- React keeps state per component **position** in the tree. Rendering the same component in the same place keeps its state; changing its `key` resets it.

## Key points

- Setting state schedules a new render; the current render keeps its snapshot.
- Use updater functions (`setX(x => ...)`) when the new value depends on the old one.
- Updates in one event are batched into a single render.
- Never mutate state. Create new arrays and objects (spread, `map`, `filter`, `toSorted`).
- Derive values during render instead of syncing duplicate state with effects.

## Quick check

**Q:** `count` starts at 0. After one click, what does it show?

```jsx
function handleClick() {
  setCount(count + 5);
  setCount((c) => c + 1);
}
```

- [ ] `5`
- [ ] `1`
- [x] `6`
- [ ] `7`

> The first call queues "replace with 0 + 5". The updater then receives the queued result, 5, and returns 6. Updates are applied in order within the same batch.

**Q:** Why doesn't the list update on screen?

```jsx
function addTrade(t) {
  trades.push(t);
  setTrades(trades);
}
```

- [ ] `setTrades` only accepts objects
- [x] It mutates the existing array and passes the same reference, so React treats the state as unchanged
- [ ] `push` is asynchronous
- [ ] State setters can't be called from regular functions

> React compares state with `Object.is`. Same array, so no change is detected, and the mutation also breaks memoised children. Use `setTrades([...trades, t])` or `setTrades(prev => [...prev, t])`.

**Q:** A component receives `trades` and `desk` and shows the trades for that desk. What's the best approach?

- [ ] Copy the filtered list into state and keep it in sync with `useEffect`
- [x] Compute `trades.filter(t => t.desk === desk)` during render
- [ ] Filter in a `useLayoutEffect`
- [ ] Store the filtered list in a ref

> It can be derived, so derive it. Extra state plus a syncing effect adds a render, a stale frame and a place for bugs. Wrap the calculation in `useMemo` only if it's measurably expensive.
