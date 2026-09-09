import { useRef, useState } from 'react';
import type { MicroBatchJour, RituelEtape } from '../../lib/model';
import { getChecks, setCheck } from '../../lib/storage';
import { capitalize } from '../../lib/text';

export function BatchView({
  rituel,
  microBatch,
  semaine,
}: {
  rituel?: RituelEtape[];
  microBatch?: MicroBatchJour[];
  semaine: string;
}) {
  const hasRituel = !!rituel?.length;
  const hasMicro = !!microBatch?.length;
  return (
    <>
      {hasRituel && rituel && <RituelTimeline etapes={rituel} semaine={semaine} />}
      {hasMicro && microBatch && <MicroBatch jours={microBatch} />}
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

function RituelTimeline({ etapes, semaine }: { etapes: RituelEtape[]; semaine: string }) {
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
        <span className="rayon-cnt">
          {done}/{etapes.length}
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
