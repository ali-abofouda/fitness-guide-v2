import { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck, HeartPulse, Flame, Snowflake,
  Activity, Dumbbell, StretchHorizontal, UserRound,
  BriefcaseMedical, BarChart3, Sparkles,
  ChevronLeft, ChevronRight, ChevronDown, Clock, Lightbulb, ArrowDown,
  Droplets, Target, CalendarDays, Ruler, Weight,
  TrendingUp, Brain, CheckCircle2, Home, Check, Eye, X, Zap, Star, MessageCircle, HelpCircle,
} from 'lucide-react';
import './App.css';
import { exercises as rawExercises } from './data/exercises';
import WorkoutSession from './WorkoutSession';
import ExerciseBanner from './components/ExerciseBanner';

/* ═══════════════════════════════════════════════════════════════
   ADAPTER — maps exercises.js schema → app internal schema
   ═══════════════════════════════════════════════════════════════ */
const EXERCISE_DB = rawExercises.map((ex) => {
  let split;
  if (ex.category === 'cardio') split = 'cardio';
  else if (ex.category === 'flexibility') split = 'flexibility';
  else {
    const map = { chest: 'push', back: 'pull', legs: 'legs', core: 'core', full_body: 'push' };
    split = map[ex.targetMuscle] || 'push';
  }

  const location = ex.equipment === 'gym_machine' ? 'gym' : 'both';
  const intensity = { beginner: 4, intermediate: 6, advanced: 9 }[ex.level] || 5;

  const contraindications = ex.excludedInjuries.map(
    (inj) => inj.charAt(0).toUpperCase() + inj.slice(1),
  );

  const mgMap = {
    chest: ['chest', 'triceps'], back: ['back', 'biceps'],
    legs: ['quads', 'glutes'], core: ['core'],
    full_body: ['chest', 'back', 'quads'],
  };
  const muscleGroups =
    ex.category === 'cardio' ? ['cardio'] :
    ex.category === 'flexibility' ? ['flexibility'] :
    mgMap[ex.targetMuscle] || [ex.targetMuscle];

  let sets = 3, reps = '10-12';
  if (ex.category === 'cardio') { sets = 1; reps = '15-20 د'; }
  else if (ex.category === 'flexibility') { sets = 1; reps = '20-30 ث'; }
  else if (ex.level === 'advanced') { sets = 4; reps = '8-10'; }

  const ageRange = { beginner: [12, 75], intermediate: [14, 65], advanced: [16, 55] };
  const [minAge, maxAge] = ageRange[ex.level] || [14, 65];

  const impactLevel =
    ex.level === 'advanced' ||
    (ex.category === 'cardio' && ex.excludedInjuries.includes('knee'))
      ? 'High' : 'Low';

  const muscleLabel = {
    chest: 'صدر', back: 'ظهر', legs: 'أرجل', core: 'بطن',
    full_body: 'جسم كامل',
  }[ex.targetMuscle] || (ex.category === 'cardio' ? 'كارديو' : 'مرونة');

  const levelLabel = { beginner: 'سهل', intermediate: 'متوسط', advanced: 'صعب' }[ex.level] || 'متوسط';

  return {
    id: ex.id, name: ex.name, instructions: ex.instructions,
    gifUrl: ex.gifUrl || '',
    targetMuscle: ex.targetMuscle,
    category: ex.category,
    sets, reps, muscleGroups, split, location, intensity,
    impactLevel, contraindications, minAge, maxAge,
    muscleLabel, levelLabel, level: ex.level,
  };
});

/* ═══════════════════════════════════════════════════════════════
   WARM-UP & COOL-DOWN
   ═══════════════════════════════════════════════════════════════ */
const WARMUP = [
  { name: 'دوران الرقبة', dur: '1 د', desc: 'أدِر رقبتك ببطء في كل اتجاه 10 مرات.' },
  { name: 'دوران الكتفين', dur: '1 د', desc: 'أدِر كتفيك للأمام ثم للخلف 15 مرة.' },
  { name: 'دوران الوركين', dur: '1 د', desc: 'ضع يديك على خصرك وأدِر وركيك في دوائر.' },
  { name: 'المشي في المكان', dur: '2 د', desc: 'امشِ في مكانك مع رفع الركبتين تدريجياً.' },
  { name: 'تمدد ديناميكي', dur: '2 د', desc: 'ارفع كل ساق للأمام بالتناوب مع أرجحة خفيفة.' },
];
const COOLDOWN = [
  { name: 'المشي البطيء', dur: '2 د', desc: 'امشِ ببطء لتخفيض معدل ضربات القلب.' },
  { name: 'إطالة الفخذ', dur: '1 د', desc: 'أمسك قدمك خلفك واسحبها نحو المؤخرة.' },
  { name: 'إطالة أوتار الركبة', dur: '1 د', desc: 'مد ساقك وانحنِ نحو أصابع قدميك.' },
  { name: 'إطالة الكتف والصدر', dur: '1 د', desc: 'شبّك يديك خلف ظهرك وافتح صدرك.' },
  { name: 'تنفس عميق', dur: '2 د', desc: 'شهيق 4 ث، احبس 4 ث، زفير 6 ث.' },
];

