import { chromium } from 'playwright';

async function testServiceWorkerAndOffline() {
  console.log('Testing Service Worker registration & Offline capability...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });

  const page = await context.newPage();
  
  // 1. Visit Home online first to register SW and populate cache
  console.log('1. Loading Home page online...');
  await page.goto('http://localhost:3000/', { waitUntil: 'load' });

  // Check SW registration in client
  const swState = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return { supported: false };
    const reg = await navigator.serviceWorker.getRegistration();
    return {
      supported: true,
      registered: !!reg,
      active: !!reg?.active,
      scope: reg?.scope,
      hasController: !!navigator.serviceWorker.controller,
    };
  });
  console.log('SW state:', JSON.stringify(swState, null, 2));

  // Wait 1s for SW to cache assets
  await page.waitForTimeout(1500);

  // 2. Go Offline
  console.log('2. Emulating OFFLINE mode...');
  await context.setOffline(true);

  // 3. Navigate again while offline
  console.log('3. Navigating while offline...');
  try {
    const offlineNav = await page.goto('http://localhost:3000/', { waitUntil: 'load', timeout: 10000 });
    console.log(`Offline navigation response status: ${offlineNav ? offlineNav.status() : 'null'}`);
    const title = await page.title();
    console.log(`Page title offline: ${title}`);
    const heading = await page.locator('h1').textContent();
    console.log(`Heading visible offline: ${heading}`);
  } catch (err) {
    console.log('Offline navigation error:', err.message);
  }

  // 4. Navigate to uncached route while offline (should show /offline fallback)
  console.log('4. Navigating to uncached route /some-uncached-route while offline...');
  try {
    await page.goto('http://localhost:3000/some-random-page', { waitUntil: 'load', timeout: 10000 });
    const offlineHeading = await page.locator('h1').textContent();
    console.log(`Fallback heading on offline uncached route: ${offlineHeading}`);
  } catch (err) {
    console.log('Fallback route test error:', err.message);
  }

  await browser.close();
  console.log('SW & Offline verification complete!');
}

testServiceWorkerAndOffline().catch(console.error);
