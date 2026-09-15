'use client';

// ============================================================
// Integrations Settings Modal
// Connect, test, and manage live API credentials (Meta, GA4, Google Ads, Firecrawl, HubSpot)
// Encrypted with AES-256-GCM in the backend vault
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  Plug,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
  Key,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

interface ConnectorInfo {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  docsUrl: string;
  status: 'connected' | 'disconnected' | 'error';
  accountIdentifier?: string;
  lastTested?: string;
}

const AVAILABLE_CONNECTORS: Omit<ConnectorInfo, 'status'>[] = [
  {
    id: 'FIRECRAWL',
    name: 'Firecrawl Web Crawler',
    category: 'Market Intelligence & SEO',
    description: 'Scrape competitor landing pages, extract clean markdown, and perform batch SEO audits.',
    icon: '🔥',
    docsUrl: 'https://firecrawl.dev',
  },
  {
    id: 'META',
    name: 'Meta Ads Manager',
    category: 'Paid Advertising',
    description: 'Live campaign insights, ad set spend, CTR, ROAS, and budget adjustments via Graph API v19.',
    icon: '♾️',
    docsUrl: 'https://developers.facebook.com/docs/marketing-apis',
  },
  {
    id: 'GA4',
    name: 'Google Analytics 4',
    category: 'Analytics & Attribution',
    description: 'Traffic acquisition, conversion funnel metrics, bounce rates, and user session telemetry.',
    icon: '📊',
    docsUrl: 'https://developers.google.com/analytics/devguides/reporting/data/v1',
  },
  {
    id: 'GOOGLE_ADS',
    name: 'Google Ads',
    category: 'Paid Advertising',
    description: 'Search campaign keywords, quality scores, cost-per-click, and automated bid recommendations.',
    icon: '🎯',
    docsUrl: 'https://developers.google.com/google-ads/api/docs/first-call/overview',
  },
  {
    id: 'HUBSPOT',
    name: 'HubSpot CRM',
    category: 'Inbound & Lifecycle',
    description: 'Contact lifecycle stages, email campaign engagement, deal pipeline velocity, and lead scoring.',
    icon: '🧡',
    docsUrl: 'https://developers.hubspot.com',
  },
  {
    id: 'SEMRUSH',
    name: 'Semrush SEO & Keywords',
    category: 'SEO & Search',
    description: 'Domain authority, competitor keyword gap analysis, backlink velocity, and organic rankings.',
    icon: '⚡',
    docsUrl: 'https://developer.semrush.com',
  },
];

