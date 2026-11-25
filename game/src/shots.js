// Screenshot scenes behind ?shot=start|play|end. Each one plays the real rules
// forward from a fresh kitchen for a fixed number of steps, steered by a small
// scripted cook: it grabs, grills, chops and stacks exactly like a player, so
// every frame is what a short real game looks like and the same seed always
// gives the same frame.
import { STEP } from './config.js';
import { clickAction, hitTest, resetKitchen, stepKitchen, LAYOUT } from './kitchen.js';
import { plateMatchesTicket } from './assembly.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 46;
const END_SECONDS = 200;
const SAMPLE = STEP;

/** Click at a canvas point, running the kitchen's real click action. */
function clickAt(kitchen, x, y) {
  clickAction(kitchen, hitTest(kitchen, x, y));
}

/** The scripted cook: a small queue of timed clicks that build real dishes. */
function cookScript(kitchen, t) {
  // t is elapsed seconds; each entry fires once when the clock passes it.
  // Strict one-item-at-a-time sequence: bun, patty and lettuce first, then
  // tomato, cheese, fries, a second patty and sauce, so the plate ends up a
  // tall, busy stack with a side — the dish mid-assembly the shots need.
  const plan = [
    [0.5, () => clickAt(kitchen, 90, 650)], // grab bun
    [0.9, () => clickAt(kitchen, 640, 400)], // add bun to plate
    [1.3, () => clickAt(kitchen, 245, 650)], // grab patty
    [1.7, () => clickAt(kitchen, 1050, 270)], // onto the grill
    [2.1, () => clickAt(kitchen, 555, 650)], // grab lettuce
    [2.5, () => clickAt(kitchen, 896, 405)], // onto the chop board
    [6.0, () => clickAt(kitchen, 1050, 270)], // take cooked patty
    [6.4, () => clickAt(kitchen, 640, 400)], // add patty to plate
    [6.8, () => clickAt(kitchen, 896, 405)], // take chopped lettuce
    [7.2, () => clickAt(kitchen, 640, 400)], // add lettuce to plate
    [7.6, () => clickAt(kitchen, 710, 650)], // grab tomato
    [8.0, () => clickAt(kitchen, 896, 405)], // onto the chop board
    [10.4, () => clickAt(kitchen, 896, 405)], // take chopped tomato
    [10.8, () => clickAt(kitchen, 640, 400)], // add tomato to plate
    [11.2, () => clickAt(kitchen, 400, 650)], // grab cheese
    [11.6, () => clickAt(kitchen, 640, 400)], // add cheese to plate
    [12.0, () => clickAt(kitchen, 1189, 650)], // grab fries
    [12.4, () => clickAt(kitchen, 1046, 405)], // into the fryer
    [15.6, () => clickAt(kitchen, 1046, 405)], // take fries
    [16.0, () => clickAt(kitchen, 640, 400)], // fries onto the plate side
    [16.5, () => clickAt(kitchen, 245, 650)], // grab patty two
    [16.9, () => clickAt(kitchen, 1050, 270)], // grill it
    [21.2, () => clickAt(kitchen, 1050, 270)], // take patty two
    [21.6, () => clickAt(kitchen, 640, 400)], // add to plate
    [22.0, () => clickAt(kitchen, 1032, 650)], // grab sauce
    [22.4, () => clickAt(kitchen, 640, 400)], // add sauce to plate
    [22.8, () => clickAt(kitchen, 875, 650)], // grab onion
    [23.2, () => clickAt(kitchen, 896, 405)], // onto the chop board
    [25.6, () => clickAt(kitchen, 896, 405)], // take chopped onion
    [26.0, () => clickAt(kitchen, 640, 400)], // add onion to plate
  ];
  return plan;
}

/**
 * Set `kitchen` to the named scene (start, play or end; any other name is start)
 * and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, kitchen) {
  resetKitchen(kitchen);
  if (name !== 'play' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / SAMPLE; i += 1) stepKitchen(kitchen, SAMPLE, { x: 0, y: 0 });
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const limit = name === 'end' ? END_SECONDS : PLAY_SECONDS;
  const plan = cookScript(kitchen, 0);
  let fired = 0;
  let steps = 0;
  for (let t = 0; t < limit; t += SAMPLE) {
    while (fired < plan.length && plan[fired][0] <= t) {
      plan[fired][1]();
      fired += 1;
    }
    // Serve whenever the plate matches a ticket, like a player would.
    for (const ticket of kitchen.tickets) {
      if (plateMatchesTicket(kitchen.plate, ticket)) {
        clickAction(kitchen, { action: 'ticket', id: ticket.id });
        break;
      }
    }
    const events = stepKitchen(kitchen, SAMPLE, { x: 0, y: 0 });
    steps += 1;
    if (kitchen.over) break;
  }
  const over = kitchen.over;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: kitchen.score };
}
