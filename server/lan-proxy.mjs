import http from 'node:http';
import https from 'node:https';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { isIP } from 'node:net';
import { X509Certificate } from 'node:crypto';

const directory = fileURLToPath(new URL('../.local/lan-tls/', import.meta.url));
const address = readFileSync(`${directory}address.txt`, 'utf8').trim();
const port = (key, fallback) => {
  const value = Number(process.env[key] || fallback);
  if (!Number.isInteger(value) || value < 1024 || value > 65535) throw new Error(`Invalid ${key}.`);
  return value;
};
const backendPort = port('CQ_BACKEND_PORT', 4180), tlsPort = port('CQ_TLS_PORT', 4443), setupPort = port('CQ_SETUP_PORT', 4181);
if (new Set([backendPort, tlsPort, setupPort]).size !== 3) throw new Error('Service ports must be distinct.');
if (isIP(address) !== 4 || !/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(address)) throw new Error('A private LAN address is required.');
const target = `https://${address}:${tlsPort}/treasure-lab/`;
const fingerprint = new X509Certificate(readFileSync(`${directory}root.pem`)).fingerprint256;
const page = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Campus Quest LAN setup</title><body><main><h1>Campus Quest LAN setup</h1>
<p>Connect this phone and the computer to the same local network. No external relay is used.</p>
<ol><li><a href="/campus-quest-root.cer">Download the development certificate</a>.</li>
<li>On iPhone, open Settings → General → VPN &amp; Device Management and install the downloaded certificate profile.</li>
<li>Open Settings → General → About → Certificate Trust Settings. Enable trust for <b>Campus Quest LAN Development CA</b>.</li>
<li><a href="${target}">Open the HTTPS treasure test</a>. It must open without a certificate warning before requesting location or camera access.</li></ol>
<p>This root trusts certificates signed by the development key on your computer. Keep that key private and remove the certificate profile after testing. The server certificate lasts 7 days; the development root lasts 30 days.</p>
<p>Development root SHA-256 fingerprint: <code>${fingerprint.replaceAll(':', ':<wbr>')}</code></p>
<p>Installing and trusting the profile is your choice and must be done by you. No trust settings are changed automatically. Do not bypass a Safari security warning.</p>
<p><a href="https://support.apple.com/en-gb/102390">Apple certificate trust instructions</a></p></main></body></html>`;

export function certificateResponse(path, method = 'GET') {
  if (!['GET','HEAD'].includes(method)) return { status: 405, type: 'text/plain', body: 'Method not allowed.' };
  if (path === '/') return { status: 200, type: 'text/html; charset=utf-8', body: page };
  if (path === '/campus-quest-root.cer') return { status: 200, type: 'application/x-x509-ca-cert', body: readFileSync(`${directory}campus-quest-root.cer`) };
  return { status: 404, type: 'text/plain', body: 'Not found.' };
}

const bootstrap = http.createServer((request, response) => {
  let path;
  try { path = new URL(request.url, 'http://localhost').pathname; }
  catch { response.writeHead(400); response.end('Invalid request path.'); return; }
  const result = certificateResponse(path, request.method);
  response.writeHead(result.status, { 'Content-Type': result.type, 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'" });
  response.end(request.method === 'HEAD' ? '' : result.body);
});
const proxy = https.createServer({ key: readFileSync(`${directory}server.key`), cert: readFileSync(`${directory}server.pem`),
  minVersion: 'TLSv1.2' }, (request, response) => {
  // Pin the destination; clients cannot choose a proxy target or access a file path.
  const upstream = http.request({ hostname: '127.0.0.1', port: backendPort, path: request.url, method: request.method,
    headers: { ...request.headers, host: `127.0.0.1:${backendPort}`, 'x-forwarded-for': request.socket.remoteAddress } }, reply => {
    response.writeHead(reply.statusCode, reply.headers); reply.pipe(response);
  });
  const guideRequest=request.method==='POST'&&request.url?.split('?')[0]==='/api/guide';
  upstream.setTimeout(guideRequest?30000:15000, () => upstream.destroy());
  upstream.on('error', () => {
    if (response.writableEnded) return;
    if (response.headersSent) { response.destroy(); return; }
    if (!response.headersSent) response.writeHead(502, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' });
    response.end('Computer backend unavailable. Start npm start with the LAN PUBLIC_ORIGIN.');
  });
  request.on('aborted', () => upstream.destroy()); request.on('error', () => upstream.destroy()); request.pipe(upstream);
});
proxy.requestTimeout = 15000; proxy.headersTimeout = 10000;
bootstrap.listen(setupPort, address, () => console.log(`LAN certificate setup: http://${address}:${setupPort}/`));
proxy.listen(tlsPort, address, () => console.log(`LAN HTTPS app: ${target}`));
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => {
  proxy.close(); bootstrap.close(); setTimeout(() => process.exit(0), 100).unref();
});
