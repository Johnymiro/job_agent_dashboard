---
title: Concurrency, the GIL and asyncio
summary: Threads vs processes vs asyncio, what the GIL really limits, and how to run many network calls at once without blocking the event loop.
level: advanced
---

"Make it faster" usually means "stop waiting one thing at a time". The right tool depends on whether your code waits on the network or disk (**I/O-bound**) or burns CPU (**CPU-bound**).

## The GIL in one paragraph

In standard CPython, the Global Interpreter Lock lets only **one thread run Python bytecode at a time**. Threads still help with I/O, because a thread waiting on a socket or file releases the GIL so others can run. They don't speed up pure-Python number crunching. For that you need separate processes, or libraries that do the heavy work in C and release the GIL (NumPy, pandas, many parsers). Python 3.13+ offers an optional free-threaded build without the GIL, but it isn't the default.

| Workload | Use | Why |
|---|---|---|
| Many HTTP/database calls, blocking libraries | threads (`ThreadPoolExecutor`) | waiting releases the GIL |
| Many HTTP/database calls, async libraries | `asyncio` | thousands of waits on one thread, cheap |
| Heavy pure-Python computation | processes (`ProcessPoolExecutor`) | each process has its own interpreter and GIL |

## `concurrent.futures`: the simple pools

```python
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor, as_completed

with ThreadPoolExecutor(max_workers=8) as pool:
    prices = list(pool.map(fetch_price, isins))       # results in input order

with ProcessPoolExecutor() as pool:
    futures = [pool.submit(parse_pdf, p) for p in paths]
    for fut in as_completed(futures):                 # in completion order
        handle(fut.result())                          # re-raises the task's exception
```

Process pools pickle arguments and results, so they must be picklable (no lambdas or open connections), and the startup cost only pays off for real CPU work.

## asyncio: cooperative concurrency

An `async def` function returns a **coroutine** when called. Nothing runs until it's awaited or scheduled on the event loop. Every `await` is a point where the loop can switch to other work.

```python
import asyncio

async def fetch(n):
    await asyncio.sleep(1 / n)          # stands in for a network call
    return n

async def main():
    results = await asyncio.gather(fetch(1), fetch(2), fetch(4))
    print(results)                      # [1, 2, 4], in argument order, after ~1 s

asyncio.run(main())                     # start the loop (once, at the top)
```

The tools you'll reach for:

```python
task = asyncio.create_task(fetch(3))    # starts running in the background now
...
value = await task

async with asyncio.TaskGroup() as tg:   # 3.11+: if one task fails, the rest are cancelled
    t1 = tg.create_task(fetch(1))
    t2 = tg.create_task(fetch(2))

async with asyncio.timeout(5):          # 3.11+: cancel the block after 5 s
    await slow_call()

for next_done in asyncio.as_completed(aws):   # handle results as they finish
    print(await next_done)
```

## Limiting concurrency

APIs and LLM providers have rate limits. A `Semaphore` caps how many calls are in flight:

```python
sem = asyncio.Semaphore(5)

async def limited(client, url):
    async with sem:                     # at most 5 inside at once
        resp = await client.get(url)
        return resp.json()

async def crawl(urls):
    async with httpx.AsyncClient(timeout=10) as client:
        return await asyncio.gather(*(limited(client, u) for u in urls))
```

## Never block the event loop

Everything on the loop shares one thread. A blocking call, such as `time.sleep`, `requests.get`, or a heavy computation, freezes **every** coroutine until it returns.

```python
async def bad():
    time.sleep(1)                          # blocks the whole loop
    requests.get(url)                      # blocking library: same problem

async def good():
    await asyncio.sleep(1)                 # yields to the loop
    await asyncio.to_thread(parse, blob)   # run blocking work in a thread
```

```viz
py-event-loop
```

> **Pitfall:** Calling a coroutine function without `await` does nothing except create a coroutine object, and Python warns "coroutine ... was never awaited". It's an easy bug when refactoring sync code to async.

> **Tip:** `gather` with the default `return_exceptions=False` raises the first error, but the other awaitables keep running. Use a `TaskGroup` when one failure should cancel the rest.

## Key points

- I/O-bound: threads or asyncio. CPU-bound: processes (or the C-backed library doing the work).
- The GIL stops threads running Python bytecode in parallel; it's released while waiting on I/O.
- `asyncio.gather` returns results in argument order; `as_completed` in completion order.
- Use `TaskGroup` for structured concurrency, `asyncio.timeout` for deadlines, `Semaphore` for rate limits.
- No blocking calls inside `async def`; use `asyncio.to_thread` for unavoidable blocking work.

## Quick check

**Q:** Three coroutines each call `time.sleep(1)` and are run with `asyncio.gather`. Roughly how long does it take?

- [ ] About 1 second, because gather runs them concurrently
- [x] About 3 seconds, because `time.sleep` blocks the event loop
- [ ] About 0 seconds, because sleeping is skipped in async code
- [ ] It raises `RuntimeError`

> `time.sleep` blocks the only thread the loop has, so the coroutines run one after another. With `await asyncio.sleep(1)` they would overlap and finish in about 1 second.

**Q:** What happens when you call `fetch_rates()`, an `async def` function, without `await`?

- [ ] It runs synchronously and returns the rates
- [ ] It runs in a background thread
- [x] It returns a coroutine object and nothing runs; Python warns that the coroutine was never awaited
- [ ] It raises `TypeError` immediately

> Calling a coroutine function only creates the coroutine. It runs when awaited or wrapped in a task (`asyncio.create_task`). Forgetting `await` is a silent no-op apart from the warning.

**Q:** You must call an LLM API for 500 documents, with at most 5 requests in flight. What fits best?

- [ ] `ProcessPoolExecutor(max_workers=500)`
- [x] `asyncio` with an `asyncio.Semaphore(5)` around each call, gathered together
- [ ] A plain `for` loop with `await` on each call
- [ ] `time.sleep(0.2)` between calls in a thread

> The work is waiting on the network, so async (or threads) fits. The semaphore enforces the limit of 5 while keeping 5 calls busy at all times. A plain loop would make only one call at a time.
