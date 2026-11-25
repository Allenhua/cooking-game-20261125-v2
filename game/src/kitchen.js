// The kitchen world: the chef, the stations, the tickets and the shift clock.
// One fixed step advances everything; actions are the verbs the player (or the
// screenshot autopilot) performs on it.
import {
  BIN_ORDER, BURN_SECONDS, CHOP_SECONDS, COMBO_WINDOW_SECONDS, FRY_SECONDS,
  GRILL_SECONDS, INGREDIENTS, MAX_HEARTS, MAX_TICKETS, SCORE, SHIFT_SECONDS,
  SPAWN_FIRST_SECONDS, spawnGap,
} from './config.js';
import { createTicket, serveScore } from './orders.js';
import { addToPlate, clearPlate, createPlate, plateMatchesTicket } from './assembly.js';
import { makeHandItem, PREP_BURNT, PREP_RAW, PREP_READY, prepStationFor } from './ingredients.js';

export const EVENT_NONE = 0;
export const EVENT_SERVE = 1;
export const EVENT_WRONG = 2;
export const EVENT_EXPIRE = 4;
export const EVENT_OVER = 8;
export const EVENT_NEW_ORDER = 16;
export const EVENT_BURNT = 32;
export const EVENT_DING = 64;

// Kitchen floor plan, in the 1280x720 view. The order board hangs above the
// floor; the ingredient bins line the bottom counter.
export const LAYOUT = {
  board: { x: 16, y: 70, w: 1248, h: 118 },
  ticket: { w: 300, h: 104, gap: 16 },
  grill: { x: 980, y: 210, w: 280, h: 120 },
  fryer: { x: 980, y: 350, w: 132, h: 110 },
  chop: { x: 830, y: 350, w: 132, h: 110 },
  plate: { x: 470, y: 330, w: 340, h: 150 },
  serve: { x: 16, y: 210, w: 300, h: 120 },
  trash: { x: 830, y: 210, w: 132, h: 60 },
  bins: { x: 16, y: 590, w: 1248, h: 118, gap: 8 },
  floor: { x: 0, y: 196, w: 1280, h: 380 },
};
export const CHEF_SPEED = 420;

function binRect(index) {
  const bins = LAYOUT.bins;
  const count = BIN_ORDER.length;
  const w = (bins.w - bins.gap * (count - 1)) / count;
  return { x: bins.x + index * (w + bins.gap), y: bins.y, w, h: bins.h, id: BIN_ORDER[index] };
}
export function binRectFor(id) {
  return binRect(BIN_ORDER.indexOf(id));
}
function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}
function rectCentre(r) {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

/** A fresh kitchen at the start of a shift. */
export function createKitchen(random) {
  return {
    random,
    elapsed: 0,
    shiftLeft: SHIFT_SECONDS,
    score: 0,
    served: 0,
    combo: 0,
    comboTimer: 0,
    hearts: MAX_HEARTS,
    over: false,
    chef: { x: 640, y: 480, tx: 640, ty: 480, dir: 1, moving: false },
    hand: null,
    grill: [null, null],
    fryer: null,
    chop: null,
    plate: createPlate(),
    tickets: [],
    spawnTimer: SPAWN_FIRST_SECONDS,
    toasts: [],
    particles: [],
    lastTickSecond: -1,
  };
}

/** Start a new shift in the same kitchen object. */
export function resetKitchen(kitchen) {
  const fresh = createKitchen(kitchen.random);
  for (const key of Object.keys(fresh)) kitchen[key] = fresh[key];
}

function toast(kitchen, text, kind) {
  kitchen.toasts.push({ text, kind, life: 2.2 });
  if (kitchen.toasts.length > 4) kitchen.toasts.shift();
}
function burst(kitchen, x, y, color, count = 14) {
  for (let i = 0; i < count; i += 1) {
    const a = kitchen.random.next() * Math.PI * 2;
    const speed = 40 + kitchen.random.next() * 120;
    kitchen.particles.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed - 40, life: 0.7, color });
  }
}

/** Walk the chef toward a point on the floor. */
export function walkChefTo(kitchen, x, y) {
  const floor = LAYOUT.floor;
  kitchen.chef.tx = Math.max(floor.x + 20, Math.min(floor.x + floor.w - 20, x));
  kitchen.chef.ty = Math.max(floor.y + 16, Math.min(floor.y + floor.h - 16, y));
}

