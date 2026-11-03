import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const derive = promisify(scrypt);
const options = { N: 131072, r: 8, p: 1, maxmem: 160 * 1024 * 1024 };
let running = 0;

// Bound memory use without blocking the game server's event loop.
export async function passwordHash(password, salt = randomBytes(16).toString('hex')) {
  if (running >= 2) {
    const error = new Error('Authentication is busy. Please retry.');
    error.authBusy = true; throw error;
  }
  running++;
  try {
    const key = await derive(password, salt, 64, options);
    return `scrypt$131072$8$1$${salt}$${key.toString('hex')}`;
  } finally { running--; }
}

export async function passwordMatches(password, encoded) {
  // Unknown users perform the same expensive operation; no fast account lookup oracle.
  const fallback = `scrypt$131072$8$1$${'0'.repeat(32)}$${'0'.repeat(128)}`;
  const expected = encoded || fallback;
  const salt = expected.split('$')[4];
  const actual = await passwordHash(password, salt);
  return timingSafeEqual(Buffer.from(actual), Buffer.from(expected)) && Boolean(encoded);
}
