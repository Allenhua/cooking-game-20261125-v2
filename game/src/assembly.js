// The plate mid-assembly: the stack the player builds in the middle of the
// counter, and the match check that decides whether a ticket can be served.
import { INGREDIENTS } from './config.js';
import { itemIsReady } from './ingredients.js';

/** An empty plate, waiting for its first ingredient. */
export function createPlate() {
  return { stack: [], side: null };
}

/** Add a ready hand item to the plate; returns false when it cannot go on. */
export function addToPlate(plate, item) {
  if (!itemIsReady(item)) return false;
  if (INGREDIENTS[item.id].side) {
    if (plate.side !== null) return false;
    plate.side = item.id;
    return true;
  }
  if (plate.stack.length >= 6) return false;
  plate.stack.push(item.id);
  return true;
}

/** Empty the plate into the bin. */
export function clearPlate(plate) {
  plate.stack.length = 0;
  plate.side = null;
}

/** True when the plate holds exactly what the ticket asked for, in any order. */
export function plateMatchesTicket(plate, ticket) {
  if (plate.side !== ticket.side) return false;
  if (plate.stack.length !== ticket.recipe.length) return false;
  const have = {};
  for (const id of plate.stack) have[id] = (have[id] || 0) + 1;
  for (const id of ticket.recipe) {
    if (!have[id]) return false;
    have[id] -= 1;
  }
  return true;
}

/** How many of the ticket's ingredients are already on the plate. */
export function plateMatchCount(plate, ticket) {
  const have = {};
  for (const id of plate.stack) have[id] = (have[id] || 0) + 1;
  let count = 0;
  for (const id of ticket.recipe) {
    if (have[id]) { count += 1; have[id] -= 1; }
  }
  if (ticket.side && plate.side === ticket.side) count += 1;
  return count;
}

/** How many items the ticket wants in total, burger plus side. */
export function ticketItemCount(ticket) {
  return ticket.recipe.length + (ticket.side ? 1 : 0);
}
