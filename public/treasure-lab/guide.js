// Camera companion only. Game receipts and coordinates remain owned by the backend.
export function mountGuide({document,session,window={},now=()=>Date.now(),onToggle=()=>{}}) {
  const $=id=>document.getElementById(id);
  let active=false,open=false,busy=false,view=null,error='',nextPoll=0,nextDistance=0,lastPlace=null,lastGps=null;
  let generation=0,abort=null,identity='',shownMessages='';
  const enabled=()=>active&&typeof session.guideRequest==='function';
  function align(){
    const viewport=window.visualViewport;
    const height=viewport?.height??window.innerHeight;
    if(height)$('guide-panel').style?.setProperty('--guide-visible-height',`${height}px`);
    const keyboard=viewport?Math.max(0,(window.innerHeight||viewport.height)-viewport.height-viewport.offsetTop):0;
    $('guide-panel').style?.setProperty('--guide-keyboard',`${keyboard}px`);
    $('guide-panel').setAttribute('data-keyboard',keyboard>80?'true':'false');
  }
  function trackViewport(on){for(const event of ['resize','scroll'])window.visualViewport?.[on?'addEventListener':'removeEventListener'](event,align);}
  function render(){
    $('guide-controls').hidden=!enabled();$('guide-panel').hidden=!enabled()||!open;
    $('open-guide').setAttribute('aria-expanded',String(open));
    if(!enabled())return;
    align();
    $('guide-name').textContent=view?.name||'Campus Guide';
    $('guide-status').textContent=error|| (busy?'Thinking…':view?.status==='degraded'?'AI unavailable · preset reply':view?.providerConfigured?'DeepSeek enabled':'Preset guide · AI not connected');
    const assistant=view?.messages?.filter(m=>m.role==='assistant').at(-1);
    $('guide-preview').textContent=error||assistant?.text||'Ask about your surroundings or the treasure.';
    $('guide-send').disabled=busy; $('guide-input').disabled=false;
    for(const id of ['guide-distance','guide-place','guide-courses'])$(id).disabled=busy;
    const key=JSON.stringify(view?.messages||[]);
    if(key!==shownMessages){
      shownMessages=key;
      $('guide-messages').replaceChildren(...(view?.messages||[]).map(m=>{
        const article=document.createElement('p');article.className=`guide-message guide-${m.role}`;
        const label=document.createElement('strong');label.textContent=m.role==='user'?'You':m.source==='deepseek'?'Guide · AI':'Guide · Preset';
        const text=document.createElement('span');text.textContent=m.text;article.append(label,text);return article;
      }));
      $('guide-messages').scrollTop=$('guide-messages').scrollHeight;
    }
  }
  async function request(body){
    if(!enabled()||busy)return;
    const token=generation;busy=true;error='';abort=new AbortController();render();
    try {const result=await session.guideRequest(body,abort.signal);if(token===generation&&active&&result)view=result;}
    catch(e){if(token===generation&&active&&e.name!=='AbortError')error=e.message||'The guide is unavailable. Try again.';}
    finally {if(token===generation){busy=false;abort=null;render();}}
  }
  function reset(){generation++;abort?.abort();abort=null;busy=false;view=null;error='';nextPoll=nextDistance=0;lastPlace=lastGps=null;shownMessages='';open=false;}
  function sync(isActive,reading){
    const key=session.data?`${session.data.player.id}:${session.data.room.code}:${session.data.room.treasureId}`:'';
    if(identity!==key){reset();identity=key;}
    if(active&&!isActive){reset();}
    if(active!==isActive)trackViewport(isActive);
    active=isActive;
    render();
    if(!enabled()||busy)return;
    if(now()>=nextPoll){nextPoll=now()+5000;request();return;}
    if(!view||open)return;
    const gps=reading.canNavigate&&view.context.gps==='available';
    if(lastGps!==gps){const previous=lastGps;lastGps=gps;if(!gps){request({event:'gps-lost'});return;}
      if(previous===false){request({event:'gps-restored'});return;}}
    if(!gps)return;
    const place=view.context.place?.id;
    if(place&&place!==lastPlace){lastPlace=place;request({event:'arrival'});return;}
    if(!place)lastPlace=null;
    if(now()>=nextDistance&&view.context.distanceMeters!==null){nextDistance=now()+30000;request({event:'distance'});}
  }
  function toggle(value){open=value;render();onToggle();if(open)$('guide-input').focus?.({preventScroll:true});else $('open-guide').focus?.({preventScroll:true});}
  $('open-guide').addEventListener('click',()=>toggle(!open));
  $('guide-preview').addEventListener('click',()=>toggle(true));
  $('close-guide').addEventListener('click',()=>toggle(false));
  $('guide-form').addEventListener('submit',event=>{event.preventDefault();const message=$('guide-input').value.trim();if(!message||busy)return;$('guide-input').value='';request({message});});
  for(const [id,message] of [['guide-distance','How far is the treasure?'],['guide-place','Tell me about the building around me.'],['guide-courses','What courses and subjects are taught here?']]){
    $(id).addEventListener('click',()=>request({message}));
  }
  return {sync,isOpen:()=>open&&active,stop:()=>{reset();trackViewport(false);active=false;render();}};
}
