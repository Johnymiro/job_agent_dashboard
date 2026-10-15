---
title: Numbers, strings and pattern matching
summary: Float traps and Decimal for money, rounding and integer division rules, string formatting and encoding, and the match statement.
level: core
---

Banks care about exact numbers, and tests love questions whose answer depends on a rounding rule. This lesson covers the numeric and text behaviour worth knowing by heart, plus structural pattern matching.

## Floats are binary approximations

Floats follow IEEE 754: fast, but most decimal fractions can't be stored exactly.

```python
0.1 + 0.2                      # 0.30000000000000004
0.1 + 0.2 == 0.3               # False

import math
math.isclose(0.1 + 0.2, 0.3)   # True: compare floats with a tolerance
```

```viz
py-float-line
```

For money, use `Decimal` built **from strings**, or store integer minor units (cents).

```python
from decimal import Decimal, ROUND_HALF_UP

Decimal("0.1") + Decimal("0.2") == Decimal("0.3")   # True
Decimal(0.1)        # Decimal('0.1000000000000000055511151231257827...'): inherits the float error

price = Decimal("19.995")
price.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)   # Decimal('20.00')
```

Python's `int` has arbitrary precision: `2 ** 200` is exact, and integers never overflow.

## Rounding and division rules

```python
round(2.5), round(3.5)    # (2, 4): round-half-to-even, "banker's rounding"
round(2.675, 2)           # 2.67: 2.675 is really 2.67499999… as a float

7 // 2, -7 // 2           # (3, -4): floor division rounds DOWN, toward minus infinity
7 % 2, -7 % 2             # (1, 1): the result takes the sign of the divisor
int(-3.7)                 # -3: int() truncates toward zero
divmod(17, 5)             # (3, 2)
```

> **In the test:** `round()` uses banker's rounding, and `//` floors rather than truncating. When a question mixes negatives with `//` or `%`, work it out slowly.

## Strings

Strings are immutable sequences of Unicode characters.

```python
s = "  FR0000131104,BUY,100\n"
isin, side, qty = s.strip().split(",")
",".join(["a", "b", "c"])          # 'a,b,c'
"card fee".title()                 # 'Card Fee'
"FX-001".startswith(("FX", "RT"))  # True: a tuple checks several prefixes
"fee" in "card fee charged"        # True: substring test
```

Build big strings with `"".join(parts)`, not `+=` in a loop: each `+=` creates a new string.

**f-strings** handle almost all formatting:

```python
amount, rate = 1234567.891, 0.0525
f"{amount:,.2f}"          # '1,234,567.89'
f"{rate:.1%}"             # '5.2%'
f"{42:05d}"               # '00042'
f"{'FX':>6}|"             # '    FX|'
f"{amount=}"              # 'amount=1234567.891': handy for debugging (3.8+)
```

**Text vs bytes:** `str` is text, `bytes` is raw data. Convert explicitly at the edges, and always name the encoding:

```python
data = "café".encode("utf-8")      # b'caf\xc3\xa9'
text = data.decode("utf-8")        # 'café'
open("out.csv", "w", encoding="utf-8")
```

## Structural pattern matching (`match`, 3.10+)

`match` compares a value against **patterns** that can check structure and pull values out at the same time.

```python
def handle(event):
    match event:
        case {"type": "tool_call", "name": name, "args": args}:
            return run_tool(name, args)          # mapping pattern: extra keys ignored
        case {"type": "text", "text": str(text)}:
            return text                          # class pattern checks the type
        case ["move", x, y] if x >= 0:           # sequence pattern + guard
            return f"move to {x},{y}"
        case ["quit" | "exit"]:                  # alternatives
            return "bye"
        case _:                                  # wildcard: anything else
            return "unknown"
```

- A bare name in a pattern (`name`, `x`) **captures** a value; it doesn't compare against a variable. To compare against a constant, use a dotted name (`Side.BUY`) or a literal.
- Mapping patterns match if the listed keys exist; other keys are ignored. Add `**rest` to capture them.
- Cases are tried top to bottom, and the first match wins.

## Key points

- Never compare floats with `==`; use `math.isclose` or `Decimal`.
- Build `Decimal`s from strings; use `quantize` with an explicit rounding mode for money.
- `round()` rounds half to even; `//` floors toward minus infinity; `%` follows the divisor's sign.
- `"".join(...)` for building strings; f-string format specs for numbers.
- Encode and decode at the edges, with an explicit `utf-8`.
- In `match`, bare names capture and mapping patterns ignore extra keys.

## Quick check

**Q:** What does `(round(2.5), round(3.5))` evaluate to?

- [ ] `(3, 4)`
- [x] `(2, 4)`
- [ ] `(2, 3)`
- [ ] `(3, 3)`

> `round` uses round-half-to-even, so exact halves go to the nearest even integer: 2.5 → 2 and 3.5 → 4. Use `Decimal.quantize(..., rounding=ROUND_HALF_UP)` when you need "school" rounding.

**Q:** What is `-7 // 2`?

- [ ] `-3`
- [x] `-4`
- [ ] `-3.5`
- [ ] `3`

> Floor division rounds toward minus infinity, so −3.5 becomes −4. `int(-7 / 2)` would truncate toward zero and give −3.

**Q:** What does `kind("sell 10 AAPL")` return?

```python
def kind(cmd):
    match cmd.split():
        case ["buy", qty]:
            return f"buy {qty}"
        case ["sell", *rest]:
            return f"sell {len(rest)}"
        case _:
            return "unknown"
```

- [ ] `"unknown"`
- [ ] `"sell 10"`
- [x] `"sell 2"`
- [ ] `"buy 10"`

> `cmd.split()` is `["sell", "10", "AAPL"]`. It doesn't fit the two-item `buy` pattern; the second pattern matches `"sell"` and captures the remaining two items in `rest`.
