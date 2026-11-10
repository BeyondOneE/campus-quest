import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GameStore } from '../server/store.mjs';
import { CampusGuide, validateGuideConfig, retrieveGuideFacts, guideDistanceLabel } from '../server/guide.mjs';
import { createApplication } from '../server/app.mjs';
import { backendHarness } from './helpers/backend-harness.mjs';
import { harness, cameraStream } from './helpers/treasure-harness.mjs';
import { mountGuide } from '../public/treasure-lab/guide.js';
import { availableTutorials, mountTutorials, tutorials, tutorialStep } from '../public/treasure-lab/tutorials.js';
import { RemoteTreasureSession } from '../public/treasure-lab/client.js';

// Isolated fixtures only; these are not real campus coordinates or live provider replies.
const config=()=>JSON.parse(readFileSync(new URL('../server/guide-config.json',import.meta.url)));
function setup(options={}){
  const h=backendHarness(),c=h.client();c.createOutdoor();c.fix();c.place();c.returnToTreasure();
  const content=config();content.places=[{id:'fixture-building',name:'Fixture Hall',latitude:0,longitude:0,radius:60,description:'A verified isolated test building.',courses:[{name:'Fixture course',description:'A course fixture.'}]}];
  const guide=new CampusGuide({loadConfig:()=>content,now:h.now,diagnostic:()=>{},...options});
  const handle=createApplication({store:h.store,guide});
  const call=async(body,headers={})=>{
    const r=await handle({method:body?'POST':'GET',path:'/api/guide',body:body?{roomCode:c.data.room.code,treasureId:c.data.room.treasureId,...body}:undefined,
      headers:{cookie:c.cookie,origin:'http://127.0.0.1:4180','content-type':'application/json','x-csrf-token':c.csrf,...headers}});
    return {status:r.status,data:JSON.parse(r.body)};
  };
  return {h,c,content,guide,handle,call};
}
const reply=(text,tutorialId)=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify({reply:text,tutorialId})}}]}),{status:200,headers:{'Content-Type':'application/json'}});
const blankReply=()=>Response.json({choices:[{finish_reason:'stop',message:{content:'   '}}]});

test('3 m remains the departure threshold while a locked nearby encounter survives crossing it',async()=>{
  const h=backendHarness(),c=h.client();
  try{
    c.createOutdoor();c.fix();c.call('POST','/api/treasure',{radius:3,treasureId:c.data.room.treasureId});
    h.advance(100);c.fix(2.9);assert.equal(c.data.state.canNavigate,false);
    h.advance(100);c.fix(3.1);assert.equal(c.data.state.canNavigate,true);assert.equal(c.data.state.eligible,false);
    h.advance(100);c.fix(2.9);h.advance(2000);c.fix(2.9);
    assert.equal(c.data.state.eligible,true);assert.ok(c.data.state.guidance);
    h.advance(100);c.fix(3.1);assert.equal(c.data.state.eligible,true);
    const html=readFileSync(new URL('../public/treasure-lab/index.html',import.meta.url),'utf8');
    assert.match(html,/id="radius"[^>]*min="3"[^>]*value="3"/);
  }finally{h.store.close();}
});

test('small-range camera survives GPS interruption but stop and new rounds still release hardware',async()=>{
  const stream=cameraStream(),h=harness({getUserMedia:()=>Promise.resolve(stream)});
  h.node('radius').value='3';h.click('start-location');h.fix();h.click('place');h.advance(1000);h.fix({north:3.2});
  await h.click('start-camera');h.frame();h.direction();h.geoError(2);
  assert.equal(stream.stops,0);assert.equal(h.node('gps-spinner').hidden,false);assert.equal(h.node('claim').disabled,true);
  h.advance(100);h.fix();h.advance(2000);h.fix();h.frame();h.direction();assert.equal(h.node('gps-spinner').hidden,true);
  h.click('place');assert.equal(stream.stops,1);assert.equal(h.directionListening,false);
});

test('guide uses fresh verified places / courses and exact server distance; pauses facts when GPS is gone',async()=>{
  const t=setup();try{
    let r=await t.call();assert.equal(r.data.context.place.name,'Fixture Hall');assert.equal(r.data.providerConfigured,false);
    r=await t.call({message:'How far is the treasure?'});assert.match(r.data.messages.at(-1).text,/few metres/);assert.equal(r.data.messages.at(-1).source,'preset');
    r=await t.call({event:'arrival'});assert.match(r.data.messages.at(-1).text,/Fixture course/);
    const count=r.data.messages.length;r=await t.call({event:'arrival'});assert.equal(r.data.accepted,false);assert.equal(r.data.messages.length,count);
    t.c.call('POST','/api/location/stop',{});r=await t.call({message:'How far is the treasure?'});assert.equal(r.data.context.distanceMeters,null);assert.equal(r.data.context.place,null);assert.match(r.data.messages.at(-1).text,/GPS.*reconnect/i);
  }finally{t.h.store.close();}
});

test('manual surroundings and FAQ questions reach the model with missing location and approved answers',async()=>{
  const prompts=[];const t=setup({apiKey:'fixture-key',request:async(url,options)=>{prompts.push(JSON.parse(options.body).messages[0].content);return reply('A contextual fixture response.');}});
  try{
    t.content.places.push({...t.content.places[0],id:'second-building'});
    let r=await t.call({message:'What courses are taught in this building?'});assert.equal(r.data.context.place,null);assert.equal(prompts.length,1);assert.equal(r.data.messages.at(-1).source,'deepseek');assert.ok(prompts.at(-1).includes('"place":null'));assert.ok(prompts.at(-1).includes('ask for the building name'));
    t.content.places=[];r=await t.call();assert.equal(r.data.context.knowledgeReady,true);
    t.content.faq=[{questions:['What is this game?'],answer:'An approved preset.'}];
    r=await t.call({message:'What is this game?'});assert.equal(r.data.messages.at(-1).source,'deepseek');assert.equal(prompts.length,2);assert.ok(prompts.at(-1).includes('"approvedAnswer":"An approved preset."'));
  }finally{t.h.store.close();}
});

