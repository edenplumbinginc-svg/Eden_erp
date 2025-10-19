import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import ReportsPage from "./pages/ReportsPage";

// Temporary projects page placeholder. Replace with your real component if you have one.
function ProjectsPage() {
  return (
    <div style={{ padding: 16 }}>
      <h1>Eden Coordination</h1>
      <p>Projects list here.</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <header style={{ borderBottom: "1px solid #e5e7eb", padding: 12 }}>
        <nav style={{ display: "flex", gap: 16 }}>
          <Link to="/">Projects</Link>
          <Link to="/reports">Reports</Link>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<ProjectsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
