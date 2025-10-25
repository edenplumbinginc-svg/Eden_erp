#!/bin/bash
set -euo pipefail

echo "🔄 Rolling back staging deployment..."

# Get the previous successful deployment version
PREV_VERSION=$(git rev-parse HEAD~1)
echo "Rolling back to: $PREV_VERSION"

# Option 1: Git-based rollback (revert to previous commit)
# git reset --hard "$PREV_VERSION"

# Option 2: Scale down canary traffic to 0%
# kubectl scale deployment canary-deployment --replicas=0

# Option 3: Update environment variables to disable new features
# heroku config:set ESC_CANARY_PCT=0 --app your-app-name

# Option 4: Restore previous build artifacts
# aws s3 cp s3://your-bucket/builds/previous/dist.tar.gz ./
# tar -xzf dist.tar.gz

echo "✅ Rollback completed"
echo "📊 Check /ops/escalation/health to verify worker status"
echo "📋 Review incidents at /ops/release-guard for blocking details"