test('manual distance uses the model with current server context while automatic telemetry stays preset',async()=>{
  const prompts=[];const t=setup({apiKey:'fixture-key',request:async(url,options)=>{prompts.push(JSON.parse(options.body).messages[0].content);return reply('A current-distance fixture answer.');}});
  try{
    let r=await t.call({message:'How far is the treasure?'});assert.equal(r.data.messages.at(-1).source,'deepseek');assert.ok(prompts.at(-1).includes('"distance_label":"a few metres away, but GPS accuracy is limited"'));
    r=await t.call({event:'distance'});assert.equal(r.data.messages.at(-1).source,'preset');assert.equal(prompts.length,1);
    t.c.call('POST','/api/location/stop',{});
    r=await t.call({message:'还有多远？'});assert.equal(r.data.messages.at(-1).source,'deepseek');assert.ok(prompts.at(-1).includes('"can_give_distance":false'));assert.ok(prompts.at(-1).includes('"distance_label":null'));
    assert.ok(!/latitude|longitude|cookie|csrf/.test(prompts.at(-1)));
  }finally{t.h.store.close();}
});

test('provider requests carry curated facts and bounded history, without coordinates, credentials or game authority',async()=>{
  let sent;const t=setup({apiKey:'fixture-key',request:async(url,options)=>{sent={url,options};return reply('Fixture Hall offers Fixture course.');}});
  try{
    const r=await t.call({message:'Explain this building.'});assert.equal(r.status,200);assert.equal(r.data.messages.at(-1).source,'deepseek');
    const body=JSON.parse(sent.options.body);assert.equal(body.response_format.type,'json_object');assert.equal(body.max_tokens,400);
    assert.ok(body.messages[0].content.includes('Fixture course'));assert.ok(!/latitude|longitude|csrf|cookie|playerId|roomCode/.test(sent.options.body));
    assert.equal(sent.options.headers.Authorization,'Bearer fixture-key');assert.ok(!JSON.stringify(r.data).includes('fixture-key'));
    assert.equal(t.c.collect().data.error.code,'AIM_REQUIRED');
  }finally{t.h.store.close();}
});

test('provider failures and malformed / huge responses become labelled preset failures, never fake AI success',async()=>{
  for(const [code,request] of [
    ['AI_AUTH',async()=>new Response('secret upstream error',{status:401})],
    ['AI_RATE_LIMIT',async()=>new Response('private quota details',{status:429})],
    ['AI_UPSTREAM',async()=>new Response('private provider details',{status:503})],
    ['AI_REPLY_INVALID',async()=>reply('')],['AI_REPLY_INVALID',async()=>new Response('not JSON')],
    ['AI_REPLY_INVALID',async()=>new Response('{"choices":[{"finish_reason":"stop","message":{"content":"null"}}]}')],
    ['AI_REPLY_INCOMPLETE',async()=>new Response('{"choices":[{"finish_reason":"length"}]}')],
    ['AI_REPLY_TOO_LARGE',async()=>new Response('x'.repeat(70000))],
    ['AI_NETWORK',async()=>{throw new Error('private provider error');}]
  ]){
    const logs=[],t=setup({apiKey:'fixture-key',request,diagnostic:entry=>logs.push(entry)});
    try{
      const r=await t.call({message:'Tell me a short story.'});assert.equal(r.status,200);assert.equal(r.data.status,'degraded');assert.equal(r.data.providerError,code);
      assert.equal(r.data.messages.at(-1).source,'preset');assert.equal(r.data.messages.at(-1).failureCode,code);
      const polled=await t.call();assert.equal(polled.data.status,'degraded');assert.equal(polled.data.providerError,code);
      assert.equal(logs.length,1);assert.equal(logs[0].code,code);assert.deepEqual(Object.keys(logs[0]).sort(),['code','elapsedMs','event','upstreamStatus']);
      assert.ok(!/secret upstream|private provider|private quota|fixture-key|Tell me a short story/.test(JSON.stringify({...r.data,messages:r.data.messages.filter(m=>m.role!=='user'),logs})));
      t.guide.request=async()=>reply('Recovered fixture answer.');const recovered=await t.call({message:'Try again'});assert.equal(recovered.data.providerError,null);assert.equal(recovered.data.status,'ready');
    }finally{t.h.store.close();}
  }
});

test('blank JSON-mode completions get one retry within the original provider deadline', async () => {
  const attempts = [];
  let remainsBlank = false;
  const t = setup({ apiKey: 'fixture-key', request: async (_url, options) => {
    attempts.push(options);
    return remainsBlank || attempts.length === 1 ? blankReply() : reply('Open the Treasure Book.', 'view-treasure-book');
  } });
  try {
    const result = await t.call({ message: 'Where can I see the treasure cards?' });
    assert.equal(attempts.length, 2);
    assert.equal(attempts[0].signal, attempts[1].signal);
    assert.equal(result.data.tutorialId, 'view-treasure-book');
    assert.equal(result.data.status, 'ready');
    assert.equal(result.data.messages.at(-1).source, 'deepseek');
    assert.equal(result.data.messages.filter(message => message.role === 'user').length, 1);

    remainsBlank = true;
    attempts.length = 0;
    const blank = await t.call({ message: 'Tell me about campus.' });
    assert.equal(attempts.length, 2);
    assert.equal(blank.data.providerError, 'AI_REPLY_EMPTY');
    assert.equal(blank.data.tutorialId, null);
    assert.equal(blank.data.messages.at(-1).source, 'preset');
    assert.match(blank.data.messages.at(-1).text, /empty reply/i);
  } finally { t.h.store.close(); }
});

test('multi-turn model history uses JSON replies and leaves automatic notices and failures out', async () => {
  const prompts = [];
  const t = setup({ apiKey: 'fixture-key', request: async (_url, options) => {
    prompts.push(JSON.parse(options.body).messages);
    return prompts.length === 2 ? new Response('malformed envelope') : reply('A valid prior answer.');
  } });
  try {
    await t.call({ event: 'distance' });
    await t.call({ message: 'Tell me about this building.' });
    const invalid = await t.call({ message: 'A follow-up.' });
    assert.equal(invalid.data.providerError, 'AI_REPLY_INVALID');
    assert.match(invalid.data.messages.at(-1).text, /unreadable/i);
    const current = await t.call({ message: 'Another follow-up.' });
    assert.equal(current.data.messages.at(-1).source, 'deepseek');
    const assistantHistory = prompts.at(-1).filter(message => message.role === 'assistant');
    assert.deepEqual(assistantHistory.map(message => JSON.parse(message.content)),
      [{ reply: 'A valid prior answer.' }]);
  } finally { t.h.store.close(); }
});

