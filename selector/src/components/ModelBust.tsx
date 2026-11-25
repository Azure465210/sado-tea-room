// Loads a licensed .vrm / .glb file (Character.model3dUrl) and frames its head and upper chest into the bust convention
// (y = 0 mid-chest → y ≈ 1 top of head, centred at x = 0, facing +z). Errors propagate to the surrounding boundary,
// which falls back to the procedural bust.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils, type VRM } from '@pixiv/three-vrm';

interface Framed {
  object: THREE.Object3D;
  vrm: VRM | null;
}

function frame(gltf: GLTF): Framed {
  const vrm = (gltf.userData && (gltf.userData.vrm as VRM)) || null;
  const scene = vrm ? vrm.scene : gltf.scene;
  if (vrm) {
    VRMUtils.removeUnnecessaryVertices(scene);
    VRMUtils.rotateVRM0(vrm); // VRM 0.x faces -z
  }
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  let bottom: number;
  let top = box.max.y;
  let cx = (box.min.x + box.max.x) / 2;
  const v = new THREE.Vector3();
  if (vrm && vrm.humanoid) {
    const h = vrm.humanoid;
    const head = h.getNormalizedBoneNode('head') || h.getRawBoneNode('head');
    const chest =
      h.getNormalizedBoneNode('upperChest') || h.getNormalizedBoneNode('chest') || h.getNormalizedBoneNode('spine') ||
      h.getRawBoneNode('chest');
    if (head && chest) {
      head.getWorldPosition(v);
      const headY = v.y;
      cx = v.x;
      chest.getWorldPosition(v);
      bottom = v.y;
      // the top of the head (or hat): the bounding box top, unless the box is much taller (raised arms, props)
      top = Math.min(box.max.y, headY + (headY - bottom) * 1.4);
    } else {
      bottom = box.max.y - size.y * 0.3;
    }
  } else {
    // a full figure is clearly taller than wide: keep its top 30 %; a model that is already a bust is used whole
    bottom = size.y > size.x * 1.6 ? box.max.y - size.y * 0.3 : box.min.y;
  }
  const s = 1 / Math.max(0.0001, top - bottom);
  const holder = new THREE.Group();
  scene.position.set(-cx, -bottom, -(box.min.z + box.max.z) / 2);
  holder.add(scene);
  holder.scale.setScalar(s);
  return { object: holder, vrm };
}

/**
 * Loads its own copy of the file (an Object3D can only live in one scene; the browser's HTTP cache avoids a second
 * download). While loading it shows `fallback`; on any error it calls onError once (the caller then shows the procedural bust).
 */
export function ModelBust({
  url, talking, fallback, onError,
}: {
  url: string;
  talking: boolean;
  fallback: ReactNode;
  onError: (e: unknown) => void;
}) {
  const [framed, setFramed] = useState<Framed | null>(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  useEffect(() => {
    let alive = true;
    let mine: Framed | null = null;
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    loader.load(
      url,
      (gltf) => {
        try {
          const f = frame(gltf);
          if (!alive) {
            disposeObject(f.object);
            return;
          }
          mine = f;
          setFramed(f);
        } catch (e) {
          if (alive) onErrorRef.current(e);
        }
      },
      undefined,
      (e) => {
        if (alive) onErrorRef.current(e);
      },
    );
    return () => {
      alive = false;
      if (mine) disposeObject(mine.object);
      setFramed(null);
    };
  }, [url]);
  useFrame(({ clock }, dt) => {
    const vrm = framed && framed.vrm;
    if (!vrm) return;
    const em = vrm.expressionManager;
    if (em) em.setValue('aa', talking ? Math.abs(Math.sin(clock.elapsedTime * 11)) * 0.8 : 0);
    vrm.update(dt);
  });
  if (!framed) return <>{fallback}</>;
  return <primitive object={framed.object} />;
}

function disposeObject(o: THREE.Object3D) {
  VRMUtils.deepDispose(o);
}
