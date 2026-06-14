-- Add TASK_MENTION notification type for @mentions in comments and descriptions.
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TASK_MENTION';
