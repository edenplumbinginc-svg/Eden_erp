#!/bin/bash
# Simple Git auto-sync for Replit -> GitHub
# Runs in background, pushing every 5 minutes if there are local changes

echo "[AUTOSYNC] Starting Git auto-sync service..."
echo "[AUTOSYNC] Will check for changes every 5 minutes"

# Configure Git identity
git config --global user.email "eden-erp-bot@edenplumbing.com"
git config --global user.name "Eden ERP Auto-Sync"

# Configure Git to use token authentication
if [[ -n "$GITHUB_TOKEN" ]]; then
  git config --global credential.helper store
  echo "https://oauth2:${GITHUB_TOKEN}@github.com" > ~/.git-credentials
  echo "[AUTOSYNC] ✓ GitHub token configured"
else
  echo "[AUTOSYNC] ⚠️ GITHUB_TOKEN not set — pushes may fail"
fi

while true; do
  cd ~/workspace 2>/dev/null || cd .
  
  # Pull first to sync any remote changes
  echo "[AUTOSYNC] 🔃 Checking for remote changes..."
  git fetch origin main 2>/dev/null || git fetch origin master 2>/dev/null || true
  
  # Check if we're behind remote
  LOCAL=$(git rev-parse @)
  REMOTE=$(git rev-parse @{u} 2>/dev/null || echo "$LOCAL")
  
  if [ "$LOCAL" != "$REMOTE" ]; then
    echo "[AUTOSYNC] ⬇️ Pulling changes from GitHub..."
    git pull --rebase || echo "[AUTOSYNC] ⚠️ Pull failed (may have conflicts)"
  fi
  
  # Detect uncommitted changes
  if [[ -n "$(git status --porcelain)" ]]; then
    echo "[AUTOSYNC] 🔄 Changes detected — committing and pushing to GitHub..."
    git add -A
    git commit -m "Auto-sync from Replit $(date '+%Y-%m-%d %H:%M:%S')" || true
    git push origin main || git push origin master || echo "[AUTOSYNC] ⚠️ Push failed — check auth."
  else
    echo "[AUTOSYNC] ✅ No changes to sync at $(date '+%H:%M:%S')"
  fi
  
  sleep 300  # 5 minutes
done
