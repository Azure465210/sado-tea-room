// The selected instructor's dossier: role, personality, traits, greeting and the "Hear the greeting" button.
import { ENGINE_LABEL, type Character } from '../data/characters';

export function DetailPanel({
  character: c, talking, canSpeak, onSpeak, onEnter, enterLabel = 'Enter the tea room',
}: {
  character: Character;
  talking: boolean;
  canSpeak: boolean;
  onSpeak: () => void;
  /** an "Enter" button next to "Hear the greeting" (shown where the panel sits beside the grid) */
  onEnter?: () => void;
  enterLabel?: string;
}) {
  const voiceCredit = c.voice.credit;
  // no aria-live on the dossier: each arrow-key step would read out the whole panel; the radio's own label announces the choice
  return (
    <section className="ss-detail" style={{ ['--accent' as string]: c.accent }} aria-labelledby="ss-detail-name">
      <div className="ss-detail-head">
        <div className="ss-detail-slash" aria-hidden="true" />
        <h3 id="ss-detail-name" className="ss-detail-name">
          {c.nameEn}
          <span className="ss-detail-ja" lang="ja">{c.nameJa}</span>
        </h3>
        <div className="ss-detail-tags">
          <span className="ss-chip ss-chip-solid">{ENGINE_LABEL[c.engine]}</span>
          <span className="ss-chip">{c.teaRole === 'performer' ? 'Performs the ceremony' : 'Navigator · commentates'}</span>
          {c.badge ? <span className="ss-chip ss-chip-original">{c.badge}</span> : null}
        </div>
      </div>
      <p className="ss-detail-role">
        <span>{c.card.role.en}</span>
        <span className="ss-ja" lang="ja">{c.card.role.ja}</span>
      </p>
      <blockquote className={'ss-greeting' + (talking ? ' is-talking' : '')}>
        {c.voice.lang === 'ja' ? <p lang="ja">「{c.greeting.ja}」</p> : null}
        <p className={c.voice.lang === 'ja' ? 'ss-greeting-en' : ''}>“{c.greeting.en}”</p>
      </blockquote>
      <div className="ss-detail-actions">
        <button type="button" className="ss-btn ss-btn-hear" onClick={onSpeak} disabled={!canSpeak} aria-pressed={talking}>
          <span className="ss-btn-in">{talking ? 'Speaking…' : 'Hear the greeting'}</span>
        </button>
        {onEnter ? (
          <button type="button" className="ss-btn ss-btn-enter" onClick={onEnter}>
            <span className="ss-btn-in">{enterLabel}</span>
          </button>
        ) : null}
      </div>
      <p className="ss-detail-text">{c.card.personality.en}</p>
      <p className="ss-detail-text ss-ja" lang="ja">{c.card.personality.ja}</p>
      <ul className="ss-traits" aria-label="Traits">
        {c.card.traits.map((t) => (
          <li key={t.en} className="ss-trait">
            {t.en}
            <span className="ss-ja" lang="ja">{t.ja}</span>
          </li>
        ))}
      </ul>
      {c.teaRole === 'navigator' ? (
        <p className="ss-note">Shizue-sensei performs the ceremony; {c.nameEn} explains it from a small window in the corner.</p>
      ) : null}
      {voiceCredit ? <p className="ss-note">Credit when the {ENGINE_LABEL[c.engine]} engine is used: <span lang="ja">{voiceCredit}</span></p> : null}
      {c.credit ? <p className="ss-note">{c.credit}</p> : null}
    </section>
  );
}
