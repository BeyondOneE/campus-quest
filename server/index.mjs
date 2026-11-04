import http from 'node:http';
import { mkdirSync, chmodSync, readFileSync, existsSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { resolve } from 'node:path';
import { isIP } from 'node:net';
import { GameStore } from './store.mjs';
import { createApplication } from './app.mjs';
import { CampusGuide } from './guide.mjs';

const port = Number(process.env.PORT || 4180);
const directory = resolve('.local'); mkdirSync(directory, { recursive: true, mode: 0o700 });
chmodSync(directory, 0o700);
const database = resolve(directory, 'campus-quest.sqlite');
const store = new GameStore(database); chmodSync(database, 0o600);
// Load only guide settings; do not override the launcher's network configuration.
if(existsSync('.env'))for(const [key,value] of Object.entries(parseEnv(readFileSync('.env','utf8')))) {
  if(['DEEPSEEK_API_KEY','CQ_AI_BASE_URL','CQ_AI_MODEL','CQ_GUIDE_CONFIG'].includes(key)&&process.env[key]===undefined)process.env[key]=value;
}
const guide=new CampusGuide({apiKey:process.env.DEEPSEEK_API_KEY||'',baseUrl:process.env.CQ_AI_BASE_URL||'https://api.deepseek.com',
  model:process.env.CQ_AI_MODEL||'deepseek-flash',...(process.env.CQ_GUIDE_CONFIG?{loadConfig:()=>JSON.parse(readFileSync(process.env.CQ_GUIDE_CONFIG,'utf8'))}:{})});
const handle = createApplication({ store, guide, localPort: port, publicOrigin: process.env.PUBLIC_ORIGIN || '' });
const server = http.createServer(async (request, response) => {
  const chunks = []; let bytes = 0;
  try {
    for await (const chunk of request) {
      bytes += chunk.length;
      if (bytes > 8192) { response.writeHead(413, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); response.end('{"error":{"code":"BODY_TOO_LARGE","message":"Request too large."}}'); return; }
      chunks.push(chunk);
    }
    let body = {};
    try { if (bytes) body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch {
      response.writeHead(400, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); response.end('{"error":{"code":"INVALID_JSON","message":"Invalid JSON."}}'); return;
    }
    const path = new URL(request.url, 'http://localhost').pathname;
    const result = await handle({ method: request.method, path, headers: request.headers, body,
      // Only the local proxy can reach this loopback listener; it overwrites this header.
      clientKey: isIP(request.headers['x-forwarded-for'] || '') ? request.headers['x-forwarded-for'] : request.socket.remoteAddress || 'unknown' });
    response.writeHead(result.status, result.headers); response.end(result.body);
  } catch {
    if (!response.writableEnded) { response.writeHead(500); response.end(); }
  }
});
server.requestTimeout = 15000; server.headersTimeout = 10000; server.keepAliveTimeout = 5000;
server.listen(port, '127.0.0.1', () => console.log(`Campus Quest backend: http://127.0.0.1:${port}/treasure-lab/`));
const prune = setInterval(() => store.prune(), 60000); prune.unref();
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => {
  clearInterval(prune); server.close(() => { store.close(); process.exit(0); });
  setTimeout(() => process.exit(0), 3000).unref();
});
