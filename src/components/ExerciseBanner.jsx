import {
  Dumbbell, HeartPulse, StretchHorizontal,
  Target, Footprints, Zap, Waves,
} from 'lucide-react';

/* ── icon + gradient map per muscle / category ── */
const VISUALS = {
  chest:     { Icon: Dumbbell,           bg: 'linear-gradient(135deg, #1a1a1a 60%, rgba(204,255,0,.12))' },
  back:      { Icon: Waves,              bg: 'linear-gradient(135deg, #1a1a1a 60%, rgba(0,243,255,.12))' },
  legs:      { Icon: Footprints,         bg: 'linear-gradient(135deg, #1a1a1a 60%, rgba(139,92,246,.14))' },
  core:      { Icon: Target,             bg: 'linear-gradient(135deg, #1a1a1a 60%, rgba(251,191,36,.12))' },
  full_body: { Icon: Zap,               bg: 'linear-gradient(135deg, #1a1a1a 60%, rgba(204,255,0,.08), rgba(0,243,255,.08))' },
  cardio:    { Icon: HeartPulse,         bg: 'linear-gradient(135deg, #1a1a1a 60%, rgba(239,68,68,.12))' },
  flexibility:{ Icon: StretchHorizontal, bg: 'linear-gradient(135deg, #1a1a1a 60%, rgba(56,189,248,.12))' },
};

const ACCENT_MAP = {
  chest:      '#ccff00',
  back:       '#00f3ff',
  legs:       '#a78bfa',
  core:       '#fbbf24',
  full_body:  '#ccff00',
  cardio:     '#ef4444',
  flexibility:'#38bdf8',
};

export default function ExerciseBanner({ muscleKey, category }) {
  const key = category === 'cardio' ? 'cardio'
            : category === 'flexibility' ? 'flexibility'
            : muscleKey;

  const { Icon, bg } = VISUALS[key] || VISUALS.full_body;
  const accent = ACCENT_MAP[key] || '#ccff00';

  return (
    <div
      className="ex-banner"
      style={{ background: bg }}
    >
      {/* subtle decorative ring */}
      <div
        style={{
          position: 'absolute',
          width: 120,
          height: 120,
          borderRadius: '50%',
          border: `1.5px solid ${accent}`,
          opacity: 0.06,
        }}
      />
      <Icon size={44} color={accent} strokeWidth={1.5} style={{ opacity: 0.85, position: 'relative', zIndex: 1 }} />
    </div>
  );
}
