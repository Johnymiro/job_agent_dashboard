---
title: Fetching data and streaming LLM responses
summary: fetch done properly (errors, aborts), TanStack Query patterns, and rendering an LLM answer token by token from a streamed or SSE response.
level: advanced
---

AI products live on the network: load data, send a prompt, stream the answer back, let the user stop it. This lesson covers the plumbing that makes that feel instant and robust.

## `fetch`, done properly

```jsx
async function getJSON(url, { signal } = {}) {
  const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);   // fetch doesn't throw on 4xx/5xx
  }
  return res.json();
}
```

> **Pitfall:** `fetch` only rejects on network failures (offline, DNS, CORS, abort). An HTTP 500 **resolves** normally, with `res.ok === false`. Always check `res.ok` or `res.status`.

Every request in a UI needs three states (loading, error, data) and a way to cancel it when the component unmounts or the input changes (an `AbortController`, see the effects lesson).

## TanStack Query in practice

A query library caches by key, dedupes identical requests, refetches stale data, retries failures and handles races.

```jsx
function Jobs({ status }) {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["jobs", status],                      // different status → different cache entry
    queryFn: ({ signal }) => getJSON(`/api/jobs?status=${status}`, { signal }),
  });

  if (isPending) return <Spinner />;
  if (isError) return <ErrorBox message={error.message} />;
  return <JobTable jobs={data} />;
}
```

- `staleTime`: how long data counts as fresh (the default is 0, so it refetches on remount and window focus).
- `useMutation` with `onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jobs"] })` refreshes lists after a change.
- Optimistic updates: update the cache in `onMutate`, and roll back in `onError`.

## Streaming text with `ReadableStream`

When the backend streams plain text (FastAPI's `StreamingResponse`, for example), read `res.body` chunk by chunk:

```jsx
async function streamAnswer(prompt, onToken, signal) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();         // value is a Uint8Array chunk
    if (done) break;
    onToken(decoder.decode(value, { stream: true }));    // stream: true keeps split UTF-8 characters intact
  }
}
```

```viz
re-stream-chunks
```

In the component, append with an **updater function**, because many chunks arrive between renders:

```jsx
function Chat() {
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState(null);
  const ctrl = useRef(null);

  async function ask(prompt) {
    ctrl.current?.abort();                              // stop any previous answer
    ctrl.current = new AbortController();
    setAnswer("");
    try {
      await streamAnswer(prompt, (t) => setAnswer((a) => a + t), ctrl.current.signal);
    } catch (err) {
      if (err.name !== "AbortError") setError(err);
    }
  }

  return (
    <>
      <button onClick={() => ctrl.current?.abort()}>Stop</button>
      <Markdown text={answer} />
    </>
  );
}
```

`setAnswer(answer + t)` would be a stale closure: every chunk would be appended to the empty string from the first render, and you'd see only the last chunk.

## Server-Sent Events

SSE is a text format over a normal HTTP response: lines like `data: {...}`, with a blank line ending each event.

- `new EventSource(url)` parses it for you and reconnects automatically, but it only supports **GET**, with no custom body or headers.
- For a POST chat endpoint, use `fetch` plus the stream reader above, and parse the events yourself: buffer the text, split on blank lines, read the `data:` lines, and skip `[DONE]` sentinels.

## Rendering streamed Markdown safely

LLM output is untrusted: prompt injection can make a model emit `<img onerror=…>` or `javascript:` links. Render Markdown with a renderer that ignores raw HTML (the default in `react-markdown`), or sanitise with DOMPurify before any `dangerouslySetInnerHTML`. See the security lesson.

## Key points

- `fetch` doesn't throw on HTTP errors; check `res.ok`.
- Every request needs loading, error and data states, plus cancellation.
- Query libraries key the cache by parameters and handle refetching, retries and races.
- Stream with `res.body.getReader()` and `TextDecoder` using `{ stream: true }`.
- Append chunks with `setX(prev => prev + chunk)`; abort with an `AbortController`.
- `EventSource` is GET-only; for POST, parse SSE from `fetch` yourself.

## Quick check

**Q:** The API returns HTTP 500. What does `await fetch(url)` do?

- [ ] It throws a `TypeError`
- [x] It resolves with a response whose `ok` is `false`
- [ ] It retries three times automatically
- [ ] It returns `null`

> `fetch` rejects only when the request couldn't complete at all. HTTP error statuses are valid responses, so your code must check `res.ok` (or the status) and throw itself.

**Q:** Why pass `{ stream: true }` to `decoder.decode(chunk, …)` while streaming?

- [ ] It makes decoding faster
- [x] A multi-byte UTF-8 character can be split across two chunks; stream mode holds the partial bytes until the next chunk
- [ ] It's required for JSON responses
- [ ] It converts the chunk to a `ReadableStream`

> Without it, a character such as "é" or an emoji split across chunks decodes as garbage (U+FFFD). Stream mode keeps the incomplete bytes and combines them with the next chunk.

**Q:** A streamed answer shows only the last few characters. The code calls `setAnswer(answer + chunk)` inside the read loop. Why?

- [ ] `TextDecoder` drops earlier chunks
- [x] `answer` is the value from the render that started the loop, so each chunk is appended to the same old string
- [ ] React can't render while a fetch is in progress
- [ ] State updates are ignored during streaming

> The loop's closure captured `answer` once. Use the updater form, `setAnswer(a => a + chunk)`, so each chunk is added to the latest value.
