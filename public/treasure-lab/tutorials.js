import { angleDelta } from './ar.js';

export const tutorials = Object.freeze([
  {
    id: 'create-room',
    title: 'Create a room',
    instructions: 'On the start screen, choose Create a room to host a new room. Guests enter a nickname and choose Create room. The host can share the code from Menu.',
  },
  {
    id: 'join-room',
    title: 'Join a room',
    instructions: 'Choose Join with a code, enter the host’s room code, then choose Join room. Guests also enter a nickname.',
  },
  {
    id: 'switch-indoor',
    title: 'Enable Indoor mode',
    instructions: 'The host opens Menu, selects Indoor, then enables motion. Switching modes with a treasure placed resets the round after confirmation.',
  },
  {
    id: 'hide-and-claim',
    title: 'Hide and claim a treasure',
    instructions: 'The host enables location or motion and hides a treasure. Move away, return, open AR, aim at the chest and press Claim when ready.',
  },
  {
    id: 'view-leaderboard',
    title: 'View the leaderboard',
    instructions: 'Sign in, open Leaderboard & Treasure Book from the start screen or room Menu, then select Leaderboard to see player ranks, finds and collection progress.',
  },
  {
    id: 'view-treasure-book',
    title: 'View the Treasure Book',
    instructions: 'Sign in, open Leaderboard & Treasure Book from the start screen or room Menu, then select Treasure Book to see your locked and unlocked treasure cards.',
  },
]);

export function availableTutorials(roomRole) {
  return tutorials.filter(({ id }) => {
    if (id === 'create-room' || id === 'join-room') return !roomRole;
    if (id === 'switch-indoor') return roomRole !== 'guest';
    return true;
  });
}

const instruction = (target, text, done = false) => ({ target, text, done });

function progressStep(tab, state) {
  const isBook = tab === 'book';
  if (state.sheet === 'progress') {
    if (!state.progressLoaded) return instruction('progress-status', 'This panel shows your progress as soon as it loads.');
    if (state.progressTab !== tab) return isBook
      ? instruction('progress-book', 'Choose Treasure Book to see your collection.')
      : instruction('progress-leaderboard', 'Choose Leaderboard to see the rankings.');
    return instruction('progress-summary', isBook
      ? 'Collection shows how many different cards you have found. Scroll down to see your locked and unlocked cards.'
      : 'Your rank, finds and collection count appear here. The table below lists the top players and their collection progress.', true);
  }
  if (state.sheet === 'account' && !state.signedIn) return instruction('account-form', state.screen === 'entry'
    ? 'Sign in or create an account here to see your progress.'
    : 'Create an account here to keep your room and see your progress. To use an existing account, leave the room and sign in from the start screen.');
  if (state.sheet && state.sheet !== 'menu') return instruction('sheet-close', 'Close this panel to continue the tutorial.');
  if (state.screen === 'entry') {
    if (!state.signedIn) return instruction('open-account', 'Sign in to see your rank and treasure collection.');
    if (state.entry !== 'home') return instruction('entry-cancel', 'Go back to the start screen to open your progress.');
    return instruction('open-progress-home', 'Open Leaderboard & Treasure Book.');
  }
  if (state.screen === 'camera') return instruction('stop-camera', 'Close the camera to access the room menu.');
  if (state.sheet !== 'menu') {
    if (isBook && state.signedIn && state.phase === 'collected' && !state.placing) {
      return instruction('open-progress-claim', 'Choose View Treasure Book to see your collection.');
    }
    return instruction('open-menu', 'Open Menu to find player progress.');
  }
  return state.signedIn
    ? instruction('open-progress-room', 'Open Leaderboard & Treasure Book.')
    : instruction('open-account-menu', 'Create an account to keep this room and see your progress.');
}

