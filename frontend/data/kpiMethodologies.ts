/**
 * KPI Calculation Methodology Registry
 *
 * Centralised data store for every metric card shown in the dashboard.
 * Keys must match the `id` (or derived id) of the card component.
 *
 * Consumed by CalculationMethodologyModal.tsx to display formula,
 * data sources, business context, and threshold definitions.
 */

export interface FormulaVariable {
  name: string;
  description: string;
  source?: string;
}

export interface DataSource {
  name: string;
  table?: string;
  description: string;
  refreshRate: string;
}

export interface ThresholdLevel {
  value: string;
  description: string;
}

export interface KPIMethodology {
  title: string;
  description: string;
  category: 'asset' | 'security' | 'performance' | 'ml' | 'field-notice';
  color: string; // Tailwind color name for accent
  formula: {
    expression: string;
    notes?: string;
    variables: FormulaVariable[];
    example?: string;
  };
  dataSources: DataSource[];
  businessContext: {
    purpose: string;
    impactAreas: string[];
    limitations?: string[];
    relatedKPIs?: string[];
  };
  thresholds?: {
    excellent?: ThresholdLevel;
    good?: ThresholdLevel;
    warning?: ThresholdLevel;
    critical?: ThresholdLevel;
    target?: ThresholdLevel;
  };
  updateFrequency: string;
  owner: string;
}

