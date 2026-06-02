/**
 * Records Task 2 walkthrough with on-screen captions → ~/Desktop/task2-submission-demo.*
 */
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const DESKTOP = path.join(process.env.HOME ?? '/Users/anning', 'Desktop');
const PORT = 4180;
const BASE_URL = `http://127.0.0.1:${PORT}/task2-video/index.html`;
const OUTPUT_WEBM = path.join(DESKTOP, 'task2-submission-demo.webm');
const OUTPUT_MP4 = path.join(DESKTOP, 'task2-submission-demo.mp4');
const VIDEO_TMP_DIR = path.join(REPO_ROOT, '.record-task2-video-tmp');
const MAX_RUNTIME_MS = 4 * 60 * 1000 + 45 * 1000;

const SCENES = [
  {
    scene: 'intro',
    ms: 14000,
    caption:
      'Task 2 — A prospect needs a fast answer: is this model good enough for coding and long-context reasoning? Full benchmarks are too expensive; we prune while preserving go/no-go signal. Both Task 1 and Task 2 are required for submission.',
  },
  {
    scene: 'registry',
    ms: 18000,
    caption:
      'Interviewer clarification: aa_lcr_pruned is registered the same way as live_code_bench_pruned. One universal PRUNED_BENCHMARKS adapter — not hardcoded to a single benchmark.',
  },
  {
    scene: 'part-a',
    ms: 16000,
    caption:
      'Part A: multi-objective pruning — coverage + disagreement + difficulty + facility-location greedy. Forbidden baselines: random sampling and top-k hardest only.',
  },
  {
    scene: 'results',
    ms: 20000,
    caption:
      'Validation on shipped Evals/: LiveCodeBench keeps 10% (90% cost cut), AA-LCR keeps 20% (judge noise). Kendall τ = 1.0 and decision agreement = 100% for both — compare_summary.json.',
  },
  {
    scene: 'charts',
    ms: 14000,
    caption:
      'Full vs pruned scores track closely across gpt-oss-120b, kimi-k2.5, and minimax-m2.5 — ranking and tiered go/no-go decisions preserved on both benchmarks.',
  },
  {
    scene: 'ablation',
    ms: 16000,
    caption:
      'Ablation vs forbidden baselines: random collapses decision agreement to 33%. Hardest-only keeps rank but fails go/no-go. Our selector optimizes for the customer conversation.',
  },
  {
    scene: 'part-b',
    ms: 20000,
    caption:
      'Part B (working code required): MMMU encoder probe with text-only / original / perturbed controls. Real image perturbations + live VLM path — not a design proposal alone.',
  },
  {
    scene: 'reproduce',
    ms: 18000,
    caption:
      'Reviewers: ./reproduce.sh regenerates pytest results, compare_summary.json, ablation.json, encoder_probe_validation.json, and scorecard.json. Evals/ also on Google Drive if Git LFS fails.',
  },
  {
    scene: 'close',
    ms: 12000,
    caption:
      'Invite sophies-cerebras, danielkim-cerebras, kevint-cerebras to your private repo · Handout A/B + CLAIMS.md · evalscope SHA pinned. End of Task 2 walkthrough.',
  },
];

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
        if (Date.now() - started > timeoutMs) reject(new Error(`Port ${port} not ready`));
        else setTimeout(tick, 400);
      });
    };
    tick();
  });
}

function runCommand(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
    child.on('error', reject);
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

async function setCaption(page, text) {
  await page.evaluate((caption) => window.setDemoCaption(caption), text);
}

async function showScene(page, id) {
  await page.evaluate((sceneId) => window.showScene(sceneId), id);
  await page.waitForTimeout(500);
}

async function beat(page, ms, caption, scene) {
  if (scene) await showScene(page, scene);
  if (caption) await setCaption(page, caption);
  await page.waitForTimeout(ms);
}

async function main() {
  fs.mkdirSync(VIDEO_TMP_DIR, { recursive: true });

  console.log('[1/4] Regenerating Task2 artifacts…');
  await runCommand('python3', ['-m', 'evalscope_ext.tools.generate_artifacts'], REPO_ROOT);

  console.log('[2/4] Starting static server…');
  const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {
    cwd: REPO_ROOT,
    stdio: 'pipe',
  });

  try {
    await waitForPort(PORT);

    console.log('[3/4] Recording walkthrough…');
    const startedAt = Date.now();

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      recordVideo: { dir: VIDEO_TMP_DIR, size: { width: 1280, height: 720 } },
    });
    const page = await context.newPage();
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    for (const step of SCENES) {
      await beat(page, step.ms, step.caption, step.scene);
    }

    const elapsed = Date.now() - startedAt;
    console.log(`Recording duration ~${Math.round(elapsed / 1000)}s${elapsed > MAX_RUNTIME_MS ? ' (over 5 min — trim if needed)' : ''}.`);

    const video = page.video();
    await page.close();
    await context.close();
    await browser.close();

    if (!video) throw new Error('No video artifact');
    fs.copyFileSync(await video.path(), OUTPUT_WEBM);
    console.log(`Saved ${OUTPUT_WEBM}`);

    try {
      await runCommand(
        'ffmpeg',
        ['-y', '-i', OUTPUT_WEBM, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', OUTPUT_MP4],
        REPO_ROOT,
      );
      console.log(`Saved ${OUTPUT_MP4}`);
    } catch {
      console.log('ffmpeg not available — use .webm or convert locally.');
    }
  } finally {
    server.kill('SIGTERM');
    fs.rmSync(VIDEO_TMP_DIR, { recursive: true, force: true });
    console.log('[4/4] Done.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
