// Exporta a animação do Card 6 para PNG (quadro a quadro) e MP4 via ffmpeg.
// Uso: node export.mjs   (requer playwright + ffmpeg)
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const FPS = 30;
const jobs = [
  { mode: 'box',  w: 844,  h: 431,  scale: 2, out: 'card6-ilustracao.mp4', still: 'card6-ilustracao-final.png' },
  { mode: 'card', w: 1080, h: 1350, scale: 1, out: 'card6-preview-card.mp4', still: 'card6-preview-card-final.png' },
];

const browser = await chromium.launch();
for (const j of jobs) {
  const page = await browser.newPage({ viewport: { width: j.w, height: j.h }, deviceScaleFactor: j.scale });
  await page.goto(pathToFileURL(path.join(here, 'animacao.html')).href + `?mode=${j.mode}&export=1`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState('networkidle');
  const dur = await page.evaluate(() => window.DURATION);
  const dir = path.join(here, '.frames', j.mode);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const n = Math.round(dur * FPS);
  for (let i = 0; i < n; i++) {
    await page.evaluate(t => window.render(t), i / FPS);
    await page.screenshot({ path: path.join(dir, String(i).padStart(4, '0') + '.png') });
  }
  await page.evaluate(t => window.render(t), dur);
  await page.screenshot({ path: path.join(here, j.still) });
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(FPS), '-i', path.join(dir, '%04d.png'),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', '-preset', 'slow', '-movflags', '+faststart',
    path.join(here, j.out)]);
  console.log('ok', j.out, `${j.w * j.scale}x${j.h * j.scale}`, n, 'frames');
  await page.close();
}
await browser.close();
