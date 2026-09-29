import { chromium } from 'playwright';

async function testTareas() {
  const browser = await chromium.launch();
  for (const width of [1440, 1024, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto('http://localhost:3000/tareas', { waitUntil: 'networkidle' });
    
    const info = await page.evaluate(() => {
      // Find lateral panel
      const aside = document.querySelector('aside');
      // Find search input
      const searchInput = document.querySelector('input[placeholder*="Buscar"]');
      // Find add task card
      const addBar = document.querySelector('form');
      const addCard = addBar ? addBar.closest('[data-testid="card"]') : null;
      // Find add input
      const addInput = addBar ? addBar.querySelector('input') : null;
      // Find list rows
      const rows = Array.from(aside ? aside.querySelectorAll('button') : []);
      const firstRow = rows[0];
      const secondRow = rows[1];
      let rowGap = null;
      if (firstRow && secondRow) {
        const r1 = firstRow.getBoundingClientRect();
        const r2 = secondRow.getBoundingClientRect();
        rowGap = r2.top - r1.bottom;
      }
      
      return {
        asidePadding: aside ? window.getComputedStyle(aside).padding : null,
        searchPaddingLeft: searchInput ? window.getComputedStyle(searchInput).paddingLeft : null,
        searchHeight: searchInput ? window.getComputedStyle(searchInput).height : null,
        addCardPadding: addCard ? window.getComputedStyle(addCard).padding : null,
        addInputHeight: addInput ? window.getComputedStyle(addInput).height : null,
        firstRowHeight: firstRow ? window.getComputedStyle(firstRow).height : null,
        firstRowPadding: firstRow ? window.getComputedStyle(firstRow).padding : null,
        rowGap,
        hasBodyHScroll: document.body.scrollWidth > window.innerWidth,
      };
    });

    console.log(`Tareas ${width}px:`, JSON.stringify(info, null, 2));
    await page.screenshot({ path: `scripts/after_tareas_${width}.png` });
    await page.close();
  }
  await browser.close();
}

testTareas().catch(err => {
  console.error(err);
  process.exit(1);
});