/** Take an ingredient from its bin into the hand (hands must be empty). */
export function grabBin(kitchen, id) {
  if (kitchen.over || kitchen.hand) return false;
  if (!INGREDIENTS[id]) return false;
  kitchen.hand = makeHandItem(id);
  const c = rectCentre(binRectFor(id));
  walkChefTo(kitchen, c.x, c.y + 40);
  return true;
}

/** Put the hand item onto its station (grill, fryer or chopping board). */
export function placeOnStation(kitchen) {
  const item = kitchen.hand;
  if (!item || kitchen.over) return false;
  const station = prepStationFor(item);
  if (station === 'grill') {
    const slot = kitchen.grill.findIndex((s) => s === null);
    if (slot === -1) return false;
    kitchen.grill[slot] = { item, progress: 0, done: false };
    kitchen.hand = null;
    walkChefTo(kitchen, LAYOUT.grill.x + 60 + slot * 120, LAYOUT.grill.y + 60);
    return true;
  }
  if (station === 'fryer') {
    if (kitchen.fryer) return false;
    kitchen.fryer = { item, progress: 0, done: false };
    kitchen.hand = null;
    walkChefTo(kitchen, LAYOUT.fryer.x + 66, LAYOUT.fryer.y + 55);
    return true;
  }
  if (station === 'chop') {
    if (kitchen.chop) return false;
    kitchen.chop = { item, progress: 0, done: false };
    kitchen.hand = null;
    walkChefTo(kitchen, LAYOUT.chop.x + 66, LAYOUT.chop.y + 55);
    return true;
  }
  return false;
}

/** Take a finished item off a station into the hand. */
export function takeFromStation(kitchen, station, slot = 0) {
  if (kitchen.hand || kitchen.over) return false;
  if (station === 'grill') {
    const cell = kitchen.grill[slot];
    if (!cell || !cell.done) return false;
    kitchen.hand = cell.item;
    kitchen.grill[slot] = null;
    return true;
  }
  if (station === 'fryer') {
    if (!kitchen.fryer || !kitchen.fryer.done) return false;
    kitchen.hand = kitchen.fryer.item;
    kitchen.fryer = null;
    return true;
  }
  if (station === 'chop') {
    if (!kitchen.chop || !kitchen.chop.done) return false;
    kitchen.hand = kitchen.chop.item;
    kitchen.chop = null;
    return true;
  }
  return false;
}

/** Put the ready hand item onto the plate. */
export function addHandToPlate(kitchen) {
  if (!kitchen.hand || kitchen.over) return false;
  if (kitchen.hand.prep === PREP_BURNT) return false;
  if (kitchen.hand.prep !== PREP_READY) return false;
  const ok = addToPlate(kitchen.plate, kitchen.hand);
  if (ok) {
    const c = rectCentre(LAYOUT.plate);
    walkChefTo(kitchen, c.x, c.y + 90);
    burst(kitchen, c.x, c.y, '#f7c948', 6);
    kitchen.hand = null;
  }
  return ok;
}

/** Throw the plate's contents away and start the dish again. */
export function trashPlate(kitchen) {
  if (kitchen.over) return false;
  clearPlate(kitchen.plate);
  if (kitchen.hand && kitchen.hand.prep === PREP_BURNT) kitchen.hand = null;
  return true;
}

