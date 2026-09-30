import { chromium } from 'playwright';

// Slow 4G Network Conditions (DevTools standard profile)
// Latency: 150ms RTT, Down: 1.6 Mbps (200 KB/s), Up: 750 kbps (93.75 KB/s)
const SLOW_4G = {
  offline: false,
  downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
  latency: 150,
};

// Fast 4G / Normal Mobile (DevTools Fast 4G / Good 4G)
// Latency: 40ms RTT, Down: 4 Mbps, Up: 3 Mbps
const FAST_4G = {
  offline: false,
  downloadThroughput: (4 * 1024 * 1024) / 8,
  uploadThroughput: (3 * 1024 * 1024) / 8,
  latency: 40,
};

async function runBenchmark(profileName, networkConditions, cpuThrottlingRate) {
  const browser = await chromium.launch({ headless: true });

  const runTest = async (isCold, existingContext = null) => {
    let context = existingContext;
    if (!context) {
      context = await browser.newContext({
        viewport: { width: 390, height: 844 }, // iPhone 14 / Pixel standard
        userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 HermesApp/1.0',
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      });
    }

    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);

    // Apply network throttling
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', networkConditions);

    // Apply CPU throttling (4x slowdown)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuThrottlingRate });

    let requestCount = 0;
    let jsRequestCount = 0;
    let totalTransferredBytes = 0;
    let jsTransferredBytes = 0;
    let jsResourceBytes = 0;
    const requests = [];

    page.on('requestfinished', async (request) => {
      requestCount++;
      const url = request.url();
      const type = request.resourceType();
      const response = await request.response();
      const headers = response ? response.headers() : {};
      const sizeHeader = headers['content-length'];
      let bodySize = sizeHeader ? parseInt(sizeHeader, 10) : 0;
      
      // If JS
      if (type === 'script' || url.endsWith('.js') || url.includes('/_next/static/chunks/')) {
        jsRequestCount++;
        jsTransferredBytes += bodySize;
      }
      totalTransferredBytes += bodySize;

      requests.push({ url: url.substring(0, 80), type, size: bodySize });
    });

    const startTime = Date.now();

    // Navigate to /
    const navResponse = await page.goto('http://localhost:3000/', { waitUntil: 'load', timeout: 60000 });
    const loadTime = Date.now() - startTime;

    // Wait until real data is visible in DOM
    // In Hermes, real data contains greetings or items or gym section
    const realDataStart = Date.now();
    await page.waitForSelector('.dashboard-main, [data-testid="card"], h1, .task-card', { state: 'visible', timeout: 30000 });
    const realDataTime = Date.now() - startTime;

    // Collect in-page performance timings
    const perfData = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] || {};
      const paint = performance.getEntriesByType('paint');
      const fcpEntry = paint.find(p => p.name === 'first-contentful-paint');
      
      // Calculate TBT from long tasks if available
      let tbt = 0;
      const longTasks = performance.getEntriesByType('longtask') || [];
      longTasks.forEach(task => {
        if (task.duration > 50) {
          tbt += (task.duration - 50);
        }
      });

      // Calculate script resources from performance entries
      const resources = performance.getEntriesByType('resource');
      let scriptEncodedBytes = 0;
      let scriptDecodedBytes = 0;
      let totalEncodedBytes = 0;

      resources.forEach(r => {
        totalEncodedBytes += (r.transferSize || r.encodedBodySize || 0);
        if (r.initiatorType === 'script' || r.name.includes('.js')) {
          scriptEncodedBytes += (r.transferSize || r.encodedBodySize || 0);
          scriptDecodedBytes += (r.decodedBodySize || 0);
        }
      });

      return {
        ttfb: nav.responseStart ? Math.round(nav.responseStart - nav.requestStart) : 0,
        fcp: fcpEntry ? Math.round(fcpEntry.startTime) : 0,
        domInteractive: nav.domInteractive ? Math.round(nav.domInteractive) : 0,
        domComplete: nav.domComplete ? Math.round(nav.domComplete) : 0,
        loadEventEnd: nav.loadEventEnd ? Math.round(nav.loadEventEnd) : 0,
        tbt: Math.round(tbt),
        scriptEncodedBytes,
        scriptDecodedBytes,
        totalResourceEncodedBytes: totalEncodedBytes,
      };
    });

    // Also get LCP using PerformanceObserver emulation or final paints
    const lcp = await page.evaluate(async () => {
      return new Promise(resolve => {
        let maxTime = 0;
        try {
          const po = new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            const lastEntry = entries[entries.length - 1];
            if (lastEntry) maxTime = Math.round(lastEntry.startTime);
          });
          po.observe({ type: 'largest-contentful-paint', buffered: true });
          setTimeout(() => {
            po.disconnect();
            resolve(maxTime);
          }, 1000);
        } catch {
          resolve(0);
        }
      });
    });

    await page.close();
    return {
      context,
      metrics: {
        isCold,
        ttfb: perfData.ttfb,
        fcp: perfData.fcp,
        lcp: lcp || perfData.fcp,
        tbt: perfData.tbt,
        timeToData: realDataTime,
        loadTime,
        requestCount,
        jsRequestCount,
        totalTransferredKB: Math.round((totalTransferredBytes || perfData.totalResourceEncodedBytes) / 1024),
        jsTransferredKB: Math.round((jsTransferredBytes || perfData.scriptEncodedBytes) / 1024),
        jsUncompressedKB: Math.round(perfData.scriptDecodedBytes / 1024),
      }
    };
  };

  console.log(`\n=== Evaluando perfil: ${profileName} ===`);
  
  // 1. Cold start
  console.log('Ejecutando Cold Start...');
  const coldResult = await runTest(true);
  
  // 2. Warm start (same context, cache retained)
  console.log('Ejecutando Warm Start (reapertura)...');
  const warmResult = await runTest(false, coldResult.context);

  await coldResult.context.close();
  await browser.close();

  return {
    profile: profileName,
    cold: coldResult.metrics,
    warm: warmResult.metrics,
  };
}

async function main() {
  console.log('Iniciando benchmark de rendimiento móvil para Hermes...');
  const slow4G = await runBenchmark('Slow 4G + CPU 4x', SLOW_4G, 4);
  const fast4G = await runBenchmark('Fast 4G + CPU 4x', FAST_4G, 4);

  console.log('\n================ RESULTADOS MEDIDOS ================');
  console.log(JSON.stringify({ slow4G, fast4G }, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
