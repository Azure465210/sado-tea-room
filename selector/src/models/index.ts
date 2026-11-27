// id → bust component. Every character has its own procedural bust in ./<Name>Bust.tsx (named export <Name>Bust).
// The placeholder is only used for an id that has no entry here (none at present), so an unknown id never breaks a card.
import { createElement, type ComponentType } from 'react';
import { PlaceholderBust } from './Placeholder';
import { CHARACTERS } from '../data/characters';
import { ShizueBust } from './ShizueBust';
import { IfuBust } from './IfuBust';

export interface BustProps {
  talking: boolean;
}
export type BustComponent = ComponentType<BustProps>;

const REAL: Record<string, BustComponent> = {
  shizue: ShizueBust,
  ifu: IfuBust,
};

const placeholders: Record<string, BustComponent> = {};
function placeholderFor(id: string): BustComponent {
  if (!placeholders[id]) {
    const c = CHARACTERS.find((x) => x.id === id);
    const accent = c ? c.accent : undefined;
    const headOnly = c ? c.bodyType === 'head-only' : false;
    const P: BustComponent = ({ talking }) => createElement(PlaceholderBust, { talking, accent, headOnly });
    P.displayName = 'Placeholder(' + id + ')';
    placeholders[id] = P;
  }
  return placeholders[id];
}

export const BUSTS: Record<string, BustComponent> = Object.fromEntries(
  CHARACTERS.map((c) => [c.id, REAL[c.id] || placeholderFor(c.id)]),
);

export function getBust(id: string): BustComponent {
  return REAL[id] || placeholderFor(id);
}

/** true when the character's own bust file is present (not the placeholder) */
export function hasOwnBust(id: string): boolean {
  return !!REAL[id];
}
