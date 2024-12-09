
const assert = require('assert');
const { exec } = require('child_process');

describe('Cline CLI', () => {
  it('should display usage information when no task is provided', (done) => {
    exec('node ./dist/cli.js', (error, stdout) => {
      assert(stdout.includes('Usage: cline [options] <task>'));
      done();
    });
  });

  it('should execute a task with default options', (done) => {
    exec('node ./dist/cli.js "create a new React component"', (error, stdout) => {
      assert(stdout.includes('Task: create a new React component'));
      done();
    });
  });

  // ...additional tests...
});