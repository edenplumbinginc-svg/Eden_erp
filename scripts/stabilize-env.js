const fs = require("fs");
require("dotenv").config();
const envVars = Object.keys(process.env);
if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes("aws-1")) {
  console.error("🚫 .env tried to override Secrets with aws-1 pooler!");
  process.exit(1);
}
if (fs.existsSync(".env")) {
  const lines = fs.readFileSync(".env", "utf8").split("\n");
  const cleaned = lines.filter(l => !/^DATABASE_URL=/.test(l.trim()));
  fs.writeFileSync(".env", cleaned.join("\n"));
  console.log("✅ .env cleaned — Replit Secrets now authoritative.");
} else {
  console.log("✅ No local .env found; safe.");
}
