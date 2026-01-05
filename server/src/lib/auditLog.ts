import prisma from '../utils/prisma';

type AuditAction =
    | 'user_register'
    | 'user_login'
    | 'user_logout'
    | 'habit_create'
    | 'habit_update'
    | 'habit_delete'
    | 'habit_complete'
    | 'habit_undo'
    | 'task_create'
    | 'task_complete'
    | 'xp_gain'
    | 'level_up'
    | 'data_export'
    | 'account_delete';

interface AuditOptions {
    userId?: string;
    action: AuditAction;
    entity?: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
}

export const createAuditLog = async (options: AuditOptions): Promise<void> => {
    try {
        await prisma.auditLog.create({
            data: {
                userId: options.userId,
                action: options.action,
                entity: options.entity,
                entityId: options.entityId,
                metadata: options.metadata ? JSON.stringify(options.metadata) : null,
                ipAddress: options.ipAddress
            }
        });
    } catch (error) {
        // Audit logging should never break the main flow
        console.error('[AuditLog] Failed to create audit log:', error);
    }
};

export default createAuditLog;
