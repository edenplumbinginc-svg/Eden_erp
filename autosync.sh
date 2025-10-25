#!/bin/bash
# Simple Git auto-sync for Replit -> GitHub
# Runs in background, pushing every 5 minutes if there are local changes

# Disable Git interactive prompts globally
export GIT_TERMINAL_PROMPT=0
export GIT_ASKPASS=true

echo "[AUTOSYNC] Starting Git auto-sync service..."
echo "[AUTOSYNC] Will check for changes every 5 minutes"

# Configure Git identity
git config --global user.email "eden-erp-bot@edenplumbing.com"
git config --global user.name "Eden ERP Auto-Sync"

# Fetch GitHub token from secrets or Replit integration
echo "[AUTOSYNC] 🔑 Fetching GitHub token..."

# Try secret first, then fall back to Replit integration
if [[ -n "$GITHUB_AUTO_SYNC_TOKEN" ]]; then
  GITHUB_TOKEN="$GITHUB_AUTO_SYNC_TOKEN"
  echo "[AUTOSYNC] ✓ Using GitHub token from secrets"
else
  GITHUB_TOKEN=$(node ~/workspace/get-github-token.js 2>/dev/null)
  if [[ -n "$GITHUB_TOKEN" ]]; then
    echo "[AUTOSYNC] ✓ Using GitHub token from Replit integration"
  fi
fi

# Configure Git to use token authentication
if [[ -n "$GITHUB_TOKEN" ]]; then
  # Set up Git credential helper
  git config --global credential.helper 'store --file ~/.git-credentials'
  
  # Write credentials file with proper format
  echo "https://oauth2:${GITHUB_TOKEN}@github.com" > ~/.git-credentials
  chmod 600 ~/.git-credentials
  
  echo "[AUTOSYNC] ✓ GitHub token configured successfully"
else
  echo "[AUTOSYNC] ⚠️ GitHub token not available — pushes may fail"
  echo "[AUTOSYNC] ⚠️ Add GITHUB_AUTO_SYNC_TOKEN secret or connect GitHub integration"
  echo "[AUTOSYNC] ⚠️ Auto-sync will continue but pushes will fail"
fi

while true; do
  cd ~/workspace 2>/dev/null || cd .
  
  # Re-fetch token each cycle (in case it expires or changes)
  if [[ -n "$GITHUB_AUTO_SYNC_TOKEN" ]]; then
    GITHUB_TOKEN="$GITHUB_AUTO_SYNC_TOKEN"
  else
    GITHUB_TOKEN=$(node ~/workspace/get-github-token.js 2>/dev/null)
  fi
  
  if [[ -z "$GITHUB_TOKEN" ]]; then
    echo "[AUTOSYNC] ⚠️ GitHub token unavailable — skipping this cycle"
    sleep 300
    continue
  fi
  
  # Get current remote URL and branch
  REPO_URL=$(git config --get remote.origin.url | sed 's|https://||' | sed 's|\.git$||')
  BRANCH=$(git branch --show-current)
  
  # Construct authenticated URL (GitHub format with token only)
  AUTH_URL="https://${GITHUB_TOKEN}@${REPO_URL}.git"
  
  # Pull first to sync any remote changes
  echo "[AUTOSYNC] 🔃 Checking for remote changes..."
  git fetch "$AUTH_URL" "$BRANCH" 2>/dev/null || true
  
  # Check if we're behind remote
  LOCAL=$(git rev-parse @ 2>/dev/null || echo "")
  REMOTE=$(git rev-parse @{u} 2>/dev/null || echo "$LOCAL")
  
  if [[ -n "$LOCAL" && "$LOCAL" != "$REMOTE" ]]; then
    echo "[AUTOSYNC] ⬇️ Pulling changes from GitHub..."
    git pull --rebase "$AUTH_URL" "$BRANCH" 2>/dev/null || echo "[AUTOSYNC] ⚠️ Pull failed (may have conflicts)"
  fi
  
  # Detect uncommitted changes
  if [[ -n "$(git status --porcelain)" ]]; then
    echo "[AUTOSYNC] 🔄 Changes detected — committing and pushing to GitHub..."
    git add -A
    git commit -m "Auto-sync from Replit $(date '+%Y-%m-%d %H:%M:%S')" || true
    
    echo "[AUTOSYNC] 📤 Pushing to GitHub..."
    if git push "$AUTH_URL" "$BRANCH" 2>&1; then
      echo "[AUTOSYNC] ✅ Successfully pushed to GitHub!"
    else
      echo "[AUTOSYNC] ⚠️ Push failed — check repository access or token permissions"
    fi
  else
    echo "[AUTOSYNC] ✅ No changes to sync at $(date '+%H:%M:%S')"
  fi
  
  sleep 300  # 5 minutes
done
