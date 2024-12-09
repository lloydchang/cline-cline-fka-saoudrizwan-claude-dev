
const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['src/cli.ts'],
  bundle: true,
  outdir: 'dist',
  platform: 'node',
  external: ['vscode'],
  minify: true,
  // ...existing configuration...
}).catch(() => process.exit(1));