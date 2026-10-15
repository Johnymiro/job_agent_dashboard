/* The animated lesson diagrams. A lesson places one with a fenced block holding its id:

     ```viz
     py-aliasing
     ```

   Each id has a component in components/learn/viz/index.tsx (its type makes the two lists match),
   and the build fails on an id that isn't here. */
export const VIZ_IDS = [
  "py-aliasing",
  "py-default-arg",
  "py-shallow-deep",
  "py-lookup-cost",
  "py-legb",
  "py-late-binding",
  "py-decorator-stack",
  "py-generator",
  "py-attr-lookup",
  "py-try-flow",
  "py-validate-edge",
  "py-event-loop",
  "py-patch-where",
  "py-groupby",
  "py-float-line",
  "re-render-tree",
  "re-snapshot",
  "re-immutable",
  "re-effect-life",
  "re-race",
  "re-ref-box",
  "re-keys",
  "re-memo-tree",
  "re-context",
  "re-hook-slots",
  "re-stream-chunks",
  "re-narrowing",
  "re-js-event-loop",
  "re-xss",
] as const;

export type VizId = (typeof VIZ_IDS)[number];

export const isVizId = (s: string): s is VizId => (VIZ_IDS as readonly string[]).includes(s);