test('provider timeout covers waiting and response bodies, keeps game available, and survives polling',async()=>{
  assert.equal(new CampusGuide().timeoutMs,20000);
  for(const bodyStarted of [false,true]){
    const t=setup({apiKey:'fixture-key',timeoutMs:25,request:async(url,{signal})=>{
      if(bodyStarted)return new Response(new ReadableStream({start(controller){signal.addEventListener('abort',()=>controller.error(new DOMException('private timeout details','AbortError')),{once:true});}}));
      return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('private timeout details','AbortError')),{once:true}));
    }});
    try{
      const pending=t.call({message:'我在c栋'});assert.equal(t.c.call('GET','/api/state').status,200);
      const r=await pending;assert.equal(r.data.providerError,'AI_TIMEOUT');assert.match(r.data.messages.at(-1).text,/too long/);
      assert.equal((await t.call()).data.status,'degraded');assert.equal(t.guide.inflight,0);
    }finally{t.h.store.close();}
  }
});

test('guide checks auth, CSRF, room, round and input; conversation is private to a player and reset by round / content',async()=>{
  const t=setup();try{
    assert.equal((await t.call({message:'Hi'},{'x-csrf-token':'bad'})).status,403);
    assert.equal((await t.call({message:'Hi',roomCode:'BADROOM2'})).status,409);
    assert.equal((await t.call({message:'Hi',treasureId:'old-round'})).status,409);
    for(const body of [{message:1},{message:'x'.repeat(501)},{event:'invented'},{event:'distance',message:'Hi'}])assert.equal((await t.call(body)).status,400);
    await t.call({message:'Private fixture question'});
    const b=t.h.client();b.join(t.c.data.room.code);
    const r=await t.handle({method:'GET',path:'/api/guide',headers:{cookie:b.cookie}});assert.ok(!r.body.includes('Private fixture question'));
    t.c.place();assert.equal((await t.call()).data.messages.length,1);
    t.content.role='A changed approved role.';assert.equal((await t.call()).data.messages.length,1);
    const file=await t.handle({method:'GET',path:'/server/guide-config.json'});assert.equal(file.status,404);
  }finally{t.h.store.close();}
});

test('the guide works before joining and keeps visitor messages private and available on entering a room', async () => {
  let selected = 'join-room';
  const prompts = [];
  const guide = new CampusGuide({ apiKey: 'fixture-key', request: async (url, options) => {
    prompts.push(JSON.parse(options.body).messages[0].content);
    return reply('An isolated how-to answer.', selected);
  } });
  const h = backendHarness(':memory:', { guide }), visitor = h.client(), other = h.client(), host = h.client();
  const ask = { message: 'How do I join a room?', page: 'entry' };
  try {
    assert.equal(visitor.call('POST', '/api/guide', ask).data.error.code, 'GUIDE_SESSION_REQUIRED');
    const initial = visitor.call('GET', '/api/guide');
    assert.match(initial.headers['Set-Cookie'], /cq_guide=.*HttpOnly; SameSite=Strict/);
    assert.equal(initial.data.context.roomRole, null);
    assert.equal(visitor.call('GET', '/api/state').status, 401);
    assert.equal(visitor.call('POST', '/api/guide', ask, { 'x-csrf-token': 'invalid' }).status, 403);
    assert.equal((await visitor.call('POST', '/api/guide', { ...ask, page: '<script>' })).data.error.code, 'INVALID_GUIDE_PAGE');
    assert.equal((await visitor.call('POST', '/api/guide', { event: 'distance', page: 'entry' })).data.accepted, false);
    assert.equal(prompts.length, 0);
    const answer = await visitor.call('POST', '/api/guide', ask);
    assert.equal(answer.data.tutorialId, 'join-room');
    assert.equal(answer.data.messages.at(-1).text, 'An isolated how-to answer.');
    assert.match(prompts[0], /"page":"entry"/);
    assert.match(prompts[0], /give a short explanation in the reply.*offer an optional walkthrough/);
    for (const id of ['create-room', 'view-leaderboard', 'view-treasure-book']) assert.ok(prompts[0].includes(`"id":"${id}"`));
    assert.doesNotMatch(prompts[0], /latitude|longitude|csrfToken|roomCode/);
    assert.doesNotMatch(other.call('GET', '/api/guide').body, /isolated how-to answer/);
    assert.equal(other.call('POST', '/api/guide', ask, { 'x-csrf-token': visitor.csrf }).status, 403);

    host.create();
    visitor.join(host.data.room.code);
    const joined = visitor.call('GET', '/api/guide');
    assert.equal(joined.data.context.roomRole, 'guest');
    assert.ok(joined.data.messages.some(message => message.text === 'An isolated how-to answer.'));
    assert.equal(joined.data.tutorialId, undefined);
    selected = 'switch-indoor';
    const indoor = await visitor.call('POST', '/api/guide', {
      message: 'How do I switch to Indoor mode?', page: 'menu', treasureId: visitor.data.room.treasureId,
    });
    assert.equal(indoor.data.tutorialId, null);
    assert.doesNotMatch(prompts.at(-1), /"id":"switch-indoor"/);
    assert.doesNotMatch(prompts.at(-1), /"id":"create-room"/);
  } finally { h.store.close(); }
});

test('a signed-in player can ask before joining and the response only carries registered tutorial IDs', async () => {
  let selected = 'hide-and-claim';
  const guide = new CampusGuide({ apiKey: 'fixture-key', request: async () => reply('A safe answer.', selected) });
  const h = backendHarness(':memory:', { guide }), player = h.client();
  try {
    assert.equal((await player.call('POST', '/api/auth/register', { username: 'guide_fixture', password: 'fixture password' })).status, 201);
    assert.equal(player.call('GET', '/api/guide').data.context.roomRole, null);
    const ask = { message: 'How do I hunt for treasure?', page: 'progress' };
    assert.equal((await player.call('POST', '/api/guide', ask)).data.tutorialId, 'hide-and-claim');
    for (const [id, message] of [
      ['create-room', 'How do I create a room?'],
      ['view-leaderboard', 'Where is the leaderboard?'],
      ['view-treasure-book', 'Where can I see my treasure cards?'],
    ]) {
      selected = id;
      assert.equal((await player.call('POST', '/api/guide', { message, page: 'entry' })).data.tutorialId, id);
    }
    selected = '#confirm-room-exit';
    const answer = await player.call('POST', '/api/guide', ask);
    assert.equal(answer.data.tutorialId, null);
    assert.equal(answer.data.messages.at(-1).source, 'deepseek');
    assert.equal(player.call('POST', '/api/auth/logout', {}).status, 200);
    assert.doesNotMatch(player.call('GET', '/api/guide').body, /A safe answer/);
  } finally { h.store.close(); }
});

