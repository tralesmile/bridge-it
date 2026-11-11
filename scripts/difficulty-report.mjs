// Prints a difficulty table for every level. Run: npm run report (add -- --trim for the slow min-cost search)
import { createServer } from 'vite';
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const mod = await server.ssrLoadModule('/src/core/difficulty.ts');
  console.log(mod.formatReport(mod.difficultyReport()));
  if (process.argv.includes('--trim')) {
    // Slow (a few minutes): greedy min-cost search on every level.
    const { ALL_LEVELS, DRAFT_LEVELS } = await server.ssrLoadModule('/src/core/levels.ts');
    const rows = [];
    for (const level of [...ALL_LEVELS, ...DRAFT_LEVELS]) rows.push(mod.trimRow(level));
    console.log('');
    console.log(mod.formatTrimReport(rows));
  }
} finally {
  await server.close();
}
