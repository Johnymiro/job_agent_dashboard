---
title: Testing with pytest and mocks
summary: Plain-assert tests, fixtures, parametrisation, and mocking the right target, so tests are fast, readable and catch real bugs.
level: intermediate
---

Good tests let you change code without fear. pytest keeps them short: plain functions, plain `assert`, and fixtures for setup. Mocks replace slow or unpredictable things (network, clock, randomness) so tests stay fast and deterministic.

## The basics

pytest finds files named `test_*.py` and runs functions named `test_*`. A plain `assert` is enough: when it fails, pytest shows the values on both sides.

```python
# test_pricing.py
from pricing import net_positions

def test_buy_then_partial_sell():
    trades = [
        {"isin": "A", "side": "BUY", "qty": 100},
        {"isin": "A", "side": "SELL", "qty": 40},
    ]
    assert net_positions(trades) == {"A": 60}
```

Structure each test as **arrange, act, assert**, and test one behaviour per test, named after that behaviour.

## Errors and floats

```python
import pytest

def test_rejects_unknown_side():
    with pytest.raises(ValueError, match="bad side"):
        net_positions([{"isin": "A", "side": "HOLD", "qty": 1}])

def test_fx_conversion():
    assert convert(10, rate=1.1) == pytest.approx(11.0)   # float-safe comparison
```

## Fixtures: reusable setup

A fixture is a function decorated with `@pytest.fixture`. A test asks for it by naming it as a parameter. Code after `yield` is teardown, and it runs after the test **whether the test passed or failed**.

```python
@pytest.fixture
def db():
    conn = connect(":memory:")
    create_schema(conn)
    yield conn                 # the test runs here
    conn.close()               # teardown

def test_insert_trade(db):
    insert_trade(db, isin="A", qty=5)
    assert count_trades(db) == 1
```

- `scope="module"` or `"session"` shares an expensive fixture across tests.
- Put shared fixtures in `conftest.py`; pytest finds them automatically.
- Built-ins worth knowing: `tmp_path` (a temp directory), `monkeypatch` (set env vars or attributes, undone after the test), `capsys` (captured output).

## Parametrise instead of copy-pasting

```python
@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("Card blocked", ["blocked", "card"]),
        ("", []),
        ("IBAN-mismatch!!", ["iban", "mismatch"]),
    ],
)
def test_tokenize(text, expected):
    assert sorted(tokenize(text)) == expected
```

Each tuple becomes its own test, reported separately.

## Mocking: patch where the name is looked up

`unittest.mock.patch` temporarily replaces an attribute. The rule that trips everyone up: **patch the name in the module that uses it**.

```python
# pricing.py
from rates import fetch_rate        # copies the name into pricing's namespace

def price(amount):
    return amount * fetch_rate("USD")
```

```python
from unittest.mock import patch

def test_price_uses_rate():
    with patch("pricing.fetch_rate", return_value=1.1) as fake:
        assert price(10) == pytest.approx(11.0)
    fake.assert_called_once_with("USD")
```

Patching `"rates.fetch_rate"` would change the `rates` module, but `pricing` already holds its own reference to the original function. (If `pricing` did `import rates` and called `rates.fetch_rate(...)`, then patching `"rates.fetch_rate"` would work, because the attribute is looked up on each call.)

Mock behaviour you'll use:

```python
m.return_value = 42                         # every call returns 42
m.side_effect = ConnectionError("down")     # every call raises
m.side_effect = [ConnectionError(), 42]     # 1st call raises, 2nd returns 42
m.assert_called_once_with("USD")
m.call_count
patch("pricing.fetch_rate", autospec=True)  # mock enforces the real signature
```

For `async def` functions, `patch` gives you an `AsyncMock` automatically (Python 3.8+). With the `pytest-mock` plugin, the `mocker` fixture does the same with less nesting.

> **Tip:** Mock at the boundaries (HTTP, clock, randomness, the LLM API), not your own logic. A test full of mocks of internal functions only proves the code calls itself the way it currently does.

## Key points

- Plain `assert`; `pytest.raises(..., match=...)` for errors; `pytest.approx` for floats.
- Fixtures inject setup by parameter name; code after `yield` always runs as teardown.
- `@pytest.mark.parametrize` turns one test into many cases.
- Patch where the name is looked up: `from x import f` in module `m` means patching `"m.f"`.
- `return_value` for results, `side_effect` for exceptions or a sequence of results.

## Quick check

**Q:** `billing.py` has `from time import time` and calls `time()`. Which patch target controls that call in a test?

- [ ] `patch("time.time")`
- [x] `patch("billing.time")`
- [ ] `patch("billing.time.time")`
- [ ] `patch("time")`

> The `from` import created a name `time` inside `billing`, bound to the function. Replace that name. Patching `time.time` changes the `time` module, which `billing` no longer consults.

**Q:** With `m.side_effect = [ConnectionError(), 42]`, what do the first two calls to `m()` do?

- [ ] Both return the list
- [x] The first raises `ConnectionError`, the second returns `42`
- [ ] The first returns `ConnectionError()`, the second returns `42`
- [ ] Both raise `ConnectionError`

> An iterable `side_effect` supplies one item per call. Items that are exceptions (classes or instances) are raised; everything else is returned. A third call would raise `StopIteration`.

**Q:** In a fixture, when does the code after `yield` run?

- [ ] Before the test starts
- [ ] Only if the test passes
- [x] After the test finishes, whether it passed or failed
- [ ] Only at the end of the whole test session

> pytest resumes the fixture after the test completes, pass or fail, so it's the right place for cleanup. With a wider `scope`, the teardown runs when that scope ends instead.
