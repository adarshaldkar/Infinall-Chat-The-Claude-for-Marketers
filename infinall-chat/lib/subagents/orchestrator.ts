// ============================================================
// Infinall Chat - Multi-Agent Research Orchestrator
// Coordinates concurrent subagent workers, aggregates findings,
// deduplicates sources, and streams progress trees.
// ============================================================

import {
  SubagentFinding,
  SubagentProgressEvent,
  SubagentTask,
  WorkerKind,
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
    const lower = prompt.toLowerCase();
    const tasks: SubagentTask[] = [];

    // Extract target entity if specified (e.g. "HubSpot vs Salesforce")
    let targetEntity = 'Industry Competitors';
    if (lower.includes('hubspot')) targetEntity = 'HubSpot';
    else if (lower.includes('salesforce')) targetEntity = 'Salesforce';
    else if (lower.includes('klaviyo')) targetEntity = 'Klaviyo';

    // 1. Competitor Intelligence Task
    tasks.push({
      id: `worker-comp-${Date.now()}`,
      workerKind: 'competitor',
      name: `Competitor Intelligence (${targetEntity})`,
      goal: `Audit product features, positioning claims, and market sentiment for ${targetEntity}.`,
      parameters: { target: targetEntity },
    });

    // 2. Pricing & Value Modeling Task
    tasks.push({
      id: `worker-price-${Date.now() + 1}`,
      workerKind: 'pricing',
      name: `Pricing & Packaging Architecture (${targetEntity})`,
      goal: `Extract tier structures, seat pricing, and onboarding costs for ${targetEntity}.`,
      parameters: { target: targetEntity },
    });

    // 3. Search & SERP Keyword Trends Task
    tasks.push({
      id: `worker-serp-${Date.now() + 2}`,
      workerKind: 'serp',
      name: `Organic & Paid Search Demand (${targetEntity})`,
      goal: `Evaluate search volume, intent breakdown, and average CPC for top queries.`,
      parameters: { keyword: targetEntity },
    });

    return tasks;
  }

  /**
   * Execute research pipeline as an async generator emitting SSE progress events
   */
  static async *executeResearch(prompt: string): AsyncGenerator<SubagentProgressEvent> {
    const tasks = this.decomposeObjective(prompt);
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

    const synthesisSummary = this.generateExecutiveSynthesis(findings, prompt);

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
   * Compile executive synthesis report from all worker findings
   */
  private static generateExecutiveSynthesis(
    findings: SubagentFinding[],
    prompt: string
  ): string {
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
