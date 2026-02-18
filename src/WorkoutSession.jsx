import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Pause, SkipForward, X, Dumbbell,
  Timer, Flame, ChevronLeft, RotateCcw, Volume2, VolumeX,
} from 'lucide-react';
import './WorkoutSession.css';

/* ═══════════════════════════════════════════════════════════════
   AUDIO — Web Audio API oscillator beeps (no files needed)
   ═══════════════════════════════════════════════════════════════ */
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playBeep(freq = 880, duration = 0.15, count = 1) {
  try {
    const ctx = getAudioCtx();
    for (let i = 0; i < count; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.25 + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.25);
      osc.stop(ctx.currentTime + i * 0.25 + duration);
    }
  } catch {
    /* silently fail if audio not available */
  }
}

function playWorkBeep() { playBeep(1000, 0.12, 1); }            // short high beep
function playRestBeep() { playBeep(600, 0.18, 2); }             // double low beep
function playFinishBeep() { playBeep(1200, 0.15, 3); }          // triple high beep
function playCountdownBeep() { playBeep(800, 0.08, 1); }        // tick

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════ */
const WORK_DURATION = 30;
const REST_DURATION = 10;

const PHASE_LABELS = {
  work: { ar: 'تمرين!', color: 'var(--accent)' },
  rest: { ar: 'استراحة', color: '#38bdf8' },
  finished: { ar: 'انتهى التمرين!', color: '#22c55e' },
  ready: { ar: 'استعد...', color: 'var(--accent)' },
};

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function WorkoutSession({ exercises, dayLabel, onClose }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [phase, setPhase] = useState('ready');       // ready | work | rest | finished
  const [timeLeft, setTimeLeft] = useState(3);       // 3s get-ready countdown
  const [isPaused, setIsPaused] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const intervalRef = useRef(null);
  const phaseRef = useRef(phase);
  const soundRef = useRef(soundOn);

  /* Keep refs in sync */
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { soundRef.current = soundOn; }, [soundOn]);

  const total = exercises.length;
  const current = exercises[currentIdx] || null;
  const next = exercises[currentIdx + 1] || null;

  /* ── Core tick ── */
  const tick = useCallback(() => {
    setTimeLeft((prev) => {
      const n = prev - 1;

      /* Countdown ticks at 3,2,1 */
      if (n > 0 && n <= 3 && soundRef.current) playCountdownBeep();

      if (n <= 0) {
        /* Transition */
        if (phaseRef.current === 'ready') {
          setPhase('work');
          if (soundRef.current) playWorkBeep();
          return WORK_DURATION;
        }
        if (phaseRef.current === 'work') {
          /* Move to rest or next exercise */
          setPhase('rest');
          if (soundRef.current) playRestBeep();
          return REST_DURATION;
        }
        if (phaseRef.current === 'rest') {
          setCurrentIdx((ci) => {
            const ni = ci + 1;
            if (ni >= exercises.length) {
              setPhase('finished');
              if (soundRef.current) playFinishBeep();
              return 0;
            }
            setPhase('work');
            if (soundRef.current) playWorkBeep();
            return WORK_DURATION;
          });
          return WORK_DURATION;     // will be overwritten by setCurrentIdx branch
        }
        return 0;
      }
      return n;
    });
  }, [exercises.length]);

  /* ── Start / stop interval ── */
  useEffect(() => {
    if (phase === 'finished') {
      clearInterval(intervalRef.current);
      return;
    }
    if (isPaused) {
      clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(tick, 1000);
    return () => clearInterval(intervalRef.current);
  }, [phase, isPaused, tick]);

  /* Cleanup on unmount */
  useEffect(() => () => clearInterval(intervalRef.current), []);

  /* ── Skip exercise ── */
  function skipExercise() {
    if (currentIdx + 1 >= total) {
      setPhase('finished');
      if (soundOn) playFinishBeep();
      setTimeLeft(0);
      return;
    }
    setCurrentIdx((ci) => ci + 1);
    setPhase('work');
    setTimeLeft(WORK_DURATION);
    if (soundOn) playWorkBeep();
  }

  /* ── Restart ── */
  function restart() {
    setCurrentIdx(0);
    setPhase('ready');
    setTimeLeft(3);
    setIsPaused(false);
  }

  /* ── Compute ring progress ── */
  const maxTime =
    phase === 'ready' ? 3 :
    phase === 'work' ? WORK_DURATION :
    phase === 'rest' ? REST_DURATION : 1;
  const progress = phase === 'finished' ? 1 : 1 - timeLeft / maxTime;
  const CIRCLE_R = 120;
  const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_R;
  const strokeOffset = CIRCUMFERENCE * (1 - progress);
  const ringColor = PHASE_LABELS[phase]?.color || 'var(--accent)';

  return (
    <div className="ws-overlay">
      <div className="ws-backdrop" onClick={onClose} />
      <div className="ws-container">
        {/* ── Header ── */}
        <div className="ws-header">
          <button className="ws-icon-btn" onClick={onClose} title="إغلاق">
            <X size={22} />
          </button>
          <h2 className="ws-day-label">{dayLabel}</h2>
          <button
            className="ws-icon-btn"
            onClick={() => setSoundOn((s) => !s)}
            title={soundOn ? 'كتم الصوت' : 'تشغيل الصوت'}
          >
            {soundOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
        </div>

        {/* ── Progress dots ── */}
        <div className="ws-dots">
          {exercises.map((_, i) => (
            <div
              key={i}
              className={`ws-dot ${i < currentIdx ? 'completed' : ''} ${i === currentIdx ? 'active' : ''}`}
            />
          ))}
        </div>

        {/* ── Phase Label ── */}
        <div className="ws-phase-label" style={{ color: ringColor }}>
          {PHASE_LABELS[phase]?.ar}
        </div>

        {/* ── Timer Ring ── */}
        <div className="ws-timer-area">
          <svg className="ws-ring" viewBox="0 0 260 260">
            {/* bg ring */}
            <circle cx="130" cy="130" r={CIRCLE_R}
              fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
            {/* progress ring */}
            <circle cx="130" cy="130" r={CIRCLE_R}
              fill="none" stroke={ringColor} strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={strokeOffset}
              style={{
                transition: 'stroke-dashoffset 0.35s linear, stroke 0.3s',
                transform: 'rotate(-90deg)',
                transformOrigin: '50% 50%',
              }}
            />
          </svg>
          <div className="ws-timer-text">
            {phase === 'finished' ? (
              <span className="ws-done-icon">✓</span>
            ) : (
              <>
                <span className="ws-time-num">{timeLeft}</span>
                <span className="ws-time-unit">ث</span>
              </>
            )}
          </div>
        </div>

        {/* ── Current Exercise ── */}
        {phase !== 'finished' && current && (
          <div className="ws-exercise-display">
            <h3 className="ws-current-name">{current.name}</h3>
            <p className="ws-current-info">
              <Dumbbell size={14} /> {current.sets} × {current.reps}
              <span className="ws-divider">|</span>
              شدة {current.intensity}/10
            </p>
            <p className="ws-current-instructions">{current.instructions}</p>
          </div>
        )}

        {/* ── Next Up ── */}
        {phase !== 'finished' && next && (
          <div className="ws-next-up">
            <span className="ws-next-label">التالي:</span>
            <span className="ws-next-name">{next.name}</span>
          </div>
        )}

        {/* ── Finished Screen ── */}
        {phase === 'finished' && (
          <div className="ws-finished-content">
            <h3 className="ws-finished-title">أحسنت! أكملت جميع التمارين 🎉</h3>
            <p className="ws-finished-sub">{total} تمرين | {dayLabel}</p>
          </div>
        )}

        {/* ── Control Buttons ── */}
        <div className="ws-controls">
          {phase !== 'finished' ? (
            <>
              <button className="ws-ctrl-btn ws-btn-skip" onClick={skipExercise} title="تخطي">
                <SkipForward size={20} />
                <span>تخطي</span>
              </button>
              <button
                className={`ws-ctrl-btn ws-btn-play ${isPaused ? 'paused' : ''}`}
                onClick={() => setIsPaused((p) => !p)}
                title={isPaused ? 'استئناف' : 'إيقاف مؤقت'}
              >
                {isPaused ? <Play size={28} /> : <Pause size={28} />}
              </button>
              <button className="ws-ctrl-btn ws-btn-restart" onClick={restart} title="إعادة">
                <RotateCcw size={20} />
                <span>إعادة</span>
              </button>
            </>
          ) : (
            <>
              <button className="ws-ctrl-btn ws-btn-restart" onClick={restart}>
                <RotateCcw size={20} />
                <span>إعادة التمرين</span>
              </button>
              <button className="ws-ctrl-btn ws-btn-close" onClick={onClose}>
                <ChevronLeft size={20} />
                <span>العودة</span>
              </button>
            </>
          )}
        </div>

        {/* ── Exercise counter ── */}
        <p className="ws-counter">
          {phase !== 'finished'
            ? `التمرين ${currentIdx + 1} من ${total}`
            : `${total}/${total} مكتمل`}
        </p>
      </div>
    </div>
  );
}
