import type { DataHealthIssue, ParsedSweep } from './types';

export function analyzeDataHealth(sweep: ParsedSweep): DataHealthIssue[] {
  const issues: DataHealthIssue[] = [];
  const rows = sweep.rows;

  const requiredFields: Array<keyof (typeof rows)[number]> = [
    'throughputTps',
    'ttftSec',
    'genSpeedTpsUser',
    'inputLength',
    'outputLength',
  ];

  for (const field of requiredFields) {
    if (rows.some((row) => row[field] === null)) {
      issues.push({
        severity: 'warning',
        code: `missing_${field}`,
        message: `Some rows are missing ${field}. Parser used tolerant mapping; verify source sheet columns.`,
      });
    }
  }

  for (let i = 1; i < rows.length; i += 1) {
    const prev = rows[i - 1];
    const curr = rows[i];
    if (
      (prev.concurrency ?? 0) < (curr.concurrency ?? 0) &&
      (prev.throughputTps ?? 0) > (curr.throughputTps ?? 0) * 1.05
    ) {
      issues.push({
        severity: 'warning',
        code: 'throughput_non_monotonic',
        message: `Throughput drops as concurrency rises (row ${i} vs ${i - 1}). Possible projection anomaly.`,
      });
    }
    if ((curr.ttftSec ?? 0) > 1.0) {
      issues.push({
        severity: 'info',
        code: 'high_ttft',
        message: `High TTFT ${curr.ttftSec?.toFixed(2)}s at concurrency ${curr.concurrency ?? 'n/a'}.`,
      });
    }
  }

  const maxThroughput = Math.max(...rows.map((r) => r.throughputTps ?? 0));
  if (maxThroughput > 2_000_000) {
    issues.push({
      severity: 'info',
      code: 'suspicious_units',
      message: 'Very high throughput values detected; confirm units are tok/s (not tok/min).',
    });
  }

  if (!issues.length) {
    issues.push({
      severity: 'info',
      code: 'healthy',
      message: 'No major schema or monotonicity issues detected.',
    });
  }

  return issues;
}
