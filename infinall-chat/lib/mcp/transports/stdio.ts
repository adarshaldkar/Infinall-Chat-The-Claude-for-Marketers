// ============================================================
// MCP Transport: Local Stdio Process Transport
// Strict executable whitelist to prevent arbitrary command execution
// ============================================================

import { spawn, ChildProcess } from 'child_process';

const ALLOWED_EXECUTABLES = new Set([
  'node',
  'npx',
  'python',
  'python3',
  'uvx',
  'docker',
]);

export interface StdioConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  timeoutMs?: number;
}

export class StdioTransport {
  private command: string;
  private args: string[];
  private env: Record<string, string>;
  private timeoutMs: number;

  constructor(config: StdioConfig) {
    const baseCmd = config.command.trim().toLowerCase().split(/[/\\]/).pop() ?? '';
    const cleanCmd = baseCmd.replace(/\.exe$/, '');

    if (!ALLOWED_EXECUTABLES.has(cleanCmd)) {
      throw new Error(`Security Violation: Command "${config.command}" is not in the trusted MCP executable whitelist.`);
    }

    this.command = config.command;
    this.args = config.args ?? [];
    this.env = config.env ?? {};
    this.timeoutMs = config.timeoutMs ?? 20_000;
  }

  async sendJsonRpc(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    return new Promise((resolve, reject) => {
      let childProc: ChildProcess;
      try {
        childProc = spawn(this.command, this.args, {
          env: { ...process.env, ...this.env },
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: false, // Security: never invoke through shell
        });
      } catch (err) {
        return reject(new Error(`Failed to spawn MCP stdio process: ${err instanceof Error ? err.message : String(err)}`));
      }

      let stdoutData = '';
      let stderrData = '';
      const timer = setTimeout(() => {
        childProc.kill('SIGTERM');
        reject(new Error(`MCP stdio process timed out after ${this.timeoutMs}ms`));
      }, this.timeoutMs);

      childProc.stdout?.on('data', (chunk) => {
        stdoutData += chunk.toString();
      });

      childProc.stderr?.on('data', (chunk) => {
        stderrData += chunk.toString();
      });

      childProc.on('close', (code) => {
        clearTimeout(timer);
        if (code !== 0 && !stdoutData) {
          return reject(new Error(`MCP stdio exited with code ${code}: ${stderrData}`));
        }

        try {
          const lines = stdoutData.trim().split('\n');
          const lastLine = lines[lines.length - 1];
          const response = JSON.parse(lastLine);
          if (response.error) {
            reject(new Error(`MCP stdio RPC error: ${response.error.message || JSON.stringify(response.error)}`));
          } else {
            resolve(response.result);
          }
        } catch (err) {
          reject(new Error(`Failed to parse MCP stdio output: ${stdoutData}. Error: ${err instanceof Error ? err.message : String(err)}`));
        }
      });

      const requestPayload = JSON.stringify({
        jsonrpc: '2.0',
        id: `stdio-${Date.now()}`,
        method,
        params,
      }) + '\n';

      process.stdin?.write(requestPayload);
      process.stdin?.end();
    });
  }
}
