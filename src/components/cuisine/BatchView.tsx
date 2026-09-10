import { useRef, useState } from 'react';
import type { MicroBatchJour, RituelEtape } from '../../lib/model';
import { getChecks, setCheck } from '../../lib/storage';
import { todayKey } from '../../lib/dates';
import { capitalize } from '../../lib/text';
import { Icon } from '../Icon';

export function BatchView({
  rituel,
  microBatch,
  semaine,
}: {
  rituel?: RituelEtape[];
  microBatch?: MicroBatchJour[];
  semaine: string;
}) {
  const [mode, setMode] = useState<'apercu' | 'run' | 'fini'>('apercu');
  const [idx, setIdx] = useState(0);
  const hasRituel = !!rituel?.length;
  const hasMicro = !!microBatch?.length;
  const ceSoir = microBatch?.find((m) => m.jour === todayKey());

  return (
    <>
      {ceSoir && (
        <div className="batch-banner ce-soir">
          <span className="bb-ic">
            <Icon name="moon" size={16} />
          </span>
          <span>
            <b>Ce soir ({ceSoir.jour})</b> — {ceSoir.quoi}
          </span>
        </div>
      )}
      {hasRituel && rituel && mode === 'apercu' && (
        <RituelTimeline
          etapes={rituel}
          semaine={semaine}
          onLancer={() => {
            setMode('run');
            setIdx(0);
          }}
        />
      )}
      {hasRituel && rituel && mode === 'run' && (
        <section className="batch-section batch-guide" aria-live="polite">
          <div className="guide-etape-num">
            Étape {idx + 1}/{rituel.length} · {rituel[idx].creneau}
          </div>
          <h3 className="guide-titre">{rituel[idx].label}</h3>
          {rituel[idx].detail && <p className="guide-detail">{rituel[idx].detail}</p>}
          <progress value={idx} max={rituel.length} aria-hidden="true" />
          <button
            type="button"
            className="btn"
            onClick={() => (idx + 1 < rituel.length ? setIdx(idx + 1) : setMode('fini'))}
          >
            {idx + 1 < rituel.length ? 'Étape terminée →' : 'Terminer le batch ✓'}
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              setMode('apercu');
              setIdx(0);
            }}
          >
            Revenir à l'aperçu
          </button>
        </section>
      )}
      {hasRituel && mode === 'fini' && (
        <section className="batch-section batch-guide" aria-live="polite">
          <span className="guide-done-ic">
            <Icon name="check" size={28} strokeWidth={2.5} />
          </span>
          <h3 className="guide-titre">Batch terminé !</h3>
          <p className="guide-detail">Tout est prêt pour la semaine.</p>
          <button type="button" className="btn-ghost" onClick={() => setMode('apercu')}>
            Revenir à l'aperçu
          </button>
        </section>
      )}
      {hasMicro && mode === 'apercu' && microBatch && <MicroBatch jours={microBatch} />}
      {!hasRituel && !hasMicro && <p className="muted">Aucun batch prévu cette semaine.</p>}
    </>
  );
}

function MicroBatch({ jours }: { jours: MicroBatchJour[] }) {
  const [actif, setActif] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const auScroll = () => {
    const el = ref.current;
    if (!el) return;
    const premier = el.firstElementChild as HTMLElement | null;
    const largeur = premier ? premier.offsetWidth + 8 : 158;
    setActif(Math.min(jours.length - 1, Math.max(0, Math.round(el.scrollLeft / largeur))));
  };
  return (
    <section className="batch-section">
      <h3>⚡ Micro-batch de la semaine</h3>
      <div className="micro-batch" ref={ref} onScroll={auScroll}>
        {jours.map((m) => (
          <div className="micro-jour" key={m.jour}>
            <div className="micro-jour-nom">{capitalize(m.jour)}</div>
            <div className="micro-jour-quoi">{m.quoi}</div>
          </div>
        ))}
      </div>
      <div className="micro-dots" aria-hidden="true">
        {jours.map((_, i) => (
          <i key={i} className={i === actif ? 'on' : ''} />
        ))}
      </div>
    </section>
  );
}

function RituelTimeline({
  etapes,
  semaine,
  onLancer,
}: {
  etapes: RituelEtape[];
  semaine: string;
  onLancer: () => void;
}) {
  const [checks, setChecks] = useState<Record<string, boolean>>(() => getChecks(semaine));
  const [syncedSemaine, setSyncedSemaine] = useState(semaine);
  if (syncedSemaine !== semaine) {
    setSyncedSemaine(semaine);
    setChecks(getChecks(semaine));
  }
  const done = etapes.filter((e) => checks[e.id]).length;
  const toggle = (id: string) => {
    const next = !checks[id];
    setCheck(semaine, id, next);
    setChecks((prev) => ({ ...prev, [id]: next }));
  };
  return (
    <section className="batch-section">
      <div className="batch-section-head">
        <h3>🕐 Rituel du dimanche · 45-60 min</h3>
        <span className="lancer-wrap">
          <button type="button" className="lancer" onClick={onLancer}>
            <Icon name="play" size={12} /> Lancer le batch
          </button>
          <span className="rayon-cnt">
            {done}/{etapes.length}
          </span>
        </span>
      </div>
      <ol className="rituel-timeline">
        {etapes.map((e) => (
          <li className={checks[e.id] ? 'rituel-etape done' : 'rituel-etape'} key={e.id}>
            <label>
              <input
                type="checkbox"
                checked={!!checks[e.id]}
                onChange={() => toggle(e.id)}
                aria-label={`${e.label} (${e.creneau})`}
              />
              <span className="rituel-corps">
                <span className="rituel-label">
                  {e.label}
                  <span className="rituel-creneau">{e.creneau}</span>
                </span>
                {e.detail && <span className="rituel-detail">{e.detail}</span>}
              </span>
            </label>
          </li>
        ))}
      </ol>
    </section>
  );
}
