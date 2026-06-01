const COLUMN_ALIASES: Record<string, string[]> = {
  inputLength: ['input length', 'input tokens', 'prompt length'],
  outputLength: ['output length', 'output tokens', 'gen length'],
  cachePct: ['cache %', 'cache pct', 'cache percent'],
  gMethod: ['g method', 'generation method'],
  targetPromptG: ['target prompt g', 'prompt g'],
  batchSize: ['batch size', 'batch'],
  maxS: ['max s', 'max seq', 'max sequence'],
  targetMaxS: ['target max s', 'target max seq'],
  concurrency: ['concurrency', 'users', 'parallel users'],
  throughputTps: ['throughput (t/s)', 'throughput t/s', 'throughput'],
  throughputPerBox: ['throughput / box (t/s/csx)', 'throughput per box'],
  uncachedThroughputTps: ['uncached throughput (t/s)', 'uncached throughput'],
  cachedThroughputTps: ['cached throughput (t/s)', 'cached throughput'],
  ttftSec: ['ttft (sec)', 'ttft', 'time to first token'],
  realPromptSpeed: ['real prompt speed (t/s/user)', 'real prompt speed'],
  promptSpeedWithQueueing: ['prompt speed with queueing (t/s/user)', 'prompt speed with queueing'],
  genSpeedTpsUser: ['gen speed (t/s/user)', 'gen speed', 'real gen speed mean'],
  rpm: ['rpm', 'requests per minute'],
};

export function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function mapHeaders(headers: unknown[]): Partial<Record<keyof typeof COLUMN_ALIASES, number>> {
  const normalized = headers.map(normalizeHeader);
  const mapping: Partial<Record<keyof typeof COLUMN_ALIASES, number>> = {};

  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    const idx = normalized.findIndex((header) => aliases.some((alias) => header.includes(alias)));
    if (idx >= 0) {
      mapping[field as keyof typeof COLUMN_ALIASES] = idx;
    }
  }
  return mapping;
}

export function readMappedNumber(row: unknown[], index: number | undefined): number | null {
  if (index === undefined) return null;
  const value = row[index];
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}
