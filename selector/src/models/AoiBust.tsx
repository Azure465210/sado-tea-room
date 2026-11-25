// Kotonoha Aoi (younger twin): the mirror of her sister in blue – long blue hair parted to her left, calm brows, blue eyes,
// dark dress with a white collar and a blue ribbon.
import { useBust } from './kit';
import { buildKotonoha, type TwinLook } from './AkaneBust';

const AOI: TwinLook = {
  hair: '#86aef0',
  hairDark: '#5a7fc4',
  hairLight: '#d4e4ff',
  iris: '#4b8ae0',
  irisDeep: '#1f3d78',
  accent: '#5c93e6',
  dress: '#2a2d3e',
  side: 1,
  tuft: false,
  browTilt: -0.02,
};

export function AoiBust(props: { talking: boolean }) {
  const root = useBust(() => buildKotonoha(AOI), props.talking);
  return (
    <group>
      <primitive object={root} />
    </group>
  );
}
