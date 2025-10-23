-- Seed data for roles and permissions

INSERT INTO roles (slug, name) VALUES
  ('admin', 'Administrator'),
  ('pm', 'Project Manager'),
  ('tech', 'Technician')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO permissions (code, description) VALUES
  ('project.create', 'Create projects'),
  ('project.view', 'View projects'),
  ('project.edit', 'Edit projects'),
  ('project.delete', 'Delete projects'),
  ('task.create', 'Create tasks'),
  ('task.view', 'View tasks'),
  ('task.edit', 'Edit tasks'),
  ('task.delete', 'Delete tasks'),
  ('task.comment', 'Comment on tasks'),
  ('user.manage', 'Manage users')
ON CONFLICT (code) DO NOTHING;
