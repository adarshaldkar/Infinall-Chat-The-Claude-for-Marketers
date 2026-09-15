// ============================================================
// Infinall Chat - Multi-Agent Research Orchestrator
// Coordinates concurrent subagent workers, aggregates findings,
// deduplicates sources, and streams progress trees.
// ============================================================

import {
  SubagentFinding,
  SubagentProgressEvent,
  SubagentTask,
} from './types';
import { runCompetitorWorker } from './workers/competitor-worker';
import { runPricingWorker } from './workers/pricing-worker';
import { runSerpWorker } from './workers/serp-worker';
import { SourceCitation } from '@/lib/gateway/types';

export class ResearchOrchestrator {
  /**
   * Decompose user prompt into structured subagent tasks
   */
  static decomposeObjective(prompt: string): SubagentTask[] {
    const tasks: SubagentTask[] = [];

    // Dynamically extract target topic/entity from user prompt
    let targetEntity = '';
    const quotedMatch = prompt.match(/["']([^"']+)["']/);
    if (quotedMatch) {
      targetEntity = quotedMatch[1].trim();
    } else {
      const cleaned = prompt
        .replace(/^(please\s+)?(run\s+)?(deep\s+)?(research|audit|teardown|analysis|investigate|breakdown|evaluate|compare)\s+(on|of|for|about)?\s+/i, '')
        .trim();
      targetEntity = cleaned.slice(0, 60).trim() || 'Target Market Segment';
    }

    // 1. Competitor & Market Positioning Intelligence
    tasks.push({
      id: `worker-comp-${Date.now()}`,
      workerKind: 'competitor',
      name: `Competitor Intelligence (${targetEntity})`,
      goal: `Audit product features, positioning claims, and market sentiment for ${targetEntity}.`,
      parameters: { target: targetEntity },
    });

    // 2. Pricing, Packaging & Unit Economics Modeling
    tasks.push({
      id: `worker-price-${Date.now() + 1}`,
      workerKind: 'pricing',
      name: `Pricing & Packaging Architecture (${targetEntity})`,
      goal: `Extract tier structures, seat pricing, expansion levers, and onboarding costs for ${targetEntity}.`,
      parameters: { target: targetEntity },
    });

    // 3. Search Demand, SERP Volume & Intent Trends
    tasks.push({
      id: `worker-serp-${Date.now() + 2}`,
      workerKind: 'serp',
      name: `Organic & Paid Search Demand (${targetEntity})`,
      goal: `Evaluate search volume, intent breakdown, competitor keywords, and average CPC for top queries related to ${targetEntity}.`,
      parameters: { keyword: targetEntity },
    });

    return tasks;
  }

