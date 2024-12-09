#!/usr/bin/env node

import * as path from 'path'
import * as fs from 'fs/promises'
import { ClineProvider } from './core/webview/ClineProvider'
import { fileExistsAtPath } from './utils/fs'
import { Anthropic } from "@anthropic-ai/sdk"
import { Command } from 'commander';
import * as winston from 'winston';
import * as vscode from "vscode";

// Initialize logger
const logger = winston.createLogger({
  level: 'info',
  transports: [
    new winston.transports.Console(),
    // Add file transport if needed
  ],
});

// Load configuration from file
function loadConfig(configPath: string) {
  if (fs.existsSync(configPath)) {
    try {
      const configContent = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(configContent);
    } catch (err) {
      logger.error('Failed to parse configuration file:', err.message);
    }
  }
  return {};
}

// Define CLI commands and options
async function main() {
  const program = new Command();

  program
    .name('cline')
    .description('Autonomous coding agent CLI')
    .version(require('../package.json').version)
    .option('--config <path>', 'Path to configuration file', '.clineconfig.json')
    .option('--debug', 'Enable debug output')
    .option('--no-spinner', 'Disable progress spinner')
    .option('--timeout <minutes>', 'Task timeout in minutes', '5');

  // Define 'run' subcommand
  program
    .command('run <task>')
    .description('Execute a task')
    .action(async (task, cmdObj) => {
      const options = program.opts();

      // Load user configuration
      const config = loadConfig(path.resolve(options.config));

      // Merge options with config
      const debug = options.debug || config.debug || false;
      const noSpinner = options.noSpinner || config.noSpinner || false;
      const timeout = parseInt(options.timeout || config.timeout, 10);

      // Set logger level
      logger.level = debug ? 'debug' : 'info';

      // Input validation
      if (!task || typeof task !== 'string') {
        logger.error('Invalid task provided.');
        process.exit(1);
      }

      let provider: ClineProvider
      let stopSpinner: (() => void) | undefined

      // Handle interrupts and cleanup
      const cleanup = () => {
        stopSpinner?.()
        provider?.clearTask()
      }

      process.on('SIGINT', () => {
        cleanup()
        logger.info('\nInterrupted by user')
        process.exit(1)
      })

      try {
        const context = new CliContext()
        await context.ensureStorage()
        await context.loadState()

        const output = new CliOutputChannel()
        // Silence initialization noise
        output.setSilent(!debug)

        provider = new ClineProvider(context, output)
        
        let completed = false
        let success = false
        let error: Error | undefined

        provider.onTaskComplete = () => { 
          completed = true
          success = true 
        }
        provider.onTaskError = (err) => {
          completed = true
          error = err
        }

        // Enable all output after init
        output.setSilent(false)
        logger.info(`Task: ${task}`)
        logger.info(`Directory: ${process.cwd()}\n`)

        await provider.handleCliInput(task)

        if (!noSpinner) {
          stopSpinner = output.startSpinner('Processing task...')
        }

        // Wait for completion or timeout
        const timeoutMs = timeout * 60 * 1000

        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => {
            cleanup()
            reject(new Error(`Task timed out after ${timeout} minutes`))
          }, timeoutMs)

          const check = setInterval(() => {
            if (completed) {
              clearInterval(check)
              clearTimeout(timer)
              resolve()
            }
          }, 100)
        })

        cleanup()

        if (error) throw error
        
        if (success) {
          logger.info('Task completed successfully')
          process.exit(0) 
        } else {
          logger.error('Task failed')
          process.exit(1)
        }

      } catch (error) {
        cleanup()
        logger.error('\n✖ Error:', error.message)
        if (debug) {
          logger.error('\nStack trace:', error.stack)
        }
        logger.error('\nTip: Run with --debug for detailed logs')
        process.exit(1)
      }
    });

  // Define 'config' subcommand
  program
    .command('config')
    .description('Manage configuration')
    .option('--set <key=value>', 'Set a configuration key-value pair')
    .option('--get <key>', 'Get a configuration value')
    .action((cmdObj) => {
      // ...code to manage configuration...
    });

  // Handle unknown commands
  program.on('command:*', () => {
    logger.error('Invalid command:', program.args.join(' '));
    program.help();
  });

  program.parse(process.argv);
}

main();