export const kpiMethodologies: Record<string, KPIMethodology> = {
  // ──────────────────────────────────────────────────────────────
  // PRIMARY ASSET METRICS  (MetricCard + ComprehensiveStatsDashboard)
  // ──────────────────────────────────────────────────────────────

  'total-assessed': {
    title: 'Total Assessed Assets',
    description: 'Complete count of all network assets under active security monitoring.',
    category: 'asset',
    color: 'cyan',
    formula: {
      expression: 'COUNT(DISTINCT asset_id)\nFROM   assets\nWHERE  monitoring_status = \'active\'',
      notes: 'Includes all device types: routers, switches, firewalls, servers, and endpoints registered in the asset inventory system.',
      variables: [
        { name: 'asset_id', description: 'Globally unique identifier for each monitored device', source: 'assets table' },
        { name: 'monitoring_status', description: "Flag indicating whether the asset is actively being assessed (value: 'active')", source: 'assets table' },
      ],
      example: 'If 560 million assets are registered and all are active → Total Assessed = 554,966,657',
    },
    dataSources: [
      { name: 'Asset Inventory System', table: 'assets', description: 'Source of truth for all registered hardware and virtual appliances', refreshRate: 'Real-time (CDC streaming)' },
      { name: 'Discovery Scanner', table: 'discovery_results', description: 'Periodic network scans that add newly found assets', refreshRate: 'Every 4 hours' },
      { name: 'CMDB Integration', table: 'cmdb_sync', description: 'Synchronisation with enterprise CMDB for asset metadata enrichment', refreshRate: 'Daily delta sync' },
    ],
    businessContext: {
      purpose: 'Acts as the denominator for all percentage-based vulnerability metrics. A growing total assessed count indicates broader visibility across the network.',
      impactAreas: ['Licence cost planning', 'Risk denominator calculations', 'Coverage benchmarking'],
      limitations: ['Assets in maintenance mode are still counted', 'Decommissioned assets remain until manually archived'],
      relatedKPIs: ['secure-assets', 'potentially-vulnerable', 'vulnerable-assets', 'fnc'],
    },
    thresholds: {
      target: { value: '> 95% inventory coverage', description: 'Industry best-practice requires scanning coverage of ≥95% of known IP ranges' },
    },
    updateFrequency: 'Real-time (every 5 minutes)',
    owner: 'SRE Asset Management Team',
  },

  'secure-assets': {
    title: 'Secure Assets',
    description: 'Assets with zero confirmed or potential field-notice exposure.',
    category: 'asset',
    color: 'emerald',
    formula: {
      expression: 'total_assessed\n  - potentially_vulnerable\n  - vulnerable',
      notes: 'An asset is "secure" when no active field notice matches its product version, serial, or configuration fingerprint.',
      variables: [
        { name: 'total_assessed', description: 'All assets in active monitoring', source: 'assets table' },
        { name: 'potentially_vulnerable', description: 'Assets flagged as unconfirmed matches to a field notice', source: 'fn_matches table' },
        { name: 'vulnerable', description: 'Assets with confirmed field-notice exposure', source: 'fn_matches table' },
      ],
      example: 'Secure = 554,966,657 − 62,197,000 − 12,558,366 = 480,211,291 (86.5%)',
    },
    dataSources: [
      { name: 'Field Notice Database', table: 'field_notices', description: 'Authoritative list of all published Cisco security advisories', refreshRate: 'Pushed on FN publish (avg 3-5/week)' },
      { name: 'FN Matching Engine', table: 'fn_matches', description: 'Compares asset fingerprints against field notice CVE / model criteria', refreshRate: 'Real-time recompute on any change' },
      { name: 'Asset Inventory', table: 'assets', description: 'Product model, IOS version, and hardware config per asset', refreshRate: 'Real-time (CDC streaming)' },
    ],
    businessContext: {
      purpose: 'Primary health indicator for the managed portfolio. A rising secure-asset count signals effective ongoing remediation.',
      impactAreas: ['Executive risk posture reporting', 'Customer SLA compliance', 'Insurance / audit evidence'],
      limitations: ['Zero-day vulnerabilities not yet covered by a field notice are NOT counted here', 'Secure does not imply fully patched to latest stable release'],
      relatedKPIs: ['total-assessed', 'security-coverage', 'vdi'],
    },
    thresholds: {
      excellent: { value: '≥ 90%', description: 'Best-in-class security posture — remediation is ahead of threat landscape' },
      good: { value: '80–89%', description: 'Acceptable posture with manageable backlog' },
      warning: { value: '70–79%', description: 'Elevated risk — remediation plans required within 30 days' },
      critical: { value: '< 70%', description: 'High exposure — executive escalation and emergency patching needed' },
      target: { value: '≥ 90%', description: 'Internal organisational target approved by CISO' },
    },
    updateFrequency: 'Real-time (every 5 minutes)',
    owner: 'Security Operations Center',
  },

  'potential-vulnerable': {
    title: 'Potentially Vulnerable Assets',
    description: 'Assets that partially match field-notice criteria but require confirmation.',
    category: 'security',
    color: 'amber',
    formula: {
      expression: 'COUNT(asset_id)\nFROM   fn_matches\nWHERE  match_status = \'potential\'\nAND    fn_status IN (\'active\', \'revised\')',
      notes: 'A "potential" match occurs when the product model and major IOS version align, but the minor patch level is ambiguous or the asset config cannot be fully verified.',
      variables: [
        { name: 'match_status', description: "Field notice match confidence level — 'potential' means not yet confirmed by scanner", source: 'fn_matches table' },
        { name: 'fn_status', description: "Status of the parent field notice — only 'active' and 'revised' FNs generate potential matches", source: 'field_notices table' },
      ],
      example: 'Potential % = (62,197,000 ÷ 554,966,657) × 100 = 11.2%',
    },
    dataSources: [
      { name: 'FN Matching Engine', table: 'fn_matches', description: 'Partial-match classifier — marks assets where complete evidence is insufficient for confirmation', refreshRate: 'Real-time' },
      { name: 'Asset Config Store', table: 'asset_configs', description: 'Running-config snapshots used for deeper version analysis', refreshRate: 'Hourly delta backup' },
      { name: 'Field Notice Database', table: 'field_notices', description: 'Provides match criteria: affected models, IOS version ranges, workaround status', refreshRate: 'On FN publish / revision' },
    ],
    businessContext: {
      purpose: 'Early warning pipeline — potential vulnerabilities today become confirmed vulnerabilities if not investigated. Targeting this metric reduces future critical exposure.',
      impactAreas: ['Proactive remediation prioritisation', 'Customer notification workflows', 'Change-request scheduling'],
      limitations: ['Potential match rate can spike temporarily after a new FN publish before verification runs complete', 'Some potential matches may ultimately be false positives (estimated 15–20%)'],
      relatedKPIs: ['vulnerable-assets', 'total-assessed', 'vdi'],
    },
    thresholds: {
      excellent: { value: '< 5%', description: 'Very low unresolved potential exposures' },
      good: { value: '5–10%', description: 'Normal operating range — verification in progress' },
      warning: { value: '10–20%', description: 'Growing backlog — triage and expedite confirmation process' },
      critical: { value: '> 20%', description: 'High unverified exposure — investigation sprint required' },
      target: { value: '< 10%', description: 'Portfolio management target' },
    },
    updateFrequency: 'Real-time (every 5 minutes)',
    owner: 'Vulnerability Management Team',
  },

  // Also handle the "Potentially Vulnerable" title variant from ComprehensiveStatsDashboard
  'potentially-vulnerable': {
    title: 'Potentially Vulnerable Assets',
    description: 'Assets that partially match field-notice criteria but require confirmation.',
    category: 'security',
    color: 'amber',
    formula: {
      expression: 'COUNT(asset_id)\nFROM   fn_matches\nWHERE  match_status = \'potential\'\nAND    fn_status IN (\'active\', \'revised\')',
      notes: 'A "potential" match occurs when the product model and major IOS version align, but the minor patch level is ambiguous.',
      variables: [
        { name: 'match_status', description: "Field notice match confidence — 'potential' means unconfirmed", source: 'fn_matches table' },
        { name: 'fn_status', description: "Status of the parent field notice — only active/revised FNs generate matches", source: 'field_notices table' },
      ],
      example: 'Potential % = (62,197,000 ÷ 554,966,657) × 100 = 11.2%',
    },
    dataSources: [
      { name: 'FN Matching Engine', table: 'fn_matches', description: 'Partial-match classifier', refreshRate: 'Real-time' },
      { name: 'Asset Config Store', table: 'asset_configs', description: 'Running-config snapshots', refreshRate: 'Hourly delta backup' },
      { name: 'Field Notice Database', table: 'field_notices', description: 'Provides affected model / version criteria', refreshRate: 'On FN publish' },
    ],
    businessContext: {
      purpose: 'Early warning pipeline for upcoming confirmed vulnerabilities.',
      impactAreas: ['Proactive remediation prioritisation', 'Customer notification workflows'],
      relatedKPIs: ['vulnerable-assets', 'total-assessed'],
    },
    thresholds: {
      good: { value: '5–10%', description: 'Normal operating range' },
      warning: { value: '10–20%', description: 'Growing backlog — expedite verification' },
      critical: { value: '> 20%', description: 'Investigation sprint required' },
      target: { value: '< 10%', description: 'Portfolio management target' },
    },
    updateFrequency: 'Real-time (every 5 minutes)',
    owner: 'Vulnerability Management Team',
  },

  'vulnerable-assets': {
    title: 'Vulnerable Assets',
    description: 'Assets with confirmed exposure to at least one active field notice.',
    category: 'security',
    color: 'rose',
    formula: {
      expression: 'COUNT(asset_id)\nFROM   fn_matches\nWHERE  match_status = \'confirmed\'\nAND    fn_status IN (\'active\', \'revised\')',
      notes: 'Confirmation requires matching on: product family, hardware revision, IOS major + minor version, and (where applicable) specific config pattern from the FN workaround section.',
      variables: [
        { name: 'match_status', description: "'confirmed' — full evidence chain from scanner + config validation", source: 'fn_matches table' },
        { name: 'fn_status', description: "Only 'active' and 'revised' field notices count — closed FNs are excluded", source: 'field_notices table' },
      ],
      example: '12,558,366 ÷ 554,966,657 × 100 = 2.3% confirmed vulnerable rate',
    },
    dataSources: [
      { name: 'FN Matching Engine', table: 'fn_matches', description: 'Full-chain confirmation: model + version + config fingerprint', refreshRate: 'Real-time' },
      { name: 'Vulnerability Scanner', table: 'scan_results', description: 'Active probe results used for confirmation evidence', refreshRate: 'Every 6 hours full scan; incremental hourly' },
      { name: 'Field Notice Database', table: 'field_notices', description: 'Defines exact product/version match criteria and CVSS severity', refreshRate: 'On FN publish / revision' },
    ],
    businessContext: {
      purpose: 'Primary risk indicator for the portfolio. Directly drives SLA breach risk and customer impact scores.',
      impactAreas: ['Critical incident response', 'Customer SLA breach risk', 'Regulatory compliance exposure', 'Executive risk dashboard'],
      limitations: ['Only covers assets matching known FNs — zero-day risk is tracked separately', 'A single asset can match multiple FNs (counted once in this metric)'],
      relatedKPIs: ['vdi', 'mttr', 'risk-score-index', 'rv'],
    },
    thresholds: {
      excellent: { value: '< 1%', description: 'Exceptional — near-zero confirmed exposure' },
      good: { value: '1–3%', description: 'Within acceptable range for large managed portfolios' },
      warning: { value: '3–7%', description: 'Elevated — remediation sprints required within 14 days' },
      critical: { value: '> 7%', description: 'High confirmed exposure — executive escalation mandatory' },
      target: { value: '< 2%', description: 'CISO-approved annual target' },
    },
    updateFrequency: 'Real-time (every 5 minutes)',
    owner: 'Security Operations Center',
  },

  // ──────────────────────────────────────────────────────────────
  // UNIFIED / EXTENDED KPIs
  // ──────────────────────────────────────────────────────────────

  'vdi': {
    title: 'Vulnerability Density Index',
    description: 'Normalised vulnerability count per 1,000 assessed assets, enabling fair comparison across portfolios of any size.',
    category: 'security',
    color: 'cyan',
    formula: {
      expression: 'VDI = (vulnerable_count ÷ total_assessed) × 1,000',
      notes: 'Multiplication by 1,000 normalises the metric so it stays readable regardless of portfolio size. A smaller VDI is better.',
      variables: [
        { name: 'vulnerable_count', description: 'Total confirmed vulnerable assets (fn_matches.match_status = confirmed)', source: 'fn_matches table' },
        { name: 'total_assessed', description: 'All actively monitored assets', source: 'assets table' },
      ],
      example: '12,558,366 ÷ 554,966,657 × 1,000 = 22.6 VDI',
    },
    dataSources: [
      { name: 'FN Matching Engine', table: 'fn_matches', description: 'Confirmed vulnerability counts', refreshRate: 'Real-time' },
      { name: 'Asset Inventory', table: 'assets', description: 'Total monitored asset count', refreshRate: 'Real-time' },
    ],
    businessContext: {
      purpose: 'Allows month-over-month and peer-group benchmarking without distortion from asset count changes.',
      impactAreas: ['Portfolio benchmarking', 'Trend analysis', 'SLO reporting to management'],
      relatedKPIs: ['vulnerable-assets', 'total-assessed', 'rv'],
    },
    thresholds: {
      excellent: { value: '< 50', description: 'Best-in-class vulnerability density' },
      good: { value: '50–100', description: 'Acceptable operational range' },
      warning: { value: '100–200', description: 'Elevated — targeted remediation needed' },
      critical: { value: '> 200', description: 'High density — emergency response plan required' },
      target: { value: '< 50 per 1K assets', description: 'Organisational annual target' },
    },
    updateFrequency: 'Real-time (every 5 minutes)',
    owner: 'Security Analytics Team',
  },

  'crc': {
    title: 'Customer Risk Concentration',
    description: "Percentage of total customer-facing vulnerabilities concentrated in the top 5 customers. A high value signals Pareto-style risk clustering.",
    category: 'security',
    color: 'purple',
    formula: {
      expression: 'CRC = (SUM(top_5_vulnerable) ÷ SUM(all_vulnerable)) × 100',
      notes: 'Customers are ranked by total vulnerable asset count. Top 5 are the five with the highest count at the time of calculation.',
      variables: [
        { name: 'top_5_vulnerable', description: 'Vulnerable asset count for the 5 highest-risk customers', source: 'customers + fn_matches tables (join)' },
        { name: 'all_vulnerable', description: 'Total vulnerable count across ALL customers in portfolio', source: 'fn_matches table' },
      ],
      example: 'Top-5 customers hold 4,956,123 vulnerable assets; all-customer total is 12,558,366 → CRC = 39.5%',
    },
    dataSources: [
      { name: 'Customer Database', table: 'customers', description: 'Customer master with account hierarchy', refreshRate: 'Hourly' },
      { name: 'FN Match Results', table: 'fn_matches', description: 'Vulnerable asset count per customer', refreshRate: 'Real-time' },
    ],
    businessContext: {
      purpose: 'Identifies when risk is top-heavy — a handful of customers driving disproportionate portfolio exposure. Drives targeted account-level remediation.',
      impactAreas: ['Account Executive escalation planning', 'Dedicated remediation task forces', 'Risk-weighted SLA negotiations'],
      limitations: ['Does not reflect severity of individual FNs — a customer with many low-severity matches may rank highly', 'A CRC drop can be caused by either improvement in top-5 or degradation elsewhere'],
      relatedKPIs: ['vulnerable-assets', 'rv', 'risk-score-index'],
    },
    thresholds: {
      excellent: { value: '< 40%', description: 'Well-distributed risk — no single account cluster dominates' },
      good: { value: '40–60%', description: 'Moderate concentration — manageable with standard account reviews' },
      warning: { value: '60–80%', description: 'High concentration — dedicate specialised remediation teams' },
      critical: { value: '> 80%', description: 'Extreme concentration — 80% of all risk lives in 5 accounts' },
      target: { value: '< 40%', description: 'Industry benchmark for balanced portfolio risk' },
    },
    updateFrequency: 'Hourly',
    owner: 'Account Risk Management',
  },

  'rv': {
    title: 'Remediation Velocity',
    description: "Rate at which vulnerabilities are being resolved compared to the prior period. Higher is better.",
    category: 'performance',
    color: 'emerald',
    formula: {
      expression: 'RV = ((old_period_avg − recent_period_avg) ÷ old_period_avg) × 100',
      notes: 'old_period_avg = mean(vulnerable_count) over months t−6 to t−4; recent_period_avg = mean over t−3 to t−1. A positive RV indicates reducing vulnerability counts.',
      variables: [
        { name: 'old_period_avg', description: 'Rolling 3-month average of vulnerable asset count (baseline period)', source: 'monthly_trends table' },
        { name: 'recent_period_avg', description: 'Rolling 3-month average of vulnerable asset count (current period)', source: 'monthly_trends table' },
      ],
      example: 'Baseline avg = 13,500,000; Current avg = 12,558,366 → RV = (13.5M − 12.56M) ÷ 13.5M × 100 = 7.0%',
    },
    dataSources: [
      { name: 'Monthly Trend Archive', table: 'monthly_trends', description: 'Rolling historical vulnerability counts by month', refreshRate: 'Daily aggregation' },
      { name: 'Remediation Tickets', table: 'remediation_tasks', description: 'Patch and workaround completion timestamps', refreshRate: 'Real-time (ticket system webhook)' },
    ],
    businessContext: {
      purpose: 'Measures whether the security team is making ground on the vulnerability backlog. A negative velocity means the backlog is growing faster than it is being resolved.',
      impactAreas: ['Team capacity planning', 'Patch management KPIs', 'Quarterly security goal tracking'],
      limitations: ["New field-notice publications can temporarily lower RV even if team performance hasn't changed", 'RV reflects net change — remediations AND new vulnerabilities both affect the numerator'],
      relatedKPIs: ['vulnerable-assets', 'mttr', 'vdi'],
    },
    thresholds: {
      excellent: { value: '> 25%', description: 'Rapidly reducing backlog' },
      good: { value: '15–25%', description: 'Solid remediation pace exceeding industry median' },
      warning: { value: '5–15%', description: 'Below industry benchmark — process improvements needed' },
      critical: { value: '< 5%', description: 'Near-stagnant — workload review and resource increase required' },
      target: { value: '> 25% QoQ', description: 'Recommended quarterly improvement cadence' },
    },
    updateFrequency: 'Daily',
    owner: 'Patch Management & SRE Teams',
  },

  'fnc': {
    title: 'Field Notice Coverage',
    description: "Percentage of total assets that appear in at least one active field-notice assessment record.",
    category: 'field-notice',
    color: 'indigo',
    formula: {
      expression: 'FNC = (assets_with_fn_records ÷ total_assessed) × 100',
      notes: 'An asset "has a FN record" if it appears in fn_matches regardless of match_status (potential, confirmed, or cleared).',
      variables: [
        { name: 'assets_with_fn_records', description: 'Distinct asset_ids present in fn_matches (any status)', source: 'fn_matches table' },
        { name: 'total_assessed', description: 'Total monitored assets', source: 'assets table' },
      ],
      example: 'If 520M of 554.97M assets have been evaluated against at least one FN → FNC = 93.7%',
    },
    dataSources: [
      { name: 'FN Match Database', table: 'fn_matches', description: 'Every asset evaluated against every applicable field notice', refreshRate: 'Real-time' },
      { name: 'Asset Inventory', table: 'assets', description: 'Denominator — all actively monitored assets', refreshRate: 'Real-time' },
      { name: 'Coverage Reports', table: 'fn_coverage_audit', description: 'Daily audit of which asset segments have been swept', refreshRate: 'Daily' },
    ],
    businessContext: {
      purpose: 'Measures "blind spots" in the security programme. Low FNC means many assets have never been checked against known field notices.',
      impactAreas: ['Security audit readiness', 'Customer exposure visibility', 'Field notice programme effectiveness'],
      limitations: ['A high FNC does not mean assets are secure — only that they have been assessed', 'New assets added to the inventory temporarily lower FNC until first sweep completes'],
      relatedKPIs: ['total-assessed', 'vulnerable-assets', 'vdi'],
    },
    thresholds: {
      excellent: { value: '≥ 95%', description: 'Near-complete coverage — minimal blind spots' },
      good: { value: '80–95%', description: 'Acceptable — investigate uncovered segments' },
      warning: { value: '60–80%', description: 'Significant gaps — audit expansion plan required' },
      critical: { value: '< 60%', description: 'Poor coverage — large portions of the asset base remain unevaluated' },
      target: { value: '> 95%', description: 'Annual security programme target' },
    },
    updateFrequency: 'Real-time (every 5 minutes)',
    owner: 'Field Notice Programme Management',
  },

  // ──────────────────────────────────────────────────────────────
  // EXTENDED KPI CARDS  (Risk Score Index + MTTR)
  // ──────────────────────────────────────────────────────────────

  'risk-score-index': {
    title: 'Risk Score Index',
    description: 'Composite security-risk score (0–100) derived from vulnerability rate, remediation velocity, and customer criticality weighting.',
    category: 'security',
    color: 'orange',
    formula: {
      expression: 'RSI = (VR × 0.40) + (1 − RV_norm × 0.30) + (CC × 0.30)',
      notes: 'A lower RSI is better. VR is normalised on 0–1 scale. RV_norm flips so that faster remediation LOWERS the score. CC uses weighted account CVSS averages.',
      variables: [
        { name: 'VR', description: 'Vulnerability Rate = vulnerable ÷ total_assessed (normalised 0–1)', source: 'assets + fn_matches' },
        { name: 'RV_norm', description: 'Normalised Remediation Velocity (0–1 scale, where 1 = fully remediating)', source: 'monthly_trends' },
        { name: 'CC', description: 'Customer Criticality — weighted average CVSS score across top-10 customer accounts', source: 'customers + cve_scores' },
        { name: '0.40 / 0.30 / 0.30', description: 'Factor weights approved by CISO Risk Committee (May 2025)', source: 'Risk Policy Document v3' },
      ],
      example: 'VR=0.023, RV_norm=0.07, CC=0.069 → RSI = (0.023×40) + ((1−0.07)×30) + (0.069×30) = 0.92 + 27.9 + 2.07 = 7.9',
    },
    dataSources: [
      { name: 'Vulnerability Database', table: 'fn_matches', description: 'Source for VR component', refreshRate: 'Real-time' },
      { name: 'Monthly Trends', table: 'monthly_trends', description: 'Source for RV_norm component', refreshRate: 'Daily' },
      { name: 'Customer CVSS Scores', table: 'customer_risk_profiles', description: 'Per-account CVSS severity weighted by asset density', refreshRate: 'Weekly recalculation' },
    ],
    businessContext: {
      purpose: 'Single-number executive summary of overall portfolio risk. Enables board-level reporting without requiring domain expertise.',
      impactAreas: ['CISO board briefings', 'Insurance / cyber-risk assessments', 'Portfolio-level SLA negotiations', 'Competitor benchmarking'],
      limitations: ['Weighting model is reviewed annually and may shift', 'CVSS scores may not fully reflect operational impact in specific customer environments'],
      relatedKPIs: ['vulnerable-assets', 'rv', 'crc', 'mttr'],
    },
    thresholds: {
      excellent: { value: '0–20', description: 'Very low risk — proactive security posture' },
      good: { value: '20–40', description: 'Managed risk — within normal operational parameters' },
      warning: { value: '40–70', description: 'Elevated — risk reduction initiatives required' },
      critical: { value: '70–100', description: 'Critical — immediate intervention and exec escalation needed' },
      target: { value: '< 25', description: 'FY2025 risk target per enterprise security plan' },
    },
    updateFrequency: 'Daily (recomputed at 02:00 UTC)',
    owner: 'CISO Office / Risk Analytics',
  },

  'mttr': {
    title: 'Mean Time to Remediate',
    description: 'Average calendar days between vulnerability detection and verified closure, rolling 90-day window.',
    category: 'performance',
    color: 'cyan',
    formula: {
      expression: 'MTTR = SUM(closure_date − detection_date)\n      ÷ COUNT(resolved_issues)',
      notes: 'Only issues with status = closed AND closure verified by re-scan are included. Rolling 90-day window to smooth seasonal variation.',
      variables: [
        { name: 'closure_date', description: 'Date the remediation ticket is closed AND the asset passes a re-validation scan', source: 'remediation_tasks table' },
        { name: 'detection_date', description: 'Date the vulnerability was first confirmed (fn_matches.confirmed_at)', source: 'fn_matches table' },
        { name: 'resolved_issues', description: 'All remediation tickets closed in the rolling 90-day window', source: 'remediation_tasks table' },
      ],
      example: 'If 5,000 issues closed in 90 days with a total of 92,500 days elapsed → MTTR = 18.5 days',
    },
    dataSources: [
      { name: 'Remediation Tracker', table: 'remediation_tasks', description: 'Ticket lifecycle from detection to verified closure', refreshRate: 'Real-time (ticket webhook)' },
      { name: 'FN Match History', table: 'fn_matches', description: 'Provides confirmed_at timestamp for each vulnerability', refreshRate: 'Real-time' },
      { name: 'Re-validation Scanner', table: 'scan_results', description: 'Confirms the vulnerability is actually gone post-patch', refreshRate: 'Every 6 hours' },
    ],
    businessContext: {
      purpose: 'Measures operational efficiency of the remediation pipeline. Directly correlates with window-of-exposure duration and potential breach probability.',
      impactAreas: ['Patch management process optimisation', 'Customer SLA breach risk', 'Security team capacity management'],
      limitations: ['Does not distinguish between trivial patches and complex firmware upgrades', 'MTTR for critical vs. medium severity assets can differ by 3–5× — the blended average can mask critical outliers'],
      relatedKPIs: ['rv', 'vulnerable-assets', 'risk-score-index'],
    },
    thresholds: {
      excellent: { value: '< 10 days', description: 'World-class remediation speed' },
      good: { value: '10–20 days', description: 'Industry-standard performance' },
      warning: { value: '20–35 days', description: 'Below benchmark — process review recommended' },
      critical: { value: '> 35 days', description: 'Unacceptably slow — risk exposure window is dangerously wide' },
      target: { value: '≤ 15 days', description: 'Contractual SLA target with Cisco managed-service customers' },
    },
    updateFrequency: 'Daily',
    owner: 'SRE Remediation Lead',
  },

  // ──────────────────────────────────────────────────────────────
  // INTELLIGENCE CARD METHODOLOGIES
  // ──────────────────────────────────────────────────────────────

  'anomalies': {
    title: 'Anomaly Detection',
    description: 'AI-powered Z-score anomaly detection engine flagging statistically abnormal deviations in vulnerability and asset metrics.',
    category: 'ml',
    color: 'rose',
    formula: {
      expression: 'Z = (x − μ) ÷ σ\nAnomaly when |Z| > threshold (default: 1.5)',
      notes: 'μ (mean) and σ (std deviation) are computed on a 30-day rolling baseline per customer segment. Threshold of 1.5σ captures ~87% of true anomalies while limiting false-positive rate to <5%.',
      variables: [
        { name: 'x', description: 'Current observed value (e.g., daily new vulnerable asset count)', source: 'daily_metric_snapshots' },
        { name: 'μ', description: '30-day rolling mean for that metric and customer segment', source: 'metric_baselines table' },
        { name: 'σ', description: '30-day rolling standard deviation', source: 'metric_baselines table' },
        { name: 'threshold', description: 'Z-score threshold — configurable per severity level (default 1.5 for warning, 2.5 for critical)', source: 'anomaly_config table' },
      ],
      example: 'If daily new_vulnerable baseline is μ=500, σ=80, and today is 680 → Z = (680−500)÷80 = 2.25 → anomaly flagged',
    },
    dataSources: [
      { name: 'Metric Baselines', table: 'metric_baselines', description: '30-day rolling statistics per metric per customer segment', refreshRate: 'Updated nightly' },
      { name: 'Daily Snapshots', table: 'daily_metric_snapshots', description: 'End-of-day metric values used as x in the Z-score formula', refreshRate: 'Daily at 00:00 UTC' },
      { name: 'Anomaly Config', table: 'anomaly_config', description: 'Threshold settings, suppression rules, and notification preferences', refreshRate: 'On config change' },
    ],
    businessContext: {
      purpose: 'Surfaces unexpected spikes or drops that may indicate a new field notice, a failed patch deployment, or a misconfigured scan. Reduces manual monitoring burden by ~80%.',
      impactAreas: ['Incident early warning', 'New field-notice impact detection', 'Patch failure identification'],
      limitations: ['Z-score assumes approximately normal distribution — skewed metrics may produce false positives', 'Not suitable for detecting slow, gradual drifts — use trend analysis for those'],
      relatedKPIs: ['predictions', 'vulnerable-assets', 'vdi'],
    },
    thresholds: {
      good: { value: '|Z| < 1.5', description: 'Normal operating range — no action required' },
      warning: { value: '1.5 ≤ |Z| < 2.5', description: 'Unusual deviation — investigate within 24 hours' },
      critical: { value: '|Z| ≥ 2.5', description: 'Severe anomaly — immediate investigation required' },
    },
    updateFrequency: 'Daily (run at 08:00 UTC)',
    owner: 'AI/ML Platform Team',
  },

  'predictions': {
    title: 'Trend Predictions',
    description: 'Holt-Winters exponential smoothing model forecasting vulnerability and asset security trends for the next 3–6 months.',
    category: 'ml',
    color: 'cyan',
    formula: {
      expression: 'Level: ℓₜ = α(yₜ − sₜ₋ₘ) + (1−α)(ℓₜ₋₁ + bₜ₋₁)\nTrend: bₜ = β(ℓₜ − ℓₜ₋₁) + (1−β)bₜ₋₁\nSeasonal: sₜ = γ(yₜ − ℓₜ) + (1−γ)sₜ₋ₘ\nForecast: ŷₜ₊ₕ = (ℓₜ + h·bₜ) + sₜ₋ₘ₊ₕ',
      notes: 'Triple exponential smoothing (Holt-Winters additive). Smoothing parameters α, β, γ are optimised via AIC minimisation on 18 months of training data. Seasonal period m = 12 (monthly).',
      variables: [
        { name: 'α (alpha)', description: 'Level smoothing factor — higher values weight recent data more (typical range 0.2–0.8)', source: 'Model auto-tuning' },
        { name: 'β (beta)', description: 'Trend smoothing factor — controls how quickly the trend adapts', source: 'Model auto-tuning' },
        { name: 'γ (gamma)', description: 'Seasonal smoothing factor — controls seasonal adjustment strength', source: 'Model auto-tuning' },
        { name: 'h', description: 'Forecast horizon in periods (h=1 is next month, h=3 is three months out)', source: 'User configuration' },
        { name: 'm', description: 'Seasonal period length (12 for monthly data)', source: 'Fixed parameter' },
      ],
      example: 'Training MAE ≈ 4.2% relative error; 70% of actual values fall within the 80% confidence interval over backtesting period',
    },
    dataSources: [
      { name: 'Monthly Trend Archive', table: 'monthly_trends', description: '18+ months of historical monthly vulnerability counts used for model training', refreshRate: 'Monthly refresh + incremental daily append' },
      { name: 'Seasonal Calendar', table: 'seasonal_calendar', description: 'Cisco product release cycles and historic FN publication timing used to improve seasonal factor', refreshRate: 'Quarterly update' },
    ],
    businessContext: {
      purpose: 'Provides 3–6 month forward visibility to allow proactive resource planning, budget adjustments, and pre-emptive customer communications.',
      impactAreas: ['Headcount forecasting for remediation teams', 'Quarterly business review materials', 'Proactive customer risk briefings'],
      limitations: ['Forecasts assume historical patterns continue — major unpredicted FN publications or product EOL events are not modelled', 'Accuracy decreases beyond 3 months (average 70% directional accuracy at 6 months)'],
      relatedKPIs: ['anomalies', 'rv', 'vdi'],
    },
    thresholds: {
      excellent: { value: '> 85% directional accuracy', description: 'Model performing well — high-confidence forecasts' },
      good: { value: '70–85% accuracy', description: 'Acceptable forecast quality' },
      warning: { value: '55–70% accuracy', description: 'Model may need retraining with updated seasonal data' },
      critical: { value: '< 55% accuracy', description: 'Forecast reliability compromised — manual review required' },
    },
    updateFrequency: 'Weekly model retraining; daily forecast refresh',
    owner: 'AI/ML Platform Team',
  },

  'recommendations': {
    title: 'AI Recommendations',
    description: 'Priority-ranked remediation recommendations generated by a multi-factor AI scoring engine.',
    category: 'ml',
    color: 'emerald',
    formula: {
      expression: 'Priority Score = (CVSS_weight × 0.35)\n  + (customer_impact × 0.30)\n  + (compliance_flag × 0.20)\n  + (asset_criticality × 0.15)',
      notes: 'Scores are normalised 0–100. Recommendations above 80 are flagged as CRITICAL, 60–80 as HIGH, 40–60 MEDIUM, below 40 as LOW.',
      variables: [
        { name: 'CVSS_weight', description: 'CVSSv3 base score normalised to 0–1 (CVSS 9.0 → 0.9)', source: 'cve_database' },
        { name: 'customer_impact', description: 'Proportion of high-tier customers (Tier 1 & 2) affected, normalised 0–1', source: 'customers + fn_matches' },
        { name: 'compliance_flag', description: '1 if the FN is tied to a regulatory requirement (NERC, HIPAA, PCI), else 0', source: 'compliance_mapping table' },
        { name: 'asset_criticality', description: 'Asset criticality score from CMDB (network core = 1.0, endpoint = 0.3)', source: 'cmdb_sync' },
        { name: 'Weights (0.35 / 0.30 / 0.20 / 0.15)', description: 'Approved by Security Architecture Board (Feb 2025)', source: 'recommendation_config' },
      ],
      example: 'FN with CVSS 9.3 affecting 40% Tier-1 customers + PCI flag + core network assets → Score = 33.6+12+20+15 = 80.6 → CRITICAL',
    },
    dataSources: [
      { name: 'CVE / CVSS Database', table: 'cve_database', description: 'CVSSv3 base and temporal scores for each FN', refreshRate: 'Daily NVD sync' },
      { name: 'Customer Profiles', table: 'customers', description: 'Tier classification and account revenue for impact weighting', refreshRate: 'Weekly' },
      { name: 'Compliance Mapping', table: 'compliance_mapping', description: 'Links FNs to applicable regulatory frameworks', refreshRate: 'On policy update' },
      { name: 'CMDB Asset Criticality', table: 'cmdb_sync', description: 'Business criticality rating per asset category', refreshRate: 'Daily' },
    ],
    businessContext: {
      purpose: 'Prioritises the remediation backlog so engineers focus effort where it provides the greatest risk reduction per hour of work.',
      impactAreas: ['Sprint planning for security engineers', 'Customer escalation prioritisation', 'Regulatory compliance sprint targeting'],
      limitations: ['Does not account for operational complexity of applying a patch (e.g., maintenance window availability)', 'Recommendations are advisory — final prioritisation decisions rest with the SRE team'],
      relatedKPIs: ['risk-score-index', 'rv', 'mttr'],
    },
    updateFrequency: 'Nightly full recalculation; intra-day on new FN publish',
    owner: 'AI/ML Platform Team & Security Architecture',
  },

  // ──────────────────────────────────────────────────────────────
  // OPERATIONAL COUNT CARDS  (ComprehensiveStatsDashboard)
  // ──────────────────────────────────────────────────────────────

  'field-notices': {
    title: 'Active Field Notices',
    description: "Count of distinct Cisco field notices currently in 'active' or 'revised' status affecting the monitored portfolio.",
    category: 'field-notice',
    color: 'purple',
    formula: {
      expression: 'COUNT(DISTINCT fn_id)\nFROM   field_notices\nWHERE  status IN (\'active\', \'revised\')\nAND    has_portfolio_match = TRUE',
      notes: 'Only FNs with at least one asset match in the portfolio are counted. FNs classified as closed or informational are excluded.',
      variables: [
        { name: 'fn_id', description: 'Unique field notice identifier (e.g., FN-72XXX)', source: 'field_notices table' },
        { name: 'has_portfolio_match', description: 'Boolean — TRUE if at least one asset in the monitored portfolio matches the FN criteria', source: 'fn_matches table (EXISTS subquery)' },
      ],
    },
    dataSources: [
      { name: 'Field Notice Database', table: 'field_notices', description: 'Authoritative list of Cisco FNs with status lifecycle', refreshRate: 'Pushed on FN publish / status change' },
      { name: 'FN Match Results', table: 'fn_matches', description: 'Determines which FNs actually affect the portfolio', refreshRate: 'Real-time' },
    ],
    businessContext: {
      purpose: 'Tracks the breadth of active security advisories affecting the managed estate. An increasing count may signal new product vulnerabilities entering the cycle.',
      impactAreas: ['Security engineering workload planning', 'Customer communication volume estimation'],
    },
    updateFrequency: 'Real-time (on FN publish or status change)',
    owner: 'Field Notice Programme Management',
  },

  'patterns': {
    title: 'Detected Patterns',
    description: 'Count of statistically significant behavioral or structural patterns identified by the AI pattern-detection engine across all monitored metrics.',
    category: 'ml',
    color: 'emerald',
    formula: {
      expression: 'Patterns = COUNT(pattern_id)\nFROM   detected_patterns\nWHERE  confidence > 0.60\nAND    detected_at >= NOW() - INTERVAL \'7 days\'',
      notes: 'Includes trend, seasonal, anomaly, correlation, and cyclical pattern types. Only patterns with ≥60% confidence are surfaced to avoid information overload.',
      variables: [
        { name: 'confidence', description: 'Statistical confidence of the pattern — computed from R² for trends or Autocorrelation coefficient for seasonal/cyclical', source: 'detected_patterns table' },
      ],
    },
    dataSources: [
      { name: 'Pattern Detection Engine', table: 'detected_patterns', description: 'ML output store for all identified statistical patterns', refreshRate: 'Daily run at 06:00 UTC' },
      { name: 'Metric Time Series', table: 'daily_metric_snapshots', description: 'Input data for pattern analysis', refreshRate: 'Daily' },
    ],
    businessContext: {
      purpose: 'Provides forward-looking signal about structural changes in the vulnerability landscape — beyond what individual anomaly alerts can surface.',
      impactAreas: ['Strategic remediation planning', 'Capacity forecasting', 'Root-cause investigation support'],
    },
    updateFrequency: 'Daily',
    owner: 'AI/ML Platform Team',
  },

  // ──────────────────────────────────────────────────────────────
  // ML MONITORING DASHBOARD  (MLMonitoringDashboard.tsx)
  // ──────────────────────────────────────────────────────────────

  'ml-ensemble-mape': {
    title: 'Ensemble MAPE',
    description: 'Weighted average Mean Absolute Percentage Error across all active forecasting models in the 5-model ensemble.',
    category: 'ml',
    color: 'cyan',
    formula: {
      expression: 'Ensemble MAPE = Σ (weightᵢ × MAPEᵢ)\n\nwhere:\n  MAPEᵢ = (1/n) × Σ |actual - predicted| / actual × 100\n  weightᵢ = normalised contribution weight of model i',
      notes: 'Lower values are better. Weights sum to 1.0. Each model\'s MAPE is computed on a rolling 30-day holdout window using 30-day predictions evaluated against actuals.',
      variables: [
        { name: 'weightᵢ', description: 'Model contribution weight (assigned based on recent accuracy performance)', source: 'models config — weight field' },
        { name: 'MAPEᵢ', description: 'Mean Absolute Percentage Error for model i, computed on rolling 30-day holdout', source: 'ml_model_metrics table — current_mape field' },
        { name: 'actual', description: 'Real-world observed value for the forecasted metric', source: 'daily_actuals table' },
        { name: 'predicted', description: 'Model-generated forecast for the same time period', source: 'ml_predictions table' },
      ],
      example: 'Linear Reg (12.8% × 0.25) + Exp Smooth (15.5% × 0.20) + Holt Linear (11.1% × 0.25) + WMA (17.9% × 0.15) + Poly Reg (14.3% × 0.15) ≈ 13.8%',
    },
    dataSources: [
      { name: 'ML Model Metrics Store', table: 'ml_model_metrics', description: 'Per-model accuracy KPIs updated after each prediction batch', refreshRate: 'Every 24 hours (post batch run)' },
      { name: 'Prediction Output Log', table: 'ml_predictions', description: 'All model predictions with timestamps and confidence intervals', refreshRate: 'Real-time on prediction' },
      { name: 'Actuals Feed', table: 'daily_actuals', description: 'Verified ground-truth values used to evaluate prediction accuracy', refreshRate: 'Daily at 05:00 UTC' },
    ],
    businessContext: {
      purpose: 'Single headline accuracy gauge for the entire forecasting ensemble. A MAPE below 15% is the SLA target for field-notice volume predictions.',
      impactAreas: ['SLA compliance reporting', 'Model retraining triggers', 'Forecast reliability communication'],
      limitations: ['MAPE is undefined when actual = 0; affected rows are excluded from the average', 'Reflects 30-day trailing window — sudden model degradation may require 24-48 h to surface'],
      relatedKPIs: ['ml-ensemble-accuracy', 'ml-mape-trend', 'ml-sla-compliance'],
    },
    thresholds: {
      excellent: { value: '< 10%', description: 'Exceptional forecast accuracy; predictions are reliable for all planning horizons' },
      good: { value: '10–15%', description: 'Within SLA; predictions suitable for operational decision-making' },
      warning: { value: '15–20%', description: 'Approaching SLA breach; review data quality and model drift' },
      critical: { value: '> 20%', description: 'SLA breach; consider emergency model retraining or ensemble reweight' },
      target: { value: '< 15%', description: 'Defined SLA threshold for production ensemble' },
    },
    updateFrequency: 'Daily (recalculated after each prediction batch)',
    owner: 'AI/ML Platform Team',
  },

  'ml-ensemble-accuracy': {
    title: 'Ensemble Accuracy',
    description: 'Weighted average prediction accuracy (100 − MAPE) across all five ensemble models, expressed as a percentage.',
    category: 'ml',
    color: 'emerald',
    formula: {
      expression: 'Ensemble Accuracy = Σ (weightᵢ × accuracyᵢ)\n\nwhere:\n  accuracyᵢ = 100 − MAPEᵢ',
      notes: 'Accuracy is the inverse complement of MAPE. It provides a more intuitive "% correct" framing for business stakeholders.',
      variables: [
        { name: 'weightᵢ', description: 'Normalised contribution weight for model i', source: 'ml_model_metrics — weight field' },
        { name: 'accuracyᵢ', description: '100 minus the individual model MAPE', source: 'Derived from ml_model_metrics — current_accuracy field' },
      ],
      example: 'Weighted average of [87.2%, 84.5%, 88.9%, 82.1%, 85.7%] with weights [0.25, 0.20, 0.25, 0.15, 0.15] ≈ 86.2%',
    },
    dataSources: [
      { name: 'ML Model Metrics Store', table: 'ml_model_metrics', description: 'Per-model KPIs including current_accuracy', refreshRate: 'Daily' },
    ],
    businessContext: {
      purpose: 'Provides a business-friendly accuracy percentage for executive reporting. The SLA mandates ensemble accuracy ≥ 80%.',
      impactAreas: ['Executive dashboards', 'SLA reporting', 'Model investment decisions'],
      relatedKPIs: ['ml-ensemble-mape', 'ml-accuracy-trend', 'ml-sla-accuracy'],
    },
    thresholds: {
      excellent: { value: '> 90%', description: 'Best-in-class forecasting' },
      good: { value: '80–90%', description: 'Within SLA; operationally reliable' },
      warning: { value: '70–80%', description: 'Below SLA target; investigate model health' },
      critical: { value: '< 70%', description: 'Significant accuracy degradation — escalate to ML team' },
      target: { value: '≥ 80%', description: 'SLA minimum accuracy threshold' },
    },
    updateFrequency: 'Daily',
    owner: 'AI/ML Platform Team',
  },

  'ml-avg-latency': {
    title: 'Avg Prediction Latency',
    description: 'Arithmetic mean of per-model inference latencies, representing the average time a single prediction request takes to execute.',
    category: 'ml',
    color: 'violet',
    formula: {
      expression: 'Avg Latency = (1/N) × Σ latencyᵢ\n\nwhere N = number of active models',
      notes: 'Latency is measured from API request receipt to prediction response, excluding network round-trip. Individual model latencies: Linear Reg 45ms, Exp Smoothing 32ms, Holt Linear 52ms, WMA 18ms, Poly Reg 68ms.',
      variables: [
        { name: 'latencyᵢ', description: 'P50 (median) inference latency for model i in milliseconds over the last 1,000 predictions', source: 'ml_performance_log — latency_ms field' },
        { name: 'N', description: 'Count of active (non-inactive) models in the ensemble', source: 'ml_model_registry — status field' },
      ],
      example: '(45 + 32 + 52 + 18 + 68) / 5 = 43ms',
    },
    dataSources: [
      { name: 'ML Performance Log', table: 'ml_performance_log', description: 'Timestamped latency measurements per prediction call', refreshRate: 'Real-time on each prediction' },
      { name: 'Model Registry', table: 'ml_model_registry', description: 'Model metadata including status and configuration', refreshRate: 'On deployment change' },
    ],
    businessContext: {
      purpose: 'Ensures the prediction API meets latency SLAs required by downstream consumers. The SLA target is < 3,000ms; actual performance (< 100ms) provides substantial headroom.',
      impactAreas: ['API SLA compliance', 'User experience for real-time prediction consumers', 'Infrastructure sizing decisions'],
      limitations: ['P50 latency — tail latencies (P95, P99) may be significantly higher under load'],
      relatedKPIs: ['ml-sla-latency', 'ml-latency-trend'],
    },
    thresholds: {
      excellent: { value: '< 50ms', description: 'Sub-50ms — well under SLA with ample headroom' },
      good: { value: '50–200ms', description: 'Within acceptable operational range' },
      warning: { value: '200ms–1s', description: 'Elevated — investigate model or infrastructure bottlenecks' },
      critical: { value: '> 1s', description: 'Approaching SLA breach (3,000ms); immediate investigation required' },
      target: { value: '< 3,000ms', description: 'Contractual SLA upper bound' },
    },
    updateFrequency: 'Real-time rolling average',
    owner: 'ML Infrastructure Team',
  },

  'ml-active-alerts': {
    title: 'Active Alerts',
    description: 'Count of unacknowledged ML monitoring alerts that currently require operator attention.',
    category: 'ml',
    color: 'amber',
    formula: {
      expression: 'Active Alerts = COUNT(alert_id)\nFROM   ml_alerts\nWHERE  acknowledged = false\nAND    resolved_at IS NULL',
      notes: 'Alerts are generated by threshold rules evaluated every 15 minutes against live model metrics. Severity levels: info, warning, critical.',
      variables: [
        { name: 'acknowledged', description: 'Boolean flag set by an operator when the alert is under investigation', source: 'ml_alerts — acknowledged field' },
        { name: 'resolved_at', description: 'Timestamp when the underlying metric returned to normal; NULL if still active', source: 'ml_alerts — resolved_at field' },
      ],
    },
    dataSources: [
      { name: 'ML Alerts Store', table: 'ml_alerts', description: 'All generated alerts with severity, metric, threshold, and acknowledgement state', refreshRate: 'Every 15 minutes' },
    ],
    businessContext: {
      purpose: 'Real-time operational health indicator. Zero active alerts is the target state, indicating all models are operating within agreed parameters.',
      impactAreas: ['On-call engineer workload', 'SLA breach prevention', 'Model drift early warning'],
      relatedKPIs: ['ml-sla-compliance', 'ml-alert-summary'],
    },
    thresholds: {
      excellent: { value: '0', description: 'All systems nominal' },
      good: { value: '1–2', description: 'Minor issues under investigation — no SLA impact' },
      warning: { value: '3–5', description: 'Multiple active issues; escalation may be needed' },
      critical: { value: '> 5', description: 'System-wide degradation; page the on-call ML engineer' },
    },
    updateFrequency: 'Every 15 minutes',
    owner: 'ML Operations Team',
  },

  'ml-mape-trend': {
    title: 'MAPE 30-Day Trend',
    description: 'Daily ensemble MAPE values plotted over the trailing 30 calendar days, enabling visual identification of accuracy drift or improvement.',
    category: 'ml',
    color: 'cyan',
    formula: {
      expression: 'Daily MAPE[t] = Σ (weightᵢ × MAPEᵢ[t])\n\nwhere MAPEᵢ[t] is model i\'s MAPE for day t,\ncalculated on that day\'s actual vs. predicted values',
      notes: 'Each data point represents the ensemble MAPE for predictions made on that calendar day. Trend is computed using linear regression over the 30-point series.',
      variables: [
        { name: 'MAPE[t]', description: 'Ensemble MAPE for a specific calendar day', source: 'ml_daily_metrics — mape_value field' },
      ],
    },
    dataSources: [
      { name: 'Daily ML Metrics', table: 'ml_daily_metrics', description: 'Aggregated per-day model performance summary', refreshRate: 'Daily at 06:00 UTC' },
    ],
    businessContext: {
      purpose: 'Allows the team to detect gradual accuracy degradation (data drift), seasonal patterns in model performance, and validate that recent retraining runs improved accuracy.',
      impactAreas: ['Model lifecycle management', 'Drift detection', 'Retraining decision support'],
    },
    updateFrequency: 'Daily',
    owner: 'AI/ML Platform Team',
  },

  'ml-accuracy-trend': {
    title: 'Accuracy 30-Day Trend',
    description: 'Daily ensemble accuracy (100 − MAPE) over 30 days, showing whether model predictive quality is improving or declining.',
    category: 'ml',
    color: 'emerald',
    formula: {
      expression: 'Daily Accuracy[t] = 100 − Daily MAPE[t]',
      notes: 'Direct inverse of MAPE trend. Upward slope indicates model accuracy improvement; downward slope triggers retraining evaluation.',
      variables: [
        { name: 'Daily MAPE[t]', description: 'Ensemble MAPE for day t', source: 'ml_daily_metrics' },
      ],
    },
    dataSources: [
      { name: 'Daily ML Metrics', table: 'ml_daily_metrics', description: 'Source for both accuracy and MAPE trend computations', refreshRate: 'Daily at 06:00 UTC' },
    ],
    businessContext: {
      purpose: 'More intuitive framing of model quality for business stakeholders. A downward trend over more than 5 consecutive days automatically triggers a retraining review meeting.',
      impactAreas: ['Executive reporting', 'Retraining governance', 'Model investment decisions'],
    },
    updateFrequency: 'Daily',
    owner: 'AI/ML Platform Team',
  },

  'ml-latency-trend': {
    title: 'Latency 30-Day Trend',
    description: 'Daily average prediction latency in milliseconds over 30 days, tracking system performance over time.',
    category: 'ml',
    color: 'violet',
    formula: {
      expression: 'Daily Avg Latency[t] = MEAN(latency_ms)\nFROM   ml_performance_log\nWHERE  DATE(created_at) = t',
      notes: 'Uses arithmetic mean of all prediction latency measurements for the day. Spikes may indicate infrastructure events, model updates, or unexpected load.',
      variables: [
        { name: 'latency_ms', description: 'Per-prediction latency measurement in milliseconds', source: 'ml_performance_log' },
      ],
    },
    dataSources: [
      { name: 'ML Performance Log', table: 'ml_performance_log', description: 'Raw latency measurements per prediction call', refreshRate: 'Real-time; aggregated daily' },
    ],
    businessContext: {
      purpose: 'Tracks infrastructure capacity and model complexity impact on response time. An upward trend over 7+ days triggers capacity review.',
      impactAreas: ['Infrastructure scaling', 'SLA monitoring', 'Deployment health'],
    },
    updateFrequency: 'Daily aggregation; raw data real-time',
    owner: 'ML Infrastructure Team',
  },

  'ml-ensemble-weights': {
    title: 'Ensemble Model Weights',
    description: 'Proportional contribution of each constituent model to the final ensemble prediction, visualised as a percentage distribution.',
    category: 'ml',
    color: 'cyan',
    formula: {
      expression: 'Ensemble Output = Σ (weightᵢ × predictionᵢ)\n\nwhere Σ weightᵢ = 1.0\n\nWeights: Linear Reg 0.25, Exp Smooth 0.20,\n         Holt Linear 0.25, WMA 0.15, Poly Reg 0.15',
      notes: 'Weights are calibrated quarterly using cross-validation on the most recent 90 days of data. Higher-accuracy models receive higher weights in the next quarter.',
      variables: [
        { name: 'weightᵢ', description: 'Fraction of the final prediction contributed by model i', source: 'ml_ensemble_config — weight field' },
        { name: 'predictionᵢ', description: 'Raw point forecast output by model i', source: 'ml_predictions' },
      ],
      example: 'Final prediction = 0.25×LinearReg + 0.20×ExpSmooth + 0.25×HoltLinear + 0.15×WMA + 0.15×PolyReg',
    },
    dataSources: [
      { name: 'Ensemble Config', table: 'ml_ensemble_config', description: 'Stores current and historical weight assignments per model', refreshRate: 'Quarterly rebalancing' },
    ],
    businessContext: {
      purpose: 'Transparency into how the ensemble combines individual model outputs. Imbalanced weights (e.g., one model > 50%) indicate over-reliance and increased single-model risk.',
      impactAreas: ['Model diversity management', 'Risk concentration monitoring', 'Ensemble governance'],
      limitations: ['Weights are static between quarterly reviews and may not reflect recent short-term accuracy degradation'],
    },
    updateFrequency: 'Quarterly (at rebalancing)',
    owner: 'AI/ML Platform Team',
  },

  'ml-sla-compliance': {
    title: 'SLA Compliance',
    description: 'Overall Service Level Agreement status — passes when all three component SLAs (Accuracy, Latency, Uptime) are simultaneously met.',
    category: 'ml',
    color: 'emerald',
    formula: {
      expression: 'Overall SLA Met = accuracyMet AND latencyMet AND uptimeMet\n\nwhere:\n  accuracyMet  = ensembleAccuracy ≥ 80%\n  latencyMet   = avgLatencyMs ≤ 3,000ms\n  uptimeMet    = systemUptime ≥ 99.5%',
      notes: 'Boolean result — all three conditions must be true simultaneously. Any single SLA breach results in overall SLA Breach status.',
      variables: [
        { name: 'ensembleAccuracy', description: 'Weighted ensemble accuracy as defined by ml-ensemble-accuracy', source: 'Derived from ml_model_metrics' },
        { name: 'avgLatencyMs', description: 'Average prediction latency across all active models', source: 'ml_performance_log' },
        { name: 'systemUptime', description: 'Percentage of time ML API was available during the measurement window', source: 'system_uptime_log' },
      ],
    },
    dataSources: [
      { name: 'SLA Dashboard Store', table: 'ml_sla_status', description: 'Evaluated SLA results per measurement window', refreshRate: 'Every 15 minutes' },
    ],
    businessContext: {
      purpose: 'Single pass/fail indicator for operational health. SLA breach triggers automated escalation to the on-call ML engineer and a 30-minute response obligation.',
      impactAreas: ['Customer SLA commitments', 'On-call escalation', 'Contractual obligation tracking'],
    },
    thresholds: {
      excellent: { value: 'All 3 SLAs met', description: 'Full SLA compliance' },
      critical: { value: 'Any SLA missed', description: 'SLA breach — initiate incident response' },
    },
    updateFrequency: 'Every 15 minutes',
    owner: 'ML Operations Team',
  },

  'ml-sla-accuracy': {
    title: 'SLA — Prediction Accuracy',
    description: 'Measures whether the ensemble accuracy meets the contractually defined minimum accuracy threshold of 80%.',
    category: 'ml',
    color: 'emerald',
    formula: {
      expression: 'Accuracy SLA = ensembleAccuracy ≥ 80%\n\nCurrent: 85.7% (target: 80%)',
      notes: 'Target is set at 80% — 5 percentage points below current performance, providing a safety buffer. Evaluated on 24-hour rolling window.',
      variables: [
        { name: 'ensembleAccuracy', description: 'See ml-ensemble-accuracy methodology', source: 'ml_model_metrics' },
      ],
    },
    dataSources: [{ name: 'ML Model Metrics', table: 'ml_model_metrics', description: 'Source of ensemble accuracy computation', refreshRate: 'Daily' }],
    businessContext: {
      purpose: 'Ensures predictions are reliable enough for operational use. Below 80% accuracy, predictions should not be used for automated decision logic.',
      impactAreas: ['Prediction trustworthiness', 'Downstream automation safety gates'],
    },
    thresholds: {
      target: { value: '≥ 80%', description: 'SLA minimum — accuracy above this level is required' },
    },
    updateFrequency: 'Daily',
    owner: 'AI/ML Platform Team',
  },

  'ml-sla-latency': {
    title: 'SLA — Prediction Latency',
    description: 'Checks whether average prediction latency stays within the 3,000ms contractual upper bound.',
    category: 'ml',
    color: 'violet',
    formula: {
      expression: 'Latency SLA = avgLatencyMs ≤ 3,000ms\n\nCurrent: 43ms (target: ≤ 3,000ms)',
      notes: 'For latency, lower is better (inverted metric). The 3,000ms limit is the API contract guarantee. Current 43ms average provides 98.6% headroom.',
      variables: [
        { name: 'avgLatencyMs', description: 'Arithmetic mean of inference latency across all active models', source: 'ml_performance_log' },
      ],
    },
    dataSources: [{ name: 'ML Performance Log', table: 'ml_performance_log', description: 'Latency per prediction call', refreshRate: 'Real-time' }],
    businessContext: {
      purpose: 'Ensures the ML API is responsive enough for real-time prediction consumers. Breach would impact downstream SLA obligations.',
      impactAreas: ['API consumers', 'Real-time operations', 'Infrastructure SLA'],
    },
    thresholds: {
      target: { value: '≤ 3,000ms', description: 'Maximum allowable latency per API contract' },
    },
    updateFrequency: 'Real-time rolling average',
    owner: 'ML Infrastructure Team',
  },

  'ml-sla-uptime': {
    title: 'SLA — System Uptime',
    description: 'Percentage of time the ML prediction API was available and serving requests, targeting 99.5% monthly uptime.',
    category: 'ml',
    color: 'emerald',
    formula: {
      expression: 'Uptime = (totalMinutes − downtimeMinutes) / totalMinutes × 100\n\nCurrent: 99.97% (target: ≥ 99.5%)',
      notes: 'Measured over a rolling 30-day window. Planned maintenance windows ≤ 2h/month are excluded from downtime calculation per SLA terms.',
      variables: [
        { name: 'totalMinutes', description: 'Total minutes in the measurement window (monthly: 43,200)', source: 'Computed from measurement window' },
        { name: 'downtimeMinutes', description: 'Minutes the API was unresponsive or returning errors ≥ 500', source: 'system_uptime_log — downtime_minutes field' },
      ],
    },
    dataSources: [{ name: 'System Uptime Log', table: 'system_uptime_log', description: 'Health check results and downtime events', refreshRate: 'Every 30 seconds via health check' }],
    businessContext: {
      purpose: 'Tracks platform reliability. 99.5% uptime allows up to 3.65 hours of downtime per month; current 99.97% leaves only ~13 min/month of tolerance.',
      impactAreas: ['Platform reliability', 'Customer trust', 'Contractual obligations'],
    },
    thresholds: {
      excellent: { value: '> 99.9%', description: 'High-availability tier — less than 52 min downtime/year' },
      good: { value: '99.5–99.9%', description: 'Within SLA' },
      critical: { value: '< 99.5%', description: 'SLA breach — open incident immediately' },
      target: { value: '≥ 99.5%', description: 'Minimum SLA uptime requirement' },
    },
    updateFrequency: 'Continuous (30-second health checks), aggregated hourly',
    owner: 'ML Infrastructure Team',
  },

  'ml-feature-importance': {
    title: 'Feature Importance (SHAP)',
    description: 'SHAP-style permutation feature importance scores quantifying each input variable\'s marginal contribution to ensemble forecast accuracy.',
    category: 'ml',
    color: 'amber',
    formula: {
      expression: 'φᵢ (SHAP value) ≈ E[f(x)] − E[f(x with feature i permuted)]\n\nEstimation: 100 Monte Carlo permutation samples per feature\n\nNormalised: Σ φᵢ = 100%',
      notes: 'Computed using permutation-based approximation of SHAP (SHapley Additive exPlanations). True SHAP requires exponential computation; Monte Carlo estimation provides 95%+ accuracy at 1% of the cost.',
      variables: [
        { name: 'φᵢ', description: 'Shapley value for feature i — expected marginal contribution across all feature permutations', source: 'ml_xai_results — shap_value field' },
        { name: 'f(x)', description: 'Ensemble model prediction function', source: 'Ensemble output' },
      ],
      example: 'Rate of Change: 28%, Rolling Momentum: 22%, MA Deviation: 18%, Normalized Level: 15%, Lag-1 Signal: 10%, Volatility: 7%',
    },
    dataSources: [
      { name: 'XAI Results Store', table: 'ml_xai_results', description: 'Computed SHAP values per feature per model run', refreshRate: 'Daily batch at 07:00 UTC' },
      { name: 'Feature Store', table: 'ml_feature_store', description: 'Engineered input features fed to all models', refreshRate: 'Daily at 04:00 UTC' },
    ],
    businessContext: {
      purpose: 'Provides model transparency for regulatory compliance and debugging. Identifies which data signals drive forecast quality, enabling targeted data engineering efforts.',
      impactAreas: ['Model explainability', 'Regulatory compliance (EU AI Act)', 'Feature engineering prioritisation', 'Root-cause investigation'],
      limitations: ['Permutation-based SHAP may over-attribute correlated features; true causal attribution requires causal graph analysis'],
    },
    updateFrequency: 'Daily',
    owner: 'AI/ML Platform Team',
  },

  'ml-model-explanation': {
    title: 'Model Explanation',
    description: 'Natural-language explanation of ensemble decision-making, derived from SHAP analysis and feature interaction mapping.',
    category: 'ml',
    color: 'cyan',
    formula: {
      expression: 'Primary driver = argmax(φᵢ)\nSecondary driver = argmax₂(φᵢ)\nEarly warning signal = feature with highest |ΔSHAP| vs. prior week',
      notes: 'Text explanation is auto-generated from SHAP values and supplemented by human-written domain context. Updated daily with each SHAP batch run.',
      variables: [
        { name: 'φᵢ', description: 'Feature SHAP value', source: 'ml_xai_results' },
        { name: '|ΔSHAP|', description: 'Absolute change in SHAP value week-over-week, indicating feature influence shift', source: 'ml_xai_results — weekly delta' },
      ],
    },
    dataSources: [
      { name: 'XAI Results Store', table: 'ml_xai_results', description: 'SHAP values driving the text generation', refreshRate: 'Daily' },
    ],
    businessContext: {
      purpose: 'Makes the ensemble\'s forecasting logic interpretable to non-technical stakeholders. Required for EU AI Act Article 13 transparency obligations.',
      impactAreas: ['Regulatory transparency', 'Business trust', 'Audit documentation'],
    },
    updateFrequency: 'Daily',
    owner: 'AI/ML Platform Team',
  },

  'ml-confidence-decomposition': {
    title: 'Confidence Decomposition',
    description: 'Breakdown of the ensemble forecast confidence score into six constituent drivers, each representing a different aspect of prediction reliability.',
    category: 'ml',
    color: 'cyan',
    formula: {
      expression: 'OverallConfidence ≈ weighted mean of:\n  DataVolume       (30% weight)\n  ModelAgreement   (25% weight)\n  HistoricalAccuracy (20% weight)\n  DataStability    (15% weight)\n  ForecastHorizon  (7%  weight)\n  OutlierImpact    (3%  weight)',
      notes: 'Data Volume (92%): sufficient training samples exist. Model Agreement (87%): ensemble models agree within ±5%. Historical Accuracy (84%): trailing 90-day accuracy. Data Stability (78%): low covariate shift. Forecast Horizon (71%): confidence decreases with prediction distance. Outlier Impact (95%): few extreme values in recent data.',
      variables: [
        { name: 'DataVolume', description: 'Score reflecting whether training set size exceeds the minimum threshold (5,000 samples)', source: 'ml_training_stats' },
        { name: 'ModelAgreement', description: 'Average pairwise correlation between model predictions (high = ensemble agreement)', source: 'ml_predictions — cross-model correlation' },
        { name: 'HistoricalAccuracy', description: '90-day rolling accuracy score', source: 'ml_daily_metrics' },
      ],
    },
    dataSources: [
      { name: 'Confidence Metrics', table: 'ml_confidence_metrics', description: 'Pre-computed confidence sub-scores per prediction batch', refreshRate: 'Daily at 07:30 UTC' },
    ],
    businessContext: {
      purpose: 'Pinpoints which aspect of the prediction pipeline is reducing confidence, enabling targeted improvement actions (e.g., collect more data vs. stabilise input features).',
      impactAreas: ['Model improvement prioritisation', 'Risk-adjusted decisions using ML output', 'Audit trail for forecast uncertainty'],
    },
    updateFrequency: 'Daily',
    owner: 'AI/ML Platform Team',
  },

  'ml-data-quality': {
    title: 'Overall Data Quality Score',
    description: 'Arithmetic mean of all six data quality dimension scores, providing a single headline measure of input data health.',
    category: 'ml',
    color: 'cyan',
    formula: {
      expression: 'Overall Score = (completeness + accuracy + consistency\n               + timeliness + uniqueness + validity) / 6',
      notes: 'All six dimensions are equally weighted. The score ranges from 0–100%; a minimum of 90% is required for production model runs.',
      variables: [
        { name: 'completeness', description: 'Fraction of expected fields/rows present (no NULLs or gaps)', source: 'dq_metrics — completeness_score' },
        { name: 'accuracy', description: 'Fraction of values within expected statistical bounds', source: 'dq_metrics — accuracy_score' },
        { name: 'consistency', description: 'Cross-field and cross-table referential integrity score', source: 'dq_metrics — consistency_score' },
        { name: 'timeliness', description: 'Fraction of records arriving within the expected SLA window', source: 'dq_metrics — timeliness_score' },
        { name: 'uniqueness', description: 'Fraction of rows with no duplicate key', source: 'dq_metrics — uniqueness_score' },
        { name: 'validity', description: 'Fraction of values conforming to defined domain rules and formats', source: 'dq_metrics — validity_score' },
      ],
      example: '(97.2 + 94.1 + 91.8 + 99.5 + 100 + 95.3) / 6 = 96.3%',
    },
    dataSources: [
      { name: 'Data Quality Metrics', table: 'dq_metrics', description: 'Daily data quality assessment output per dimension', refreshRate: 'Daily at 05:30 UTC' },
    ],
    businessContext: {
      purpose: 'Validates that the data feeding the ML models is reliable. Scores below 90% trigger a data quality review before model predictions are published.',
      impactAreas: ['Model input validation', 'Data pipeline health monitoring', 'Prediction reliability'],
    },
    thresholds: {
      excellent: { value: '≥ 95%', description: 'High data quality — model inputs fully trustworthy' },
      good: { value: '90–95%', description: 'Within acceptable range for production use' },
      warning: { value: '80–90%', description: 'Data quality review required before publishing predictions' },
      critical: { value: '< 80%', description: 'Model run suspended until root cause is resolved' },
      target: { value: '≥ 90%', description: 'Minimum threshold for production model execution' },
    },
    updateFrequency: 'Daily',
    owner: 'Data Engineering Team',
  },

  'ml-data-completeness': {
    title: 'Data Completeness',
    description: 'Percentage of expected data fields and records that are present and non-null in the ML feature store.',
    category: 'ml',
    color: 'cyan',
    formula: {
      expression: 'Completeness = (1 − missingCells / totalExpectedCells) × 100',
      notes: 'Counts NULL values, empty strings, and missing rows vs. expected schema. Evaluated over the full daily ingestion window.',
      variables: [
        { name: 'missingCells', description: 'Count of fields that are NULL, empty, or missing vs. schema expectation', source: 'dq_metrics — missing_count field' },
        { name: 'totalExpectedCells', description: 'Total fields × total rows expected for the day', source: 'dq_expected_volumes' },
      ],
    },
    dataSources: [{ name: 'DQ Metrics', table: 'dq_metrics', description: 'Data quality assessment output', refreshRate: 'Daily' }],
    businessContext: {
      purpose: 'Incomplete data forces models to use imputation or skip records, both of which reduce prediction quality. High completeness (≥97%) is required for reliable forecasts.',
      impactAreas: ['Imputation risk', 'Training sample size', 'Prediction coverage'],
    },
    thresholds: {
      excellent: { value: '≥ 99%', description: 'Near-complete data' },
      good: { value: '97–99%', description: 'Within acceptable range' },
      warning: { value: '90–97%', description: 'Significant gaps — check upstream pipelines' },
      critical: { value: '< 90%', description: 'Data completeness too low for reliable model execution' },
    },
    updateFrequency: 'Daily',
    owner: 'Data Engineering Team',
  },

  'ml-data-accuracy': {
    title: 'Data Accuracy',
    description: 'Fraction of data values that fall within expected statistical bounds and conform to historical value distributions.',
    category: 'ml',
    color: 'emerald',
    formula: {
      expression: 'Accuracy = (1 − outlierCount / totalCount) × 100\n\nOutlier: |value − rolling_mean| > 3 × rolling_stddev',
      notes: 'Uses 3-sigma rule on a 30-day rolling baseline. Values beyond ±3 standard deviations are flagged as potentially inaccurate and reviewed.',
      variables: [
        { name: 'outlierCount', description: 'Fields exceeding the 3-sigma threshold from the rolling mean', source: 'dq_metrics — outlier_count field' },
        { name: 'rolling_mean', description: '30-day rolling average per field', source: 'dq_baselines — mean field' },
        { name: 'rolling_stddev', description: '30-day rolling standard deviation per field', source: 'dq_baselines — stddev field' },
      ],
    },
    dataSources: [{ name: 'DQ Metrics', table: 'dq_metrics', description: 'Outlier detection results per field', refreshRate: 'Daily' }, { name: 'DQ Baselines', table: 'dq_baselines', description: 'Rolling statistical baselines per feature', refreshRate: 'Daily rolling update' }],
    businessContext: {
      purpose: 'Detects data corruption, sensor errors, or upstream system issues before they propagate into model training data.',
      impactAreas: ['Model training integrity', 'Anomaly false-positive rates', 'Data pipeline debugging'],
    },
    thresholds: {
      excellent: { value: '≥ 98%', description: 'Minimal outliers' },
      good: { value: '94–98%', description: 'Acceptable' },
      warning: { value: '< 94%', description: 'High outlier rate — investigate upstream data source' },
    },
    updateFrequency: 'Daily',
    owner: 'Data Engineering Team',
  },

  'ml-data-consistency': {
    title: 'Data Consistency',
    description: 'Cross-field and cross-table referential integrity score — measures how often data relationships and business rules are correctly maintained.',
    category: 'ml',
    color: 'amber',
    formula: {
      expression: 'Consistency = (1 − violationCount / totalRulesChecked) × 100',
      notes: 'Checks include: foreign key integrity, cross-field business rules (e.g., start_date ≤ end_date), and cross-table join completeness.',
      variables: [
        { name: 'violationCount', description: 'Number of rule violations across all consistency checks', source: 'dq_consistency_results — violation_count field' },
        { name: 'totalRulesChecked', description: 'Total business rule evaluations performed', source: 'dq_consistency_rules — rule count' },
      ],
    },
    dataSources: [{ name: 'DQ Consistency Results', table: 'dq_consistency_results', description: 'Output of all consistency rule evaluations', refreshRate: 'Daily' }],
    businessContext: {
      purpose: 'Ensures feature relationships are logically coherent before being fed to ML models. Inconsistent data can create confounding signals that degrade model logic.',
      impactAreas: ['Feature engineering quality', 'Model interpretability', 'Data pipeline validation'],
    },
    thresholds: {
      excellent: { value: '≥ 95%', description: 'Strong referential integrity' },
      warning: { value: '< 90%', description: 'Significant rule violations — data pipeline audit required' },
    },
    updateFrequency: 'Daily',
    owner: 'Data Engineering Team',
  },

  'ml-data-timeliness': {
    title: 'Data Timeliness',
    description: 'Percentage of data records that arrive within the defined ingestion SLA window, ensuring models have up-to-date inputs.',
    category: 'ml',
    color: 'cyan',
    formula: {
      expression: 'Timeliness = onTimeRecords / expectedRecords × 100\n\nFor each source: onTime = arrived within SLA window',
      notes: 'Each data source has a defined SLA window (e.g., "daily file must arrive before 04:30 UTC"). Late records are counted as untimely even if they eventually arrive.',
      variables: [
        { name: 'onTimeRecords', description: 'Records that arrived within their source-specific SLA window', source: 'dq_timeliness_log — on_time flag' },
        { name: 'expectedRecords', description: 'Total records expected based on source schedule', source: 'dq_expected_volumes' },
      ],
    },
    dataSources: [{ name: 'DQ Timeliness Log', table: 'dq_timeliness_log', description: 'Arrival time vs. SLA window per record/batch', refreshRate: 'Evaluated at SLA deadline' }],
    businessContext: {
      purpose: 'Late data forces models to either wait (delaying predictions) or run with stale inputs (reducing accuracy). > 99.5% timeliness is required for the model run to proceed on schedule.',
      impactAreas: ['Prediction schedule adherence', 'Model freshness', 'Data pipeline SLA management'],
    },
    thresholds: {
      excellent: { value: '≥ 99.5%', description: 'All data arriving on time' },
      warning: { value: '< 98%', description: 'Late data impacting model run schedule' },
    },
    updateFrequency: 'Daily (evaluated at 04:30 UTC before model run)',
    owner: 'Data Engineering Team',
  },

  'ml-data-uniqueness': {
    title: 'Data Uniqueness',
    description: 'Fraction of records in the feature store that have unique primary keys — detects duplicate data from upstream pipeline issues.',
    category: 'ml',
    color: 'emerald',
    formula: {
      expression: 'Uniqueness = (1 − duplicateCount / totalCount) × 100',
      notes: 'Deduplication check performed on composite primary key: (asset_id, metric_type, date). Duplicate records can double-count signals and distort ensemble averages.',
      variables: [
        { name: 'duplicateCount', description: 'Count of rows with duplicate composite primary keys', source: 'dq_metrics — duplicate_count field' },
        { name: 'totalCount', description: 'Total rows ingested for the measurement period', source: 'dq_metrics — total_count field' },
      ],
    },
    dataSources: [{ name: 'DQ Metrics', table: 'dq_metrics', description: 'Uniqueness check results with duplicate row details', refreshRate: 'Daily' }],
    businessContext: {
      purpose: 'Duplicate records inflate training data and can bias model weights. A uniqueness score of < 99.9% triggers immediate deduplication pipeline review.',
      impactAreas: ['Training data integrity', 'Model weight calibration', 'Prediction count accuracy'],
    },
    thresholds: {
      excellent: { value: '100%', description: 'Zero duplicates — ideal state' },
      good: { value: '99.9–100%', description: 'Negligible duplicates' },
      critical: { value: '< 99%', description: 'Significant duplicates — suspend model run until resolved' },
    },
    updateFrequency: 'Daily',
    owner: 'Data Engineering Team',
  },

  'ml-data-validity': {
    title: 'Data Validity',
    description: 'Percentage of values conforming to defined domain rules, format specifications, and acceptable value ranges.',
    category: 'ml',
    color: 'violet',
    formula: {
      expression: 'Validity = (1 − invalidCount/totalCount) × 100\n\nChecks include: range bounds, regex patterns, enum membership, type conformance',
      notes: 'Example rules: accuracy ∈ [0, 100], latency_ms > 0, status ∈ {active, degraded, inactive, retraining}, date format = ISO-8601.',
      variables: [
        { name: 'invalidCount', description: 'Fields failing any defined domain validation rule', source: 'dq_validity_results — invalid_count field' },
        { name: 'totalCount', description: 'All field values evaluated across all rules', source: 'dq_validity_results' },
      ],
    },
    dataSources: [{ name: 'DQ Validity Results', table: 'dq_validity_results', description: 'Itemised validity rule violations', refreshRate: 'Daily' }],
    businessContext: {
      purpose: 'Prevents garbage-in-garbage-out scenarios in the ML pipeline. Invalid values (e.g., negative latencies, accuracy > 100%) would corrupt model learning.',
      impactAreas: ['Model training safety', 'Feature engineering correctness', 'Pipeline data contract enforcement'],
    },
    thresholds: {
      excellent: { value: '≥ 98%', description: 'Strong domain conformance' },
      good: { value: '95–98%', description: 'Acceptable' },
      warning: { value: '< 95%', description: 'High validity failure rate — review schema or upstream system' },
    },
    updateFrequency: 'Daily',
    owner: 'Data Engineering Team',
  },

  'ml-alert-summary': {
    title: 'ML Alert Summary',
    description: 'Distribution of ML monitoring alerts by severity level (critical / warning / info) within the current monitoring window.',
    category: 'ml',
    color: 'amber',
    formula: {
      expression: 'Critical = COUNT(alerts WHERE severity = \'critical\')\nWarning  = COUNT(alerts WHERE severity = \'warning\')\nInfo     = COUNT(alerts WHERE severity = \'info\')',
      notes: 'Counts all alerts (both acknowledged and unacknowledged) generated within the current 24-hour window. Used for triage prioritisation.',
      variables: [
        { name: 'severity', description: "Alert severity level: 'critical' triggers immediate response; 'warning' requires same-day review; 'info' is informational only", source: 'ml_alerts — severity field' },
      ],
    },
    dataSources: [{ name: 'ML Alerts Store', table: 'ml_alerts', description: 'All alerts within the measurement window', refreshRate: 'Every 15 minutes' }],
    businessContext: {
      purpose: 'Provides triage context — the severity distribution tells operators where to focus attention first.',
      impactAreas: ['Incident triage', 'On-call workload planning', 'SLA breach risk assessment'],
    },
    updateFrequency: 'Every 15 minutes',
    owner: 'ML Operations Team',
  },

  // ──────────────────────────────────────────────────────────────
  // FIELD NOTICE ADVANCED ANALYTICS  (FNAdvancedAnalytics.tsx)
  // ──────────────────────────────────────────────────────────────

  'fn-total-vulnerable': {
    title: 'Total Vulnerable Devices',
    description: 'Aggregate count of all devices affected by active field notices across the entire portfolio.',
    category: 'field-notice',
    color: 'rose',
    formula: {
      expression: 'Total Vulnerable = SUM(totVuln) for all unique FNs',
      notes: 'Deduplicated by field notice ID. A single device counted under multiple FNs is counted once per FN.',
      variables: [
        { name: 'totVuln', description: 'Total vulnerable devices per field notice', source: 'reports-top-field-notices-2025.json — totVuln' },
      ],
    },
    dataSources: [{ name: 'Field Notice Reports', table: 'reports-top-field-notices-2025.json', description: 'Top field notices dataset (20 FNs)', refreshRate: 'Quarterly' }],
    businessContext: {
      purpose: 'Measures the total exposure footprint of active field notices to prioritise remediation investment.',
      impactAreas: ['Risk exposure quantification', 'Remediation planning', 'Executive reporting'],
      relatedKPIs: ['fn-remediation-rate', 'fn-avg-risk-score'],
    },
    updateFrequency: 'On data refresh',
    owner: 'Field Notice Analytics Team',
  },

  'fn-remediation-rate': {
    title: 'Overall Remediation Rate',
    description: 'Percentage of all known vulnerable devices that have been successfully remediated (marked not-vulnerable).',
    category: 'field-notice',
    color: 'emerald',
    formula: {
      expression: 'Remediation Rate = SUM(notVuln) / (SUM(totVuln) + SUM(potVuln) + SUM(notVuln)) * 100',
      notes: 'Higher is better. Measures how effectively the organisation is closing known exposure.',
      variables: [
        { name: 'notVuln', description: 'Devices confirmed not vulnerable (remediated)', source: 'reports-top-field-notices-2025.json — notVuln' },
        { name: 'totVuln', description: 'Total vulnerable devices', source: 'reports-top-field-notices-2025.json — totVuln' },
        { name: 'potVuln', description: 'Potentially vulnerable devices', source: 'reports-top-field-notices-2025.json — potVuln' },
      ],
    },
    dataSources: [{ name: 'Field Notice Reports', table: 'reports-top-field-notices-2025.json', description: 'Aggregated FN vulnerability counts', refreshRate: 'Quarterly' }],
    businessContext: {
      purpose: 'Tracks remediation velocity — the primary operational metric for field notice response effectiveness.',
      impactAreas: ['Remediation SLA compliance', 'Risk reduction tracking', 'Operational efficiency measurement'],
      relatedKPIs: ['fn-total-vulnerable', 'fn-avg-risk-score'],
    },
    thresholds: {
      excellent: { value: '> 80%', description: 'Most exposure has been remediated' },
      good: { value: '50–80%', description: 'Significant progress on remediation' },
      warning: { value: '20–50%', description: 'Remediation effort needs acceleration' },
      critical: { value: '< 20%', description: 'Critical remediation gap' },
    },
    updateFrequency: 'On data refresh',
    owner: 'Field Notice Analytics Team',
  },

  'fn-avg-risk-score': {
    title: 'Average Risk Score',
    description: 'Weighted multi-factor risk score (0–10) averaged across all field notices, incorporating vulnerability volume, remediation rate, age, and type factors.',
    category: 'field-notice',
    color: 'amber',
    formula: {
      expression: 'Risk Score = (vulnNorm * 0.40 + remPenalty * 0.25 + ageNorm * 0.15 + vulnRate * 0.20) * typeMultiplier * potentialMultiplier * 10',
      notes: 'Score of 10 = maximum risk. Hardware FNs get 1.15× multiplier. Low remediation rates elevate the remediation penalty component.',
      variables: [
        { name: 'vulnNorm', description: 'Normalised vulnerable-device count (0–1 vs max across FN set)', source: 'Computed' },
        { name: 'remPenalty', description: '1 - remediationRate (higher penalty for lower remediation)', source: 'Computed' },
        { name: 'ageNorm', description: 'Normalised age in days since first published (0–1)', source: 'Computed' },
        { name: 'vulnRate', description: 'Vulnerability rate = totVuln / totalDevices', source: 'Computed' },
      ],
    },
    dataSources: [{ name: 'Statistics Engine', description: 'fieldNoticeStatisticsEngine.ts — computeFNAdvancedAnalytics()', refreshRate: 'On data refresh' }],
    businessContext: {
      purpose: 'Provides a single composite risk metric that synthesises multiple risk dimensions for prioritisation.',
      impactAreas: ['Risk-based prioritisation', 'Executive escalation criteria', 'Resource allocation'],
      relatedKPIs: ['fn-total-vulnerable', 'fn-remediation-rate', 'fn-anomalies'],
    },
    thresholds: {
      excellent: { value: '< 2.5', description: 'Low risk — routine monitoring' },
      good: { value: '2.5–4.5', description: 'Moderate risk — monitor closely' },
      warning: { value: '4.5–6.5', description: 'High risk — remediation required' },
      critical: { value: '> 6.5', description: 'Critical risk — immediate action needed' },
    },
    updateFrequency: 'On data refresh',
    owner: 'Field Notice Analytics Team',
  },

  'fn-anomalies': {
    title: 'Anomalies Detected',
    description: 'Number of field notices identified as statistical anomalies using Z-score analysis (|Z| > 2).',
    category: 'field-notice',
    color: 'violet',
    formula: {
      expression: 'Anomaly = TRUE when |Z-score| > 2\nZ = (riskScore - mean) / standardDeviation',
      notes: 'Z-score computation uses the risk score distribution across all FNs. Three anomaly types: high-vuln, zero-remediation, stale.',
      variables: [
        { name: 'Z-score', description: 'Standard deviation units from the mean risk score', source: 'Computed' },
        { name: 'mean', description: 'Mean risk score across all field notices', source: 'Computed' },
        { name: 'standardDeviation', description: 'Population standard deviation of risk scores', source: 'Computed' },
      ],
    },
    dataSources: [{ name: 'Statistics Engine', description: 'fieldNoticeStatisticsEngine.ts — Z-score anomaly detection', refreshRate: 'On data refresh' }],
    businessContext: {
      purpose: 'Automatically identifies field notices that deviate significantly from the norm, flagging potential risk outliers for immediate attention.',
      impactAreas: ['Proactive risk detection', 'Outlier investigation', 'Resource prioritisation'],
      relatedKPIs: ['fn-avg-risk-score', 'fn-health-score'],
    },
    updateFrequency: 'On data refresh',
    owner: 'Field Notice Analytics Team',
  },

  'fn-risk-distribution': {
    title: 'Risk Score Distribution',
    description: 'Histogram showing the distribution of field notices across risk score buckets (Low, Medium, High, Critical).',
    category: 'field-notice',
    color: 'cyan',
    formula: {
      expression: 'Low = COUNT(FN WHERE risk < 2.5)\nMedium = COUNT(FN WHERE 2.5 <= risk < 4.5)\nHigh = COUNT(FN WHERE 4.5 <= risk < 6.5)\nCritical = COUNT(FN WHERE risk >= 6.5)',
      variables: [
        { name: 'risk', description: 'Multi-factor risk score (0–10) per field notice', source: 'fieldNoticeStatisticsEngine.ts' },
      ],
    },
    dataSources: [{ name: 'Statistics Engine', description: 'Risk scores computed for all field notices', refreshRate: 'On data refresh' }],
    businessContext: {
      purpose: 'Visualises the shape of the risk landscape — concentrated critical FNs warrant different treatment than a uniform distribution.',
      impactAreas: ['Risk posture assessment', 'Remediation strategy formulation'],
    },
    updateFrequency: 'On data refresh',
    owner: 'Field Notice Analytics Team',
  },

  'fn-vuln-by-type': {
    title: 'Vulnerabilities by FN Type',
    description: 'Breakdown of total vulnerable devices by field notice type (Hardware vs Software).',
    category: 'field-notice',
    color: 'violet',
    formula: {
      expression: 'HW Vuln = SUM(totVuln WHERE fnType = "Hardware")\nSW Vuln = SUM(totVuln WHERE fnType = "Software")',
      variables: [
        { name: 'fnType', description: 'Field notice type classification (Hardware or Software)', source: 'reports-top-field-notices-2025.json — fnType' },
      ],
    },
    dataSources: [{ name: 'Field Notice Reports', description: 'HW/SW classification per FN', refreshRate: 'Quarterly' }],
    businessContext: {
      purpose: 'Distinguishes remediation complexity — hardware FNs typically require physical intervention while software FNs can be patched remotely.',
      impactAreas: ['Remediation planning', 'Resource allocation by type'],
    },
    updateFrequency: 'On data refresh',
    owner: 'Field Notice Analytics Team',
  },

  'fn-cumulative-trend': {
    title: 'Cumulative Vulnerability Trend',
    description: 'Cumulative sum of vulnerable devices over time, grouped by year of field notice publication.',
    category: 'field-notice',
    color: 'rose',
    formula: {
      expression: 'Cumulative(t) = SUM(totVuln for all FNs published in year <= t)',
      variables: [
        { name: 't', description: 'Year of analysis', source: 'Derived from firstPublished date' },
      ],
    },
    dataSources: [{ name: 'Field Notice Reports', description: 'Publication date and vulnerability counts', refreshRate: 'Quarterly' }],
    businessContext: {
      purpose: 'Shows the growth trajectory of cumulative vulnerability exposure to assess whether the organisation is gaining or losing ground.',
      impactAreas: ['Trend analysis', 'Long-term risk trajectory planning', 'Executive dashboarding'],
    },
    updateFrequency: 'On data refresh',
    owner: 'Field Notice Analytics Team',
  },

  'fn-publishing-trend': {
    title: 'FN Publishing Trend',
    description: 'Number of field notices published per year, showing the rate of new FN disclosures over time.',
    category: 'field-notice',
    color: 'indigo',
    formula: {
      expression: 'Count(year) = COUNT(FN WHERE year(firstPublished) = year)',
      variables: [
        { name: 'firstPublished', description: 'Date the field notice was first published', source: 'reports-top-field-notices-2025.json — firstPublished' },
      ],
    },
    dataSources: [{ name: 'Field Notice Reports', description: 'Publication dates', refreshRate: 'Quarterly' }],
    businessContext: {
      purpose: 'Measures the discovery/disclosure velocity — is the rate of new field notices accelerating or decelerating?',
      impactAreas: ['Capacity planning for remediation teams', 'Vendor risk assessment'],
    },
    updateFrequency: 'On data refresh',
    owner: 'Field Notice Analytics Team',
  },

  'fn-concentration': {
    title: 'Vulnerability Concentration Analysis',
    description: 'Measures how concentrated vulnerability exposure is across the FN portfolio using Gini coefficient, HHI, and Pareto analysis.',
    category: 'field-notice',
    color: 'cyan',
    formula: {
      expression: 'Gini = 1 - 2 * integral(Lorenz curve)\nHHI = SUM(share_i²) * 10000\nPareto = % of FNs causing 80% of vulnerabilities',
      notes: 'Gini close to 1 = extreme concentration. HHI > 2500 = highly concentrated. Pareto < 20% = classic 80/20 concentration.',
      variables: [
        { name: 'share_i', description: 'Each FNs proportion of total vulnerable devices', source: 'Computed' },
      ],
    },
    dataSources: [{ name: 'Statistics Engine', description: 'Concentration metrics from fieldNoticeStatisticsEngine.ts', refreshRate: 'On data refresh' }],
    businessContext: {
      purpose: 'Identifies whether risk is driven by a few dominant FNs or spread evenly — critical for deciding between targeted vs broad remediation strategies.',
      impactAreas: ['Remediation strategy selection', 'Budget justification', 'Risk concentration reporting'],
    },
    updateFrequency: 'On data refresh',
    owner: 'Field Notice Analytics Team',
  },

  'fn-correlation-matrix': {
    title: 'Correlation Matrix',
    description: 'Pearson correlation analysis across 5 dimensions: Vulnerability Count, Potential Vulnerability, Remediation Rate, Age, and Risk Score.',
    category: 'field-notice',
    color: 'violet',
    formula: {
      expression: 'r(X,Y) = COV(X,Y) / (SD(X) * SD(Y))',
      notes: 'Values range from -1 (perfect negative) to +1 (perfect positive). Significant pairs: |r| > 0.5.',
      variables: [
        { name: 'COV', description: 'Covariance between two dimensions', source: 'Computed' },
        { name: 'SD', description: 'Standard deviation of each dimension', source: 'Computed' },
      ],
    },
    dataSources: [{ name: 'Statistics Engine', description: 'Multi-dimensional correlation from fieldNoticeStatisticsEngine.ts', refreshRate: 'On data refresh' }],
    businessContext: {
      purpose: 'Reveals hidden relationships between risk dimensions — e.g., whether older FNs have higher vulnerability rates, or whether hardware FNs correlate with lower remediation.',
      impactAreas: ['Root cause investigation', 'Predictive modelling inputs', 'Strategic planning'],
    },
    updateFrequency: 'On data refresh',
    owner: 'Field Notice Analytics Team',
  },

  'fn-health-score': {
    title: 'Portfolio Health Score',
    description: 'Overall health score (0–100) for the FN portfolio, penalised for anomalies. 100 = perfect health, no anomalies detected.',
    category: 'field-notice',
    color: 'emerald',
    formula: {
      expression: 'Health = MAX(0, 100 - (totalAnomalies * severityWeight))',
      notes: 'Each anomaly deducts points based on its Z-score magnitude. More severe deviations cause larger health score penalties.',
      variables: [
        { name: 'totalAnomalies', description: 'Count of detected anomalies', source: 'Anomaly detection module' },
        { name: 'severityWeight', description: 'Deduction per anomaly based on Z-score magnitude', source: 'Computed' },
      ],
    },
    dataSources: [{ name: 'Statistics Engine', description: 'Anomaly report from fieldNoticeStatisticsEngine.ts', refreshRate: 'On data refresh' }],
    businessContext: {
      purpose: 'Provides a single health indicator for the entire FN portfolio — useful for executive dashboards and SLA reporting.',
      impactAreas: ['Executive reporting', 'SLA compliance tracking', 'Portfolio risk assessment'],
    },
    thresholds: {
      excellent: { value: '> 80', description: 'Healthy portfolio' },
      good: { value: '50–80', description: 'Moderate risk — some anomalies present' },
      warning: { value: '20–50', description: 'At risk — multiple anomalies' },
      critical: { value: '< 20', description: 'Critical — severe portfolio degradation' },
    },
    updateFrequency: 'On data refresh',
    owner: 'Field Notice Analytics Team',
  },

  'fn-vuln-trend': {
    title: 'Vulnerability Trend Direction',
    description: 'Linear regression trend direction for cumulative vulnerability counts over time (RISING, FALLING, or STABLE).',
    category: 'field-notice',
    color: 'rose',
    formula: {
      expression: 'Direction: slope > 0.01 = RISING, slope < -0.01 = FALLING, else STABLE\nR² = 1 - SSres/SStot',
      variables: [
        { name: 'slope', description: 'Linear regression slope coefficient', source: 'Computed' },
        { name: 'R²', description: 'Coefficient of determination — goodness of fit', source: 'Computed' },
      ],
    },
    dataSources: [{ name: 'Statistics Engine', description: 'Trend forecast from fieldNoticeStatisticsEngine.ts', refreshRate: 'On data refresh' }],
    businessContext: {
      purpose: 'Identifies whether the vulnerability burden is growing, shrinking, or stable — critical for strategic planning and resource forecasting.',
      impactAreas: ['Strategic planning', 'Resource forecasting', 'Executive reporting'],
    },
    updateFrequency: 'On data refresh',
    owner: 'Field Notice Analytics Team',
  },

  'fn-forecast-chart': {
    title: 'Vulnerability Forecast',
    description: 'Linear regression forecast of cumulative vulnerability counts with 95% confidence intervals for the next 3 periods.',
    category: 'field-notice',
    color: 'violet',
    formula: {
      expression: 'Predicted(t) = intercept + slope * t\nUpper(t) = Predicted(t) + 1.96 * residualStdDev\nLower(t) = Predicted(t) - 1.96 * residualStdDev',
      notes: 'Confidence bands widen for further future predictions. Residual standard deviation is computed from in-sample forecast errors.',
      variables: [
        { name: 'slope', description: 'Linear regression slope', source: 'Computed' },
        { name: 'intercept', description: 'Linear regression intercept', source: 'Computed' },
        { name: 'residualStdDev', description: 'Standard deviation of regression residuals', source: 'Computed' },
      ],
    },
    dataSources: [{ name: 'Statistics Engine', description: 'Time series forecast from fieldNoticeStatisticsEngine.ts', refreshRate: 'On data refresh' }],
    businessContext: {
      purpose: 'Provides forward-looking predictions to support proactive resource planning and risk mitigation strategies.',
      impactAreas: ['Capacity planning', 'Budget forecasting', 'Strategic risk management'],
    },
    updateFrequency: 'On data refresh',
    owner: 'Field Notice Analytics Team',
  },

  'fn-vuln-distribution': {
    title: 'Vulnerability Count Distribution',
    description: 'Statistical distribution of vulnerable device counts across all field notices, including histogram and descriptive statistics.',
    category: 'field-notice',
    color: 'rose',
    formula: {
      expression: 'Histogram buckets = max(totVuln) / 8\nMean, Median, StdDev, Skewness, Kurtosis, IQR, P95, 95% CI',
      variables: [
        { name: 'totVuln', description: 'Total vulnerable count per FN', source: 'reports-top-field-notices-2025.json' },
      ],
    },
    dataSources: [{ name: 'Statistics Engine', description: 'Distribution analysis', refreshRate: 'On data refresh' }],
    businessContext: {
      purpose: 'Reveals the shape of the vulnerability landscape — highly skewed distributions require different remediation approaches than normal distributions.',
      impactAreas: ['Statistical analysis', 'Remediation strategy design'],
    },
    updateFrequency: 'On data refresh',
    owner: 'Field Notice Analytics Team',
  },

  'fn-age-vs-vuln': {
    title: 'Age vs Vulnerability Scatter',
    description: 'Scatter plot showing the relationship between field notice age (days since publication) and vulnerability count, with risk score as bubble size/colour.',
    category: 'field-notice',
    color: 'violet',
    formula: {
      expression: 'X = daysSince(firstPublished)\nY = totVuln\nColor = riskScore classification',
      variables: [
        { name: 'age', description: 'Days since field notice was first published', source: 'Computed from firstPublished' },
        { name: 'totVuln', description: 'Total vulnerable devices', source: 'reports-top-field-notices-2025.json' },
        { name: 'riskScore', description: 'Multi-factor risk score (0–10)', source: 'fieldNoticeStatisticsEngine.ts' },
      ],
    },
    dataSources: [{ name: 'Statistics Engine', description: 'Per-FN profiles with age and risk calculations', refreshRate: 'On data refresh' }],
    businessContext: {
      purpose: 'Identifies aging FNs with high vulnerability counts — these represent long-standing exposure requiring escalation.',
      impactAreas: ['Aging debt identification', 'Escalation prioritisation'],
    },
    updateFrequency: 'On data refresh',
    owner: 'Field Notice Analytics Team',
  },

  'fn-zscore-dist': {
    title: 'Z-Score Distribution',
    description: 'Per-FN Z-score values plotted as a bar chart with anomaly threshold (±2σ) reference lines for visual anomaly identification.',
    category: 'field-notice',
    color: 'amber',
    formula: {
      expression: 'Z(i) = (riskScore(i) - mean(riskScores)) / stdDev(riskScores)\nAnomaly threshold: |Z| > 2',
      variables: [
        { name: 'Z(i)', description: 'Z-score for field notice i', source: 'Computed' },
      ],
    },
    dataSources: [{ name: 'Statistics Engine', description: 'Z-score anomaly detection output', refreshRate: 'On data refresh' }],
    businessContext: {
      purpose: 'Enables rapid visual identification of statistical outliers — FNs that deviate significantly from the portfolio norm.',
      impactAreas: ['Anomaly detection', 'Outlier investigation', 'Quality assurance'],
    },
    updateFrequency: 'On data refresh',
    owner: 'Field Notice Analytics Team',
  },
};