interface IntegrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function IntegrationsSettingsModal({ isOpen, onClose }: IntegrationsModalProps) {
  const [connectors, setConnectors] = useState<ConnectorInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedConnector, setSelectedConnector] = useState<ConnectorInfo | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  interface ConnectorRow {
  connector_id?: string;
  status?: string;
  display_name?: string;
  account_identifier?: string;
  last_health_check_at?: string;
}

  const mapConnectorRows = (rows: ConnectorRow[]): ConnectorInfo[] => {
    const connectionMap = new Map<string, ConnectorRow>(
      rows.map((c: ConnectorRow) => [c.connector_id || '', c])
    );
    return AVAILABLE_CONNECTORS.map((c) => {
      const conn = connectionMap.get(c.id);
      return {
        ...c,
        status: conn && conn.status === 'connected' ? 'connected' : 'disconnected',
        accountIdentifier: conn?.display_name || conn?.account_identifier,
        lastTested: conn?.last_health_check_at,
      };
    });
  };

  const loadConnections = async () => {
    try {
      const res = await fetch('/api/connectors');
      const data = res.ok ? await res.json() : { connections: [] };
      setConnectors(mapConnectorRows(data.connections || []));
    } catch (_) {
      setConnectors(AVAILABLE_CONNECTORS.map((c) => ({ ...c, status: 'disconnected' })));
    }
    setLoading(false);
  };

  const fetchConnections = async () => {
    setLoading(true);
    await loadConnections();
  };

  const [wasOpen, setWasOpen] = useState(false);
  if (isOpen && !wasOpen) {
    setWasOpen(true);
    setSelectedConnector(null);
    setApiKeyInput('');
    setTestResult(null);
  }
  if (!isOpen && wasOpen) {
    setWasOpen(false);
  }

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/connectors')
      .then(res => res.ok ? res.json() : { connections: [] })
      .then(data => setConnectors(mapConnectorRows(data.connections || [])))
      .catch(() => setConnectors(AVAILABLE_CONNECTORS.map((c) => ({ ...c, status: 'disconnected' }))))
      .finally(() => setLoading(false));
  }, [isOpen]);

  const handleSaveKey = async () => {
    if (!selectedConnector || !apiKeyInput.trim()) return;
    setSaving(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/connectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectorId: selectedConnector.id,
          displayName: selectedConnector.name,
          credentials: { apiKey: apiKeyInput.trim() },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save credential');
      }

      setTestResult({ success: true, message: 'API key encrypted and saved successfully in Vault.' });
      setApiKeyInput('');
      fetchConnections();
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Error saving key',
      });
    }
    setSaving(false);
  };

  const handleTestConnection = async (connectorId: string) => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/connectors/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectorId,
          token: apiKeyInput.trim() || undefined,
        }),
      });

      const data = await res.json();
      setTestResult(data);
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Connection test request failed',
      });
    }
    setTesting(false);
  };

  const handleDisconnect = async (connectorId: string) => {
    try {
      await fetch(`/api/connectors?connectorId=${connectorId}`, { method: 'DELETE' });
      fetchConnections();
      if (selectedConnector?.id === connectorId) {
        setSelectedConnector(null);
        setTestResult(null);
      }
    } catch (_) {}
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Plug className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-100 flex items-center gap-2">
                Live Marketing Integrations & Vault
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/20 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  AES-256 Encrypted
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Connect live advertising, analytics, and CRM accounts so AI agents query verified vendor data.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Layout */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-neutral-800">
          {/* Connector List */}
          <div className="md:col-span-7 overflow-y-auto p-4 space-y-3">
            <div className="flex items-center justify-between px-1 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Available Connectors</span>
              <button
                onClick={fetchConnections}
                className="text-xs text-neutral-400 hover:text-neutral-200 flex items-center gap-1 transition"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {connectors.map((connector) => {
              const isSelected = selectedConnector?.id === connector.id;
              const isConnected = connector.status === 'connected';

              return (
                <div
                  key={connector.id}
                  onClick={() => {
                    setSelectedConnector(connector);
                    setTestResult(null);
                    setApiKeyInput('');
                  }}
                  className={`p-3.5 rounded-xl border transition cursor-pointer flex items-start justify-between gap-3 ${
                    isSelected
                      ? 'bg-neutral-800/80 border-blue-500/50'
                      : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{connector.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-semibold text-neutral-200">{connector.name}</h4>
                        {isConnected ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Connected
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-800 text-neutral-400 font-medium">
                            Not Configured
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-1 line-clamp-2">{connector.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Configuration / Detail Panel */}
          <div className="md:col-span-5 p-6 flex flex-col justify-between bg-neutral-950/40">
            {selectedConnector ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{selectedConnector.icon}</span>
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-100">{selectedConnector.name}</h3>
                    <span className="text-[11px] text-neutral-400">{selectedConnector.category}</span>
                  </div>
                </div>

                <p className="text-xs text-neutral-300 leading-relaxed">{selectedConnector.description}</p>

                <a
                  href={selectedConnector.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:underline flex items-center gap-1 inline-flex"
                >
                  View Developer API Documentation <ExternalLink className="w-3 h-3" />
                </a>

                {/* API Key / Token input */}
                <div className="pt-2 border-t border-neutral-800 space-y-2">
                  <label className="text-xs font-medium text-neutral-200 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-neutral-400" />
                    Enter API Key or Access Token
                  </label>
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="sk_live_... / access_token"
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Test Feedback banner */}
                {testResult && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                      testResult.success
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                        : 'bg-red-500/10 border border-red-500/20 text-red-300'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    )}
                    <span className="leading-tight">{testResult.message}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={handleSaveKey}
                    disabled={saving || !apiKeyInput.trim()}
                    className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white rounded-xl text-xs font-medium transition flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/20"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                    Save & Encrypt
                  </button>

                  <button
                    onClick={() => handleTestConnection(selectedConnector.id)}
                    disabled={testing}
                    className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 disabled:text-neutral-500 text-neutral-200 rounded-xl text-xs font-medium transition flex items-center gap-1.5"
                  >
                    {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plug className="w-3.5 h-3.5" />}
                    Test
                  </button>

                  {selectedConnector.status === 'connected' && (
                    <button
                      onClick={() => handleDisconnect(selectedConnector.id)}
                      className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-xs font-medium transition"
                      title="Disconnect integration"
                    >
                      Disconnect
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-neutral-500 p-6 space-y-2">
                <Plug className="w-8 h-8 text-neutral-600" />
                <p className="text-xs font-medium text-neutral-400">Select a connector on the left to configure credentials.</p>
                <p className="text-[11px]">All credentials are encrypted at rest using AES-256-GCM in the backend vault.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