export function tutorialStep(id, state) {
  if (id === 'view-leaderboard') return progressStep('leaderboard', state);
  if (id === 'view-treasure-book') return progressStep('book', state);
  if (state.sheet && !(id === 'switch-indoor' && state.sheet === 'menu')) {
    return instruction('sheet-close', 'Close this panel to continue the tutorial.');
  }
  if (id === 'join-room') {
    if (state.screen !== 'entry') return instruction(null, 'You are in a room. The host can share its code from Menu.', true);
    if (state.entry === 'home') return instruction('show-join', 'Choose Join with a code to enter the host’s room.');
    if (state.entry !== 'join') return instruction('entry-cancel', 'Go back and choose Join with a code.');
    if (!state.codeReady) return instruction('room-code', 'Enter the room code shared by the host.');
    if (!state.nameReady) return instruction('nickname', 'Enter a nickname so other players can recognise you.');
    return instruction('entry-submit', 'Choose Join room when you are ready.');
  }
  if (id === 'create-room' && state.screen !== 'entry') return instruction(null, state.owner
    ? 'Your room is ready. Open Menu to copy its code and invite other players.'
    : 'Leave your current room to create your own from the start screen.', true);
  if (state.screen === 'entry') {
    if (state.entry === 'join') return instruction('entry-cancel', 'Go back to create your own room for this tutorial.');
    if (state.entry === 'home') return instruction('show-create', 'Create a room to play as its host.');
    if (!state.nameReady) return instruction('nickname', 'Enter a nickname for your room.');
    return instruction('entry-submit', 'Choose Create room when you are ready.');
  }
  if (id === 'switch-indoor') {
    if (!state.owner) return instruction(null, 'The room host can switch to Indoor from Menu.', true);
    if (state.screen === 'camera') return instruction('stop-camera', 'Close the camera to access the room menu.');
    if (state.pendingMode === 'indoor-ronin') {
      return instruction('mode-apply', 'Switching clears the current treasure and claims. Confirm when you are ready to start a new round.');
    }
    if (state.pendingMode) return instruction('mode-cancel', 'Cancel this mode change to choose Indoor.');
    if (!state.indoor) return state.sheet === 'menu'
      ? instruction('mode-ronin', 'Choose Indoor to use your phone’s motion readings.')
      : instruction('open-menu', 'Open Menu to find the game modes.');
    if (state.sheet === 'menu') return instruction('sheet-close', 'Close Menu to enable motion on the field screen.');
    if (state.phase === 'collected' && !state.placing) return instruction(null, 'Indoor is already selected. Start a new treasure to use motion again.', true);
    if (!state.tracking) return instruction('start-location', 'Tap Enable motion and allow access when your phone asks. Hold it steady to initialise.');
    return instruction(null, 'Indoor motion is enabled. You can hide a treasure when the phone is ready.', true);
  }
  if (state.phase === 'collected' && !state.placing) return instruction(null, 'The treasure is claimed. Signed-in finds count towards your Treasure Book.', true);
  if (!state.owner && state.indoor) return instruction(null, 'Indoor uses the host’s phone. Follow the round from the field screen.', true);
  if (!state.placed && !state.owner) return instruction('headline', 'Wait for the host to hide a treasure before starting the hunt.');
  if (!state.tracking) return instruction('start-location', state.indoor
    ? 'Enable motion and hold the phone steady to start.'
    : 'Turn on location and wait for a usable GPS reading.');
  if (!state.placed || state.placing) return instruction('place', 'Choose Hide treasure here when the location or motion reading is ready.');
  if (state.screen === 'camera') {
    if (state.claimReady) return instruction('claim', 'Tap Claim while the chest is lined up.');
    if (state.eligible) return instruction(state.reticleVisible ? 'aim-reticle' : 'ar-guidance', 'Turn the phone until the chest lines up with the centre marker. Hold steady to enable Claim.');
    if (state.phase === 'leave') return instruction('ar-guidance', 'Walk away from the hiding spot. When the arrow gives a direction, turn back towards the treasure.');
    return instruction('ar-guidance', 'Follow the direction and return towards the hiding spot. The chest appears when the nearby search is ready.');
  }
  if (state.phase === 'leave' && !state.indoor) return instruction('step-leave', 'Move beyond the starting area. Once the return step starts, open the AR camera.');
  return instruction('start-camera', 'Open the AR camera when it is available. Follow its direction to find the chest.');
}