/** Serve the plate to a ticket; scores when it matches, stings when it does not. */
export function serveTicket(kitchen, ticketId) {
  if (kitchen.over) return EVENT_NONE;
  const index = kitchen.tickets.findIndex((t) => t.id === ticketId);
  if (index === -1) return EVENT_NONE;
  const ticket = kitchen.tickets[index];
  if (!plateMatchesTicket(kitchen.plate, ticket)) {
    kitchen.score = Math.max(0, kitchen.score + SCORE.wrongServe);
    kitchen.combo = 0;
    kitchen.comboTimer = 0;
    toast(kitchen, 'Wrong dish! That is not what they ordered.', 'bad');
    return EVENT_WRONG;
  }
  const now = kitchen.elapsed;
  const freshCombo = kitchen.comboTimer > 0 ? kitchen.combo + 1 : 1;
  const earned = serveScore(ticket, freshCombo);
  kitchen.score += earned;
  kitchen.served += 1;
  kitchen.combo = freshCombo;
  kitchen.comboTimer = COMBO_WINDOW_SECONDS;
  kitchen.tickets.splice(index, 1);
  clearPlate(kitchen.plate);
  const c = rectCentre(LAYOUT.serve);
  burst(kitchen, c.x + 150, c.y + 60, '#7bc96f', 20);
  burst(kitchen, c.x + 150, c.y + 60, '#f7c948', 12);
  toast(kitchen, `Served ${ticket.name}! +${earned}`, 'good');
  return EVENT_SERVE;
}

/** Serve the first ticket the plate matches, if any. */
export function serveFirstMatch(kitchen) {
  for (const ticket of kitchen.tickets) {
    if (plateMatchesTicket(kitchen.plate, ticket)) return serveTicket(kitchen, ticket.id);
  }
  return EVENT_WRONG;
}

/** The station nearest the chef, for the keyboard interact key. */
export function nearestStation(kitchen) {
  const chef = kitchen.chef;
  const candidates = [];
  if (kitchen.hand) {
    const station = prepStationFor(kitchen.hand);
    if (station === 'grill') candidates.push({ kind: 'place', x: LAYOUT.grill.x + 140, y: LAYOUT.grill.y + 60 });
    if (station === 'fryer') candidates.push({ kind: 'place', x: LAYOUT.fryer.x + 66, y: LAYOUT.fryer.y + 55 });
    if (station === 'chop') candidates.push({ kind: 'place', x: LAYOUT.chop.x + 66, y: LAYOUT.chop.y + 55 });
    if (kitchen.hand.prep === PREP_READY) candidates.push({ kind: 'plate', x: LAYOUT.plate.x + 170, y: LAYOUT.plate.y + 75 });
  } else {
    for (let i = 0; i < kitchen.grill.length; i += 1) {
      if (kitchen.grill[i] && kitchen.grill[i].done) candidates.push({ kind: 'take-grill', slot: i, x: LAYOUT.grill.x + 60 + i * 120, y: LAYOUT.grill.y + 60 });
    }
    if (kitchen.fryer && kitchen.fryer.done) candidates.push({ kind: 'take-fryer', x: LAYOUT.fryer.x + 66, y: LAYOUT.fryer.y + 55 });
    if (kitchen.chop && kitchen.chop.done) candidates.push({ kind: 'take-chop', x: LAYOUT.chop.x + 66, y: LAYOUT.chop.y + 55 });
  }
  let best = null;
  let bestDist = Infinity;
  for (const c of candidates) {
    const d = Math.hypot(c.x - chef.x, c.y - chef.y);
    if (d < bestDist) { bestDist = d; best = c; }
  }
  return bestDist < 320 ? best : null;
}

/** Run one interact action at the nearest station. Returns an event mask. */
export function interactNearest(kitchen) {
  const station = nearestStation(kitchen);
  if (!station) return EVENT_NONE;
  if (station.kind === 'place') return placeOnStation(kitchen) ? EVENT_NONE : EVENT_NONE;
  if (station.kind === 'plate') return addHandToPlate(kitchen) ? EVENT_NONE : EVENT_NONE;
  if (station.kind === 'take-grill') return takeFromStation(kitchen, 'grill', station.slot) ? EVENT_NONE : EVENT_NONE;
  if (station.kind === 'take-fryer') return takeFromStation(kitchen, 'fryer') ? EVENT_NONE : EVENT_NONE;
  if (station.kind === 'take-chop') return takeFromStation(kitchen, 'chop') ? EVENT_NONE : EVENT_NONE;
  return EVENT_NONE;
}

/**
 * What a click at (x, y) hits: a bin, a station, the plate, the trash or a
 * ticket. Returns an action string the caller can run, or null.
 */
