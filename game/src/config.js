// Sizzle & Serve — configuration: canvas size, timings, recipes and ingredients.
// Every number the kitchen tunes lives here so the other files only read it.
export const VIEW = { width: 1280, height: 720 };
export const STEP = 1 / 60;
export const SHIFT_SECONDS = 180;
export const MAX_HEARTS = 3;
export const MAX_TICKETS = 3;
export const ORDER_TIME = 60;
export const SPAWN_FIRST_SECONDS = 4;
export const SPAWN_GAP_SECONDS = 14;
export const SPAWN_GAP_LATE_SECONDS = 9;
export const GRILL_SECONDS = 4;
export const BURN_SECONDS = 9;
export const FRY_SECONDS = 3;
export const CHOP_SECONDS = 2;
export const COMBO_WINDOW_SECONDS = 12;
export const BEST_KEY = 'sizzle-and-serve-best';

// Ingredient catalogue. kind groups the art; needsGrill / needsChop / needsFry
// say which station prepares it; side marks a fryer item served beside a burger.
export const INGREDIENTS = {
  bun: { label: 'Bun', kind: 'bun', color: '#e8a54b', dark: '#b97a2c', key: '1' },
  patty: { label: 'Patty', kind: 'patty', color: '#8a5a33', dark: '#5d3a1e', key: '2', needsGrill: true },
  cheese: { label: 'Cheese', kind: 'cheese', color: '#f7c948', dark: '#d9a41f', key: '3' },
  lettuce: { label: 'Lettuce', kind: 'lettuce', color: '#7bc96f', dark: '#4d9b42', key: '4', needsChop: true },
  tomato: { label: 'Tomato', kind: 'tomato', color: '#e4572e', dark: '#b03218', key: '5', needsChop: true },
  onion: { label: 'Onion', kind: 'onion', color: '#e8d8f0', dark: '#b48ec4', key: '6', needsChop: true },
  sauce: { label: 'Sauce', kind: 'sauce', color: '#f2e394', dark: '#c9a227', key: '7' },
  fries: { label: 'Fries', kind: 'fries', color: '#f2b705', dark: '#c78d02', key: '8', needsFry: true, side: true },
};
export const BIN_ORDER = ['bun', 'patty', 'cheese', 'lettuce', 'tomato', 'onion', 'sauce', 'fries'];

// Menu: each dish is a burger recipe plus an optional side. The order board
// shows the dish name and the stacked ingredients the guest asked for.
export const MENU = [
  { id: 'classic', name: 'Classic Stack', price: 100, recipe: ['bun', 'patty', 'lettuce', 'tomato'], side: null },
  { id: 'cheese', name: 'Cheese Melt', price: 120, recipe: ['bun', 'patty', 'cheese', 'sauce'], side: null },
  { id: 'garden', name: 'Garden Fresh', price: 110, recipe: ['bun', 'lettuce', 'tomato', 'onion', 'sauce'], side: null },
  { id: 'double', name: 'Double Trouble', price: 160, recipe: ['bun', 'patty', 'patty', 'cheese', 'lettuce'], side: null },
  { id: 'combo', name: 'Combo Deal', price: 150, recipe: ['bun', 'patty', 'cheese', 'lettuce'], side: 'fries' },
  { id: 'veggie', name: 'Veggie Delight', price: 130, recipe: ['bun', 'lettuce', 'tomato', 'onion', 'cheese'], side: 'fries' },
];

// Score values for the events the kitchen reports.
export const SCORE = {
  timeBonusMax: 50,
  comboStep: 25,
  wrongServe: -20,
  expired: -30,
};

// Rush curve: as the shift wears on, orders arrive faster and their timers shrink.
export function rushLevel(elapsedSeconds) {
  return Math.min(1, elapsedSeconds / SHIFT_SECONDS);
}
export function orderTimeLimit(elapsedSeconds) {
  return ORDER_TIME - 18 * rushLevel(elapsedSeconds);
}
export function spawnGap(elapsedSeconds) {
  return SPAWN_GAP_SECONDS - (SPAWN_GAP_SECONDS - SPAWN_GAP_LATE_SECONDS) * rushLevel(elapsedSeconds);
}
