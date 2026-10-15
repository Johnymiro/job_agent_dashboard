---
title: Type hints and Pydantic
summary: What type hints do (and don't do), the annotations you'll write every day, and Pydantic v2 for validating data at your system's edges.
level: intermediate
---

Type hints document intent and let tools like mypy and Pyright catch bugs before you run anything. They **don't** check anything at runtime. For data coming from outside (API requests, config, LLM JSON), you need real validation, which is where Pydantic comes in.

## Hints are not enforced

```python
def double(x: int) -> int:
    return x * 2

double("ab")      # returns 'abab': Python ignores the hints at runtime
```

A type checker (`mypy`, `pyright`, or your editor) reports `double("ab")` as an error. Run one in CI and treat its warnings like failing tests.

## The everyday annotations

```python
from typing import Literal, TypedDict, Protocol, Callable, Any

ids: list[str] = []
prices: dict[str, float] = {}
pair: tuple[str, int] = ("FX", 3)        # fixed length
values: tuple[float, ...] = (1.0, 2.5)   # any length
note: str | None = None                  # "str or None" (3.10+ syntax)

Side = Literal["BUY", "SELL"]            # only these strings

def apply(fn: Callable[[float], float], x: float) -> float:
    return fn(x)

class TradeDict(TypedDict):              # the shape of a plain dict
    isin: str
    qty: int

class SupportsClose(Protocol):           # structural: anything with .close()
    def close(self) -> None: ...

def first[T](items: list[T]) -> T:       # generic function (3.12+ syntax)
    return items[0]
```

> **Pitfall:** `Optional[X]` means "`X` or `None`", exactly like `X | None`. It does **not** make an argument optional; only a default value does that: `def f(note: str | None = None)`.

## Narrowing

Checkers follow your control flow. After an `isinstance` or `is None` check, the type is narrowed:

```python
def label(value: int | str | None) -> str:
    if value is None:
        return "-"
    if isinstance(value, int):
        return f"{value:,}"          # value is int here
    return value.upper()             # value is str here
```

Prefer `object` over `Any` when you mean "could be anything": `object` forces you to narrow before using it, while `Any` switches checking off.

## Pydantic v2: validate at the edges

Pydantic models declare fields with type hints, and **do** check them at runtime. FastAPI uses them for request and response bodies.

```python
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator

class Order(BaseModel):
    model_config = ConfigDict(extra="forbid")   # unknown keys are an error

    isin: str = Field(min_length=12, max_length=12)
    qty: int = Field(gt=0)
    side: Literal["BUY", "SELL"] = "BUY"
    note: str | None = None

    @field_validator("isin")
    @classmethod
    def upper_isin(cls, v: str) -> str:
        return v.upper()

order = Order.model_validate({"isin": "fr0000131104", "qty": "5"})
order.qty           # 5, an int: numeric strings are coerced in the default (lax) mode
order.isin          # 'FR0000131104'

Order.model_validate_json('{"isin": "FR0000131104", "qty": 2}')   # from a JSON string
order.model_dump()          # back to a dict
order.model_dump_json()     # back to JSON

try:
    Order.model_validate({"isin": "short", "qty": 0})
except ValidationError as err:
    print(err.errors())     # one entry per problem: location, message, input
```

```viz
py-validate-edge
```

Use `strict=True` (on a field or in `model_config`) when you don't want any coercion. `parse_obj` and `.dict()` are the old v1 names; in v2 they're `model_validate` and `model_dump`.

> **In the test:** For LLM output, validate the model's JSON with a Pydantic model (or a JSON Schema) before acting on it, and send the validation errors back to the model when you retry.

## Which one when?

| Tool | Runtime validation | Use it for |
|---|---|---|
| `TypedDict` | no | describing dict shapes you already trust |
| `@dataclass` | no | internal data objects |
| Pydantic `BaseModel` | yes | anything crossing a boundary: HTTP, files, queues, LLM output, settings |

## Key points

- Hints are for tools and readers; Python doesn't enforce them.
- `X | None` (or `Optional[X]`) is about the type, not about the argument being optional.
- Narrow with `isinstance` / `is None`; prefer `object` to `Any`.
- Pydantic validates and coerces at runtime: `model_validate`, `model_validate_json`, `model_dump`.
- Validate untrusted input once, at the edge, then work with typed objects inside.

## Quick check

**Q:** What happens when you call `double("ab")`, given `def double(x: int) -> int: return x * 2`?

- [ ] `TypeError` at call time, because the hint says `int`
- [x] It returns `'abab'`; only a type checker would flag the call
- [ ] It returns `0`
- [ ] Python refuses to import the module

> Annotations are stored but not enforced. `"ab" * 2` is valid Python, so it returns `'abab'`. Running mypy or Pyright would report the mismatch.

**Q:** In Pydantic v2's default mode, what is `Order.model_validate({"qty": "5"}).qty` for `class Order(BaseModel): qty: int`?

- [x] `5`, an `int`
- [ ] `"5"`, a `str`
- [ ] `ValidationError`, because `"5"` is a string
- [ ] `None`

> The default lax mode coerces a numeric string into an int. A string like `"five"` would raise `ValidationError`, and strict mode would reject `"5"` too.

**Q:** Which signature makes `note` truly optional to pass?

- [ ] `def save(note: Optional[str]):`
- [ ] `def save(note: str | None):`
- [x] `def save(note: str | None = None):`
- [ ] `def save(Optional[note]):`

> Only a default value lets callers leave the argument out. `Optional[str]` and `str | None` just say the value may be `None`; without a default, the argument is still required.
