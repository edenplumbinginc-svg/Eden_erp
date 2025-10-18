-- Seed data for roles and permissions

INSERT INTO roles (code, name) VALUES
  ('admin', 'Administrator'),
  ('pm', 'Project Manager'),
  ('tech', 'Technician')
ON CONFLICT DO NOTHING;

INSERT INTO permissions (code, name) VALUES
  ('project.create', 'Create projects'),
  ('project.view', 'View projects'),
  ('project.edit', 'Edit projects'),
  ('task.create', 'Create tasks'),
  ('task.view', 'View tasks'),
  ('task.edit', 'Edit tasks'),
  ('task.comment', 'Comment on tasks'),
  ('user.manage', 'Manage users')
ON CONFLICT DO NOTHING;
