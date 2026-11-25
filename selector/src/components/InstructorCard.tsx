// One instructor card: a sharp diagonal panel (clip-path parallelogram), a bust viewport (drei <View> into the shared canvas,
// or the 2D fallback), and an angled name on the slash. The card element itself creates no stacking context, so its
// background sits under the shared canvas and its name band above it (the band hides the bust's chest cut).
import { forwardRef, memo, useState, type KeyboardEvent } from 'react';
import { View } from '@react-three/drei';
import { ENGINE_LABEL, type Character } from '../data/characters';
import { BustScene } from './BustScene';
import { Fallback2D } from './Fallback2D';

export interface InstructorCardProps {
  character: Character;
  selected: boolean;
  talking: boolean;
  tabbable: boolean;
  use3d: boolean;
  reducedMotion: boolean;
  onSelect: (id: string, how: 'pointer' | 'key') => void;
  onKeyDown: (e: KeyboardEvent<HTMLDivElement>, id: string) => void;
}

function splitName(nameEn: string): { small: string; big: string } {
  const words = nameEn.split(' ');
  if (words.length === 1) return { small: '', big: nameEn };
  return { small: words.slice(0, -1).join(' '), big: words[words.length - 1] };
}

export const InstructorCard = memo(
  forwardRef<HTMLDivElement, InstructorCardProps>(function InstructorCard(
    { character: c, selected, talking, tabbable, use3d, reducedMotion, onSelect, onKeyDown },
    ref,
  ) {
    const [hover, setHover] = useState(false);
    const [failed3d, setFailed3d] = useState(false);
    const { small, big } = splitName(c.nameEn);
    const show3d = use3d && !failed3d;
    const roleLabel = c.teaRole === 'performer' ? 'Performer' : 'Navigator';
    return (
      <div
        ref={ref}
        role="radio"
        aria-checked={selected}
        tabIndex={tabbable ? 0 : -1}
        data-id={c.id}
        aria-label={`${c.nameEn}, ${c.nameJa}. ${roleLabel}. Voice: ${ENGINE_LABEL[c.engine]}.`}
        className={'ss-card' + (selected ? ' is-selected' : '') + (reducedMotion ? ' is-still' : '')}
        style={{ ['--accent' as string]: c.accent }}
        onClick={() => onSelect(c.id, 'pointer')}
        onKeyDown={(e) => onKeyDown(e, c.id)}
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
      >
        <div className="ss-card-ring" aria-hidden="true" />
        <div className="ss-card-bg" aria-hidden="true">
          <div className="ss-card-glow" />
          <div className="ss-card-stripes" />
        </div>
        {show3d ? (
          <View className="ss-card-view" index={1}>
            <BustScene
              character={c}
              selected={selected}
              hovered={hover}
              talking={talking}
              reducedMotion={reducedMotion}
              onFail={() => setFailed3d(true)}
            />
          </View>
        ) : (
          <div className="ss-card-view ss-card-view-2d" aria-hidden="true">
            <Fallback2D character={c} />
          </div>
        )}
        <div className="ss-card-fg">
          <div className="ss-card-top">
            {c.badge ? <span className="ss-chip ss-chip-original">{c.badge}</span> : <span className="ss-chip ss-chip-role">{roleLabel}</span>}
          </div>
          <div className="ss-card-band">
            <div className="ss-card-slash" aria-hidden="true" />
            <div className="ss-card-names">
              {small ? <span className="ss-name-small">{small}</span> : null}
              <span className={'ss-name-big' + (big.length > 10 ? ' is-long' : '')}>{big}</span>
              <span className="ss-name-ja" lang="ja">{c.nameJa}</span>
            </div>
            <span className="ss-engine">{ENGINE_LABEL[c.engine]}</span>
          </div>
        </div>
        {selected ? <div className="ss-card-accent" aria-hidden="true" /> : null}
        {selected && talking ? <div className="ss-card-talk" aria-hidden="true"><i /><i /><i /></div> : null}
      </div>
    );
  }),
);
