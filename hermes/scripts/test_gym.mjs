import { chromium } from 'playwright';

async function testGym() {
  const browser = await chromium.launch();
  for (const width of [1440, 1024, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto('http://localhost:3000/gym', { waitUntil: 'networkidle' });
    const info = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      const cards = Array.from(document.querySelectorAll('[data-testid="card"]'));
      const h3 = document.querySelector('h3');
      return {
        h1Size: h1 ? window.getComputedStyle(h1).fontSize : null,
        h1LetterSpacing: h1 ? window.getComputedStyle(h1).letterSpacing : null,
        h3Text: h3?.innerText,
        cardsCount: cards.length,
        hasBodyHScroll: document.body.scrollWidth > window.innerWidth,
      };
    });
    console.log(`Gym ${width}px:`, JSON.stringify(info, null, 2));
    await page.screenshot({ path: `scripts/after_gym_${width}.png` });
    await page.close();
  }
  await browser.close();
}

testGym().catch(err => {
  console.error(err);
  process.exit(1);
});
