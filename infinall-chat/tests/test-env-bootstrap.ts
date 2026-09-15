import dotenv from 'dotenv';
import path from 'path';

// Load .env.local if present
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Set default test environment flags (use Object.assign to avoid read-only issue on NODE_ENV)
const testEnv: Record<string, string> = {
  STORAGE_MODE: process.env.STORAGE_MODE || 'local',
  AUTH_MODE: process.env.AUTH_MODE || 'dev',
};

for (const [key, value] of Object.entries(testEnv)) {
  if (!process.env[key]) {
    (process.env as Record<string, string>)[key] = value;
  }
}

// NODE_ENV cannot be directly assigned in some type configs, so use this pattern:
if (!process.env.NODE_ENV) {
  try {
    (process.env as Record<string, string>).NODE_ENV = 'test';
  } catch {
    // NODE_ENV already set by runtime
  }
}
