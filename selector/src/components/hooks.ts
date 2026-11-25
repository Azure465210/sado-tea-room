import { useEffect, useState, type RefObject } from 'react';

const RM_QUERY = '(prefers-reduced-motion: reduce)';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    try {
      return window.matchMedia(RM_QUERY).matches;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    let mq: MediaQueryList;
    try {
      mq = window.matchMedia(RM_QUERY);
    } catch {
      return;
    }
    const on = () => setReduced(mq.matches);
    mq.addEventListener ? mq.addEventListener('change', on) : mq.addListener(on);
    return () => (mq.removeEventListener ? mq.removeEventListener('change', on) : mq.removeListener(on));
  }, []);
  return reduced;
}

let webgl: boolean | null = null;
/** whether this browser can create a WebGL context at all (checked once) */
export function hasWebGL(): boolean {
  if (webgl !== null) return webgl;
  try {
    const c = document.createElement('canvas');
    const ctx = (c.getContext('webgl2') || c.getContext('webgl')) as WebGLRenderingContext | null;
    webgl = !!ctx;
    const lose = ctx && ctx.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
  } catch {
    webgl = false;
  }
  return webgl;
}

/** true while the element is displayed and at least partly inside the viewport */
export function useElementVisible(ref: RefObject<Element>): boolean {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => {
      const e = entries[entries.length - 1];
      setVisible(!!e && e.isIntersecting);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return visible;
}

export function readStore(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
export function writeStore(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable: the choice simply is not remembered */
  }
}

export function removeStore(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* storage unavailable */
  }
}

/** rough speaking time of a greeting, for the talking animation when speak() gives no completion signal */
export function estimateSpeechMs(text: string, lang: 'ja' | 'en'): number {
  if (lang === 'ja') return Math.min(14000, 600 + (text.length / 7) * 1000);
  const words = text.trim().split(/\s+/).length;
  return Math.min(14000, 600 + (words / 2.6) * 1000);
}
