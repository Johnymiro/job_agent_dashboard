---
title: "Effects: syncing with the outside world"
summary: What useEffect is for, how dependencies and cleanup work, why StrictMode runs effects twice, and the bugs effects cause (stale closures, races, loops).
level: intermediate
---

An effect lets a component **synchronise with something outside React**: a WebSocket, a timer, a browser API, a third-party widget, a network request. If there's no external system involved, you probably don't need an effect.

## Anatomy of an effect

```jsx
useEffect(() => {
  const socket = connect(roomId);       // setup: start syncing
  return () => socket.close();          // cleanup: stop syncing
}, [roomId]);                           // dependencies: re-sync when these change
```

- Effects run **after** React has updated the screen.
- **Cleanup** runs before the effect runs again (with new dependencies) and when the component unmounts.
- The dependency array controls when it re-runs:

| Dependencies | Runs |
|---|---|
| none | after every render |
| `[]` | after the first render only (cleanup on unmount) |
| `[a, b]` | after the first render, then whenever `a` or `b` changed (compared with `Object.is`) |

Every reactive value the effect reads (props, state, values computed from them) belongs in the dependency list. The `react-hooks/exhaustive-deps` lint rule checks this; trust it rather than silencing it.

## Why effects run twice in development

With `<StrictMode>`, React mounts each component, immediately unmounts it, and mounts it again, in development only. Your effect runs setup, cleanup, setup. If you see two WebSocket connections or two subscriptions, the bug is a **missing cleanup**; in production the effect runs once, but the leak would show up when the component remounts.

```viz
re-effect-life
```

## Stale closures

An effect captures the values from the render it was created in. If it outlives that render, it keeps seeing old values.

```jsx
useEffect(() => {
  // `seconds` is stuck at 0 inside this closure, so it shows 1 forever
  const id = setInterval(() => setSeconds(seconds + 1), 1000);
  return () => clearInterval(id);
}, []);

useEffect(() => {
  // the updater always receives the current value
  const id = setInterval(() => setSeconds((s) => s + 1), 1000);
  return () => clearInterval(id);
}, []);
```

React 19.2 adds `useEffectEvent` for reading the latest props or state inside an effect without making them dependencies.

## Race conditions when fetching

Responses can arrive out of order. If the user types "ap", then "apple", the "ap" response might land last and overwrite the right results. Cancel or ignore stale requests in the cleanup:

```jsx
useEffect(() => {
  const ctrl = new AbortController();
  fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: ctrl.signal })
    .then((r) => r.json())
    .then(setResults)
    .catch((err) => {
      if (err.name !== "AbortError") setError(err);
    });
  return () => ctrl.abort();             // the previous request dies when query changes
}, [query]);
```

```viz
re-race
```

In real apps, a data library (TanStack Query, SWR, or your framework's loader) handles caching, races and retries for you.

## Objects and functions as dependencies

A new object or function is created on every render, so using one as a dependency makes the effect re-run every render, and sometimes loop forever.

```jsx
const options = { symbol, interval: "1m" };     // new object each render
useEffect(() => {
  const sub = subscribe(options);
  return () => sub.close();
}, [options]);                                   // resubscribes on EVERY render

useEffect(() => {
  const sub = subscribe({ symbol, interval: "1m" });   // build it inside
  return () => sub.close();
}, [symbol]);                                    // depend on the primitive
```

## You might not need an effect

| Instead of an effect that… | Do this |
|---|---|
| computes a value from props or state | compute it during render (`useMemo` if expensive) |
| reacts to a button click or form submit | put the logic in the event handler |
| resets state when a prop changes | give the component a `key` tied to that prop |
| fetches data on mount, in a framework | use the framework's loader, or a query library |

Effects that set state from other state cause an extra render and a frame of stale UI.

## Key points

- Effects sync with external systems; setup returns a cleanup.
- Cleanup runs before the next run and on unmount.
- List every reactive value the effect reads as a dependency.
- StrictMode's setup → cleanup → setup in development exposes missing cleanups.
- Fix stale closures with updater functions; fix fetch races with `AbortController` or an ignore flag.
- Build objects inside the effect; depend on primitives.
- Derive values in render and handle user actions in event handlers.

## Quick check

**Q:** What's wrong with this effect?

```jsx
function Chart({ symbol }) {
  const options = { symbol, interval: "1m" };
  useEffect(() => {
    const sub = subscribe(options);
    return () => sub.close();
  }, [options]);
}
```

- [ ] Nothing; it re-subscribes only when `symbol` changes
- [x] `options` is a new object on every render, so it unsubscribes and resubscribes after every render
- [ ] The cleanup runs before `subscribe` is called
- [ ] Effects can't return functions

> Dependencies are compared with `Object.is`, and a fresh object is never equal to the last one. Create the object inside the effect and depend on `symbol`.

**Q:** When does an effect's cleanup function run?

- [ ] Only when the component unmounts
- [x] Before the effect runs again with new dependencies, and when the component unmounts
- [ ] After every render, even if dependencies didn't change
- [ ] Never in production

> React cleans up the previous synchronisation before starting a new one, and once more on unmount. In development, StrictMode also runs one extra cleanup and setup on mount.

**Q:** Which of these does NOT need an effect?

- [ ] Opening a WebSocket for the selected chat room
- [ ] Subscribing to `window` resize events
- [x] Computing an order total from the `items` prop
- [ ] Starting a third-party chart library on a `<div>`

> The total can be computed during render from `items`. The other three connect to systems outside React, which is exactly what effects are for.
