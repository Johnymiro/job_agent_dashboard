---
title: Names, objects and mutability
summary: How variables really work in Python, why some changes "leak" into other variables, and how to copy safely.
level: core
---

Most surprising Python behaviour comes from one idea: **a variable is a name attached to an object**, not a box that holds a value. Once that clicks, aliasing bugs, shared defaults and copying all make sense.

## Names point at objects

Assignment never copies anything. `b = a` attaches a second name to the same object.

```python
a = [1, 2, 3]
b = a          # same list, two names
b.append(4)
print(a)       # [1, 2, 3, 4]
```

```viz
py-aliasing
```

Every object has an identity (`id(x)`), a type and a value. `is` compares identity ("the same object?"); `==` compares value ("equal contents?").

```python
x = [1, 2]
y = [1, 2]
print(x == y)  # True: equal values
print(x is y)  # False: two different lists
```

> **Tip:** Use `is` only for singletons: `x is None`, `x is True`. Use `==` for everything else. Small integers and short strings are sometimes cached, so `is` can look like it works on them; don't rely on that.

## Mutable and immutable types

| Immutable (can't change in place) | Mutable (can change in place) |
|---|---|
| `int`, `float`, `bool`, `str`, `bytes`, `tuple`, `frozenset`, `None` | `list`, `dict`, `set`, `bytearray`, most class instances |

"Changing" an immutable value creates a new object and moves the name to it. Other names still point at the old object.

```python
s = "abc"
t = s
s += "d"       # builds a new string, rebinds s
print(t)       # abc

nums = [1]
alias = nums
nums += [2]    # += on a list mutates it in place
print(alias)   # [1, 2]

nums = nums + [3]  # + builds a NEW list and rebinds nums
print(alias)       # [1, 2]  (alias kept the old list)
```

> **Pitfall:** Immutability is shallow. A tuple can't be changed to hold different objects, but a list inside it can still change: `t = ([], 1); t[0].append(9)` works.

## Functions receive the object, not a copy

Python passes arguments "by assignment": the parameter becomes one more name for the caller's object. Mutating it is visible to the caller. Rebinding it is not.

```python
def add_fee(items):
    items.append("fee")      # mutates the caller's list

def reset(items):
    items = []               # only rebinds the local name

basket = ["book"]
add_fee(basket)
reset(basket)
print(basket)                # ['book', 'fee']
```

If a function shouldn't change its input, copy first (`items = list(items)`) or return a new value instead of mutating.

## Default arguments are created once

Defaults are evaluated when `def` runs, not on each call. A mutable default is shared by every call that leaves the argument out.

```python
def add(item, bucket=[]):    # ONE list, created at def time
    bucket.append(item)
    return bucket

add("EUR")
print(add("USD"))            # ['EUR', 'USD']

def add(item, bucket=None):  # the standard fix
    if bucket is None:
        bucket = []
    bucket.append(item)
    return bucket
```

```viz
py-default-arg
```

> **In the test:** "What does this print?" questions love this one. If you see `=[]`, `={}` or `=set()` in a signature, expect shared state.

## Shallow and deep copies

A **shallow copy** makes a new outer container but shares the objects inside it. A **deep copy** copies everything, recursively.

```python
import copy

grid = [[0, 0], [0, 0]]
shallow = grid.copy()        # same as list(grid) or grid[:]
deep = copy.deepcopy(grid)

grid[0][0] = 9
print(shallow[0][0])         # 9  (inner lists are shared)
print(deep[0][0])            # 0
```

```viz
py-shallow-deep
```

The same trap hides in list multiplication, which repeats references to one inner object:

```python
rows = [[0] * 2] * 2         # two references to ONE inner list
rows[0][0] = 9
print(rows)                  # [[9, 0], [9, 0]]

rows = [[0] * 2 for _ in range(2)]   # independent rows
```

`dict.copy()`, `set.copy()` and slicing are all shallow too. For flat lists of numbers or strings, shallow is enough, because the items are immutable.

## Key points

- Assignment binds a name to an object. It never copies.
- `==` compares values, `is` compares identity. Use `is` for `None`.
- A change made through one name is visible through every name for that object.
- `x += y` mutates lists in place. `x = x + y` builds a new list.
- Never use a mutable default argument. Use `None` and create the object inside the function.
- `copy()` and `[:]` are shallow. Use `copy.deepcopy` for nested data you'll modify.

## Quick check

**Q:** What does this print?

```python
x = [1, 2]
y = x
x = x + [3]
print(y)
```

- [x] `[1, 2]`
- [ ] `[1, 2, 3]`
- [ ] `[3]`
- [ ] `TypeError`

> `x + [3]` builds a new list and rebinds `x` to it. `y` still points at the original list. With `x += [3]` the list would be mutated in place and `y` would show `[1, 2, 3]`.

**Q:** Which is the right way to test for a missing value?

- [x] `if value is None:`
- [ ] `if value == None:`, because `is` compares types
- [ ] `if value is []:`
- [ ] `if value.isnull():`

> `None` is a singleton, so an identity check is exact and can't be fooled by a custom `__eq__`. `value is []` is always False, because `[]` creates a brand-new list.

**Q:** After `t = ([], 1)` and `t[0].append(5)`, what is `t`?

- [ ] It raises `TypeError: 'tuple' object does not support item assignment`
- [x] `([5], 1)`
- [ ] `(5, 1)`
- [ ] `([], 1)`, because Python copies the list first

> The tuple still holds the same two objects, so nothing about the tuple changed. The list inside it is mutable and was appended to. Immutability is shallow.
