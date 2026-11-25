// A neutral stand-in bust used until a character's own procedural bust file exists.
// Same convention as the real busts: spans y = 0 (mid-chest) to y ≈ 1 (top of head), centred at x = 0, facing +z.
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group, Mesh } from 'three';

export interface PlaceholderBustProps {
  talking: boolean;
  accent?: string;
  headOnly?: boolean;
}

export function PlaceholderBust({ talking, accent = '#8a9a7a', headOnly = false }: PlaceholderBustProps) {
  const mouth = useRef<Mesh>(null);
  const root = useRef<Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (mouth.current) mouth.current.scale.y = talking ? 0.4 + 0.6 * Math.abs(Math.sin(t * 11)) : 0.25;
    if (root.current) root.current.position.y = headOnly && talking ? Math.abs(Math.sin(t * 7)) * 0.03 : 0;
  });
  if (headOnly) {
    return (
      <group ref={root}>
        <mesh position={[0, 0.42, 0]} scale={[1, 0.8, 0.9]}>
          <sphereGeometry args={[0.5, 32, 24]} />
          <meshToonMaterial color="#f6dcc6" />
        </mesh>
        <mesh position={[0, 0.66, -0.02]} scale={[1.04, 0.62, 0.95]}>
          <sphereGeometry args={[0.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshToonMaterial color={accent} />
        </mesh>
        {[-0.16, 0.16].map((x) => (
          <mesh key={x} position={[x, 0.46, 0.43]}>
            <sphereGeometry args={[0.055, 12, 10]} />
            <meshToonMaterial color="#2a2020" />
          </mesh>
        ))}
        <mesh ref={mouth} position={[0, 0.3, 0.45]}>
          <boxGeometry args={[0.12, 0.08, 0.02]} />
          <meshToonMaterial color="#8a2d34" />
        </mesh>
      </group>
    );
  }
  return (
    <group ref={root}>
      {/* shoulders and chest */}
      <mesh position={[0, 0.08, 0]} scale={[1, 0.62, 0.62]}>
        <sphereGeometry args={[0.42, 28, 18, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshToonMaterial color={accent} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.42, 0.4, 0.12, 28]} />
        <meshToonMaterial color={accent} />
      </mesh>
      {/* neck */}
      <mesh position={[0, 0.36, 0]}>
        <cylinderGeometry args={[0.07, 0.08, 0.14, 16]} />
        <meshToonMaterial color="#f1d3bd" />
      </mesh>
      {/* head */}
      <mesh position={[0, 0.62, 0]} scale={[0.92, 1, 0.95]}>
        <sphereGeometry args={[0.24, 32, 24]} />
        <meshToonMaterial color="#f6dcc6" />
      </mesh>
      {/* hair cap */}
      <mesh position={[0, 0.66, -0.02]} scale={[1, 1.02, 1]}>
        <sphereGeometry args={[0.25, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshToonMaterial color={accent} />
      </mesh>
      {[-0.08, 0.08].map((x) => (
        <mesh key={x} position={[x, 0.62, 0.215]}>
          <sphereGeometry args={[0.028, 12, 10]} />
          <meshToonMaterial color="#2a2020" />
        </mesh>
      ))}
      <mesh ref={mouth} position={[0, 0.52, 0.215]}>
        <boxGeometry args={[0.06, 0.04, 0.01]} />
        <meshToonMaterial color="#8a2d34" />
      </mesh>
    </group>
  );
}
