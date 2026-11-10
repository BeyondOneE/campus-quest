import { availableTutorials } from './tutorials.js';

export function mountGuide({document,session,window={},now=()=>Date.now(),onToggle=()=>{},onTutorial=()=>{}}) {
  const $=id=>document.getElementById(id);
  const panel = $('guide-panel'), scrim = $('guide-scrim'), log = $('guide-messages');
  const bubbles = new Map();
  let active=false,open=false,busy=false,view=null,error='',nextPoll=0,nextDistance=0,lastPlace=null,lastGps=null;
  let generation=0,abort=null,identity='',roomKey='',shownMessages='';
  let camera=false,page='entry',tutorialOpen=false,pendingQuestion=null;
  let tutorialOffer = null, closingOffer = null;
  const enabled=()=>active&&typeof session.guideRequest==='function';
  function align(){
    const viewport=window.visualViewport;
    const height=viewport?.height??window.innerHeight;
    if(height)panel.style?.setProperty('--guide-visible-height',`${height}px`);
    const keyboard=viewport?Math.max(0,(window.innerHeight||viewport.height)-viewport.height-viewport.offsetTop):0;
    panel.style?.setProperty('--guide-keyboard',`${keyboard}px`);
    panel.setAttribute('data-keyboard',keyboard>80?'true':'false');
  }
  function trackViewport(on){for(const event of ['resize','scroll'])window.visualViewport?.[on?'addEventListener':'removeEventListener'](event,align);}
  function canOfferTutorial(id) {
    const player = session.data?.player;
    const role = player ? (player.role === 'owner' ? 'host' : 'guest') : null;
    return availableTutorials(role).some(tutorial => tutorial.id === id);
  }
  function clearTutorialOffer() {
    tutorialOffer?.element?.remove();
    tutorialOffer = null;
  }
  function renderTutorialOffer() {
    const offer = tutorialOffer;
    if (!offer || offer.element) return;
    const bubble = bubbles.get(offer.messageId);
    if (!bubble) return;

    const element = document.createElement('div'), prompt = document.createElement('p');
    const actions = document.createElement('div');
    const accept = document.createElement('button'), decline = document.createElement('button');
    element.className = 'guide-tutorial-offer';
    actions.className = 'guide-tutorial-actions';
    prompt.textContent = 'Would you like to open the interactive tutorial?';
    accept.type = decline.type = 'button';
    accept.className = 'chip guide-tutorial-open';
    decline.className = 'chip';
    accept.textContent = 'Open tutorial';
    decline.textContent = 'Not now';
    accept.addEventListener('click', () => {
      if (tutorialOffer !== offer || !open || tutorialOpen || !canOfferTutorial(offer.id)) return;
      // Keep the bubble's height steady as the chat panel fades out.
      closingOffer = element;
      tutorialOffer = null;
      toggle(false, false);
      onTutorial(offer.id);
    });
    decline.addEventListener('click', () => {
      if (tutorialOffer !== offer) return;
      clearTutorialOffer();
      panel.focus?.({ preventScroll: true });
    });
    actions.append(accept, decline);
    element.append(prompt, actions);
    bubble.article.append(element);
    offer.element = element;
  }
  function renderMessages() {
    const history = view?.messages || [];
    const messages = pendingQuestion ? [...history, pendingQuestion] : history;
    const key = JSON.stringify([messages, tutorialOffer?.messageId]);
    if (key === shownMessages) return;
    shownMessages = key;
    const justSent = pendingQuestion && !bubbles.has(pendingQuestion.id);
    const follow = justSent || (!open && !closingOffer) || !bubbles.size || log.scrollHeight - log.clientHeight - log.scrollTop <= 40;
    const animate = open && !tutorialOpen && (justSent || bubbles.size);
    const ids = new Set(messages.map(message => message.id));
    if (tutorialOffer && !ids.has(tutorialOffer.messageId)) clearTutorialOffer();
    for (const [id, bubble] of bubbles) {
      if (ids.has(id)) continue;
      bubble.article.remove();
      bubbles.delete(id);
    }
    for (const [index, message] of messages.entries()) {
      const sent = message.role === 'user';
      const name = sent ? 'You' : message.source === 'deepseek' ? 'Guide · AI' : 'Guide · Preset';
      const before = log.children?.[index];
      const existing = bubbles.get(message.id);
      if (existing) {
        if (before && before !== existing.article) {
          existing.article.removeAttribute('data-entering');
          log.insertBefore(existing.article, before);
        }
        if (existing.label.textContent !== name) existing.label.textContent = name;
        if (existing.text.textContent !== message.text) existing.text.textContent = message.text;
        continue;
      }
      const article = document.createElement('div'), label = document.createElement('strong'), text = document.createElement('span');
      article.className = 'guide-message guide-' + message.role;
      if (animate) article.setAttribute('data-entering', '');
      label.textContent = name;
      text.textContent = message.text;
      article.append(label, text);
      if (before) log.insertBefore(article, before);
      else log.append(article);
      bubbles.set(message.id, { article, label, text });
    }
    renderTutorialOffer();
    if (follow) log.scrollTop = log.scrollHeight;
  }
  function render(){
    const available = enabled(), canShow = available && !tutorialOpen, expanded = canShow && open;
    $('open-guide').hidden=!available;
    $('guide-controls').hidden=!available||!camera||open||tutorialOpen;
    if (!available && !panel.hidden) {
      for (const { article } of bubbles.values()) article.removeAttribute('data-entering');
    }
    // Let the closing chat transition finish while the tutorial fades in.
    panel.hidden = scrim.hidden = !available;
    panel.inert = !expanded;
    panel.setAttribute('data-open', String(expanded));
    scrim.setAttribute('data-open', String(expanded));
    panel.setAttribute('data-waiting', String(Boolean(pendingQuestion) && expanded));
    $('open-guide').setAttribute('aria-expanded', String(expanded));
    if(!available)return;
    align();
    $('guide-name').textContent=view?.name||'Campus Guide';
    const assistant=view?.messages?.filter(m=>m.role==='assistant').at(-1);
    const failures={AI_TIMEOUT:'AI timed out · try again',AI_NETWORK:'AI connection failed · try again',
      AI_AUTH:'AI configuration error',AI_RATE_LIMIT:'AI busy · try again shortly',AI_UPSTREAM:'AI service unavailable',
      AI_REPLY_TOO_LARGE:'AI reply was too large · try again',AI_REPLY_INCOMPLETE:'AI reply was interrupted · try again',
      AI_REPLY_INVALID:'AI reply could not be read · try again',AI_REPLY_EMPTY:'AI returned an empty reply · try again'};
    const status = error|| (pendingQuestion?'Thinking…':!view?'Connecting…':view.status==='degraded'?(failures[view.providerError]||'AI unavailable · preset reply'):!view.providerConfigured?'Preset guide · AI not connected':assistant?.source==='deepseek'?'DeepSeek · AI reply':'DeepSeek enabled · preset notice');
    if ($('guide-status').textContent !== status) $('guide-status').textContent = status;
    $('guide-preview').textContent=error||assistant?.text||'Ask about your surroundings or the treasure.';
    $('guide-send').disabled=busy; $('guide-input').disabled=false;
    $('guide-questions').hidden=!camera;
    for(const id of ['guide-distance','guide-place','guide-courses'])$(id).disabled=busy;
    renderMessages();
  }
  async function request(body){
    if(!enabled()||busy)return;
    const token=generation, requestedPage=page;
    if (body?.message) {
      clearTutorialOffer();
      pendingQuestion = { id: 'local-guide-question', role: 'user', text: body.message };
    }
    busy=true;error='';abort=new AbortController();render();
    try {
      const result=await session.guideRequest(body && {...body,page:requestedPage},abort.signal);
      if(token!==generation||!active||!result)return;
      if (pendingQuestion) {
        const echoed = result.messages?.findLast(message => message.role === 'user');
        const bubble = bubbles.get(pendingQuestion.id);
        // The accepted question already has a node. Adopt the server ID in place.
        if (bubble && echoed?.text === pendingQuestion.text && !bubbles.has(echoed.id)) {
          bubbles.delete(pendingQuestion.id);
          bubbles.set(echoed.id, bubble);
        }
        pendingQuestion = null;
      }
      view=result;
      const answer = result.messages?.at(-1);
      if (body?.message && result.accepted && requestedPage === page && !tutorialOpen
        && answer?.role === 'assistant' && canOfferTutorial(result.tutorialId)) {
        tutorialOffer = { id: result.tutorialId, messageId: answer.id };
      }
    }
    catch(e){if(token===generation&&active&&e.name!=='AbortError')error=e.message||'The guide is unavailable. Try again.';}
    finally {
      if(token===generation){
        const input = $('guide-input');
        if (pendingQuestion && !input.value) input.value = pendingQuestion.text;
        pendingQuestion=null;busy=false;abort=null;render();
      }
    }
  }
  function clearClosingOffer() {
    closingOffer?.remove();
    closingOffer = null;
  }
  function resetRequests(){generation++;abort?.abort();abort=null;busy=false;pendingQuestion=null;clearTutorialOffer();clearClosingOffer();error='';nextPoll=nextDistance=0;lastPlace=lastGps=null;}
  function sync(isActive,reading,{cameraActive=isActive,screen='entry',tutorial=false}={}){
    const key=session.account ? 'account:' + session.account.id : 'visitor';
    const room=session.data?.room, nextRoom=room ? room.code + ':' + room.treasureId : '';
    if(identity!==key){
      resetRequests();view=null;open=false;$('guide-input').value='';identity=key;
    }
    if(roomKey!==nextRoom){
      resetRequests();
      if(roomKey){view=null;shownMessages='';$('guide-input').value='';}
      roomKey=nextRoom;
    }
    if(active&&!isActive){resetRequests();open=false;}
    if(active!==isActive)trackViewport(isActive);
    if(camera!==cameraActive){nextPoll=0;lastGps=lastPlace=null;}
    active=isActive;
    camera=cameraActive;
    if (page !== screen || tutorial) clearTutorialOffer();
    page=screen;
    tutorialOpen=tutorial;
    render();
    if(!enabled()||busy||tutorialOpen||(!camera&&!open))return;
    if(now()>=nextPoll){nextPoll=now()+5000;request();return;}
    if(!view||open||!camera)return;
    const indoor=view.context.gps==='not-used';
    const gps=reading.canNavigate&&(view.context.gps==='available'||indoor);
    if(lastGps!==gps){const previous=lastGps;lastGps=gps;if(!gps){if(!indoor)request({event:'gps-lost'});return;}
      if(previous===false&&!indoor){request({event:'gps-restored'});return;}}
    if(!gps)return;
    const place=view.context.place?.id;
    if(place&&place!==lastPlace){lastPlace=place;request({event:'arrival'});return;}
    if(!place)lastPlace=null;
    if(now()>=nextDistance&&view.context.distanceMeters!==null){nextDistance=now()+30000;request({event:'distance'});}
  }
  function toggle(value,restoreFocus=true){
    if(value===open||value&&(!enabled()||tutorialOpen))return false;
    open=value;
    if(open){
      clearClosingOffer();
      if(!view)nextPoll=0;
    }else $('guide-input').blur?.();
    render();onToggle();
    if(open)panel.focus?.({preventScroll:true});
    else if(restoreFocus)$('open-guide').focus?.({preventScroll:true});
    return true;
  }
  function resumeAfterTutorial() {
    tutorialOpen = false;
    return toggle(true);
  }
  $('open-guide').addEventListener('click',()=>toggle(!open));
  $('guide-preview').addEventListener('click',()=>toggle(true));
  $('close-guide').addEventListener('click',()=>toggle(false));
  $('guide-scrim').addEventListener('click',()=>toggle(false));
  const endBubbleMotion = event => {
    if (event.animationName === 'guide-bubble-pop' || event.animationName === 'guide-bubble-fade') {
      event.target.removeAttribute('data-entering');
    }
  };
  log.addEventListener('animationend', endBubbleMotion);
  log.addEventListener('animationcancel', endBubbleMotion);
  $('guide-form').addEventListener('submit',event=>{event.preventDefault();const message=$('guide-input').value.trim();if(!message||busy)return;$('guide-input').value='';request({message});});
  for(const [id,message] of [['guide-distance','How far is the treasure?'],['guide-place','Tell me about the building around me.'],['guide-courses','What courses and subjects are taught here?']]){
    $(id).addEventListener('click',()=>request({message}));
  }
  return {sync,isOpen:()=>open&&active,resumeAfterTutorial,close:()=>toggle(false),stop:()=>{resetRequests();open=false;trackViewport(false);active=false;render();}};
}
