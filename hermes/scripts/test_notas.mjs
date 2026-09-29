import { chromium } from 'playwright';

async function testNotas() {
  const browser = await chromium.launch();
  for (const width of [1440, 1024, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto('http://localhost:3000/notas', { waitUntil: 'networkidle' });
    const info = await page.evaluate(() => {
      const search = document.querySelector('input[placeholder*="Buscar"]');
      const cards = Array.from(document.querySelectorAll('[data-testid="card"]'));
      const c1 = cards[0];
      const c2 = cards[1];
      let gap = null;
      if (c1 && c2) {
        const r1 = c1.getBoundingClientRect();
        const r2 = c2.getBoundingClientRect();
        gap = r2.top - r1.bottom;
      }
      return {
        searchPl: search ? window.getComputedStyle(search).paddingLeft : null,
        searchHeight: search ? window.getComputedStyle(search).height : null,
        card1Padding: c1 ? window.getComputedStyle(c1).padding : null,
        gap,
        hasBodyHScroll: document.body.scrollWidth > window.innerWidth,
      };
    });
    console.log(`Notas ${width}px:`, JSON.stringify(info, null, 2));
    await page.screenshot({ path: `scripts/after_notas_${width}.png` });
    await page.close();
  }
  await browser.close();
}

testNotas().catch(err => {
  console.error(err);
  process.exit(1);
});
