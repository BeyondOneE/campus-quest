import test from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

test('launcher address selection, ownership guards and isolated start / restart / stop lifecycle', async () => {
  const run = promisify(execFile);
  try {
    await run('python3', [fileURLToPath(new URL('./service_manager_checks.py', import.meta.url))], { timeout: 90000 });
  } catch (error) {
    throw new Error(error.stdout + error.stderr, { cause: error });
  }
});
