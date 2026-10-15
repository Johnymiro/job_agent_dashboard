---
title: Lists, keys and forms
summary: Rendering lists with stable keys, using keys to reset state, controlled vs uncontrolled inputs, and handling form submission in React 19.
level: core
---

Tables of trades, lists of messages, search forms, settings pages: almost every screen renders a list or collects input. Getting keys and form state right avoids the most common UI bugs.

## Rendering lists

```jsx
function Blotter({ trades }) {
  return (
    <ul>
      {trades.map((t) => (
        <TradeRow key={t.id} trade={t} />
      ))}
    </ul>
  );
}
```

The `key` goes on the outermost element returned from `map`. Keys only need to be unique **among siblings**.

## Why keys matter

React uses keys to match items between renders. With the right key, an item keeps its state, focus and DOM node even when the list is reordered. With a bad key, state gets attached to the wrong row.

| Key | Verdict |
|---|---|
| a stable id from your data (`trade.id`) | correct |
| the array index | only for static lists that never reorder, insert or delete |
| `Math.random()` or `crypto.randomUUID()` during render | wrong: every row remounts on every render |

> **Pitfall:** With index keys, inserting a row at the top shifts every index, so React thinks each row changed, and text typed into row 1 moves to the new row.

```viz
re-keys
```

## Using `key` to reset a component

Changing a component's key makes React throw away the old instance and mount a fresh one, with fresh state. That's the clean way to reset a form when the selected record changes:

```jsx
<ClientEditor key={client.id} client={client} />
```

No effect watching `client.id` to clear fields by hand is needed.

## Controlled inputs

A controlled input gets its value from state and reports changes through `onChange`. React state is the single source of truth.

```jsx
function QtyField() {
  const [qty, setQty] = useState("");
  return (
    <input
      type="number"
      value={qty}
      onChange={(e) => setQty(e.target.value)}   // always a string
    />
  );
}
```

- `value` without `onChange` makes the field read-only, and React warns in development. Add `readOnly` if that's intended.
- `e.target.value` is **always a string**, even for `type="number"`. Convert it: `Number(qty)`.
- Checkboxes use `checked` and `e.target.checked`.
- `<select value={...}>` and `<textarea value={...}>` work the same way as inputs.

## Uncontrolled inputs

An uncontrolled input keeps its own value in the DOM. Give it a `defaultValue`, and read the value when you need it: on submit, via `FormData` or a ref.

```jsx
function SearchForm({ onSearch }) {
  function handleSubmit(e) {
    e.preventDefault();                              // stop the full-page reload
    const data = new FormData(e.currentTarget);
    onSearch(data.get("q"));
  }
  return (
    <form onSubmit={handleSubmit}>
      <input name="q" defaultValue="" />
      <button type="submit">Search</button>
    </form>
  );
}
```

Uncontrolled is simpler and re-renders less. Controlled is better when the UI reacts to each keystroke: live validation, formatting, dependent fields.

## Forms in React 19

React 19 lets a `<form>` take a function as its `action`. React calls it with the `FormData`, tracks pending state, and resets the form afterwards:

```jsx
function SubscribeForm() {
  const [state, formAction, isPending] = useActionState(async (prev, formData) => {
    const res = await subscribe(formData.get("email"));
    return res.ok ? { ok: true } : { error: "Couldn't subscribe" };
  }, {});

  return (
    <form action={formAction}>
      <input name="email" type="email" required />
      <button disabled={isPending}>{isPending ? "Saving…" : "Subscribe"}</button>
      {state.error && <p role="alert">{state.error}</p>}
    </form>
  );
}
```

For large forms with complex validation, React Hook Form (`register`, `handleSubmit`) together with a Zod schema is the common choice.

## Key points

- Keys must be stable and unique among siblings; use ids from your data.
- Index keys break with reordering or inserts; random keys remount every render.
- Change a component's `key` to reset its state.
- Controlled: `value` + `onChange`. Uncontrolled: `defaultValue`, read on submit.
- `e.target.value` is always a string; call `e.preventDefault()` in `onSubmit` handlers.
- React 19 form actions and `useActionState` handle pending state and results.

## Quick check

**Q:** What happens if list items use `key={Math.random()}`?

- [ ] Nothing: any unique key works
- [x] Every item gets a new key on each render, so React remounts them all, losing input state and focus and wasting work
- [ ] React reuses the keys from the previous render
- [ ] React throws an error about unstable keys

> Keys must be stable across renders. A new random key means "this is a different item", so React destroys and recreates every row each time.

**Q:** With `<input type="number" value={qty} onChange={e => setQty(e.target.value)} />`, the user types `5`. What is `qty + 1`?

- [ ] `6`
- [x] `"51"`
- [ ] `NaN`
- [ ] `5`

> Input values are always strings, so `qty` is `"5"` and `+ 1` concatenates. Convert with `Number(qty)` or `e.target.valueAsNumber`.

**Q:** An editor form should reset all its fields when the user selects a different client. What's the simplest correct approach?

- [ ] A `useEffect` on `client.id` that calls every field's setter
- [x] Render it as `<ClientEditor key={client.id} client={client} />`
- [ ] Reload the page
- [ ] Store the form state in a ref

> A new key tells React it's a different component instance, so it mounts fresh with initial state. No syncing effect, and no stale frame showing the old client's data.
