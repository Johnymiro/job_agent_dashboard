---
title: Security and testing for React apps
summary: XSS and how React protects you (and where it doesn't), secrets and tokens in the browser, and testing components the way users use them.
level: intermediate
---

A front end handles untrusted data constantly: user input, API responses, and now LLM output. It also ships everything it contains to every visitor. This lesson covers the security habits that matter, and how to test that the UI actually works.

## XSS: what React protects, and what it doesn't

React escapes any string rendered as a child or attribute, so `<p>{comment}</p>` shows `<script>` as text rather than running it. The gaps are the places where you opt out:

- **`dangerouslySetInnerHTML`** injects raw HTML. Only use it with sanitised HTML (DOMPurify), and never with user or model text directly.
- **URLs in `href` / `src`.** A `javascript:alert(1)` link runs code when clicked. Allow only the schemes you expect:

```jsx
function SafeLink({ url, children }) {
  let ok = false;
  try {
    ok = ["http:", "https:", "mailto:"].includes(new URL(url).protocol);
  } catch {}
  return ok ? <a href={url} rel="noopener noreferrer" target="_blank">{children}</a> : <span>{children}</span>;
}
```

- **Direct DOM writes** through refs (`el.innerHTML = …`) bypass React's escaping entirely.
- **Markdown renderers** that allow raw HTML.

> **In the test:** Treat LLM output like user input. Prompt injection can make a model emit `<img src=x onerror=…>` or a malicious link. Render Markdown with raw HTML disabled, or sanitise first; regex "script stripping" misses event-handler attributes and `javascript:` URLs.

## Secrets and tokens

- **Everything in the client bundle is public.** Environment variables exposed to the browser (`NEXT_PUBLIC_*`, `VITE_*`) are inlined into the JavaScript. API keys for LLM providers or databases belong on the server; the browser calls your backend, which calls the provider.
- **Tokens in `localStorage`** can be read by any script that runs on your page, so one XSS bug leaks them. `httpOnly`, `Secure`, `SameSite` cookies can't be read by JavaScript; pair them with CSRF protection for state-changing requests.
- Keep dependencies updated and audited: a compromised npm package runs with your app's privileges.

## Testing: test what the user sees

React Testing Library renders components into a simulated DOM, and its queries mirror how people find things on a page: by role, label and text, not by CSS class or component internals.

```jsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

test("submits a valid order", async () => {
  const user = userEvent.setup();
  const onSubmit = vi.fn();                                  // jest.fn() with Jest
  render(<OrderForm onSubmit={onSubmit} />);

  await user.type(screen.getByLabelText(/quantity/i), "100");
  await user.selectOptions(screen.getByRole("combobox", { name: /side/i }), "SELL");
  await user.click(screen.getByRole("button", { name: /place order/i }));

  expect(onSubmit).toHaveBeenCalledWith({ qty: 100, side: "SELL" });
  expect(await screen.findByText(/order placed/i)).toBeInTheDocument();   // findBy waits
});
```

| Query | Use when |
|---|---|
| `getBy…` | the element must be there now (throws if missing) |
| `queryBy…` | asserting something is **absent** (returns `null`) |
| `findBy…` | the element appears asynchronously (returns a promise, retries) |

Prefer `getByRole` with an accessible name, then `getByLabelText` and `getByText`; `getByTestId` is the last resort. Tests written this way also push you towards accessible markup.

**Mock the network, not your components.** Mock Service Worker (MSW) intercepts `fetch` and returns canned responses, so components run their real data-fetching code. Use Vitest or Jest for unit and component tests, and Playwright for a few end-to-end journeys in a real browser.

## Key points

- React escapes rendered strings; the risks are `dangerouslySetInnerHTML`, unvalidated URLs, direct DOM writes and raw-HTML Markdown.
- Treat LLM output as untrusted input.
- Anything shipped to the browser is public: keep secrets server-side.
- Prefer `httpOnly` cookies to `localStorage` for auth tokens.
- Test through the UI with Testing Library: `getByRole`, `userEvent`, `findBy` for async, `queryBy` for absence.
- Mock at the network boundary with MSW.

## Quick check

**Q:** A user's profile has a website URL that you render as `<a href={site}>`. What should you do?

- [ ] Nothing: React escapes attribute values
- [x] Parse it and allow only `http:` / `https:` URLs; render anything else as plain text
- [ ] Wrap it in `encodeURIComponent`
- [ ] Use `dangerouslySetInnerHTML` instead

> Escaping prevents breaking out of the attribute, but `javascript:…` is a valid URL that runs code when clicked. An allow-list of schemes is the reliable fix.

**Q:** Which query should you use to assert that an error message is NOT shown?

- [ ] `getByText(/error/i)`
- [x] `queryByText(/error/i)`, expecting `null`
- [ ] `findByText(/error/i)`
- [ ] `getByTestId("error")`

> `getBy…` throws when the element is missing, and `findBy…` waits and then rejects. `queryBy…` returns `null`, so `expect(screen.queryByText(/error/i)).not.toBeInTheDocument()` reads cleanly.

**Q:** Is it safe to use `process.env.NEXT_PUBLIC_OPENAI_KEY` in a client component to call the LLM API directly?

- [ ] Yes, environment variables are always private
- [ ] Yes, as long as the site uses HTTPS
- [x] No: `NEXT_PUBLIC_` variables are inlined into the bundle, so anyone can read the key
- [ ] Only in production builds

> Anything compiled into client code is visible in the browser's sources. Call your own backend, which holds the key server-side and can add auth, rate limits and logging.
