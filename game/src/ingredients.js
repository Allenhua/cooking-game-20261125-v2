// Ingredients and how they get ready: raw, grilled, fried or chopped.
// A hand item carries its ingredient id plus a prep state; the plate only
// accepts items whose prep is finished.
import { INGREDIENTS } from './config.js';

export const PREP_RAW = 'raw';
export const PREP_READY = 'ready';
export const PREP_BURNT = 'burnt';

/** A fresh item straight from its bin. */
export function makeHandItem(ingredientId) {
  const def = INGREDIENTS[ingredientId];
  const needsPrep = Boolean(def.needsGrill || def.needsFry || def.needsChop);
  return { id: ingredientId, prep: needsPrep ? PREP_RAW : PREP_READY, progress: 0 };
}

/** True when the item can go straight onto the plate. */
export function itemIsReady(item) {
  return item !== null && item.prep === PREP_READY;
}

/** Which station prepares this item: 'grill', 'fryer', 'chop' or null. */
export function prepStationFor(item) {
  if (!item) return null;
  const def = INGREDIENTS[item.id];
  if (def.needsGrill) return 'grill';
  if (def.needsFry) return 'fryer';
  if (def.needsChop) return 'chop';
  return null;
}

/** Human label for a hand item, including its prep state. */
export function handItemLabel(item) {
  if (!item) return 'empty hands';
  const def = INGREDIENTS[item.id];
  if (item.prep === PREP_BURNT) return `burnt ${def.label}`;
  if (item.prep === PREP_RAW) {
    if (def.needsGrill) return `raw ${def.label} — grill it`;
    if (def.needsFry) return `raw ${def.label} — fry it`;
    if (def.needsChop) return `${def.label} — chop it`;
  }
  return def.label;
}
