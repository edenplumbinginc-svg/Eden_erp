import React from "react";

type Status = "ready" | "skeleton" | "missing";

const classes: Record<Status, string> = {
  ready: "bg-green-600/15 text-green-700 ring-1 ring-green-600/20",
  skeleton: "bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/20",
  missing: "bg-rose-500/15 text-rose-700 ring-1 ring-rose-500/20",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${classes[status]}`}>
      {status.toUpperCase()}
    </span>
  );
}

export type { Status };
