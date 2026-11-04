import { timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ApiError } from './store.mjs';
import { CampusGuide } from './guide.mjs';

const publicRoot = fileURLToPath(new URL('../public/', import.meta.url));
const files = new Map();
for (const [folder, names] of Object.entries({ 'treasure-lab': ['index.html','app.js','model.js','client.js','ar.js','guide.js','style.css'],
  'device-check': ['index.html','probe.js','measurements.js','style.css'] })) {
  for (const name of names) files.set(`/${folder}/${name}`, `${publicRoot}${folder}/${name}`);
  files.set(`/${folder}/`, `${publicRoot}${folder}/index.html`);
}
const equal = (a, b) => typeof a === 'string' && typeof b === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b)
  && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export function createApplication({ store, publicOrigin = '', localPort = 4180, guide = new CampusGuide() }) {
  const allowed = new Set([`http://127.0.0.1:${localPort}`, `http://localhost:${localPort}`]);
  if (publicOrigin) {
    const origin = new URL(publicOrigin);
    if (origin.protocol !== 'https:' || origin.origin !== publicOrigin) throw new Error('PUBLIC_ORIGIN must be an HTTPS origin without a path.');
    allowed.add(publicOrigin);
  }
  const limits = new Map();
  const rate = (key, maximum, period) => {
    const now = store.now();
    for (const [id, bucket] of limits) if (now - bucket.since >= bucket.period) limits.delete(id);
    const bucket = limits.get(key);
    if (bucket && bucket.count >= maximum) throw new ApiError(429, 'RATE_LIMIT', 'Too many attempts. Please wait before retrying.');
    if (bucket) bucket.count++;
    else limits.set(key, { since: now, count: 1, period });
  };
  return function handle({ method = 'GET', path = '/', headers = {}, body = {}, clientKey = 'local' }) {
    const base = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
      'Permissions-Policy': 'camera=(self), microphone=(), geolocation=(self), accelerometer=(self), gyroscope=(self), magnetometer=(self)' };
    const json = (status, data, extra = {}) => ({ status, headers: { ...base, 'Content-Type': 'application/json; charset=utf-8', ...extra }, body: JSON.stringify(data) });
    const errorResponse = error => json(error.authBusy ? 429 : error instanceof ApiError ? error.status : 500,
      { error: { code: error.authBusy ? 'AUTH_BUSY' : error instanceof ApiError ? error.code : 'SERVER_ERROR',
        message: error.authBusy ? error.message : error instanceof ApiError ? error.message : 'Server request failed.' } });
    const cookie = (name, token = '', age = 86400) => `${name}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${(headers.origin || publicOrigin).startsWith('https:') ? '; Secure' : ''}`;
    const tokenFor = name => new RegExp(`(?:^|;\\s*)${name}=([^;]*)`).exec(headers.cookie || '')?.[1];
    const checkCsrf = csrf => { if (!equal(headers['x-csrf-token'], csrf)) throw new ApiError(403, 'CSRF_REQUIRED', 'Refresh the page before continuing.'); };
    try {
      if (path === '/api/health' && method === 'GET') return json(200, { ok: true, service: 'campus-quest', version: 1 });
      if (!path.startsWith('/api/')) {
        if (!['GET','HEAD'].includes(method)) return json(405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed.' } });
        if (['/','/treasure-lab','/device-check'].includes(path)) return { status: 308, headers: { ...base, Location: path === '/' ? '/treasure-lab/' : `${path}/` }, body: '' };
        const file = files.get(path);
        if (!file) throw new ApiError(404, 'NOT_FOUND', 'Not found.');
        const content = readFileSync(file), type = file.endsWith('.html') ? 'text/html' : file.endsWith('.css') ? 'text/css' : 'text/javascript';
        return { status: 200, headers: { ...base, 'Content-Type': `${type}; charset=utf-8`, 'Content-Length': content.length }, body: method === 'HEAD' ? '' : content };
      }
      if (method !== 'GET' && method !== 'POST') throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed.');
      if (headers['sec-fetch-site'] === 'cross-site') throw new ApiError(403, 'ORIGIN_REJECTED', 'Use the test page on this server.');
      if (method === 'POST') {
        if (!allowed.has(headers.origin)) throw new ApiError(403, 'ORIGIN_REJECTED', 'This page origin is not enabled on the server.');
        if (!/^application\/json(?:\s*;|$)/i.test(headers['content-type'] || '')) throw new ApiError(415, 'JSON_REQUIRED', 'Send application/json.');
        if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ApiError(400, 'INVALID_JSON', 'Send a JSON object.');
      }
      if (path.startsWith('/api/auth/')) {
        const accountToken = tokenFor('cq_account');
        let session = null;
        try { session = store.accountContext(accountToken); }
        catch (error) { if (method !== 'POST' || !['/api/auth/login','/api/auth/register','/api/auth/logout'].includes(path)) throw error; }
        if (method === 'GET' && path === '/api/auth/session') return json(200, session ? store.accountView(session) : { account: null, rooms: [], activeRoom: null });
        if (method !== 'POST') throw new ApiError(404, 'NOT_FOUND', 'API route not found.');
        if (session) checkCsrf(session.csrf);
        if (path === '/api/auth/logout') {
          if (session) store.logout(session);
          try { store.stop(store.player(tokenFor('cq_session'))); } catch (error) { if (!(error instanceof ApiError)) throw error; }
          return json(200, { account: null, rooms: [], activeRoom: null }, { 'Set-Cookie': [cookie('cq_account','',0), cookie('cq_session','',0)] });
        }
        if (!['/api/auth/register','/api/auth/login'].includes(path)) throw new ApiError(404, 'NOT_FOUND', 'API route not found.');
        if (session) throw new ApiError(409, 'ALREADY_SIGNED_IN', 'Sign out before changing accounts.');
        rate(`auth-ip:${clientKey}`, 20, 900000);
        const username = store.username(body.username);
        rate(`auth-user:${username}`, 8, 900000);
        let guest = null;
        if (path === '/api/auth/register' && tokenFor('cq_session')) {
          try { guest = store.player(tokenFor('cq_session')); } catch (error) { if (error.status !== 401) throw error; }
          if (guest) checkCsrf(guest.csrf);
        }
        // Password work is asynchronous; the surrounding synchronous API remains usable.
        return (async () => {
          const result = path === '/api/auth/register' ? await store.register(body, guest) : await store.login(body);
          if (path === '/api/auth/login') {
            try { store.stop(store.player(tokenFor('cq_session'))); } catch (error) { if (!(error instanceof ApiError)) throw error; }
          }
          return json(path === '/api/auth/register' ? 201 : 200, store.accountView(result.session),
            { 'Set-Cookie': [cookie('cq_account', result.token), cookie('cq_session','',0)] });
        })().catch(errorResponse);
      }
      const account = store.accountContext(tokenFor('cq_account'));
      if (method === 'POST' && ['/api/rooms','/api/rooms/join'].includes(path)) {
        rate(`room:${clientKey}`, 20, 60000);
        if (account) {
          checkCsrf(account.csrf);
          const player = store.accountRoom(account, path === '/api/rooms' ? null : body.code);
          return json(201, store.state(player));
        }
        const result = path === '/api/rooms' ? store.create(body.name) : store.join(body.code, body.name);
        return json(201, store.state(result.player), { 'Set-Cookie': cookie('cq_session',result.token) });
      }
      const player = account ? store.accountPlayer(account) : store.player(tokenFor('cq_session'));
      if (method === 'GET' && path === '/api/state') return json(200, store.state(player));
      if (method === 'GET' && path === '/api/guide') return json(200, guide.read(store,player));
      if (method !== 'POST') throw new ApiError(404, 'NOT_FOUND', 'API route not found.');
      checkCsrf(player.csrf);
      if ((account || body.roomCode !== undefined) && body.roomCode !== player.room) {
        throw new ApiError(409, 'ROOM_CHANGED', 'The active room changed. Refresh before continuing.');
      }
      if (path === '/api/guide') {
        store.expected(store.room(player.room),body.treasureId);
        rate(`guide:${player.gateKey||player.id}`,20,60000);
        return guide.chat(store,player,body,()=>{
          const latestAccount=store.accountContext(tokenFor('cq_account'));
          const latest=latestAccount?store.accountPlayer(latestAccount):store.player(tokenFor('cq_session'));
          if(latest.room!==player.room||latest.id!==player.id)throw new ApiError(409,'ROOM_CHANGED','The active room changed. Ask again.');
          store.expected(store.room(player.room),body.treasureId);
        }).then(data=>json(200,data)).catch(errorResponse);
      }
      let extra = {};
      if (path === '/api/location') extra.accepted = store.location(player, body);
      else if (path === '/api/aim') extra.accepted = store.aim(player, body);
      else if (path === '/api/location/stop') store.stop(player);
      else if (path === '/api/treasure') store.place(player, body);
      else if (path === '/api/collect') extra.collection = store.collect(player, body);
      else throw new ApiError(404, 'NOT_FOUND', 'API route not found.');
      return json(200, { ...store.state(player), ...extra });
    } catch (error) {
      return errorResponse(error);
    }
  };
}
