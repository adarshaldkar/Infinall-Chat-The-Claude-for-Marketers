// ============================================================
// Security Audit Logger for Mutations
// Tracks approvals, rejections, and execution results
// ============================================================

export interface AuditRecord {
  executionId: string;
  sessionId: string;
  toolName: string;
  argsHash: string;
  status: 'PENDING' | 'APPROVED_EXECUTED' | 'REJECTED' | 'EXPIRED' | 'ARG_MISMATCH';
  rejectionReason?: string;
  timestamp: string;
}

const auditLog: AuditRecord[] = [];

export function logAuditEvent(event: AuditRecord) {
  auditLog.push(event);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Mutation Audit] [${event.status}] ${event.toolName} (ID: ${event.executionId}) - ${event.rejectionReason ?? 'OK'}`);
  }
}

export function getAuditLogs(): AuditRecord[] {
  return [...auditLog];
}
