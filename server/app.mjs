import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ApiError } from './store.mjs';
import { CampusGuide } from './guide.mjs';
import { normalizeRoomCode } from '../public/treasure-lab/model.js';
import { validRoninBatch } from '../public/treasure-lab/ronin.js';

const publicRoot = fileURLToPath(new URL('../public/', import.meta.url));
const files = new Map();
for (const [folder, names] of Object.entries({ 'treasure-lab': ['index.html','app.js','model.js','client.js','ar.js','guide.js','tutorials.js','indoor.js','ronin.js','style.css','motion-recording.html','motion-recording.js'],
  'device-check': ['index.html','probe.js','measurements.js','style.css'] })) {
  for (const name of names) files.set(`/${folder}/${name}`, `${publicRoot}${folder}/${name}`);
  files.set(`/${folder}/`, `${publicRoot}${folder}/index.html`);
}
const equal = (a, b) => typeof a === 'string' && typeof b === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b)
  && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const signedOut = { account: null, activeRoom: null };

export function createApplication({ store, publicOrigin = '', localPort = 4180, guide = new CampusGuide(), ronin }) {
  const allowed = new Set([`http://127.0.0.1:${localPort}`, `http://localhost:${localPort}`]);
  if (publicOrigin) {
    const origin = new URL(publicOrigin);
    if (origin.protocol !== 'https:' || origin.origin !== publicOrigin) throw new Error('PUBLIC_ORIGIN must be an HTTPS origin without a path.');
    allowed.add(publicOrigin);
  }
  const requireRonin = (player, room) => {
    if (player.id !== room.owner_id) throw new ApiError(403, 'OWNER_REQUIRED', 'RoNIN uses the host phone.');
    if (!ronin?.available) {
      throw new ApiError(503, 'RONIN_UNAVAILABLE', 'Indoor tracking is currently unavailable. Please try again later.');
    }
  };
  const limits = new Map();
  const guideSecret = randomBytes(32);
  const visitorGuideKey = token => createHmac('sha256', guideSecret).update(token).digest('base64url');
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
    const leaveRoom = (player, options) => {
      if (body.roomCode !== player.room) throw new ApiError(409, 'ROOM_CHANGED', 'The active room changed. Refresh before continuing.');
      if (store.leaveRoom(player, body.treasureId, options)) guide.clearRoom(player.room);
    };
    try {
      if (path === '/api/health' && method === 'GET') return json(200, { ok: true, service: 'campus-quest', version: 1 });
      if (!path.startsWith('/api/')) {
        if (!['GET','HEAD'].includes(method)) return json(405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed.' } });
        if (['/','/treasure-lab','/device-check'].includes(path)) return { status: 308, headers: { ...base, Location: path === '/' ? '/treasure-lab/' : `${path}/` }, body: '' };
        const file = files.get(path);
        if (!file) throw new ApiError(404, 'NOT_FOUND', 'Not found.');
        const content = readFileSync(file), type = file.endsWith('.html') ? 'text/html' : file.endsWith('.css') ? 'text/css' : 'text/javascript';
        const staticHeaders = { ...base, 'Content-Type': `${type}; charset=utf-8`, 'Content-Length': content.length };
        if (path === '/treasure-lab/motion-recording.html') {
          staticHeaders['Content-Security-Policy'] = base['Content-Security-Policy'].replace("connect-src 'self'", "connect-src 'none'");
          staticHeaders['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=(), accelerometer=(self), gyroscope=(self), magnetometer=()';
        }
        return { status: 200, headers: staticHeaders, body: method === 'HEAD' ? '' : content };
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
        if (method === 'GET' && path === '/api/auth/session') return json(200, session ? store.accountView(session) : signedOut);
        if (method !== 'POST') throw new ApiError(404, 'NOT_FOUND', 'API route not found.');
        if (session) checkCsrf(session.csrf);
        const guest = accountToken ? null : store.findGuestPlayer(tokenFor('cq_session'));
        if (path === '/api/auth/logout') {
          const player = session ? store.findAccountPlayer(session) : guest;
          if (player) {
            if (!session) checkCsrf(player.csrf);
            leaveRoom(player, { sessionId: session?.id, signOut: Boolean(session) });
          } else if (session) store.logout(session);
          return json(200, signedOut, { 'Set-Cookie': [cookie('cq_account','',0), cookie('cq_session','',0), cookie('cq_guide','',0)] });
        }
        if (!['/api/auth/register','/api/auth/login'].includes(path)) throw new ApiError(404, 'NOT_FOUND', 'API route not found.');
        if (session) throw new ApiError(409, 'ALREADY_SIGNED_IN', 'Sign out before changing accounts.');
        rate(`auth-ip:${clientKey}`, 20, 900000);
        const username = store.username(body.username);
        rate(`auth-user:${username}`, 8, 900000);
        const registering = path === '/api/auth/register';
        if (guest) {
          if (!registering) throw new ApiError(409, 'ROOM_ALREADY_JOINED', 'Leave your room before signing in.');
          checkCsrf(guest.csrf);
        }
        // Password work is asynchronous; the surrounding synchronous API remains usable.
        return (async () => {
          const result = registering ? await store.register(body, guest) : await store.login(body);
          return json(registering ? 201 : 200, store.accountView(result.session),
            { 'Set-Cookie': [cookie('cq_account', result.token), cookie('cq_session','',0), cookie('cq_guide','',0)] });
        })().catch(errorResponse);
      }
      const account = store.accountContext(tokenFor('cq_account'));
      if (path === '/api/guide') {
        const findPlayer = session => session ? store.findAccountPlayer(session) : store.findGuestPlayer(tokenFor('cq_session'));
        const player = findPlayer(account);
        let visitorToken = tokenFor('cq_guide');
        if (!/^[A-Za-z0-9_-]{43}$/.test(visitorToken || '')) visitorToken = null;
        let extra = {};
        if (!account && !player && !visitorToken && method === 'GET') {
          visitorToken = randomBytes(32).toString('base64url');
          extra = { 'Set-Cookie': cookie('cq_guide', visitorToken) };
        }
        const visitorKey = !account && visitorToken ? visitorGuideKey(visitorToken) : null;
        const scope = account ? 'account:' + account.id : visitorKey ? 'visitor:' + visitorKey : null;
        const csrf = account?.csrf || player?.csrf || visitorKey;
        if (method === 'GET') return json(200, { ...guide.read(store, player, scope), csrfToken: csrf }, extra);
        if (!csrf) throw new ApiError(403, 'GUIDE_SESSION_REQUIRED', 'Open the guide before sending a question.');
        checkCsrf(csrf);
        if (player) {
          if ((account || body.roomCode !== undefined) && body.roomCode !== player.room) {
            throw new ApiError(409, 'ROOM_CHANGED', 'The active room changed. Ask again.');
          }
          store.expected(store.room(player.room), body.treasureId);
        } else if (body.roomCode !== undefined || body.treasureId !== undefined) {
          throw new ApiError(409, 'ROOM_CHANGED', 'The active room changed. Ask again.');
        }
        if (!account && !player) rate('guide-visitor-ip:' + clientKey, 8, 60000);
        rate('guide:' + (scope || player.id), 20, 60000);
        return guide.chat(store, player, body, () => {
          const latest = findPlayer(store.accountContext(tokenFor('cq_account')));
          if (latest?.room !== player?.room || latest?.id !== player?.id) {
            throw new ApiError(409, 'ROOM_CHANGED', 'The active room changed. Ask again.');
          }
          if (latest) store.expected(store.room(latest.room), body.treasureId);
        }, scope).then(data => json(200, data)).catch(errorResponse);
      }
      if (method === 'GET' && path === '/api/progress') {
        if (!account) throw new ApiError(401, 'ACCOUNT_REQUIRED', 'Sign in to view the leaderboard and your treasure book.');
        return json(200, store.progress(account));
      }
      if (method === 'POST' && ['/api/rooms','/api/rooms/join'].includes(path)) {
        rate(`room:${clientKey}`, 20, 60000);
        const creating = path === '/api/rooms';
        const code = creating ? null : normalizeRoomCode(body.code);
        if (!creating && !code) throw new ApiError(404, 'ROOM_NOT_FOUND', 'Room not found. Check the code.');
        const guestToken = tokenFor('cq_session');
        const current = account ? store.findAccountPlayer(account) : store.findGuestPlayer(guestToken);
        if (account || current) checkCsrf(account?.csrf ?? current.csrf);
        if (current && current.room !== code) throw new ApiError(409, 'ROOM_ALREADY_JOINED', 'Leave your room before opening another one.');
        if (account) {
          const player = store.accountRoom(account, code);
          return json(201, store.state(player));
        }
        if (current) return json(201, store.state(store.player(guestToken)));
        const result = creating ? store.create(body.name) : store.join(code, body.name);
        return json(201, store.state(result.player), { 'Set-Cookie': cookie('cq_session',result.token) });
      }
      const player = account ? store.accountPlayer(account) : store.player(tokenFor('cq_session'));
      if (method === 'GET' && path === '/api/state') return json(200, store.state(player));
      if (method !== 'POST') throw new ApiError(404, 'NOT_FOUND', 'API route not found.');
      checkCsrf(player.csrf);
      const resetRoom = path === '/api/rooms/reset';
      if (resetRoom || path === '/api/rooms/leave') {
        leaveRoom(player, { sessionId: account?.id, resetDemo: resetRoom });
        const view = account ? store.accountView({ ...account, active_player_id: null }) : signedOut;
        return json(200, view, { 'Set-Cookie': cookie('cq_session', '', 0) });
      }
      if ((account || body.roomCode !== undefined) && body.roomCode !== player.room) {
        throw new ApiError(409, 'ROOM_CHANGED', 'The active room changed. Refresh before continuing.');
      }
      if (path === '/api/ronin') {
        const room = store.room(player.room);
        requireRonin(player, room);
        if (room.mode !== 'indoor-ronin') throw new ApiError(409, 'MODE_CHANGED', 'Select Indoor mode to use motion tracking.');
        const batch = { frames: body.frames, startMs: body.startMs, count: body.count };
        if (!validRoninBatch(batch)) throw new ApiError(400, 'INVALID_MOTION', 'Send a complete motion window.');
        rate(`ronin:${player.gateKey || player.id}`, 8, 1000);
        return ronin.infer(batch).then(velocities => json(200, { velocities })).catch(errorResponse);
      }
      let extra = {};
      if (path === '/api/location') extra.accepted = store.location(player, body);
      else if (path === '/api/indoor') extra.accepted = store.indoor(player,body);
      else if (path === '/api/mode') {
        if (body.mode === 'indoor-ronin') requireRonin(player, store.room(player.room));
        store.setMode(player,body);
      }
      else if (path === '/api/aim') extra.accepted = store.aim(player, body);
      else if (path === '/api/location/stop') store.stop(player,body);
      else if (path === '/api/treasure') store.place(player, body);
      else if (path === '/api/collect') extra.collection = store.collect(player, body);
      else throw new ApiError(404, 'NOT_FOUND', 'API route not found.');
      return json(200, { ...store.state(player), ...extra });
    } catch (error) {
      return errorResponse(error);
    }
  };
}
