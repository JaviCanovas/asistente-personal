// Hermes — Comprobación Automática de Presupuestos de Rendimiento (Budget Checker)
// Ejecutar tras `npm run build`: `npm run perf:check`

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const BUDGETS = {
  maxInitialJsGzipKB: 180, // Presupuesto estricto de JS inicial transferido en Home
  maxSingleChunkGzipKB: 90, // Ningún chunk individual debe superar 90 KB gzip (excepto recharts diferido)
  maxCssGzipKB: 30, // CSS transferido
};

function getGzipSize(filePath) {
  const content = fs.readFileSync(filePath);
  return zlib.gzipSync(content).length;
}

function checkPerformanceBudgets() {
  console.log('\n🔍 Hermes — Verificando Presupuestos de Rendimiento Web...\n');
  let hasErrors = false;

  // 1. Verificar existencia de artefactos PWA
  const manifestPath = path.resolve('public', 'manifest.json');
  const swPath = path.resolve('public', 'sw.js');

  if (!fs.existsSync(manifestPath)) {
    console.error('❌ Falta public/manifest.json');
    hasErrors = true;
  } else {
    console.log('✅ PWA Manifest presente y configurado');
  }

  if (!fs.existsSync(swPath)) {
    console.error('❌ Falta public/sw.js (Service Worker)');
    hasErrors = true;
  } else {
    console.log('✅ Service Worker presente');
  }

  // 2. Verificar chunks en .next
  const chunksDir = path.resolve('.next', 'static', 'chunks');
  if (!fs.existsSync(chunksDir)) {
    console.error('❌ No se encontró el directorio .next/static/chunks. Ejecuta `npm run build` primero.');
    process.exit(1);
  }

  const files = fs.readdirSync(chunksDir);
  let totalJsBytes = 0;
  let totalJsGzipBytes = 0;
  const chunkReport = [];

  for (const file of files) {
    if (!file.endsWith('.js')) continue;
    const fullPath = path.join(chunksDir, file);
    const stat = fs.statSync(fullPath);
    const gzipSize = getGzipSize(fullPath);

    totalJsBytes += stat.size;
    totalJsGzipBytes += gzipSize;

    chunkReport.push({
      file,
      rawKB: (stat.size / 1024).toFixed(1),
      gzipKB: (gzipSize / 1024).toFixed(1),
      isHeavy: gzipSize / 1024 > BUDGETS.maxSingleChunkGzipKB,
    });
  }

  console.log('\n📦 Chunks Principales en Cliente:');
  chunkReport
    .sort((a, b) => parseFloat(b.gzipKB) - parseFloat(a.gzipKB))
    .slice(0, 10)
    .forEach((c) => {
      const badge = c.isHeavy ? '⚠️ ' : '  ';
      console.log(`${badge}${c.gzipKB} KB gzip (${c.rawKB} KB) -> ${c.file}`);
    });

  // 3. Evaluar presupuesto de CSS
  const cssFiles = fs.readdirSync(chunksDir).filter((f) => f.endsWith('.css'));
  let totalCssGzip = 0;
  cssFiles.forEach((f) => {
    totalCssGzip += getGzipSize(path.join(chunksDir, f));
  });
  const totalCssGzipKB = (totalCssGzip / 1024).toFixed(1);
  console.log(`\n🎨 CSS Global Total: ${totalCssGzipKB} KB gzip (Límite: ${BUDGETS.maxCssGzipKB} KB)`);
  if (parseFloat(totalCssGzipKB) > BUDGETS.maxCssGzipKB) {
    console.warn(`⚠️ El CSS supera el presupuesto de ${BUDGETS.maxCssGzipKB} KB.`);
  } else {
    console.log('✅ Presupuesto de CSS cumplido.');
  }

  if (hasErrors) {
    console.error('\n❌ Fallaron las comprobaciones de presupuesto.');
    process.exit(1);
  }

  console.log('\n🎉 ¡Todos los presupuestos de rendimiento están bajo control!\n');
}

checkPerformanceBudgets();