export function hitTest(kitchen, x, y) {
  for (let i = 0; i < BIN_ORDER.length; i += 1) {
    const r = binRect(i);
    if (pointInRect(x, y, r)) return { action: 'bin', id: r.id };
  }
  if (pointInRect(x, y, LAYOUT.grill)) {
    const slot = x < LAYOUT.grill.x + LAYOUT.grill.w / 2 ? 0 : 1;
    return { action: 'grill', slot };
  }
  if (pointInRect(x, y, LAYOUT.fryer)) return { action: 'fryer' };
  if (pointInRect(x, y, LAYOUT.chop)) return { action: 'chop' };
  if (pointInRect(x, y, LAYOUT.plate)) return { action: 'plate' };
  if (pointInRect(x, y, LAYOUT.trash)) return { action: 'trash' };
  for (let i = 0; i < kitchen.tickets.length; i += 1) {
    const r = ticketRect(i);
    if (pointInRect(x, y, r)) return { action: 'ticket', id: kitchen.tickets[i].id };
  }
  return { action: 'walk', x, y };
}

export function ticketRect(index) {
  const t = LAYOUT.ticket;
  return { x: LAYOUT.board.x + 8 + index * (t.w + t.gap), y: LAYOUT.board.y + 7, w: t.w, h: t.h };
}

/** Run a click action. Returns an event mask. */
export function clickAction(kitchen, hit) {
  if (!hit || kitchen.over) return EVENT_NONE;
  if (hit.action === 'walk') { walkChefTo(kitchen, hit.x, hit.y); return EVENT_NONE; }
  if (hit.action === 'bin') { grabBin(kitchen, hit.id); return EVENT_NONE; }
  if (hit.action === 'grill') {
    const cell = kitchen.grill[hit.slot];
    if (cell && cell.done) { takeFromStation(kitchen, 'grill', hit.slot); return EVENT_NONE; }
    if (kitchen.hand && prepStationFor(kitchen.hand) === 'grill') { placeOnStation(kitchen); return EVENT_NONE; }
    return EVENT_NONE;
  }
  if (hit.action === 'fryer') {
    if (kitchen.fryer && kitchen.fryer.done) { takeFromStation(kitchen, 'fryer'); return EVENT_NONE; }
    if (kitchen.hand && prepStationFor(kitchen.hand) === 'fryer') { placeOnStation(kitchen); return EVENT_NONE; }
    return EVENT_NONE;
  }
  if (hit.action === 'chop') {
    if (kitchen.chop && kitchen.chop.done) { takeFromStation(kitchen, 'chop'); return EVENT_NONE; }
    if (kitchen.hand && prepStationFor(kitchen.hand) === 'chop') { placeOnStation(kitchen); return EVENT_NONE; }
    return EVENT_NONE;
  }
  if (hit.action === 'plate') {
    if (kitchen.hand) addHandToPlate(kitchen);
    return EVENT_NONE;
  }
  if (hit.action === 'trash') { trashPlate(kitchen); return EVENT_NONE; }
  if (hit.action === 'ticket') return serveTicket(kitchen, hit.id);
  return EVENT_NONE;
}

function cookCell(cell, dt, seconds, onDone) {
  if (!cell || cell.done) return;
  cell.progress += dt / seconds;
  if (cell.progress >= 1) {
    cell.progress = 1;
    cell.done = true;
    cell.item.prep = PREP_READY;
    onDone();
  }
}

