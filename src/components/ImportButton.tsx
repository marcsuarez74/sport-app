import { useState } from 'react';
import type { ChangeEvent } from 'react';
import type { WeeklyData } from '../lib/model';
import { parseWeeklyFile } from '../lib/parse';
import { loadWeeks, upsertWeek } from '../lib/storage';

export function ImportButton({
  onImported,
  label = 'Importer un .md',
}: {
  onImported: () => void;
  label?: string;
}) {
  const [erreur, setErreur] = useState('');
  const [resume, setResume] = useState('');

  const onChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const fichiers = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!fichiers.length) return;
    const valides: { raw: string; data: WeeklyData }[] = [];
    const invalides: string[] = [];
    let warningsTotal = 0;
    for (const fichier of fichiers) {
      try {
        const raw = await fichier.text();
        const { data, warnings } = parseWeeklyFile(raw);
        warningsTotal += warnings.length;
        valides.push({ raw, data });
      } catch {
        invalides.push(fichier.name);
      }
    }
    const presentes = loadWeeks();
    const aRemplacer = valides
      .map((v) => v.data.meta.semaine)
      .filter((s) => !!presentes[s]);
    if (aRemplacer.length && !window.confirm(`Remplacer : ${aRemplacer.join(', ')} ?`)) return;
    for (const v of valides) upsertWeek(v.raw, v.data);
    setErreur(invalides.length ? `Fichier(s) invalide(s) : ${invalides.join(', ')}` : '');
    setResume(
      valides.length
        ? `${valides.length} semaine(s) importée(s)${warningsTotal ? ` · ⚠ ${warningsTotal} ligne(s) ignorée(s)` : ''}`
        : '',
    );
    if (valides.length) onImported();
  };

  return (
    <div className="import">
      <label className="btn">
        {label}
        <input
          type="file"
          accept=".md,text/markdown"
          multiple
          className="sr-only"
          onChange={onChange}
        />
      </label>
      {erreur && (
        <p className="error" role="alert">
          {erreur}
        </p>
      )}
      {resume && (
        <p className="muted warn-line" role="status">
          ✓ {resume}
        </p>
      )}
    </div>
  );
}