export function mountTutorials({ document, window, onChange, onReturnToGuide = () => false }) {
  const get = id => document.getElementById(id);
  const overlay = get('tutorial-overlay');
  const card = get('tutorial-card');
  const spotlight = get('tutorial-spotlight');
  const arrow = get('tutorial-arrow');
  const choices = get('tutorial-choices');
  const close = get('close-tutorial');
  const heading = get('tutorial-title');
  const copy = get('tutorial-copy');
  const motionPreference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const fadeOutMs = 150, centerHoldMs = 80, flightMs = 420;
  let selected = null, choosing = false, revealFocusFrom = null;
  let currentStep = null, nextStep = null, scrollTarget = null;
  let center = null, destination = null, arrowPose = null, frame = null;
  const canAnimate = () => !motionPreference?.matches && Boolean(window.requestAnimationFrame && window.cancelAnimationFrame);
  choices.querySelectorAll?.('[data-tutorial]').forEach((button, index) => {
    button.style.setProperty('--tutorial-choice-delay', `${60 + index * 24}ms`);
    button.addEventListener('click', () => start(button.dataset.tutorial));
  });

  function isOpen() { return choosing || selected !== null; }
  function cancelFrame() {
    if (frame !== null) window.cancelAnimationFrame(frame);
    frame = null;
  }
  function resetSteps() {
    cancelFrame();
    currentStep = nextStep = null;
    scrollTarget = destination = null;
    overlay.dataset.stepPhase = 'ready';
    placeArrow(null);
  }
  function start(id, { fromGuide = false } = {}) {
    const tutorial = tutorials.find(item => item.id === id);
    if (!tutorial) return false;
    choosing = false;
    selected = tutorial;
    overlay.dataset.fromGuide = String(fromGuide);
    overlay.dataset.closing = 'false';
    revealFocusFrom = document.activeElement ?? document.body;
    resetSteps();
    onChange();
    return true;
  }
  function finishClose() {
    if (overlay.dataset.closing !== 'true') return;
    overlay.hidden = true;
    overlay.dataset.closing = 'false';
  }
  function dismiss(restoreFocus = true) {
    if (!isOpen()) {
      if (!restoreFocus) finishClose();
      return false;
    }
    const returnToGuide = restoreFocus && overlay.dataset.fromGuide === 'true';
    if (restoreFocus && !motionPreference?.matches) {
      // Close smoothly even if the tutorial is still fading in.
      overlay.style.setProperty('--tutorial-close-opacity', window.getComputedStyle?.(overlay).opacity ?? '1');
      overlay.dataset.closing = 'true';
    }
    cancelFrame();
    revealFocusFrom = null;
    choosing = false;
    selected = null;
    if (returnToGuide && onReturnToGuide()) return true;
    onChange();
    if (restoreFocus) get('open-tutorials').focus?.({ preventScroll: true });
    return true;
  }
  function openChoices() {
    selected = null;
    choosing = true;
    overlay.dataset.fromGuide = 'false';
    overlay.dataset.closing = 'false';
    revealFocusFrom = null;
    resetSteps();
    onChange();
    heading.focus?.({ preventScroll: true });
  }
  function placeArrow(pose) {
    if (pose && arrowPose && pose.x === arrowPose.x && pose.y === arrowPose.y && pose.angle === arrowPose.angle) return;
    arrowPose = pose;
    arrow.hidden = !pose;
    if (pose) arrow.style.transform = `translate3d(${pose.x}px,${pose.y}px,0) translate(-50%,-50%) rotate(${pose.angle}deg)`;
  }
  function layout() {
    if (!isOpen() || overlay.dataset.stepPhase === 'leaving') return;
    const viewport = window.visualViewport;
    const top = viewport?.offsetTop ?? 0;
    const height = viewport?.height ?? window.innerHeight;
    const leftEdge = viewport?.offsetLeft ?? 0;
    const width = viewport?.width ?? window.innerWidth;
    if (!height || !width) {
      destination = null;
      return;
    }
    const bottom = top + height, rightEdge = leftEdge + width;
    const bounds = overlay.getBoundingClientRect?.();
    const originX = bounds?.left ?? 0, originY = bounds?.top ?? 0;
    center = { x: leftEdge + width / 2 - originX, y: top + height / 2 - originY };
    overlay.style.setProperty('--tutorial-top', `${top}px`);
    overlay.style.setProperty('--tutorial-bottom', `${Math.max(0, window.innerHeight - bottom)}px`);
    overlay.style.setProperty('--tutorial-height', `${height}px`);
    const target = currentStep?.target;
    let rect = target?.getBoundingClientRect?.();
    if (rect && rect.width && rect.height && (rect.bottom < top + 16 || rect.top > bottom - 16) && target !== scrollTarget) {
      scrollTarget = target;
      target.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
      rect = target.getBoundingClientRect();
    }
    const visible = rect && rect.width && rect.height && rect.bottom > top && rect.top < bottom && rect.right > leftEdge && rect.left < rightEdge;
    overlay.dataset.target = String(Boolean(visible));
    spotlight.hidden = !visible;
    if (!visible) {
      destination = null;
      overlay.dataset.side = 'bottom';
      card.style.removeProperty?.('--tutorial-card-space');
      if (overlay.dataset.stepPhase === 'ready') placeArrow(null);
      return;
    }
    const left = Math.max(leftEdge, rect.left - 4), right = Math.min(rightEdge, rect.right + 4);
    const upper = Math.max(top, rect.top - 4), lower = Math.min(bottom, rect.bottom + 4);
    const above = upper - top, below = bottom - lower;
    const pointsDown = above > below;
    overlay.dataset.side = pointsDown ? 'top' : 'bottom';
    card.style.setProperty('--tutorial-card-space', `${Math.max(72, Math.max(above, below) - 38)}px`);
    spotlight.style.left = `${left - originX}px`;
    spotlight.style.top = `${upper - originY}px`;
    spotlight.style.width = `${right - left}px`;
    spotlight.style.height = `${lower - upper}px`;
    destination = { x: (left + right) / 2 - originX, y: (pointsDown ? upper - 18 : lower + 18) - originY,
      angle: pointsDown ? 180 : 0 };
    if (overlay.dataset.stepPhase === 'ready') placeArrow(destination);
  }
  function playPhase(duration, draw, finish) {
    let started;
    function tick(now) {
      frame = null;
      started ??= now;
      const elapsed = now - started;
      if (elapsed >= duration || motionPreference?.matches) {
        finish();
        return;
      }
      draw?.(elapsed);
      frame = window.requestAnimationFrame(tick);
    }
    frame = window.requestAnimationFrame(tick);
  }
  function showInstruction(text, done = false) {
    if (copy.textContent !== text) copy.textContent = text;
    close.textContent = done ? 'Done' : 'Close';
  }
  function revealStep() {
    placeArrow(destination);
    overlay.dataset.stepPhase = 'ready';
    showInstruction(currentStep.text, currentStep.done);
    if (revealFocusFrom && (document.activeElement === revealFocusFrom || document.activeElement === document.body)) {
      heading.focus?.({ preventScroll: true });
    }
    revealFocusFrom = null;
  }
  function flyToStep() {
    cancelFrame();
    if (currentStep?.target !== nextStep.target) scrollTarget = null;
    currentStep = nextStep;
    overlay.dataset.stepPhase = 'flying';
    layout();
    if (!destination || !canAnimate()) {
      revealStep();
      return;
    }
    const hold = arrowPose ? 0 : centerHoldMs;
    const from = arrowPose ?? { ...center,
      angle: Math.atan2(destination.x - center.x, center.y - destination.y) * 180 / Math.PI };
    placeArrow(from);
    playPhase(hold + flightMs, elapsed => {
      if (!destination) return;
      const t = Math.max(0, (elapsed - hold) / flightMs);
      const ease = t * t * (3 - 2 * t);
      placeArrow({ x: from.x + (destination.x - from.x) * ease, y: from.y + (destination.y - from.y) * ease,
        angle: from.angle + angleDelta(destination.angle, from.angle) * ease });
    }, () => {
      layout();
      revealStep();
    });
  }
  function sync(state) {
    const open = isOpen();
    overlay.hidden = !open && overlay.dataset.closing !== 'true';
    overlay.inert = !open;
    get('open-tutorials').setAttribute('aria-expanded', String(open));
    if (!open) return;
    const step = selected && tutorialStep(selected.id, state);
    const title = selected?.title || 'Tutorials';
    if (heading.textContent !== title) heading.textContent = title;
    choices.hidden = !choosing;
    overlay.dataset.choosing = String(choosing);
    card.setAttribute('role', choosing ? 'dialog' : 'region');
    if (choosing) card.setAttribute('aria-modal', 'true');
    else card.removeAttribute('aria-modal');
    if (!step) {
      showInstruction('Choose an activity to follow on this screen.');
      layout();
      return;
    }
    let target;
    if (step.target === 'sheet-close') {
      target = state.sheet === 'room-exit' ? get('cancel-room-exit') : get(`sheet-${state.sheet}`)?.querySelector?.('[data-close-sheet]');
    } else target = step.target ? get(step.target) : null;
    if (nextStep && target === nextStep.target && step.text === nextStep.text && step.done === nextStep.done) {
      layout();
      return;
    }
    nextStep = { ...step, target };
    if (overlay.dataset.stepPhase === 'leaving') return;
    if (currentStep && overlay.dataset.stepPhase === 'ready' && canAnimate()) {
      // A quick advance can interrupt the previous reveal. Fade from what is visible now.
      for (const detail of [card, spotlight]) {
        detail.style.setProperty('--tutorial-detail-opacity', window.getComputedStyle?.(detail).opacity ?? '1');
      }
      overlay.style.setProperty('--tutorial-exit-alpha', '1');
      overlay.dataset.stepPhase = 'leaving';
      playPhase(fadeOutMs, elapsed => {
        overlay.style.setProperty('--tutorial-exit-alpha', String(1 - elapsed / fadeOutMs));
      }, flyToStep);
    } else flyToStep();
  }
  get('open-tutorials').addEventListener('click', openChoices);
  close.addEventListener('click', () => dismiss());
  const endCloseMotion = event => {
    if (event.target === overlay && event.animationName === 'tutorial-overlay-exit') finishClose();
  };
  overlay.addEventListener('animationend', endCloseMotion);
  overlay.addEventListener('animationcancel', endCloseMotion);
  document.addEventListener('scroll', layout, true);
  window.addEventListener('resize', layout);
  window.visualViewport?.addEventListener('resize', layout);
  window.visualViewport?.addEventListener('scroll', layout);
  return { sync, start, dismiss, isOpen, isChoosing: () => choosing };
}
