import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { validRoninVelocities } from '../public/treasure-lab/ronin.js';
import { ApiError } from './store.mjs';

const workerScript = fileURLToPath(new URL('../scripts/serve-ronin.py', import.meta.url));
const unavailable = () => new ApiError(503, 'RONIN_UNAVAILABLE', 'RoNIN inference is unavailable on the host computer.');

export class RoninWorker {
  constructor(root = fileURLToPath(new URL('../.local/ronin-research/', import.meta.url))) {
    this.python = join(root, 'venv/bin/python');
    this.upstream = join(root, 'upstream');
    this.checkpoint = join(root, 'resnet18.pt');
    this.child = null;
    this.pending = [];
    this.retryAt = 0;
  }

  get available() {
    return [this.python, join(this.upstream, 'source/model_resnet1d.py'), this.checkpoint].every(existsSync);
  }

  start() {
    if (this.child) return true;
    if (!this.available || Date.now() < this.retryAt) return false;
    const child = spawn(this.python, ['-B', workerScript, this.upstream, this.checkpoint], {
      stdio: ['pipe', 'pipe', 'ignore'], env: { OMP_NUM_THREADS: '2', MKL_NUM_THREADS: '2' },
    });
    this.child = child;
    const failed = () => {
      if (this.child !== child) return;
      this.retryAt = Date.now() + 3000;
      this.close();
    };
    child.on('error', failed);
    child.on('exit', failed);
    child.stdin.on('error', failed);
    const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
    lines.on('line', line => {
      if (this.child !== child) return;
      const job = this.pending.shift();
      if (!job) { failed(); return; }
      clearTimeout(job.timeout);
      try {
        const { velocities } = JSON.parse(line);
        if (!validRoninVelocities(velocities, job.count)) throw unavailable();
        job.resolve(velocities);
      } catch {
        job.reject(unavailable());
      }
    });
    return true;
  }

  infer(batch) {
    if (this.pending.length >= 2) throw new ApiError(429, 'RONIN_BUSY', 'The motion model is busy.');
    if (!this.start()) throw unavailable();
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.retryAt = Date.now() + 3000;
        this.close();
      }, 5000);
      this.pending.push({ resolve, reject, timeout, count: batch.count });
      this.child.stdin.write(JSON.stringify(batch) + '\n');
    });
  }

  close() {
    const child = this.child;
    this.child = null;
    child?.stdin.end();
    child?.kill();
    for (const job of this.pending.splice(0)) {
      clearTimeout(job.timeout);
      job.reject(unavailable());
    }
  }
}
