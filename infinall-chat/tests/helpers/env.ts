// ============================================================
// Test Environment Loader
// Loads .env then .env.local (local overrides) so test suites
// are reproducible with zero manual setup. Applies deterministic
// test defaults for any secret that is still missing.
// ============================================================

import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..');

function loadEnvFile(file: string): void {
  const abs = path.join(ROOT, file);
  if (!fs.existsSync(abs)) return;
  const content = fs.readFileSync(abs, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function prepareTestEnv(): void {
  // Local project env first (lowest priority), then .env, then .env.local overrides.
  loadEnvFile('.env');
  loadEnvFile('.env.local');
  loadEnvFile('.env.test');

  // Deterministic fallbacks for CI / machines without a local env file.
  if (!process.env.APPROVAL_HMAC_SECRET) {
    process.env.APPROVAL_HMAC_SECRET = `test-hmac-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
  // Sandbox mode gives deterministic, clearly-labelled connector data (isSandbox: true),
  // so the suite never depends on live third-party endpoints.
  if (!process.env.MCP_MODE) {
    process.env.MCP_MODE = 'sandbox';
  }
}

prepareTestEnv();