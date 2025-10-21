import { pgTable, unique, uuid, text, foreignKey, timestamp, bigint, index, jsonb, boolean, integer, primaryKey } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const roles = pgTable("roles", {
        id: uuid("id").defaultRandom().primaryKey().notNull(),
        slug: text("slug").notNull(),
        name: text("name").notNull(),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
        unique("roles_slug_key").on(table.slug),
]);

export const permissions = pgTable("permissions", {
        id: uuid("id").defaultRandom().primaryKey().notNull(),
        code: text("code").notNull(),
        description: text("description").notNull(),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
        unique("permissions_code_key").on(table.code),
]);

export const projects = pgTable("projects", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        name: text().notNull(),
        code: text(),
        description: text(),
        status: text().default('active').notNull(),
        createdBy: uuid("created_by"),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
        foreignKey({
                        columns: [table.createdBy],
                        foreignColumns: [users.id],
                        name: "projects_created_by_fkey"
                }),
        unique("projects_code_key").on(table.code),
]);

export const taskComments = pgTable("task_comments", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        taskId: uuid("task_id").notNull(),
        authorId: uuid("author_id"),
        body: text().notNull(),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
        foreignKey({
                        columns: [table.taskId],
                        foreignColumns: [tasks.id],
                        name: "task_comments_task_id_fkey"
                }).onDelete("cascade"),
        foreignKey({
                        columns: [table.authorId],
                        foreignColumns: [users.id],
                        name: "task_comments_author_id_fkey"
                }),
]);

export const taskAttachments = pgTable("task_attachments", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        taskId: uuid("task_id").notNull(),
        uploadedBy: uuid("uploaded_by"),
        fileUrl: text("file_url").notNull(),
        fileName: text("file_name"),
        mimeType: text("mime_type"),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        sizeBytes: bigint("size_bytes", { mode: "number" }),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
        foreignKey({
                        columns: [table.taskId],
                        foreignColumns: [tasks.id],
                        name: "task_attachments_task_id_fkey"
                }).onDelete("cascade"),
        foreignKey({
                        columns: [table.uploadedBy],
                        foreignColumns: [users.id],
                        name: "task_attachments_uploaded_by_fkey"
                }),
]);

export const ballHistory = pgTable("ball_history", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        taskId: uuid("task_id").notNull(),
        fromUserId: uuid("from_user_id"),
        toUserId: uuid("to_user_id"),
        note: text(),
        changedAt: timestamp("changed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
        foreignKey({
                        columns: [table.taskId],
                        foreignColumns: [tasks.id],
                        name: "ball_history_task_id_fkey"
                }).onDelete("cascade"),
        foreignKey({
                        columns: [table.fromUserId],
                        foreignColumns: [users.id],
                        name: "ball_history_from_user_id_fkey"
                }),
        foreignKey({
                        columns: [table.toUserId],
                        foreignColumns: [users.id],
                        name: "ball_history_to_user_id_fkey"
                }),
]);

export const notifications = pgTable("notifications", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        userId: uuid("user_id"),
        channel: text().notNull(),
        eventCode: text("event_code").notNull(),
        payload: jsonb().default({}).notNull(),
        readAt: timestamp("read_at", { withTimezone: true, mode: 'string' }),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
        scheduleAt: timestamp("schedule_at", { withTimezone: true, mode: 'string' }),
        type: text(),
        projectId: uuid("project_id"),
        taskId: uuid("task_id"),
        actorId: uuid("actor_id"),
        actorEmail: text("actor_email"),
}, (table) => [
        index("idx_notifications_project").using("btree", table.projectId.asc().nullsLast(), table.createdAt.desc().nullsFirst()),
        index("idx_notifications_task").using("btree", table.taskId.asc().nullsLast()),
        foreignKey({
                        columns: [table.userId],
                        foreignColumns: [users.id],
                        name: "notifications_user_id_fkey"
                }).onDelete("cascade"),
]);

export const users = pgTable("users", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        // Using text for citext (case-insensitive text extension)
        email: text("email").notNull(),
        name: text(),
        avatarUrl: text("avatar_url"),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
        role: text().default('User'),
        department: text(),
}, (table) => [
        unique("users_email_key").on(table.email),
]);

