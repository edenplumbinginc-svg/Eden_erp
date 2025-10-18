-- PostgreSQL schema for Phase-1

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ========== Auth / ACL ==========
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         CITEXT UNIQUE NOT NULL,
  name          TEXT,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE roles (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,      -- e.g., admin, pm, tech
  name TEXT NOT NULL
);

CREATE TABLE permissions (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,      -- e.g., task.read, task.write
  name TEXT NOT NULL
);

CREATE TABLE user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE role_permissions (
  role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- ========== Coordination ==========
CREATE TABLE projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  code        TEXT UNIQUE,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'active',
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tasks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  description    TEXT,
  status         TEXT NOT NULL DEFAULT 'open',    -- open, in_progress, blocked, done
  priority       TEXT NOT NULL DEFAULT 'normal',  -- low, normal, high, urgent
  assignee_id    UUID REFERENCES users(id),
  ball_in_court  UUID REFERENCES users(id),       -- current owner
  due_at         TIMESTAMPTZ,
  created_by     UUID REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_ball ON tasks(ball_in_court);

CREATE TABLE task_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id  UUID REFERENCES users(id),
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE task_attachments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES users(id),
  file_url    TEXT NOT NULL,
  file_name   TEXT,
  mime_type   TEXT,
  size_bytes  BIGINT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== Notifications ==========
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel     TEXT NOT NULL,             -- in_app, email, push
  event_code  TEXT NOT NULL,             -- e.g., task.created
  payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== Ball history ==========
CREATE TABLE ball_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id       UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  from_user_id  UUID REFERENCES users(id),
  to_user_id    UUID REFERENCES users(id),
  note          TEXT,
  changed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
