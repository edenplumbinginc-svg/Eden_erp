import { pgTable, unique, uuid, text, foreignKey, timestamp, bigint, index, jsonb, boolean, integer, primaryKey, check } from "drizzle-orm/pg-core"
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
        client: text(),
        startDate: timestamp("start_date", { withTimezone: true, mode: 'string' }),
        notes: text(),
        status: text().default('active').notNull(),
        archived: boolean().default(false).notNull(),
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
        phone: text(),
        title: text(),
        timezone: text(),
        locale: text(),
        notificationPrefs: jsonb("notification_prefs").default(sql`'{}'::jsonb`),
}, (table) => [
        unique("users_email_key").on(table.email),
        index("idx_users_phone").using("btree", table.phone.asc().nullsLast()),
]);

export const userPreferences = pgTable("user_preferences", {
        userId: uuid("user_id").primaryKey().notNull(),
        defaultProjectId: uuid("default_project_id"),
        tasksGroupBy: text("tasks_group_by").default('status').notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
        foreignKey({
                columns: [table.userId],
                foreignColumns: [users.id],
                name: "user_preferences_user_id_fkey"
        }).onDelete("cascade"),
        foreignKey({
                columns: [table.defaultProjectId],
                foreignColumns: [projects.id],
                name: "user_preferences_default_project_id_fkey"
        }).onDelete("set null"),
        index("idx_user_prefs_default_project").using("btree", table.defaultProjectId.asc().nullsLast()).where(sql`${table.defaultProjectId} IS NOT NULL`),
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
        origin: text().default('UI'),
        voiceUrl: text("voice_url"),
        voiceTranscript: text("voice_transcript"),
        ballInCourtNote: text("ball_in_court_note"),
        deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
        lastActivityAt: timestamp("last_activity_at", { withTimezone: true, mode: 'string' }),
        statusLocked: boolean("status_locked").default(false),
        ballOwnerType: text("ball_owner_type"),
        ballOwnerId: uuid("ball_owner_id"),
        ballSince: timestamp("ball_since", { withTimezone: true, mode: 'string' }),
        isOverdue: boolean("is_overdue").default(false).notNull(),
        overdueSnoozedUntil: timestamp("overdue_snoozed_until", { withTimezone: true, mode: 'string' }),
        needsIdleReminder: boolean("needs_idle_reminder").default(false).notNull(),
        idleSnoozedUntil: timestamp("idle_snoozed_until", { withTimezone: true, mode: 'string' }),
        department: text(),
}, (table) => [
        check("department_enum_check", sql`${table.department} IS NULL OR ${table.department} IN ('Operations', 'Procurement', 'Accounting', 'Service', 'Estimating', 'Scheduling')`),
        index("idx_tasks_ball").using("btree", table.ballInCourt.asc().nullsLast().op("uuid_ops")),
        index("idx_tasks_project").using("btree", table.projectId.asc().nullsLast().op("uuid_ops")),
        index("idx_tasks_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
        index("idx_tasks_last_activity").using("btree", table.lastActivityAt.asc().nullsLast().op("timestamptz_ops")),
        index("idx_tasks_overdue").using("btree", table.isOverdue.asc().nullsLast()),
        index("idx_tasks_idle").using("btree", table.needsIdleReminder.asc().nullsLast()),
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

export const tasksProjects = pgTable("tasks_projects", {
        taskId: uuid("task_id").notNull(),
        projectId: uuid("project_id").notNull(),
}, (table) => [
        foreignKey({
                columns: [table.taskId],
                foreignColumns: [tasks.id],
                name: "tasks_projects_task_id_fkey"
        }).onDelete("cascade"),
        foreignKey({
                columns: [table.projectId],
                foreignColumns: [projects.id],
                name: "tasks_projects_project_id_fkey"
        }).onDelete("cascade"),
        primaryKey({ columns: [table.taskId, table.projectId], name: "tasks_projects_pkey"}),
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
        actorId: uuid("actor_id").notNull(),
        actorEmail: text("actor_email"),
        action: text().notNull(),
        targetType: text("target_type").notNull(),
        targetId: text("target_id"),
        payload: jsonb().default({}),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
        foreignKey({
                        columns: [table.actorId],
                        foreignColumns: [users.id],
                        name: "audit_logs_actor_id_fkey"
                }),
        index("idx_audit_logs_actor").using("btree", table.actorId.asc().nullsLast()),
        index("idx_audit_logs_action").using("btree", table.action.asc().nullsLast()),
        index("idx_audit_logs_created").using("btree", table.createdAt.desc().nullsFirst()),
        index("idx_audit_logs_target").using("btree", table.targetType.asc().nullsLast(), table.targetId.asc().nullsLast()),
]);

export const idempotency = pgTable("idempotency", {
        key: text().primaryKey().notNull(),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const guestLinks = pgTable("guest_links", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        scope: text().notNull(),
        scopeId: uuid("scope_id").notNull(),
        token: uuid().notNull(),
        expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
        createdBy: uuid("created_by"),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
        unique("guest_links_token_key").on(table.token),
        index("guest_links_scope_idx").using("btree", table.scope.asc().nullsLast(), table.scopeId.asc().nullsLast()),
        index("guest_links_exp_idx").using("btree", table.expiresAt.asc().nullsLast()),
        foreignKey({
                columns: [table.createdBy],
                foreignColumns: [users.id],
                name: "guest_links_created_by_fkey"
        }),
]);

export const handoffEvents = pgTable("handoff_events", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        taskId: uuid("task_id").notNull(),
        fromDepartment: text("from_department"),
        toDepartment: text("to_department").notNull(),
        actorEmail: text("actor_email").notNull(),
        note: text(),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
        index("idx_handoff_events_task").using("btree", table.taskId.asc().nullsLast()),
        index("idx_handoff_events_recent").using("btree", table.taskId.asc().nullsLast(), table.toDepartment.asc().nullsLast(), table.createdAt.desc().nullsFirst()),
        foreignKey({
                columns: [table.taskId],
                foreignColumns: [tasks.id],
                name: "handoff_events_task_id_fkey"
        }).onDelete("cascade"),
]);

export const taskChecklistItems = pgTable("task_checklist_items", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        taskId: uuid("task_id").notNull(),
        label: text().notNull(),
        isDone: boolean("is_done").default(false).notNull(),
        position: integer().default(0).notNull(),
        createdBy: uuid("created_by"),
        updatedBy: uuid("updated_by"),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
        doneAt: timestamp("done_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
        foreignKey({
                columns: [table.taskId],
                foreignColumns: [tasks.id],
                name: "task_checklist_items_task_id_fkey"
        }).onDelete("cascade"),
        foreignKey({
                columns: [table.createdBy],
                foreignColumns: [users.id],
                name: "task_checklist_items_created_by_fkey"
        }),
        foreignKey({
                columns: [table.updatedBy],
                foreignColumns: [users.id],
                name: "task_checklist_items_updated_by_fkey"
        }),
        index("idx_task_checklist_task_position").using("btree", table.taskId.asc().nullsLast(), table.position.asc().nullsLast()),
        index("idx_task_checklist_task_done").using("btree", table.taskId.asc().nullsLast(), table.isDone.asc().nullsLast()),
]);

export const performanceEvents = pgTable("performance_events", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        actorId: uuid("actor_id").notNull(),
        actorEmail: text("actor_email"),
        taskId: uuid("task_id").notNull(),
        checklistItemId: uuid("checklist_item_id").notNull(),
        action: text().notNull(),
        startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }).notNull(),
        finishedAt: timestamp("finished_at", { withTimezone: true, mode: 'string' }).notNull(),
        durationMs: bigint("duration_ms", { mode: "number" }).notNull(),
        department: text(),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
        foreignKey({
                        columns: [table.actorId],
                        foreignColumns: [users.id],
                        name: "performance_events_actor_id_fkey"
        }),
        foreignKey({
                        columns: [table.taskId],
                        foreignColumns: [tasks.id],
                        name: "performance_events_task_id_fkey"
        }),
        foreignKey({
                        columns: [table.checklistItemId],
                        foreignColumns: [taskChecklistItems.id],
                        name: "performance_events_checklist_item_id_fkey"
        }).onDelete("cascade"),
        index("perf_events_actor_time_idx").using("btree", table.actorId.asc().nullsLast(), table.createdAt.desc().nullsFirst()),
        index("perf_events_task_idx").using("btree", table.taskId.asc().nullsLast()),
        index("perf_events_action_idx").using("btree", table.action.asc().nullsLast()),
]);