test('a delayed provider reply is rejected after the treasure or GPS context changes',async()=>{
  for(const change of ['round','gps']){
    let resolve;const t=setup({apiKey:'fixture-key',request:()=>new Promise(r=>{resolve=r;})});
    try{
      const pending=t.call({message:'Explain this building.'});await Promise.resolve();
      if(change==='round')t.c.place();else t.c.call('POST','/api/location/stop',{});
      resolve(reply('Old building reply'));const r=await pending;assert.equal(r.status,409);
      assert.ok(!(await t.call()).data.messages.some(m=>m.text==='Old building reply'));
    }finally{t.h.store.close();}
  }
});

test('guide limits per-player requests and concurrent provider work without blocking the game',async()=>{
  let resolve;const t=setup({apiKey:'fixture-key',request:()=>new Promise(r=>{resolve=r;})});try{
    const pending=t.call({message:'Tell me a story.'});await Promise.resolve();
    assert.equal((await t.call({message:'Another question'})).status,429);assert.equal(t.c.call('GET','/api/state').status,200);
    resolve(reply('A short fixture story.'));await pending;
    for(let i=0;i<18;i++)await t.call({event:'gps-lost'});
    assert.equal((await t.call({event:'gps-lost'})).status,429);
  }finally{t.h.store.close();}
});

test('invalid configuration is rejected and transient GPS invalidation preserves local tracking',async()=>{
  const c=config();c.places=[{id:'invalid'}];assert.throws(()=>validateGuideConfig(c));
  const t=setup();try{
    const remote=new RemoteTreasureSession({now:t.h.now,request:async()=>({ok:true,status:200,json:async()=>t.c.data})});
    remote.apply(t.c.data);remote.start(t.h.now());remote.loseLocation(t.h.now());
    assert.equal(remote.active,true);assert.equal(remote.snapshot(t.h.now()).eligible,true);assert.equal(remote.snapshot(t.h.now()).guidance.frame,'local');
    await remote.tail;assert.equal(remote.snapshot(t.h.now()).canClaim,false);
    t.h.advance(1);await remote.receive({latitude:0,longitude:0,accuracy:5,timestamp:t.h.now()});assert.equal(remote.gpsLost,false);
  }finally{t.h.store.close();}
});

function guideDom(){
  const nodes=new Map();let time=0;
  const node=id=>{
    if(!nodes.has(id))nodes.set(id,{hidden:false,disabled:false,value:'',textContent:'',attrs:{},children:[],
      addEventListener(n,fn){this[n]=fn;},setAttribute(n,v){this.attrs[n]=v;},removeAttribute(n){delete this.attrs[n];},
      append(...children){for(const child of children)child.parent=this;this.children.push(...children);},
      insertBefore(child,before){child.remove();this.children.splice(this.children.indexOf(before),0,child);child.parent=this;},
      remove(){if(this.parent)this.parent.children=this.parent.children.filter(child=>child!==this);},focus(){}});
    return nodes.get(id);
  };
  const document={getElementById:node,createElement:tag=>({...node(`new-${nodes.size}`),tag})};
  return {node,document,now:()=>time,advance:ms=>{time+=ms;}};
}
const guideView=(text='Welcome')=>({name:'Fixture Guide',providerConfigured:true,context:{gps:'available',distanceMeters:20,place:null},messages:[{id:'a',role:'assistant',text,source:'deepseek'}]});
const flush=async()=>{for(let i=0;i<5;i++)await Promise.resolve();};

test('camera guide supports text and quick questions, proactive distance, and cancels late results on close',async()=>{
  const d=guideDom(),calls=[],session={data:{player:{id:'p'},room:{code:'room',treasureId:'round'}},guideRequest:async body=>{calls.push(body);return guideView(body?.message||'Distance updated');}};
  const guide=mountGuide({...d,session});guide.sync(true,{canNavigate:true});await flush();
  d.node('open-guide').click();assert.equal(guide.isOpen(),true);assert.equal(d.node('guide-panel').hidden,false);
  d.node('guide-input').value='What is nearby?';d.node('guide-form').submit({preventDefault(){}});await flush();assert.equal(calls.at(-1).message,'What is nearby?');
  d.node('guide-distance').click();await flush();assert.match(calls.at(-1).message,/How far/);
  d.node('close-guide').click();guide.sync(true,{canNavigate:true});await flush();assert.equal(calls.at(-1).event,'distance');
  guide.sync(true,{canNavigate:true});await flush();assert.equal(calls.filter(c=>c?.event==='distance').length,1);
  let resolve;session.guideRequest=()=>new Promise(r=>{resolve=r;});d.node('guide-place').click();guide.stop();resolve(guideView('Late answer'));await flush();
  assert.equal(d.node('guide-panel').hidden,true);assert.notEqual(d.node('guide-preview').textContent,'Late answer');
});

test('camera guide retains a specific provider failure on polling and labels recovery as AI',async()=>{
  const d=guideDom();let view={...guideView(),status:'degraded',providerError:'AI_TIMEOUT',messages:[{role:'assistant',source:'preset',text:'The AI guide took too long to respond.',failureCode:'AI_TIMEOUT'}]};
  const guide=mountGuide({...d,session:{guideRequest:async()=>view}});
  guide.sync(true,{canNavigate:true});await flush();assert.equal(d.node('guide-status').textContent,'AI timed out · try again');
  d.advance(5000);guide.sync(true,{canNavigate:true});await flush();assert.equal(d.node('guide-status').textContent,'AI timed out · try again');
  view={...guideView('Recovered fixture answer.'),status:'ready',providerError:null};
  d.node('guide-place').click();await flush();assert.equal(d.node('guide-status').textContent,'DeepSeek · AI reply');guide.stop();
});

