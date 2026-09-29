import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const OUT_DIR = 'C:/Users/Javier Canovas/.gemini/antigravity-ide/brain/ea13be31-ec56-4ac1-8e63-2d539ac19c40/screenshots';

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const SCREENS = [
  { name: 'inicio', path: '/' },
  { name: 'tareas', path: '/tareas' },
  { name: 'notas', path: '/notas' },
  { name: 'gym', path: '/gym' },
];

const VIEWPORTS = [
  { name: 'desktop_1440', width: 1440, height: 900 },
  { name: 'tablet_1024', width: 1024, height: 900 },
  { name: 'mobile_390', width: 390, height: 844 },
];

async function generateScreenshots() {
  console.log('Generando capturas finales en:', OUT_DIR);
  const browser = await chromium.launch();

  for (const screen of SCREENS) {
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      await page.goto(`http://localhost:3000${screen.path}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);

      const filePath = path.join(OUT_DIR, `${screen.name}_${vp.name}.png`);
      await page.screenshot({ path: filePath, fullPage: false });
      console.log(`Guardada: ${screen.name}_${vp.name}.png`);
      await page.close();
    }
  }

  await browser.close();
  console.log('Todas las capturas generadas con éxito.');
}

generateScreenshots().catch(err => {
  console.error(err);
  process.exit(1);
});
