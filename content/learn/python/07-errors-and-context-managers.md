---
title: Exceptions and context managers
summary: try / except / else / finally, raising and chaining errors well, and the with statement that guarantees cleanup.
level: intermediate
---

Production code spends a lot of effort on the unhappy path: timeouts, bad input, partial failures. Python's exceptions and `with` blocks make that path explicit and keep resources from leaking.

## The four clauses

```python
try:
    rate = fetch_rate("USD")           # code that might fail
except TimeoutError:
    rate = cached_rate("USD")          # handle a specific failure
except (KeyError, ValueError) as err:
    log.warning("bad rate data: %s", err)
    raise                              # re-raise the same exception
else:
    save(rate)                         # runs only if the try block didn't raise
finally:
    close_session()                    # always runs: success, failure or return
```

```viz
py-try-flow
```

- `else` keeps the "success only" code out of the `try`, so you don't accidentally catch errors from `save()`.
- `finally` runs even when the `try` block `return`s. Never `return` from inside `finally`: it silently swallows the exception (newer Pythons warn about it).

## Catch narrowly

```python
try:
    qty = int(payload["qty"])
except (KeyError, ValueError):         # the two failures you expect
    raise InvalidOrder("qty missing or not a number")
```

Avoid bare `except:`. It also catches `KeyboardInterrupt` and `SystemExit`, which inherit from `BaseException`. If you really need a catch-all at a boundary (a worker loop, a request handler), use `except Exception:` and log it with `log.exception(...)`, which includes the traceback.

> **Tip:** Python style is EAFP, "easier to ask forgiveness than permission": try the operation and handle the error, rather than checking every precondition first. `d.get(key)` and `try: d[key] except KeyError:` are both idiomatic.

## Raising your own errors, and chaining

Define a small hierarchy, so callers can catch your errors as a group or one by one:

```python
class PricingError(Exception):
    """Base class for pricing failures."""

class StaleRate(PricingError):
    pass

def price(isin):
    try:
        return quote_api.get(isin)
    except ConnectionError as err:
        raise PricingError(f"quote service down for {isin}") from err
```

`raise ... from err` records the original exception as `__cause__`. The traceback then shows both errors, with "The above exception was the direct cause of the following exception" between them. Use `from None` to hide an internal detail deliberately.

## Context managers: setup and guaranteed cleanup

`with` calls `__enter__` at the start and `__exit__` at the end, **even if the block raises**.

```python
with open("trades.csv") as f:          # file closed afterwards, always
    rows = f.readlines()

with lock:                              # threading.Lock released afterwards
    counter += 1
```

Writing one as a class:

```python
class Timer:
    def __enter__(self):
        self.start = time.perf_counter()
        return self                     # bound to the `as` name

    def __exit__(self, exc_type, exc, tb):
        self.elapsed = time.perf_counter() - self.start
        return False                    # False/None: let any exception propagate
```

If `__exit__` returns a true value, the exception is **suppressed** and execution continues after the `with` block. That's exactly how `contextlib.suppress` works.

## The quick way: `@contextmanager`

```python
from contextlib import contextmanager, suppress

@contextmanager
def transaction(conn):
    tx = conn.begin()
    try:
        yield tx                        # the body of the with block runs here
        tx.commit()
    except Exception:
        tx.rollback()
        raise
    finally:
        tx.close()

with transaction(conn) as tx:
    tx.execute(...)

with suppress(FileNotFoundError):       # ignore one specific error
    os.remove("cache.tmp")
```

> **Pitfall:** In a `@contextmanager` function, an exception from the `with` body is raised **at the `yield`**. Cleanup written after the `yield` without `try/finally` is skipped when the body fails.

For a variable number of resources, `contextlib.ExitStack` lets you enter context managers in a loop and closes them all.

## Key points

- `except` narrowly; `else` for success-only code; `finally` for cleanup.
- Don't use bare `except:`. At boundaries, `except Exception` plus `log.exception`.
- `raise New(...) from err` keeps the original cause in the traceback.
- `with` guarantees `__exit__` runs; returning `True` from `__exit__` swallows the exception.
- In `@contextmanager`, wrap the `yield` in `try/finally` when cleanup must always run.

## Quick check

**Q:** What is printed, in order?

```python
def f():
    try:
        return "try"
    finally:
        print("cleanup")

print(f())
```

- [x] `cleanup`, then `try`
- [ ] `try`, then `cleanup`
- [ ] only `try`
- [ ] only `cleanup`

> The `return` value is computed, then `finally` runs (printing `cleanup`) before the function actually returns. Only then does the outer `print` show `try`.

**Q:** What is printed before the traceback?

```python
from contextlib import contextmanager

@contextmanager
def opened():
    print("open")
    yield
    print("close")

with opened():
    raise ValueError("boom")
```

- [ ] `open` then `close`
- [x] only `open`
- [ ] only `close`
- [ ] nothing: the error happens first

> The exception from the body is thrown into the generator at the `yield`. With no `try/finally` around it, the line after `yield` never runs, so `close` is skipped.

**Q:** What does `raise PricingError("down") from err` add compared with a plain `raise PricingError("down")` inside the `except` block?

- [ ] Nothing, they're identical
- [x] It sets `__cause__`, so the traceback says the original error was the direct cause
- [ ] It suppresses the original error completely
- [ ] It retries the failed operation

> A plain raise inside `except` still records the original as `__context__` ("During handling of the above exception, another exception occurred"). `from err` states the causal link explicitly as `__cause__`, which reads better in logs. `from None` would hide the original.