/* ═══════════════════════════════════════════════════════════════
   LABELS (Arabic)
   ═══════════════════════════════════════════════════════════════ */
const GENDER_OPTS = [{ v: 'male', l: 'ذكر' }, { v: 'female', l: 'أنثى' }];
const ACTIVITY_OPTS = [
  { v: 'sedentary', l: 'قليل الحركة' },
  { v: 'active', l: 'نشيط' },
  { v: 'athlete', l: 'رياضي' },
];
const INJURY_CHIPS = [
  { v: 'None', l: 'لا يوجد إصابة', icon: ShieldCheck },
  { v: 'Knee', l: 'الركبة', icon: BriefcaseMedical },
  { v: 'Back', l: 'الظهر', icon: BriefcaseMedical },
  { v: 'Shoulder', l: 'الكتف', icon: BriefcaseMedical },
];
const GOAL_OPTS = [
  { v: 'lose', l: 'خسارة الوزن' },
  { v: 'gain', l: 'بناء العضلات' },
  { v: 'endurance', l: 'تحسين التحمل' },
];
const LOCATION_OPTS = [{ v: 'gym', l: 'نادي رياضي' }, { v: 'home', l: 'المنزل' }];
const DAYS_OPTS = [3, 4, 5, 6];

const SPLIT_ICONS = {
  push: Dumbbell, pull: Activity, legs: TrendingUp, upper: Dumbbell,
  lower: TrendingUp, full: Flame, cardio: HeartPulse, core: Target,
  flexibility: StretchHorizontal,
};

const BMI_CATEGORIES = [
  { max: 18.5, label: 'نقص الوزن', color: '#38bdf8', emoji: '🔵' },
  { max: 25, label: 'وزن صحي', color: '#22c55e', emoji: '🟢' },
  { max: 30, label: 'وزن زائد', color: '#eab308', emoji: '🟡' },
  { max: Infinity, label: 'سمنة', color: '#ef4444', emoji: '🔴' },
];

/* ═══════════════════════════════════════════════════════════════
   CALCULATORS
   ═══════════════════════════════════════════════════════════════ */
function calcBMI(w, hCm) { const h = hCm / 100; return w / (h * h); }
function getBMICategory(bmi) {
  return BMI_CATEGORIES.find((c) => bmi < c.max) || BMI_CATEGORIES[BMI_CATEGORIES.length - 1];
}
function calcBMR(gender, w, hCm, age) {
  if (gender === 'male') return 10 * w + 6.25 * hCm - 5 * age + 5;
  return 10 * w + 6.25 * hCm - 5 * age - 161;
}
function calcTDEE(bmr, activity) {
  const mult = { sedentary: 1.4, active: 1.6, athlete: 1.85 };
  return bmr * (mult[activity] || 1.5);
}
function goalCalories(tdee, goal) {
  if (goal === 'lose') return Math.round(tdee - 500);
  if (goal === 'gain') return Math.round(tdee + 350);
  return Math.round(tdee);
}
function waterIntake(w) { return Math.round(w * 0.033 * 10) / 10; }

function calcHealthScore(bmi, activity, injury) {
  let score = 70;
  if (bmi >= 18.5 && bmi < 25) score += 15;
  else if (bmi >= 25 && bmi < 30) score += 5;
  else score -= 5;
  if (activity === 'athlete') score += 15;
  else if (activity === 'active') score += 10;
  if (injury !== 'None') score -= 10;
  return Math.max(0, Math.min(100, score));
}

/* ═══════════════════════════════════════════════════════════════
   WORKOUT SPLIT GENERATOR
   ═══════════════════════════════════════════════════════════════ */
function getSplitTemplate(days) {
  switch (days) {
    case 3: return [
      { day: 'اليوم 1', type: 'full', label: 'جسم كامل A' },
      { day: 'اليوم 2', type: 'full', label: 'جسم كامل B' },
      { day: 'اليوم 3', type: 'full', label: 'جسم كامل C + كارديو' },
    ];
    case 4: return [
      { day: 'اليوم 1', type: 'upper', label: 'علوي (قوة)' },
      { day: 'اليوم 2', type: 'lower', label: 'سفلي (قوة)' },
      { day: 'اليوم 3', type: 'upper', label: 'علوي (حجم)' },
      { day: 'اليوم 4', type: 'lower', label: 'سفلي (حجم) + كارديو' },
    ];
    case 5: return [
      { day: 'اليوم 1', type: 'push', label: 'دفع' },
      { day: 'اليوم 2', type: 'pull', label: 'سحب' },
      { day: 'اليوم 3', type: 'legs', label: 'أرجل' },
      { day: 'اليوم 4', type: 'upper', label: 'علوي + بطن' },
      { day: 'اليوم 5', type: 'lower', label: 'سفلي + كارديو' },
    ];
    case 6: return [
      { day: 'اليوم 1', type: 'push', label: 'دفع' },
      { day: 'اليوم 2', type: 'pull', label: 'سحب' },
      { day: 'اليوم 3', type: 'legs', label: 'أرجل' },
      { day: 'اليوم 4', type: 'push', label: 'دفع (حجم)' },
      { day: 'اليوم 5', type: 'pull', label: 'سحب (حجم)' },
      { day: 'اليوم 6', type: 'legs', label: 'أرجل + كارديو' },
    ];
    default: return [];
  }
}

