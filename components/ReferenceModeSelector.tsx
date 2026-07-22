import React from 'react';
import { ReferenceMode } from '../types';

interface Props {
  mode: ReferenceMode;
  instruction: string;
  onModeChange: (mode: ReferenceMode) => void;
  onInstructionChange: (instruction: string) => void;
}

const MODES: Array<{
  id: ReferenceMode;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    id: 'current',
    label: 'Como hasta ahora',
    description: 'Conserva exactamente el comportamiento actual.',
    icon: '●',
  },
  {
    id: 'preserve-photo',
    label: 'Mantener foto',
    description: 'Conserva encuadre, persona, fondo, pose y luz.',
    icon: '▣',
  },
  {
    id: 'replace-person',
    label: 'Cambiar persona',
    description: 'Mantiene la escena y sustituye al personaje.',
    icon: '◉',
  },
  {
    id: 'replace-background',
    label: 'Cambiar fondo',
    description: 'Mantiene sujeto y composición con otro ambiente.',
    icon: '▧',
  },
  {
    id: 'inspiration',
    label: 'Sólo inspiración',
    description: 'Toma calidad, tono, óptica y luz; crea algo original.',
    icon: '✦',
  },
];

const PLACEHOLDERS: Partial<Record<ReferenceMode, string>> = {
  'replace-person': 'Describe la nueva persona: edad adulta, apariencia, vestuario, actitud...',
  'replace-background': 'Describe el nuevo fondo: estudio blanco, hotel de lujo, exterior urbano...',
  inspiration: 'Indica qué elementos nuevos quieres en la fotografía...',
};

export const ReferenceModeSelector: React.FC<Props> = ({
  mode,
  instruction,
  onModeChange,
  onInstructionChange,
}) => {
  const needsInstruction = mode === 'replace-person' || mode === 'replace-background' || mode === 'inspiration';

  return (
    <div className="space-y-4 rounded-[2rem] border border-indigo-500/15 bg-indigo-500/5 p-5">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Uso de la referencia</p>
        <p className="mt-1 text-[9px] leading-relaxed text-slate-500">Elige qué debe conservar la IA antes de disparar la producción.</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {MODES.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={mode === option.id}
            onClick={() => {
              onModeChange(option.id);
              if (option.id === 'current' || option.id === 'preserve-photo') onInstructionChange('');
            }}
            className={`rounded-2xl border p-3 text-left transition-all ${
              mode === option.id
                ? 'border-indigo-400/60 bg-indigo-600/20 text-white shadow-lg shadow-indigo-950/40'
                : 'border-white/5 bg-slate-950/40 text-slate-500 hover:border-white/15 hover:text-slate-300'
            }`}
          >
            <span className="mb-2 block text-sm text-indigo-400">{option.icon}</span>
            <span className="block text-[9px] font-black uppercase leading-tight">{option.label}</span>
            <span className="mt-1 block text-[7px] leading-relaxed opacity-60">{option.description}</span>
          </button>
        ))}
      </div>

      {needsInstruction && (
        <textarea
          value={instruction}
          onChange={(event) => onInstructionChange(event.target.value)}
          placeholder={PLACEHOLDERS[mode]}
          className="min-h-[88px] w-full rounded-2xl border border-white/10 bg-slate-950 p-4 text-[10px] leading-relaxed text-white outline-none transition-colors placeholder:text-slate-700 focus:border-indigo-500/50"
        />
      )}

      <p className="text-[7px] leading-relaxed text-slate-600">
        El producto conserva siempre la máxima prioridad. “Mantener foto” recrea la estructura visual, pero no garantiza una copia píxel por píxel.
      </p>
    </div>
  );
};