export const incidents = pgTable("incidents", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        incidentKey: text("incident_key").notNull(),
        route: text().notNull(),
        kind: text().notNull(),
        severity: text().notNull(),
        status: text().default('open').notNull(),
        firstSeen: timestamp("first_seen", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
        lastSeen: timestamp("last_seen", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
        acknowledgedBy: text("acknowledged_by"),
        acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true, mode: 'string' }),
        escalationLevel: integer("escalation_level").default(0).notNull(),
        escalatedAt: timestamp("escalated_at", { withTimezone: true, mode: 'string' }),
        owner: jsonb().default(null),
        metadata: jsonb().default({}).notNull(),
}, (table) => [
        index("idx_incidents_key").using("btree", table.incidentKey.asc().nullsLast()),
        index("idx_incidents_status").using("btree", table.status.asc().nullsLast()),
        index("idx_incidents_route_kind").using("btree", table.route.asc().nullsLast(), table.kind.asc().nullsLast()),
]);

export const escalationEvents = pgTable("escalation_events", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        incidentId: uuid("incident_id").notNull(),
        incidentKey: text("incident_key").notNull(),
        escalationLevel: integer("escalation_level").notNull(),
        eventHash: text("event_hash").notNull(),
        severity: text().notNull(),
        metadata: jsonb().default({}).notNull(),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
        foreignKey({
                        columns: [table.incidentId],
                        foreignColumns: [incidents.id],
                        name: "escalation_events_incident_id_fkey"
                }).onDelete("cascade"),
        unique("escalation_events_event_hash_key").on(table.eventHash),
        index("idx_esc_events_incident").using("btree", table.incidentId.asc().nullsLast()),
        index("idx_esc_events_created").using("btree", table.createdAt.desc().nullsFirst()),
]);
