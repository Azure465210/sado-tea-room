// The instructor selection screen: a radio group of diagonal cards with live 3D busts in one shared
// canvas, and the selected instructor's dossier. Selecting a card calls onChoose(id) and speaks the greeting via speak().
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import {
  CHARACTERS, GENERAL_CREDIT, isNeutral, matchesFilter, type Character, type Gender,
} from '../data/characters';
import { InstructorCard } from './InstructorCard';
import { DetailPanel } from './DetailPanel';
import { SharedCanvas } from './SharedCanvas';
import { estimateSpeechMs, hasWebGL, readStore, useElementVisible, useReducedMotion } from './hooks';

const FILTER_KEY = 'sado.selector.filter';

export interface InstructorSelectProps {
  characters?: Character[];
  /** the instructor chosen so far */
  currentId?: string | null;
  /** changes whenever the host sets the choice again (re-applies currentId even if it equals the previous prop) */
  currentSeq?: number;
  onChoose?: (id: string) => void;
  /**
   * speaks the character's greeting; may return a promise that settles when speech ends (drives the talking animation).
   * opts.explicit is true for the "Hear the greeting" button (the host may speak it even when reading aloud is off).
   */
  speak?: (character: Character, opts?: { explicit?: boolean }) => void | Promise<unknown>;
  /** shows an "Enter" button in the dossier (beside "Hear the greeting") that calls this */
  onEnter?: () => void;
  enterLabel?: string;
  /** Optional ordering preference. Every instructor stays available. */
  preferredGender?: Gender | null;
  heading?: string;
}

