import { chromium } from 'playwright';

async function inspect() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  const result = await page.evaluate(() => {
    // 1. Tarjeta (Prioridades de Hoy)
    const cards = Array.from(document.querySelectorAll('div')).filter(el => 
      el.className.includes('card') || el.innerText?.includes('Prioridades de Hoy')
    );
    const card = cards[0];
    const cardStyle = card ? window.getComputedStyle(card) : null;

    // 2. Input de tarea rápida
    const input = document.querySelector('input[placeholder*="Añadir una tarea"]');
    const inputStyle = input ? window.getComputedStyle(input) : null;

    // 3. Título h1
    const h1 = document.querySelector('h1');
    const h1Style = h1 ? window.getComputedStyle(h1) : null;

    return {
      card: {
        tagName: card?.tagName,
        className: card?.className,
        padding: cardStyle ? `${cardStyle.paddingTop} ${cardStyle.paddingRight} ${cardStyle.paddingBottom} ${cardStyle.paddingLeft}` : null,
        margin: cardStyle ? `${cardStyle.marginTop} ${cardStyle.marginRight} ${cardStyle.marginBottom} ${cardStyle.marginLeft}` : null,
      },
      input: {
        placeholder: input?.placeholder,
        className: input?.className,
        padding: inputStyle ? `${inputStyle.paddingTop} ${inputStyle.paddingRight} ${inputStyle.paddingBottom} ${inputStyle.paddingLeft}` : null,
        height: inputStyle?.height,
      },
      h1: {
        text: h1?.innerText,
        className: h1?.className,
        fontFamily: h1Style?.fontFamily,
        letterSpacing: h1Style?.letterSpacing,
      }
    };
  });

  console.log('--- CARD ---', result.card);
  console.log('--- INPUT ---', result.input);
  console.log('--- H1 ---', result.h1);

  await page.screenshot({ path: 'scripts/before_home_1440.png' });
  await browser.close();
}

inspect().catch(err => {
  console.error(err);
  process.exit(1);
});
