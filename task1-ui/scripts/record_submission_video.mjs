/**
 * Records a <=5 min Task 1 submission walkthrough with on-screen captions.
 * Output: ~/Desktop/task1-submission-demo.webm (and .mp4 if ffmpeg is available)
 */
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TASK1_UI = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(TASK1_UI, '..');
const PERF_DATA = path.join(REPO_ROOT, 'perf_data');
const DESKTOP = path.join(process.env.HOME ?? '/Users/anning', 'Desktop');
const PORT = 4173;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const LIVE_URL = 'https://andyuneducated.github.io/ai-model-quality-challenge/';
const MAX_RUNTIME_MS = 4 * 60 * 1000 + 45 * 1000;

const OUTPUT_WEBM = path.join(DESKTOP, 'task1-submission-demo.webm');
const OUTPUT_MP4 = path.join(DESKTOP, 'task1-submission-demo.mp4');
const VIDEO_TMP_DIR = path.join(TASK1_UI, '.record-video-tmp');
const MODEL_L = path.join(TASK1_UI, 'test-fixtures', 'Model L profile 1.xlsx');

function xlsx(model, profile) {
  const dir = path.join(PERF_DATA, `Model_${model}_profile_${profile}`);
  return path.join(dir, `Model ${model} profile ${profile}.xlsx`);
}

function assertFilesExist(files) {
  for (const file of files) {
    if (!fs.existsSync(file)) {
      throw new Error(`Missing perf file: ${file}`);
    }
  }
}

function waitForPort(port, timeoutMs = 60_000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const socket = net.createConnection({ port, host: '127.0.0.1' });
      socket.once('connect', () => {
        socket.end();
        resolve();
      });
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() - started > timeoutMs) {
          reject(new Error(`Port ${port} not ready after ${timeoutMs}ms`));
          return;
        }
        setTimeout(tick, 400);
      });
    };
    tick();
  });
}

