"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { RunDetailView } from "@/components/runs";
import { Spinner } from "@/components/ui";

// /runs/view?id=53: a query string, since a static export can't list every run id ahead
function RunView() {
  const id = Number(useSearchParams().get("id"));
  if (!id) return <div className="text-sm text-subtle">No run selected.</div>;
  return <RunDetailView id={id} />;
}

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <RunView />
    </Suspense>
  );
}
