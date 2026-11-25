// ONE WebGL canvas for all cards: each card's viewport is a drei <View> that renders into this canvas with the scissor test.
// The canvas is fixed over the window but clipped to the visible box of the selector's scrolling ancestors, and its frame loop
// stops while the selector is hidden or scrolled away. Views that are off screen are skipped by drei.
import { useEffect, useRef, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { View } from '@react-three/drei';

function scrollAncestors(el: Element | null): Element[] {
  const out: Element[] = [];
  let p = el ? el.parentElement : null;
  while (p && p !== document.body && p !== document.documentElement) {
    const s = getComputedStyle(p);
    if (/(auto|scroll|hidden|clip)/.test(s.overflow + s.overflowX + s.overflowY)) out.push(p);
    p = p.parentElement;
  }
  return out;
}

/** clip the fixed canvas to the part of the window where the selector can actually be seen */
function ClipToScrollBox({ rootRef }: { rootRef: RefObject<HTMLElement> }) {
  const gl = useThree((s) => s.gl);
  const ancestors = useRef<Element[]>([]);
  const last = useRef('');
  useEffect(() => {
    const update = () => {
      ancestors.current = scrollAncestors(rootRef.current);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [rootRef]);
  useFrame(() => {
    const wrap = gl.domElement.closest('.ss-canvas');
    if (!wrap) return;
    const W = window.innerWidth;
    const H = window.innerHeight;
    let t = 0, l = 0, r = W, b = H;
    for (const a of ancestors.current) {
      const rc = a.getBoundingClientRect();
      t = Math.max(t, rc.top);
      l = Math.max(l, rc.left);
      r = Math.min(r, rc.right);
      b = Math.min(b, rc.bottom);
    }
    const v = ancestors.current.length
      ? `inset(${Math.round(t)}px ${Math.round(W - r)}px ${Math.round(H - b)}px ${Math.round(l)}px)`
      : 'none';
    if (v !== last.current) {
      last.current = v;
      (wrap as HTMLElement).style.clipPath = v;
    }
  }, -1);
  return null;
}

export function SharedCanvas({ rootRef, active }: { rootRef: RefObject<HTMLElement>; active: boolean }) {
  return (
    <div className="ss-canvas" aria-hidden="true">
      <Canvas
        frameloop={active ? 'always' : 'never'}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        style={{ pointerEvents: 'none' }}
      >
        <View.Port />
        <ClipToScrollBox rootRef={rootRef} />
      </Canvas>
    </div>
  );
}
