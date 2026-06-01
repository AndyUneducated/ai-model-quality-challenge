import { describe, expect, it } from 'vitest';
import { parseIdentityFromPath, parseWorkbook } from './parseSweep';
import { evaluateSweep } from './decision';
import { DEFAULT_THRESHOLDS } from './types';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('parseIdentityFromPath', () => {
  it('parses Model L profile path', () => {
    const id = parseIdentityFromPath('Model_L_profile_3/Model L profile 3.xlsx');
    expect(id.modelId).toBe('L');
    expect(id.profileId).toBe(3);
  });
});

describe('parseWorkbook integration', () => {
  it('parses shipped sample xlsx', () => {
    const extracted = path.resolve(process.cwd(), 'test-fixtures/Model A profile 1.xlsx');
    const buffer = fs.readFileSync(extracted);
    const parsed = parseWorkbook(
      buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
      'Model A profile 1.xlsx',
    );
    expect(parsed.rows.length).toBeGreaterThan(0);
    const decision = evaluateSweep(parsed, DEFAULT_THRESHOLDS);
    expect(['go', 'no_go', 'review']).toContain(decision.verdict);
  });
});
