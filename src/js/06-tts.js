// ---------- voice: text to speech for the teachers and navigators ----------
// Every character has a voice profile (PROFILES, keyed by teacher id). The engine chain, per character:
//   1. VOICEVOX running on the user's PC (http://127.0.0.1:50021) – speaker matched by name, style ノーマル;
//   2. COEIROINK v2 running on the user's PC (http://127.0.0.1:50032) – speaker matched by name (虚音イフ);
//   3. the browser's own Web Speech voices, with per-character pitch/rate and a gender-aware voice ranking.
// A.I.VOICE and AquesTalk have no API a web page can reach, so those characters always use 3.
// The local engines are used only when the user ticks "Use VOICEVOX / COEIROINK running on this PC" (the engine panel,
// #enginePanel); the page then probes them with short timeouts and never waits for them. Any failure falls back to 3.
// Long text is split into sentences and queued: a short pause between sentences sounds more natural, Chrome cuts off a
// single utterance longer than about 15 seconds, and an engine starts playing the first sentence sooner. A new line
// cancels the old one (browser voice and audio alike). While a sentence is really being heard, the host's mouth keeps
// moving (hostState.talkUntil, 21-host) – unless the speaker is a navigator (the host is silent then); listeners added
// with TTS.onTalk(fn(on, id)) hear about every start and end (the navigator window's mouth).
const TTS = (function () {
  const webOk = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  const LANGUAGE_KEY = 'sado.narrationLanguage';
  let language = 'original';
  try {
    if (localStorage.getItem(LANGUAGE_KEY) === 'en') language = 'en';
  } catch (e) {}
  let voices = [];
  const listeners = [],
    talkListeners = [],
    statusListeners = [];
  function load() {
    try {
      voices = speechSynthesis.getVoices() || [];
    } catch (e) {
      voices = [];
    }
  }
  if (webOk) {
    load();
    try {
      speechSynthesis.addEventListener('voiceschanged', () => {
        load();
        listeners.forEach((f) => f());
        renderPanel();
      });
    } catch (e) {}
  }

  // ---- per-character voice profiles ----
  // engine: 'voicevox' | 'coeiroink' | 'browser'; engineSpeakerName/styleName: matched against the engine's speaker list;
  // web*: the browser voice (language, pitch 0..2, rate, name hints ranked first); gender: 'female' | 'male' | 'unknown'.
  // webPitch is meant for a voice that fits the character; see pitchFor() for the adjustment when it does not.
  const FEMALE_JA = ['Nanami', 'Kyoko', 'Haruka', 'Ayumi', 'Sayaka', 'Mizuki', 'O-Ren', 'Shiori', 'Mayu', 'Aoi', 'Nanako', 'Google 日本語', '女性'];
  // (the standalone selector demo keeps a copy of webRate / webPitch in selector/src/data/characters.ts: change both together)
  const PROFILES = {
    shizue: { engine: 'browser', engineSpeakerName: null, styleName: null, webLang: 'en', webTag: 'en-GB', webPitch: 1, webRate: 0.92, webVoiceHints: ['Sonia', 'Libby', 'Hazel', 'Serena', 'Kate', 'Moira', 'Tessa', 'Karen', 'Samantha', 'Martha', 'Fiona', 'Susan', 'Zira', 'Aria', 'Jenny', 'female'], gender: 'female' },
    ifu: { engine: 'coeiroink', engineSpeakerName: '虚音イフ', engineMatch: 'イフ', styleName: null, webLang: 'ja', webTag: 'ja-JP', webPitch: 0.85, webPitchMatched: 1, webRate: 0.95, webVoiceHints: ['Keita', 'Ichiro', 'Daichi', 'Naoki', 'Otoya', 'Hattori', '男性', 'male'], gender: 'male' },
    akane: { engine: 'browser', engineName: 'A.I.VOICE', engineSpeakerName: null, styleName: null, webLang: 'ja', webTag: 'ja-JP', webPitch: 1.2, webRate: 1.08, webVoiceHints: FEMALE_JA, gender: 'female' },
    aoi: { engine: 'browser', engineName: 'A.I.VOICE', engineSpeakerName: null, styleName: null, webLang: 'ja', webTag: 'ja-JP', webPitch: 1.05, webRate: 0.96, webVoiceHints: FEMALE_JA, gender: 'female' },
    reimu: { engine: 'browser', engineName: 'AquesTalk', engineSpeakerName: null, styleName: null, webLang: 'ja', webTag: 'ja-JP', webPitch: 1.12, webRate: 1.02, webVoiceHints: FEMALE_JA, gender: 'female' },
    marisa: { engine: 'browser', engineName: 'AquesTalk', engineSpeakerName: null, styleName: null, webLang: 'ja', webTag: 'ja-JP', webPitch: 0.98, webRate: 1.06, webVoiceHints: FEMALE_JA, gender: 'female' },
    zundamon: { engine: 'voicevox', engineSpeakerName: 'ずんだもん', styleName: 'ノーマル', webLang: 'ja', webTag: 'ja-JP', webPitch: 1.4, webRate: 1.06, webVoiceHints: [], gender: 'unknown' },
    metan: { engine: 'voicevox', engineSpeakerName: '四国めたん', styleName: 'ノーマル', webLang: 'ja', webTag: 'ja-JP', webPitch: 1.1, webRate: 0.98, webVoiceHints: FEMALE_JA, gender: 'female' },
    tsumugi: { engine: 'voicevox', engineSpeakerName: '春日部つむぎ', styleName: 'ノーマル', webLang: 'ja', webTag: 'ja-JP', webPitch: 1.22, webRate: 1.08, webVoiceHints: FEMALE_JA, gender: 'female' },
    zunko: { engine: 'voicevox', engineSpeakerName: '東北ずん子', styleName: 'ノーマル', webLang: 'ja', webTag: 'ja-JP', webPitch: 1.08, webRate: 0.95, webVoiceHints: FEMALE_JA, gender: 'female' },
    kiritan: { engine: 'voicevox', engineSpeakerName: '東北きりたん', styleName: 'ノーマル', webLang: 'ja', webTag: 'ja-JP', webPitch: 1.28, webRate: 0.94, webVoiceHints: FEMALE_JA, gender: 'female' },
    itako: { engine: 'voicevox', engineSpeakerName: '東北イタコ', styleName: 'ノーマル', webLang: 'ja', webTag: 'ja-JP', webPitch: 0.98, webRate: 0.92, webVoiceHints: FEMALE_JA, gender: 'female' },
  };
  const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const hintRe = (list) => (list && list.length ? new RegExp(list.map(escRe).join('|'), 'i') : null);
  // a teacher object (05-teachers) or an id → its profile; an unknown id gets one built from teacher.voice
  function profileOf(t) {
    const id = typeof t === 'string' ? t : t && t.id;
    if (PROFILES[id]) return PROFILES[id];
    const T = typeof t === 'object' && t ? t : (typeof TEACHERS !== 'undefined' && TEACHERS[id]) || {},
      V = T.voice || {};
    return { engine: 'browser', webLang: V.lang || 'en', webTag: V.tag || 'en-GB', webPitch: V.pitch || 1, webRate: V.rate || 1, webHintRe: V.hint || null, webVoiceHints: [], gender: T.gender || (T.pronoun === 'she' ? 'female' : T.pronoun === 'he' ? 'male' : 'unknown') };
  }
  // the old-style voice object {lang, tag, rate, pitch, hint} (50-player's Voice selector reads teacher.voice)
  function voiceOf(t) {
    const P = profileOf(t);
    return { lang: P.webLang, tag: P.webTag, rate: P.webRate, pitch: P.webPitch, hint: P.webHintRe || hintRe(P.webVoiceHints) || genderRe(P.gender) || /natural/i };
  }
  // a navigator speaks while the performer (the host) stays silent: then the host's mouth must not move
  const isNavigator = (T) => !!T && (T.teaRole === 'navigator' || T.role === 'navigator' || (T.performer && T.performer !== T.id));
  // who speaks for a teacher object: the narrator if it names one, else the teacher itself
  function speakerOf(T) {
    if (T && T.narrator && T.narrator !== T.id && typeof TEACHERS !== 'undefined' && TEACHERS[T.narrator]) return TEACHERS[T.narrator];
    return T;
  }

  // ---- browser voices: ranking ----
  const NICE = /natural|neural|online|premium|enhanced|google/i,
    EN_MALE = /ryan|guy|daniel|george|thomas|oliver|arthur|(^|[^e])male/i,
    MALE = /(^|[^e])male|男性|keita|ichiro|daichi|naoki|otoya|hattori|ryan|guy|daniel|george|thomas|oliver|arthur|david|mark|james|fred|alex\b/i,
    FEMALE = /female|女性|kyoko|nanami|haruka|ayumi|mizuki|sayaka|o-ren|shiori|mayu|nanako|google 日本語|aria|jenny|sonia|libby|zira|samantha|karen|moira|tessa|serena|kate|susan|hazel|martha|fiona/i;
  const genderRe = (g) => (g === 'female' ? FEMALE : g === 'male' ? MALE : null);
  const ofLang = (lang) => voices.filter((v) => (lang === 'ja' ? /^ja/i.test(v.lang) : /^en/i.test(v.lang)));
  function ranked(lang, hint, tag, gender) {
    // natural-sounding first (4), the name hint (2), the character's gender (1; unknown: any voice not known as a man's),
    // the exact regional tag (1); a voice of the other gender loses 1. Stable otherwise.
    const score = (v) => {
      let s = (NICE.test(v.name) ? 4 : 0) + (hint && hint.test(v.name) ? 2 : 0) + (tag && v.lang.replace('_', '-').toLowerCase() === tag.toLowerCase() ? 1 : 0);
      if (gender === 'female') s += FEMALE.test(v.name) ? 1 : MALE.test(v.name) ? -1 : 0;
      else if (gender === 'male') s += MALE.test(v.name) && !FEMALE.test(v.name) ? 1 : FEMALE.test(v.name) ? -1 : 0;
      else if (gender === 'unknown') s += MALE.test(v.name) && !FEMALE.test(v.name) ? -1 : 0;
      return s;
    };
    return ofLang(lang)
      .map((v, i) => [v, score(v), i])
      .sort((a, b) => b[1] - a[1] || a[2] - b[2])
      .map((x) => x[0]);
  }
  // the user's own pick, per teacher (the Voice selector on the intro page)
  const key = (id) => 'sado.voice.' + id + (language === 'en' && profileOf(id).webLang !== 'en' ? '.en' : '');
  function chosenName(id) {
    try {
      return localStorage.getItem(key(id)) || '';
    } catch (e) {
      return '';
    }
  }
  function setChosen(id, name) {
    try {
      if (name) localStorage.setItem(key(id), name);
      else localStorage.removeItem(key(id));
    } catch (e) {}
  }
  // the pitch for a chosen browser voice: the profile's own, raised for a man's voice speaking a woman's or an unknown
  // character's part, and natural (webPitchMatched) for a man's voice speaking a man's part
  function pitchFor(P, v) {
    const male = v && MALE.test(v.name) && !FEMALE.test(v.name);
    if (P.gender === 'male') return male && P.webPitchMatched ? P.webPitchMatched : P.webPitch;
    return male ? Math.min(2, P.webPitch + 0.25) : P.webPitch;
  }
  function profileVoices(P, lang) {
    const original = lang === P.webLang;
    const hint = original ? P.webHintRe || hintRe(P.webVoiceHints) : P.gender === 'male' ? EN_MALE : genderRe(P.gender);
    return ranked(lang, hint, original ? P.webTag : 'en-GB', P.gender);
  }
  function preferredVoice(list, id) {
    const own = id && chosenName(id);
    return list.find((v) => own && v.name === own) || list[0] || null;
  }
  function englishFor(P) {
    const voice = preferredVoice(profileVoices(P, 'en'), P.id);
    return { voice, tag: voice?.lang || 'en-GB', rate: P.webRate, pitch: pitchFor(P, voice), lang: 'en' };
  }
  function voicesFor(teacher) {
    const P = profileOf(speakerOf(teacher) || teacher);
    const requested = language === 'en' ? 'en' : P.webLang;
    const list = profileVoices(P, requested);
    return requested === 'ja' && !list.length ? profileVoices(P, 'en') : list;
  }
  // how a teacher speaks with the browser right now: voice, language tag, rate and pitch; and whether the English
  // translation is used instead
  function plan(teacher) {
    const T = speakerOf(teacher) || teacher,
      P = Object.assign({ id: typeof T === 'string' ? T : T.id }, profileOf(T));
    if (language === 'en') return englishFor(P);
    const list = profileVoices(P, P.webLang);
    if (list.length || P.webLang === 'en') {
      const voice = preferredVoice(list, P.id);
      return { voice, tag: voice?.lang || P.webTag, rate: P.webRate, pitch: pitchFor(P, voice), lang: P.webLang };
    }
    // no Japanese voice in this browser: the English translation, with an English voice that suits the character
    return Object.assign(englishFor(P), { fallback: true });
  }
  function sentences(text) {
    // split after 。！？!? (and . followed by a space), keep the punctuation, glue short pieces to the next one.
    // (no lookbehind in the regex: older Safari cannot parse it, and one parse error would stop the whole page)
    const parts = String(text)
      .replace(/\s+/g, ' ')
      .replace(/([。！？!?])/g, '$1\u0000')
      .replace(/\.\s+(?=[A-Z“"‘'(])/g, '.\u0000')
      .split('\u0000')
      .map((s) => s.trim())
      .filter(Boolean);
    const out = [];
    for (const p of parts) {
      const last = out[out.length - 1];
      // Japanese: keep sentences together up to ~40 characters, so the gap between queued utterances does not push a
      // timed line past the next one (the engine still pauses at 。 inside one utterance); English: only tiny pieces
      const glue = last && (/[。！？]$/.test(last) ? last.length + p.length <= 40 : last.length < 8);
      if (glue) out[out.length - 1] += (/[。！？、]$/.test(last) ? '' : ' ') + p; // no space inside Japanese
      else out.push(p);
    }
    return out;
  }

  // ---- local engines: settings, probing, speaker lookup ----
  const ENGINES = {
    voicevox: { label: 'VOICEVOX', base: 'http://127.0.0.1:50021', list: '/speakers' },
    coeiroink: { label: 'COEIROINK', base: 'http://127.0.0.1:50032', list: '/v1/speakers' },
  };
  const ENGINE_KEY = 'sado.engines';
  // The static upload uses browser narration and never probes a visitor's PC.
  const publicBuild = document.documentElement?.dataset?.publicBuild === 'true';
  function storedEnabled() {
    if (publicBuild) return false;
    try {
      return localStorage.getItem(ENGINE_KEY) === '1';
    } catch (e) {
      return false;
    }
  }
  const status = {
    enabled: storedEnabled(),
    voicevox: { state: 'off', detail: '', version: '', speakers: [] },
    coeiroink: { state: 'off', detail: '', version: '', speakers: [] },
    current: null, // the character the panel describes
    last: null, // the last line: { id, engine, speaker, ok, error }
    talking: false,
    talkingId: null,
    hostMouth: false, // true while the voice moves the host's mouth (hostState.talkUntil)
    credit: '',
  };
  const raw = { voicevox: null, coeiroink: null }; // the engines' speaker lists
  function fetchT(url, init, ms) {
    // fetch with a timeout (AbortController); rejects on timeout like on a network error
    const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ac ? setTimeout(() => ac.abort(), ms) : 0;
    return fetch(url, Object.assign({}, init || {}, ac ? { signal: ac.signal } : {})).finally(() => clearTimeout(timer));
  }
  const sandboxed = () => /^https:$/.test(location.protocol) && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  let probing = null;
  function probe(name) {
    const E = ENGINES[name],
      S = status[name];
    S.state = 'checking';
    S.detail = '';
    emit();
    return fetchT(E.base + E.list, { cache: 'no-store' }, 800)
      .then((r) => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then((list) => {
        raw[name] = Array.isArray(list) ? list : [];
        S.speakers = raw[name].map((s) => s.name || s.speakerName).filter(Boolean);
        S.version = (raw[name][0] && raw[name][0].version) || '';
        S.state = 'connected';
        S.detail = '';
      })
      .catch((e) => {
        raw[name] = null;
        S.speakers = [];
        if (sandboxed()) {
          S.state = 'blocked';
          S.detail = 'sandbox';
          return;
        }
        // a cross-origin fetch fails the same way for "nothing listening" and "no CORS permission"; an opaque
        // (no-cors) request tells them apart: it succeeds when something answers on that port
        return fetchT(E.base + E.list, { mode: 'no-cors', cache: 'no-store' }, 800).then(
          () => {
            S.state = 'blocked';
            S.detail = 'cors';
          },
          () => {
            S.state = 'not-found';
            S.detail = e && e.name === 'AbortError' ? 'timeout' : '';
          }
        );
      })
      .then(emit);
  }
  function probeAll() {
    if (!status.enabled) return Promise.resolve(status);
    if (!probing) probing = Promise.all([probe('voicevox'), probe('coeiroink')]).then(() => ((probing = null), status));
    return probing;
  }
  function setEnabled(on) {
    if (publicBuild) return;
    status.enabled = !!on;
    try {
      localStorage.setItem(ENGINE_KEY, on ? '1' : '0');
    } catch (e) {}
    if (on) probeAll();
    else {
      status.voicevox.state = status.coeiroink.state = 'off';
      emit();
    }
  }
  // the engine speaker (and style) for a profile, or null
  function engineSpeaker(P) {
    const list = raw[P.engine];
    if (!list || !P.engineSpeakerName) return null;
    const nm = (s) => s.name || s.speakerName || '';
    const sp = list.find((s) => nm(s) === P.engineSpeakerName) || list.find((s) => nm(s).indexOf(P.engineMatch || P.engineSpeakerName) >= 0);
    if (!sp || !sp.styles || !sp.styles.length) return null;
    const sn = (st) => st.name || st.styleName || '';
    const st = (P.styleName && sp.styles.find((x) => sn(x) === P.styleName)) || sp.styles[0];
    return { name: nm(sp), uuid: sp.speaker_uuid || sp.speakerUuid, style: sn(st), id: st.id != null ? st.id : st.styleId };
  }
  // how a character speaks right now: { engine, label, speaker, reason }
  function route(t) {
    if (language === 'en') return { engine: 'browser', label: 'English browser voice', reason: '' };
    const T = speakerOf(typeof t === 'string' ? (typeof TEACHERS !== 'undefined' && TEACHERS[t]) || { id: t } : t) || {};
    const P = profileOf(T);
    if (P.engine === 'voicevox' || P.engine === 'coeiroink') {
      const S = status[P.engine],
        label = ENGINES[P.engine].label;
      if (!status.enabled) return { engine: 'browser', label: 'browser voice', reason: label + ' is not switched on' };
      if (S.state !== 'connected') return { engine: 'browser', label: 'browser voice', reason: label + ' ' + stateText(S) };
      const sp = engineSpeaker(P);
      if (!sp) return { engine: 'browser', label: 'browser voice', reason: label + ' has no ' + P.engineSpeakerName + ' voice installed' };
      return { engine: P.engine, label, speaker: sp, reason: '' };
    }
    return { engine: 'browser', label: 'browser voice', reason: P.engineName ? P.engineName + ' cannot be reached from a web page' : '' };
  }
  const creditFor = (t) => {
    const r = route(t);
    return r.speaker ? r.label + ':' + r.speaker.name : '';
  };

  // ---- synthesis (with a small cache: the same line in the same voice is made only once) ----
  const cache = new Map(),
    CACHE_MAX = 80;
  function synth(r, text) {
    const k = r.engine + '|' + r.speaker.id + '|' + (r.speaker.uuid || '') + '|' + text;
    if (cache.has(k)) {
      const v = cache.get(k);
      cache.delete(k);
      cache.set(k, v); // most recently used last
      return v;
    }
    const E = ENGINES[r.engine],
      J = { 'Content-Type': 'application/json' };
    const asWav = (res) => {
      if (!res.ok) throw new Error(E.label + ' HTTP ' + res.status);
      return res.blob();
    };
    const json = (res) => {
      if (!res.ok) throw new Error(E.label + ' HTTP ' + res.status);
      return res.json();
    };
    let p;
    if (r.engine === 'voicevox') {
      const sp = encodeURIComponent(r.speaker.id);
      p = fetchT(E.base + '/audio_query?text=' + encodeURIComponent(text) + '&speaker=' + sp, { method: 'POST' }, 15000)
        .then(json)
        .then((q) => fetchT(E.base + '/synthesis?speaker=' + sp, { method: 'POST', headers: J, body: JSON.stringify(q) }, 30000))
        .then(asWav);
    } else {
      p = fetchT(E.base + '/v1/estimate_prosody', { method: 'POST', headers: J, body: JSON.stringify({ text }) }, 15000)
        .then(json)
        .then((pr) =>
          fetchT(
            E.base + '/v1/synthesis',
            {
              method: 'POST',
              headers: J,
              body: JSON.stringify({ speakerUuid: r.speaker.uuid, styleId: r.speaker.id, text, prosodyDetail: (pr && pr.detail) || [], speedScale: 1, volumeScale: 1, pitchScale: 0, intonationScale: 1, prePhonemeLength: 0.1, postPhonemeLength: 0.1, outputSamplingRate: 24000 }),
            },
            30000
          )
        )
        .then(asWav);
    }
    p = p.catch((e) => {
      cache.delete(k); // a failure is not remembered
      throw e;
    });
    cache.set(k, p);
    while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
    return p;
  }

  // ---- the speaking job: lip sync and start/end callbacks ----
  let gen = 0,
    job = null,
    lipTimer = null,
    audio = null,
    audioDone = null;
  function lipTick() {
    if (!job || !job.inChunk) {
      clearInterval(lipTimer);
      lipTimer = null;
      status.hostMouth = false;
      return;
    }
    status.hostMouth = !!job.hostLip;
    if (job.hostLip && typeof hostState !== 'undefined') hostState.talkUntil = performance.now() / 1000 + 0.3;
  }
  function chunkStart(j) {
    if (j !== job || j.ended) return;
    j.inChunk = true;
    if (!j.started) {
      j.started = true;
      status.talking = true;
      status.talkingId = j.id;
      talkListeners.forEach((f) => {
        try {
          f(true, j.id);
        } catch (e) {}
      });
      if (j.onStart)
        try {
          j.onStart(j.id);
        } catch (e) {}
    }
    lipTick();
    if (!lipTimer) lipTimer = setInterval(lipTick, 120);
  }
  function chunkEnd(j) {
    if (j === job) j.inChunk = false;
  }
  function endJob(j, reason) {
    if (!j || j.ended) return;
    j.ended = true;
    j.inChunk = false;
    if (job === j) job = null;
    if (j.started) {
      status.talking = false;
      status.talkingId = null;
      talkListeners.forEach((f) => {
        try {
          f(false, j.id);
        } catch (e) {}
      });
    }
    if (j.onEnd)
      try {
        j.onEnd(reason || 'done', j.id);
      } catch (e) {}
  }
  function stopAudio() {
    if (audio) {
      try {
        audio.pause();
      } catch (e) {}
      audio = null;
    }
    if (audioDone) {
      const f = audioDone;
      audioDone = null;
      f('cancelled');
    }
  }
  function cancel() {
    gen++;
    const j = job;
    job = null;
    stopAudio();
    if (webOk)
      try {
        speechSynthesis.cancel();
      } catch (e) {}
    endJob(j, 'cancelled');
  }
  function playBlob(blob, j) {
    // resolves 'done' when the sound has played, 'cancelled' when a newer line stopped it; rejects when it cannot play
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob),
        a = new Audio(url);
      let settled = false;
      const fin = (how, err) => {
        if (settled) return;
        settled = true;
        if (audio === a) audio = null;
        if (audioDone === done) audioDone = null;
        chunkEnd(j);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        if (err) reject(err);
        else resolve(how);
      };
      const done = (how) => fin(how);
      audio = a;
      audioDone = done;
      a.onplaying = () => chunkStart(j);
      a.onended = () => fin('done');
      a.onerror = () => fin(null, new Error('audio could not play'));
      const pr = a.play();
      if (pr && pr.catch) pr.catch((e) => fin(null, e));
    });
  }
  function webQueue(chunks, o, j) {
    // chunks are spoken one after the other by the browser's own queue; a newer call (gen) silences the older ones
    if (!webOk || !chunks.length) return endJob(j, webOk ? 'done' : 'unavailable');
    const g = gen;
    // some browsers lose the last onend now and then: a generous watchdog ends the line so "talking" never sticks
    const total = chunks.join('').length;
    setTimeout(() => {
      if (g === gen && !j.ended) endJob(j, 'done');
    }, 4000 + total * (o.lang === 'ja' ? 260 : 110) / Math.max(0.5, o.rate || 1));
    chunks.forEach((text, i) => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = o.tag;
      if (o.voice) u.voice = o.voice;
      u.rate = o.rate;
      u.pitch = o.pitch;
      u.onstart = () => {
        if (g === gen) chunkStart(j);
      };
      u.onend = u.onerror = () => {
        chunkEnd(j);
        if (i === chunks.length - 1 && g === gen) endJob(j, 'done');
      };
      speechSynthesis.speak(u);
    });
  }
  function engineQueue(chunks, r, j, fallback) {
    // all chunks are requested at once (the engine works through them in order); each is played when the one before ends.
    // Anything that fails hands the rest of the line to the browser voice.
    const g = gen,
      jobs = chunks.map((c) => synth(r, c));
    jobs.forEach((p) => p.catch(() => {}));
    let i = 0;
    const next = () => {
      if (g !== gen) return;
      if (i >= chunks.length) {
        status.last = { id: j.id, engine: r.engine, speaker: r.speaker.name, ok: true, error: '' };
        emit();
        return endJob(j, 'done');
      }
      const k = i++;
      jobs[k]
        .then((blob) => (g === gen ? playBlob(blob, j) : 'cancelled'))
        .then((how) => {
          if (how !== 'cancelled') next();
        })
        .catch((e) => {
          if (g !== gen) return;
          status.last = { id: j.id, engine: r.engine, speaker: r.speaker.name, ok: false, error: String((e && e.message) || e) };
          if (!(e && e.name === 'NotAllowedError')) status[r.engine].state = 'lost'; // probe again before the next try
          emit();
          if (status[r.engine].state === 'lost') setTimeout(() => probe(r.engine), 0);
          fallback(chunks.slice(k));
        });
    };
    next();
  }
  // the teacher says a unit (English string, or {ja, en, yomi}); opts.force speaks even when the voice is off (sample
  // button); opts.teacher picks the speaker; opts.mouth === false keeps the host's mouth still; opts.onStart(id) and
  // opts.onEnd(reason, id) report when the line is really heard and when it has finished ('done') or was cut off
  function say(unit, opts) {
    opts = opts || {};
    // callers waiting on onEnd always hear back, also when nothing could be said
    const unavailable = () => {
      if (opts.onEnd)
        try {
          opts.onEnd('unavailable', null);
        } catch (e) {}
    };
    if (!TTS.ok || (!TTS.on && !opts.force)) return unavailable();
    let j = null;
    try {
      cancel();
      const T0 = opts.teacher || (unit && TEACHERS[unit.speaker]) || (typeof TEACHER !== 'undefined' ? TEACHER : null),
        T = speakerOf(T0) || T0 || { id: 'shizue' },
        P = Object.assign({ id: T.id }, profileOf(T));
      j = job = { id: T.id, hostLip: opts.mouth !== false && !isNavigator(T0) && !isNavigator(T), onStart: opts.onStart, onEnd: opts.onEnd, started: false, ended: false, inChunk: false };
      showFor(T.id, true);
      let o = plan(T),
        text;
      if (typeof unit === 'string') {
        // English text (a utensil's description) from a Japanese-speaking character: an English voice reads it
        if (o.lang === 'ja') o = englishFor(P);
        status.last = { id: T.id, engine: 'browser', speaker: o.voice ? o.voice.name : '', ok: true, error: '' };
        return webQueue(sentences(unit), o, j);
      }
      const r = route(T);
      if (r.engine !== 'browser' && (unit.yomi || unit.ja)) {
        status.credit = creditFor(T);
        // yomi: the Japanese with the kanji an engine might misread already written in kana
        return engineQueue(sentences(unit.yomi || unit.ja), r, j, (rest) => {
          // the engine failed: the browser voice takes over from the sentence that could not be played
          if (j !== job) return;
          o = plan(T);
          webQueue(o.lang === 'ja' ? rest : sentences(unit.en), o, j);
        });
      }
      text = o.lang === 'ja' ? unit.yomi || unit.ja : unit.en;
      status.last = { id: T.id, engine: 'browser', speaker: o.voice ? o.voice.name : '', ok: true, error: '' };
      webQueue(sentences(text || ''), o, j);
    } catch (e) {
      if (j) endJob(j, 'error');
      else unavailable();
    }
  }
  // ask the engine to make a line in advance (the next line, a greeting); no effect for browser voices
  function prefetch(unit, opts) {
    try {
      const T0 = (opts && opts.teacher) || (unit && TEACHERS[unit.speaker]) || (typeof TEACHER !== 'undefined' ? TEACHER : null),
        T = speakerOf(T0) || T0,
        r = T && route(T);
      if (!r || r.engine === 'browser' || !unit || typeof unit === 'string') return;
      sentences(unit.yomi || unit.ja).forEach((c) => synth(r, c).catch(() => {}));
    } catch (e) {}
  }
  // a guest's Japanese phrase (romaji, kana): said by a Japanese browser voice when there is one, exactly as before
  function phrase(text, ja) {
    if (!webOk || !TTS.on) return;
    try {
      cancel();
      const jv = voices.find((v) => /^ja/i.test(v.lang));
      if (jv) {
        const uj = new SpeechSynthesisUtterance(ja);
        uj.lang = 'ja-JP';
        uj.voice = jv;
        uj.rate = 0.9;
        speechSynthesis.speak(uj);
        return;
      }
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-GB';
      u.rate = 0.92;
      const vs = ofLang('en'),
        h = voiceOf('shizue').hint,
        v = vs.find((v) => h.test(v.name)) || vs.find((v) => /en-GB/i.test(v.lang)) || vs[0];
      if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch (e) {}
  }

  // ---- the engine panel (#enginePanel in shell.html; moved next to the intro's voice settings, see attachPanel) ----
  const $ = (id) => document.getElementById(id);
  function stateText(S) {
    switch (S.state) {
      case 'connected':
        return 'connected' + (S.version ? ' (version ' + S.version + ')' : '') + ', ' + S.speakers.length + ' voice' + (S.speakers.length === 1 ? '' : 's');
      case 'checking':
        return 'checking…';
      case 'not-found':
        return 'not found' + (S.detail === 'timeout' ? ' (no answer)' : ' (is it running?)');
      case 'blocked':
        return S.detail === 'sandbox' ? 'not reached: this site may block it, or the engine is not running (try the downloaded HTML file)' : 'blocked by the browser (CORS: see the setup hint)';
      case 'lost':
        return 'stopped answering';
      default:
        return 'off';
    }
  }
  const nameOf = (id) => (typeof TEACHERS !== 'undefined' && TEACHERS[id] && TEACHERS[id].name) || id;
  function renderPanel() {
    const box = $('enginePanel');
    if (!box) return;
    const use = $('engineUse'),
      st = $('engineStatus'),
      now = $('engineNow'),
      cr = $('engineCredit');
    if (use) use.checked = status.enabled;
    if (st) {
      st.textContent = status.enabled ? 'VOICEVOX: ' + stateText(status.voicevox) + ' · COEIROINK: ' + stateText(status.coeiroink) : "Off: the browser's own voices are used.";
      st.dataset.state = !status.enabled ? 'off' : status.voicevox.state === 'connected' || status.coeiroink.state === 'connected' ? 'ok' : status.voicevox.state === 'checking' || status.coeiroink.state === 'checking' ? 'busy' : 'bad';
    }
    const id = status.current || (typeof TEACHER !== 'undefined' && TEACHER ? (speakerOf(TEACHER) || TEACHER).id : null);
    if (now && id) {
      const r = route(id),
        v = r.engine === 'browser' ? plan((typeof TEACHERS !== 'undefined' && TEACHERS[id]) || { id }).voice : null;
      now.textContent = nameOf(id) + ': ' + (r.speaker ? r.label + ' ' + r.speaker.name + (r.speaker.style ? ' (' + r.speaker.style + ')' : '') : r.label + (v ? ' ' + v.name : '') + (r.reason ? ' – ' + r.reason : ''));
    }
    const credit = id ? creditFor(id) : '';
    status.credit = credit;
    if (cr) {
      cr.hidden = !credit;
      cr.textContent = credit ? 'Voice: ' + credit : '';
    }
  }
  function emit() {
    renderPanel();
    statusListeners.forEach((f) => {
      try {
        f(status);
      } catch (e) {}
    });
  }
  // the panel describes this character (the selector calls it when a card is chosen; say() calls it too)
  function showFor(id, quiet) {
    if (status.current === id && quiet) return;
    status.current = id;
    renderPanel();
  }
  function setLanguage(value) {
    const next = value === 'en' ? 'en' : 'original';
    if (language === next) return;
    cancel();
    language = next;
    try {
      localStorage.setItem(LANGUAGE_KEY, language);
    } catch (e) {}
    emit();
  }
  // put the panel inside a container (default: after the intro's voice settings, else at the end of the intro card)
  function attachPanel(target) {
    if (publicBuild) return false;
    const box = $('enginePanel') || panelEl;
    if (!box) return false;
    panelEl = box;
    let parent = target,
      before = null;
    if (!parent) {
      const vb = document.querySelector('#intro .voicebox');
      if (vb) {
        parent = vb.parentNode;
        before = vb.nextSibling;
      } else {
        const start = $('start');
        if (start && start.closest('#intro')) {
          parent = start.parentNode;
          before = start;
        }
      }
    }
    if (!parent) return false;
    parent.insertBefore(box, before);
    box.hidden = false;
    renderPanel();
    return true;
  }
  let panelEl = null;
  function initPanel() {
    const box = $('enginePanel');
    if (!box) return;
    panelEl = box;
    const use = $('engineUse'),
      again = $('engineRetry');
    if (use)
      use.addEventListener('change', () => {
        setEnabled(use.checked);
      });
    if (again) again.addEventListener('click', () => (status.enabled ? probeAll() : setEnabled(true)));
    attachPanel();
    renderPanel();
  }
  // teachers without a voice object (05-teachers) get one from their profile, for the Voice selector (50-player)
  if (typeof TEACHERS !== 'undefined') for (const id in TEACHERS) if (!TEACHERS[id].voice) TEACHERS[id].voice = voiceOf(id);
  initPanel();
  if (status.enabled) setTimeout(probeAll, 0); // in the background: the page never waits for the engines

  return {
    get ok() {
      return webOk || (language !== 'en' && status.enabled && (status.voicevox.state === 'connected' || status.coeiroink.state === 'connected'));
    },
    on: false,
    say,
    phrase,
    cancel,
    plan,
    voicesFor,
    get language() { return language; },
    setLanguage,
    ranked,
    chosenName,
    setChosen,
    onVoices: (f) => listeners.push(f),
    sentences,
    // engines, profiles and status
    profiles: PROFILES,
    profileOf,
    voiceOf,
    route,
    creditFor,
    status,
    probe: probeAll,
    setEngines: setEnabled,
    prefetch,
    onTalk: (f) => talkListeners.push(f),
    onStatus: (f) => statusListeners.push(f),
    showFor,
    attachPanel,
    get talking() {
      return status.talking;
    },
    // Includes synthesis and gaps between sentences, before/after audible speech.
    get busy() {
      return !!job && !job.ended;
    },
  };
})();
