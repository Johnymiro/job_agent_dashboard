---
title: Functions, arguments and scope
summary: Every kind of parameter (positional, keyword-only, *args, **kwargs), unpacking, and how Python decides which variable a name refers to.
level: core
---

Functions are where most code lives, and their signatures decide how easy they are to call correctly. This lesson covers the parameter kinds you'll meet, how values flow in and out, and the scope rules behind `UnboundLocalError`.

## The parameter kinds

```python
def place(isin, qty=1, *extra, side="BUY", **meta):
    ...
```

| Kind | Example | Passed as |
|---|---|---|
| positional-or-keyword | `isin`, `qty=1` | `place("X", 5)` or `place(isin="X", qty=5)` |
| var-positional | `*extra` | leftover positional args, collected into a **tuple** |
| keyword-only | `side="BUY"` (after `*` or `*args`) | only by name: `side="SELL"` |
| var-keyword | `**meta` | leftover keyword args, collected into a **dict** |

```python
def show(*args, **kwargs):
    print(args, kwargs)

show(1, 2, desk="FX")   # (1, 2) {'desk': 'FX'}
```

A bare `*` makes everything after it keyword-only, without collecting extras. A `/` makes everything before it positional-only (Python 3.8+).

```python
def book(isin, *, qty, side="BUY"): ...
book("FR0000131104", qty=10)     # OK
book("FR0000131104", 10)         # TypeError: qty must be named

def ratio(a, b, /): ...
ratio(1, 2)                      # OK
ratio(a=1, b=2)                  # TypeError: a and b are positional-only
```

> **Tip:** Keyword-only parameters make call sites readable and safe: `transfer(src, dst, amount=100, dry_run=True)` can't silently swap two numbers.

## Unpacking, in calls and in assignments

`*` and `**` also work the other way round: they spread a sequence or a dict into arguments.

```python
args = ("FR0000131104",)
opts = {"qty": 10, "side": "SELL"}
book(*args, **opts)

first, *rest = [1, 2, 3, 4]      # first=1, rest=[2, 3, 4]
low, high = min_max(prices)      # a function returning a tuple
```

Returning "several values" is really returning one tuple: `return low, high`.

## Functions are objects

You can pass a function around, store it, and return it, just like any other value. A `lambda` is a small anonymous function limited to one expression.

```python
def apply_all(fns, x):
    return [f(x) for f in fns]

apply_all([abs, str, lambda v: v * 2], -3)   # [3, '-3', -6]

handlers = {"BUY": buy, "SELL": sell}        # dispatch table
handlers[order.side](order)
```

## Scope: the LEGB rule

When Python looks up a name, it searches **L**ocal, then **E**nclosing functions, then **G**lobal (module), then **B**uilt-ins.

The catch: if a function **assigns** to a name anywhere in its body, that name is local for the whole function.

```python
count = 0

def bump():
    count += 1      # reads local `count` before it's assigned

bump()              # UnboundLocalError
```

Fix it by passing the value in and returning the new one, or declare intent explicitly:

```python
def bump():
    global count     # module-level variable (use sparingly)
    count += 1

def make_counter():
    n = 0
    def tick():
        nonlocal n   # the enclosing function's variable
        n += 1
        return n
    return tick
```

> **Pitfall:** Don't name variables `list`, `dict`, `id`, `type` or `input`. Your name shadows the built-in in that scope, and a later `list(...)` call fails in confusing ways.

## Key points

- `*args` collects extra positional arguments into a tuple; `**kwargs` collects extra keyword arguments into a dict.
- Parameters after `*` are keyword-only; parameters before `/` are positional-only.
- `f(*seq, **mapping)` spreads values into a call; `a, *rest = seq` collects in an assignment.
- Functions are values: pass them, store them, return them.
- Assigning to a name inside a function makes it local everywhere in that function. Use `nonlocal` or `global` only when you really mean to rebind an outer variable.

## Quick check

**Q:** What does this print?

```python
def show(a, *args, **kwargs):
    print(a, args, kwargs)

show(1, 2, 3, x=4)
```

- [x] `1 (2, 3) {'x': 4}`
- [ ] `1 [2, 3] {'x': 4}`
- [ ] `(1, 2, 3) {} {'x': 4}`
- [ ] `TypeError`

> `a` takes the first positional argument. The rest go into `args` as a tuple (not a list) and the keyword argument goes into the `kwargs` dict.

**Q:** Given `def ratio(a, b, /): return a / b`, which calls raise `TypeError`?

- [ ] `ratio(6, 3)`
- [x] `ratio(a=6, b=3)`
- [ ] `ratio(*[6, 3])`
- [x] `ratio(6, b=3)`

> Parameters before `/` are positional-only, so neither `a` nor `b` can be passed by name. Unpacking a list with `*` still passes them positionally, so that call is fine.

**Q:** Why does calling `bump()` here raise `UnboundLocalError`?

```python
total = 0
def bump():
    total += 1
```

- [ ] Integers are immutable, so `+=` is not allowed on them
- [x] The assignment makes `total` local to `bump`, and it's read before it has a value
- [ ] Module variables can't be read inside functions
- [ ] `+=` only works on lists

> Python decides scope when it compiles the function: any assignment to `total` makes it local throughout `bump`. `total += 1` then reads the local before it exists. Pass the value in and return it, or declare `global total`.
