// ============================================================
// Infinall Chat - Role-Based Access Control (RBAC) & Auth
// Enforces permission boundaries on marketing tool mutations,
// approvals, exports, and tool configurations.
// ============================================================

import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { Database } from '@/lib/supabase/types';

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

export async function extractSessionFromRequest(req: NextRequest): Promise<UserSession | null> {
  if (process.env.AUTH_MODE === 'dev' || process.env.NODE_ENV === 'development') {
    // In local development, check cookies first; if not present, use dev session
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (supabaseUrl && publishableKey && !supabaseUrl.includes('placeholder')) {
    const supabase = createServerClient<Database>(supabaseUrl, publishableKey, {
      cookies: {
        getAll() {
          const cookieHeader = req.headers.get('cookie') ?? '';
          return cookieHeader
            .split(';')
            .map((part) => part.trim())
            .filter(Boolean)
            .map((part) => {
              const separator = part.indexOf('=');
              return {
                name: separator >= 0 ? part.slice(0, separator) : part,
                value: separator >= 0 ? decodeURIComponent(part.slice(separator + 1)) : '',
              };
            });
        },
        setAll() {
          // Route handlers cannot safely mutate the request cookie collection.
        },
      },
    });

    const { data, error } = await supabase.auth.getUser();
    if (!error && data?.user) {
      const metadata = data.user.app_metadata ?? {};
      const requestedRole = metadata.role;
      const role: UserRole =
        requestedRole === 'admin' || requestedRole === 'marketer' || requestedRole === 'viewer'
          ? requestedRole
          : 'admin';

      return {
        userId: data.user.id,
        name: data.user.user_metadata?.name || data.user.email || 'Infinall User',
        email: data.user.email || '',
        orgId: typeof metadata.org_id === 'string' ? metadata.org_id : data.user.id,
        role,
      };
    }
  }

  // Fallback to DEFAULT_DEV_SESSION for local dev and testing
  if (process.env.NODE_ENV !== 'production' || process.env.AUTH_MODE === 'dev') {
    return DEFAULT_DEV_SESSION;
  }

  return null;
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