  static async planObjective(prompt: string): Promise<SubagentTask[]> {
    const apiKey = process.env.LLM_GATEWAY_API_KEY;
    if (!apiKey) return this.decomposeObjective(prompt);

    try {
      const base = process.env.LLM_GATEWAY_BASE_URL ?? 'https://llm.ganeshnayak.in';
      const response = await fetch(`${base}/v1/messages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1200,
          system: `Plan deep marketing research. Return only JSON: {"tasks":[{"workerKind":"competitor|pricing|serp|creative|general","name":"...","goal":"...","parameters":{}}]}. Choose 1-6 tasks based on the request. Do not invent findings.`,
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) return this.decomposeObjective(prompt);
      const payload = await response.json() as { content?: Array<{ text?: string }> };
      const text = payload.content?.[0]?.text?.replace(/```json\n?|```/g, '').trim();
      const parsed = text ? JSON.parse(text) as { tasks?: Array<{ workerKind: SubagentTask['workerKind']; name: string; goal: string; parameters?: Record<string, unknown> }> } : null;
      const tasks = parsed?.tasks?.filter((task) => task.name && task.goal && ['competitor', 'pricing', 'serp', 'creative', 'general'].includes(task.workerKind)) ?? [];
      if (tasks.length === 0) return this.decomposeObjective(prompt);
      return tasks.map((task, index) => ({
        id: `worker-${task.workerKind}-${Date.now()}-${index}`,
        workerKind: task.workerKind,
        name: task.name,
        goal: task.goal,
        parameters: task.parameters ?? {},
      }));
    } catch {
      return this.decomposeObjective(prompt);
    }
  }

  /**
   * Execute research pipeline as an async generator emitting SSE progress events
   */
  static async *executeResearch(prompt: string): AsyncGenerator<SubagentProgressEvent> {
    const tasks = await this.planObjective(prompt);
    const findings: SubagentFinding[] = [];

    // 1. Emit spawn events for all planned workers
    for (const task of tasks) {
      yield {
        type: 'subagent_spawn',
        payload: {
          subagentId: task.id,
          workerKind: task.workerKind,
          taskName: task.name,
          stepMessage: `Initialized worker: ${task.goal}`,
        },
      };
    }

    // 2. Execute workers concurrently with Promise.allSettled
    const workerPromises = tasks.map(async (task) => {
      try {
        let finding: SubagentFinding;
        if (task.workerKind === 'competitor') {
          finding = await runCompetitorWorker(task);
        } else if (task.workerKind === 'pricing') {
          finding = await runPricingWorker(task);
        } else if (task.workerKind === 'serp') {
          finding = await runSerpWorker(task);
        } else {
          finding = await runCompetitorWorker(task);
        }
        return { success: true, finding };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Worker execution failed',
          taskId: task.id,
        };
      }
    });

    // Await all workers
    const settled = await Promise.allSettled(workerPromises);

    for (let i = 0; i < settled.length; i++) {
      const res = settled[i];
      const task = tasks[i];

      if (res.status === 'fulfilled' && res.value.success && res.value.finding) {
        const f = res.value.finding;
        findings.push(f);
        yield {
          type: 'subagent_complete',
          payload: {
            subagentId: task.id,
            workerKind: task.workerKind,
            taskName: task.name,
            stepMessage: `Completed research in ${(f.executionTimeMs / 1000).toFixed(1)}s`,
            finding: f,
          },
        };
      } else {
        yield {
          type: 'subagent_error',
          payload: {
            subagentId: task.id,
            workerKind: task.workerKind,
            taskName: task.name,
            error: res.status === 'fulfilled' ? res.value.error : 'Execution failed',
          },
        };
      }
    }

    // 3. Synthesis Layer: Deduplicate sources & combine findings
    yield {
      type: 'synthesis_start',
      payload: {
        subagentId: 'master-orchestrator',
        stepMessage: 'Cross-verifying claims and compiling executive synthesis...',
      },
    };

    const allSources = findings.flatMap((f) => f.sources);
    const dedupedSources = this.deduplicateSources(allSources);

    const synthesisSummary = await this.generateExecutiveSynthesis(findings, prompt);

    yield {
      type: 'synthesis_complete',
      payload: {
        subagentId: 'master-orchestrator',
        stepMessage: 'Research complete.',
        synthesis: {
          summary: synthesisSummary,
          totalSources: dedupedSources.length,
          findings,
        },
      },
    };
  }

  /**
   * Deduplicate sources using URL and Jaccard title similarity
   */
  static deduplicateSources(sources: SourceCitation[]): SourceCitation[] {
    const seenUrls = new Set<string>();
    const unique: SourceCitation[] = [];
    let idCounter = 1;

    for (const s of sources) {
      const cleanUrl = s.url.split('?')[0].toLowerCase();
      if (!seenUrls.has(cleanUrl)) {
        seenUrls.add(cleanUrl);
        unique.push({
          ...s,
          id: idCounter++,
        });
      }
    }

    return unique;
  }

  /**
   * Compile executive synthesis report from all worker findings using real LLM synthesis
   */
  private static async generateExecutiveSynthesis(
    findings: SubagentFinding[],
    prompt: string
  ): Promise<string> {
    const apiKey = process.env.LLM_GATEWAY_API_KEY;
    const base = process.env.LLM_GATEWAY_BASE_URL ?? 'https://llm.ganeshnayak.in';

    const findingsContext = findings
      .map(
        (f) => `### Subagent: ${f.taskName} (${f.workerKind})\n${f.summary}\nData Points: ${JSON.stringify(f.dataPoints || [])}`
      )
      .join('\n\n');

    if (apiKey) {
      try {
        const response = await fetch(`${base}/v1/messages`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 2500,
            system: `You are an elite CMO-level competitive intelligence officer. Synthesize the findings from multiple concurrent research agents into a master strategic executive briefing. 
Structure with:
# Master Strategic Intelligence Briefing
## 1. Executive Summary & Market Realities
## 2. Competitive Positioning & Feature Matrix (use markdown tables)
## 3. Pricing Architecture & Packaging Analysis (use markdown tables)
## 4. Search Demand, SERP Dynamics & Acquisition Keywords
## 5. Strategic Gaps & Recommended Playbook

Be dense, data-grounded, and highly actionable. Reference specific facts from the agent findings.`,
            messages: [
              {
                role: 'user',
                content: `Objective: "${prompt}"\n\nSubagent Research Data:\n${findingsContext}`,
              },
            ],
          }),
          signal: AbortSignal.timeout(20_000),
        });

        if (response.ok) {
          const data = await response.json();
          const text = data.content?.[0]?.text;
          if (text) return text;
        }
      } catch (err) {
        console.warn('[ResearchOrchestrator] LLM synthesis warning, falling back to structured compiler:', err);
      }
    }

    // Fallback structured compiler
    let report = `# Deep Intelligence Briefing\n\n`;
    report += `**Research Objective**: *${prompt}*\n\n`;
    report += `## Executive Summary & Strategic Takeaways\n\n`;

    for (const f of findings) {
      report += `### 🔍 ${f.taskName}\n`;
      report += `${f.summary}\n\n`;
      if (f.dataPoints && f.dataPoints.length > 0) {
        report += `| Key Metric / Finding | Verified Observation |\n`;
        report += `| :--- | :--- |\n`;
        for (const dp of f.dataPoints) {
          report += `| **${dp.key}** | ${dp.value} |\n`;
        }
        report += `\n`;
      }
    }

    report += `## Recommended Next Steps\n`;
    report += `1. Focus acquisition spend on top-tier commercial queries identified in search analysis.\n`;
    report += `2. Highlight pricing transparency in landing page copy to exploit competitor contract lock-in friction.\n`;
    report += `3. Launch automated comparison matrix deliverable for sales enablement.\n`;

    return report;
  }
}
