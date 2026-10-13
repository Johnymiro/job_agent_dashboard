---
title: JavaScript essentials behind React
summary: References and copies, equality and nullish checks, the array methods you'll use daily, promises and async/await, and the event loop's ordering rules.
level: core
---

Many "React bugs" are JavaScript behaviour showing through: a shared reference, a falsy zero, a sequential `await`, a stale closure. This lesson is the JavaScript that matters most when writing React.

## Values and references

Primitives (`string`, `number`, `boolean`, `null`, `undefined`, `bigint`, `symbol`) are compared by value. Objects, arrays and functions are compared by **reference**.

```js
[1, 2] === [1, 2];                     // false: two different arrays
const a = { qty: 1 };
const b = a;
b.qty = 2;                             // a.qty is now 2 as well

const copy = { ...a, side: "BUY" };    // shallow copy: nested objects are still shared
const deep = structuredClone(order);   // deep copy (no functions or DOM nodes)
```

React compares with `Object.is`, which behaves like `===` except that `Object.is(NaN, NaN)` is true and `+0` and `-0` are different.

## Equality, truthiness and defaults

```js
0 == "0";            // true: == converts types; avoid it
0 === "0";           // false: always use ===

// falsy: false, 0, -0, 0n, "", null, undefined, NaN; everything else is truthy
// (including "0", [] and {})

const pageSize = input || 20;    // 0 or "" fall back to 20, often a bug
const pageSize2 = input ?? 20;   // only null/undefined fall back

user?.address?.city;             // undefined instead of a TypeError
config.retries ??= 3;            // assign only if null/undefined
```

## Array methods you'll use daily

```js
trades.map((t) => t.qty);                        // transform each item
trades.filter((t) => t.side === "BUY");          // keep matching items
trades.find((t) => t.id === id);                 // first match, or undefined
trades.some((t) => t.qty < 0);                   // any match?
trades.every((t) => t.qty > 0);                  // all match?
trades.reduce((sum, t) => sum + t.qty, 0);       // fold into one value

trades.toSorted((a, b) => a.qty - b.qty);        // sorted COPY (sort() mutates)
trades.toReversed();                             // reversed copy
trades.with(0, updated);                         // copy with index 0 replaced
Object.groupBy(trades, (t) => t.desk);           // { FX: [...], Rates: [...] }
```

> **Pitfall:** `[10, 9, 1].sort()` gives `[1, 10, 9]`, because without a comparator `sort` compares items as strings. Always pass `(a, b) => a - b` for numbers.

## Promises and async/await

```js
async function loadDashboard() {
  try {
    const [jobs, stats] = await Promise.all([getJobs(), getStats()]);   // in parallel
    return { jobs, stats };
  } catch (err) {
    report(err);                       // a rejection anywhere lands here
    throw err;
  }
}
```

- Two `await`s in a row run **one after the other**. Start both first (`Promise.all`) when they don't depend on each other.
- `Promise.all` rejects as soon as one promise rejects; `Promise.allSettled` waits for all and reports each outcome; `Promise.race` settles with the first to settle; `Promise.any` resolves with the first to fulfil.
- An `async` function always returns a promise. Forgetting `await` gives you a `Promise` object where you expected data.

## The event loop

JavaScript runs one task at a time. After each task (a script, a click handler, a timer callback), it drains the **microtask** queue (promise callbacks, `queueMicrotask`) completely before taking the next **macrotask** (timers, I/O, UI events).

```js
console.log("A");
setTimeout(() => console.log("B"), 0);          // macrotask
Promise.resolve().then(() => console.log("C")); // microtask
console.log("D");
// A D C B
```

Long synchronous work blocks everything, including rendering and input. Split it up, or move it to a Web Worker.

## Closures (again)

A function remembers the variables in scope where it was created. In React, every render creates new handler functions that close over **that render's** props and state. That's why handlers see a snapshot, and why a long-lived callback (an interval, a WebSocket listener) can see stale values unless it uses updater functions or refs.

## Key points

- Objects and arrays compare by reference; spread copies are shallow; use `structuredClone` for deep copies.
- Use `===`; use `??` when 0 or "" are valid values.
- Prefer non-mutating array methods (`map`, `filter`, `toSorted`, `with`) in React code.
- Parallelise independent awaits with `Promise.all`.
- Synchronous code first, then all microtasks, then the next macrotask.

## Quick check

**Q:** What do `0 || 10` and `0 ?? 10` evaluate to?

- [ ] `10` and `10`
- [x] `10` and `0`
- [ ] `0` and `10`
- [ ] `0` and `0`

> `||` falls back for any falsy value, and 0 is falsy. `??` falls back only for `null` or `undefined`, so 0 is kept. Use `??` for numbers and strings where 0 or "" are valid.

**Q:** In what order are the numbers logged?

```js
setTimeout(() => console.log(1));
queueMicrotask(() => console.log(2));
Promise.resolve().then(() => console.log(3));
console.log(4);
```

- [ ] `1 2 3 4`
- [ ] `4 1 2 3`
- [x] `4 2 3 1`
- [ ] `4 3 2 1`

> Synchronous code runs first (4). Then the microtask queue drains in the order tasks were queued (2, then 3). The timer is a macrotask, so it runs last (1).

**Q:** `getA()` and `getB()` each take about 1 second and don't depend on each other. How do you get both in about 1 second?

- [ ] `const a = await getA(); const b = await getB();`
- [x] `const [a, b] = await Promise.all([getA(), getB()]);`
- [ ] `const a = getA(); const b = getB();` and use them directly
- [ ] `await Promise.race([getA(), getB()])`

> Consecutive awaits run one after the other (about 2 s). `Promise.all` starts both before waiting and resolves when both finish. Without `await`, you'd hold promises, not values; `race` only gives you the first.