export function InstructorSelect({
  characters = CHARACTERS, currentId, currentSeq, onChoose, speak, onEnter, enterLabel, preferredGender, heading = 'Choose your instructor',
}: InstructorSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const visible = useElementVisible(rootRef);
  const [use3d] = useState(() => hasWebGL());
  const [savedPreference] = useState(() => readStore(FILTER_KEY));
  const [selectedId, setSelectedId] = useState<string>(() =>
    currentId && characters.some((c) => c.id === currentId) ? currentId : characters[0].id,
  );
  const [talkingId, setTalkingId] = useState<string | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const talkTimer = useRef<number | undefined>(undefined);
  const speakTimer = useRef<number | undefined>(undefined);
  const speakSeq = useRef(0);
  const refSetters = useRef<Map<string, (el: HTMLDivElement | null) => void>>(new Map());
  const refFor = (id: string) => {
    let f = refSetters.current.get(id);
    if (!f) {
      f = (el) => {
        if (el) cardRefs.current.set(id, el);
        else cardRefs.current.delete(id);
      };
      refSetters.current.set(id, f);
    }
    return f;
  };

  useEffect(() => {
    if (currentId && currentId !== selectedId && characters.some((c) => c.id === currentId)) setSelectedId(currentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId, currentSeq]);

  useEffect(() => () => {
    window.clearTimeout(talkTimer.current);
    window.clearTimeout(speakTimer.current);
  }, []);

  const shown = useMemo(() => {
    const preference = preferredGender === undefined ? savedPreference : preferredGender;
    const first = preference === 'female' || preference === 'male'
      ? (c: Character) => matchesFilter(c, preference)
      : isNeutral;
    return [...characters.filter(first), ...characters.filter((c) => !first(c))];
  }, [characters, preferredGender, savedPreference]);

  const selected = characters.find((c) => c.id === selectedId) || characters[0];

  const doSpeak = useCallback(
    (c: Character, explicit = false) => {
      if (!speak) return;
      const seq = ++speakSeq.current;
      window.clearTimeout(talkTimer.current);
      setTalkingId(c.id);
      const stop = () => {
        if (speakSeq.current === seq) setTalkingId(null);
      };
      let result: void | Promise<unknown>;
      try {
        result = speak(c, { explicit });
      } catch {
        stop();
        return;
      }
      if (result && typeof (result as Promise<unknown>).then === 'function') {
        (result as Promise<unknown>).then(stop, stop);
        talkTimer.current = window.setTimeout(stop, 30000); // never animate forever
      } else {
        const text = c.voice.lang === 'ja' ? c.greeting.yomi || c.greeting.ja : c.greeting.en;
        talkTimer.current = window.setTimeout(stop, estimateSpeechMs(text, c.voice.lang));
      }
    },
    [speak],
  );

  const select = useCallback(
    (id: string, how: 'pointer' | 'key' | 'arrow') => {
      const c = characters.find((x) => x.id === id);
      if (!c) return;
      setSelectedId(id);
      if (onChoose) onChoose(id);
      window.clearTimeout(speakTimer.current);
      // arrow keys move through the group quickly: speak once the choice settles
      if (how === 'arrow') speakTimer.current = window.setTimeout(() => doSpeak(c), 550);
      else doSpeak(c);
    },
    [characters, onChoose, doSpeak],
  );

  const onCardSelect = useCallback((id: string, how: 'pointer' | 'key') => select(id, how), [select]);

  const onCardKey = useCallback(
    (e: KeyboardEvent<HTMLDivElement>, id: string) => {
      const i = shown.findIndex((c) => c.id === id);
      let n = -1;
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          n = (i + 1) % shown.length;
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          n = (i - 1 + shown.length) % shown.length;
          break;
        case 'Home':
          n = 0;
          break;
        case 'End':
          n = shown.length - 1;
          break;
        case ' ':
        case 'Enter':
          e.preventDefault();
          select(id, 'key');
          return;
        default:
          return;
      }
      e.preventDefault();
      const next = shown[n];
      if (!next) return;
      select(next.id, 'arrow');
      const el = cardRefs.current.get(next.id);
      if (el) {
        el.focus({ preventScroll: true });
        el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' });
      }
    },
    [shown, select, reducedMotion],
  );

  // whenever the selector comes into view (first mount, or the tea room reopening it), bring the chosen card into view
  // inside the scrolling container: on a phone a stored or linked choice can otherwise sit below the fold
  const wasVisible = useRef(false);
  useEffect(() => {
    if (!visible) {
      wasVisible.current = false;
      return;
    }
    if (wasVisible.current) return;
    wasVisible.current = true;
    const raf = window.requestAnimationFrame(() => {
      const el = cardRefs.current.get(selectedId);
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.height && (r.bottom > window.innerHeight || r.top < 0)) el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
    return () => window.cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const tabbableId = shown.some((c) => c.id === selectedId) ? selectedId : shown[0] && shown[0].id;

  return (
    <div ref={rootRef} className={'ss-root' + (reducedMotion ? ' is-still' : '')}>
      <header className="ss-header">
        <div className="ss-kicker" aria-hidden="true">
          <span lang="ja">講師選択</span> · Instructor select
        </div>
        <h2 className="ss-title">{heading}</h2>
        <p className="ss-sub">
          Choose Shizue-sensei or Urone If to perform the tea ceremony and guide you through each step.
        </p>
      </header>

      <div className="ss-layout">
        <div id="ss-grid-panel" className="ss-grid-wrap">
          <div className="ss-grid" role="radiogroup" aria-label="Instructors">
            {shown.map((c) => (
              <InstructorCard
                key={c.id}
                ref={refFor(c.id)}
                character={c}
                selected={c.id === selectedId}
                talking={talkingId === c.id}
                tabbable={c.id === tabbableId}
                use3d={use3d}
                reducedMotion={reducedMotion}
                onSelect={onCardSelect}
                onKeyDown={onCardKey}
              />
            ))}
          </div>
        </div>
        <DetailPanel
          character={selected}
          talking={talkingId === selected.id}
          canSpeak={!!speak}
          onSpeak={() => doSpeak(selected, true)}
          onEnter={onEnter}
          enterLabel={enterLabel}
        />
      </div>

      <footer className="ss-footer">
        <p>{GENERAL_CREDIT}</p>
        <p>
          Voice credit when using the local COEIROINK engine: <span lang="ja">COEIROINK:虚音イフ</span>.
        </p>
      </footer>

      {use3d ? <SharedCanvas rootRef={rootRef} active={visible} /> : null}
    </div>
  );
}
