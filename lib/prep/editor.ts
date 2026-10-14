/* CodeMirror 6 setup for the prep editor. Loaded on demand (dynamic import) so other pages don't ship it. */
import { autocompletion, closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { HighlightStyle, bracketMatching, indentOnInput, indentUnit, syntaxHighlighting } from "@codemirror/language";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { EditorState } from "@codemirror/state";
import {
  EditorView,
  drawSelection,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
} from "@codemirror/view";
import { tags as t } from "@lezer/highlight";
import type { TaskLang } from "./types";

// same colors as the read-only CodeBlock highlighter
const style = HighlightStyle.define([
  { tag: [t.comment, t.lineComment, t.blockComment], color: "var(--subtle)", fontStyle: "italic" },
  { tag: [t.string, t.special(t.string), t.regexp, t.character], color: "var(--good)" },
  { tag: [t.number, t.bool, t.null, t.atom], color: "var(--info)" },
  {
    tag: [t.keyword, t.controlKeyword, t.definitionKeyword, t.moduleKeyword, t.operatorKeyword, t.self],
    color: "var(--warn)",
    fontWeight: "500",
  },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "var(--iris)" },
  { tag: [t.typeName, t.className], color: "var(--info)" },
  { tag: t.tagName, color: "var(--plum)" },
  { tag: t.attributeName, color: "var(--orchid)" },
  { tag: t.angleBracket, color: "var(--subtle)" },
  { tag: t.invalid, color: "var(--bad)" },
]);

const theme = EditorView.theme({
  "&": { height: "100%", backgroundColor: "transparent", color: "var(--fg)", fontSize: "13px" },
  "&.cm-focused": { outline: "none", boxShadow: "inset 0 0 0 2px var(--accent)" },
  ".cm-scroller": { fontFamily: "var(--font-mono)", lineHeight: "1.6", overflow: "auto" },
  ".cm-content": { padding: "14px 0", caretColor: "var(--fg)" },
  ".cm-line": { padding: "0 16px 0 14px" },
  // opaque, so long lines scrolled sideways pass under the numbers (matches the editor box: surface-2/40 on the card)
  ".cm-gutters": { backgroundColor: "color-mix(in srgb, var(--surface-2) 40%, var(--surface))", color: "var(--faint)", borderRight: "1px solid var(--line)" },
  ".cm-lineNumbers .cm-gutterElement": { padding: "0 10px 0 12px", minWidth: "42px" },
  ".cm-activeLine": { backgroundColor: "color-mix(in srgb, var(--accent) 6%, transparent)" },
  ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--muted)" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--fg)", borderLeftWidth: "2px" },
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
    { backgroundColor: "color-mix(in srgb, var(--accent) 24%, transparent)" },
  ".cm-selectionMatch": { backgroundColor: "color-mix(in srgb, var(--info) 16%, transparent)" },
  "&.cm-focused .cm-matchingBracket": { backgroundColor: "color-mix(in srgb, var(--accent) 22%, transparent)", outline: "1px solid var(--accent)" },
  "&.cm-focused .cm-nonmatchingBracket": { backgroundColor: "color-mix(in srgb, var(--bad) 22%, transparent)" },
  ".cm-panels": { backgroundColor: "var(--surface)", color: "var(--fg)", borderColor: "var(--line)" },
  ".cm-panels input, .cm-panels button": { fontFamily: "inherit", fontSize: "12px" },
  ".cm-textfield": { backgroundColor: "var(--field)", border: "1px solid var(--line)", color: "var(--fg)" },
  ".cm-button": { backgroundImage: "none", backgroundColor: "var(--surface-2)", border: "1px solid var(--line)", color: "var(--fg)" },
  ".cm-searchMatch": { backgroundColor: "color-mix(in srgb, var(--warn) 22%, transparent)" },
  ".cm-searchMatch-selected": { backgroundColor: "color-mix(in srgb, var(--warn) 40%, transparent)" },
  ".cm-tooltip": { backgroundColor: "var(--surface)", border: "1px solid var(--line)", color: "var(--fg)" },
  ".cm-tooltip-autocomplete > ul > li[aria-selected]": { backgroundColor: "var(--accent)", color: "var(--on-accent)" },
});

const language = (lang: TaskLang) =>
  lang === "python" ? python() : lang === "react" ? javascript({ jsx: true, typescript: true }) : javascript();

/** What a copy or cut takes: the selection, or the whole line when nothing is selected (CodeMirror's behaviour). */
function copiedText(state: EditorState) {
  const ranges = state.selection.ranges;
  if (ranges.some((r) => !r.empty)) return ranges.filter((r) => !r.empty).map((r) => state.sliceDoc(r.from, r.to)).join("\n");
  return ranges.map((r) => state.doc.lineAt(r.head).text).join("\n");
}

export interface EditorHandle {
  setValue: (v: string) => void;
  focus: () => void;
  destroy: () => void;
}

export function createCodeEditor(
  parent: HTMLElement,
  opts: {
    value: string;
    lang: TaskLang;
    onChange: (v: string) => void;
    onRun: () => void;
    onCopy: (text: string) => void;
    onPaste: (text: string) => void;
  },
): EditorHandle {
  const unit = opts.lang === "python" ? "    " : "  ";
  let external = false; // setValue() (Reset, another tab) isn't an edit to report back
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: opts.value,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        drawSelection(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        // word and keyword suggestions only on Ctrl+Space, like a plain editor
        autocompletion({ activateOnTyping: false }),
        highlightActiveLine(),
        highlightSelectionMatches(),
        syntaxHighlighting(style),
        indentUnit.of(unit),
        EditorState.tabSize.of(4),
        language(opts.lang),
        keymap.of([
          // Ctrl+Enter everywhere (the button says so), and ⌘+Enter on a Mac
          ...["Ctrl-Enter", "Mod-Enter"].map((key) => ({
            key,
            run: () => {
              opts.onRun();
              return true;
            },
          })),
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          indentWithTab,
        ]),
        EditorView.contentAttributes.of({
          "aria-label": "Code editor",
          spellcheck: "false",
          autocorrect: "off",
          autocapitalize: "off",
        }),
        EditorView.updateListener.of((u) => {
          if (u.docChanged && !external) opts.onChange(u.state.doc.toString());
        }),
        EditorView.domEventHandlers({
          copy: (_e, v) => opts.onCopy(copiedText(v.state)),
          cut: (_e, v) => opts.onCopy(copiedText(v.state)),
          paste: (e) => opts.onPaste(e.clipboardData?.getData("text/plain") || ""),
        }),
        theme,
      ],
    }),
  });
  return {
    setValue: (v) => {
      if (v === view.state.doc.toString()) return;
      external = true;
      try {
        view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: v } });
      } finally {
        external = false;
      }
    },
    focus: () => view.focus(),
    destroy: () => view.destroy(),
  };
}
