/* The small Markdown subset lessons are written in:

   ---                       front matter: title, summary, level (core | intermediate | advanced)
   ## Heading / ### Sub      h2s also build the "On this page" list
   paragraphs                inline `code`, **bold**, [link](https://…)
   ```python … ```           fenced code (``` or ~~~), any language label
   - item / 1. item          lists (indent continuation lines by 2 spaces)
   > **Tip:** …              callouts: Tip, Pitfall, In the test, Note (plain > is a note too)
   | a | b |                 tables (escape a literal pipe as \|)

   Everything after "## Quick check" is questions, each:
     **Q:** stem (more paragraphs allowed)
     optional fenced code
     - [ ] wrong option
     - [x] right option        (several [x] = select all that apply)
     > explanation (one paragraph)
*/
import type { Question, SnippetLang } from "@/lib/prep/types";
import type { Block, NoteTone } from "./types";

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function parseFrontmatter(src: string): { meta: Record<string, string>; body: string } {
  const m = src.replace(/\r\n/g, "\n").match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { meta: {}, body: src };
  const meta: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i > 0)
      meta[line.slice(0, i).trim()] = line
        .slice(i + 1)
        .trim()
        .replace(/^(["'])(.*)\1$/, "$2"); // optional quotes
  }
  return { meta, body: src.replace(/\r\n/g, "\n").slice(m[0].length) };
}

const TONES: Record<string, NoteTone> = { tip: "tip", pitfall: "pitfall", gotcha: "pitfall", "in the test": "test", note: "note" };
const FENCE = /^(```|~~~)\s*([\w+-]*)\s*$/;
const LIST = /^([-*]|\d+\.)\s+(.*)$/;
// a line that starts some other block, so it ends a paragraph
const BREAK = /^(```|~~~|#{2,3}\s|>|\||([-*]|\d+\.)\s)/;

const splitRow = (line: string) =>
  line
    .trim()
    .replace(/^\||\|$/g, "")
    .split(/(?<!\\)\|/)
    .map((c) => c.trim().replace(/\\\|/g, "|"));

export function parseBlocks(src: string): Block[] {
  const lines = src.split("\n");
  const out: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }

    const fence = line.match(FENCE);
    if (fence) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith(fence[1])) body.push(lines[i++]);
      i++; // closing fence
      out.push({ t: "code", lang: fence[2] || "text", src: body.join("\n") });
      continue;
    }

    const h = line.match(/^(#{2,3})\s+(.*)$/);
    if (h) {
      const text = h[2].trim();
      out.push(h[1].length === 2 ? { t: "h2", text, id: slugify(text) } : { t: "h3", text });
      i++;
      continue;
    }

    if (line.startsWith(">")) {
      const paras: string[][] = [[]];
      while (i < lines.length && lines[i].startsWith(">")) {
        const s = lines[i++].replace(/^>\s?/, "").trim();
        if (s) paras[paras.length - 1].push(s);
        else paras.push([]);
      }
      let text = paras
        .filter((p) => p.length)
        .map((p) => p.join(" "))
        .join("\n\n");
      let tone: NoteTone = "note";
      let label: string | null = null;
      const lab = text.match(/^\*\*([^*]+?):\*\*\s*/);
      if (lab && TONES[lab[1].toLowerCase()]) {
        tone = TONES[lab[1].toLowerCase()];
        label = lab[1];
        text = text.slice(lab[0].length);
      }
      out.push({ t: "note", tone, label, text });
      continue;
    }

    if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) rows.push(splitRow(lines[i++]));
      const [head, , ...rest] = rows; // second row is the |---| separator
      out.push({ t: "table", head, rows: rest });
      continue;
    }

    if (LIST.test(line)) {
      const ordered = /^\d/.test(line);
      const items: string[] = [];
      while (i < lines.length) {
        const m = lines[i].match(LIST);
        if (m) items.push(m[2]);
        else if (items.length && /^\s{2,}\S/.test(lines[i])) items[items.length - 1] += " " + lines[i].trim();
        else break;
        i++;
      }
      if (items.every((x) => /^\[[ xX]\]\s/.test(x))) {
        out.push({ t: "task", items: items.map((x) => ({ done: x[1] !== " ", text: x.slice(4).trim() })) });
      } else {
        out.push({ t: "list", ordered, items });
      }
      continue;
    }

    // paragraph: always takes the first line, so odd lines can't stall the loop
    const buf = [line.trim()];
    i++;
    while (i < lines.length && lines[i].trim() && !BREAK.test(lines[i])) buf.push(lines[i++].trim());
    out.push({ t: "p", text: buf.join(" ") });
  }
  return out;
}

const SNIPPET: Record<string, SnippetLang> = { python: "python", py: "python", js: "js", jsx: "jsx", ts: "ts", tsx: "tsx", sql: "sql" };

/** Splits off "## Quick check" and turns it into questions. Throws on a malformed one, so the build fails loudly. */
export function splitChecks(blocks: Block[], lessonId: string, file: string): { body: Block[]; checks: Question[] } {
  const at = blocks.findIndex((b) => b.t === "h2" && /^quick check$/i.test(b.text));
  if (at < 0) return { body: blocks, checks: [] };

  const checks: Question[] = [];
  type Draft = { stem: string[]; code?: Question["code"]; opts?: string[]; a?: number[]; exp?: string };
  let cur: Draft | null = null;
  const fail = (msg: string): never => {
    throw new Error(`${file}: quick check ${checks.length + 1}: ${msg}`);
  };
  const close = () => {
    if (!cur) return;
    if (!cur.opts || cur.opts.length < 2) fail("needs at least two options (- [ ] / - [x])");
    if (!cur.a!.length) fail("mark at least one option right with - [x]");
    if (!cur.exp) fail("needs an explanation (> …) after the options");
    checks.push({
      id: `${lessonId}-${checks.length + 1}`,
      s: lessonId,
      type: cur.a!.length > 1 ? "multi" : "single",
      q: cur.stem.join("\n\n"),
      code: cur.code,
      opts: cur.opts!,
      a: cur.a!,
      exp: cur.exp!,
    });
    cur = null;
  };

  for (const b of blocks.slice(at + 1)) {
    if (b.t === "p" && b.text.startsWith("**Q:**")) {
      close();
      cur = { stem: [b.text.slice(6).trim()] };
      continue;
    }
    if (!cur) return fail("expected a paragraph starting with **Q:**");
    const d: Draft = cur;
    if (b.t === "p" && !d.opts) d.stem.push(b.text);
    else if (b.t === "code" && !d.opts) d.code = { lang: SNIPPET[b.lang] ?? fail(`code language "${b.lang}" isn't supported`), src: b.src };
    else if (b.t === "task" && !d.opts) {
      d.opts = b.items.map((x) => x.text);
      d.a = b.items.flatMap((x, k) => (x.done ? [k] : []));
    } else if (b.t === "note" && d.opts && !d.exp) d.exp = (b.label ? `**${b.label}:** ` : "") + b.text;
    else fail(`unexpected ${b.t} block`);
  }
  close();
  return { body: blocks.slice(0, at), checks };
}

/** Rough reading time at 200 words a minute, code included. */
export const readingMinutes = (src: string) => Math.max(3, Math.round(src.split(/\s+/).filter(Boolean).length / 200));
