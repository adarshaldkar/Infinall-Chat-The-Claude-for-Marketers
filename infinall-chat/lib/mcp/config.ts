// ============================================================
// Infinall Chat - MCP Connector Configuration Layer
// Single source of truth for connector mode/credentials.
//
// Modes (per connector, override global MCP_MODE):
//   off     (default)  -> tool reports "not configured"; no data fabricated
//   sandbox            -> returns clearly-labelled deterministic demo data
//                        (isSandbox: true is ALWAYS surfaced to the caller)
//   live               -> real HTTP call to configured endpoint; requires a
//                        real credential to be set, otherwise it fails closed
//
// This guarantees we never silently present fabricated data as real.
// ============================================================

export type ConnectorMode = 'off' | 'sandbox' | 'live';

export interface ConnectorSettings {
  /** Resolved mode for this connector. */
  mode: ConnectorMode;
  /** Fully qualified endpoint for live calls. */
  endpoint: string;
  /** Whether a real credential (API key / access token) is configured. */
  credentialConfigured: boolean;
  /** Human-readable hint shown when the connector is not usable. */
  hint: string;
}

function resolveGlobalMode(): ConnectorMode {
  const g = (process.env.MCP_MODE || 'off').trim().toLowerCase();
  if (g === 'live') return 'live';
  if (g === 'sandbox') return 'sandbox';
  return 'off';
}

export function getConnectorSettings(
  envKey: string,
  defaultEndpoint: string,
  credentialEnvKeys: string[]
): ConnectorSettings {
  const globalMode = resolveGlobalMode();
  const toolMode = (process.env[`${envKey}_MODE`] || globalMode).trim().toLowerCase();

  let mode: ConnectorMode = 'off';
  if (toolMode === 'live') mode = 'live';
  else if (toolMode === 'sandbox') mode = 'sandbox';

  const endpoint = (process.env[`${envKey}_ENDPOINT`] || defaultEndpoint).trim();
  const credentialConfigured = credentialEnvKeys.some(
    (k) => Boolean(process.env[k]?.trim()) && !isPlaceholder(process.env[k])
  );

  const hint = buildHint(envKey, mode, credentialEnvKeys, credentialConfigured);
  return { mode, endpoint, credentialConfigured, hint };
}

export class ConnectorNotConfiguredError extends Error {
  readonly connector: string;
  readonly mode: ConnectorMode;

  constructor(connector: string, mode: ConnectorMode, hint: string) {
    super(`Connector "${connector}" cannot execute (mode=${mode}). ${hint}`);
    this.name = 'ConnectorNotConfiguredError';
    this.connector = connector;
    this.mode = mode;
  }
}

function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  const v = value.trim().toLowerCase();
  return v === '' || v === 'mock' || v === 'demo' || v === 'your-key-here' || v.startsWith('demo_');
}

function buildHint(
  envKey: string,
  mode: ConnectorMode,
  credentialEnvKeys: string[],
  credentialConfigured: boolean
): string {
  const creds = credentialEnvKeys.map((k) => `\`${k}\``).join(' or ');
  if (mode === 'off') {
    return `Set \`MCP_MODE=sandbox\` for deterministic demo data, or set \`${envKey}_MODE=live\` with ${creds} and \`${envKey}_ENDPOINT\` for real integration.`;
  }
  if (mode === 'sandbox') {
    return `Running in sandbox mode (demo data, marked isSandbox=true). To go live set \`${envKey}_MODE=live\` with ${creds}.`;
  }
  if (!credentialConfigured) {
    return `Live mode requested but no credential found. Configure ${creds} (e.g. set \`${envKey}_MODE=live\` AND the API key).`;
  }
  return `Live mode with configured credentials (${creds}).`;
}

/**
 * Known MCP connectors mapped to their credential env keys, so availability
 * can be resolved generically (used by the tools directory and UI badges).
 */
const KNOWN_CONNECTOR_CREDENTIALS: Record<string, string[]> = {
  FIRECRAWL: ['FIRECRAWL_API_KEY'],
  GA4: ['GA4_API_KEY', 'GA4_SERVICE_ACCOUNT'],
  META: ['META_ACCESS_TOKEN', 'META_APP_TOKEN'],
  GOOGLE_ADS: ['GOOGLE_ADS_API_KEY', 'GOOGLE_ADS_DEVELOPER_TOKEN'],
};

export type ConnectorAvailability = 'live' | 'sandbox' | 'off';

/**
 * Shorthand for directory/UI status resolution: does this connector have a
 * working live integration, a sandbox adapter, or nothing configured?
 */
export function getConnectorAvailability(envKey: string): ConnectorAvailability {
  const globalMode = resolveGlobalMode();
  const toolMode = (process.env[`${envKey}_MODE`] || globalMode).trim().toLowerCase();
  const credentialKeys = KNOWN_CONNECTOR_CREDENTIALS[envKey] || [];
  if (toolMode === 'live') {
    const settings = getConnectorSettings(envKey, '', credentialKeys);
    return settings.credentialConfigured ? 'live' : 'off';
  }
  if (toolMode === 'sandbox') return 'sandbox';
  return 'off';
}

/** Assert the connector is usable in the requested mode. Throws on failure-closed states. */
export function assertConnectorReady(settings: ConnectorSettings, connectorName: string): void {
  if (settings.mode === 'live' && !settings.credentialConfigured) {
    throw new ConnectorNotConfiguredError(connectorName, 'live', settings.hint);
  }
  if (settings.mode === 'off') {
    throw new ConnectorNotConfiguredError(connectorName, 'off', settings.hint);
  }
}