test('opening the guide leaves the text input unfocused and restores focus when closed', () => {
  const d = guideDom(), focus = [];
  for (const id of ['open-guide', 'guide-panel', 'guide-input']) d.node(id).focus = () => focus.push(id);
  const guide = mountGuide({ ...d, session: { guideRequest: async () => guideView() } });
  guide.sync(true, { canNavigate: false }, { cameraActive: false });
  d.node('open-guide').click();
  assert.deepEqual(focus, ['guide-panel']);
  d.node('close-guide').click();
  assert.deepEqual(focus, ['guide-panel', 'open-guide']);
  guide.sync(true, { canNavigate: false }, { cameraActive: true });
  d.node('guide-preview').click();
  assert.deepEqual(focus, ['guide-panel', 'open-guide', 'guide-panel']);
  guide.stop();
});

test('guide motion preserves history and the reader’s scroll, and only manual questions show waiting', async () => {
  const d = guideDom();
  let view = guideView(), replyToQuestion;
  const session = { guideRequest: body => body?.message
    ? new Promise(resolve => { replyToQuestion = resolve; })
    : Promise.resolve(view) };
  const guide = mountGuide({ ...d, session });
  const reading = { canNavigate: false }, screen = { cameraActive: false };
  const panel = d.node('guide-panel'), log = d.node('guide-messages');
  guide.sync(true, reading, screen);
  assert.equal(panel.inert, true);
  d.node('open-guide').click();
  guide.sync(true, reading, screen);
  await flush();
  assert.equal(panel.attrs['data-open'], 'true');
  assert.equal(panel.inert, false);
  const first = log.children[0];
  Object.assign(log, { scrollHeight: 500, clientHeight: 180, scrollTop: 25 });
  d.node('guide-input').value = 'What is nearby?';
  d.node('guide-form').submit({ preventDefault() {} });
  assert.equal(panel.attrs['data-waiting'], 'true');
  assert.equal(log.children.length, 2);
  const pending = log.children.at(-1);
  assert.equal(pending.children[1].textContent, 'What is nearby?');
  assert.equal(pending.attrs['data-entering'], '');
  assert.equal(first.attrs['data-entering'], undefined);
  log.animationend({ animationName: 'guide-bubble-pop', target: pending });
  assert.equal(pending.attrs['data-entering'], undefined);
  assert.equal(log.scrollTop, log.scrollHeight);
  log.scrollTop = 25;
  view = { ...view, messages: [...view.messages, { id: 'q', role: 'user', text: 'What is nearby?' },
    { id: 'b', role: 'assistant', source: 'deepseek', text: 'Here is the reply.' }] };
  replyToQuestion(view);
  await flush();
  assert.equal(log.children[0], first);
  assert.equal(log.children[1], pending);
  assert.equal(log.scrollTop, 25);
  assert.equal(pending.attrs['data-entering'], undefined);
  const reply = log.children.at(-1);
  assert.equal(reply.attrs['data-entering'], '');
  log.animationcancel({ animationName: 'guide-bubble-pop', target: reply });
  assert.equal(reply.attrs['data-entering'], undefined);
  assert.equal(panel.attrs['data-waiting'], 'false');

  d.advance(5000);
  guide.sync(true, reading, screen);
  assert.equal(panel.attrs['data-waiting'], 'false');
  await flush();
  assert.equal(log.children.at(-1), reply);
  assert.equal(reply.attrs['data-entering'], undefined);
  view = { ...view, messages: [...view.messages.slice(1), { id: 'c', role: 'assistant', source: 'preset', text: 'New notice.' }] };
  d.advance(5000);
  guide.sync(true, reading, screen);
  await flush();
  assert.equal(log.children.includes(first), false);
  assert.equal(log.children.at(-1).attrs['data-entering'], '');
  d.node('close-guide').click();
  assert.equal(guide.isOpen(), false);
  assert.equal(panel.inert, true);
  assert.equal(panel.attrs['data-open'], 'false');
});

test('an unconfirmed question returns to the composer and a later server snapshot keeps the bubbles ordered', async () => {
  const d = guideDom(), welcome = guideView();
  let resolveQuestion, rejectQuestion;
  const guide = mountGuide({ ...d, session: {
    guideRequest: body => body?.message ? new Promise((resolve, reject) => {
      resolveQuestion = resolve; rejectQuestion = reject;
    }) : Promise.resolve(welcome),
  } });
  const reading = { canNavigate: false }, screen = { cameraActive: false };
  guide.sync(true, reading, screen);
  d.node('open-guide').click();
  guide.sync(true, reading, screen);
  await flush();
  const input = d.node('guide-input'), log = d.node('guide-messages');
  input.value = 'How do I join?';
  d.node('guide-form').submit({ preventDefault() {} });
  assert.equal(log.children.length, 2);
  rejectQuestion(new Error('An isolated network failure.'));
  await flush();
  assert.equal(log.children.length, 1);
  assert.equal(input.value, 'How do I join?');
  assert.equal(d.node('guide-status').textContent, 'An isolated network failure.');

  d.node('guide-form').submit({ preventDefault() {} });
  const pending = log.children.at(-1);
  resolveQuestion({ ...welcome, messages: [...welcome.messages,
    { id: 'other', role: 'user', text: 'How do I join?' },
    { id: 'other-answer', role: 'assistant', source: 'deepseek', text: 'An earlier reply.' },
    { id: 'question', role: 'user', text: 'How do I join?' },
    { id: 'answer', role: 'assistant', source: 'deepseek', text: 'The latest reply.' },
  ] });
  await flush();
  assert.equal(log.children[3], pending);
  assert.deepEqual(log.children.map(article => article.children[1].textContent),
    ['Welcome', 'How do I join?', 'An earlier reply.', 'How do I join?', 'The latest reply.']);
});

