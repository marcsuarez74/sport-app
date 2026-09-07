import type { ChecklistItem } from '../../lib/model';
import { Checklist } from '../Checklist';

export function BatchView({ items, semaine }: { items: ChecklistItem[]; semaine: string }) {
  if (items.length === 0) {
    return <p className="muted">Aucun batch prévu cette semaine.</p>;
  }
  return (
    <>
      <p className="batch-banner">Gros batch : dimanche, 45-60 min</p>
      <Checklist items={items} semaine={semaine} />
    </>
  );
}
