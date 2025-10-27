#!/usr/bin/env node
/**
 * UI Coverage Checker
 * 
 * Validates that all required pages defined in docs/ui-contract.yaml exist
 * in the codebase. This prevents shipping half-built features.
 * 
 * Usage: npm run check:ui
 */

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const root = process.cwd();
const pagesDir = path.join(root, "apps/coordination_ui/src/pages");
const componentsDir = path.join(root, "apps/coordination_ui/src/components");

/**
 * Convert route path to possible file paths
 */
function pagePaths(route) {
  const clean = route.replace(/^\//, "");
  
  // Root path
  if (!clean) {
    return ["index.jsx", "index.tsx", "index.js", "index.ts"];
  }
  
  // Handle dynamic routes like /project/[id]
  const parts = clean.split("/");
  const candidates = [];
  
  // Direct file match: /profile -> ProfilePage.jsx
  const fileName = parts[parts.length - 1];
  if (!fileName.startsWith("[")) {
    // PascalCase conversion: profile -> ProfilePage
    const pascalCase = fileName
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join("");
    candidates.push(`${pascalCase}Page.jsx`);
    candidates.push(`${pascalCase}Page.tsx`);
    candidates.push(`${pascalCase}.jsx`);
    candidates.push(`${pascalCase}.tsx`);
    
    // Handle XxxView pattern (common in this codebase)
    candidates.push(`${pascalCase}View.jsx`);
    candidates.push(`${pascalCase}View.tsx`);
    
    // Handle XxxViewer pattern
    candidates.push(`${pascalCase}Viewer.jsx`);
    candidates.push(`${pascalCase}Viewer.tsx`);
    
    // Handle XxxQueue pattern
    candidates.push(`${pascalCase}Queue.jsx`);
    candidates.push(`${pascalCase}Queue.tsx`);
    
    // Handle XxxForm pattern
    candidates.push(`${pascalCase}Form.jsx`);
    candidates.push(`${pascalCase}Form.tsx`);
    
    // Handle XxxOverview pattern
    candidates.push(`${pascalCase}Overview.jsx`);
    candidates.push(`${pascalCase}Overview.tsx`);
    
    // Handle Performance prefix (PerformanceLeaderboardPage)
    candidates.push(`Performance${pascalCase}Page.jsx`);
    candidates.push(`Performance${pascalCase}Page.tsx`);
    
    // Handle Simple prefix (SimpleProjectsPage, SimpleTasksPage)
    candidates.push(`Simple${pascalCase}Page.jsx`);
    candidates.push(`Simple${pascalCase}Page.tsx`);
    
    // Handle compound routes with -delta suffix
    if (fileName.includes("-delta")) {
      const baseName = fileName.replace("-delta", "");
      const basePascal = baseName
        .split("-")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join("");
      candidates.push(`Simple${basePascal}Page.jsx`);
      candidates.push(`Simple${basePascal}Page.tsx`);
    }
    
    // Handle compound words with reversed order (request-project -> ProjectRequestForm)
    if (fileName.includes("-")) {
      const words = fileName.split("-");
      if (words.length === 2) {
        const reversed = words.reverse()
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join("");
        candidates.push(`${reversed}Form.jsx`);
        candidates.push(`${reversed}Form.tsx`);
        candidates.push(`${reversed}Page.jsx`);
        candidates.push(`${reversed}Page.tsx`);
      }
    }
    
    // Handle "alltasks" -> "AllTasksView"
    if (fileName === "alltasks") {
      candidates.push("AllTasksView.jsx");
      candidates.push("AllTasksView.tsx");
    }
  }
  
  // Handle nested admin routes: /admin/rbac -> admin/RbacPage.jsx
  if (parts.length > 1 && parts[0] === "admin") {
    const subPath = parts.slice(1).join("/");
    const pascalCase = subPath
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join("");
    
    // Try Admin prefix: /admin/rbac -> AdminRbacPage.jsx
    candidates.push(`Admin${pascalCase}Page.jsx`);
    candidates.push(`Admin${pascalCase}Page.tsx`);
    candidates.push(`Admin${pascalCase}.jsx`);
    candidates.push(`Admin${pascalCase}.tsx`);
    
    // Try nested path: /admin/rbac -> admin/RbacPage.jsx
    candidates.push(`admin/${pascalCase}Page.jsx`);
    candidates.push(`admin/${pascalCase}Page.tsx`);
    candidates.push(`admin/${pascalCase}.jsx`);
    candidates.push(`admin/${pascalCase}.tsx`);
  }
  
  // Handle multi-part routes: /about/eden -> AboutEden.jsx (combine all parts)
  if (parts.length > 1) {
    const combinedPascal = parts
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join("");
    candidates.push(`${combinedPascal}.jsx`);
    candidates.push(`${combinedPascal}.tsx`);
    candidates.push(`${combinedPascal}Page.jsx`);
    candidates.push(`${combinedPascal}Page.tsx`);
  }
  
  // Handle dynamic routes: /task/[id] -> TaskDetail.jsx or /incidents/[id] -> IncidentDetail.jsx
  if (fileName.startsWith("[")) {
    const baseName = parts[parts.length - 2];
    if (baseName) {
      const pascalCase = baseName
        .split("-")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join("");
      candidates.push(`${pascalCase}Detail.jsx`);
      candidates.push(`${pascalCase}Detail.tsx`);
      
      // Handle singular form (incidents -> Incident, tasks -> Task)
      const singularForm = baseName.endsWith('s') ? baseName.slice(0, -1) : baseName;
      const singularPascal = singularForm
        .split("-")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join("");
      if (singularPascal !== pascalCase) {
        candidates.push(`${singularPascal}Detail.jsx`);
        candidates.push(`${singularPascal}Detail.tsx`);
      }
    }
  }
  
  // Handle /tasks/new -> CreateTaskPage.jsx
  if (parts.length === 2 && parts[1] === "new") {
    const baseName = parts[0];
    const pascalCase = baseName
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join("");
    const singular = pascalCase.endsWith("s") ? pascalCase.slice(0, -1) : pascalCase;
    candidates.push(`Create${singular}Page.jsx`);
    candidates.push(`Create${singular}Page.tsx`);
    candidates.push(`New${singular}Page.jsx`);
    candidates.push(`New${singular}Page.tsx`);
  }
  
  // Exact path match
  candidates.push(`${clean}.jsx`);
  candidates.push(`${clean}.tsx`);
  
  return candidates;
}

/**
 * Check if a page exists for the given route
 */
function exists(route) {
  const candidates = pagePaths(route);
  
  // Check pages directory first
  for (const candidate of candidates) {
    const fullPath = path.join(pagesDir, candidate);
    if (fs.existsSync(fullPath)) {
      return { exists: true, path: `pages/${candidate}` };
    }
  }
  
  // Also check components directory (for views like AllTasksView)
  for (const candidate of candidates) {
    const fullPath = path.join(componentsDir, candidate);
    if (fs.existsSync(fullPath)) {
      return { exists: true, path: `components/${candidate}` };
    }
  }
  
  return { exists: false, candidates };
}

/**
 * Main checker function
 */
function main() {
  const specPath = path.join(root, "docs/ui-contract.yaml");
  
  if (!fs.existsSync(specPath)) {
    console.error("❌ Missing docs/ui-contract.yaml");
    console.error("   Run this script from the repo root.");
    process.exit(1);
  }
  
  const doc = yaml.load(fs.readFileSync(specPath, "utf8"));
  const missing = [];
  const found = [];
  
  console.log("🔍 Checking UI coverage against contract...\n");
  
  for (const res of doc.resources || []) {
    console.log(`📦 Resource: ${res.name}`);
    
    for (const route of res.required_pages || []) {
      const result = exists(route);
      
      if (result.exists) {
        console.log(`   ✅ ${route} → ${result.path}`);
        found.push({ resource: res.name, route, path: result.path });
      } else {
        console.log(`   ❌ ${route} → NOT FOUND`);
        console.log(`      Tried: ${result.candidates.join(", ")}`);
        missing.push({ 
          resource: res.name, 
          route, 
          candidates: result.candidates 
        });
      }
    }
    
    console.log("");
  }
  
  // Summary
  console.log("━".repeat(60));
  console.log(`\n📊 Coverage Summary:\n`);
  console.log(`   ✅ Found:   ${found.length} pages`);
  console.log(`   ❌ Missing: ${missing.length} pages`);
  console.log("");
  
  if (missing.length > 0) {
    console.error("❌ UI coverage check FAILED\n");
    console.error("Missing pages:");
    for (const m of missing) {
      console.error(`\n  Resource: ${m.resource}`);
      console.error(`  Route:    ${m.route}`);
      console.error(`  Expected: ${m.candidates[0]} (or similar)`);
    }
    console.error("\n💡 Create these pages to pass the coverage check.\n");
    process.exit(1);
  }
  
  console.log("✅ UI coverage check PASSED");
  console.log("   All required pages exist!\n");
  process.exit(0);
}

// Run the checker
main();