test('guide explains in chat and waits for explicit confirmation before opening the tutorial', async () => {
  const d = guideDom(), started = [], calls = [];
  const history = guideView().messages;
  const session = { guideRequest: async body => {
    calls.push(body);
    if (body?.message) {
      history.push({ id: `question-${calls.length}`, role: 'user', text: body.message },
        { id: `answer-${calls.length}`, role: 'assistant', text: 'Choose Join with a code.', source: 'deepseek' });
    }
    return { ...guideView(), messages: [...history], accepted: Boolean(body), tutorialId: 'join-room' };
  } };
  const guide = mountGuide({ ...d, session, onTutorial: id => { started.push(id); sync(true); } });
  const sync = (tutorial = false) => guide.sync(true, { canNavigate: false }, { screen: 'entry', cameraActive: false, tutorial });
  const log = d.node('guide-messages'), panel = d.node('guide-panel');
  const ask = async () => {
    d.node('guide-input').value = 'How do I join a room?';
    d.node('guide-form').submit({ preventDefault() {} });
    await flush();
    return log.children.at(-1);
  };
  sync();
  assert.equal(d.node('open-guide').hidden, false);
  assert.equal(d.node('guide-controls').hidden, true);
  d.node('open-guide').click();
  sync();
  await flush();
  assert.equal(log.children[0].children.length, 2, 'a poll cannot offer a tutorial');

  const first = await ask();
  assert.deepEqual(calls.at(-1), { message: 'How do I join a room?', page: 'entry' });
  assert.equal(first.children[1].textContent, 'Choose Join with a code.');
  const offer = first.children[2];
  assert.match(offer.children[0].textContent, /Would you like to open/);
  assert.equal(guide.isOpen(), true);
  assert.deepEqual(started, []);
  d.advance(5000);
  sync();
  await flush();
  assert.equal(first.children[2], offer);
  const [acceptFirst, decline] = offer.children[1].children;
  assert.equal(decline.textContent, 'Not now');
  decline.click();
  acceptFirst.click();
  assert.equal(first.children.length, 2);
  assert.equal(guide.isOpen(), true);
  assert.deepEqual(started, []);

  const second = await ask();
  const accept = second.children[2].children[1].children[0];
  assert.equal(accept.textContent, 'Open tutorial');
  d.node('guide-input').value = 'A follow-up draft';
  Object.assign(log, { scrollHeight: 520, clientHeight: 180, scrollTop: 30 });
  accept.click();
  accept.click();
  assert.deepEqual(started, ['join-room']);
  assert.equal(guide.isOpen(), false);
  assert.equal(panel.inert, true);
  assert.equal(panel.hidden, false, 'the closed panel can finish its CSS transition');
  assert.equal(panel.attrs['data-open'], 'false');
  assert.equal(second.children.length, 3, 'the departing panel keeps its layout');
  assert.equal(log.scrollTop, 30);
  let focused = false;
  panel.focus = () => { focused = true; };
  assert.equal(guide.resumeAfterTutorial(), true);
  assert.equal(guide.isOpen(), true);
  assert.equal(focused, true);
  assert.equal(d.node('guide-input').value, 'A follow-up draft');
  assert.equal(log.children.at(-1), second);
  assert.equal(log.scrollTop, 30);
  assert.equal(second.children.length, 2);
});

