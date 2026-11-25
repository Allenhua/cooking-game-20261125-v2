// All canvas drawing: the kitchen, the order board, the food, the chef and the
// title / pause / game-over screens. Nothing here changes the game state.
import { BIN_ORDER, INGREDIENTS, SHIFT_SECONDS, VIEW } from './config.js';
import { LAYOUT, binRectFor, ticketRect } from './kitchen.js';
import { ticketFraction, ticketIsUrgent, ticketWants } from './orders.js';
import { ticketItemCount, plateMatchCount, plateMatchesTicket } from './assembly.js';
import { comboLine, formatClock, formatTicketClock, handLine, HELP_LINES, hintLine, scoreLine, TITLE_LINES } from './hud.js';
import { PREP_BURNT } from './ingredients.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const FONT = "'Trebuchet MS', 'Segoe UI', sans-serif";

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align = 'left', weight = 'bold') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function progressBar(ctx, x, y, w, h, frac, color, bg = '#3a2c22') {
  ctx.fillStyle = bg;
  rr(ctx, x, y, w, h, h / 2);
  ctx.fill();
  if (frac > 0) {
    ctx.fillStyle = color;
    rr(ctx, x, y, Math.max(h, w * Math.min(1, frac)), h, h / 2);
    ctx.fill();
  }
}

