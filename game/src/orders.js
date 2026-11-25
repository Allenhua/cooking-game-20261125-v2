// Order tickets: what the guests want, how long they will wait, and what a
// finished dish earns. Tickets live on the order board at the top of the kitchen.
import { MENU, orderTimeLimit } from './config.js';

let nextTicketId = 1;

/** Build a fresh ticket from the menu, with a time limit that shrinks in a rush. */
export function createTicket(random, elapsedSeconds) {
  const dish = random.pick(MENU);
  const limit = orderTimeLimit(elapsedSeconds);
  const no = nextTicketId;
  nextTicketId += 1;
  return {
    id: no,
    ticketNo: no,
    dishId: dish.id,
    name: dish.name,
    price: dish.price,
    recipe: dish.recipe.slice(),
    side: dish.side,
    timeLeft: limit,
    timeLimit: limit,
    // A gentle bob so tickets feel alive on the board.
    bobPhase: random.next() * Math.PI * 2,
    served: false,
  };
}

/** Seconds left as a 0..1 fraction, for the ticket's countdown bar. */
export function ticketFraction(ticket) {
  return Math.max(0, ticket.timeLeft / ticket.timeLimit);
}

/** True when the ticket is nearly out of time and should flash red. */
export function ticketIsUrgent(ticket) {
  return ticket.timeLeft <= 10;
}

/** Score for serving this ticket with this much time to spare and a combo count. */
export function serveScore(ticket, combo) {
  const timeBonus = Math.round((ticket.timeLeft / ticket.timeLimit) * 50);
  const comboBonus = combo > 1 ? (combo - 1) * 25 : 0;
  return ticket.price + timeBonus + comboBonus;
}

/** The full ingredient list a ticket wants, burger plus its side. */
export function ticketWants(ticket) {
  const wants = ticket.recipe.slice();
  if (ticket.side) wants.push(ticket.side);
  return wants;
}
