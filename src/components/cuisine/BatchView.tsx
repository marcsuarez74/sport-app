import { useState } from 'react';
import type { ChecklistItem, MicroBatchJour, RituelEtape } from '../../lib/model';
import { Checklist } from '../Checklist';
import { getChecks, setCheck } from '../../lib/storage';
import { capitalize } from '../../lib/text';

export function BatchView({
  items,
  semaine,
  rituel,
  microBatch,
}: {
  items: ChecklistItem[];
  semaine: string;
  rituel?: RituelEtape[];
  microBatch?: MicroBatchJour[];
}) {
  const hasRituel = !!rituel?.length;
  const hasMicro = !!microBatch?.length;
  return (
    <>
      {hasRituel && rituel && <RituelTimeline etapes={rituel} semaine={semaine} />}
      {hasMicro && microBatch && (
        <section className="batch-section">
          <h3>⚡ Micro-batch de la semaine</h3>
          <div className="micro-batch">
            {microBatch.map((m) => (
              <div className="micro-jour" key={m.jour}>
                <div className="micro-jour-nom">{capitalize(m.jour)}</div>
                <div className="micro-jour-quoi">{m.quoi}</div>
              </div>
            ))}
          </div>
        </section>
      )}
      {items.length > 0 ? (
        <>
          <p className="batch-banner">Gros batch : dimanche, 45-60 min</p>
          <Checklist items={items} semaine={semaine} />
        </>
      ) : (
        !hasRituel && <p className="muted">Aucun batch prévu cette semaine.</p>
      )}
    </>
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
