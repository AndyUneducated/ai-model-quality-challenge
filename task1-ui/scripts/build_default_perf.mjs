#!/usr/bin/env node
/**
 * Rebuilds the bundled default perf dataset for the Task 1 UI.
 *
 * Usage:
 *   node scripts/build_default_perf.mjs [path/to/perf_data.zip|perf_data/]
 *
 * Prefers ../perf_data/ directory, then ../perf_data.zip. Run after updating the
 * shipped perf dataset so pre-loaded models stay in sync.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const uiRoot = resolve(here, '..');
const repoRoot = resolve(uiRoot, '..');
const srcArg = process.argv[2];
const srcDir = srcArg && !srcArg.endsWith('.zip') ? resolve(srcArg) : resolve(repoRoot, 'perf_data');
const zipPath = srcArg?.endsWith('.zip') ? resolve(srcArg) : resolve(repoRoot, 'perf_data.zip');
const outDir = join(uiRoot, 'public', 'perf_data');

function copyTree(from, to) {
  cpSync(from, to, { recursive: true });
}

function walkXlsx(dir, base = dir) {
  const xlsx = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) xlsx.push(...walkXlsx(full, base));
    else if (entry.toLowerCase().endsWith('.xlsx')) xlsx.push(relative(base, full).split('\\').join('/'));
  }
  return xlsx;
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

if (srcArg ? existsSync(srcDir) && statSync(srcDir).isDirectory() : existsSync(srcDir) && statSync(srcDir).isDirectory()) {
  copyTree(srcDir, outDir);
} else if (existsSync(zipPath)) {
  execFileSync('unzip', ['-q', zipPath, '-d', outDir], { stdio: 'inherit' });
} else {
  console.error(`Neither perf_data/ (${srcDir}) nor perf_data.zip (${zipPath}) found.`);
  process.exit(1);
}

const xlsx = walkXlsx(outDir).sort();
writeFileSync(join(outDir, 'manifest.json'), `${JSON.stringify(xlsx, null, 2)}\n`);
console.log(`Wrote ${xlsx.length} sweeps to ${outDir} and manifest.json`);
