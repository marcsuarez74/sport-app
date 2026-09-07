import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { parseWeeklyFile } from '../lib/parse';
import { loadWeek, saveWeek } from '../lib/storage';

export function ImportButton({
  onImported,
  label = 'Importer un .md',
}: {
  onImported: () => void;
  label?: string;
}) {
  const [error, setError] = useState('');
  const onChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const raw = await file.text();
      e.target.value = '';
      const { data, warnings } = parseWeeklyFile(raw);
      const current = loadWeek();
      if (
        current &&
        current.data.meta.semaine !== data.meta.semaine &&
        !window.confirm(`Remplacer « ${current.data.meta.semaine} » par « ${data.meta.semaine} » ?`)
      )
        return;
      saveWeek(raw, data);
      if (warnings.length) console.warn('Import:', warnings);
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fichier invalide');
    }
  };
  return (
    <div className="import">
      <label className="btn">
        {label}
        <input type="file" accept=".md,text/markdown" className="sr-only" onChange={onChange} />
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
