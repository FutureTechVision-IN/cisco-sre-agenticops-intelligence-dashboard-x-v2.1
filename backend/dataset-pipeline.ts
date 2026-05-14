/**
 * Dataset Ingestion Pipeline v2 — Active Dataset Selection & Automated Validation
 *
 * Watches data/ (and optionally a OneDrive-synced folder) for CSV files.
 * For every file it:
 *  1. Normalizes/auto-corrects column headers
 *  2. Validates month coverage, row count, duplicates
 *  3. Scores the dataset for active-selection ranking
 *  4. Activates the best dataset and tells csv-data-service to use it
 *
 * Selection rules (in priority order):
 *  - latest max month wins
 *  - if tied, greater month coverage (count)
 *  - if still tied, higher row count
 *
 * Singleton: call DatasetPipeline.initialize() once at server startup.
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { watch, accessSync, createReadStream, type FSWatcher } from 'fs';
import { createInterface as createReadlineInterface } from 'readline';
import { EventEmitter } from 'events';
import { loadCSVData, clearCache, setActiveCSVPath, getCSVPath } from './csv-data-service';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REQUIRED_COLUMNS = [
  'FIELD_NOTICE', 'FIRST_PUBLISHED', 'FN_TITLE', 'FN_TYPE',
  'TOT_VULN', 'POT_VULN', 'NOT_VULN',
  'DATE_IMPORTED', 'CPYKEY', 'CUSTOMER_NAME',
] as const;

type RequiredColumn = typeof REQUIRED_COLUMNS[number];

const COLUMN_ALIASES: Record<string, RequiredColumn> = {
  'customer_name': 'CUSTOMER_NAME', 'Customer_Name': 'CUSTOMER_NAME',
  'customername': 'CUSTOMER_NAME', 'field_notice': 'FIELD_NOTICE',
  'fieldnotice': 'FIELD_NOTICE', 'fn_type': 'FN_TYPE', 'fntype': 'FN_TYPE',
  'fn_title': 'FN_TITLE', 'fntitle': 'FN_TITLE',
  'first_published': 'FIRST_PUBLISHED', 'firstpublished': 'FIRST_PUBLISHED',
  'tot_vuln': 'TOT_VULN', 'totvuln': 'TOT_VULN',
  'pot_vuln': 'POT_VULN', 'potvuln': 'POT_VULN',
  'not_vuln': 'NOT_VULN', 'notvuln': 'NOT_VULN',
  'date_imported': 'DATE_IMPORTED', 'dateimported': 'DATE_IMPORTED',
  'cpykey': 'CPYKEY', 'cpy_key': 'CPYKEY',
  'company_key': 'CPYKEY', 'company_name': 'CUSTOMER_NAME',
  'cust_name': 'CUSTOMER_NAME', 'import_date': 'DATE_IMPORTED',
  'id': 'FIELD_NOTICE',
  // PSIRT advisory schema aliases
  'psirtadvisoryid': 'FIELD_NOTICE',
  'bulletintitle': 'FN_TITLE',
  'bulletinfirstpublished': 'FIRST_PUBLISHED',
  'sir': 'FN_TYPE',
  'totalvulnerable': 'TOT_VULN',
  'totalpotentiallyvulnerable': 'POT_VULN',
  'totalnotvulnerable': 'NOT_VULN',
  'cpyname': 'CUSTOMER_NAME',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ColumnCorrection {
  original: string;
  corrected: RequiredColumn;
  method: 'alias' | 'case';
}

export interface MonthGap {
  month: string;
  severity: 'warning' | 'critical';
  message: string;
}

export interface PipelineValidationResult {
  file: string;
  filePath: string;
  timestamp: string;
  recordCount: number;
  columnsOk: boolean;
  missingColumns: string[];
  extraColumns: string[];
  corrections: ColumnCorrection[];
  monthsOk: boolean;
  detectedMonths: string[];
  expectedMonths: string[];
  monthGaps: MonthGap[];
  coveragePercent: number;
  detectedRange: { start: string; end: string } | null;
  minMonth: string | null;
  maxMonth: string | null;
  autoIngestible: boolean;
  requiresManualReview: boolean;
  errors: string[];
  warnings: string[];
}

export interface ActiveDatasetInfo {
  filename: string;
  filePath: string;
  minMonth: string;
  maxMonth: string;
  months: string[];
  missingMonths: string[];
  rowCount: number;
  validationStatus: 'healthy' | 'incomplete' | 'invalid';
  activatedAt: string;
  activationReason: string;
  reportingWarning: string | null;
}

export type PipelineEvent =
  | { type: 'file-detected'; file: string }
  | { type: 'validation-start'; file: string }
  | { type: 'validation-complete'; result: PipelineValidationResult }
  | { type: 'auto-correct-applied'; file: string; corrections: ColumnCorrection[] }
  | { type: 'activation-decision'; file: string; activated: boolean; reason: string }
  | { type: 'ingestion-start'; file: string }
  | { type: 'ingestion-complete'; file: string; recordCount: number; durationMs: number }
  | { type: 'ingestion-failed'; file: string; error: string }
  | { type: 'error'; message: string };

// ---------------------------------------------------------------------------
// Month utilities
// ---------------------------------------------------------------------------

const MONTH_MAP: Record<string, string> = {
  jan: '01', january: '01', feb: '02', february: '02', mar: '03', march: '03',
  apr: '04', april: '04', may: '05', jun: '06', june: '06', jul: '07', july: '07',
  aug: '08', august: '08', sep: '09', september: '09', oct: '10', october: '10',
  nov: '11', november: '11', dec: '12', december: '12',
};

function generateMonthRange(start: string, end: string): string[] {
  const months: string[] = [];
  const [sy, sm] = start.split('-').map(Number);
  const [ey, em] = end.split('-').map(Number);
  for (let y = sy; y <= ey; y++) {
    const mStart = y === sy ? sm : 1;
    const mEnd = y === ey ? em : 12;
    for (let m = mStart; m <= mEnd; m++) {
      months.push(y + '-' + String(m).padStart(2, '0'));
    }
  }
  return months;
}

function inferRangeFromFilename(filename: string): { start: string; end: string } | null {
  const pattern = /([a-z]+)(\d{2})/gi;
  const matches = [...filename.matchAll(pattern)];
  if (matches.length < 2) return null;
  const resolve = (monthStr: string, yearStr: string) => {
    const mm = MONTH_MAP[monthStr.toLowerCase()];
    if (!mm) return null;
    const yy = parseInt(yearStr);
    const yyyy = yy < 50 ? 2000 + yy : 1900 + yy;
    return yyyy + '-' + mm;
  };
  const start = resolve(matches[0][1], matches[0][2]);
  const end = resolve(matches[1][1], matches[1][2]);
  if (!start || !end) return null;
  return { start, end };
}

function getExpectedReportingMonth(): string {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return prev.getFullYear() + '-' + String(prev.getMonth() + 1).padStart(2, '0');
}

// ---------------------------------------------------------------------------
// Column resolution
// ---------------------------------------------------------------------------

function resolveColumnName(header: string): { canonical: RequiredColumn; correction: ColumnCorrection | null } | null {
  const trimmed = header.trim();
  if ((REQUIRED_COLUMNS as readonly string[]).includes(trimmed)) {
    return { canonical: trimmed as RequiredColumn, correction: null };
  }
  const upper = trimmed.toUpperCase();
  const caseMatch = REQUIRED_COLUMNS.find(c => c === upper);
  if (caseMatch) {
    return { canonical: caseMatch, correction: { original: trimmed, corrected: caseMatch, method: 'case' } };
  }
  const lookupKey = trimmed.toLowerCase().replace(/\s+/g, '');
  const alias = COLUMN_ALIASES[lookupKey];
  if (alias) {
    return { canonical: alias, correction: { original: trimmed, corrected: alias, method: 'alias' } };
  }
  return null;
}

// ---------------------------------------------------------------------------
// File validation
// ---------------------------------------------------------------------------

async function validateFile(filePath: string): Promise<PipelineValidationResult> {
  const filename = path.basename(filePath);
  const errors: string[] = [];
  const warnings: string[] = [];
  const corrections: ColumnCorrection[] = [];

  const handle = await fs.open(filePath, 'r');
  const headerBuf = Buffer.alloc(4096);
  await handle.read(headerBuf, 0, 4096, 0);
  await handle.close();

  const headerLine = headerBuf.toString('utf-8').split(/\r?\n/)[0];
  const rawColumns = headerLine.split(',').map(c => c.trim());

  const resolvedSet = new Set<RequiredColumn>();
  const extraColumns: string[] = [];
  for (const col of rawColumns) {
    const res = resolveColumnName(col);
    if (res) {
      resolvedSet.add(res.canonical);
      if (res.correction) corrections.push(res.correction);
    } else {
      extraColumns.push(col);
    }
  }

  const missingColumns = REQUIRED_COLUMNS.filter(c => !resolvedSet.has(c));
  if (missingColumns.length > 0) {
    errors.push('Missing required columns: ' + missingColumns.join(', '));
  }
  if (extraColumns.length > 0) {
    warnings.push('Extra columns (ignored): ' + extraColumns.join(', '));
  }

  // Build column→canonical map from the already-resolved header.
  const colMap = new Map<string, RequiredColumn>();
  for (const col of rawColumns) {
    const res = resolveColumnName(col);
    if (res) colMap.set(col, res.canonical);
  }

  // Use the DATE_IMPORTED column index for fast streaming month detection.
  const dateColIndex = rawColumns.findIndex(c => colMap.get(c) === 'DATE_IMPORTED');

  // Stream through the file line-by-line to count records and collect months
  // without loading the entire file into a single string (avoids V8 string length limit
  // for large files like psirt_nov25-feb26.csv which is ~1.5 GB).
  const monthSet = new Set<string>();
  let recordCount = 0;
  const rl = createReadlineInterface({ input: createReadStream(filePath), crlfDelay: Infinity });
  let isFirstLine = true;
  for await (const line of rl) {
    if (isFirstLine) { isFirstLine = false; continue; } // skip header
    if (!line.trim()) continue;
    recordCount++;
    if (dateColIndex >= 0) {
      // Simple split is fine for date values (no commas in timestamps).
      const raw = line.split(',')[dateColIndex] ?? '';
      const dateVal = raw.trim().replace(/^"|"$/g, '');
      const month = dateVal.substring(0, 7);
      if (/^\d{4}-\d{2}$/.test(month)) monthSet.add(month);
    }
  }

  const detectedMonths = Array.from(monthSet).sort();
  const minMonth = detectedMonths.length > 0 ? detectedMonths[0] : null;
  const maxMonth = detectedMonths.length > 0 ? detectedMonths[detectedMonths.length - 1] : null;

  const inferredRange = inferRangeFromFilename(filename);
  let expectedMonths: string[] = [];
  let detectedRange: { start: string; end: string } | null = null;

  if (inferredRange) {
    expectedMonths = generateMonthRange(inferredRange.start, inferredRange.end);
    detectedRange = inferredRange;
  } else if (detectedMonths.length >= 2) {
    expectedMonths = generateMonthRange(detectedMonths[0], detectedMonths[detectedMonths.length - 1]);
    detectedRange = { start: detectedMonths[0], end: detectedMonths[detectedMonths.length - 1] };
  }

  const monthGaps: MonthGap[] = [];
  for (const em of expectedMonths) {
    if (!monthSet.has(em)) {
      const idx = expectedMonths.indexOf(em);
      const isInterior = idx > 0 && idx < expectedMonths.length - 1;
      monthGaps.push({
        month: em,
        severity: 'warning',
        message: isInterior
          ? 'Interior month ' + em + ' missing — data gap in the middle of the range'
          : 'Edge month ' + em + ' missing — incomplete boundary data',
      });
    }
  }

  if (monthGaps.length > 0) {
    const interiorGaps = monthGaps.filter(g => g.message.includes('Interior'));
    if (interiorGaps.length > 0) {
      warnings.push(interiorGaps.length + ' interior month gap(s): ' + interiorGaps.map(g => g.month).join(', ') + ' — data will still be ingested');
    }
    const edgeGaps = monthGaps.filter(g => !g.message.includes('Interior'));
    if (edgeGaps.length > 0) {
      warnings.push(edgeGaps.length + ' edge month gap(s): ' + edgeGaps.map(g => g.month).join(', '));
    }
  }

  const coveragePercent = expectedMonths.length > 0
    ? ((expectedMonths.length - monthGaps.length) / expectedMonths.length) * 100
    : detectedMonths.length > 0 ? 100 : 0;

  if (recordCount < 1000) {
    warnings.push('Low record count (' + recordCount + ') — verify this is the correct dataset');
  }

  const columnsOk = missingColumns.length === 0;
  const monthsOk = monthGaps.length === 0;
  const autoIngestible = columnsOk && recordCount > 0;
  const requiresManualReview = !autoIngestible || errors.length > 0;

  return {
    file: filename, filePath,
    timestamp: new Date().toISOString(),
    recordCount,
    columnsOk, missingColumns, extraColumns, corrections,
    monthsOk, detectedMonths, expectedMonths, monthGaps, coveragePercent,
    detectedRange, minMonth, maxMonth,
    autoIngestible, requiresManualReview,
    errors, warnings,
  };
}

// ---------------------------------------------------------------------------
// Auto-correct: rewrite CSV headers in-place
// ---------------------------------------------------------------------------

// Large-file threshold: skip in-place header rewrite above this size.
// The csv-data-service will remap columns in-memory instead.
const LARGE_FILE_CORRECTION_THRESHOLD = 100 * 1024 * 1024; // 100 MB

async function applyColumnCorrections(filePath: string, corrections: ColumnCorrection[]): Promise<void> {
  if (corrections.length === 0) return;

  // Skip full rewrite for large files — too memory-intensive.
  // csv-data-service handles the column remapping in-memory during load.
  const stats = await fs.stat(filePath);
  if (stats.size > LARGE_FILE_CORRECTION_THRESHOLD) {
    console.log('[PIPELINE] Large file (' + (stats.size / 1024 / 1024).toFixed(0) + 'MB) — skipping header rewrite; columns remapped in-memory at load time');
    return;
  }

  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);
  if (lines.length === 0) return;

  let headerLine = lines[0];
  for (const c of corrections) {
    const escaped = c.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    headerLine = headerLine.replace(new RegExp('(^|,)' + escaped + '(,|$)'), '$1' + c.corrected + '$2');
  }
  lines[0] = headerLine;
  await fs.writeFile(filePath, lines.join('\n'), 'utf-8');
}

// ---------------------------------------------------------------------------
// Pipeline singleton
// ---------------------------------------------------------------------------

export class DatasetPipeline extends EventEmitter {
  private static instance: DatasetPipeline | null = null;

  private dataDir: string;
  private oneDriveDataDir: string | null;
  private watchers: FSWatcher[] = [];
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private processing = new Set<string>();

  private history: PipelineValidationResult[] = [];
  private validDatasets = new Map<string, PipelineValidationResult>();

  private activeDataset: ActiveDatasetInfo | null = null;
  private forceSelected: string | null = null;

  private constructor(dataDir: string, oneDriveDataDir?: string) {
    super();
    this.dataDir = dataDir;
    this.oneDriveDataDir = oneDriveDataDir ?? null;
  }

  static initialize(dataDir?: string, oneDriveDataDir?: string): DatasetPipeline {
    if (DatasetPipeline.instance) return DatasetPipeline.instance;
    const dir = dataDir || path.join(process.cwd(), 'data');
    DatasetPipeline.instance = new DatasetPipeline(dir, oneDriveDataDir);
    return DatasetPipeline.instance;
  }

  static getInstance(): DatasetPipeline | null {
    return DatasetPipeline.instance;
  }

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  async start(): Promise<void> {
    console.log('[PIPELINE] Starting dataset pipeline — primary dir: ' + this.dataDir);
    if (this.oneDriveDataDir) {
      console.log('[PIPELINE] OneDrive watch dir: ' + this.oneDriveDataDir);
    }

    await fs.mkdir(this.dataDir, { recursive: true });

    await this.scanDirectory(this.dataDir);

    if (this.oneDriveDataDir) {
      try {
        await fs.access(this.oneDriveDataDir);
        await this.scanDirectory(this.oneDriveDataDir);
      } catch {
        console.log('[PIPELINE] OneDrive data dir not locally synced yet — will watch when available');
      }
    }

    this.electActiveDataset('startup-scan');

    this.startWatcher(this.dataDir);
    if (this.oneDriveDataDir) {
      try {
        await fs.access(this.oneDriveDataDir);
        this.startWatcher(this.oneDriveDataDir);
      } catch { /* watched when it appears */ }
    }

    console.log('[PIPELINE] File watcher(s) active');
  }

  stop(): void {
    for (const w of this.watchers) w.close();
    this.watchers = [];
    for (const timer of this.debounceTimers.values()) clearTimeout(timer);
    this.debounceTimers.clear();
    console.log('[PIPELINE] Pipeline stopped');
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  async processFile(filePath: string, autoActivate = true): Promise<PipelineValidationResult> {
    const filename = path.basename(filePath);
    if (this.processing.has(filename)) {
      throw new Error('File ' + filename + ' is already being processed');
    }
    this.processing.add(filename);

    try {
      this.emit('pipeline', { type: 'validation-start', file: filename } as PipelineEvent);
      console.log('[PIPELINE] Validating ' + filename + '...');

      let result = await validateFile(filePath);

      if (result.corrections.length > 0) {
        console.log('[PIPELINE] Auto-correcting ' + result.corrections.length + ' column header(s) in ' + filename);
        const origCorrections = result.corrections;
        await applyColumnCorrections(filePath, result.corrections);
        this.emit('pipeline', { type: 'auto-correct-applied', file: filename, corrections: result.corrections } as PipelineEvent);

        // For large files applyColumnCorrections skips the in-place rewrite, so the second
        // validateFile would see unchanged column names and resolve them identically.
        // Skip the redundant re-validate in that case — columns already confirmed OK.
        const fileStats = await fs.stat(filePath);
        if (fileStats.size <= LARGE_FILE_CORRECTION_THRESHOLD) {
          result = await validateFile(filePath);
        }
        result.corrections = origCorrections;
      }

      this.emit('pipeline', { type: 'validation-complete', result } as PipelineEvent);
      this.history.push(result);

      if (result.autoIngestible) {
        this.validDatasets.set(filename, result);
      } else {
        this.validDatasets.delete(filename);
      }

      this.logValidationSummary(result);

      if (autoActivate && result.autoIngestible) {
        this.electActiveDataset('new-file: ' + filename);
      } else if (!result.autoIngestible) {
        this.logActivationDecision(filename, false, 'Failed validation: ' + result.errors.join('; '));
      }

      await this.writeReport(result);
      return result;
    } finally {
      this.processing.delete(filename);
    }
  }

  async forceSelectDataset(filename: string): Promise<ActiveDatasetInfo> {
    const safe = path.basename(filename);

    let filePath = path.join(this.dataDir, safe);
    try {
      await fs.access(filePath);
    } catch {
      if (this.oneDriveDataDir) {
        filePath = path.join(this.oneDriveDataDir, safe);
        await fs.access(filePath);
      } else {
        throw new Error('File ' + safe + ' not found in data directory');
      }
    }

    const result = await this.processFile(filePath, false);
    if (!result.autoIngestible) {
      throw new Error('File ' + safe + ' failed validation: ' + result.errors.join('; '));
    }

    if (!filePath.startsWith(this.dataDir)) {
      const dest = path.join(this.dataDir, safe);
      await fs.copyFile(filePath, dest);
      result.filePath = dest;
      filePath = dest;
      console.log('[PIPELINE] Copied ' + safe + ' from OneDrive to primary data dir');
    }

    this.forceSelected = safe;
    this.validDatasets.set(safe, result);
    this.activateDataset(safe, result, 'Manual force-select by admin');

    console.log('[PIPELINE] Force-selected: ' + safe + ' — auto-election suspended until cleared');
    return this.activeDataset!;
  }

  clearForceSelect(): void {
    if (this.forceSelected) {
      console.log('[PIPELINE] Force-select lock cleared (was: ' + this.forceSelected + ')');
      this.forceSelected = null;
      this.electActiveDataset('force-select-cleared');
    }
  }

  getActiveDataset(): ActiveDatasetInfo | null {
    return this.activeDataset;
  }

  getHistory(): PipelineValidationResult[] {
    return [...this.history];
  }

  getLatestResult(filename: string): PipelineValidationResult | undefined {
    return [...this.history].reverse().find(r => r.file === filename);
  }

  getValidDatasets(): PipelineValidationResult[] {
    return Array.from(this.validDatasets.values());
  }

  // -----------------------------------------------------------------------
  // Active dataset election
  // -----------------------------------------------------------------------

  private electActiveDataset(trigger: string): void {
    if (this.forceSelected) {
      console.log('[PIPELINE] Election skipped — force-selected: ' + this.forceSelected);
      return;
    }

    // Prune entries for files that no longer exist on disk
    for (const [name, result] of this.validDatasets) {
      try {
        accessSync(result.filePath);
      } catch {
        console.log('[PIPELINE] Pruning stale entry: ' + name + ' (file removed)');
        this.validDatasets.delete(name);
      }
    }

    const candidates = Array.from(this.validDatasets.entries());
    if (candidates.length === 0) {
      console.warn('[PIPELINE] No valid datasets available — cannot elect active dataset');
      return;
    }

    // Sort: latest maxMonth -> more months -> more rows
    candidates.sort(([, a], [, b]) => {
      const maxCmp = (b.maxMonth ?? '').localeCompare(a.maxMonth ?? '');
      if (maxCmp !== 0) return maxCmp;
      const covCmp = b.detectedMonths.length - a.detectedMonths.length;
      if (covCmp !== 0) return covCmp;
      return b.recordCount - a.recordCount;
    });

    const [winnerFile, winnerResult] = candidates[0];
    const currentActive = this.activeDataset?.filename;

    const reasons: string[] = [];
    if (candidates.length === 1) {
      reasons.push('only valid dataset');
    } else {
      const runner = candidates[1][1];
      if ((winnerResult.maxMonth ?? '') > (runner.maxMonth ?? '')) {
        reasons.push('latest max month ' + winnerResult.maxMonth + ' vs ' + runner.maxMonth);
      } else if (winnerResult.detectedMonths.length > runner.detectedMonths.length) {
        reasons.push('more months (' + winnerResult.detectedMonths.length + ' vs ' + runner.detectedMonths.length + ')');
      } else {
        reasons.push('more rows (' + winnerResult.recordCount + ' vs ' + runner.recordCount + ')');
      }
    }
    const reason = 'Elected: ' + reasons.join(', ') + ' [trigger: ' + trigger + ']';

    if (currentActive === winnerFile) {
      console.log('[PIPELINE] Active dataset unchanged: ' + winnerFile + ' — ' + reason);
      return;
    }

    // Log rejection of losers
    for (let i = 1; i < candidates.length; i++) {
      const [loserFile, loserResult] = candidates[i];
      const loserReasons: string[] = [];
      if ((loserResult.maxMonth ?? '') < (winnerResult.maxMonth ?? '')) {
        loserReasons.push('max month ' + loserResult.maxMonth + ' < ' + winnerResult.maxMonth);
      }
      if (loserResult.detectedMonths.length < winnerResult.detectedMonths.length) {
        loserReasons.push('fewer months (' + loserResult.detectedMonths.length + ')');
      }
      if (loserResult.recordCount < winnerResult.recordCount) {
        loserReasons.push('fewer rows (' + loserResult.recordCount + ')');
      }
      this.logActivationDecision(loserFile, false, 'Outranked by ' + winnerFile + ': ' + loserReasons.join(', '));
    }

    this.activateDataset(winnerFile, winnerResult, reason);
  }

  private activateDataset(filename: string, result: PipelineValidationResult, reason: string): void {
    const expectedMonth = getExpectedReportingMonth();
    const missingMonths = result.expectedMonths.filter(m => !result.detectedMonths.includes(m));
    const hasExpectedMonth = result.detectedMonths.includes(expectedMonth);

    let reportingWarning: string | null = null;
    if (!hasExpectedMonth) {
      reportingWarning = 'Dataset is healthy structurally but incomplete for expected reporting range — expected month ' + expectedMonth + ' is missing';
    }

    let validationStatus: ActiveDatasetInfo['validationStatus'] = 'healthy';
    if (!result.autoIngestible) {
      validationStatus = 'invalid';
    } else if (reportingWarning || missingMonths.length > 0) {
      validationStatus = 'incomplete';
    }

    this.activeDataset = {
      filename,
      filePath: result.filePath,
      minMonth: result.minMonth ?? '',
      maxMonth: result.maxMonth ?? '',
      months: result.detectedMonths,
      missingMonths,
      rowCount: result.recordCount,
      validationStatus,
      activatedAt: new Date().toISOString(),
      activationReason: reason,
      reportingWarning,
    };

    this.logActivationDecision(filename, true, reason);
    this.emit('pipeline', { type: 'activation-decision', file: filename, activated: true, reason } as PipelineEvent);

    this.ingestActive(result);
  }

  private async ingestActive(result: PipelineValidationResult): Promise<void> {
    const filename = result.file;
    console.log('[PIPELINE] Activating ' + filename + ' (' + result.recordCount.toLocaleString() + ' records, ' + result.detectedMonths.length + ' months)...');
    this.emit('pipeline', { type: 'ingestion-start', file: filename } as PipelineEvent);

    const start = Date.now();
    try {
      setActiveCSVPath(result.filePath);
      clearCache();
      await loadCSVData(true);
      const duration = Date.now() - start;

      console.log('[PIPELINE] Ingestion complete for ' + filename + ' in ' + duration + 'ms');
      this.emit('pipeline', { type: 'ingestion-complete', file: filename, recordCount: result.recordCount, durationMs: duration } as PipelineEvent);
    } catch (err: any) {
      console.error('[PIPELINE] Ingestion failed for ' + filename + ': ' + err.message);
      this.emit('pipeline', { type: 'ingestion-failed', file: filename, error: err.message } as PipelineEvent);
    }
  }

  // -----------------------------------------------------------------------
  // Directory scanning & watching
  // -----------------------------------------------------------------------

  private async scanDirectory(dir: string): Promise<void> {
    try {
      const files = await fs.readdir(dir);
      const csvFiles = files.filter(f => f.endsWith('.csv'));
      console.log('[PIPELINE] Found ' + csvFiles.length + ' CSV file(s) in ' + path.basename(dir) + '/');

      for (const f of csvFiles) {
        try {
          await this.processFile(path.join(dir, f), false);
        } catch (err: any) {
          console.error('[PIPELINE] Error scanning ' + f + ': ' + err.message);
        }
      }
    } catch (err: any) {
      console.error('[PIPELINE] Error scanning ' + dir + ': ' + err.message);
    }
  }

  private startWatcher(dir: string): void {
    try {
      const watcher = watch(dir, (eventType, filename) => {
        if (!filename || !filename.endsWith('.csv')) return;
        const existing = this.debounceTimers.get(filename);
        if (existing) clearTimeout(existing);
        this.debounceTimers.set(filename, setTimeout(() => {
          this.debounceTimers.delete(filename);
          this.handleFileChange(dir, filename);
        }, 2000));
      });
      this.watchers.push(watcher);
      console.log('[PIPELINE] Watching: ' + dir);
    } catch (err: any) {
      console.warn('[PIPELINE] Cannot watch ' + dir + ': ' + err.message);
    }
  }

  private async handleFileChange(dir: string, filename: string): Promise<void> {
    const filePath = path.join(dir, filename);
    try {
      await fs.access(filePath);
    } catch {
      console.log('[PIPELINE] ' + filename + ' was removed — ignoring');
      if (this.activeDataset?.filename === filename) {
        this.validDatasets.delete(filename);
        this.electActiveDataset('active-file-removed: ' + filename);
      }
      return;
    }

    this.emit('pipeline', { type: 'file-detected', file: filename } as PipelineEvent);
    console.log('[PIPELINE] Change detected: ' + filename + ' (from ' + path.basename(dir) + '/)');

    try {
      await this.processFile(filePath, true);
    } catch (err: any) {
      console.error('[PIPELINE] Error processing ' + filename + ': ' + err.message);
      this.emit('pipeline', { type: 'error', message: 'Error processing ' + filename + ': ' + err.message } as PipelineEvent);
    }
  }

  // -----------------------------------------------------------------------
  // Logging
  // -----------------------------------------------------------------------

  private logActivationDecision(file: string, activated: boolean, reason: string): void {
    const verb = activated ? 'ACTIVATED' : 'REJECTED';
    console.log('[PIPELINE] ' + verb + ': ' + file + ' — ' + reason);
  }

  private logValidationSummary(r: PipelineValidationResult): void {
    const status = r.autoIngestible ? 'PASS' : 'FAIL';
    console.log('[PIPELINE] --- Validation ' + status + ': ' + r.file + ' ---');
    console.log('[PIPELINE]   Records: ' + r.recordCount.toLocaleString());
    console.log('[PIPELINE]   Columns: ' + (r.columnsOk ? 'OK' : 'ISSUES') + ' | Missing: ' + r.missingColumns.length + ' | Extra: ' + r.extraColumns.length + ' | Corrections: ' + r.corrections.length);
    console.log('[PIPELINE]   Months:  ' + r.detectedMonths.length + ' detected, ' + r.expectedMonths.length + ' expected, ' + r.coveragePercent.toFixed(1) + '% coverage');
    console.log('[PIPELINE]   Range:   ' + (r.minMonth ?? 'N/A') + ' -> ' + (r.maxMonth ?? 'N/A'));
    if (r.monthGaps.length > 0) {
      console.log('[PIPELINE]   Gaps:    ' + r.monthGaps.map(g => g.month + '(' + g.severity + ')').join(', '));
    }
    if (r.corrections.length > 0) {
      console.log('[PIPELINE]   Auto-corrected: ' + r.corrections.map(c => c.original + '->' + c.corrected).join(', '));
    }
    if (r.errors.length > 0) console.warn('[PIPELINE]   Errors: ' + r.errors.join('; '));
    if (r.warnings.length > 0) console.log('[PIPELINE]   Warnings: ' + r.warnings.join('; '));
  }

  private async writeReport(result: PipelineValidationResult): Promise<void> {
    try {
      const reportsDir = path.join(this.dataDir, 'validation-reports');
      await fs.mkdir(reportsDir, { recursive: true });
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const reportPath = path.join(reportsDir, 'pipeline_' + result.file.replace('.csv', '') + '_' + ts + '.json');
      await fs.writeFile(reportPath, JSON.stringify(result, null, 2), 'utf-8');
    } catch (err: any) {
      console.error('[PIPELINE] Failed to write validation report: ' + err.message);
    }
  }
}
