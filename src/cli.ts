#!/usr/bin/env node

import * as path from 'path'
import { Command } from 'commander';
import { spawn } from 'child_process';

async function main() {
  const program = new Command();

  program
    .name('cline')
    .description('Autonomous coding agent CLI')
    .version(require('../package.json').version);

  // Add VSCode command
  program
    .command('code [path]')
    .description('Execute VS Code commands')
    .option('-r, --reuse-window', 'Reuse VS Code window')
    .option('-n, --new-window', 'Open new window') 
    .option('-g, --goto <file:line[:character]>', 'Open file at specific line/column')
    .option('-d, --diff <file1> <file2>', 'Compare two files')
    .option('-w, --wait', 'Wait for files to be closed')
    .action(async (filePath, options) => {
      const args = ['code'];
      if (filePath) args.push(filePath);
      
      if (options.reuseWindow) args.push('--reuse-window');
      if (options.newWindow) args.push('--new-window');
      if (options.goto) args.push('--goto', options.goto);
      if (options.diff) args.push('--diff', ...options.diff.split(' '));
      if (options.wait) args.push('--wait');
      
      const proc = spawn(args[0], args.slice(1), { 
        stdio: 'inherit',
        shell: true 
      });
      
      proc.on('error', (err) => {
        console.error('Failed to execute VS Code command:', err.message);
        process.exit(1);
      });
      
      proc.on('exit', (code) => process.exit(code || 0));
    });

  program.parse(process.argv);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
