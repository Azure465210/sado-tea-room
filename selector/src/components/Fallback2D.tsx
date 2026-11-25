// The last step of the model priority: the character's 2D portrait, or a lettered emblem when there is none.
import type { Character } from '../data/characters';

export function Fallback2D({ character, className = '' }: { character: Character; className?: string }) {
  if (character.fallback2dUrl) {
    return (
      <img
        className={'ss-fallback2d ' + className}
        src={character.fallback2dUrl}
        alt={'Portrait of ' + character.nameEn}
        draggable={false}
      />
    );
  }
  // the first character of the Japanese name (minus a leading ゆっくり), large, in the accent colour
  const glyph = character.nameJa.replace(/^ゆっくり/, '').charAt(0);
  return (
    <div className={'ss-fallback2d ss-emblem ' + className} role="img" aria-label={character.nameEn + ' (2D emblem)'}>
      <span lang="ja">{glyph}</span>
    </div>
  );
}
