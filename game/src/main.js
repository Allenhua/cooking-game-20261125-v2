// Boot and the one loop: input is read every frame, the kitchen advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between four screens: title,
// play, paused and game over.
//
// ?seed=N fixes the order pattern. ?shot=start|play|end (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import {
  EVENT_BURNT, EVENT_DING, EVENT_EXPIRE, EVENT_NEW_ORDER, EVENT_OVER,
  EVENT_SERVE, EVENT_WRONG, clickAction, createKitchen, grabBin, hitTest,
  interactNearest, resetKitchen, serveFirstMatch, stepKitchen, trashPlate,
} from './kitchen.js';
import { createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const kitchen = createKitchen(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function announce(text) {
  status.textContent = text;
}

function handleEvents(events) {
  if (events & EVENT_SERVE) { audio.sfx.serve(); }
  if (events & EVENT_WRONG) { audio.sfx.wrong(); }
  if (events & EVENT_EXPIRE) { audio.sfx.expire(); }
  if (events & EVENT_BURNT) { audio.sfx.wrong(); }
  if (events & EVENT_DING) { audio.sfx.ding(); }
  if (events & EVENT_NEW_ORDER) { audio.sfx.sizzle(); }
}

function runShot(name) {
  const scene = stageShot(name, kitchen);
  let painted = 0;
  function paint() {
    renderer.draw(kitchen, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  function startShift() {
    resetKitchen(kitchen);
    screen = SCREEN_PLAY;
    audio.ensure();
    audio.startMusic();
    audio.sfx.start();
    announce('Shift started. Serve the orders before their timers run out.');
  }

  function endShift() {
    screen = SCREEN_OVER;
    audio.sfx.over();
    audio.stopMusic();
    if (kitchen.score > best) {
      best = kitchen.score;
      saveBest(best);
    }
    announce(`Shift over. Score ${kitchen.score}, ${kitchen.served} dishes served.`);
  }

  function frame(now) {
    const elapsed = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    accumulator += elapsed;

    // Title screen keys.
    if (screen === SCREEN_TITLE && (input.wasPressed('Enter') || input.wasPressed(' '))) startShift();
    if (screen === SCREEN_OVER && (input.wasPressed('r') || input.wasPressed('Enter'))) startShift();
    if (input.wasPressed('p') && (screen === SCREEN_PLAY || screen === SCREEN_PAUSED)) {
      screen = screen === SCREEN_PLAY ? SCREEN_PAUSED : SCREEN_PLAY;
    }
    if (input.wasPressed('m')) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound muted.' : 'Sound on.');
    }

    if (screen === SCREEN_PLAY) {
      // Clicks first: each one runs the kitchen's real click action.
      for (const click of input.drainClicks()) {
        const events = clickAction(kitchen, hitTest(kitchen, click.x, click.y));
        handleEvents(events);
        if (kitchen.over) break;
      }
      // Number keys grab bins; E uses the nearest station; Space serves.
      const bin = input.binPressed();
      if (bin) {
        if (grabBin(kitchen, bin)) audio.sfx.grab();
      }
      if (input.wasPressed('e')) {
        interactNearest(kitchen);
        audio.sfx.grab();
      }
      if (input.wasPressed(' ')) {
        const events = serveFirstMatch(kitchen);
        handleEvents(events);
      }
      if (input.wasPressed('t')) {
        trashPlate(kitchen);
        audio.sfx.trash();
      }
      // Fixed-step simulation.
      while (accumulator >= STEP) {
        accumulator -= STEP;
        const events = stepKitchen(kitchen, STEP, input.moveVector());
        handleEvents(events);
        if (events & EVENT_OVER) { endShift(); break; }
      }
    } else {
      input.drainClicks();
      accumulator = 0;
    }

    renderer.draw(kitchen, screen, best);
    input.endFrame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
