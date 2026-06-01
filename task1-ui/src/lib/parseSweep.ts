import * as XLSX from 'xlsx';
import { mapHeaders, readMappedNumber } from './columnMap';
import { ParsedSweepSchema } from './types';
import type { ParsedSweep, SweepRow } from './types';

const FILE_PATTERN = /Model[_\s-]*([A-Za-z0-9]+)[_\s-]*profile[_\s-]*(\d+)/i;

export function parseIdentityFromPath(fileName: string): { modelId: string; profileId: number } {
  const match = fileName.match(FILE_PATTERN);
  if (!match) {
    const fallbackModel = fileName.replace(/\.xlsx$/i, '').trim();
    return { modelId: fallbackModel, profileId: 0 };
  }
  return { modelId: match[1].toUpperCase(), profileId: Number(match[2]) };
}

function rowFromArray(headers: unknown[], values: unknown[]): SweepRow | null {
  const mapping = mapHeaders(headers);
  const required = ['throughputTps', 'ttftSec', 'genSpeedTpsUser'] as const;
  if (required.some((field) => mapping[field] === undefined)) {
    return null;
  }

  return {
    inputLength: readMappedNumber(values, mapping.inputLength),
    outputLength: readMappedNumber(values, mapping.outputLength),
    cachePct: readMappedNumber(values, mapping.cachePct),
    gMethod: mapping.gMethod !== undefined ? String(values[mapping.gMethod] ?? '') : null,
    targetPromptG: readMappedNumber(values, mapping.targetPromptG),
    batchSize: readMappedNumber(values, mapping.batchSize),
    maxS: readMappedNumber(values, mapping.maxS),
    targetMaxS: readMappedNumber(values, mapping.targetMaxS),
    concurrency: readMappedNumber(values, mapping.concurrency),
    throughputTps: readMappedNumber(values, mapping.throughputTps),
    throughputPerBox: readMappedNumber(values, mapping.throughputPerBox),
    uncachedThroughputTps: readMappedNumber(values, mapping.uncachedThroughputTps),
    cachedThroughputTps: readMappedNumber(values, mapping.cachedThroughputTps),
    ttftSec: readMappedNumber(values, mapping.ttftSec),
    realPromptSpeed: readMappedNumber(values, mapping.realPromptSpeed),
    promptSpeedWithQueueing: readMappedNumber(values, mapping.promptSpeedWithQueueing),
    genSpeedTpsUser: readMappedNumber(values, mapping.genSpeedTpsUser),
    rpm: readMappedNumber(values, mapping.rpm),
  };
}

export function parseWorkbook(buffer: ArrayBuffer, fileName: string): ParsedSweep {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames.includes('Summary') ? 'Summary' : workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null });

  const headerRowIndex = matrix.findIndex(
    (row) => Array.isArray(row) && row.some((cell) => String(cell ?? '').toLowerCase().includes('throughput')),
  );
  if (headerRowIndex < 0) {
    throw new Error(`Could not locate header row in ${fileName}`);
  }

  const headers = matrix[headerRowIndex] as unknown[];
  const rows: SweepRow[] = [];
  for (let i = headerRowIndex + 1; i < matrix.length; i += 1) {
    const values = matrix[i];
    if (!Array.isArray(values)) continue;
    const parsed = rowFromArray(headers, values);
    if (parsed) rows.push(parsed);
  }

  if (!rows.length) {
    throw new Error(`No valid perf rows found in ${fileName}`);
  }

  const identity = parseIdentityFromPath(fileName);
  return ParsedSweepSchema.parse({
    identity: { ...identity, fileName },
    rows,
    rawSheetName: sheetName,
  });
}

export async function parseSweepFile(file: File): Promise<ParsedSweep> {
  const buffer = await file.arrayBuffer();
  return parseWorkbook(buffer, file.name);
}

export function pickRepresentativeRow(rows: SweepRow[]): SweepRow {
  return [...rows].sort((a, b) => (b.throughputTps ?? 0) - (a.throughputTps ?? 0))[0];
}
