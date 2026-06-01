import type { InferenceResult, ParsedSweep } from './types';
import { pickRepresentativeRow } from './parseSweep';

export function inferModelSize(sweeps: ParsedSweep[]): Pick<InferenceResult, 'modelSizeBand' | 'modelSizeRationale'> {
  if (!sweeps.length) {
    return { modelSizeBand: 'unknown', modelSizeRationale: ['No sweeps uploaded.'] };
  }

  const scores = sweeps.map((sweep) => {
    const row = pickRepresentativeRow(sweep.rows);
    const ttft = row.ttftSec ?? 1;
    const throughputPerBox = row.throughputPerBox ?? 0;
    const genSpeed = row.genSpeedTpsUser ?? 0;
    return {
      modelId: sweep.identity.modelId,
      score: throughputPerBox / Math.max(ttft, 0.01) + genSpeed / 1000,
    };
  });

  const target = scores[0];
  const allScores = scores.map((s) => s.score).sort((a, b) => a - b);
  const percentile = allScores.findIndex((v) => v >= target.score) / Math.max(allScores.length - 1, 1);

  const rationale = [
    `Relative perf index ${target.score.toFixed(2)} from throughput/box vs TTFT tradeoff.`,
    `Within uploaded set, model ${target.modelId} sits around ${Math.round(percentile * 100)}th percentile.`,
  ];

  let modelSizeBand: InferenceResult['modelSizeBand'] = 'mid';
  if (percentile >= 0.67) modelSizeBand = 'large';
  if (percentile <= 0.33) modelSizeBand = 'small';

  return { modelSizeBand, modelSizeRationale: rationale };
}

export function inferProfileUseCase(sweep: ParsedSweep): Pick<InferenceResult, 'profileUseCase' | 'profileRationale'> {
  const row = pickRepresentativeRow(sweep.rows);
  const input = row.inputLength ?? 0;
  const output = row.outputLength ?? 0;
  const cache = row.cachePct ?? 0;
  const concurrency = row.concurrency ?? 1;

  const rationale: string[] = [
    `Input/output tokens: ${input}/${output}.`,
    `Cache ratio ${(cache * 100).toFixed(0)}%, concurrency ${concurrency}.`,
  ];

  if (input >= 8000 && cache >= 0.4) {
    return { profileUseCase: 'Long-context cached RAG serving', profileRationale: rationale };
  }
  if (input <= 1000 && output <= 500 && concurrency >= 4) {
    return { profileUseCase: 'Low-latency online chat / copilot', profileRationale: rationale };
  }
  if (output >= 1000 && concurrency <= 2) {
    return { profileUseCase: 'Batch document generation / offline jobs', profileRationale: rationale };
  }
  if (input >= 4000) {
    return { profileUseCase: 'Mixed enterprise assistant with moderate context', profileRationale: rationale };
  }
  return { profileUseCase: 'General-purpose serving profile', profileRationale: rationale };
}

export function buildInference(sweeps: ParsedSweep[]): InferenceResult {
  const size = inferModelSize(sweeps);
  const profile = inferProfileUseCase(sweeps[0]);
  return { ...size, ...profile };
}
