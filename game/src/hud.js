// HUD text: the clock, the score line and the help footer, kept apart from the
// drawing code so the wording is easy to tune without touching the canvas.
import { SHIFT_SECONDS } from './config.js';
import { handItemLabel } from './ingredients.js';

/** "3:00" style clock for seconds left in the shift. */
export function formatClock(secondsLeft) {
  const s = Math.max(0, Math.ceil(secondsLeft));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** "2:34" style clock for a ticket's remaining seconds. */
export function formatTicketClock(secondsLeft) {
  return `${Math.max(0, Math.ceil(secondsLeft))}s`;
}

/** The score line shown in the top bar. */
export function scoreLine(kitchen) {
  return `Score ${kitchen.score}  ·  Served ${kitchen.served}`;
}

/** The combo badge text, or null when there is no combo running. */
export function comboLine(kitchen) {
  if (kitchen.combo < 2) return null;
  return `COMBO x${kitchen.combo}`;
}

/** What the chef is carrying, for the hand badge and the status line. */
export function handLine(kitchen) {
  return kitchen.hand ? handItemLabel(kitchen.hand) : 'Hands empty';
}

/** The one-line hint that tells a new player what to do right now. */
export function hintLine(kitchen) {
  if (kitchen.tickets.length === 0) return 'Orders are coming — grab ingredients from the bins below.';
  const first = kitchen.tickets[0];
  if (kitchen.hand) return `Carrying: ${handItemLabel(kitchen.hand)}. Grill, fry or chop it, then add it to the plate.`;
  if (kitchen.plate.stack.length > 0 || kitchen.plate.side) {
    return `Plate started. Next for #${first.ticketNo} ${first.name}: see the ticket. Click the ticket to serve.`;
  }
  return `Order #${first.ticketNo}: ${first.name}. Click bins (or keys 1-8) to grab ingredients.`;
}

export const HELP_LINES = [
  'Move: WASD / arrows · Click a bin or press 1-8 to grab · E: use nearest station',
  'Click the grill / fryer / board to cook · Click the plate to add · Click a ticket to serve',
  'Space: serve a matching order · T: trash the plate · P: pause · M: mute',
];

export const TITLE_LINES = [
  'Sizzle & Serve',
  'Run the busiest burger bistro in town: grill, chop, stack and serve before the tickets run out.',
];
