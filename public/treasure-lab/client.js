export class RemoteTreasureSession {
  constructor({ request = (...args) => fetch(...args), now = () => Date.now() } = {}) {
    this.request = request; this.now = now; this.connected = false; this.active = false; this.online = false;
    this.data = null; this.fix = null; this.zone = null; this.phase = 'unplaced'; this.collectionCount = 0;
    this.events = []; this.lastError = ''; this.busy = false; this.epoch = 0; this.tail = Promise.resolve(); this.receivedAt = 0;
    this.account = null; this.accountRooms = []; this.authCsrf = '';
  }
  log(event, now) { this.events.push({ at: new Date(now).toISOString(), event }); if (this.events.length > 100) this.events.shift(); }
  clearDwell() {} // Dwell is evaluated by the server, never advanced by rendering.
  async send(path, body, { apply = true, epoch = this.epoch } = {}) {
    const payload = body === undefined || path.startsWith('/api/auth/') || path.startsWith('/api/rooms')
      ? body : { ...body, roomCode: this.data?.room.code };
    const execute = async () => {
      const abort = new AbortController(), timeout = setTimeout(() => abort.abort(), 8000);
      try {
        const response = await this.request(path, { method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', ...((this.authCsrf || this.data?.csrfToken) ? { 'X-CSRF-Token': this.authCsrf || this.data.csrfToken } : {}) },
          ...(body === undefined ? {} : { body: JSON.stringify(payload) }), signal: abort.signal,
          ...(path === '/api/location/stop' ? { keepalive: true } : {}) });
        const data = await response.json();
        if (!response.ok) {
          const error = new Error(data.error?.message || 'Server request failed.'); error.status = response.status; error.code = data.error?.code; throw error;
        }
        if (epoch === this.epoch && apply) this.apply(data);
        return data;
      } catch (error) {
        if (epoch === this.epoch) {
          this.lastError = error.name === 'AbortError' ? 'Server timed out. Collection is paused.' : error.message;
          if (error.code !== 'INVALID_CREDENTIALS') this.online = false;
          if (error.status === 401 && error.code !== 'INVALID_CREDENTIALS') {
            this.resetGame(); this.account = null; this.accountRooms = []; this.authCsrf = '';
          }
        }
        throw error;
      } finally { clearTimeout(timeout); }
    };
    const result = this.tail.then(execute); this.tail = result.catch(() => {}); return result;
  }
  apply(data) {
    if ('account' in data) {
      this.account = data.account; this.accountRooms = data.rooms; this.authCsrf = data.csrfToken || ''; this.lastError = '';
    }
    if (!data.room) return;
    if (this.data && (this.data.room.code !== data.room.code || this.data.player.id !== data.player.id)) this.active = false;
    if (this.data?.room.treasureId !== data.room.treasureId || this.data?.player.id !== data.player.id) this.fix = null;
    this.data = data; this.receivedAt = this.now(); this.online = true; this.connected = true; this.lastError = '';
    this.phase = data.state.phase; this.collectionCount = data.report.collectionCount;
    this.zone = data.room.placed ? { radius: data.room.radius } : null;
  }
  resetGame() {
    this.connected = false; this.online = false; this.active = false; this.data = null; this.fix = null;
    this.zone = null; this.phase = 'unplaced'; this.collectionCount = 0;
  }
  async resume() {
    this.busy = true;
    try {
      const auth = await this.send('/api/auth/session');
      if (!auth.account || auth.activeRoom) await this.send('/api/state');
    } catch (error) { if (error.code === 'SESSION_REQUIRED') this.lastError = ''; }
    finally { this.busy = false; }
  }
  async authenticate(action, username, password) {
    if (this.busy) return false;
    this.busy = true; this.epoch++; this.active = false; this.fix = null;
    try {
      const data = await this.send(`/api/auth/${action}`, { username, password }, { apply: false });
      this.resetGame(); this.apply(data);
      if (data.activeRoom) await this.send('/api/state');
      return true;
    } catch { return false; } finally { this.busy = false; }
  }
  async logout() {
    if (this.busy) return false;
    this.busy = true; this.epoch++; this.active = false; this.fix = null;
    try { await this.send('/api/auth/logout', {}); this.resetGame(); return true; }
    catch { return false; } finally { this.busy = false; }
  }
  async connect(name, code = '') {
    if (this.busy) return false;
    this.busy = true; this.epoch++; this.active = false; this.fix = null;
    try {
      await this.send(code ? '/api/rooms/join' : '/api/rooms', { name, ...(code ? { code } : {}) });
      if (this.account) await this.send('/api/auth/session');
      return true;
    }
    catch { return false; } finally { this.busy = false; }
  }
  start(now) { this.active = true; this.log('location-sharing-started', now); }
  stop(now) {
    this.active = false; this.fix = null; this.epoch++; this.log('location-sharing-stopped', now);
    if (this.connected) this.send('/api/location/stop', {}).catch(() => {});
  }
  async receive(fix) {
    if (!this.connected || !this.active || this.sendingLocation) return false;
    this.sendingLocation = true;
    const epoch = this.epoch, treasureId = this.data.room.treasureId;
    try {
      const data = await this.send('/api/location', { fix, treasureId }, { epoch });
      if (epoch === this.epoch && this.active && data.accepted) this.fix = { ...fix };
      return epoch === this.epoch && Boolean(data.accepted);
    } catch { return false; } finally { this.sendingLocation = false; }
  }
  async place(radius) {
    if (!this.connected) return false;
    this.busy = true;
    try { await this.send('/api/treasure', { radius, treasureId: this.data.room.treasureId }); return true; }
    catch { return false; } finally { this.busy = false; }
  }
  async collect() {
    if (!this.snapshot(this.now()).eligible) return false;
    this.busy = true;
    try { await this.send('/api/collect', { treasureId: this.data.room.treasureId, cameraLive: true }); return true; }
    catch { return false; } finally { this.busy = false; }
  }
  async refresh() {
    if (!this.connected || this.busy || this.polling) return;
    this.polling = true;
    try { await this.send('/api/state'); } catch {} finally { this.polling = false; }
  }
  snapshot(now) {
    const reading = this.data?.state || { kind: 'stopped', distance: null, phase: this.phase, canPlace: false, eligible: false };
    const expired = now - this.receivedAt > (reading.expiresInMs || 0);
    const paused = !this.connected || !this.online || !this.active;
    return { ...reading, phase: this.phase,
      kind: paused ? 'stopped' : expired && this.data?.report.location.running ? 'stale' : reading.kind,
      eligible: !paused && !expired && !this.busy && reading.eligible,
      canPlace: !paused && !expired && !this.busy && reading.canPlace };
  }
  report(now) {
    return { ...(this.data?.report || {}), source: 'computer-backend', phase: this.phase, collectionCount: this.collectionCount,
      roomCode: this.data?.room.code ?? null, playerId: this.data?.player.id ?? null,
      receipt: this.data?.receipt ?? null, serverOnline: this.online,
      location: { ...(this.data?.report.location || {}), classification: this.snapshot(now).kind },
      cameraEvents: this.events.map(event => ({ ...event })) };
  }
}
