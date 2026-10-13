---
title: Closures and decorators
summary: Functions that remember their surroundings, the late-binding trap in loops, and how decorators wrap functions (with and without arguments).
level: intermediate
---

Decorators show up everywhere: `@app.get`, `@pytest.fixture`, `@retry`, `@lru_cache`. They are built on closures, so understanding closures first makes decorators simple.

## Closures remember variables, not values

A function defined inside another function can use the outer function's variables, even after the outer function has returned. That combination is a **closure**.

```python
def make_multiplier(factor):
    def multiply(x):
        return x * factor     # `factor` comes from the enclosing scope
    return multiply

double = make_multiplier(2)
print(double(21))             # 42
```

The closure keeps a reference to the **variable**, and reads its value when the inner function runs. This is called late binding, and it causes the most famous Python gotcha:

```python
callbacks = []
for name in ["fx", "rates"]:
    callbacks.append(lambda: name.upper())

print([cb() for cb in callbacks])   # ['RATES', 'RATES']
```

Both lambdas look up `name` when they're called, and by then the loop has finished with `name = "rates"`. Fix it by binding the current value at definition time:

```python
callbacks.append(lambda name=name: name.upper())   # default is evaluated now

from functools import partial
callbacks.append(partial(str.upper, name))          # or bind with partial
```

> **Tip:** To change an enclosing variable (not just read it), declare it `nonlocal` inside the inner function.

## A decorator is a function that wraps a function

`@decorator` above a `def` is shorthand for reassigning the name:

```python
@log_calls
def fetch_rates(): ...

# means exactly:
def fetch_rates(): ...
fetch_rates = log_calls(fetch_rates)
```

A typical decorator returns a new function that does something before and/or after calling the original:

```python
import functools
import time

def timed(fn):
    @functools.wraps(fn)                 # keep fn's name, docstring, signature
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        try:
            return fn(*args, **kwargs)
        finally:
            print(f"{fn.__name__} took {time.perf_counter() - start:.3f}s")
    return wrapper

@timed
def load_trades(day): ...
```

`*args, **kwargs` lets the wrapper accept any arguments and pass them through unchanged.

> **Pitfall:** Without `@functools.wraps(fn)`, the decorated function reports itself as `wrapper` with no docstring. That breaks logging, debugging, and frameworks that inspect function names or signatures (FastAPI, pytest, Click).

## Decorators that take arguments

`@retry(times=3)` first calls `retry(times=3)`, and **that** returns the actual decorator. So there are three levels:

```python
def retry(times, exceptions=(Exception,)):
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            for attempt in range(1, times + 1):
                try:
                    return fn(*args, **kwargs)
                except exceptions:
                    if attempt == times:
                        raise
        return wrapper
    return decorator

@retry(times=3, exceptions=(ConnectionError,))
def get_quote(isin): ...
```

## Stacking decorators

Decorators apply bottom-up, so the one nearest the `def` wraps first. At call time, the outermost wrapper runs first.

```python
@timed        # applied second: wraps the retrying function
@retry(3)     # applied first
def get_quote(isin): ...
# get_quote = timed(retry(3)(get_quote)): the timing includes all retries
```

## Decorators you'll use from the standard library

- `@functools.cache` / `@functools.lru_cache(maxsize=1024)`: memoise results by argument. Arguments must be hashable.
- `@property`, `@classmethod`, `@staticmethod`: covered in the classes lesson.
- `@contextlib.contextmanager`: turns a generator into a `with` block (errors lesson).
- `@dataclasses.dataclass`: generates `__init__`, `__repr__` and `__eq__`.

## Key points

- A closure reads the enclosing variable when it runs, not when it's defined.
- In loops, bind the current value with a default argument (`x=x`) or `functools.partial`.
- `@d` above `def f` means `f = d(f)`.
- Always put `@functools.wraps(fn)` on the wrapper.
- A decorator with arguments is a factory: arguments, then the decorator, then the wrapper.
- Stacked decorators apply bottom-up and run top-down.

## Quick check

**Q:** What does this print?

```python
handlers = []
for desk in ["fx", "rates"]:
    handlers.append(lambda: desk.upper())
print([h() for h in handlers])
```

- [ ] `['FX', 'RATES']`
- [x] `['RATES', 'RATES']`
- [ ] `['FX', 'FX']`
- [ ] `NameError: name 'desk' is not defined`

> The lambdas look `desk` up when they're called, after the loop has finished, so both see `"rates"`. Writing `lambda desk=desk: desk.upper()` captures each value at definition time.

**Q:** What does `hello()` return?

```python
def tag(t):
    def deco(fn):
        def wrapper():
            return f"<{t}>{fn()}</{t}>"
        return wrapper
    return deco

@tag("b")
@tag("i")
def hello():
    return "hi"
```

- [x] `<b><i>hi</i></b>`
- [ ] `<i><b>hi</b></i>`
- [ ] `<b>hi</b>`
- [ ] `TypeError: tag() missing argument`

> `@tag("i")` wraps `hello` first, then `@tag("b")` wraps the result. Calling it runs the outer `b` wrapper, which calls the `i` wrapper, which calls `hello`.

**Q:** What does `@functools.wraps(fn)` do inside a decorator?

- [ ] It makes the wrapper run faster
- [x] It copies `fn`'s name, docstring and other metadata onto the wrapper and sets `__wrapped__`
- [ ] It catches exceptions raised by `fn`
- [ ] It's required for the decorator to work at all

> The decorator works without it, but the wrapped function then looks like `wrapper` to logs, debuggers and frameworks. `wraps` copies `__name__`, `__doc__`, `__module__` and more, and `__wrapped__` lets tools reach the original function.
