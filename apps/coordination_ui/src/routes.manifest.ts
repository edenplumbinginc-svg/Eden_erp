export type RouteItem = {
  path: string;
  title: string;
  owner?: string;
  critical?: boolean;
};

export const ROUTES: RouteItem[] = [
  // Auth & Public
  { path: "/login", title: "Login", owner: "Auth", critical: true },
  { path: "/signup", title: "Sign Up", owner: "Auth", critical: true },
  { path: "/guest", title: "Guest View", owner: "Auth" },
  
  // Core
  { path: "/", title: "Home (Projects)", owner: "Core", critical: true },
  { path: "/dashboard", title: "Dashboard", owner: "Ops", critical: true },
  
  // Tasks
  { path: "/alltasks", title: "All Tasks", owner: "Tasks", critical: true },
  { path: "/tasks-delta", title: "Tasks (Delta View)", owner: "Tasks" },
  { path: "/tasks/new", title: "Create Task", owner: "Tasks", critical: true },
  { path: "/task/:taskId", title: "Task Detail", owner: "Tasks", critical: true },
  { path: "/tasks/:projectId", title: "Project Tasks", owner: "Tasks", critical: true },
  
  // Projects
  { path: "/projects-delta", title: "Projects (Delta View)", owner: "Projects" },
  { path: "/project/:projectId", title: "Project Detail", owner: "Projects", critical: true },
  { path: "/request-project", title: "Request Project", owner: "Projects" },
  
  // Reports & Analytics
  { path: "/reports", title: "Reports", owner: "Analytics", critical: true },
  { path: "/leaderboard", title: "Leaderboard", owner: "Gamification", critical: true },
  
  // Admin
  { path: "/admin/rbac", title: "Admin: RBAC", owner: "Admin", critical: true },
  { path: "/admin/decisions", title: "Admin: Auto-Decisions", owner: "Admin" },
  { path: "/admin/court-flow", title: "Admin: Court Flow", owner: "Admin" },
  
  // Operations
  { path: "/velocity", title: "Velocity Dashboard", owner: "Ops", critical: true },
  { path: "/incidents", title: "Incidents", owner: "Ops", critical: true },
  { path: "/incidents/:id", title: "Incident Detail", owner: "Ops", critical: true },
  { path: "/audit-log", title: "Audit Log", owner: "Compliance" },
  
  // Team & Collaboration
  { path: "/intake", title: "Intake Queue", owner: "Coordination" },
  { path: "/team", title: "Team", owner: "HR" },
  { path: "/archive", title: "Archive", owner: "Tasks" },
  
  // User
  { path: "/profile", title: "Profile", owner: "User" },
  
  // Documentation
  { path: "/styleguide", title: "Style Guide", owner: "Design" },
  { path: "/showcase", title: "Route Showcase", owner: "QA" },
  { path: "/routes", title: "Route Coverage Map", owner: "QA" },
  { path: "/about/eden", title: "About Eden", owner: "Product" },
];
