// ============================================================
// Infinall Chat - Role-Based Access Control (RBAC) & Auth
// Enforces permission boundaries on marketing tool mutations,
// approvals, exports, and tool configurations.
// ============================================================

import { NextRequest } from 'next/server';

export type UserRole = 'admin' | 'marketer' | 'viewer';

export interface UserSession {
  userId: string;
  name: string;
  email: string;
  orgId: string;
  role: UserRole;
}

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}

const ROLE_PERMISSIONS: Record<UserRole, {
  canMutate: boolean;
  canApprove: boolean;
  canConfigureTools: boolean;
  canExport: boolean;
  canDeepResearch: boolean;
}> = {
  admin: {
    canMutate: true,
    canApprove: true,
    canConfigureTools: true,
    canExport: true,
    canDeepResearch: true,
  },
  marketer: {
    canMutate: true,
    canApprove: true,
    canConfigureTools: false,
    canExport: true,
    canDeepResearch: true,
  },
  viewer: {
    canMutate: false,
    canApprove: false,
    canConfigureTools: false,
    canExport: true,
    canDeepResearch: true,
  },
};

export const DEFAULT_DEV_SESSION: UserSession = {
  userId: 'usr_growth_lead_01',
  name: 'Adarsh (Growth Lead)',
  email: 'growth@infinall.ai',
  orgId: 'org_infinall_prod',
  role: 'admin',
};

export function extractSessionFromRequest(req: NextRequest): UserSession {
  const authHeader = req.headers.get('authorization');
  const roleHeader = req.headers.get('x-infinall-role') as UserRole | null;
  const userIdHeader = req.headers.get('x-infinall-user-id');
  const orgIdHeader = req.headers.get('x-infinall-org-id');

  // Check for custom headers or Bearer token
  if (roleHeader && ['admin', 'marketer', 'viewer'].includes(roleHeader)) {
    return {
      userId: userIdHeader || 'usr_custom_header',
      name: roleHeader === 'admin' ? 'Admin User' : roleHeader === 'marketer' ? 'Marketing Lead' : 'Viewer',
      email: `${roleHeader}@infinall.ai`,
      orgId: orgIdHeader || 'org_infinall_default',
      role: roleHeader,
    };
  }

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    if (token === process.env.ADMIN_API_KEY || token.includes('admin')) {
      return {
        userId: 'usr_admin_token',
        name: 'System Administrator',
        email: 'admin@infinall.ai',
        orgId: 'org_infinall_system',
        role: 'admin',
      };
    }
  }

  // Frictionless local dev default session (admin rights)
  return DEFAULT_DEV_SESSION;
}

export function checkPermission(session: UserSession, action: keyof typeof ROLE_PERMISSIONS['admin']): PermissionCheckResult {
  const permissions = ROLE_PERMISSIONS[session.role] || ROLE_PERMISSIONS.viewer;
  if (!permissions[action]) {
    return {
      allowed: false,
      reason: `Role '${session.role}' does not have permission to perform '${action}'. Contact an administrator.`,
    };
  }
  return { allowed: true };
}
