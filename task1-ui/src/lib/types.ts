import { z } from 'zod';

export const SweepIdentitySchema = z.object({
  modelId: z.string(),
  profileId: z.number(),
  fileName: z.string(),
});

export const SweepRowSchema = z.object({
  inputLength: z.number().nullable(),
  outputLength: z.number().nullable(),
  cachePct: z.number().nullable(),
  gMethod: z.string().nullable(),
  targetPromptG: z.number().nullable(),
  batchSize: z.number().nullable(),
  maxS: z.number().nullable(),
  targetMaxS: z.number().nullable(),
  concurrency: z.number().nullable(),
  throughputTps: z.number().nullable(),
  throughputPerBox: z.number().nullable(),
  uncachedThroughputTps: z.number().nullable(),
  cachedThroughputTps: z.number().nullable(),
  ttftSec: z.number().nullable(),
  realPromptSpeed: z.number().nullable(),
  promptSpeedWithQueueing: z.number().nullable(),
  genSpeedTpsUser: z.number().nullable(),
  rpm: z.number().nullable(),
});

export const ParsedSweepSchema = z.object({
  identity: SweepIdentitySchema,
  rows: z.array(SweepRowSchema).min(1),
  rawSheetName: z.string(),
});

export type ParsedSweep = z.infer<typeof ParsedSweepSchema>;
export type SweepRow = z.infer<typeof SweepRowSchema>;

export type GoNoGo = 'go' | 'no_go' | 'review';

export interface Thresholds {
  minThroughputTps: number;
  maxTtftSec: number;
  minGenSpeedTpsUser: number;
}

export interface DecisionResult {
  verdict: GoNoGo;
  reasons: string[];
  headline: {
    throughputTps: number;
    ttftSec: number;
    genSpeedTpsUser: number;
    inputLength: number;
    outputLength: number;
  };
}

export interface DataHealthIssue {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
}

export interface InferenceResult {
  modelSizeBand: 'small' | 'mid' | 'large' | 'unknown';
  modelSizeRationale: string[];
  profileUseCase: string;
  profileRationale: string[];
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  minThroughputTps: 250000,
  maxTtftSec: 0.35,
  minGenSpeedTpsUser: 900,
};
