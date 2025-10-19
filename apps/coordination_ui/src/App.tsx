import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import ReportsPage from "./pages/ReportsPage";

function ProjectsPage() {
  return (
    <div style={{ padding: 16 }}>
      <h1>Eden Coordination</h1>
      <p>Projects list goes here.</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <nav style={{ display: "flex", gap: 12, padding: 12, borderBottom: "1px solid #ddd" }}>
        <Link to="/">Projects</Link>
        <Link to="/reports">Reports</Link>
      </nav>
      <Routes>
        <Route path="/" element={<ProjectsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
      </Routes>
    </BrowserRouter>
  );
}