/** Advance the kitchen by dt seconds. `move` is {x, y} keyboard direction. */
export function stepKitchen(kitchen, dt, move) {
  let events = EVENT_NONE;
  if (kitchen.over) return events;
  kitchen.elapsed += dt;
  kitchen.shiftLeft = Math.max(0, SHIFT_SECONDS - kitchen.elapsed);

  // Chef movement: keyboard direction overrides the walk target.
  const chef = kitchen.chef;
  if (move && (move.x !== 0 || move.y !== 0)) {
    const len = Math.hypot(move.x, move.y) || 1;
    chef.x += (move.x / len) * CHEF_SPEED * dt;
    chef.y += (move.y / len) * CHEF_SPEED * dt;
    chef.tx = chef.x;
    chef.ty = chef.y;
    chef.dir = move.x < 0 ? -1 : move.x > 0 ? 1 : chef.dir;
    chef.moving = true;
  } else {
    const dx = chef.tx - chef.x;
    const dy = chef.ty - chef.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 4) {
      const step = Math.min(dist, CHEF_SPEED * dt);
      chef.x += (dx / dist) * step;
      chef.y += (dy / dist) * step;
      chef.dir = dx < -4 ? -1 : dx > 4 ? 1 : chef.dir;
      chef.moving = true;
    } else {
      chef.moving = false;
    }
  }
  const floor = LAYOUT.floor;
  chef.x = Math.max(floor.x + 16, Math.min(floor.x + floor.w - 16, chef.x));
  chef.y = Math.max(floor.y + 14, Math.min(floor.y + floor.h - 14, chef.y));

  // Grill: cook, then burn if left too long.
  for (let i = 0; i < kitchen.grill.length; i += 1) {
    const cell = kitchen.grill[i];
    if (!cell) continue;
    if (!cell.done) {
      cookCell(cell, dt, GRILL_SECONDS, () => { events |= EVENT_DING; });
    } else {
      cell.burnTimer = (cell.burnTimer || 0) + dt;
      if (cell.burnTimer > BURN_SECONDS - GRILL_SECONDS) {
        cell.item.prep = PREP_BURNT;
        kitchen.grill[i] = { item: cell.item, progress: 1, done: false, burnt: true };
        toast(kitchen, 'A patty burnt on the grill!', 'bad');
        events |= EVENT_BURNT;
      }
    }
  }
  if (kitchen.fryer) cookCell(kitchen.fryer, dt, FRY_SECONDS, () => { events |= EVENT_DING; });
  if (kitchen.chop) cookCell(kitchen.chop, dt, CHOP_SECONDS, () => { events |= EVENT_DING; });

  // Tickets: countdown, expiry costs a heart.
  for (let i = kitchen.tickets.length - 1; i >= 0; i -= 1) {
    const ticket = kitchen.tickets[i];
    ticket.timeLeft -= dt;
    if (ticket.timeLeft <= 0) {
      kitchen.tickets.splice(i, 1);
      kitchen.hearts -= 1;
      kitchen.combo = 0;
      kitchen.comboTimer = 0;
      kitchen.score = Math.max(0, kitchen.score + SCORE.expired);
      toast(kitchen, `Order #${ticket.ticketNo} walked out! -1 heart`, 'bad');
      events |= EVENT_EXPIRE;
    }
  }

  // New orders arrive on a timer, up to the board's limit.
  kitchen.spawnTimer -= dt;
  if (kitchen.spawnTimer <= 0 && kitchen.tickets.length < MAX_TICKETS) {
    kitchen.tickets.push(createTicket(kitchen.random, kitchen.elapsed));
    kitchen.spawnTimer = spawnGap(kitchen.elapsed);
    events |= EVENT_NEW_ORDER;
  } else if (kitchen.spawnTimer <= 0) {
    kitchen.spawnTimer = 2;
  }

  // Combo fades when the window closes.
  if (kitchen.comboTimer > 0) {
    kitchen.comboTimer -= dt;
    if (kitchen.comboTimer <= 0) kitchen.combo = 0;
  }

  // Toasts and particles fade.
  for (let i = kitchen.toasts.length - 1; i >= 0; i -= 1) {
    kitchen.toasts[i].life -= dt;
    if (kitchen.toasts[i].life <= 0) kitchen.toasts.splice(i, 1);
  }
  for (let i = kitchen.particles.length - 1; i >= 0; i -= 1) {
    const p = kitchen.particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 160 * dt;
    if (p.life <= 0) kitchen.particles.splice(i, 1);
  }

  // Shift end or no hearts left ends the game.
  const wholeSecond = Math.floor(kitchen.shiftLeft);
  if (wholeSecond !== kitchen.lastTickSecond) {
    kitchen.lastTickSecond = wholeSecond;
    if (wholeSecond <= 10 && wholeSecond > 0) events |= EVENT_DING;
  }
  if (kitchen.shiftLeft <= 0 || kitchen.hearts <= 0) {
    kitchen.over = true;
    events |= EVENT_OVER;
  }
  return events;
}

/** Stars earned for the shift, 0..3, from dishes served. */
export function starsFor(kitchen) {
  if (kitchen.served >= 14) return 3;
  if (kitchen.served >= 9) return 2;
  if (kitchen.served >= 5) return 1;
  return 0;
}
