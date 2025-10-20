import { relations } from "drizzle-orm/relations";
import { users, projects, tasks, taskComments, taskAttachments, ballHistory, notifications, subtasks, attachments, performance, userRoles, roles, rolePermissions, permissions, taskDependencies } from "./schema";

export const projectsRelations = relations(projects, ({one, many}) => ({
	user: one(users, {
		fields: [projects.createdBy],
		references: [users.id]
	}),
	tasks: many(tasks),
}));

export const usersRelations = relations(users, ({many}) => ({
	projects: many(projects),
	taskComments: many(taskComments),
	taskAttachments: many(taskAttachments),
	ballHistories_fromUserId: many(ballHistory, {
		relationName: "ballHistory_fromUserId_users_id"
	}),
	ballHistories_toUserId: many(ballHistory, {
		relationName: "ballHistory_toUserId_users_id"
	}),
	notifications: many(notifications),
	tasks_assigneeId: many(tasks, {
		relationName: "tasks_assigneeId_users_id"
	}),
	tasks_ballInCourt: many(tasks, {
		relationName: "tasks_ballInCourt_users_id"
	}),
	tasks_createdBy: many(tasks, {
		relationName: "tasks_createdBy_users_id"
	}),
	userRoles: many(userRoles),
}));

export const taskCommentsRelations = relations(taskComments, ({one}) => ({
	task: one(tasks, {
		fields: [taskComments.taskId],
		references: [tasks.id]
	}),
	user: one(users, {
		fields: [taskComments.authorId],
		references: [users.id]
	}),
}));

export const tasksRelations = relations(tasks, ({one, many}) => ({
	taskComments: many(taskComments),
	taskAttachments: many(taskAttachments),
	ballHistories: many(ballHistory),
	project: one(projects, {
		fields: [tasks.projectId],
		references: [projects.id]
	}),
	user_assigneeId: one(users, {
		fields: [tasks.assigneeId],
		references: [users.id],
		relationName: "tasks_assigneeId_users_id"
	}),
	user_ballInCourt: one(users, {
		fields: [tasks.ballInCourt],
		references: [users.id],
		relationName: "tasks_ballInCourt_users_id"
	}),
	user_createdBy: one(users, {
		fields: [tasks.createdBy],
		references: [users.id],
		relationName: "tasks_createdBy_users_id"
	}),
	subtasks: many(subtasks),
	attachments: many(attachments),
	performances: many(performance),
	taskDependencies_taskId: many(taskDependencies, {
		relationName: "taskDependencies_taskId_tasks_id"
	}),
	taskDependencies_blocksTaskId: many(taskDependencies, {
		relationName: "taskDependencies_blocksTaskId_tasks_id"
	}),
}));

export const taskAttachmentsRelations = relations(taskAttachments, ({one}) => ({
	task: one(tasks, {
		fields: [taskAttachments.taskId],
		references: [tasks.id]
	}),
	user: one(users, {
		fields: [taskAttachments.uploadedBy],
		references: [users.id]
	}),
}));

export const ballHistoryRelations = relations(ballHistory, ({one}) => ({
	task: one(tasks, {
		fields: [ballHistory.taskId],
		references: [tasks.id]
	}),
	user_fromUserId: one(users, {
		fields: [ballHistory.fromUserId],
		references: [users.id],
		relationName: "ballHistory_fromUserId_users_id"
	}),
	user_toUserId: one(users, {
		fields: [ballHistory.toUserId],
		references: [users.id],
		relationName: "ballHistory_toUserId_users_id"
	}),
}));

export const notificationsRelations = relations(notifications, ({one}) => ({
	user: one(users, {
		fields: [notifications.userId],
		references: [users.id]
	}),
}));

export const subtasksRelations = relations(subtasks, ({one}) => ({
	task: one(tasks, {
		fields: [subtasks.taskId],
		references: [tasks.id]
	}),
}));

export const attachmentsRelations = relations(attachments, ({one}) => ({
	task: one(tasks, {
		fields: [attachments.taskId],
		references: [tasks.id]
	}),
}));

export const performanceRelations = relations(performance, ({one}) => ({
	task: one(tasks, {
		fields: [performance.taskId],
		references: [tasks.id]
	}),
}));

export const userRolesRelations = relations(userRoles, ({one}) => ({
	user: one(users, {
		fields: [userRoles.userId],
		references: [users.id]
	}),
	role: one(roles, {
		fields: [userRoles.roleId],
		references: [roles.id]
	}),
}));

export const rolesRelations = relations(roles, ({many}) => ({
	userRoles: many(userRoles),
	rolePermissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({one}) => ({
	role: one(roles, {
		fields: [rolePermissions.roleId],
		references: [roles.id]
	}),
	permission: one(permissions, {
		fields: [rolePermissions.permissionId],
		references: [permissions.id]
	}),
}));

export const permissionsRelations = relations(permissions, ({many}) => ({
	rolePermissions: many(rolePermissions),
}));

export const taskDependenciesRelations = relations(taskDependencies, ({one}) => ({
	task_taskId: one(tasks, {
		fields: [taskDependencies.taskId],
		references: [tasks.id],
		relationName: "taskDependencies_taskId_tasks_id"
	}),
	task_blocksTaskId: one(tasks, {
		fields: [taskDependencies.blocksTaskId],
		references: [tasks.id],
		relationName: "taskDependencies_blocksTaskId_tasks_id"
	}),
}));