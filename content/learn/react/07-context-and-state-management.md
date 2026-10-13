---
title: Context, reducers and where state should live
summary: Kinds of state, Context for app-wide values, useReducer for complex updates, and why server data belongs in a query cache rather than global state.
level: intermediate
---

"Which state management library?" is usually the wrong first question. First ask what **kind** of state you have, because each kind has a natural home.

## Kinds of state

| Kind | Example | Natural home |
|---|---|---|
| local UI state | is this dropdown open | `useState` in the component |
| shared UI state | the selected trade, used by a list and a detail panel | the closest common parent, or Context |
| server state | jobs, trades, user profile from the API | a query cache (TanStack Query, SWR, your framework's loaders) |
| URL state | filters, search text, current tab | the query string, so links and the back button work |
| form state | fields being edited | the form, or a form library |

Most "global state" problems disappear once server data lives in a query cache and filters live in the URL.

## Context: values without prop drilling

Context passes a value to every component below a provider, however deep, without threading props through each level. It's ideal for things many components read and that change rarely: the theme, the current user, the locale, a feature-flag client.

```jsx
const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const value = useMemo(() => ({ user, setUser }), [user]);   // stable unless user changes
  return <AuthContext value={value}>{children}</AuthContext>;   // React 19; older: <AuthContext.Provider>
}

function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
```

Every component that reads a context re-renders when the provider's `value` changes (compared with `Object.is`). That's why the value is memoised above, and why frequently changing data, like a live price feed, is a poor fit for one big context. Split contexts by how often they change.

## useReducer: complex updates in one place

When several pieces of state change together, or the next state depends on the previous one in non-trivial ways, a reducer collects the update logic into one pure function:

```jsx
function cartReducer(state, action) {
  switch (action.type) {
    case "add": {
      const exists = state.items.some((i) => i.id === action.item.id);
      return {
        ...state,
        items: exists
          ? state.items.map((i) => (i.id === action.item.id ? { ...i, qty: i.qty + 1 } : i))
          : [...state.items, { ...action.item, qty: 1 }],
      };
    }
    case "remove":
      return { ...state, items: state.items.filter((i) => i.id !== action.id) };
    default:
      return state;                       // unknown action: same object, no re-render
  }
}

const [cart, dispatch] = useReducer(cartReducer, { items: [] });
dispatch({ type: "add", item });
```

Rules: the reducer must be **pure** (no API calls, no mutation, no randomness) and must return new objects for anything that changed. `dispatch` has a stable identity, so you can pass it down freely. A reducer combined with Context gives you a small, dependency-free store.

## Server state is a cache, not state you own

Data from the API is a **copy** of something that lives on the server. It goes stale, needs refetching, deduplicating and invalidating. A query library does all of that:

```jsx
const { data, isPending, isError } = useQuery({
  queryKey: ["jobs", { status }],          // cache key: includes the parameters
  queryFn: () => api.getJobs({ status }),
  staleTime: 30_000,                       // treat as fresh for 30 s
});

const qc = useQueryClient();
const archive = useMutation({
  mutationFn: api.archiveJob,
  onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),   // refetch affected lists
});
```

Copying query results into `useState` or a global store recreates the staleness problems the cache solves.

## When to add a store library

If lots of distant components read and write the same **client** state that changes often (a trading layout's panels, an editor's document), a small external store such as Zustand, Jotai or Redux Toolkit gives fine-grained subscriptions, so components re-render only for the slice they use. Reach for one when Context's re-render behaviour actually hurts, not by default.

## Key points

- Classify state first: local, shared UI, server, URL, form.
- Context is for widely read, rarely changing values; memoise the provider value and split contexts.
- `useReducer` centralises complex updates in a pure function; `dispatch` is stable.
- Server data belongs in a query cache with keys and invalidation, not in `useState` or a store.
- Add a store library for busy, widely shared client state.

## Quick check

**Q:** What's wrong with this reducer case?

```jsx
case "add":
  state.items.push(action.item);
  return state;
```

- [ ] Nothing; reducers may mutate state
- [x] It mutates the previous state and returns the same object, so React sees no change and the reducer is impure
- [ ] `push` doesn't exist on arrays in reducers
- [ ] A reducer must return `undefined` for add actions

> React compares the returned state with the previous one by reference. Return a new object with a new array, such as `{ ...state, items: [...state.items, action.item] }`.

**Q:** Several pages show the list of jobs from the API, with filters. Where should that data live?

- [ ] A Context provider at the root holding the fetched array
- [ ] `useState` in each page, fetched in a `useEffect`
- [x] A query cache (for example TanStack Query) keyed by the filters, invalidated after mutations
- [ ] `localStorage`

> It's server state: it needs caching, deduplication, refetching and invalidation, which a query library provides. The filters themselves are good candidates for the URL.

**Q:** When do the components that read a context re-render because of it?

- [ ] Every time any state in the app changes
- [x] When the provider's `value` changes, compared with `Object.is`
- [ ] Only when the provider unmounts
- [ ] Never: context values are read once

> React re-renders every consumer whose nearest provider received a new `value`. A value object created inline on each provider render is always "new", which is why it's usually memoised.
