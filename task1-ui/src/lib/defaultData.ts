import { parseWorkbook } from './parseSweep';
import type { ParsedSweep } from './types';

const PERF_DATA_DIR = 'perf_data';

function withBase(path: string): string {
  const base = import.meta.env.BASE_URL ?? '/';
  return `${base.replace(/\/$/, '')}/${path}`;
}

/**
 * Loads the bundled perf sweeps (the 11 shipped models, Model A–K × 7 profiles) so the
 * app renders results on first open with no upload required. Uses the exact same parser
 * as the upload path, so the shipped data and user-uploaded data flow through one contract.
 */
export async function loadDefaultSweeps(): Promise<ParsedSweep[]> {
  const manifestUrl = withBase(`${PERF_DATA_DIR}/manifest.json`);
  const manifestRes = await fetch(manifestUrl);
  if (!manifestRes.ok) {
    throw new Error(`Could not load default perf manifest (${manifestRes.status}).`);
  }
  const relPaths: string[] = await manifestRes.json();

  const parsed = await Promise.all(
    relPaths.map(async (rel) => {
      const fileUrl = withBase(`${PERF_DATA_DIR}/${rel.split('/').map(encodeURIComponent).join('/')}`);
      const res = await fetch(fileUrl);
      if (!res.ok) {
        throw new Error(`Failed to fetch bundled sweep ${rel} (${res.status}).`);
      }
      const buffer = await res.arrayBuffer();
      const fileName = rel.split('/').pop() ?? rel;
      return parseWorkbook(buffer, fileName);
    }),
  );

  return parsed;
}