test('tutorial arrow arrives before details appear and follows the latest step', () => {
  const d = guideDom(), overlay = d.node('tutorial-overlay');
  const arrow = d.node('tutorial-arrow'), copy = d.node('tutorial-copy');
  overlay.dataset = {};
  for (const node of [overlay, arrow, d.node('tutorial-spotlight'), d.node('tutorial-card')]) {
    node.style = { setProperty(key, value) { this[key] = value; } };
  }
  for (const [id, top] of [['show-join', 520], ['room-code', 180], ['nickname', 290], ['entry-submit', 410]]) {
    d.node(id).getBoundingClientRect = () => ({ left: 60, right: 300, top, bottom: top + 44, width: 240, height: 44 });
  }
  let returned = 0, reduced = false, now = 0, frameId = 0;
  const frames = new Map();
  const paint = elapsed => {
    now += elapsed;
    const pending = [...frames.values()];
    frames.clear();
    for (const callback of pending) callback(now);
  };
  const state = { screen: 'entry', entry: 'home', sheet: '' };
  const tutorial = mountTutorials({
    document: { ...d.document, addEventListener() {} },
    window: { innerWidth: 390, innerHeight: 780, addEventListener() {},
      matchMedia: () => ({ get matches() { return reduced; } }), getComputedStyle: () => ({ opacity: '0.6' }),
      requestAnimationFrame(callback) { frames.set(++frameId, callback); return frameId; },
      cancelAnimationFrame(id) { frames.delete(id); } },
    onChange: () => sync(),
    onReturnToGuide: () => { returned++; sync(); return true; },
  });
  const sync = () => tutorial.sync(state);

  tutorial.start('join-room', { fromGuide: true });
  assert.equal(overlay.dataset.stepPhase, 'flying');
  assert.match(arrow.style.transform, /^translate3d\(195px,390px/);
  const atCenter = arrow.style.transform;
  paint(0);
  paint(60);
  assert.equal(arrow.style.transform, atCenter);
  paint(150);
  assert.notEqual(arrow.style.transform, atCenter);
  assert.equal(copy.textContent, '');
  paint(350);
  assert.equal(overlay.dataset.stepPhase, 'ready');
  assert.match(copy.textContent, /Choose Join with a code/);
  const atJoin = arrow.style.transform;
  sync();
  assert.equal(frames.size, 0, 'ordinary renders do not restart the step');

  state.entry = 'join';
  sync();
  assert.equal(overlay.dataset.stepPhase, 'leaving');
  paint(0);
  paint(100);
  assert.equal(arrow.style.transform, atJoin);
  assert.match(copy.textContent, /Choose Join with a code/);
  state.codeReady = true;
  sync();
  paint(70);
  assert.equal(overlay.dataset.stepPhase, 'flying');
  assert.equal(arrow.style.transform, atJoin);
  assert.equal(d.node('tutorial-spotlight').style.top, '286px');
  paint(0);
  paint(150);
  const inFlight = arrow.style.transform;
  assert.notEqual(inFlight, atJoin);
  state.nameReady = true;
  sync();
  assert.equal(arrow.style.transform, inFlight, 'a new target keeps the current arrow position');
  paint(0);
  paint(500);
  assert.equal(overlay.dataset.stepPhase, 'ready');
  assert.match(copy.textContent, /Choose Join room/);

  state.screen = 'field';
  sync();
  paint(0);
  paint(170);
  assert.equal(overlay.dataset.stepPhase, 'ready');
  assert.equal(arrow.hidden, true);
  assert.equal(d.node('close-tutorial').textContent, 'Done');
  d.node('close-tutorial').click();
  assert.equal(returned, 1);
  assert.equal(tutorial.isOpen(), false);
  assert.equal(overlay.inert, true);
  assert.equal(overlay.hidden, false);
  assert.equal(overlay.style['--tutorial-close-opacity'], '0.6');
  overlay.animationend({ target: overlay, animationName: 'tutorial-overlay-exit' });
  assert.equal(overlay.hidden, true);

  d.node('open-tutorials').click();
  tutorial.dismiss();
  assert.equal(returned, 1);
  assert.equal(overlay.hidden, false, 'the manual picker also fades out');
  assert.equal(overlay.inert, true);
  overlay.animationcancel({ target: overlay, animationName: 'tutorial-overlay-exit' });
  assert.equal(overlay.hidden, true);
  Object.assign(state, { screen: 'entry', entry: 'home' });
  tutorial.start('join-room', { fromGuide: true });
  assert.equal(frames.size, 1);
  tutorial.dismiss(false);
  assert.equal(returned, 1, 'manual and background closes never reopen chat');
  assert.equal(overlay.hidden, true);
  assert.equal(frames.size, 0);

  reduced = true;
  tutorial.start('join-room', { fromGuide: true });
  assert.equal(overlay.dataset.stepPhase, 'ready');
  assert.equal(frames.size, 0);
  tutorial.dismiss();
  assert.equal(returned, 2);
  assert.equal(overlay.hidden, true, 'reduced motion skips the fading overlay');
});

test('a tutorial offer is scoped to the current page and role', async () => {
  const d = guideDom(), started = [];
  let resolveReply;
  const session = { guideRequest: body => body?.message ? new Promise(resolve => { resolveReply = resolve; }) : Promise.resolve(guideView()) };
  const guide = mountGuide({ ...d, session, onTutorial: id => started.push(id) });
  const sync = screen => guide.sync(true, { canNavigate: false }, { screen, cameraActive: false });
  const log = d.node('guide-messages');
  const ask = () => {
    d.node('guide-input').value = 'How do I join a room?';
    d.node('guide-form').submit({ preventDefault() {} });
  };
  const answer = { ...guideView('Choose Join with a code.'), accepted: true, tutorialId: 'join-room' };

  sync('entry');
  d.node('open-guide').click();
  ask();
  resolveReply(answer);
  await flush();
  const stale = log.children[0].children[2].children[1].children[0];
  sync('account');
  stale.click();
  assert.equal(log.children[0].children.length, 2);

  ask();
  sync('entry');
  resolveReply(answer);
  await flush();
  assert.equal(log.children[0].children.length, 2, 'a late answer can be read without an offer');

  session.data = { player: { role: 'guest' }, room: { code: '1234', treasureId: null } };
  sync('field');
  await flush();
  ask();
  resolveReply(answer);
  await flush();
  assert.equal(log.children[0].children.length, 2, 'guests already in a room cannot receive a join offer');
  assert.deepEqual(started, []);
});

test('tutorial targets follow room role, placement, actual mode confirmation and claim readiness', () => {
  const entry = { screen: 'entry', entry: 'home', sheet: '' };
  assert.equal(tutorialStep('join-room', entry).target, 'show-join');
  assert.equal(tutorialStep('join-room', { ...entry, entry: 'join' }).target, 'room-code');
  const field = { screen: 'field', sheet: '', owner: true };
  assert.equal(tutorialStep('switch-indoor', field).target, 'open-menu');
  assert.equal(tutorialStep('switch-indoor', { ...field, sheet: 'menu' }).target, 'mode-ronin');
  assert.equal(tutorialStep('switch-indoor', { ...field, sheet: 'menu', pendingMode: 'indoor-ronin' }).target, 'mode-apply');
  assert.equal(tutorialStep('switch-indoor', { ...field, owner: false }).target, null);
  assert.equal(tutorialStep('hide-and-claim', { ...field, tracking: true, placed: true, screen: 'camera' }).target, 'ar-guidance');
  assert.equal(tutorialStep('hide-and-claim', { ...field, tracking: true, placed: true, screen: 'camera', claimReady: true }).target, 'claim');
});

test('room creation and progress tutorials follow the visible entry, account and tab state', () => {
  const home = { screen: 'entry', sheet: '', entry: 'home' };
  assert.equal(tutorialStep('create-room', home).target, 'show-create');
  assert.equal(tutorialStep('create-room', { ...home, entry: 'join' }).target, 'entry-cancel');
  assert.equal(tutorialStep('create-room', { ...home, entry: 'create' }).target, 'nickname');
  assert.equal(tutorialStep('create-room', { ...home, entry: 'create', nameReady: true }).target, 'entry-submit');
  assert.equal(tutorialStep('create-room', { ...home, screen: 'field', owner: true }).done, true);
  assert.equal(tutorialStep('view-leaderboard', home).target, 'open-account');
  assert.equal(tutorialStep('view-leaderboard', { ...home, sheet: 'account' }).target, 'account-form');
  assert.equal(tutorialStep('view-treasure-book', { ...home, signedIn: true }).target, 'open-progress-home');
  const room = { screen: 'field', sheet: 'menu' };
  assert.equal(tutorialStep('view-leaderboard', room).target, 'open-account-menu');
  assert.equal(tutorialStep('view-treasure-book', { ...room, signedIn: true }).target, 'open-progress-room');
  assert.equal(tutorialStep('view-treasure-book', { ...room, sheet: '', signedIn: true, phase: 'collected' }).target, 'open-progress-claim');
  const progress = { ...room, sheet: 'progress', signedIn: true, progressTab: 'leaderboard', progressLoaded: true };
  assert.equal(tutorialStep('view-treasure-book', progress).target, 'progress-book');
  assert.equal(tutorialStep('view-leaderboard', { ...progress, progressTab: 'book' }).target, 'progress-leaderboard');
  assert.equal(tutorialStep('view-leaderboard', { ...progress, progressLoaded: false }).target, 'progress-status');
  assert.equal(tutorialStep('view-treasure-book', { ...progress, progressLoaded: false }).target, 'progress-status');
  assert.equal(tutorialStep('view-treasure-book', { ...progress, progressTab: 'book' }).target, 'progress-summary');

  const html = readFileSync(new URL('../public/treasure-lab/index.html', import.meta.url), 'utf8');
  const manualIds = Array.from(html.matchAll(/data-tutorial="([^"]+)"/g), match => match[1]);
  assert.deepEqual(manualIds, tutorials.map(tutorial => tutorial.id));
  assert.ok(availableTutorials('guest').some(tutorial => tutorial.id === 'view-treasure-book'));
});

test('guide proactively announces a new building and GPS recovery without repeats each render',async()=>{
  const d=guideDom(),calls=[],view=guideView();view.context.place={id:'a'};
  const guide=mountGuide({...d,session:{guideRequest:async body=>{calls.push(body);return view;}}});
  guide.sync(true,{canNavigate:true});await flush();guide.sync(true,{canNavigate:true});await flush();assert.equal(calls.at(-1).event,'arrival');
  guide.sync(true,{canNavigate:false});await flush();assert.equal(calls.at(-1).event,'gps-lost');
  guide.sync(true,{canNavigate:false});await flush();const n=calls.length;guide.sync(true,{canNavigate:false});await flush();assert.equal(calls.length,n);
  guide.sync(true,{canNavigate:true});await flush();assert.equal(calls.at(-1).event,'gps-restored');
});


test('legacy treasure ranges migrate once to 3 m without changing coordinates, round or claim rows',()=>{
  const dir=mkdtempSync(join(tmpdir(),'cq-range-')),file=join(dir,'fixture.sqlite');let store;
  try{
    store=new GameStore(file);
    const {player}=store.create('Owner');const zone={latitude:0,longitude:0,radius:30,placementAccuracy:5};
    store.db.prepare("UPDATE rooms SET zone=?,treasure_id=?,mode='gps' WHERE code=?").run(JSON.stringify(zone),'fixture-round',player.room);
    store.db.prepare('INSERT INTO claims VALUES(?,?,?,?,?)').run('fixture-receipt',player.room,'fixture-round',player.id,1000);store.close();
    store=new GameStore(file);const room=store.room(player.room),migrated=JSON.parse(room.zone);
    assert.equal(migrated.radius,3);assert.equal(migrated.rangeVersion,2);assert.equal(migrated.latitude,0);assert.equal(migrated.longitude,0);assert.equal(room.treasure_id,'fixture-round');
    assert.equal(store.claim(player,room).id,'fixture-receipt');store.close();store=new GameStore(file);assert.equal(JSON.parse(store.room(player.room).zone).radius,3);
  }finally{store?.close();rmSync(dir,{recursive:true,force:true});}
});


test('opening guide conversation cancels aiming without releasing the camera; closing requires another hold',async()=>{
  const stream=cameraStream(),h=harness({getUserMedia:()=>Promise.resolve(stream)});
  h.session.guideRequest=async()=>guideView();h.unlock();await h.click('start-camera');await flush();h.aimAtTreasure();
  assert.equal(h.node('claim').disabled,false);h.click('open-guide');
  assert.equal(h.node('guide-panel').hidden,false);assert.equal(h.node('claim').hidden,true);assert.equal(stream.stops,0);
  h.click('claim');assert.equal(h.session.collectionCount,0);h.click('close-guide');
  assert.equal(h.node('claim').disabled,true);h.advance(300);h.aimAtTreasure();assert.equal(h.node('claim').disabled,false);
  h.background();assert.equal(h.node('guide-panel').hidden,true);assert.equal(stream.stops,1);
});

test('guide viewport changes move the input above the keyboard and remove viewport listeners on camera stop',async()=>{
  const d=guideDom(),listeners=new Map(),style={};d.node('guide-panel').style={setProperty:(k,v)=>{style[k]=v;}};
  const viewport={height:300,offsetTop:0,addEventListener:(n,f)=>listeners.set(n,f),removeEventListener:n=>listeners.delete(n)};
  let resolve;const guide=mountGuide({...d,window:{innerHeight:600,visualViewport:viewport},session:{guideRequest:()=>new Promise(r=>{resolve=r;})}});
  guide.sync(true,{canNavigate:true});assert.equal(style['--guide-keyboard'],'300px');assert.equal(d.node('guide-panel').attrs['data-keyboard'],'true');
  assert.equal(d.node('guide-input').disabled,false,'background requests never interrupt typing');
  guide.stop();assert.equal(listeners.size,0);resolve(guideView());await flush();
});


test('provided role and approved knowledge load without activating unreviewed geofences',()=>{
  const c=validateGuideConfig(config());assert.equal(c.name,'Campus Quest Guide');assert.equal(c.places.length,0);
  assert.equal(c.knowledge.length,13);assert.equal(Object.keys(c.sources).length,17);
  assert.ok(c.role.includes('not an official university administrator'));
  assert.ok(!c.knowledge.some(f=>/BLDG_[BFGHJM S]/.test(f.id)));
  const ids=retrieveGuideFacts(c,'C',{}, {place:null}).map(f=>f.id);assert.ok(ids.includes('BLDG_C'));assert.ok(ids.includes('PROG_CHIPS'));
  assert.equal(guideDistanceLabel(1.2),'a few metres away, but GPS accuracy is limited');assert.equal(guideDistanceLabel(null),null);
});

test('named buildings and follow-up courses remain answerable without GPS and do not imply current proximity',async()=>{
  const prompts=[];const t=setup({apiKey:'fixture-key',request:async(url,options)=>{prompts.push(JSON.parse(options.body).messages[0].content);return reply('A sourced programme explanation.');}});
  try{
    t.c.call('POST','/api/location/stop',{});
    let r=await t.call({message:'What is in Building C?'});assert.equal(r.data.messages.at(-1).source,'deepseek');
    assert.ok(prompts.at(-1).includes('PROG_CHIPS'));assert.ok(prompts.at(-1).includes('"can_give_distance":false'));assert.ok(prompts.at(-1).includes('"place":null'));
    await t.call({message:'What example modules would I study?'});assert.ok(prompts.at(-1).includes('Microprocessor Systems'));
    const n=prompts.length;await t.call({message:'How far is the treasure and what courses are related to Building C?'});assert.equal(prompts.length,n+1);assert.ok(prompts.at(-1).includes('Microprocessor Systems'));
    await t.call({message:'Tell me about A栋.'});assert.ok(prompts.at(-1).includes('PROG_ROBOTICS'));assert.ok(!prompts.at(-1).includes('"id":"PROG_CHIPS"'));
  }finally{t.h.store.close();}
});

test('general subject questions use only relevant approved knowledge, excluding pending map records',()=>{
  const c=config();const facts=retrieveGuideFacts(c,'Is there a subject about making a game like this?',{}, {place:null});
  assert.ok(facts.some(f=>f.id==='PROG_ART_TECH'));assert.ok(!facts.some(f=>f.id==='BLDG_D'||f.id==='BLDG_C'));
  assert.ok(!facts.some(f=>f.sourceIds.includes('S16')));
});
