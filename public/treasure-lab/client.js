import { DEFAULT_ROOM_MODE, isIndoorMode } from './indoor.js';

export class RemoteTreasureSession {
  constructor({ request = (...args) => fetch(...args), now = () => Date.now() } = {}) {
    this.request = request; this.now = now; this.connected = false; this.active = false; this.online = false;
    this.data = null; this.fix = null; this.zone = null; this.phase = 'unplaced'; this.collectionCount = 0;
    this.mode = DEFAULT_ROOM_MODE;
    this.events = []; this.lastError = ''; this.busy = false; this.epoch = 0; this.tail = Promise.resolve(); this.receivedAt = 0;
    this.account = null; this.authCsrf = ''; this.guideCsrf = '';
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
          this.invalidateSession(error.status, error.code);
        }
        throw error;
      } finally { clearTimeout(timeout); }
    };
    const result = this.tail.then(execute); this.tail = result.catch(() => {}); return result;
  }
  apply(data) {
    if ('account' in data) {
      if (this.account?.id !== data.account?.id) this.guideCsrf = '';
      this.account = data.account; this.authCsrf = data.csrfToken || ''; this.lastError = '';
    }
    if (!data.room) return;
    if(this.data&&this.data.room.mode!==data.room.mode){this.active=false;this.epoch++;this.gpsLost=false;}
    if (this.data && (this.data.room.code !== data.room.code || this.data.player.id !== data.player.id)) this.active = false;
    if (this.data?.room.treasureId !== data.room.treasureId || this.data?.player.id !== data.player.id) this.fix = null;
    this.data = data; this.receivedAt = this.now(); this.online = true; this.connected = true; this.lastError = '';
    this.phase = data.state.phase; this.collectionCount = data.report.collectionCount;
    this.mode=data.room.mode||'gps';this.zone = data.room.placed ? { radius: data.room.radius,kind:this.mode } : null;
  }
  resetGame() {
    this.epoch++;
    this.connected = false; this.online = false; this.active = false; this.data = null; this.fix = null;
    this.zone = null; this.phase = 'unplaced'; this.collectionCount = 0;
    this.mode = DEFAULT_ROOM_MODE; this.gpsLost = false; this.receivedAt = 0; this.events.length = 0;
  }
  invalidateSession(status, code) {
    if (status === 401 && code !== 'INVALID_CREDENTIALS') {
      this.account = null; this.authCsrf = ''; this.guideCsrf = '';
    } else if (code !== 'ROOM_REQUIRED' || !this.connected) return false;
    this.resetGame();
    return true;
  }
  async resume() {
    this.busy = true;
    try {
      const auth = await this.send('/api/auth/session');
      if (!auth.account || auth.activeRoom) await this.send('/api/state');
      else if (this.connected) this.resetGame();
    } catch (error) {
      if (error.code === 'SESSION_REQUIRED' || error.code === 'ROOM_REQUIRED') this.lastError = '';
    }
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
  async logout(target = {}) {
    if (this.busy) return false;
    const room = this.data?.room;
    const body = room ? { roomCode: room.code, treasureId: room.treasureId, ...target } : target;
    this.busy = true;
    try {
      const view = await this.send('/api/auth/logout', body, { apply: false });
      this.resetGame();
      this.apply(view);
      return true;
    } catch { return false; } finally { this.busy = false; }
  }
  async connect(name, code = '') {
    if (this.busy) return false;
    this.busy = true; this.epoch++; this.active = false; this.fix = null;
    try {
      await this.send(code ? '/api/rooms/join' : '/api/rooms', { name, ...(code ? { code } : {}) });
      return true;
    }
    catch { return false; } finally { this.busy = false; }
  }
  async resetDemo({ roomCode, treasureId }) {
    if (this.data?.player.role !== 'owner') return false;
    return this.leaveRoom({ roomCode, treasureId }, { resetDemo: true });
  }
  async leaveRoom({ roomCode, treasureId }, { resetDemo = false } = {}) {
    if (!this.connected || this.busy) return false;
    this.busy = true;
    try {
      const view = await this.send(resetDemo ? '/api/rooms/reset' : '/api/rooms/leave', { roomCode, treasureId }, { apply: false });
      this.resetGame();
      this.apply(view);
      return true;
    } catch { return false; } finally { this.busy = false; }
  }
  start(now) { this.active = true; this.log('location-sharing-started', now); }
  loseLocation(now) {
    this.fix = null; this.gpsLost = true; this.epoch++; this.log('location-interrupted', now);
    if (this.connected) this.send('/api/location/stop', { transient: true }).catch(() => {});
  }
  stop(now) {
    this.active = false; this.fix = null; this.epoch++; this.log('location-sharing-stopped', now);
    if (this.connected) this.send('/api/location/stop', {}).catch(() => {});
  }
  async setMode(mode){
    if(!this.connected||this.busy)return false;
    this.busy=true;this.epoch++;this.active=false;this.fix=null;
    try{await this.send('/api/mode',{mode,treasureId:this.data.room.treasureId});this.gpsLost=false;return true;}catch{return false;}finally{this.busy=false;}
  }
  async receiveIndoor(fix){
    if(!this.connected||!this.active||this.sendingIndoor)return false;
    this.sendingIndoor=true;const epoch=this.epoch;
    try{const data=await this.send('/api/indoor',{fix,treasureId:this.data.room.treasureId},{epoch});return epoch===this.epoch&&this.active&&Boolean(data.accepted);}catch{return false;}finally{this.sendingIndoor=false;}
  }
  async inferRonin(batch, signal) {
    if (!this.active || this.mode !== 'indoor-ronin' || !this.data || signal.aborted) return null;
    const epoch = this.epoch, roomCode = this.data.room.code;
    // Model requests run separately from aim, stop and room changes.
    const response = await this.request('/api/ronin', { method: 'POST', credentials: 'same-origin', signal,
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': this.authCsrf || this.data.csrfToken },
      body: JSON.stringify({ ...batch, roomCode }) });
    if (signal.aborted || epoch !== this.epoch || !this.active || roomCode !== this.data?.room.code) return null;
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(data?.error?.message || 'The motion model is unavailable.');
      error.status = response.status;
      throw error;
    }
    return data?.velocities;
  }
  async receive(fix) {
    if (!this.connected || !this.active || this.sendingLocation) return false;
    this.sendingLocation = true;
    const epoch = this.epoch, treasureId = this.data.room.treasureId;
    try {
      const data = await this.send('/api/location', { fix, treasureId }, { epoch });
      if (epoch === this.epoch && this.active && data.accepted) { this.fix = { ...fix }; this.gpsLost = false; }
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
    if (!this.snapshot(this.now()).canClaim) return false;
    this.busy = true;
    try { await this.send('/api/collect', { treasureId: this.data.room.treasureId, cameraLive: true }); return true; }
    catch { return false; } finally { this.busy = false; }
  }
  async aim(sample) {
    if (!this.connected || (sample !== null && (!this.active || this.sendingAim))) return false;
    if (sample !== null) this.sendingAim = true;
    const epoch = this.epoch;
    try {
      const data = await this.send('/api/aim', { sample, treasureId: this.data.room.treasureId }, { epoch });
      return epoch === this.epoch && this.active && Boolean(data.accepted);
    } catch { return false; } finally { if (sample !== null) this.sendingAim = false; }
  }
  cancelEncounter(now, id = this.data?.state.nearField?.id) {
    if (!this.connected || !id) return;
    this.log('near-search-cancelled',now);
    return this.send('/api/aim',{sample:null,cancelEncounter:true,encounterId:id,treasureId:this.data.room.treasureId}).catch(()=>{});
  }
  async refresh() {
    if (!this.connected || this.busy || this.polling) return;
    this.polling = true;
    try { await this.send('/api/state'); } catch {} finally { this.polling = false; }
  }
  progress() {
    return this.send('/api/progress', undefined, { apply: false });
  }
  async guideRequest(body, signal) {
    const epoch = this.epoch, room = this.data?.room;
    const current = () => !signal?.aborted && epoch === this.epoch
      && this.data?.room.code === room?.code && this.data?.room.treasureId === room?.treasureId;
    const csrf = () => this.authCsrf || this.data?.csrfToken || this.guideCsrf;
    // Wait for an already queued GPS stop, but never put slow AI calls on the game queue.
    await this.tail;
    if (!current()) return null;
    const abort=new AbortController(),cancel=()=>abort.abort(),timeout=setTimeout(cancel,25000);
    signal?.addEventListener('abort',cancel,{once:true});
    const send = async payload => {
      const response = await this.request('/api/guide', { method: payload ? 'POST' : 'GET', credentials: 'same-origin', signal: abort.signal,
        headers: { 'Content-Type': 'application/json', ...(csrf() ? { 'X-CSRF-Token': csrf() } : {}) },
        ...(payload ? { body: JSON.stringify(payload) } : {}) });
      const data = await response.json().catch(() => null);
      if (!current()) return null;
      if (!response.ok || !data) {
        const code = data?.error?.code;
        if (code === 'GUIDE_SESSION_REQUIRED' || code === 'CSRF_REQUIRED') this.guideCsrf = '';
        if (this.invalidateSession(response.status, code)) this.lastError = data?.error?.message || 'Open the guide again to continue.';
        throw new Error(data?.error?.message || 'The guide is unavailable. Try again.');
      }
      if (!room && !this.account && data.csrfToken) this.guideCsrf = data.csrfToken;
      return data;
    };
    try {
      if (body && !csrf() && !(await send())) return null;
      if (!current()) return null;
      return await send(body && { ...body, ...(room ? { roomCode: room.code, treasureId: room.treasureId } : {}) });
    } catch(error) {
      if(abort.signal.aborted&&!signal?.aborted)throw new Error('The guide timed out. Please try again.');
      throw error;
    } finally {clearTimeout(timeout);signal?.removeEventListener('abort',cancel);}
  }
  snapshot(now) {
    const reading = this.data?.state || { kind: 'stopped', distance: null, phase: this.phase, canPlace: false, eligible: false };
    const expired = now - this.receivedAt > (reading.expiresInMs || 0);
    const paused = !this.connected || !this.online || !this.active;
    const unavailable = paused || (this.gpsLost && !reading.nearField);
    return { ...reading, phase: this.phase,nearField:!unavailable&&!expired?reading.nearField:null,
      kind: paused ? 'stopped' : this.gpsLost ? 'waiting' : expired && (this.data?.report.location.running || isIndoorMode(this.mode)) ? 'stale' : reading.kind,
      eligible: !unavailable && !expired && !this.busy && reading.eligible,
      canNavigate: !unavailable && !expired && reading.canNavigate,
      guidance: !unavailable && !expired ? reading.guidance : null,
      canClaim: !unavailable && !expired && !this.busy && reading.canClaim && now - this.receivedAt <= (reading.aim?.expiresInMs || 0),
      canPlace: !unavailable && !expired && !this.busy && reading.canPlace };
  }
  report(now) {
    return { ...(this.data?.report || {}), source: 'computer-backend', phase: this.phase, collectionCount: this.collectionCount,
      roomCode: this.data?.room.code ?? null, playerId: this.data?.player.id ?? null,
      receipt: this.data?.receipt ?? null, serverOnline: this.online,
      location: { ...(this.data?.report.location || {}), classification: this.snapshot(now).kind },
      cameraEvents: this.events.map(event => ({ ...event })) };
  }
}