export const tasks = pgTable("tasks", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        projectId: uuid("project_id").notNull(),
        title: text().notNull(),
        description: text(),
        status: text().default('open').notNull(),
        priority: text().default('normal').notNull(),
        assigneeId: uuid("assignee_id"),
        ballInCourt: uuid("ball_in_court"),
        dueAt: timestamp("due_at", { withTimezone: true, mode: 'string' }),
        createdBy: uuid("created_by"),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
        tags: text().array().default([""]),
        origin: text(),
        deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
        lastActivityAt: timestamp("last_activity_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
        index("idx_tasks_ball").using("btree", table.ballInCourt.asc().nullsLast().op("uuid_ops")),
        index("idx_tasks_project").using("btree", table.projectId.asc().nullsLast().op("uuid_ops")),
        index("idx_tasks_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
        index("idx_tasks_last_activity").using("btree", table.lastActivityAt.asc().nullsLast().op("timestamptz_ops")),
        foreignKey({
                        columns: [table.projectId],
                        foreignColumns: [projects.id],
                        name: "tasks_project_id_fkey"
                }).onDelete("cascade"),
        foreignKey({
                        columns: [table.assigneeId],
                        foreignColumns: [users.id],
                        name: "tasks_assignee_id_fkey"
                }),
        foreignKey({
                        columns: [table.ballInCourt],
                        foreignColumns: [users.id],
                        name: "tasks_ball_in_court_fkey"
                }),
        foreignKey({
                        columns: [table.createdBy],
                        foreignColumns: [users.id],
                        name: "tasks_created_by_fkey"
                }),
]);

export const subtasks = pgTable("subtasks", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        taskId: uuid("task_id"),
        title: text().notNull(),
        done: boolean().default(false),
        orderIndex: integer("order_index").default(0),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
        foreignKey({
                        columns: [table.taskId],
                        foreignColumns: [tasks.id],
                        name: "subtasks_task_id_fkey"
                }).onDelete("cascade"),
]);

export const attachments = pgTable("attachments", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        taskId: uuid("task_id").notNull(),
        filename: text(),
        mime: text(),
        sizeBytes: integer("size_bytes"),
        storageKey: text("storage_key").notNull(),
        uploadedBy: uuid("uploaded_by"),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
        foreignKey({
                        columns: [table.taskId],
                        foreignColumns: [tasks.id],
                        name: "attachments_task_id_fkey"
                }).onDelete("cascade"),
]);

export const activityLog = pgTable("activity_log", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        actorId: uuid("actor_id"),
        entityType: text("entity_type"),
        entityId: uuid("entity_id"),
        action: text(),
        meta: jsonb().default({}),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
        ip: text(),
});

export const performance = pgTable("performance", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        taskId: uuid("task_id"),
        complexity: integer().default(1),
        speed: integer().default(0),
        collaboration: integer().default(0),
        quality: integer().default(0),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
        foreignKey({
                        columns: [table.taskId],
                        foreignColumns: [tasks.id],
                        name: "performance_task_id_fkey"
                }).onDelete("cascade"),
        unique("performance_task_id_key").on(table.taskId),
]);

export const permissionsMatrix = pgTable("permissions_matrix", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        role: text(),
        canView: boolean("can_view").default(true),
        canEdit: boolean("can_edit").default(false),
        canClose: boolean("can_close").default(false),
});

export const userRoles = pgTable("user_roles", {
        userId: uuid("user_id").notNull(),
        roleId: uuid("role_id").notNull(),
}, (table) => [
        foreignKey({
                        columns: [table.userId],
                        foreignColumns: [users.id],
                        name: "user_roles_user_id_fkey"
                }).onDelete("cascade"),
        foreignKey({
                        columns: [table.roleId],
                        foreignColumns: [roles.id],
                        name: "user_roles_role_id_fkey"
                }).onDelete("cascade"),
        primaryKey({ columns: [table.userId, table.roleId], name: "user_roles_pkey"}),
]);

export const rolePermissions = pgTable("role_permissions", {
        roleId: uuid("role_id").notNull(),
        permissionId: uuid("permission_id").notNull(),
}, (table) => [
        foreignKey({
                        columns: [table.roleId],
                        foreignColumns: [roles.id],
                        name: "role_permissions_role_id_fkey"
                }).onDelete("cascade"),
        foreignKey({
                        columns: [table.permissionId],
                        foreignColumns: [permissions.id],
                        name: "role_permissions_permission_id_fkey"
                }).onDelete("cascade"),
        primaryKey({ columns: [table.roleId, table.permissionId], name: "role_permissions_pkey"}),
]);

export const taskDependencies = pgTable("task_dependencies", {
        taskId: uuid("task_id").notNull(),
        blocksTaskId: uuid("blocks_task_id").notNull(),
}, (table) => [
        foreignKey({
                        columns: [table.taskId],
                        foreignColumns: [tasks.id],
                        name: "task_dependencies_task_id_fkey"
                }).onDelete("cascade"),
        foreignKey({
                        columns: [table.blocksTaskId],
                        foreignColumns: [tasks.id],
                        name: "task_dependencies_blocks_task_id_fkey"
                }).onDelete("cascade"),
        primaryKey({ columns: [table.taskId, table.blocksTaskId], name: "task_dependencies_pkey"}),
]);

export const auditLogs = pgTable("audit_logs", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        userId: uuid("user_id"),
        action: text().notNull(),
        entity: text().notNull(),
        meta: jsonb().default({}),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
        foreignKey({
                        columns: [table.userId],
                        foreignColumns: [users.id],
                        name: "audit_logs_user_id_fkey"
                }),
        index("idx_audit_logs_user").using("btree", table.userId.asc().nullsLast()),
        index("idx_audit_logs_action").using("btree", table.action.asc().nullsLast()),
        index("idx_audit_logs_created").using("btree", table.createdAt.desc().nullsFirst()),
]);

export const idempotency = pgTable("idempotency", {
        key: text().primaryKey().notNull(),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});
