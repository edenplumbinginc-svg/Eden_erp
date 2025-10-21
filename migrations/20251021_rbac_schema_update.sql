-- RBAC Schema Update: Align with specification
-- Rename roles.code to roles.slug and permissions.name to permissions.description
-- Add created_at timestamps to both tables

-- Update roles table
ALTER TABLE roles RENAME COLUMN code TO slug;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER INDEX IF EXISTS roles_code_key RENAME TO roles_slug_key;

-- Update permissions table  
ALTER TABLE permissions RENAME COLUMN name TO description;
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Verify changes
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'roles';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'permissions';
