// Library entry for the tea room page: exposes window.SadoSelector (one IIFE + one CSS file, see vite.config.ts).
//   SadoSelector.characters
//   SadoSelector.mountSelector(el, { currentId, onChoose(id), speak(id, {explicit}), onEnter, enterLabel }) → { setCurrent(id), dispose() }
//   SadoSelector.mountNavigator(el, { id })                                → { setTalking(b), setId(id), dispose() }
import './index.css';
import { createRoot, type Root } from 'react-dom/client';
import { CHARACTERS, type Character } from './data/characters';
import { InstructorSelect } from './components/InstructorSelect';
import { NavigatorWindow } from './components/NavigatorWindow';

export interface MountSelectorOptions {
  currentId?: string | null;
  onChoose?: (id: string) => void;
  /** speak the character's greeting; may return a promise that settles when speech ends. opts.explicit: the
   *  "Hear the greeting" button (not a card selection) */
  speak?: (id: string, opts?: { explicit?: boolean }) => void | Promise<unknown>;
  /** an "Enter" button in the dossier; enterLabel is read at each render (a string or a function returning one) */
  onEnter?: () => void;
  enterLabel?: string | (() => string);
}
export interface SelectorHandle {
  setCurrent: (id: string) => void;
  dispose: () => void;
}
export interface NavigatorHandle {
  setTalking: (talking: boolean) => void;
  setId: (id: string) => void;
  dispose: () => void;
}

const SCOPE_ID = 'sado-selector';

/** Tailwind utilities only apply inside #sado-selector: reuse el (or an ancestor) with that id, or add one inside el */
function scopedContainer(el: HTMLElement): HTMLElement {
  const inner = document.createElement('div');
  inner.className = 'ss-mount';
  if (el.closest('#' + SCOPE_ID)) {
    el.appendChild(inner);
    return inner;
  }
  const scope = document.createElement('div');
  scope.id = SCOPE_ID;
  scope.appendChild(inner);
  el.appendChild(scope);
  return inner;
}

// drei's <View> uses one module-wide portal, so only one selector may be mounted at a time
let activeSelector: SelectorHandle | null = null;

function mountSelector(el: HTMLElement, opts: MountSelectorOptions = {}): SelectorHandle {
  if (!el) throw new Error('SadoSelector.mountSelector: no element');
  if (activeSelector) activeSelector.dispose();
  const container = scopedContainer(el);
  const root: Root = createRoot(container);
  let currentId = opts.currentId ?? null;
  let currentSeq = 0; // bumped by setCurrent, so the selector re-syncs even when currentId is unchanged since the last render
  const speak = opts.speak ? (c: Character, o?: { explicit?: boolean }) => opts.speak!(c.id, o) : undefined;
  const label = () => (typeof opts.enterLabel === 'function' ? opts.enterLabel() : opts.enterLabel);
  const onChoose = (id: string) => {
    currentId = id;
    if (opts.onChoose) opts.onChoose(id);
  };
  const render = () =>
    root.render(
      <InstructorSelect
        currentId={currentId}
        currentSeq={currentSeq}
        onChoose={onChoose}
        speak={speak}
        onEnter={opts.onEnter}
        enterLabel={label()}
      />,
    );
  render();
  let disposed = false;
  const handle: SelectorHandle = {
    setCurrent(id: string) {
      if (disposed) return;
      currentId = id;
      currentSeq++;
      render();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.unmount();
      const scope = container.parentElement;
      container.remove();
      if (scope && scope.id === SCOPE_ID && scope !== el && !scope.childElementCount) scope.remove();
      if (activeSelector === handle) activeSelector = null;
    },
  };
  activeSelector = handle;
  return handle;
}

function mountNavigator(el: HTMLElement, opts: { id: string }): NavigatorHandle {
  if (!el) throw new Error('SadoSelector.mountNavigator: no element');
  const container = document.createElement('div');
  container.className = 'sado-nav-mount';
  el.appendChild(container);
  const root = createRoot(container);
  let id = opts && opts.id ? opts.id : 'zundamon';
  let talking = false;
  let disposed = false;
  const render = () => root.render(<NavigatorWindow id={id} talking={talking} />);
  render();
  return {
    setTalking(b: boolean) {
      if (disposed || talking === !!b) return;
      talking = !!b;
      render();
    },
    setId(next: string) {
      if (disposed || next === id) return;
      id = next;
      render();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.unmount();
      container.remove();
    },
  };
}

const api = { characters: CHARACTERS, mountSelector, mountNavigator };

declare global {
  interface Window {
    SadoSelector: typeof api;
  }
}

window.SadoSelector = api;

export { api as SadoSelector };
