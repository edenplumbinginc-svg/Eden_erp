import React from "react";
export default function ProtectedCheck() {
  return (
    <div className="p-6 space-y-2">
      <h1 className="text-2xl font-semibold">Protected Check</h1>
      <p className="text-zinc-600">If you can see this without being redirected, you are authenticated.</p>
    </div>
  );
}
