---
title: Classes, dunder methods and dataclasses
summary: Instance vs class attributes, the special methods that make objects behave like built-ins, properties, and dataclasses for clean data models.
level: intermediate
---

Most backend code models things: trades, clients, documents, events. Python gives you plain classes for behaviour and dataclasses for data. Knowing what each generates for you saves a lot of boilerplate and a few nasty bugs.

## Instance attributes and class attributes

Attributes set on `self` belong to one object. Attributes written in the class body are shared by every instance.

```python
class Account:
    currency = "EUR"                 # class attribute: shared

    def __init__(self, owner):
        self.owner = owner           # instance attribute: per object
        self.balance = 0

a = Account("Ana")
a.owner                              # 'Ana'
a.currency                           # 'EUR' (found on the class)
```

> **Pitfall:** A mutable class attribute is shared state. `class Cart: items = []` means every cart appends to the same list. Create mutable attributes in `__init__`.

## Dunder methods make objects feel built-in

"Dunder" (double underscore) methods let your class work with Python's syntax and built-in functions.

| You write | Python calls |
|---|---|
| `repr(x)`, the REPL, debuggers | `__repr__` |
| `str(x)`, `print(x)`, f-strings | `__str__` (falls back to `__repr__`) |
| `x == y` | `__eq__` |
| `hash(x)`, `x` in a set or as a dict key | `__hash__` |
| `len(x)` | `__len__` |
| `for item in x` | `__iter__` |
| `item in x` | `__contains__` |
| `x < y`, `sorted(xs)` | `__lt__` |

```python
class Portfolio:
    def __init__(self, positions):
        self._positions = dict(positions)

    def __repr__(self):
        return f"Portfolio({self._positions!r})"

    def __len__(self):
        return len(self._positions)

    def __iter__(self):
        return iter(self._positions.items())

    def __contains__(self, isin):
        return isin in self._positions
```

> **Pitfall:** If you define `__eq__` without `__hash__`, Python sets `__hash__` to `None` and instances can't go in sets or be dict keys. Equal objects must have equal hashes, so only make immutable objects hashable.

## Properties, classmethods, staticmethods

```python
from datetime import date

class Bond:
    def __init__(self, face, coupon_rate, maturity):
        self.face = face
        self.coupon_rate = coupon_rate
        self.maturity = maturity

    @property
    def annual_coupon(self):              # computed, read like an attribute
        return self.face * self.coupon_rate

    @classmethod
    def from_dict(cls, d):                # alternative constructor
        return cls(d["face"], d["rate"], date.fromisoformat(d["maturity"]))

    @staticmethod
    def is_valid_isin(code):              # related helper, no self or cls
        return len(code) == 12 and code[:2].isalpha()

bond = Bond.from_dict({"face": 1000, "rate": 0.03, "maturity": "2030-06-01"})
bond.annual_coupon                        # 30.0, no parentheses
```

A property can also have a setter (`@annual_coupon.setter`) to validate on assignment.

## Inheritance, briefly

```python
class Event:
    def __init__(self, at):
        self.at = at

class TradeEvent(Event):
    def __init__(self, at, isin):
        super().__init__(at)             # run the parent's setup
        self.isin = isin
```

Keep hierarchies shallow. Prefer composition (an object holding another object) when "is a" doesn't clearly fit.

## Dataclasses: classes for data

`@dataclass` reads the annotated fields and generates `__init__`, `__repr__` and `__eq__` for you.

```python
from dataclasses import dataclass, field

@dataclass
class Trade:
    isin: str
    qty: int
    side: str = "BUY"
    tags: list[str] = field(default_factory=list)   # a NEW list per instance

t = Trade("FR0000131104", 100)
print(t)          # Trade(isin='FR0000131104', qty=100, side='BUY', tags=[])
```

Useful options:

- `frozen=True`: fields can't be reassigned, and the class becomes hashable.
- `order=True`: generates `<`, `<=` and friends, comparing fields in order.
- `slots=True` (3.10+): less memory per instance, and typos in attribute names raise errors.
- `kw_only=True` (3.10+): every field must be passed by name.

> **Pitfall:** A plain `@dataclass` (with the default `eq=True`) sets `__hash__` to `None`, so `{Trade(...)}` raises a `TypeError` about an unhashable type. Use `frozen=True` for value objects you want to put in sets or use as keys.

Dataclasses don't validate types at runtime. For data arriving from outside (API payloads, LLM output), use Pydantic, covered in the typing lesson.

## Key points

- Class-body attributes are shared; set per-object state in `__init__`.
- Implement `__repr__` on every class you'll debug.
- `__eq__` without `__hash__` makes instances unhashable.
- `@property` for computed attributes, `@classmethod` for alternative constructors.
- Dataclasses: `field(default_factory=list)` for mutable defaults; `frozen=True` for immutable, hashable values.

## Quick check

**Q:** What does this print?

```python
class Cart:
    items = []
    def add(self, x):
        self.items.append(x)

a, b = Cart(), Cart()
a.add("pen")
print(b.items)
```

- [ ] `[]`
- [x] `['pen']`
- [ ] `AttributeError`
- [ ] `None`

> `items` lives on the class, and `self.items.append` mutates that one shared list. Initialise `self.items = []` in `__init__` to give each cart its own list.

**Q:** Why does `{Point(1, 2)}` raise `TypeError` for a plain `@dataclass class Point: x: int; y: int`?

- [ ] Dataclasses can never be stored in sets
- [x] The generated `__eq__` makes the dataclass set `__hash__ = None`, so instances are unhashable
- [ ] Sets need the `order=True` option
- [ ] The fields need default values

> Mutable objects that compare by value shouldn't be hashable, because their hash would change if a field changed. `@dataclass(frozen=True)` makes the fields read-only and generates a `__hash__`.

**Q:** You want `Bond.from_dict(data)` to build a bond, and subclasses to build their own type. What should `from_dict` be?

- [ ] A `@staticmethod` that calls `Bond(...)`
- [x] A `@classmethod` that calls `cls(...)`
- [ ] A `@property`
- [ ] A module-level function

> A classmethod receives the class it was called on as `cls`, so `CallableBond.from_dict(...)` returns a `CallableBond`. A staticmethod that hard-codes `Bond(...)` would always build the base class.
