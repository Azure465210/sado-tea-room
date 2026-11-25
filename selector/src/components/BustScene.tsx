// One character's bust viewport contents: camera, lights, turntable and the model chosen by priority
// (.vrm/.glb URL → procedural bust → the caller's 2D fallback via onFail('procedural')).
import { Component, useRef, useState, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import type { Character } from '../data/characters';
import { getBust } from '../models';
import { ModelBust } from './ModelBust';

class Boundary extends Component<{ onError: (e: unknown) => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(e: unknown) {
    this.props.onError(e);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export interface BustSceneProps {
  character: Character;
  /** bright + rim light + turntable */
  selected: boolean;
  /** a little brighter while hovered / focused */
  hovered?: boolean;
  talking: boolean;
  reducedMotion: boolean;
  /** the procedural bust failed too: the caller shows the 2D fallback */
  onFail?: () => void;
  /** vertical field of view (degrees) */
  fov?: number;
  /** world units of the bust shown in height (bust spans 0..1) */
  frameHeight?: number;
  /** turn slowly even when not selected (navigator window idle sway) */
  idleSway?: boolean;
  /** full brightness and rim light without the turntable (navigator window) */
  lit?: boolean;
}

const TAU = Math.PI * 2;
/** head-only manju busts on a card: scaled down and lifted so the whole face (mouth included) clears the name band and
 *  the turning bow / hat cone / brim stay inside the viewport (the navigator window shows them at full size) */
const HEAD_ONLY_CARD_FIT = { scale: 0.68, lift: 0.21 };

export function BustScene({
  character, selected, hovered = false, talking, reducedMotion, onFail, fov = 28, frameHeight = 1.14, idleSway = false, lit = false,
}: BustSceneProps) {
  const [modelFailed, setModelFailed] = useState(false);
  const turn = useRef<THREE.Group>(null);
  const tone = useRef<THREE.Mesh>(null);
  const rim = useRef<THREE.DirectionalLight>(null);
  const rim2 = useRef<THREE.DirectionalLight>(null);
  const bright = selected || lit;
  const anim = useRef({ angle: 0, speed: 0, light: bright ? 1 : 0.45, rim: bright ? 1 : 0 });

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const a = anim.current;
    const k = 1 - Math.exp(-dt * 6);
    const targetLight = bright ? 1 : hovered ? 0.62 : 0.45;
    a.light += (targetLight - a.light) * k;
    a.rim += ((bright ? 1 : 0) - a.rim) * k;
    if (selected && !reducedMotion) {
      a.speed += (0.55 - a.speed) * (1 - Math.exp(-dt * 1.5)); // ease into the turntable
      a.angle += a.speed * dt;
    } else if (idleSway && !reducedMotion) {
      a.speed = 0;
      a.angle = Math.sin(performance.now() / 2400) * 0.22;
    } else {
      // ease back to facing forward (the nearest whole turn)
      a.speed = 0;
      const rest = Math.round(a.angle / TAU) * TAU;
      a.angle += (rest - a.angle) * (reducedMotion ? 1 : 1 - Math.exp(-dt * 4));
      if (Math.abs(rest - a.angle) < 1e-4) a.angle = 0;
    }
    if (turn.current) turn.current.rotation.y = a.angle;
    // dimming: scaling the lights alone barely darkens toon / textured faces, so a camera-fixed plane multiplies the
    // view's stored colour by a.light (alpha untouched, so the card backdrop behind the transparent canvas is not darkened)
    const t = tone.current;
    if (t) {
      t.visible = a.light < 0.995;
      (t.material as THREE.MeshBasicMaterial).color.setRGB(a.light, a.light, a.light, THREE.SRGBColorSpace);
    }
    if (rim.current) rim.current.intensity = 3.2 * a.rim;
    if (rim2.current) rim2.current.intensity = 2.0 * a.rim;
  });

  const Bust = getBust(character.id);
  const centreY = 1.06 - frameHeight / 2;
  const dist = frameHeight / (2 * Math.tan(((fov / 2) * Math.PI) / 180));
  const accent = character.accent;
  const fit = character.bodyType === 'head-only' && !lit ? HEAD_ONLY_CARD_FIT : null;

  return (
    <>
      <PerspectiveCamera makeDefault fov={fov} position={[0, centreY, dist]} near={0.1} far={20}>
        <mesh ref={tone} position={[0, 0, -0.15]} renderOrder={1000} frustumCulled={false} visible={!bright}>
          <planeGeometry args={[2, 2]} />
          <meshBasicMaterial
            transparent
            depthTest={false}
            depthWrite={false}
            toneMapped={false}
            blending={THREE.CustomBlending}
            blendEquation={THREE.AddEquation}
            blendSrc={THREE.ZeroFactor}
            blendDst={THREE.SrcColorFactor}
            blendSrcAlpha={THREE.ZeroFactor}
            blendDstAlpha={THREE.OneFactor}
          />
        </mesh>
      </PerspectiveCamera>
      <hemisphereLight args={['#fff6ea', '#3a3430', 1.1]} />
      <directionalLight position={[1.2, 1.8, 2.2]} color="#fff4e6" intensity={2.2} />
      <directionalLight position={[-1.6, 0.6, 1.4]} color="#dfe8ff" intensity={0.6} />
      {/* rim lights from behind, in the character's accent colour */}
      <directionalLight ref={rim} position={[-1.4, 1.4, -2]} color={accent} intensity={0} />
      <directionalLight ref={rim2} position={[1.6, 1.0, -1.6]} color="#ffffff" intensity={0} />
      <group ref={turn} position-y={fit ? fit.lift : 0} scale={fit ? fit.scale : 1}>
        {character.model3dUrl && !modelFailed ? (
          <Boundary key="model" onError={() => setModelFailed(true)}>
            <ModelBust
              url={character.model3dUrl}
              talking={talking}
              fallback={<Bust talking={talking} />}
              onError={() => setModelFailed(true)}
            />
          </Boundary>
        ) : (
          <Boundary key="procedural" onError={() => onFail && onFail()}>
            <Bust talking={talking} />
          </Boundary>
        )}
      </group>
    </>
  );
}
