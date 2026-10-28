import {useEffect,useRef,useState} from 'react';
import type {Quest} from './types';
import Lobby from './screens/Lobby';
import Routes from './screens/Routes';
import Hunt from './screens/Hunt';
import Clue from './screens/Clue';
import Puzzle from './screens/Puzzle';
import Results from './screens/Results';
const pages=[Lobby,Routes,Hunt,Clue,Puzzle,Results];
const paths=['lobby','routes','hunt','clue','puzzle','results'];
const titles=['Squad lobby','Choose your route','Explore in AR','Discover the clue','Solve together','Treasure unlocked'];
const routeNames=['Culture Trail','Tech Discovery','Lakeside Mystery'];
const initial={room:'7K3D',codeInput:'',name:'Alex',route:1,filter:'All',collected:false,answer:'',voice:true,sound:true,view:'',scanned:false,started:0,finished:0};
type State=typeof initial;
function readState():State {try{const s=JSON.parse(localStorage.getItem('xjtlu-quest-v1')||'null');if(!s)return initial;return {...initial,...s,route:[0,1,2].includes(s.route)?s.route:1};}catch{return initial;}}
function requestedPage(){const n=paths.indexOf(location.hash.slice(2));return n<0?0:n;}
export default function App(){
 const [state,setState]=useState(readState);
 const [step,setStep]=useState(requestedPage);
 const [modal,setModal]=useState('');
 const [notice,setNotice]=useState('');
 const [error,setError]=useState('');
 const [draft,setDraft]=useState('');
 const [scale,setScale]=useState(Math.min(1,window.innerWidth/390));
 const [clock,setClock]=useState(Date.now());
 const dialog=useRef<HTMLDialogElement>(null);
 const patch=(p:Partial<State>)=>setState(s=>({...s,...p}));
 const go=(n:number)=>{location.hash='/'+paths[n];setStep(n);setNotice('');setError('');window.scrollTo(0,0);};
 useEffect(()=>{localStorage.setItem('xjtlu-quest-v1',JSON.stringify(state));},[state]);
 useEffect(()=>{const fn=()=>{setStep(requestedPage());setError('');window.scrollTo(0,0)};window.addEventListener('hashchange',fn);const resize=()=>setScale(Math.min(1,window.innerWidth/390));window.addEventListener('resize',resize);return()=>{window.removeEventListener('hashchange',fn);window.removeEventListener('resize',resize)};},[]);
 useEffect(()=>{if(step>=4&&!state.collected){go(3);}else if(step===5&&!state.finished){go(4);}},[step,state.collected,state.finished]);
 useEffect(()=>{if(modal)dialog.current?.showModal();else dialog.current?.close();},[modal]);
 useEffect(()=>{if(!notice)return;const id=setTimeout(()=>setNotice(''),4200);return()=>clearTimeout(id)},[notice]);
 useEffect(()=>{const id=setInterval(()=>setClock(Date.now()),1000);return()=>clearInterval(id)},[]);
 const sec=state.started?Math.max(0,Math.floor(((state.finished||clock)-state.started)/1000)):0;
 const elapsed=`${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;
 const score=[750,1280,1850][state.route];
 const q:Quest={...state,routeName:routeNames[state.route],score,elapsed};
 const copy=async(text:string)=>{try{await navigator.clipboard.writeText(text);setNotice('Copied to clipboard.');}catch{setDraft(text);setModal('Copy this text');}};
 const restart=()=>{patch({collected:false,answer:'',scanned:false,started:0,finished:0,view:'',filter:'All'});go(1)};
 const act=(a:string,v?:string)=>{
  setError('');
  if(a==='code'){patch({codeInput:(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'')});return;}
  if(a==='route'){patch({route:Number(v)});setNotice(`${routeNames[Number(v)]} selected for your demo squad.`);return;}
  if(['All','Easy','Medium','Hard'].includes(a)){patch({filter:a});return;}
  if(['ACTION','VISION','ENERGY','WISDOM'].includes(a)){patch({answer:a});return;}
  switch(a){
   case 'START ADVENTURE':go(1);break;
   case 'Confirm & Enter AR Hunt':patch({started:Date.now(),finished:0,collected:false,answer:'',scanned:false});go(2);break;
   case 'Inspect AR Clue':go(3);break;
   case 'Return to AR Hunt':go(2);break;
   case 'OPEN PALM TO COLLECT CLUE':patch({collected:true});setNotice('Clue collected. The inscription is unlocked.');break;
   case 'Collaborate on Puzzle':if(state.collected)go(4);break;
   case 'SOLVE TOGETHER & UNLOCK TREASURE':if(state.answer==='ACTION'){patch({finished:Date.now()});go(5);}else{setError(state.answer?'That key does not match the inscription. Find the word that shapes the future.':'Select a key for Node Gamma first.');}break;
   case 'PLAY AGAIN':restart();break;
   case 'Squad Lobby':go(0);break;
   case '7K3D':case 'Copy Code':case 'Lucide_share-2_Outlined':void copy(state.room);break;
   case 'Share Quest':void copy(`XJTLU AR Campus Quest — ${routeNames[state.route]} completed! ${score} points in ${elapsed}. Room ${state.room}. (Demo)`);break;
   case 'Switch Room':if(!/^[A-Z0-9]{4}$/.test(state.codeInput)){setError('Enter a 4-character room code, using letters or numbers.');}else{patch({room:state.codeInput,codeInput:'',collected:false,answer:'',started:0,finished:0});setNotice('Joined demo room. Teammates are simulated.');}break;
   case 'Lucide_refresh-cw_Outlined':{const bytes=crypto.getRandomValues(new Uint8Array(4));const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';patch({room:Array.from(bytes,b=>chars[b%chars.length]).join('')});setNotice('New demo room created.');break;}
   case 'Student Auth':setDraft(state.name);setModal('Your explorer profile');break;
   case 'Squad Assembly':setNotice('Your demo squad is ready. Start your adventure below.');break;
   case 'Voice Live':patch({voice:!state.voice});setNotice(state.voice?'Demo voice muted.':'Demo voice enabled. No microphone audio is recorded.');break;
   case 'Lucide_volume-2_Outlined':patch({sound:!state.sound});setNotice(state.sound?'Sound off.':'Sound on.');break;
   case 'Lucide_settings_Outlined':setModal('Quest settings');break;
   case 'Sonar Scan':patch({scanned:true});setNotice('Demo scan complete: a clue is 0.8 m away. Tap Inspect AR Clue.');break;
   case 'Calibrate':setNotice('Demo view calibrated. Real GPS and AR hardware are not connected.');break;
   case 'AI Hint':setModal('Quest companion');break;
   case 'Explain Solution':setModal('Cipher explanation');break;
   case '✕':patch({view:'hint-hidden'});setNotice('Scout hint dismissed.');break;
   case 'Visual Riddle':case 'Inscription Plaque':case 'Dual HUD':case 'Teammate A':case 'Teammate B':case 'Tactical AR':patch({view:a});setModal(a);break;
   default:setNotice(a);
  }
 };
 const Screen=pages[step];
 return <div className="app-shell">
  <aside className="journey"><a className="brand" href="#/lobby"><span className="brand-symbol">◈</span> XJTLU <b>AR QUEST</b></a><div className="eyebrow">TAICANG CAMPUS / EXPEDITION 01</div><h1>Different encounters.<br/><em>One wider world.</em></h1><p>Follow the clues. Connect your perspectives. Discover your campus together.</p>
   <nav aria-label="Quest progress">{titles.map((t,i)=><button key={t} className={i===step?'current':''} disabled={i>step} onClick={()=>go(i)} aria-current={i===step?'step':undefined}><span>{String(i+1).padStart(2,'0')}</span>{t}{i<step&&<small>✓</small>}</button>)}</nav>
   <div className="mission-card"><span className="eyebrow">YOUR EXPEDITION</span><strong>{q.routeName}</strong><div>Room <b>{state.room}</b><span>{elapsed}</span></div><div className="meter"><i style={{width:`${(step+1)/6*100}%`}}/></div><small>{step+1} of 6 stages · {state.collected?'Clue secured':'Discover together'}</small></div>
   <div className="demo-note"><span>●</span> Interactive demo<p>AR scenes, teammates, voice and hints are simulated. Your progress is saved on this device.</p></div>
  </aside>
  <main className="experience"><header className="experience-bar"><button onClick={()=>go(Math.max(0,step-1))} disabled={step===0} aria-label="Previous stage">← Back</button><span>{String(step+1).padStart(2,'0')} / 06</span><span className="demo-pill">DEMO</span></header>
   <div className="phone-frame" style={{zoom:scale}}><Screen q={q} act={act}/></div>
   <footer className="experience-footer">XJTLU AR CAMPUS QUEST <span>Explore · Connect · Discover</span></footer>
  </main>
  {notice&&<div className="toast" role="status">✓ {notice}</div>}
  {error&&<div className="error-toast" role="alert">{error}<button onClick={()=>setError('')} aria-label="Dismiss error">×</button></div>}
  <dialog ref={dialog} onCancel={()=>setModal('')} onClick={e=>{if(e.target===e.currentTarget)setModal('')}}><div className="modal-heading"><span className="eyebrow">XJTLU AR QUEST</span><button onClick={()=>setModal('')} aria-label="Close dialog">×</button></div><h2>{modal}</h2>
   {modal==='Your explorer profile'?<form onSubmit={e=>{e.preventDefault();if(!draft.trim())return;patch({name:draft.trim()});setModal('');setNotice('Explorer profile saved.')}}><p>Choose a display name for this demo. University sign-in is not connected.</p><label>Explorer name<input value={draft} onChange={e=>setDraft(e.target.value)} maxLength={20} required autoFocus/></label><button className="primary">Save profile</button></form>:
   modal==='Quest settings'?<><label className="switch-row">Sound preference<input type="checkbox" checked={state.sound} onChange={e=>patch({sound:e.target.checked})}/></label><label className="switch-row">Demo voice<input type="checkbox" checked={state.voice} onChange={e=>patch({voice:e.target.checked})}/></label><p>Demo mode uses illustrated AR scenes and simulated teammates. No camera, microphone, GPS, or real student authentication is active.</p><button className="primary" onClick={()=>{setModal('');restart()}}>Start a new expedition</button></>:
   modal==='Copy this text'?<textarea readOnly value={draft} aria-label="Text to copy"/>:
   modal==='Quest companion'?<><p className="hint-label">PREWRITTEN DEMO HINT · STAGE {step+1}</p><p>{['Your three-person demo squad is ready. Enter a room code or start your adventure.','Choose a route that fits your time and difficulty preference.','Run a sonar scan, then inspect the AR clue near the courtyard.','Collect the holographic cube to unlock the inscription and continue to the puzzle.','Read “Water mirrors the world · Action shapes the future.” Which word shapes the future?','Your expedition is complete. Share your result or try another route.'][step]}</p></>:
   modal==='Cipher explanation'?<><p>Node Gamma asks for the key connected to “shapes the future.” The inscription reads:</p><blockquote>Water mirrors the world.<br/><b>Action</b> shapes the future.</blockquote><p>Select <b>ACTION</b>, then unlock the treasure. Teammate agreement is simulated in this demo.</p></>:
   ['Teammate A','Visual Riddle','Tactical AR'].includes(modal)?<><img className="clue-preview" src="./assets/find-preview.webp" alt="Campus visual clue"/><p>Visual channel: inspect the campus landmark and match optical target #03 with the inscription.</p></>:
   ['Teammate B','Inscription Plaque'].includes(modal)?<><blockquote>Water mirrors the world.<br/>Action shapes the future.</blockquote><p>Cipher channel: find the word that shapes the future.</p></>:
   <><p><b>Visual channel:</b> optical target #03 at the campus landmark.</p><blockquote>Water mirrors the world.<br/>Action shapes the future.</blockquote><p>Combine both perspectives to select the key for Node Gamma.</p></>}
   <button className="secondary" onClick={()=>setModal('')}>Return to quest</button>
  </dialog>
 </div>
}
