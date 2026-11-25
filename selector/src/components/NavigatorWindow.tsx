// The navigator's corner window in the tea room: a small framed bust viewport with a name plate. It has its own small
// canvas (the selector's shared canvas is usually hidden while the lesson runs) and stops rendering while hidden.
// Styled with plain `.sado-nav` CSS so it works outside #sado-selector.
import { useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { getCharacter, type Character } from '../data/characters';
import { BustScene } from './BustScene';
import { Fallback2D } from './Fallback2D';
import { hasWebGL, useElementVisible, useReducedMotion } from './hooks';

export interface NavigatorWindowProps {
  id: string;
  talking: boolean;
  /** shows the Japanese name under the English one (default true) */
  showJa?: boolean;
}

function Viewport({ c, talking, reducedMotion, active }: { c: Character; talking: boolean; reducedMotion: boolean; active: boolean }) {
  const [failed, setFailed] = useState(false);
  const [use3d] = useState(() => hasWebGL());
  if (!use3d || failed) return <Fallback2D character={c} />;
  return (
    <Canvas frameloop={active ? 'always' : 'never'} dpr={[1, 2]} gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}>
      <BustScene
        key={c.id}
        character={c}
        selected={false}
        hovered={false}
        talking={talking}
        reducedMotion={reducedMotion}
        idleSway
        lit
        frameHeight={1.12}
        onFail={() => setFailed(true)}
      />
    </Canvas>
  );
}

export function NavigatorWindow({ id, talking, showJa = true }: NavigatorWindowProps) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useElementVisible(ref);
  const reducedMotion = useReducedMotion();
  const c = getCharacter(id) || getCharacter('zundamon');
  if (!c) return null;
  return (
    <div
      ref={ref}
      className={'sado-nav' + (talking ? ' is-talking' : '')}
      style={{ ['--accent' as string]: c.accent }}
      role="img"
      aria-label={`Navigator: ${c.nameEn} (${c.nameJa})${talking ? ', speaking' : ''}`}
    >
      <div className="sado-nav-frame">
        <div className="sado-nav-view">
          <Viewport key={c.id} c={c} talking={talking} reducedMotion={reducedMotion} active={visible} />
        </div>
        <div className="sado-nav-plate">
          <span className="sado-nav-en">{c.nameEn}</span>
          {showJa ? <span className="sado-nav-ja" lang="ja">{c.nameJa}</span> : null}
          <span className="sado-nav-wave" aria-hidden="true"><i /><i /><i /></span>
        </div>
      </div>
    </div>
  );
}
