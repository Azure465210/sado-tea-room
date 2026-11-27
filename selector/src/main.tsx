// Standalone demo of the instructor selector.
import './index.css';
import { StrictMode, useCallback, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { getCharacter, type Character } from './data/characters';
import { InstructorSelect } from './components/InstructorSelect';
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
  const [chosen, setChosen] = useState<string>(() => getCharacter(readStore('sado.selector.demo.current'))?.id || 'shizue');
  const onChoose = useCallback((id: string) => {
    setChosen(id);
    writeStore('sado.selector.demo.current', id);
  }, []);
  return <InstructorSelect currentId={chosen} onChoose={onChoose} speak={demoSpeak} />;
}

const el = document.getElementById('root');
if (el) {
  createRoot(el).render(
    <StrictMode>
      <Demo />
    </StrictMode>,
  );
}
