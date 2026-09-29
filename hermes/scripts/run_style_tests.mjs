import { chromium } from 'playwright';

const ROUTES = [
  '/',
  '/tareas',
  '/notas',
  '/gym',
  '/calendario',
  '/mi-dia',
  '/inbox',
];

const VIEWPORTS = [1440, 1024, 390];

async function runStyleTests() {
  console.log('🚀 Iniciando Tests de Cumplimiento de Estilo Automatizados (Playwright)...\n');
  const browser = await chromium.launch();
  let totalErrors = 0;
  const results = [];

  for (const route of ROUTES) {
    for (const width of VIEWPORTS) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const url = `http://localhost:3000${route}`;
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500); // Dar margen a hidratación y layouts reactivos

      const checkResult = await page.evaluate(({ route, width }) => {
        const errors = [];
        const warnings = [];

        // 1. Scroll horizontal en el body
        const scrollW = document.body.scrollWidth;
        const innerW = window.innerWidth;
        if (scrollW > innerW + 1) {
          errors.push(`Scroll horizontal detectado: scrollWidth=${scrollW}px > innerWidth=${innerW}px`);
        }

        // 2. Tarjetas ([data-testid="card"]) con padding horizontal < 16px
        const cards = Array.from(document.querySelectorAll('[data-testid="card"]'));
        let cardsChecked = 0;
        cards.forEach((card, idx) => {
          // Ignorar elementos ocultos (display none o tamaño 0)
          const rect = card.getBoundingClientRect();
          if (rect.width === 0 && rect.height === 0) return;

          cardsChecked++;
          const cs = window.getComputedStyle(card);
          const pl = parseFloat(cs.paddingLeft) || 0;
          const pr = parseFloat(cs.paddingRight) || 0;

          if (pl < 15.9 || pr < 15.9) {
            errors.push(`Tarjeta #${idx} (${card.className.slice(0, 30)}...) tiene padding horizontal insuficiente: pl=${pl}px, pr=${pr}px (< 16px)`);
          }
        });

        // 3. Títulos (h1–h3) con letter-spacing computado inferior a -0.02em
        const headings = Array.from(document.querySelectorAll('h1, h2, h3'));
        let headingsChecked = 0;
        headings.forEach((h, idx) => {
          const rect = h.getBoundingClientRect();
          if (rect.width === 0 && rect.height === 0) return;

          headingsChecked++;
          const cs = window.getComputedStyle(h);
          const fontSize = parseFloat(cs.fontSize) || 16;
          const ls = cs.letterSpacing;

          let lsEm = 0;
          if (ls === 'normal' || ls === '0px') {
            lsEm = 0;
          } else if (ls.endsWith('px')) {
            const lsPx = parseFloat(ls);
            lsEm = lsPx / fontSize;
          }

          if (lsEm < -0.02001) {
            errors.push(`Título <${h.tagName.toLowerCase()}> #${idx} "${h.innerText.slice(0, 25)}" tiene letter-spacing computado inferior a -0.02em: ${lsEm.toFixed(4)}em (ls=${ls}, fs=${fontSize}px)`);
          }
        });

        // 4. Inputs con icono cuyo padding-left sea inferior a 40px
        const inputsWithIcon = Array.from(document.querySelectorAll('[data-testid="input-with-icon"]'));
        let inputsChecked = 0;
        inputsWithIcon.forEach((input, idx) => {
          const rect = input.getBoundingClientRect();
          if (rect.width === 0 && rect.height === 0) return;

          inputsChecked++;
          const cs = window.getComputedStyle(input);
          const pl = parseFloat(cs.paddingLeft) || 0;

          if (pl < 39.9) {
            errors.push(`Input con icono #${idx} (placeholder="${input.placeholder}") tiene padding-left insuficiente: ${pl}px (< 40px)`);
          }
        });

        // 5. Filas de lista consecutivas con menos de 4px entre sus cajas
        const listRows = Array.from(document.querySelectorAll('[data-testid="list-row"]'));
        let rowPairsChecked = 0;

        // Agrupar filas consecutivas por contenedor padre
        const parentMap = new Map();
        listRows.forEach(row => {
          const rect = row.getBoundingClientRect();
          if (rect.width === 0 && rect.height === 0) return; // oculto
          const p = row.parentElement;
          if (!parentMap.has(p)) parentMap.set(p, []);
          parentMap.get(p).push({ el: row, rect });
        });

        parentMap.forEach((rowsInParent) => {
          for (let i = 0; i < rowsInParent.length - 1; i++) {
            const r1 = rowsInParent[i].rect;
            const r2 = rowsInParent[i + 1].rect;
            // Si están en disposición vertical (r2 debajo de r1)
            if (r2.top >= r1.bottom - 2) {
              rowPairsChecked++;
              const gap = r2.top - r1.bottom;
              if (gap < 3.9) {
                errors.push(`Filas consecutivas con separación insuficiente: ${gap.toFixed(1)}px (< 4px)`);
              }
            }
          }
        });

        return {
          route,
          width,
          cardsChecked,
          headingsChecked,
          inputsChecked,
          rowPairsChecked,
          errors,
          warnings,
        };
      }, { route, width });

      results.push(checkResult);
      if (checkResult.errors.length > 0) {
        totalErrors += checkResult.errors.length;
        console.error(`❌ [FALLO] ${route} @ ${width}px:`);
        checkResult.errors.forEach(e => console.error(`   - ${e}`));
      } else {
        console.log(`✅ [OK] ${route} @ ${width}px | Tarjetas: ${checkResult.cardsChecked}, Títulos: ${checkResult.headingsChecked}, Inputs c/icono: ${checkResult.inputsChecked}, Pares filas: ${checkResult.rowPairsChecked}`);
      }

      await page.close();
    }
  }

  await browser.close();

  console.log('\n======================================================');
  if (totalErrors === 0) {
    console.log('🎉 ¡TODOS LOS TESTS DE ESTILO PASARON EXITOSAMENTE!');
    console.log(`Total verificaciones: ${results.length} combinaciones ruta-resolución`);
    console.log('======================================================');
    process.exit(0);
  } else {
    console.error(`❌ Se encontraron ${totalErrors} errores de estilo.`);
    console.log('======================================================');
    process.exit(1);
  }
}

runStyleTests().catch(err => {
  console.error('Error fatal durante la ejecución de los tests:', err);
  process.exit(1);
});
