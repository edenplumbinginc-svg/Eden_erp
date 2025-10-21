import React from "react";

export default function EdenHeader() {
  return (
    <header className="w-full border-b bg-white">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo-eden.svg" alt="EDEN" className="h-7 w-auto" />
          <span className="text-sm px-2 py-0.5 rounded bg-black text-white">Coordination • Alpha</span>
        </div>
        <div className="text-xs text-gray-500">
          <span className="hidden sm:inline">Dev headers on — switch roles via DevAuth</span>
        </div>
      </div>
    </header>
  );
}
