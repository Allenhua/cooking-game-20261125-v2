// Keyboard and mouse input: arrows/WASD move the chef, number keys grab bins,
// E interacts with the nearest station, Space serves a matching ticket, T bins
// the plate, P pauses, M mutes, Enter / R start again.
import { BIN_ORDER } from './config.js';

export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';
export const ACTION_RESTART = 'restart';
export const ACTION_MUTE = 'mute';

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const clicks = [];

  function keyOf(event) {
    return event.key.length === 1 ? event.key.toLowerCase() : event.key;
  }
  function onKeyDown(event) {
    const key = keyOf(event);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
    if (!event.repeat) pressed.add(key);
    keys.add(key);
  }
  function onKeyUp(event) {
    keys.delete(keyOf(event));
  }
  function onClick(event) {
    const rect = canvas.getBoundingClientRect();
    clicks.push({
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    });
  }
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('pointerdown', onClick);

  function moveVector() {
    let x = 0;
    let y = 0;
    if (keys.has('ArrowLeft') || keys.has('a')) x -= 1;
    if (keys.has('ArrowRight') || keys.has('d')) x += 1;
    if (keys.has('ArrowUp') || keys.has('w')) y -= 1;
    if (keys.has('ArrowDown') || keys.has('s')) y += 1;
    return { x, y };
  }
  function wasPressed(key) {
    return pressed.has(key);
  }
  function binPressed() {
    for (const id of BIN_ORDER) {
      const defKey = id === 'bun' ? '1' : id === 'patty' ? '2' : id === 'cheese' ? '3'
        : id === 'lettuce' ? '4' : id === 'tomato' ? '5' : id === 'onion' ? '6'
        : id === 'sauce' ? '7' : '8';
      if (pressed.has(defKey)) return id;
    }
    return null;
  }
  function drainClicks() {
    const out = clicks.splice(0, clicks.length);
    return out;
  }
  function endFrame() {
    pressed.clear();
  }
  function destroy() {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    canvas.removeEventListener('pointerdown', onClick);
  }

  return { moveVector, wasPressed, binPressed, drainClicks, endFrame, destroy };
}
