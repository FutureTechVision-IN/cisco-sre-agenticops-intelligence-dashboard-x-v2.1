/**
 * Validation Pipeline — pluggable, centralized validation orchestrator.
 *
 * Each validator is a self-contained "stage" registered with the pipeline.
 * The pipeline runs stages in parallel where possible, collects results
 * into a unified report, and exposes a single quality score.
 */

import { dataAccuracyValidator, DataValidationResult } from "./data-accuracy-validator";
import { DataSyncValidator, SyncReport } from "./data-sync-validator";
import { runDataVerification, DataVerificationResult } from "./data-verification-service";
import { runAllValidationTests } from "./data-validation-tests";
import { storage } from "./storage";

// ─── Unified types ──────────────────────────────────────────────────────────

export type StageCategory =
  | "accuracy"
  | "sync"
  | "completeness"
  | "format"
  | "spec-compliance";

export type StageSeverity = "critical" | "high" | "medium" | "low";

export interface StageResult {
  stage: string;
  category: StageCategory;
  passed: boolean;
  score: number;            // 0-100
  severity: StageSeverity;
  checks: number;
  failures: number;
  warnings: number;
  durationMs: number;
  details: unknown;         // stage-specific payload
  error?: string;
}

export interface PipelineReport {
  timestamp: string;
  overallScore: number;     // weighted 0-100
  passed: boolean;
  stages: StageResult[];
  summary: {
    totalChecks: number;
    totalFailures: number;
    totalWarnings: number;
    durationMs: number;
  };
}

export interface ValidatorStage {
  name: string;
  category: StageCategory;
  severity: StageSeverity;
  weight: number;           // relative weight for overall score
  run: () => Promise<StageResult>;
}

// ─── Pipeline implementation ────────────────────────────────────────────────

class ValidationPipeline {
  private stages: ValidatorStage[] = [];

  register(stage: ValidatorStage): void {
    this.stages.push(stage);
  }

  unregister(name: string): void {
    this.stages = this.stages.filter(s => s.name !== name);
  }

  getRegisteredStages(): string[] {
    return this.stages.map(s => s.name);
  }

  async run(stageFilter?: StageCategory[]): Promise<PipelineReport> {
    const start = Date.now();
    const active = stageFilter
      ? this.stages.filter(s => stageFilter.includes(s.category))
      : this.stages;

    const results = await Promise.allSettled(active.map(s => s.run()));

    const stageResults: StageResult[] = results.map((r, i) => {
      if (r.status === "fulfilled") return r.value;
      return {
        stage: active[i].name,
        category: active[i].category,
        passed: false,
        score: 0,
        severity: active[i].severity,
        checks: 0,
        failures: 1,
        warnings: 0,
        durationMs: 0,
        details: null,
        error: r.reason?.message ?? String(r.reason),
      };
    });

    const totalWeight = active.reduce((s, st) => s + st.weight, 0) || 1;
    const weightedScore = stageResults.reduce((sum, sr, i) => {
      return sum + sr.score * (active[i]?.weight ?? 1);
    }, 0) / totalWeight;

    const elapsed = Date.now() - start;

    return {
      timestamp: new Date().toISOString(),
      overallScore: Math.round(weightedScore * 10) / 10,
      passed: stageResults.every(s => s.passed || s.severity === "low"),
      stages: stageResults,
      summary: {
        totalChecks: stageResults.reduce((s, r) => s + r.checks, 0),
        totalFailures: stageResults.reduce((s, r) => s + r.failures, 0),
        totalWarnings: stageResults.reduce((s, r) => s + r.warnings, 0),
        durationMs: elapsed,
      },
    };
  }
}

// ─── Pre-built stage adapters ───────────────────────────────────────────────

function accuracyStage(): ValidatorStage {
  return {
    name: "data-accuracy",
    category: "accuracy",
    severity: "critical",
    weight: 3,
    async run(): Promise<StageResult> {
      const t0 = Date.now();
      const result: DataValidationResult = await dataAccuracyValidator.runFullValidation();
      const score =
        (result.summary.passed / Math.max(1, result.summary.totalChecks)) * 100;
      return {
        stage: "data-accuracy",
        category: "accuracy",
        passed: result.isValid,
        score: Math.round(score),
        severity: "critical",
        checks: result.summary.totalChecks,
        failures: result.summary.failed,
        warnings: result.summary.warnings,
        durationMs: Date.now() - t0,
        details: result,
      };
    },
  };
}

function syncStage(): ValidatorStage {
  return {
    name: "data-sync",
    category: "sync",
    severity: "high",
    weight: 2,
    async run(): Promise<StageResult> {
      const t0 = Date.now();
      const report: SyncReport =
        await DataSyncValidator.runComprehensiveValidation(storage);
      const passed = report.results.filter(r => r.isValid).length;
      const total = report.results.length || 1;
      return {
        stage: "data-sync",
        category: "sync",
        passed: report.overallStatus === "in_sync",
        score: Math.round((passed / total) * 100),
        severity: "high",
        checks: total,
        failures: total - passed,
        warnings: 0,
        durationMs: Date.now() - t0,
        details: report,
      };
    },
  };
}

function completenessStage(): ValidatorStage {
  return {
    name: "data-completeness",
    category: "completeness",
    severity: "high",
    weight: 2,
    async run(): Promise<StageResult> {
      const t0 = Date.now();
      const result: DataVerificationResult = await runDataVerification();
      return {
        stage: "data-completeness",
        category: "completeness",
        passed: result.overallScore >= 80,
        score: Math.round(result.overallScore),
        severity: "high",
        checks: result.monthlyChecks?.length ?? 0,
        failures: result.dataGaps?.length ?? 0,
        warnings: result.qualityIssues?.length ?? 0,
        durationMs: Date.now() - t0,
        details: result,
      };
    },
  };
}

function specComplianceStage(): ValidatorStage {
  return {
    name: "spec-compliance",
    category: "spec-compliance",
    severity: "medium",
    weight: 1,
    async run(): Promise<StageResult> {
      const t0 = Date.now();
      const report = await runAllValidationTests();
      const passed = report.results?.filter((r: { passed: boolean }) => r.passed).length ?? 0;
      const total = report.results?.length ?? 0;
      return {
        stage: "spec-compliance",
        category: "spec-compliance",
        passed: report.allPassed ?? false,
        score: total > 0 ? Math.round((passed / total) * 100) : 0,
        severity: "medium",
        checks: total,
        failures: total - passed,
        warnings: 0,
        durationMs: Date.now() - t0,
        details: report,
      };
    },
  };
}

// ─── Singleton pipeline with default stages ─────────────────────────────────

export const validationPipeline = new ValidationPipeline();

validationPipeline.register(accuracyStage());
validationPipeline.register(syncStage());
validationPipeline.register(completenessStage());
validationPipeline.register(specComplianceStage());

export { ValidationPipeline };
