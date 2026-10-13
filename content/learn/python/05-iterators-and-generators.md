---
title: Iterators, generators and comprehensions
summary: How for-loops really work, why some objects can only be looped over once, and how generators process big data in constant memory.
level: intermediate
---

Data pipelines read files, stream rows and chain transformations. Generators let you do all of that lazily, one item at a time, without loading everything into memory.

## Iterables and iterators

An **iterable** is anything you can loop over: lists, dicts, strings, files, ranges. An **iterator** is the object that actually produces the values, one per `next()` call, until it raises `StopIteration`.

```python
nums = [10, 20]
it = iter(nums)     # ask the iterable for an iterator
next(it)            # 10
next(it)            # 20
next(it)            # raises StopIteration
```

A `for` loop does exactly this behind the scenes. The important difference: a list can hand out fresh iterators forever, but **an iterator is used up once it's exhausted**. `zip`, `map`, `filter`, `enumerate`, open files and generators are all iterators.

```python
pairs = zip([1, 2], ["a", "b"])
print(list(pairs))   # [(1, 'a'), (2, 'b')]
print(list(pairs))   # []  (already consumed)
```

> **Pitfall:** Passing an iterator to two consumers is a silent bug: the second one sees nothing. Materialise it with `list(...)` first if you need two passes.

## Generators

A function containing `yield` becomes a generator function. Calling it doesn't run the body; it returns a generator. Each `next()` runs until the next `yield`, hands out that value, and pauses with all local state intact.

```python
def read_trades(path):
    with open(path) as f:
        for line in f:                 # one line in memory at a time
            isin, qty = line.rstrip("\n").split(",")
            yield isin, int(qty)

def big_only(rows, minimum):
    for isin, qty in rows:
        if qty >= minimum:
            yield isin, qty

pipeline = big_only(read_trades("trades.csv"), 1_000)
for isin, qty in pipeline:            # nothing is read until here
    ...
```

Each stage pulls one row from the stage before it, so memory stays flat even for a 20 GB file.

`yield from other` hands over to another iterable, which is handy for flattening or delegating:

```python
def all_rows(paths):
    for p in paths:
        yield from read_trades(p)
```

## Comprehensions and generator expressions

```python
squares = [n * n for n in range(10)]                  # list
evens = {n for n in nums if n % 2 == 0}                # set
by_id = {t.id: t for t in trades}                      # dict
total = sum(t.qty for t in trades)                     # generator expression: no list built
pairs = [(r, c) for r in range(3) for c in range(2)]  # loops read left to right
```

Square brackets build the whole list in memory. Parentheses (or passing straight into `sum`, `max`, `any`, `"".join`) make a lazy generator.

> **Tip:** Use comprehensions to **build** values. If you're only calling a function for its side effects, write a normal `for` loop.

## `itertools` and friends

```python
from itertools import islice, chain, groupby, batched, pairwise

list(islice(pipeline, 5))                 # first 5 items of any iterator
list(chain([1, 2], [3]))                  # [1, 2, 3]
list(batched(range(7), 3))                # [(0, 1, 2), (3, 4, 5), (6,)]  (3.12+)
list(pairwise([1, 4, 9]))                 # [(1, 4), (4, 9)]  (3.10+)

for i, row in enumerate(rows, start=1):   # index + item
    ...
for a, b in zip(xs, ys, strict=True):     # raise if lengths differ (3.10+)
    ...
```

`groupby` only groups **consecutive** equal keys, so sort by the same key first:

```python
rows = sorted(trades, key=lambda t: t.desk)
for desk, group in groupby(rows, key=lambda t: t.desk):
    print(desk, sum(t.qty for t in group))
```

## Key points

- Iterables can be looped over many times; iterators only once.
- `zip`, `map`, `filter`, file objects and generators are one-shot iterators.
- A `yield` function is lazy: nothing runs until something asks for the next value.
- Chained generators process huge inputs in constant memory.
- `[...]` builds a list; `(...)` or a generator passed to `sum`/`any`/`join` doesn't.
- Sort before `itertools.groupby`.

## Quick check

**Q:** What does this print?

```python
def ticks():
    yield 1
    yield 2

g = ticks()
print(list(g), list(g))
```

- [ ] `[1, 2] [1, 2]`
- [x] `[1, 2] []`
- [ ] `[1] [2]`
- [ ] It raises `StopIteration`

> The first `list(g)` runs the generator to the end. A finished generator just stops immediately, so the second `list(g)` is empty, with no error.

**Q:** What does this print?

```python
from itertools import groupby
print([key for key, _ in groupby("aabba")])
```

- [ ] `['a', 'b']`
- [x] `['a', 'b', 'a']`
- [ ] `['a', 'a', 'b', 'b', 'a']`
- [ ] `{'a': 3, 'b': 2}`

> `groupby` starts a new group every time the key changes, so the final `a` forms its own group. Sort first if you want one group per key.

**Q:** Which line adds up a billion squares without building a billion-item list?

- [ ] `sum([n * n for n in range(10**9)])`
- [x] `sum(n * n for n in range(10**9))`
- [ ] `sum(list(map(lambda n: n * n, range(10**9))))`
- [ ] `total = [n * n for n in range(10**9)]; sum(total)`

> The generator expression produces one square at a time and `sum` consumes it immediately, so memory stays constant. The square brackets and `list(...)` versions materialise every value first.
