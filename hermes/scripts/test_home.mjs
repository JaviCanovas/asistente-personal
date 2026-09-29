import { chromium } from 'playwright';

async function testHome() {
  const browser = await chromium.launch();
  for (const width of [1440, 1024, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    
    // Check styles
    const styles = await page.evaluate(() => {
      const card = document.querySelector('[data-testid="card"]');
      const input = document.querySelector('input');
      const h1 = document.querySelector('h1');
      const firstRow = document.querySelector('li');
      const nextRow = firstRow?.nextElementSibling;
      let rowGap = null;
      if (firstRow && nextRow) {
        const r1 = firstRow.getBoundingClientRect();
        const r2 = nextRow.getBoundingClientRect();
        rowGap = r2.top - r1.bottom;
      }
      return {
        cardPadding: card ? window.getComputedStyle(card).padding : null,
        inputPaddingLeft: input ? window.getComputedStyle(input).paddingLeft : null,
        inputHeight: input ? window.getComputedStyle(input).height : null,
        h1LetterSpacing: h1 ? window.getComputedStyle(h1).letterSpacing : null,
        h1FontSize: h1 ? window.getComputedStyle(h1).fontSize : null,
        rowGap,
        hasBodyHScroll: document.body.scrollWidth > window.innerWidth,
      };
    });
    console.log(`Viewport ${width}px:`, JSON.stringify(styles, null, 2));
    await page.screenshot({ path: `scripts/after_home_${width}.png` });
    await page.close();
  }
  await browser.close();
}

testHome().catch(err => {
  console.error(err);
  process.exit(1);
});
