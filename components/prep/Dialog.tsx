"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui";

export interface DialogSpec {
  title: string;
  body: string;
  /** spinner, no buttons, can't be dismissed (scoring in progress) */
  busy?: boolean;
  confirm?: { label: string; onConfirm: () => void };
  cancelLabel?: string;
}

export function Dialog({ spec, onClose }: { spec: DialogSpec; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // primary action first, so Enter confirms
    box.current?.querySelector<HTMLButtonElement>("[data-primary]")?.focus();
  }, [spec]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !spec.busy) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [spec, onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/45 p-4 backdrop-blur-[1px]"
      onClick={() => !spec.busy && onClose()}
    >
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby="prep-dialog-title"
        onClick={(e) => e.stopPropagation()}
        className="panel w-full max-w-md border border-line bg-surface p-5 sm:p-6"
      >
        <h2 id="prep-dialog-title" className="text-lg font-semibold tracking-tight text-fg">
          {spec.title}
        </h2>
        <p className="mt-2 flex items-start gap-2 text-sm leading-relaxed text-muted">
          {spec.busy && <span className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-line border-t-accent" />}
          {spec.body}
        </p>
        {!spec.busy && (
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button onClick={onClose} data-primary={spec.confirm ? undefined : true}>
              {spec.cancelLabel || (spec.confirm ? "Cancel" : "Close")}
            </Button>
            {spec.confirm && (
              <Button
                variant="primary"
                data-primary
                onClick={() => {
                  onClose();
                  spec.confirm!.onConfirm();
                }}
              >
                {spec.confirm.label}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