const TYPE_MAP = {
  push: ['push'], pull: ['pull'], legs: ['legs'],
  upper: ['push', 'pull'], lower: ['legs'],
  full: ['push', 'pull', 'legs'],
};

function generateSchedule(template, { age, injury, location, goal }) {
  return template.map((slot, slotIdx) => {
    const splitTypes = TYPE_MAP[slot.type] || ['push', 'pull', 'legs'];

    let pool = EXERCISE_DB.filter((ex) => {
      if (!splitTypes.includes(ex.split) && ex.split !== 'core' && ex.split !== 'cardio') return false;
      if (injury !== 'None' && ex.contraindications.includes(injury)) return false;
      if (age < ex.minAge || age > ex.maxAge) return false;
      if (location === 'home' && ex.location === 'gym') return false;
      return true;
    });

    const dayExercises = [];
    const usedIds = new Set();

    for (const st of splitTypes) {
      const candidates = pool
        .filter((ex) => ex.split === st && !usedIds.has(ex.id))
        .sort((a, b) => b.intensity - a.intensity);
      const pick = candidates.slice(0, slot.type === 'full' ? 2 : 3);
      pick.forEach((ex) => { dayExercises.push(ex); usedIds.add(ex.id); });
    }

    const coreCandidates = pool.filter((ex) => ex.split === 'core' && !usedIds.has(ex.id));
    const coreCount = slot.type === 'full' ? 1 : 2;
    coreCandidates.slice(0, coreCount).forEach((ex) => { dayExercises.push(ex); usedIds.add(ex.id); });

    const needsCardio = slot.label.includes('كارديو') || goal === 'endurance' || goal === 'lose';
    if (needsCardio) {
      const cardioCandidates = pool.filter((ex) => ex.split === 'cardio' && !usedIds.has(ex.id));
      if (cardioCandidates.length > 0) {
        const c = cardioCandidates[slotIdx % cardioCandidates.length];
        dayExercises.push(c);
        usedIds.add(c.id);
      }
    }

    return { ...slot, exercises: dayExercises };
  });
}

/* ═══════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

const STEP_NAMES = ['البيانات الشخصية', 'الملف الرياضي', 'الفحص الصحي'];

function WizardProgress({ step, total }) {
  return (
    <div className="wizard-progress">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="progress-step-row">
          <div className={`progress-step ${i < step ? 'done' : ''} ${i === step ? 'active' : ''}`}>
            <div className="step-circle">
              {i < step ? <CheckCircle2 size={18} /> : <span>{i + 1}</span>}
            </div>
            <span className="step-label-text">{STEP_NAMES[i]}</span>
          </div>
          {i < total - 1 && <div className={`step-line ${i < step ? 'filled' : ''}`} />}
        </div>
      ))}
    </div>
  );
}

function OptionBtn({ active, label, Icon, onClick }) {
  return (
    <button className={`option-btn ${active ? 'active' : ''}`} onClick={onClick} type="button">
      {Icon && <Icon size={18} />}
      <span>{label}</span>
    </button>
  );
}

function DifficultyMeter({ intensity }) {
  const color = (i) => {
    if (i >= intensity) return 'var(--meter-empty)';
    if (intensity <= 3) return 'var(--meter-easy)';
    if (intensity <= 6) return 'var(--meter-medium)';
    return 'var(--meter-hard)';
  };
  return (
    <div className="meter-bar">
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} className="meter-seg" style={{ backgroundColor: color(i) }} />
      ))}
    </div>
  );
}

function Routine({ title, Icon, items, accent }) {
  return (
    <div className={`glass-card routine-card ${accent}`}>
      <h4 className="routine-title"><Icon size={18} /> {title}</h4>
      <ol className="routine-list">
        {items.map((it, i) => (
          <li key={i}><strong>{it.name}</strong> <span className="routine-dur">({it.dur})</span> — {it.desc}</li>
        ))}
      </ol>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LOCALSTORAGE HELPERS
   ═══════════════════════════════════════════════════════════════ */
const LS_KEY_FORM = 'fitnessPro_form';
const LS_KEY_DASH = 'fitnessPro_dashboard';
const LS_KEY_DONE = 'fitnessPro_done';

function loadJSON(key) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
}
function saveJSON(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* quota */ }
}
function clearLS() {
  localStorage.removeItem(LS_KEY_FORM);
  localStorage.removeItem(LS_KEY_DASH);
  localStorage.removeItem(LS_KEY_DONE);
}

