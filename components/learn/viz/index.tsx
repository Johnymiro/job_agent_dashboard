"use client";

/* Lesson diagram id → component. Each module loads on its own, so a lesson only fetches the
   diagrams it uses. Ids live in lib/learn/viz-ids.ts; the Record type keeps the lists in step. */
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { VizId } from "@/lib/learn/viz-ids";

function Loading() {
  return <div className="mt-6 h-80 animate-pulse border border-line bg-surface-2/40" />;
}

export const VIZ: Record<VizId, ComponentType> = {
  "py-aliasing": dynamic(() => import("./py-basics").then((m) => m.Aliasing), { loading: Loading }),
  "py-default-arg": dynamic(() => import("./py-basics").then((m) => m.DefaultArg), { loading: Loading }),
  "py-shallow-deep": dynamic(() => import("./py-basics").then((m) => m.ShallowDeep), { loading: Loading }),
  "py-lookup-cost": dynamic(() => import("./py-basics").then((m) => m.LookupCost), { loading: Loading }),
  "py-legb": dynamic(() => import("./py-functions").then((m) => m.Legb), { loading: Loading }),
  "py-late-binding": dynamic(() => import("./py-functions").then((m) => m.LateBinding), { loading: Loading }),
  "py-decorator-stack": dynamic(() => import("./py-functions").then((m) => m.DecoratorStack), { loading: Loading }),
  "py-generator": dynamic(() => import("./py-objects").then((m) => m.GeneratorPipeline), { loading: Loading }),
  "py-attr-lookup": dynamic(() => import("./py-objects").then((m) => m.AttrLookup), { loading: Loading }),
  "py-try-flow": dynamic(() => import("./py-objects").then((m) => m.TryFlow), { loading: Loading }),
  "py-validate-edge": dynamic(() => import("./py-objects").then((m) => m.ValidateEdge), { loading: Loading }),
  "py-event-loop": dynamic(() => import("./py-data").then((m) => m.EventLoop), { loading: Loading }),
  "py-patch-where": dynamic(() => import("./py-data").then((m) => m.PatchWhere), { loading: Loading }),
  "py-groupby": dynamic(() => import("./py-data").then((m) => m.GroupBy), { loading: Loading }),
  "py-float-line": dynamic(() => import("./py-data").then((m) => m.FloatLine), { loading: Loading }),
  "re-render-tree": dynamic(() => import("./react-render").then((m) => m.RenderTree), { loading: Loading }),
  "re-snapshot": dynamic(() => import("./react-render").then((m) => m.Snapshot), { loading: Loading }),
  "re-immutable": dynamic(() => import("./react-render").then((m) => m.Immutable), { loading: Loading }),
  "re-effect-life": dynamic(() => import("./react-render").then((m) => m.EffectLife), { loading: Loading }),
  "re-race": dynamic(() => import("./react-render").then((m) => m.Race), { loading: Loading }),
  "re-ref-box": dynamic(() => import("./react-state").then((m) => m.RefBox), { loading: Loading }),
  "re-keys": dynamic(() => import("./react-state").then((m) => m.Keys), { loading: Loading }),
  "re-memo-tree": dynamic(() => import("./react-state").then((m) => m.MemoTree), { loading: Loading }),
  "re-context": dynamic(() => import("./react-state").then((m) => m.ContextVsDrilling), { loading: Loading }),
  "re-hook-slots": dynamic(() => import("./react-state").then((m) => m.HookSlots), { loading: Loading }),
  "re-stream-chunks": dynamic(() => import("./react-async").then((m) => m.StreamChunks), { loading: Loading }),
  "re-narrowing": dynamic(() => import("./react-async").then((m) => m.Narrowing), { loading: Loading }),
  "re-js-event-loop": dynamic(() => import("./react-async").then((m) => m.JsEventLoop), { loading: Loading }),
  "re-xss": dynamic(() => import("./react-async").then((m) => m.Xss), { loading: Loading }),
};
