---
title: Built-in collections and Big-O
summary: Choosing between list, tuple, dict and set, what each operation costs, and the collections module helpers worth knowing.
level: core
---

Picking the right container is the cheapest performance win in Python. Many "optimise this loop" questions are really "use a set or a dict instead of a list".

## Pick the container by what you need

| Type | Ordered | Mutable | Duplicates | Use it for |
|---|---|---|---|---|
| `list` | yes | yes | yes | sequences you append to and iterate |
| `tuple` | yes | no | yes | fixed records, dict keys, returning several values |
| `dict` | insertion order | yes | unique keys | lookups by key, counting, grouping |
| `set` | no | yes | no | membership tests, de-duplication, set maths |

Dicts keep insertion order (guaranteed since Python 3.7). Sets have no order at all; never depend on how a set prints.

## What operations cost

| Operation | list | dict / set |
|---|---|---|
| `x in c` | O(n), scans | O(1) on average, hashes |
| get by index / key | O(1) | O(1) average |
| append / add | O(1) amortised | O(1) average |
| insert or pop at the front | O(n), shifts everything | n/a |
| delete by value | O(n) | O(1) average |
| sort | O(n log n) | n/a |

The classic slow pattern is a membership test against a list inside a loop, which makes the whole thing O(n × m):

```python
blocked = load_blocked_ids()          # a list of 100k ids
clean = [t for t in trades if t.id not in blocked]   # slow

blocked = set(load_blocked_ids())     # build once: O(n)
clean = [t for t in trades if t.id not in blocked]   # each check O(1)
```

> **Pitfall:** Only hashable values can go in a set or be dict keys: numbers, strings, tuples of hashables, frozensets. Lists and dicts can't: you get a `TypeError` that mentions an unhashable type.

## Dict essentials

```python
prices = {"EUR": 1.0, "USD": 1.08}

prices.get("GBP")            # None instead of KeyError
prices.get("GBP", 0.0)       # with a default
prices.setdefault("JPY", 160)  # insert if missing, return the value

for code, rate in prices.items():   # iterate key/value pairs
    ...

merged = prices | {"CHF": 0.95}     # merge into a new dict (3.9+)
squares = {n: n * n for n in range(4)}   # dict comprehension
```

## Sets and set maths

```python
mine = {"py", "sql", "react"}
job = {"py", "airflow", "sql"}

mine & job    # {'py', 'sql'}          intersection
mine | job    # union
job - mine    # {'airflow'}            what I'm missing
mine ^ job    # in exactly one of them
```

## The `collections` module

```python
from collections import Counter, defaultdict, deque

words = "card fee card refund card".split()
Counter(words).most_common(2)     # [('card', 3), ('fee', 1)]

by_desk = defaultdict(list)       # missing keys start as []
for trade in trades:
    by_desk[trade.desk].append(trade)

recent = deque(maxlen=3)          # keeps only the last 3 items
for price in [1, 2, 3, 4]:
    recent.append(price)
print(recent)                     # deque([2, 3, 4], maxlen=3)
```

`deque` gives O(1) `appendleft` and `popleft`, so use it for queues instead of `list.pop(0)`.

## Sorting

`sorted(x)` returns a new list. `x.sort()` sorts in place and **returns `None`**.

```python
trades = [("FX", 300), ("Rates", 50), ("FX", 100)]

sorted(trades, key=lambda t: t[1])               # by amount, ascending
sorted(trades, key=lambda t: t[1], reverse=True)  # descending
sorted(trades, key=lambda t: (t[0], -t[1]))       # desk A→Z, then amount high→low
```

Python's sort is **stable**: items that compare equal keep their original order. That's what makes multi-key sorting by tuple keys work. For the top k of a big list, `heapq.nlargest(k, items, key=...)` is cheaper than a full sort.

## De-duplicating while keeping order

```python
ids = [3, 1, 3, 2, 1]
list(set(ids))            # unique, but the order is lost
list(dict.fromkeys(ids))  # [3, 1, 2]: unique AND first-seen order, O(n)
```

## Key points

- Membership tests: set or dict, O(1). List, O(n).
- Dicts keep insertion order. Sets don't have an order.
- `Counter` counts, `defaultdict` groups, `deque` is a fast queue.
- `list.sort()` returns `None`. Use `sorted()` when you need the result.
- Sort by several keys with a tuple key; negate numbers to flip one of them.
- `dict.fromkeys(xs)` de-duplicates while keeping order.

## Quick check

**Q:** What is `result` after this runs?

```python
amounts = [30, 10, 20]
result = amounts.sort()
```

- [ ] `[10, 20, 30]`
- [x] `None`
- [ ] `[30, 20, 10]`
- [ ] It raises `TypeError`

> `list.sort()` sorts the list in place and returns `None`, so `amounts` is now sorted but `result` is `None`. Use `sorted(amounts)` to get a new sorted list.

**Q:** You check 50,000 incoming ids against a list of 200,000 known ids. What's the main fix?

- [ ] Sort the known list first
- [x] Convert the known ids to a `set` once, then test membership against it
- [ ] Use a `while` loop instead of a comprehension
- [ ] Use `list.index()` instead of `in`

> `in` on a list scans it, so 50k checks cost about 50k × 200k comparisons. A set hashes each id, so every check is O(1) on average and the total is roughly linear.

**Q:** Which key sorts `(name, count)` pairs by count, highest first, and then by name A→Z for ties?

- [x] `key=lambda p: (-p[1], p[0])`
- [ ] `key=lambda p: (p[1], p[0]), reverse=True`
- [ ] `key=lambda p: p[1] + p[0]`
- [ ] `key=lambda p: (p[0], -p[1])`

> Tuples compare element by element, so `(-count, name)` puts the highest count first and breaks ties alphabetically. Using `reverse=True` would also reverse the names, giving Z→A for ties.