/** Draw one ingredient as a little flat food icon. */
export function drawIngredient(ctx, id, cx, cy, size, prep = 'ready') {
  const def = INGREDIENTS[id];
  const s = size;
  ctx.save();
  ctx.translate(cx, cy);
  if (prep === PREP_BURNT) ctx.globalAlpha = 0.85;
  switch (def.kind) {
    case 'bun': {
      ctx.fillStyle = prep === PREP_BURNT ? '#3a2a1a' : def.color;
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.08, s * 0.5, s * 0.3, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = prep === PREP_BURNT ? '#2a1d10' : def.dark;
      ctx.fillRect(-s * 0.5, -s * 0.1, s, s * 0.14);
      ctx.fillStyle = '#fff3c4';
      for (const [sx, sy] of [[-0.25, -0.28], [0, -0.36], [0.25, -0.28]]) {
        ctx.beginPath(); ctx.arc(sx * s, sy * s, s * 0.045, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case 'patty': {
      ctx.fillStyle = prep === PREP_BURNT ? '#241708' : def.color;
      rr(ctx, -s * 0.5, -s * 0.14, s, s * 0.3, s * 0.12);
      ctx.fill();
      ctx.fillStyle = prep === PREP_BURNT ? '#1a0f04' : def.dark;
      for (let i = -2; i <= 2; i += 1) { ctx.beginPath(); ctx.arc(i * s * 0.18, 0, s * 0.05, 0, Math.PI * 2); ctx.fill(); }
      break;
    }
    case 'cheese': {
      ctx.fillStyle = prep === PREP_BURNT ? '#4a3a10' : def.color;
      ctx.beginPath();
      ctx.moveTo(-s * 0.5, -s * 0.2); ctx.lineTo(s * 0.5, -s * 0.2); ctx.lineTo(s * 0.3, s * 0.22);
      ctx.lineTo(-s * 0.1, s * 0.05); ctx.lineTo(-s * 0.5, s * 0.22); ctx.closePath(); ctx.fill();
      break;
    }
    case 'lettuce': {
      ctx.fillStyle = def.color;
      ctx.beginPath();
      for (let i = 0; i < 5; i += 1) {
        const a = (i / 5) * Math.PI * 2;
        ctx.ellipse(Math.cos(a) * s * 0.22, Math.sin(a) * s * 0.12, s * 0.22, s * 0.13, a, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.fillStyle = def.dark;
      ctx.beginPath(); ctx.ellipse(0, 0, s * 0.3, s * 0.1, 0, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'tomato': {
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.arc(0, 0, s * 0.42, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f28a6d';
      ctx.beginPath(); ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = def.dark;
      ctx.beginPath(); ctx.arc(0, 0, s * 0.1, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'onion': {
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.arc(0, 0, s * 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = def.dark; ctx.lineWidth = s * 0.06;
      for (const r of [0.28, 0.16]) { ctx.beginPath(); ctx.arc(0, 0, s * r, 0, Math.PI * 2); ctx.stroke(); }
      break;
    }
    case 'sauce': {
      ctx.fillStyle = '#fff7d6';
      ctx.beginPath(); ctx.ellipse(0, 0, s * 0.42, s * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = def.color; ctx.lineWidth = s * 0.12; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-s * 0.3, -s * 0.05); ctx.quadraticCurveTo(0, s * 0.18, s * 0.3, -s * 0.05); ctx.stroke();
      break;
    }
    case 'fries': {
      ctx.fillStyle = '#d94f30';
      rr(ctx, -s * 0.34, -s * 0.05, s * 0.68, s * 0.42, s * 0.08); ctx.fill();
      ctx.fillStyle = def.color;
      for (let i = -2; i <= 2; i += 1) ctx.fillRect(i * s * 0.13 - s * 0.045, -s * 0.42, s * 0.09, s * 0.5);
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.round(s * 0.22)}px ${FONT}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('FRIES', 0, s * 0.18);
      break;
    }
    default:
      break;
  }
  ctx.restore();
}

/** Draw the stacked burger on the plate, bottom bun first. */
function drawPlateStack(ctx, plate, cx, baseY, size) {
  const items = plate.stack.slice();
  let y = baseY;
  // Tight layers so a tall stack reads as one burger mound, not icons
  // floating apart above the plate.
  const step = size * 0.12;
  for (const id of items) {
    drawIngredient(ctx, id, cx, y, size);
    y -= step;
  }
  if (plate.side) drawIngredient(ctx, plate.side, cx + size * 0.85, baseY - size * 0.1, size * 0.7);
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = VIEW.width;
  canvas.height = VIEW.height;

  function fit() {
    const scale = Math.min(window.innerWidth / VIEW.width, window.innerHeight / VIEW.height);
    canvas.style.width = `${Math.floor(VIEW.width * scale)}px`;
    canvas.style.height = `${Math.floor(VIEW.height * scale)}px`;
  }
  window.addEventListener('resize', fit);
  fit();

  function drawWallAndFloor() {
    ctx.fillStyle = '#f6e7c8';
    ctx.fillRect(0, 0, VIEW.width, 196);
    ctx.fillStyle = '#e8d3a8';
    for (let x = 0; x < VIEW.width; x += 80) ctx.fillRect(x, 180, 78, 16);
    ctx.fillStyle = '#b8e0f0';
    for (let x = 0; x < VIEW.width; x += 160) {
      ctx.fillStyle = '#cfeefb';
      ctx.fillRect(x + 8, 12, 144, 44);
      ctx.fillStyle = '#9ecfe8';
      ctx.fillRect(x + 8, 12, 144, 6);
    }
    ctx.fillStyle = '#7a5c3e';
    ctx.fillRect(0, 196, VIEW.width, 384);
    // Checkerboard floor tiles so the middle of the kitchen reads as a floor,
    // not one flat brown slab.
    for (let ty = 196; ty < 580; ty += 48) {
      for (let tx = 0; tx < VIEW.width; tx += 96) {
        if (((tx / 96) + ((ty - 196) / 48)) % 2 === 0) {
          ctx.fillStyle = '#86684a';
          ctx.fillRect(tx, ty, 96, 48);
        }
      }
    }
    ctx.fillStyle = 'rgba(93, 70, 48, 0.55)';
    for (let y = 196; y < 580; y += 48) ctx.fillRect(0, y, VIEW.width, 3);
    for (let x = 0; x < VIEW.width; x += 96) ctx.fillRect(x, 196, 3, 384);
    ctx.fillStyle = '#5d4630';
    ctx.fillRect(0, 580, VIEW.width, 140);
  }

  function drawTopBar(kitchen) {
    ctx.fillStyle = '#2b2118';
    ctx.fillRect(0, 0, VIEW.width, 64);
    text(ctx, 'SIZZLE & SERVE', 20, 34, 26, '#f7c948');
    text(ctx, formatClock(kitchen.shiftLeft), 640, 34, 30, kitchen.shiftLeft <= 30 ? '#ff6b5e' : '#ffffff', 'center');
    text(ctx, 'SHIFT', 640, 58, 11, '#c9b18a', 'center');
    text(ctx, scoreLine(kitchen), 900, 34, 20, '#ffffff', 'center');
    const combo = comboLine(kitchen);
    if (combo) {
      ctx.fillStyle = '#ff8c42';
      rr(ctx, 1080, 14, 130, 36, 18); ctx.fill();
      text(ctx, combo, 1145, 33, 18, '#ffffff', 'center');
    }
    for (let i = 0; i < 3; i += 1) {
      const x = 1252 - i * 28;
      ctx.fillStyle = i < kitchen.hearts ? '#ff5b6a' : '#5a4636';
      ctx.beginPath();
      ctx.arc(x - 6, 28, 8, 0, Math.PI * 2); ctx.arc(x + 6, 28, 8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - 13, 32); ctx.lineTo(x + 13, 32); ctx.lineTo(x, 48); ctx.closePath(); ctx.fill();
    }
  }

  function drawTicket(ticket, index) {
    const r = ticketRect(index);
    const urgent = ticketIsUrgent(ticket);
    const bob = Math.sin((performance.now() / 500) + ticket.bobPhase) * 2;
    ctx.save();
    ctx.translate(0, bob);
    ctx.fillStyle = urgent ? '#fff0e8' : '#fffdf5';
    rr(ctx, r.x, r.y, r.w, r.h, 12); ctx.fill();
    ctx.strokeStyle = urgent ? '#e4572e' : '#d9c49a';
    ctx.lineWidth = urgent ? 3 : 2;
    rr(ctx, r.x, r.y, r.w, r.h, 12); ctx.stroke();
    text(ctx, `#${ticket.ticketNo}  ${ticket.name}`, r.x + 14, r.y + 20, 17, '#3a2c22');
    text(ctx, `$${ticket.price}`, r.x + r.w - 14, r.y + 20, 17, '#2e7d32', 'right');
    const wants = ticketWants(ticket);
    let ix = r.x + 30;
    for (const id of wants) {
      drawIngredient(ctx, id, ix, r.y + 54, 36);
      ix += 38;
    }
    progressBar(ctx, r.x + 14, r.y + r.h - 18, r.w - 28, 10, ticketFraction(ticket), urgent ? '#e4572e' : '#7bc96f');
    text(ctx, formatTicketClock(ticket.timeLeft), r.x + r.w - 14, r.y + r.h - 32, 13, urgent ? '#e4572e' : '#6b5a44', 'right');
    ctx.restore();
  }

  function drawOrderBoard(kitchen) {
    ctx.fillStyle = '#4a3524';
    rr(ctx, LAYOUT.board.x, LAYOUT.board.y, LAYOUT.board.w, LAYOUT.board.h, 14); ctx.fill();
    if (kitchen.tickets.length === 0) {
      text(ctx, 'No orders yet — the lunch rush is coming…', LAYOUT.board.x + 30, LAYOUT.board.y + 62, 18, '#e8d3a8');
    }
    kitchen.tickets.forEach((ticket, i) => drawTicket(ticket, i));
  }

  function stationBox(r, label, accent) {
    ctx.fillStyle = '#f3ead6';
    rr(ctx, r.x, r.y, r.w, r.h, 12); ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    rr(ctx, r.x, r.y, r.w, r.h, 12); ctx.stroke();
    text(ctx, label, r.x + r.w / 2, r.y + 16, 13, accent, 'center');
  }

  function drawStationCell(cell, cx, cy, size, seconds, label) {
    if (!cell) {
      ctx.strokeStyle = '#c9b18a';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);
      ctx.beginPath(); ctx.arc(cx, cy, size * 0.5, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      text(ctx, label, cx, cy, 12, '#a08a68', 'center');
      return;
    }
    drawIngredient(ctx, cell.item.id, cx, cy, size, cell.item.prep);
    if (!cell.done) {
      progressBar(ctx, cx - size * 0.5, cy + size * 0.55, size, 9, cell.progress, '#ff8c42');
    } else if (cell.item.prep === PREP_BURNT) {
      text(ctx, 'BURNT!', cx, cy - size * 0.6, 13, '#e4572e', 'center');
    } else {
      text(ctx, 'READY ✓', cx, cy - size * 0.6, 13, '#2e7d32', 'center');
    }
  }

  function drawStations(kitchen) {
    const g = LAYOUT.grill;
    stationBox(g, 'GRILL — patties sizzle here', '#c0392b');
    drawStationCell(kitchen.grill[0], g.x + 70, g.y + 66, 64, 4, 'patty');
    drawStationCell(kitchen.grill[1], g.x + 210, g.y + 66, 64, 4, 'patty');
    ctx.fillStyle = '#ff8c42';
    for (const fx of [g.x + 40, g.x + 140, g.x + 240]) {
      ctx.beginPath();
      ctx.moveTo(fx, g.y + g.h - 8);
      ctx.quadraticCurveTo(fx - 8, g.y + g.h - 26, fx, g.y + g.h - 34);
      ctx.quadraticCurveTo(fx + 8, g.y + g.h - 26, fx, g.y + g.h - 8);
      ctx.fill();
    }

    const f = LAYOUT.fryer;
    stationBox(f, 'FRYER', '#d9a41f');
    drawStationCell(kitchen.fryer, f.x + 66, f.y + 62, 56, 3, 'fries');

    const c = LAYOUT.chop;
    stationBox(c, 'CHOP BOARD', '#4d9b42');
    drawStationCell(kitchen.chop, c.x + 66, c.y + 62, 56, 2, 'chop');

    const s = LAYOUT.serve;
    ctx.fillStyle = '#2e7d32';
    rr(ctx, s.x, s.y, s.w, s.h, 12); ctx.fill();
    text(ctx, 'SERVE WINDOW', s.x + s.w / 2, s.y + 22, 15, '#ffffff', 'center');
    text(ctx, 'Click a ticket when', s.x + s.w / 2, s.y + 52, 14, '#d8f3dc', 'center');
    text(ctx, 'the plate matches it', s.x + s.w / 2, s.y + 74, 14, '#d8f3dc', 'center');
    // A waiting guest: warm skin, hair and a red shirt, so the figure reads
    // as a person instead of a dark blob on the green window.
    ctx.fillStyle = '#d94f30';
    ctx.beginPath(); ctx.arc(s.x + 52, s.y + 108, 26, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#f2c89b';
    ctx.beginPath(); ctx.arc(s.x + 52, s.y + 64, 17, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5d3a1e';
    ctx.beginPath(); ctx.arc(s.x + 52, s.y + 60, 17, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#2b2118';
    ctx.beginPath(); ctx.arc(s.x + 46, s.y + 64, 2.5, 0, Math.PI * 2); ctx.arc(s.x + 58, s.y + 64, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2b2118'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(s.x + 52, s.y + 68, 6, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();

    const t = LAYOUT.trash;
    ctx.fillStyle = '#6b5a44';
    rr(ctx, t.x, t.y, t.w, t.h, 10); ctx.fill();
    text(ctx, '🗑 TRASH', t.x + t.w / 2, t.y + 30, 15, '#ffffff', 'center');
  }

  function drawPlate(kitchen) {
    const p = LAYOUT.plate;
    ctx.fillStyle = '#e8dcc0';
    rr(ctx, p.x, p.y, p.w, p.h, 14); ctx.fill();
    ctx.strokeStyle = '#b97a2c';
    ctx.lineWidth = 3;
    rr(ctx, p.x, p.y, p.w, p.h, 14); ctx.stroke();
    text(ctx, 'PLATE — dish in progress', p.x + p.w / 2, p.y + 18, 13, '#8a6d3b', 'center');
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(p.x + 150, p.y + 102, 110, 34, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#c9b18a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(p.x + 150, p.y + 102, 110, 34, 0, 0, Math.PI * 2); ctx.stroke();
    if (kitchen.plate.stack.length === 0 && !kitchen.plate.side) {
      text(ctx, 'empty plate', p.x + 150, p.y + 102, 14, '#b0a080', 'center');
    } else {
      drawPlateStack(ctx, kitchen.plate, p.x + 130, p.y + 108, 64);
    }
    // Match hint against the first ticket.
    if (kitchen.tickets.length > 0) {
      const first = kitchen.tickets[0];
      const matched = plateMatchCount(kitchen.plate, first);
      const total = ticketItemCount(first);
      const ready = kitchen.plate.stack.length > 0 || kitchen.plate.side;
      const label = !ready ? '' : plateMatchesTicket(kitchen.plate, first)
        ? `✓ Ready to serve #${first.ticketNo}!`
        : `#${first.ticketNo}: ${matched}/${total} items`;
      text(ctx, label, p.x + p.w - 12, p.y + 18, 12, '#6b5a44', 'right');
    }
  }

  function drawBins(kitchen) {
    for (let i = 0; i < BIN_ORDER.length; i += 1) {
      const id = BIN_ORDER[i];
      const r = binRectFor(id);
      const def = INGREDIENTS[id];
      ctx.fillStyle = '#f3ead6';
      rr(ctx, r.x, r.y, r.w, r.h, 12); ctx.fill();
      ctx.strokeStyle = kitchen.hand && kitchen.hand.id === id ? '#ff8c42' : '#c9b18a';
      ctx.lineWidth = kitchen.hand && kitchen.hand.id === id ? 4 : 2;
      rr(ctx, r.x, r.y, r.w, r.h, 12); ctx.stroke();
      drawIngredient(ctx, id, r.x + r.w / 2, r.y + 46, 58);
      text(ctx, def.label, r.x + r.w / 2, r.y + 88, 15, '#3a2c22', 'center');
      ctx.fillStyle = '#8a6d3b';
      rr(ctx, r.x + 8, r.y + 8, 22, 22, 6); ctx.fill();
      text(ctx, def.key, r.x + 19, r.y + 20, 13, '#ffffff', 'center');
      if (def.needsGrill) text(ctx, 'grill', r.x + r.w / 2, r.y + 106, 11, '#c0392b', 'center');
      else if (def.needsFry) text(ctx, 'fry', r.x + r.w / 2, r.y + 106, 11, '#d9a41f', 'center');
      else if (def.needsChop) text(ctx, 'chop', r.x + r.w / 2, r.y + 106, 11, '#4d9b42', 'center');
      else text(ctx, 'ready', r.x + r.w / 2, r.y + 106, 11, '#2e7d32', 'center');
    }
  }

  function drawChef(kitchen) {
    const chef = kitchen.chef;
    const bob = chef.moving ? Math.sin(performance.now() / 90) * 3 : 0;
    ctx.save();
    ctx.translate(chef.x, chef.y + bob);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(0, 34, 26, 8, 0, 0, Math.PI * 2); ctx.fill();
    // Body: white apron.
    ctx.fillStyle = '#ffffff';
    rr(ctx, -18, -6, 36, 42, 10); ctx.fill();
    ctx.fillStyle = '#e4572e';
    ctx.fillRect(-18, 12, 36, 8);
    // Head and chef hat.
    ctx.fillStyle = '#f2c89b';
    ctx.beginPath(); ctx.arc(0, -20, 15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-10, -32, 9, 0, Math.PI * 2); ctx.arc(0, -36, 11, 0, Math.PI * 2); ctx.arc(10, -32, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(-14, -32, 28, 8);
    ctx.fillStyle = '#2b2118';
    ctx.beginPath(); ctx.arc(-5 * chef.dir, -20, 2, 0, Math.PI * 2); ctx.arc(6 * chef.dir, -20, 2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2b2118'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, -14, 5, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    // Hand item bubble.
    if (kitchen.hand) {
      ctx.fillStyle = '#fffdf5';
      ctx.beginPath(); ctx.arc(30, -34, 24, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ff8c42'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(30, -34, 24, 0, Math.PI * 2); ctx.stroke();
      drawIngredient(ctx, kitchen.hand.id, 30, -34, 34, kitchen.hand.prep);
    }
    ctx.restore();
  }

  function drawParticles(kitchen) {
    for (const p of kitchen.particles) {
      ctx.globalAlpha = Math.max(0, p.life / 0.7);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawToasts(kitchen) {
    kitchen.toasts.forEach((t, i) => {
      ctx.globalAlpha = Math.min(1, t.life);
      ctx.fillStyle = t.kind === 'good' ? '#2e7d32' : '#b03218';
      rr(ctx, 440, 196 + i * 34, 400, 28, 14); ctx.fill();
      text(ctx, t.text, 640, 211 + i * 34, 15, '#ffffff', 'center');
    });
    ctx.globalAlpha = 1;
  }

  function drawFooter(kitchen) {
    text(ctx, hintLine(kitchen), 20, 588 - 0, 14, '#e8d3a8');
    text(ctx, handLine(kitchen), 1260, 560, 14, '#f7c948', 'right');
  }

  function drawScreenOverlay(screen, kitchen, best) {
    if (screen === SCREEN_PLAY) return;
    ctx.fillStyle = 'rgba(20, 14, 8, 0.82)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    // A solid warm card behind the overlay text, so the kitchen behind it
    // never fights the words: the cover and the end screen read cleanly.
    const card = (x, y, w, h) => {
      ctx.fillStyle = '#3a2c22';
      rr(ctx, x, y, w, h, 20); ctx.fill();
      ctx.strokeStyle = '#b97a2c'; ctx.lineWidth = 2;
      rr(ctx, x, y, w, h, 20); ctx.stroke();
    };
    if (screen === SCREEN_TITLE) {
      card(250, 130, 780, 424);
      text(ctx, TITLE_LINES[0], 640, 190, 64, '#f7c948', 'center');
      text(ctx, TITLE_LINES[1], 640, 250, 19, '#ffffff', 'center');
      text(ctx, 'Grill the patties, chop the veggies, stack the burger,', 640, 300, 17, '#e8d3a8', 'center');
      text(ctx, 'serve it before the ticket runs out — and mind the rush!', 640, 326, 17, '#e8d3a8', 'center');
      ctx.fillStyle = '#ff8c42';
      rr(ctx, 490, 360, 300, 56, 28); ctx.fill();
      text(ctx, '▶  START SHIFT  (Enter)', 640, 389, 20, '#ffffff', 'center');
      HELP_LINES.forEach((line, i) => text(ctx, line, 640, 460 + i * 26, 15, '#c9b18a', 'center'));
      if (best > 0) text(ctx, `Best score: ${best}`, 640, 560, 17, '#f7c948', 'center');
      return;
    }
    if (screen === SCREEN_PAUSED) {
      card(440, 220, 400, 180);
      text(ctx, 'PAUSED', 640, 300, 56, '#ffffff', 'center');
      text(ctx, 'Press P to keep cooking', 640, 360, 19, '#e8d3a8', 'center');
      return;
    }
    if (screen === SCREEN_OVER) {
      card(280, 130, 720, 404);
      text(ctx, 'SHIFT OVER!', 640, 190, 56, '#f7c948', 'center');
      text(ctx, `Score ${kitchen.score}  ·  Dishes served ${kitchen.served}`, 640, 260, 24, '#ffffff', 'center');
      const stars = kitchen.served >= 14 ? '★★★' : kitchen.served >= 9 ? '★★☆' : kitchen.served >= 5 ? '★☆☆' : '☆☆☆';
      text(ctx, stars, 640, 320, 44, '#f7c948', 'center');
      text(ctx, kitchen.served >= 14 ? 'Three stars — head chef material!' : kitchen.served >= 9 ? 'Two stars — the lunch crowd loved it.' : kitchen.served >= 5 ? 'One star — a solid shift.' : 'No stars yet — the rush got you. Try again!', 640, 372, 18, '#e8d3a8', 'center');
      if (kitchen.score > best) text(ctx, 'New best score!', 640, 412, 19, '#7bc96f', 'center');
      else if (best > 0) text(ctx, `Best score: ${best}`, 640, 412, 17, '#c9b18a', 'center');
      ctx.fillStyle = '#ff8c42';
      rr(ctx, 490, 450, 300, 56, 28); ctx.fill();
      text(ctx, '↻  COOK AGAIN  (R)', 640, 479, 20, '#ffffff', 'center');
    }
  }

  function draw(kitchen, screen, best) {
    drawWallAndFloor();
    drawTopBar(kitchen);
    drawOrderBoard(kitchen);
    drawStations(kitchen);
    drawPlate(kitchen);
    drawBins(kitchen);
    drawChef(kitchen);
    drawParticles(kitchen);
    drawToasts(kitchen);
    drawScreenOverlay(screen, kitchen, best);
  }

  return { draw, drawIngredient };
}
