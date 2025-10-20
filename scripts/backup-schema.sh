#!/bin/bash
# Phase 1C schema backup
echo "🔒 Backing up Eden ERP Phase 1C schema..."
pg_dump "$DATABASE_URL" --schema-only > backups/eden_erp_phase1c_schema.sql
echo "✅ Schema backed up to backups/eden_erp_phase1c_schema.sql"
echo ""
echo "📊 Current database stats:"
psql "$DATABASE_URL" -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;" 2>/dev/null | head -20
