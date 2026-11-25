// Standalone demo page: the selector, plus a navigator window preview for the chosen character.
import './index.css';
import { StrictMode, useCallback, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { getCharacter, type Character } from './data/characters';
import { InstructorSelect } from './components/InstructorSelect';
import { NavigatorWindow } from './components/NavigatorWindow';
import { readStore, writeStore } from './components/hooks';

/** demo-only browser voice: speaks the greeting (yomi for Japanese characters) and resolves when done */
function demoSpeak(c: Character): Promise<void> {
  return new Promise((resolve) => {
    try {
      const ss = window.speechSynthesis;
      if (!ss) return resolve();
      ss.cancel();
      const ja = c.voice.lang === 'ja';
      const u = new SpeechSynthesisUtterance(ja ? c.greeting.yomi || c.greeting.ja : c.greeting.en);
      u.lang = c.voice.tag;
      u.rate = c.voice.rate;
      u.pitch = c.voice.pitch;
      const v = ss.getVoices().find((x) => x.lang.toLowerCase().startsWith(ja ? 'ja' : 'en'));
      if (v) u.voice = v;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      ss.speak(u);
      window.setTimeout(resolve, 15000);
    } catch {
      resolve();
    }
  });
}

function Demo() {
  const [chosen, setChosen] = useState<string>(() => readStore('sado.selector.demo.current') || 'shizue');
  const [talking, setTalking] = useState(false);
  const onChoose = useCallback((id: string) => {
    setChosen(id);
    writeStore('sado.selector.demo.current', id);
  }, []);
  const speak = useCallback((c: Character) => {
    setTalking(true);
    return demoSpeak(c).finally(() => setTalking(false));
  }, []);
  const c = getCharacter(chosen);
  return (
    <>
      <InstructorSelect currentId={chosen} onChoose={onChoose} speak={speak} />
      <div className="ss-demo-bar">
        <span>
          Chosen: <b>{c ? c.nameEn : chosen}</b>
        </span>
        <button type="button" className="ss-btn ss-btn-ghost" onClick={() => setTalking((t) => !t)} aria-pressed={talking}>
          <span className="ss-btn-in">{talking ? 'Stop talking' : 'Navigator: talk'}</span>
        </button>
      </div>
      <div className="ss-demo-nav">
        <NavigatorWindow id={chosen} talking={talking} />
      </div>
    </>
  );
}

const el = document.getElementById('root');
if (el) {
  createRoot(el).render(
    <StrictMode>
      <Demo />
    </StrictMode>,
  );
}