/* ═══════════════════════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════════════════════ */
function App() {
  const savedForm = useRef(loadJSON(LS_KEY_FORM));
  const savedDash = useRef(loadJSON(LS_KEY_DASH));
  const sf = savedForm.current || {};

  const totalSteps = 3;
  const [step, setStep] = useState(() => savedDash.current ? totalSteps : (sf.step ?? 0));

  const [userName, setUserName] = useState(() => sf.userName ?? '');
  const [gender, setGender] = useState(() => sf.gender ?? 'male');
  const [age, setAge] = useState(() => sf.age ?? '');
  const [height, setHeight] = useState(() => sf.height ?? '');
  const [weight, setWeight] = useState(() => sf.weight ?? '');

  const [activity, setActivity] = useState(() => sf.activity ?? 'active');
  const [goal, setGoal] = useState(() => sf.goal ?? 'lose');
  const [location, setLocation] = useState(() => sf.location ?? 'gym');
  const [days, setDays] = useState(() => sf.days ?? 4);

  const [injury, setInjury] = useState(() => sf.injury ?? 'None');

  const [dashboard, setDashboard] = useState(() => savedDash.current);
  const [activeDay, setActiveDay] = useState(0);
  const [errors, setErrors] = useState({});
  const [doneSet, setDoneSet] = useState(() => {
    const saved = loadJSON(LS_KEY_DONE);
    return saved ? new Set(saved) : new Set();
  });
  const dashRef = useRef(null);
  const [workoutSessionOpen, setWorkoutSessionOpen] = useState(false);
  const [demoExercise, setDemoExercise] = useState(null);
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    saveJSON(LS_KEY_FORM, { step, userName, gender, age, height, weight, activity, injury, goal, location, days });
  }, [step, userName, gender, age, height, weight, activity, injury, goal, location, days]);

  useEffect(() => {
    if (dashboard) saveJSON(LS_KEY_DASH, dashboard);
  }, [dashboard]);

  useEffect(() => {
    saveJSON(LS_KEY_DONE, [...doneSet]);
  }, [doneSet]);

  function validateStep() {
    const e = {};
    if (step === 0) {
      const a = parseInt(age);
      if (!age || isNaN(a) || a < 10 || a > 100) e.age = 'العمر بين 10 و 100';
      const h = parseInt(height);
      if (!height || isNaN(h) || h < 100 || h > 250) e.height = 'الطول بين 100 و 250 سم';
      const w = parseInt(weight);
      if (!weight || isNaN(w) || w < 30 || w > 250) e.weight = 'الوزن بين 30 و 250 كغ';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function nextStep() { if (validateStep()) setStep((s) => Math.min(s + 1, totalSteps - 1)); }
  function prevStep() { setStep((s) => Math.max(s - 1, 0)); }

  function toggleDone(exId, dayIdx) {
    const key = `${dayIdx}_${exId}`;
    setDoneSet((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function generate() {
    if (!validateStep()) return;
    const a = parseInt(age), h = parseInt(height), w = parseInt(weight);
    const bmi = calcBMI(w, h);
    const bmiCat = getBMICategory(bmi);
    const bmr = calcBMR(gender, w, h, a);
    const tdee = calcTDEE(bmr, activity);
    const cals = goalCalories(tdee, goal);
    const water = waterIntake(w);
    const healthScore = calcHealthScore(bmi, activity, injury);
    const template = getSplitTemplate(days);
    const schedule = generateSchedule(template, { age: a, injury, location, goal });

    setDashboard({ bmi, bmiCat, tdee, cals, water, healthScore, schedule, ageNum: a });
    setActiveDay(0);
    setDoneSet(new Set());
    setStep(totalSteps);
    setTimeout(() => dashRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }

  function reset() {
    clearLS();
    setDashboard(null);
    setStep(0);
    setUserName(''); setGender('male'); setAge(''); setHeight(''); setWeight('');
    setActivity('active'); setInjury('None');
    setGoal('lose'); setLocation('gym'); setDays(4);
    setActiveDay(0); setDoneSet(new Set()); setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const showWizard = step < totalSteps && !dashboard;
  const showDash = !!dashboard;

  /* Exercises for the active day (for WorkoutSession) */
  const activeDayExercises = dashboard?.schedule?.[activeDay]?.exercises || [];
  const activeDayLabel = dashboard?.schedule?.[activeDay]
    ? `${dashboard.schedule[activeDay].day} — ${dashboard.schedule[activeDay].label}`
    : '';

  return (
    <div className="app">
      <div className="bg-noise" />
      <div className="bg-grid" />
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />

      {/* ══════════ HERO ══════════ */}
      {!showDash && (
        <header className="hero">
          <div className="hero-content">
            <span className="hero-badge"><Flame size={14} /> Fitness Pro</span>
            <h1 className="hero-headline">جسمك، بياناتك، خطتك المثالية</h1>
            <p className="hero-sub">
              محرك ذكاء رياضي يحسب مؤشر كتلة جسمك، سعراتك اليومية، ويولّد جدولاً أسبوعياً مفصّلاً — في ثوانٍ.
            </p>
            {step === 0 && !dashboard && (
              <button className="hero-cta" onClick={() => document.getElementById('wizard')?.scrollIntoView({ behavior: 'smooth' })}>
                <ArrowDown size={18} /> ابدأ الآن
              </button>
            )}
          </div>
          <div className="hero-shape shape-1" />
          <div className="hero-shape shape-2" />
        </header>
      )}

      {/* ══════════ 3-STEP WIZARD ══════════ */}
      {showWizard && (
        <section id="wizard" className="wizard-section">
          <div className="glass-card wizard-card">
            <WizardProgress step={step} total={totalSteps} />

            <div className="wizard-body" key={step}>

              {/* ── STEP 0: Personal Info ── */}
              {step === 0 && (
                <div className="step-content fade-in">
                  <h2 className="step-title"><UserRound size={22} /> المعلومات الشخصية</h2>
                  <p className="step-subtitle">أدخل بياناتك الأساسية لنحسب مؤشراتك الصحية بدقة.</p>

                  <div className="form-group form-group-name" style={{ marginBottom: 20 }}>
                    <label><UserRound size={15} /> اسمك (اختياري)</label>
                    <input type="text" placeholder="مثال: أحمد"
                      value={userName} onChange={(e) => setUserName(e.target.value)} />
                  </div>

                  <div className="option-row">
                    {GENDER_OPTS.map((g) => (
                      <OptionBtn key={g.v} active={gender === g.v} label={g.l}
                        Icon={UserRound} onClick={() => setGender(g.v)} />
                    ))}
                  </div>

                  <div className="input-grid">
                    <div className="form-group">
                      <label><Ruler size={15} /> العمر</label>
                      <input type="number" min="10" max="100" placeholder="مثال: 25"
                        value={age} onChange={(e) => setAge(e.target.value)} />
                      {errors.age && <span className="field-err">{errors.age}</span>}
                    </div>
                    <div className="form-group">
                      <label><Ruler size={15} /> الطول (سم)</label>
                      <input type="number" min="100" max="250" placeholder="مثال: 175"
                        value={height} onChange={(e) => setHeight(e.target.value)} />
                      {errors.height && <span className="field-err">{errors.height}</span>}
                    </div>
                    <div className="form-group">
                      <label><Weight size={15} /> الوزن (كغ)</label>
                      <input type="number" min="30" max="250" placeholder="مثال: 75"
                        value={weight} onChange={(e) => setWeight(e.target.value)} />
                      {errors.weight && <span className="field-err">{errors.weight}</span>}
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 1: Fitness Profile ── */}
              {step === 1 && (
                <div className="step-content fade-in">
                  <h2 className="step-title"><Activity size={22} /> الملف الرياضي</h2>
                  <p className="step-subtitle">اختر مستوى نشاطك، هدفك، ومكان التمرين المفضل.</p>

                  <p className="step-desc">مستوى النشاط اليومي</p>
                  <div className="option-row">
                    {ACTIVITY_OPTS.map((a) => (
                      <OptionBtn key={a.v} active={activity === a.v} label={a.l} onClick={() => setActivity(a.v)} />
                    ))}
                  </div>

                  <p className="step-desc">الهدف الأساسي</p>
                  <div className="option-row">
                    {GOAL_OPTS.map((g) => (
                      <OptionBtn key={g.v} active={goal === g.v} label={g.l}
                        Icon={g.v === 'lose' ? TrendingUp : g.v === 'gain' ? Dumbbell : HeartPulse}
                        onClick={() => setGoal(g.v)} />
                    ))}
                  </div>

                  <p className="step-desc">مكان التمرين</p>
                  <div className="option-row">
                    {LOCATION_OPTS.map((loc) => (
                      <OptionBtn key={loc.v} active={location === loc.v} label={loc.l}
                        Icon={loc.v === 'gym' ? Dumbbell : Home} onClick={() => setLocation(loc.v)} />
                    ))}
                  </div>

                  <p className="step-desc">أيام التدريب أسبوعياً</p>
                  <div className="option-row days-row">
                    {DAYS_OPTS.map((d) => (
                      <OptionBtn key={d} active={days === d} label={`${d} أيام`}
                        Icon={CalendarDays} onClick={() => setDays(d)} />
                    ))}
                  </div>

                  <div className="split-preview glass-card">
                    <h4><Sparkles size={16} /> نوع التقسيم</h4>
                    <ul>
                      {getSplitTemplate(days).map((s, i) => {
                        const SIcon = SPLIT_ICONS[s.type] || Dumbbell;
                        return <li key={i}><SIcon size={14} /> <strong>{s.day}:</strong> {s.label}</li>;
                      })}
                    </ul>
                  </div>
                </div>
              )}

              {/* ── STEP 2: Health Check (Injury Chips) ── */}
              {step === 2 && (
                <div className="step-content fade-in">
                  <h2 className="step-title"><ShieldCheck size={22} /> الفحص الصحي</h2>
                  <p className="step-subtitle">
                    هل لديك أي إصابات؟ اختر من الخيارات أدناه. سنستبعد تلقائياً التمارين غير الآمنة.
                  </p>

                  <div className="chip-grid">
                    {INJURY_CHIPS.map((chip) => {
                      const isNone = chip.v === 'None';
                      const isSelected = injury === chip.v;
                      const ChipIcon = chip.icon;
                      return (
                        <button
                          key={chip.v}
                          type="button"
                          className={`injury-chip ${isSelected ? (isNone ? 'safe' : 'selected') : ''}`}
                          onClick={() => setInjury(chip.v)}
                        >
                          <ChipIcon size={16} />
                          <span>{chip.l}</span>
                        </button>
                      );
                    })}
                  </div>

                  {injury !== 'None' && (
                    <div className="glass-card" style={{ padding: '16px 20px', marginTop: 12 }}>
                      <p style={{ fontSize: '.85rem', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: 8, lineHeight: 1.7 }}>
                        <BriefcaseMedical size={16} />
                        سيتم استبعاد جميع التمارين التي قد تؤثر على إصابة <strong style={{ color: '#fff' }}>{INJURY_CHIPS.find(c => c.v === injury)?.l}</strong>.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Nav Buttons */}
            <div className="wizard-nav">
              {step > 0 && (
                <button className="nav-btn nav-prev" onClick={prevStep}>
                  <ChevronRight size={18} /> السابق
                </button>
              )}
              {step < totalSteps - 1 ? (
                <button className="nav-btn nav-next" onClick={nextStep}>
                  التالي <ChevronLeft size={18} />
                </button>
              ) : (
                <button className="cta-btn generate-btn" onClick={generate}>
                  <Sparkles size={20} /> توليد الخطة الذكية
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ══════════ DASHBOARD ══════════ */}
      {showDash && (
        <section ref={dashRef} className="dashboard fade-in">
          <div className="dash-top-bar">
            <div className="dash-top-left">
              <h1 className="dash-title"><Brain size={24} /> Fitness Pro</h1>
              {userName && (
                <span className="dash-greeting">جاهز يا كابتن {userName}؟ 💪</span>
              )}
            </div>
            <button className="reset-btn" onClick={reset}>
              <ArrowDown size={16} style={{ transform: 'rotate(180deg)' }} /> خطة جديدة
            </button>
          </div>

          {/* ── Header Stats ── */}
          <div className="dash-header-stats">
            <div className="glass-card header-stat hs-bmi">
              <div className="header-stat-icon"><BarChart3 size={24} /></div>
              <div className="header-stat-body">
                <span className="header-stat-value">{dashboard.bmi.toFixed(1)}</span>
                <span className="header-stat-label">مؤشر كتلة الجسم</span>
                <span className="header-stat-sub">{dashboard.bmiCat.emoji} {dashboard.bmiCat.label}</span>
              </div>
            </div>

            <div className="glass-card header-stat hs-score">
              <div className="header-stat-icon"><HeartPulse size={24} /></div>
              <div className="header-stat-body">
                <span className="header-stat-value">{dashboard.healthScore}/100</span>
                <span className="header-stat-label">النتيجة الصحية</span>
                <span className="header-stat-sub">
                  {dashboard.healthScore >= 80 ? 'ممتاز' : dashboard.healthScore >= 60 ? 'جيد' : 'يحتاج تحسين'}
                </span>
              </div>
            </div>

            <div className="glass-card header-stat hs-cal">
              <div className="header-stat-icon"><Flame size={24} /></div>
              <div className="header-stat-body">
                <span className="header-stat-value">{dashboard.cals}</span>
                <span className="header-stat-label">السعرات اليومية</span>
                <span className="header-stat-sub">
                  {goal === 'lose' ? 'عجز 500 سعرة' : goal === 'gain' ? 'فائض 350 سعرة' : 'صيانة'}
                </span>
              </div>
            </div>

            <div className="glass-card header-stat hs-water">
              <div className="header-stat-icon"><Droplets size={24} /></div>
              <div className="header-stat-body">
                <span className="header-stat-value">{dashboard.water} لتر</span>
                <span className="header-stat-label">الماء يومياً</span>
                <span className="header-stat-sub">{Math.round(dashboard.water * 4)} أكواب تقريباً</span>
              </div>
            </div>
          </div>

          {/* ── Weekly Schedule ── */}
          <div className="schedule-section">
            <h2 className="section-heading">
              <CalendarDays size={22} /> الجدول <span className="heading-accent">الأسبوعي</span>
            </h2>

            <div className="day-tabs">
              {dashboard.schedule.map((slot, i) => {
                const SIcon = SPLIT_ICONS[slot.type] || Dumbbell;
                return (
                  <button key={i} className={`day-tab ${activeDay === i ? 'active' : ''}`}
                    onClick={() => setActiveDay(i)}>
                    <SIcon size={16} />
                    <span className="tab-day">{slot.day}</span>
                    <span className="tab-label">{slot.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Start Workout CTA */}
            {dashboard.schedule[activeDay] && (
              <div className="start-workout-row">
                <button
                  className="cta-btn start-workout-btn"
                  onClick={() => setWorkoutSessionOpen(true)}
                >
                  <Flame size={20} /> ابدأ التمرين النشط
                </button>
              </div>
            )}

            {dashboard.schedule[activeDay] && (
              <div className="day-content fade-in" key={activeDay}>
                <Routine title="الإحماء (7 د)" Icon={Flame} items={WARMUP} accent="warmup-accent" />

                <div className="exercises-grid">
                  {dashboard.schedule[activeDay].exercises.map((ex, i) => {
                    const doneKey = `${activeDay}_${ex.id}`;
                    const isDone = doneSet.has(doneKey);
                    const levelClass =
                      ex.level === 'beginner' ? 'badge-level-easy' :
                      ex.level === 'advanced' ? 'badge-level-hard' : 'badge-level-medium';

                    return (
                      <div
                        key={ex.id}
                        className={`glass-card exercise-card ${isDone ? 'done' : ''}`}
                        style={{ animationDelay: `${i * 0.07}s` }}
                      >
                        <ExerciseBanner muscleKey={ex.targetMuscle} category={ex.category} />

                        <div className="ex-head">
                          <h4 className="ex-name">{ex.name}</h4>
                        </div>

                        <div className="ex-badges">
                          <span className={`badge ${levelClass}`}>{ex.levelLabel}</span>
                          <span className="badge badge-muscle">{ex.muscleLabel}</span>
                        </div>

                        <p className="ex-desc">{ex.instructions}</p>

                        <div className="ex-stats">
                          <span className="ex-stat"><Dumbbell size={13} /> {ex.sets} × {ex.reps}</span>
                          <span className="ex-stat"><Activity size={13} /> شدة {ex.intensity}/10</span>
                        </div>

                        <DifficultyMeter intensity={ex.intensity} />

                        <button
                          type="button"
                          className="view-demo-btn"
                          onClick={() => setDemoExercise(ex)}
                        >
                          <Eye size={14} /> عرض التمرين
                        </button>

                        <div className={`done-row ${isDone ? 'is-done' : ''}`}>
                          <button
                            type="button"
                            className={`done-checkbox ${isDone ? 'checked' : ''}`}
                            onClick={() => toggleDone(ex.id, activeDay)}
                          >
                            <Check size={14} color="#fff" strokeWidth={3} />
                          </button>
                          <span className="done-label" onClick={() => toggleDone(ex.id, activeDay)}>
                            {isDone ? 'تم إنجازه ✓' : 'تمرين مكتمل؟'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Routine title="التهدئة (7 د)" Icon={Snowflake} items={COOLDOWN} accent="cooldown-accent" />
              </div>
            )}
          </div>

          {/* ── Tips ── */}
          <div className="tips-section">
            <h2 className="section-heading">
              <Lightbulb size={22} /> نصائح <span className="heading-accent">ذكية</span>
            </h2>
            <div className="tips-grid">
              {injury !== 'None' && (
                <div className="glass-card tip-card">
                  <ShieldCheck size={22} className="tip-icon" />
                  <h4>سلامتك أولاً</h4>
                  <p>تم استبعاد التمارين التي قد تؤثر على إصابة {INJURY_CHIPS.find(o => o.v === injury)?.l}. استشر طبيبك دائماً.</p>
                </div>
              )}
              <div className="glass-card tip-card">
                <Droplets size={22} className="tip-icon" />
                <h4>الترطيب</h4>
                <p>اشرب {dashboard.water} لتر ماء يومياً. زِد 0.5 لتر في أيام التدريب.</p>
              </div>
              <div className="glass-card tip-card">
                <Clock size={22} className="tip-icon" />
                <h4>الاستشفاء</h4>
                <p>نَم 7-9 ساعات يومياً. العضلات تنمو أثناء الراحة وليس أثناء التمرين.</p>
              </div>
              <div className="glass-card tip-card">
                <Flame size={22} className="tip-icon" />
                <h4>التغذية</h4>
                <p>استهدف {dashboard.cals} سعرة يومياً مع {goal === 'gain' ? '1.8-2.2 غ بروتين/كغ' : '1.4-1.6 غ بروتين/كغ'}.</p>
              </div>
            </div>
          </div>

        </section>
      )}

      {/* ══════════ FEATURES SECTION ══════════ */}
      {!showDash && (
        <section className="features-section">
          <h2 className="section-heading">
            <Zap size={22} /> لماذا <span className="heading-accent">تختارنا؟</span>
          </h2>
          <div className="features-grid">
            <div className="glass-card feature-card">
              <div className="feature-icon"><Brain size={28} /></div>
              <h4>خوارزمية ذكية</h4>
              <p>محركنا يحلل بياناتك ويبني جدولاً مخصصاً يناسب جسمك وأهدافك — لا خطط عشوائية.</p>
            </div>
            <div className="glass-card feature-card">
              <div className="feature-icon"><ShieldCheck size={28} /></div>
              <h4>حماية من الإصابات</h4>
              <p>نستبعد تلقائياً أي تمرين قد يؤثر على إصاباتك، لتتدرب بأمان وراحة بال.</p>
            </div>
            <div className="glass-card feature-card">
              <div className="feature-icon"><Activity size={28} /></div>
              <h4>+60 تمرين متنوع</h4>
              <p>تمارين منزلية وجيم، من المبتدئين للمتقدمين، مع تعليمات عربية مفصّلة لكل تمرين.</p>
            </div>
          </div>
        </section>
      )}

      {/* ══════════ TESTIMONIALS ══════════ */}
      {!showDash && (
        <section className="testimonials-section">
          <h2 className="section-heading">
            <Star size={22} /> قصص <span className="heading-accent">نجاح</span>
          </h2>
          <div className="testimonials-grid">
            <div className="glass-card testimonial-card">
              <div className="testimonial-stars">★★★★★</div>
              <p className="testimonial-text">"خسرت 12 كيلو في 3 أشهر بفضل الجدول الذكي. أفضل تطبيق عربي للياقة!"</p>
              <div className="testimonial-author">
                <div className="testimonial-avatar">م</div>
                <div>
                  <div className="testimonial-name">محمد العلي</div>
                  <div className="testimonial-role">مستخدم منذ 6 أشهر</div>
                </div>
              </div>
            </div>
            <div className="glass-card testimonial-card">
              <div className="testimonial-stars">★★★★★</div>
              <p className="testimonial-text">"التطبيق يراعي إصابتي في الركبة ويقترح بدائل آمنة. شيء رائع فعلاً."</p>
              <div className="testimonial-author">
                <div className="testimonial-avatar">س</div>
                <div>
                  <div className="testimonial-name">سارة أحمد</div>
                  <div className="testimonial-role">رياضية هاوية</div>
                </div>
              </div>
            </div>
            <div className="glass-card testimonial-card">
              <div className="testimonial-stars">★★★★★</div>
              <p className="testimonial-text">"بنيت عضلات واضحة خلال شهرين. الجدول الأسبوعي المنظم غيّر طريقة تمريني."</p>
              <div className="testimonial-author">
                <div className="testimonial-avatar">خ</div>
                <div>
                  <div className="testimonial-name">خالد يوسف</div>
                  <div className="testimonial-role">لاعب كمال أجسام</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ══════════ FAQ ACCORDION ══════════ */}
      {!showDash && (
        <section className="faq-section">
          <h2 className="section-heading">
            <HelpCircle size={22} /> الأسئلة <span className="heading-accent">الشائعة</span>
          </h2>
          <div className="faq-list">
            {[
              {
                q: 'هل التطبيق مجاني بالكامل؟',
                a: 'نعم! جميع الميزات متاحة مجاناً بدون اشتراك أو إعلانات. هدفنا مساعدة المجتمع العربي في تحسين لياقته.',
              },
              {
                q: 'هل يناسب المبتدئين بدون خبرة رياضية؟',
                a: 'بالتأكيد. النظام يضبط صعوبة التمارين حسب مستواك ويقدم تعليمات مفصّلة لكل تمرين مع إحماء وتهدئة.',
              },
              {
                q: 'هل يمكن التدرب في المنزل بدون معدات؟',
                a: 'نعم، لدينا أكثر من 30 تمريناً بوزن الجسم فقط. اختر "المنزل" كمكان تدريب وسنبني لك خطة كاملة.',
              },
            ].map((item, i) => (
              <div key={i} className="glass-card faq-item">
                <button
                  className={`faq-question ${openFaq === i ? 'open' : ''}`}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span>{item.q}</span>
                  <ChevronDown size={18} className={`faq-chevron ${openFaq === i ? 'rotated' : ''}`} />
                </button>
                <div className={`faq-answer ${openFaq === i ? 'open' : ''}`}>
                  <p>{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ══════════ FOOTER ══════════ */}
      <footer className="site-footer">
        <p>صُنع بـ ❤️ بواسطة <span className="footer-brand">Fitness Pro</span> — من أجل مجتمع أكثر صحة</p>
        <p className="footer-copy">&copy; {new Date().getFullYear()} Fitness Pro. جميع الحقوق محفوظة.</p>
      </footer>

      {/* ══════════ EXERCISE DEMO MODAL ══════════ */}
      {demoExercise && (
        <div className="demo-overlay" onClick={() => setDemoExercise(null)}>
          <div className="demo-modal glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="demo-header">
              <h3 className="demo-title">{demoExercise.name}</h3>
              <button className="demo-close" onClick={() => setDemoExercise(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="demo-gif-area">
              {demoExercise.gifUrl ? (
                <img src={demoExercise.gifUrl} alt={demoExercise.name} className="demo-gif" />
              ) : (
                <div className="demo-placeholder">
                  <Dumbbell size={48} />
                  <span>عرض توضيحي قريباً</span>
                </div>
              )}
            </div>

            <div className="demo-badges">
              <span className={`badge ${
                demoExercise.level === 'beginner' ? 'badge-level-easy' :
                demoExercise.level === 'advanced' ? 'badge-level-hard' : 'badge-level-medium'
              }`}>{demoExercise.levelLabel}</span>
              <span className="badge badge-muscle">{demoExercise.muscleLabel}</span>
              <span className="badge badge-sets"><Dumbbell size={12} /> {demoExercise.sets} × {demoExercise.reps}</span>
            </div>

            <div className="demo-instructions">
              <h4><Lightbulb size={16} /> التعليمات</h4>
              <p>{demoExercise.instructions}</p>
            </div>

            <DifficultyMeter intensity={demoExercise.intensity} />
          </div>
        </div>
      )}

      {/* ══════════ ACTIVE WORKOUT SESSION OVERLAY ══════════ */}
      {workoutSessionOpen && activeDayExercises.length > 0 && (
        <WorkoutSession
          exercises={activeDayExercises}
          dayLabel={activeDayLabel}
          onClose={() => setWorkoutSessionOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
