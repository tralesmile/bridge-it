// Prints a difficulty table for every level. Run: npm run report
import { createServer } from 'vite';
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const mod = await server.ssrLoadModule('/src/core/difficulty.ts');
  console.log(mod.formatReport(mod.difficultyReport()));
} finally {
  await server.close();
}
