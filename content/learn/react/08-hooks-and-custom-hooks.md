---
title: Rules of Hooks and custom hooks
summary: Why hooks must be called in the same order every render, and how to pull reusable logic into your own hooks (debounce, local storage, online status).
level: intermediate
---

Hooks (`useState`, `useEffect`, `useContext` …) give function components memory and side effects. They come with two rules, and once you follow them, you can bundle any stateful logic into a custom hook and reuse it across components.

## The two rules

1. **Call hooks at the top level** of a component or custom hook: not inside conditions, loops, nested functions, or after an early `return`.
2. **Call hooks only from React functions**: components, or custom hooks whose name starts with `use`.

Why: React doesn't know your hooks by name. It remembers them by **call order**. On every render, the first `useState` call gets the first slot, the second gets the second, and so on. If a condition skips a hook on one render, every hook after it reads the wrong slot.

```jsx
function Profile({ user }) {
  if (!user) return null;                     // early return…
  const [tab, setTab] = useState("info");     // …so this hook is sometimes skipped
}

function Profile({ user }) {
  const [tab, setTab] = useState("info");     // hooks first
  if (!user) return null;                     // then conditions
}
```

Put conditions **inside** hooks instead: `useEffect(() => { if (!user) return; ... }, [user])`. The `eslint-plugin-react-hooks` rules catch these mistakes, and the missing-dependency ones too.

> **Note:** The new `use()` API (React 19) is the one exception: it can be called conditionally, because it reads a promise or context rather than owning a slot.

```viz
re-hook-slots
```

## Custom hooks: reuse logic, not state

A custom hook is just a function whose name starts with `use` and that calls other hooks. Each component that calls it gets **its own independent state**; hooks share logic, never the state itself.

```jsx
function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);            // a new keystroke cancels the pending update
  }, [value, delay]);
  return debounced;
}

function Search() {
  const [query, setQuery] = useState("");
  const q = useDebouncedValue(query, 400);    // fetch with q, not query
  const { data } = useQuery({ queryKey: ["search", q], queryFn: () => search(q), enabled: q.length > 1 });
  // ...
}
```

Two more patterns worth knowing:

```jsx
function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? initial : JSON.parse(raw);
    } catch {
      return initial;                         // blocked storage or bad JSON
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue];
}

function useOnlineStatus() {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener("online", onChange);
      window.addEventListener("offline", onChange);
      return () => {
        window.removeEventListener("online", onChange);
        window.removeEventListener("offline", onChange);
      };
    },
    () => navigator.onLine,                   // read the current value
    () => true,                               // value during server rendering
  );
}
```

`useSyncExternalStore` is the right primitive for subscribing to anything outside React: browser APIs, a store, a WebSocket client.

## Designing a good hook

- Name it after what it gives you: `useDebouncedValue`, `useAuth`, `useTrades`.
- Return a tuple (`[value, setValue]`) when callers will rename the parts, an object (`{ data, error, isPending }`) when there are several named results.
- Keep returned functions stable (`useCallback`) if callers might pass them to effects or memoised children.
- Test hooks with `renderHook` from React Testing Library.

## Key points

- Hooks are matched by call order, so call them unconditionally at the top level.
- Only call hooks from components and `use…` functions.
- Custom hooks share logic; every caller gets separate state.
- Clean up timers and subscriptions inside the hook's effects.
- Use `useSyncExternalStore` to subscribe to external sources.

## Quick check

**Q:** What's the problem here?

```jsx
function Profile({ user }) {
  if (!user) return null;
  const [tab, setTab] = useState("info");
  return <Tabs value={tab} onChange={setTab} />;
}
```

- [ ] `useState` needs an explicit type
- [x] The hook is skipped when `user` is missing, so hook order changes between renders; call `useState` before the early return
- [ ] Components can't return `null`
- [ ] `setTab` can't be passed as a prop

> React tracks hooks by call order. When `user` goes from missing to present, the number of hook calls changes and React errors ("Rendered more hooks than during the previous render"). Call hooks first, then return early.

**Q:** Two components both call `useCounter()`, a custom hook built on `useState`. When one increments, does the other's count change?

- [ ] Yes, custom hooks share their state
- [x] No, each call has its own independent state
- [ ] Only if they're siblings
- [ ] Only in StrictMode

> A custom hook is just a function; each component calling it gets its own `useState` slots. To share state, lift it into a common parent or into Context, or use a store.

**Q:** In `useDebouncedValue`, why does the effect return `() => clearTimeout(id)`?

- [ ] To avoid a memory leak in production builds only
- [x] So each new value cancels the pending timeout; only the last value after a pause gets through
- [ ] Because `setTimeout` can't be used without a cleanup
- [ ] To make the hook run twice in StrictMode

> When `value` changes, React runs the cleanup from the previous effect before scheduling a new timeout. Fast typing keeps cancelling, and the debounced value updates only once the user pauses for `delay` ms.
