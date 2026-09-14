// ============================================================
// Infinall Chat - Durable Storage & Document Database
// Provides a durable, file-backed persistence layer for:
// - Approval requests & state (survives restarts)
// - Compliance audit logs (immutable append-only)
// - Conversation sessions & message branching
// - Custom workspace skills
// - Tool execution health & latency metrics
// ============================================================

import fs from 'fs';
import path from 'path';

export interface StorageOptions {
  dataDir?: string;
}

const DEFAULT_DATA_DIR = path.resolve(process.cwd(), '.data');

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export class JsonCollection<T extends { id: string }> {
  private filePath: string;
  private cache: Map<string, T> = new Map();
  private initialized = false;

  constructor(collectionName: string, baseDir: string = DEFAULT_DATA_DIR) {
    ensureDir(baseDir);
    this.filePath = path.join(baseDir, `${collectionName}.json`);
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const items: T[] = JSON.parse(raw);
        this.cache.clear();
        for (const item of items) {
          if (item && item.id) {
            this.cache.set(item.id, item);
          }
        }
      }
    } catch (err) {
      console.warn(`[JsonCollection] Failed to load ${this.filePath}, initializing empty:`, err);
      this.cache.clear();
    }
    this.initialized = true;
  }

  private save(): void {
    try {
      const items = Array.from(this.cache.values());
      fs.writeFileSync(this.filePath, JSON.stringify(items, null, 2), 'utf-8');
    } catch (err) {
      console.error(`[JsonCollection] Failed to write ${this.filePath}:`, err);
    }
  }

  public get(id: string): T | undefined {
    if (!this.initialized) this.load();
    return this.cache.get(id);
  }

  public set(id: string, value: T): void {
    if (!this.initialized) this.load();
    this.cache.set(id, value);
    this.save();
  }

  public delete(id: string): boolean {
    if (!this.initialized) this.load();
    const result = this.cache.delete(id);
    if (result) this.save();
    return result;
  }

  public getAll(): T[] {
    if (!this.initialized) this.load();
    return Array.from(this.cache.values());
  }

  public find(predicate: (item: T) => boolean): T | undefined {
    if (!this.initialized) this.load();
    return Array.from(this.cache.values()).find(predicate);
  }

  public filter(predicate: (item: T) => boolean): T[] {
    if (!this.initialized) this.load();
    return Array.from(this.cache.values()).filter(predicate);
  }

  public count(): number {
    if (!this.initialized) this.load();
    return this.cache.size;
  }
}

// Append-only durable log for audit compliance
export class DurableAppendLog<T> {
  private filePath: string;

  constructor(logName: string, baseDir: string = DEFAULT_DATA_DIR) {
    ensureDir(baseDir);
    this.filePath = path.join(baseDir, `${logName}.jsonl`);
  }

  public append(entry: T): void {
    try {
      const line = JSON.stringify({ ...entry, _loggedAt: new Date().toISOString() }) + '\n';
      fs.appendFileSync(this.filePath, line, 'utf-8');
    } catch (err) {
      console.error(`[DurableAppendLog] Failed to append to ${this.filePath}:`, err);
    }
  }

  public readAll(): T[] {
    try {
      if (!fs.existsSync(this.filePath)) return [];
      const lines = fs.readFileSync(this.filePath, 'utf-8').trim().split('\n');
      return lines.filter(Boolean).map(l => JSON.parse(l));
    } catch (err) {
      console.error(`[DurableAppendLog] Failed to read ${this.filePath}:`, err);
      return [];
    }
  }
}

// Singleton persistent database instances
export interface ApprovalRecordItem {
  id: string; // approvalId
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  expectedHash: string;
  diffSummary: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  userId?: string;
  userRole?: string;
  orgId?: string;
  sessionId?: string;
  rejectionReason?: string;
  executionOutput?: unknown;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

export interface AuditRecordItem {
  id: string;
  timestamp: string;
  action: 'APPROVAL_REQUESTED' | 'APPROVED' | 'REJECTED' | 'EXECUTED' | 'MUTATION_FAILED';
  approvalId?: string;
  toolCallId?: string;
  toolName: string;
  argsHash: string;
  riskLevel: string;
  userId?: string;
  userRole?: string;
  orgId?: string;
  sessionId?: string;
  reason?: string;
  result?: unknown;
  ip?: string;
}

export interface CustomSkillItem {
  id: string;
  name: string;
  description: string;
  triggers: string[];
  systemPromptAddition: string;
  author?: string;
  createdAt: string;
}

export interface ToolMetricItem {
  id: string; // toolName
  totalCalls: number;
  successCount: number;
  failureCount: number;
  avgLatencyMs: number;
  lastLatencyMs: number;
  lastCalledAt: string;
  status: 'healthy' | 'degraded' | 'failing';
}

export const db = {
  approvals: new JsonCollection<ApprovalRecordItem>('approvals'),
  customSkills: new JsonCollection<CustomSkillItem>('custom_skills'),
  toolMetrics: new JsonCollection<ToolMetricItem>('tool_metrics'),
  auditLog: new DurableAppendLog<AuditRecordItem>('audit_log'),
};
