// Route assembly parts and working devices through the same material renderer.
import { CHAINS, PRODUCER_DEFS } from './catalog.mjs';
import { producerPartsMarkup } from './producer-parts-art.mjs';
import { drinkTierMarkup } from './producer-drink-art.mjs';
import { produceTierMarkup } from './producer-produce-art.mjs';
import { varietyProducerMarkup } from './producer-variety-art.mjs';

/** SVG body only; the caller owns defs, material rendering and contact shadow. */
export function producerMarkup(family, level) {
  if (typeof family !== 'string' || !family.startsWith('gen_')) return null;
  const id = family.slice(4), definition = PRODUCER_DEFS[id];
  if (!definition || definition.chain !== family || !Number.isInteger(level) || !CHAINS[family]?.[level-1]) return null;
  const active = level >= definition.activeLevel;
  const body = !active ? producerPartsMarkup(family, level)
    : id === 'drink' ? drinkTierMarkup(level)
    : id === 'produce' ? produceTierMarkup(level)
    : varietyProducerMarkup(family, level);
  if (body === null) return null;
  return `<g data-producer="${id}" data-level="${level}" data-active="${active}" transform="translate(1 1) scale(.975 .97)">${body}</g>`;
}
