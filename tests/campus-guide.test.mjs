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
import { RemoteTreasureSession } from '../public/treasure-lab/client.js';

// Isolated fixtures only; these are not real campus coordinates or live provider replies.
const config=()=>JSON.parse(readFileSync(new URL('../server/guide-config.json',import.meta.url)));
function setup(options={}){
  const h=backendHarness(),c=h.client();c.create();c.fix();c.place();c.returnToTreasure();
  const content=config();content.places=[{id:'fixture-building',name:'Fixture Hall',latitude:0,longitude:0,radius:60,description:'A verified isolated test building.',courses:[{name:'Fixture course',description:'A course fixture.'}]}];
  const guide=new CampusGuide({loadConfig:()=>content,now:h.now,...options});
  const handle=createApplication({store:h.store,guide});
  const call=async(body,headers={})=>{
    const r=await handle({method:body?'POST':'GET',path:'/api/guide',body:body?{roomCode:c.data.room.code,treasureId:c.data.room.treasureId,...body}:undefined,
      headers:{cookie:c.cookie,origin:'http://127.0.0.1:4180','content-type':'application/json','x-csrf-token':c.csrf,...headers}});
    return {status:r.status,data:JSON.parse(r.body)};
  };
  return {h,c,content,guide,handle,call};
}
const reply=text=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify({reply:text})}}]}),{status:200,headers:{'Content-Type':'application/json'}});

test('3 m mode departs and returns at the reported centre distance without a hidden 10 m exit buffer',async()=>{
  const h=backendHarness(),c=h.client();
  try{
    c.create();c.fix();c.call('POST','/api/treasure',{radius:3,treasureId:c.data.room.treasureId});
    h.advance(100);c.fix(2.9);assert.equal(c.data.state.canNavigate,false);
    h.advance(100);c.fix(3.1);assert.equal(c.data.state.canNavigate,true);assert.equal(c.data.state.eligible,false);
    h.advance(100);c.fix(2.9);h.advance(2000);c.fix(2.9);
    assert.equal(c.data.state.eligible,true);assert.ok(c.data.state.guidance);
    h.advance(100);c.fix(3.1);assert.equal(c.data.state.eligible,false);
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

test('unknown and overlapping places do not fabricate surroundings, even with a provider configured',async()=>{
  let calls=0;const t=setup({apiKey:'fixture-key',request:async()=>{calls++;return reply('Should not be used');}});
  try{
    t.content.places.push({...t.content.places[0],id:'second-building'});
    let r=await t.call({message:'What courses are taught in this building?'});assert.equal(r.data.context.place,null);assert.equal(calls,0);assert.match(r.data.messages.at(-1).text,/verified information/);
    t.content.places=[];r=await t.call();assert.equal(r.data.context.knowledgeReady,true);
    t.content.faq=[{questions:['What is this game?'],answer:'An approved preset.'}];
    r=await t.call({message:'What is this game?'});assert.equal(r.data.messages.at(-1).text,'An approved preset.');assert.equal(calls,0);
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
  for(const request of [async()=>new Response('secret upstream error',{status:401}),async()=>reply(''),async()=>new Response('x'.repeat(70000)),async()=>{throw new Error('private provider error');}]){
    const t=setup({apiKey:'fixture-key',request});try{const r=await t.call({message:'Tell me a short story.'});assert.equal(r.status,200);assert.equal(r.data.status,'degraded');assert.equal(r.data.messages.at(-1).source,'preset');assert.ok(!/secret upstream|private provider|fixture-key/.test(JSON.stringify(r.data)));}finally{t.h.store.close();}
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
    for(let i=0;i<18;i++)await t.call({message:'How far?'});
    assert.equal((await t.call({message:'How far?'})).status,429);
  }finally{t.h.store.close();}
});

test('invalid configuration is rejected and transient GPS invalidation preserves local tracking',async()=>{
  const c=config();c.places=[{id:'invalid'}];assert.throws(()=>validateGuideConfig(c));
  const t=setup();try{
    const remote=new RemoteTreasureSession({now:t.h.now,request:async()=>({ok:true,status:200,json:async()=>t.c.data})});
    remote.apply(t.c.data);remote.start(t.h.now());remote.loseLocation(t.h.now());
    assert.equal(remote.active,true);assert.equal(remote.snapshot(t.h.now()).eligible,false);assert.equal(remote.snapshot(t.h.now()).guidance,null);
    await remote.tail;assert.equal(remote.snapshot(t.h.now()).canClaim,false);
    t.h.advance(1);await remote.receive({latitude:0,longitude:0,accuracy:5,timestamp:t.h.now()});assert.equal(remote.gpsLost,false);
  }finally{t.h.store.close();}
});

function guideDom(){
  const nodes=new Map();let time=0;
  const node=id=>{if(!nodes.has(id))nodes.set(id,{hidden:false,disabled:false,value:'',textContent:'',attrs:{},children:[],addEventListener(n,fn){this[n]=fn;},setAttribute(n,v){this.attrs[n]=v;},replaceChildren(...x){this.children=x;},append(...x){this.children.push(...x);},focus(){}});return nodes.get(id);};
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
    store.db.prepare('UPDATE rooms SET zone=?,treasure_id=? WHERE code=?').run(JSON.stringify(zone),'fixture-round',player.room);
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
