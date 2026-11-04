import { GameStore } from '../../server/store.mjs';
import { createApplication } from '../../server/app.mjs';

// All locations here are isolated synthetic test fixtures, never physical evidence.
export function backendHarness(path = ':memory:') {
  let time = 1800000000000;
  let clients = 0;
  const store = new GameStore(path, () => time);
  const handle = createApplication({ store, localPort: 4180, publicOrigin: 'https://field.example.test' });
  const h = { store, handle, now: () => time, advance: ms => { time += ms; },
    client() {
      const clientKey = `browser-${++clients}`;
      const c = { cookie: '', csrf: '', data: null,
        call(method, path, body, extra = {}) {
          if (body && c.data && !path.startsWith('/api/auth/') && !path.startsWith('/api/rooms')) body = { roomCode: c.data.room.code, ...body };
          const response = handle({ method, path, body, headers: { origin: 'http://127.0.0.1:4180',
            'content-type': 'application/json', cookie: c.cookie, 'x-csrf-token': c.csrf, ...extra }, clientKey });
          return response?.then ? response.then(c.consume) : c.consume(response);
        },
        consume(response) {
          let data; try { data = JSON.parse(response.body); } catch { data = null; }
          const cookies = new Map(c.cookie.split('; ').filter(Boolean).map(s => s.split('=')));
          for (const header of [response.headers['Set-Cookie'] || []].flat()) {
            const [name, value] = header.split(';')[0].split('=');
            if (value) cookies.set(name, value); else cookies.delete(name);
          }
          c.cookie = [...cookies].map(([name,value]) => `${name}=${value}`).join('; ');
          if (data?.csrfToken) c.csrf = data.csrfToken;
          if (data?.room) c.data = data;
          return { ...response, data };
        },
        create(name = 'Owner') { return c.call('POST', '/api/rooms', { name }); },
        join(code, name = 'Guest') { return c.call('POST', '/api/rooms/join', { code, name }); },
        fix(north = 0, accuracy = 5, timestamp = time) {
          return c.call('POST', '/api/location', { treasureId: c.data.room.treasureId,
            fix: { latitude: north / 111195, longitude: 0, accuracy, timestamp } });
        },
        place() { return c.call('POST', '/api/treasure', { radius: 30, treasureId: c.data.room.treasureId }); },
        aimAtTreasure() {
          for (let i = 0; i < 4; i++) {
            if (i) h.advance(450);
            c.call('POST', '/api/aim', { treasureId: c.data.room.treasureId, sample: {
              heading: c.data.state.guidance?.bearingDegrees ?? 180, pitch: 0, timestamp: time,
              source: 'webkit-compass', accuracy: 5, cameraLive: true, videoAgeMs: 0 } });
          }
        },
        collect() { return c.call('POST', '/api/collect', { treasureId: c.data.room.treasureId, cameraLive: true }); },
        returnToTreasure() { h.advance(1000); c.fix(65); h.advance(1000); c.fix(0); h.advance(2000); c.fix(0); } };
      return c;
    } };
  return h;
}
