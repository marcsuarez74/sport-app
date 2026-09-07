import { useState } from 'react';
import sampleRaw from '../assets/semaine-exemple.md?raw';
import { parseWeeklyFile } from '../lib/parse';
import { saveWeek } from '../lib/storage';
import { ImportButton } from './ImportButton';

export function ImportScreen({ onImported }: { onImported: () => void }) {
  const [error, setError] = useState('');
  const loadSample = () => {
    try {
      const { data, warnings } = parseWeeklyFile(sampleRaw);
      saveWeek(sampleRaw, data);
      if (warnings.length) console.warn('Import:', warnings);
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fichier d'exemple invalide");
    }
  };
  return (
    <main className="import-screen">
      <h1>Sport App</h1>
      <p>Importez le fichier .md de la semaine pour afficher courses, menu, batch et vos suivis.</p>
      <ImportButton onImported={onImported} />
      <button type="button" className="btn" onClick={loadSample}>
        Charger la semaine d'exemple
      </button>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </main>
  );
}
