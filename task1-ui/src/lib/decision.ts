import { DEFAULT_THRESHOLDS } from './types';
import type { DecisionResult, ParsedSweep, Thresholds } from './types';
import { pickRepresentativeRow } from './parseSweep';

export function evaluateSweep(sweep: ParsedSweep, thresholds: Thresholds = DEFAULT_THRESHOLDS): DecisionResult {
  const row = pickRepresentativeRow(sweep.rows);
  const reasons: string[] = [];
  let verdict: DecisionResult['verdict'] = 'go';

  const throughput = row.throughputTps ?? 0;
  const ttft = row.ttftSec ?? Number.POSITIVE_INFINITY;
  const genSpeed = row.genSpeedTpsUser ?? 0;

  if (throughput < thresholds.minThroughputTps) {
    verdict = 'no_go';
    reasons.push(`Throughput ${Math.round(throughput).toLocaleString()} t/s below target ${thresholds.minThroughputTps.toLocaleString()} t/s.`);
  }
  if (ttft > thresholds.maxTtftSec) {
    verdict = 'no_go';
    reasons.push(`TTFT ${ttft.toFixed(2)}s exceeds target ${thresholds.maxTtftSec}s.`);
  }
  if (genSpeed < thresholds.minGenSpeedTpsUser) {
    verdict = verdict === 'no_go' ? 'no_go' : 'review';
    reasons.push(`Per-user gen speed ${genSpeed.toFixed(0)} t/s/user below target ${thresholds.minGenSpeedTpsUser}.`);
  }

  if (!reasons.length) {
    reasons.push('All primary latency/throughput thresholds are met for this workload profile.');
  }

  return {
    verdict,
    reasons,
    headline: {
      throughputTps: throughput,
      ttftSec: ttft,
      genSpeedTpsUser: genSpeed,
      inputLength: row.inputLength ?? 0,
      outputLength: row.outputLength ?? 0,
    },
  };
}

export function verdictLabel(verdict: DecisionResult['verdict']): string {
  if (verdict === 'go') return 'GO';
  if (verdict === 'no_go') return 'NO-GO';
  return 'REVIEW';
}
