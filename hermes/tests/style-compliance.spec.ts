import { test, expect } from '@playwright/test';

const ROUTES = [
  '/',
  '/tareas',
  '/notas',
  '/gym',
  '/calendario',
  '/mi-dia',
  '/inbox',
];

const VIEWPORTS = [
  { name: 'Desktop (1440px)', width: 1440, height: 900 },
  { name: 'Tablet (1024px)', width: 1024, height: 900 },
  { name: 'Mobile (390px)', width: 390, height: 844 },
];

for (const route of ROUTES) {
  test.describe(`Style Compliance: Route "${route}"`, () => {
    for (const vp of VIEWPORTS) {
      test(`View ${vp.name} compliance on ${route}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(route, { waitUntil: 'networkidle' });
        await page.waitForTimeout(300);

        // 1. Zero horizontal overflow on document body
        const overflow = await page.evaluate(() => {
          return document.body.scrollWidth > window.innerWidth + 1;
        });
        expect(overflow, `Body must not have horizontal scroll at ${vp.width}px`).toBe(false);

        // 2. Card horizontal padding >= 16px
        const invalidCards = await page.evaluate(() => {
          const cards = Array.from(document.querySelectorAll('[data-testid="card"]'));
          const failures: string[] = [];
          cards.forEach((card, idx) => {
            const rect = card.getBoundingClientRect();
            if (rect.width === 0 && rect.height === 0) return;
            const cs = window.getComputedStyle(card);
            const pl = parseFloat(cs.paddingLeft) || 0;
            const pr = parseFloat(cs.paddingRight) || 0;
            if (pl < 15.9 || pr < 15.9) {
              failures.push(`Card #${idx}: pl=${pl}px, pr=${pr}px (< 16px)`);
            }
          });
          return failures;
        });
        expect(invalidCards).toHaveLength(0);

        // 3. Headings letter-spacing >= -0.02em
        const invalidHeadings = await page.evaluate(() => {
          const headings = Array.from(document.querySelectorAll('h1, h2, h3'));
          const failures: string[] = [];
          headings.forEach((h, idx) => {
            const rect = h.getBoundingClientRect();
            if (rect.width === 0 && rect.height === 0) return;
            const cs = window.getComputedStyle(h);
            const fontSize = parseFloat(cs.fontSize) || 16;
            const ls = cs.letterSpacing;
            let lsEm = 0;
            if (ls === 'normal' || ls === '0px') {
              lsEm = 0;
            } else if (ls.endsWith('px')) {
              lsEm = parseFloat(ls) / fontSize;
            }
            if (lsEm < -0.02001) {
              failures.push(`Heading <${h.tagName.toLowerCase()}> #${idx} "${h.textContent?.slice(0, 20)}": ls=${lsEm.toFixed(3)}em`);
            }
          });
          return failures;
        });
        expect(invalidHeadings).toHaveLength(0);

        // 4. Inputs with icon padding-left >= 40px
        const invalidInputs = await page.evaluate(() => {
          const inputs = Array.from(document.querySelectorAll('[data-testid="input-with-icon"]'));
          const failures: string[] = [];
          inputs.forEach((input, idx) => {
            const rect = input.getBoundingClientRect();
            if (rect.width === 0 && rect.height === 0) return;
            const cs = window.getComputedStyle(input);
            const pl = parseFloat(cs.paddingLeft) || 0;
            if (pl < 39.9) {
              failures.push(`Input #${idx}: padding-left=${pl}px (< 40px)`);
            }
          });
          return failures;
        });
        expect(invalidInputs).toHaveLength(0);

        // 5. Consecutive list rows gap >= 4px
        const invalidRows = await page.evaluate(() => {
          const listRows = Array.from(document.querySelectorAll('[data-testid="list-row"]'));
          const failures: string[] = [];
          const parentMap = new Map<HTMLElement, { el: HTMLElement; rect: DOMRect }[]>();

          listRows.forEach(row => {
            const rect = row.getBoundingClientRect();
            if (rect.width === 0 && rect.height === 0) return;
            const p = row.parentElement;
            if (!p) return;
            if (!parentMap.has(p)) parentMap.set(p, []);
            parentMap.get(p)!.push({ el: row as HTMLElement, rect });
          });

          parentMap.forEach(rows => {
            for (let i = 0; i < rows.length - 1; i++) {
              const r1 = rows[i].rect;
              const r2 = rows[i + 1].rect;
              if (r2.top >= r1.bottom - 2) {
                const gap = r2.top - r1.bottom;
                if (gap < 3.9) {
                  failures.push(`Gap between row ${i} and ${i+1}: ${gap.toFixed(1)}px (< 4px)`);
                }
              }
            }
          });
          return failures;
        });
        expect(invalidRows).toHaveLength(0);
      });
    }
  });
}