function runCommand(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(' ')} exited with ${code}`));
    });
  });
}

async function setCaption(page, text) {
  await page.evaluate((caption) => {
    let bar = document.getElementById('demo-caption-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'demo-caption-bar';
      bar.style.cssText = [
        'position:fixed',
        'bottom:0',
        'left:0',
        'right:0',
        'min-height:76px',
        'background:rgba(15,23,42,0.94)',
        'color:#f8fafc',
        'padding:14px 28px 18px',
        'font-size:17px',
        'line-height:1.45',
        'z-index:100000',
        'font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif',
        'box-shadow:0 -4px 24px rgba(0,0,0,0.35)',
      ].join(';');
      document.body.appendChild(bar);
    }
    bar.textContent = caption;
  }, text);
}

async function beat(page, ms, caption) {
  if (caption) await setCaption(page, caption);
  await page.waitForTimeout(ms);
}

async function scrollToHeading(page, name) {
  const heading = page.getByRole('heading', { name });
  await heading.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
}

async function uploadFiles(page, files) {
  assertFilesExist(files);
  await page.locator('input[type="file"]').setInputFiles(files);
  await page.waitForTimeout(1200);
  await page.getByRole('heading', { name: 'Model Comparison' }).waitFor({ state: 'visible', timeout: 30_000 });
  await page.waitForTimeout(800);
}

async function main() {
  fs.mkdirSync(VIDEO_TMP_DIR, { recursive: true });
  assertFilesExist([MODEL_L]);

  console.log('[1/4] Building Task1 UI with bundled perf_data…');
  await runCommand('npm', ['run', 'build:default-perf'], TASK1_UI);
  await runCommand('npm', ['run', 'build'], TASK1_UI);

  console.log('[2/4] Starting preview server…');
  const preview = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(PORT)], {
    cwd: TASK1_UI,
    stdio: 'pipe',
  });
  preview.stdout?.on('data', () => {});
  preview.stderr?.on('data', () => {});

  try {
    await waitForPort(PORT);

    const batchProfiles = [1, 3, 6, 7].map((p) => xlsx('A', p));

    console.log('[3/4] Recording walkthrough…');
    const startedAt = Date.now();

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      recordVideo: {
        dir: VIDEO_TMP_DIR,
        size: { width: 1280, height: 720 },
      },
    });
    const page = await context.newPage();

    await page.goto(BASE_URL);
    await beat(
      page,
      12000,
      'Task 1 — Perf Projection Explorer. Problem: raw .xlsx sweeps are engineer-readable, not customer-actionable. This UI turns perf data into go/no-go decisions for two audiences.',
    );

    await page.getByRole('cell', { name: 'K' }).first().waitFor({ state: 'visible', timeout: 30_000 });
    await beat(
      page,
      16000,
      'Interviewer requirement: the 11 shipped perf models (A–K) pre-load on first open — comparison renders with zero upload. Data comes from the updated perf_data bundle in the repo root.',
    );

    await scrollToHeading(page, 'Model Comparison');
    await beat(
      page,
      14000,
      'Side-by-side model comparison is first-class: throughput, TTFT, and gen speed across the full pre-loaded set. No hard-coded model list — any conforming .xlsx works.',
    );

    await uploadFiles(page, [MODEL_L]);
    await beat(
      page,
      16000,
      'Upload path: add unseen Model L on top of the pre-loaded set — zero code edits, no rebuild. Client-side parsing only; same Summary-sheet contract as shipped sweeps.',
    );

    await beat(
      page,
      12000,
      'Architecture cuts: no backend, no auth. React + Vite + TypeScript for static deploy (GitHub Pages) and instant multi-file upload — ruled out Streamlit.',
    );

    await scrollToHeading(page, 'Inference Panel');
    await beat(
      page,
      16000,
      'Model size inference: relative scale from throughput/box vs TTFT within the uploaded set. Profile use-cases inferred from token mix, cache, and concurrency heuristics.',
    );

    await page.getByRole('button', { name: 'Customer / PM' }).click();
    await scrollToHeading(page, 'Customer / PM View');
    await beat(
      page,
      18000,
      'Customer / PM view: Go · Review · No-Go with tok/s, TTFT, context length, and plain-language reasons. Adjustable thresholds for customer SLAs.',
    );

    await page.getByRole('button', { name: 'Internal engineer' }).click();
    await scrollToHeading(page, 'Internal Engineer View');
    await beat(
      page,
      16000,
      'Internal engineer view: row counts, batch/concurrency, config fields, and data-health flags before a projection reaches a customer.',
    );

    await scrollToHeading(page, 'Threshold Controls');
    await page.getByLabel('Min throughput (tok/s)').fill('120000');
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: 'Customer / PM' }).click();
    await beat(
      page,
      14000,
      'Assumption: Summary sheet column contract is stable; throughput and TTFT are primary capacity signals — cost columns are not in the source xlsx.',
    );

    await uploadFiles(page, batchProfiles);
    await scrollToHeading(page, 'Inference Panel');
    await beat(
      page,
      16000,
      'Profiles 1–7: short input + high concurrency → chat/copilot; long input + cache → RAG; long output + low concurrency → batch doc gen.',
    );

    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await beat(
      page,
      14000,
      `Live deployed UI (no clone required): ${LIVE_URL} · Reviewers: ./reproduce.sh, npm run test, npm run test:e2e. End of Task 1 walkthrough.`,
    );

    const elapsed = Date.now() - startedAt;
    if (elapsed > MAX_RUNTIME_MS) {
      console.warn(`Warning: recording ran ${Math.round(elapsed / 1000)}s (target <= 285s). Consider trimming in an editor.`);
    } else {
      console.log(`Recording duration ~${Math.round(elapsed / 1000)}s (within 5 min limit).`);
    }

    const video = page.video();
    await page.close();
    await context.close();
    await browser.close();

    if (!video) throw new Error('No Playwright video artifact was created.');

    const rawPath = await video.path();
    fs.copyFileSync(rawPath, OUTPUT_WEBM);
    console.log(`Saved ${OUTPUT_WEBM}`);

    try {
      await runCommand('ffmpeg', ['-y', '-i', OUTPUT_WEBM, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', OUTPUT_MP4], TASK1_UI);
      console.log(`Saved ${OUTPUT_MP4}`);
    } catch {
      console.log('ffmpeg not available — submit the .webm file or convert to MP4 locally.');
    }
  } finally {
    preview.kill('SIGTERM');
    fs.rmSync(VIDEO_TMP_DIR, { recursive: true, force: true });
    console.log('[4/4] Done.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
