// ============================================================
// Security Audit Logger for Mutations
// Tracks approvals, rejections, and execution results durably
// Survives server restarts and provides compliance history
// ============================================================

import { db, AuditRecordItem } from '@/lib/storage/db';

export interface AuditRecord {
  executionId: string;
  sessionId: string;
  toolName: string;
  argsHash: string;
  status: 'PENDING' | 'APPROVED_EXECUTED' | 'REJECTED' | 'EXPIRED' | 'ARG_MISMATCH';
  rejectionReason?: string;
  userId?: string;
  userRole?: string;
  orgId?: string;
  ip?: string;
  timestamp: string;
}

export function logAuditEvent(event: AuditRecord): void {
  const auditItem: AuditRecordItem = {
    id: `${event.executionId}_${Date.now()}`,
    timestamp: event.timestamp || new Date().toISOString(),
    action: event.status === 'PENDING' ? 'APPROVAL_REQUESTED'
      : event.status === 'APPROVED_EXECUTED' ? 'EXECUTED'
      : event.status === 'REJECTED' ? 'REJECTED'
      : 'MUTATION_FAILED',
    approvalId: event.executionId,
    toolName: event.toolName,
    argsHash: event.argsHash,
    riskLevel: 'HIGH',
    userId: event.userId || 'usr_marketer_default',
    userRole: event.userRole || 'marketer',
    orgId: event.orgId || 'org_infinall_default',
    sessionId: event.sessionId,
    reason: event.rejectionReason,
    ip: event.ip || '127.0.0.1',
  };

  // Durable append log
  db.auditLog.append(auditItem);

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Mutation Audit] [${event.status}] ${event.toolName} (ID: ${event.executionId}) - ${event.rejectionReason ?? 'OK'}`);
  }
}

export function getAuditLogs(): AuditRecord[] {
  const items = db.auditLog.readAll();
  return items.map((item) => ({
    executionId: item.approvalId || item.id,
    sessionId: item.sessionId || '',
    toolName: item.toolName,
    argsHash: item.argsHash,
    status: item.action === 'APPROVAL_REQUESTED' ? 'PENDING'
      : item.action === 'EXECUTED' ? 'APPROVED_EXECUTED'
      : item.action === 'REJECTED' ? 'REJECTED'
      : 'ARG_MISMATCH',
    rejectionReason: item.reason,
    userId: item.userId,
    userRole: item.userRole,
    orgId: item.orgId,
    timestamp: item.timestamp,
  }));
}
