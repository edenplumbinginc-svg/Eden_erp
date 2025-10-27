import React from "react";
export default function Main({ children, className = "" }) {
  return (
    <main role="main" className={className || "container-xl section"}>
      {children}
    </main>
  );
}
