import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { ChevronRight, UserPlus, ShieldCheck, RotateCcw } from 'lucide-react';

export default function Register({ onSwitchToLogin }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  /* ── OTP State ── */
  const [verifying, setVerifying] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [shake, setShake] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const otpRef = useRef(null);

  /* ── Signup cooldown (prevents rate-limit) ── */
  const [signupCooldown, setSignupCooldown] = useState(0);
  useEffect(() => {
    if (signupCooldown <= 0) return;
    const t = setInterval(() => setSignupCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [signupCooldown]);

  /* ── Resend countdown ── */
  useEffect(() => {
    if (!verifying) return;
    setResendTimer(60);
    setCanResend(false);
    const interval = setInterval(() => {
      setResendTimer((t) => {
        if (t <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [verifying]);

  /* ── Auto-focus OTP input ── */
  useEffect(() => {
    if (verifying && otpRef.current) otpRef.current.focus();
  }, [verifying]);

  /* ── Step 1: Request OTP ── */
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (signupCooldown > 0) {
      setError(`يرجى الانتظار ${signupCooldown} ثانية قبل المحاولة مرة أخرى`);
      return;
    }

    setLoading(true);

    if (password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      setLoading(false);
      return;
    }

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (authError) {
      const msg = authError.message;

      // Handle rate-limiting responses — start 60s cooldown
      if (
        msg?.toLowerCase().includes('rate') ||
        msg?.toLowerCase().includes('too many') ||
        msg?.includes('60 seconds') ||
        msg?.toLowerCase().includes('security purposes')
      ) {
        setSignupCooldown(60);
        setError('يرجى الانتظار 60 ثانية قبل المحاولة مرة أخرى');
      }
      // Redirect to login if user already exists
      else if (msg === 'User already registered') {
        setError('هذا البريد مسجّل بالفعل. جارٍ التوجيه لتسجيل الدخول...');
        setTimeout(() => onSwitchToLogin(), 2000);
      }
      else if (msg?.includes('at least 6')) {
        setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      }
      else {
        setError(msg);
      }
    } else if (data?.user) {
      // Supabase returns a fake user with empty identities when the email is already registered
      // (to prevent email enumeration). Detect this and redirect to login.
      if (!data.user.identities || data.user.identities.length === 0) {
        setError('هذا البريد مسجّل بالفعل. جارٍ التوجيه لتسجيل الدخول...');
        setTimeout(() => onSwitchToLogin(), 2000);
      } else {
        setVerifying(true);
        setSuccess('تم إرسال رمز التحقق إلى بريدك الإلكتروني');
      }
    }

    setLoading(false);
  };

  /* ── Step 2: Verify OTP ── */
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (otpCode.length !== 8) {
      setError('الرمز يجب أن يكون 8 أرقام');
      triggerShake();
      setLoading(false);
      return;
    }

    const { error: otpError } = await supabase.auth.verifyOtp({
      email,
      token: otpCode,
      type: 'signup',
    });

    if (otpError) {
      const msg = otpError.message;
      // Rate limiting on OTP verify
      if (msg?.toLowerCase().includes('rate') || msg?.toLowerCase().includes('too many')) {
        setError('لقد تجاوزت عدد المحاولات. يرجى الانتظار قبل المحاولة مرة أخرى.');
      } else {
        setError('الكود غير صحيح، حاول مرة أخرى');
      }
      triggerShake();
      setOtpCode('');
    }
    // On success, AuthContext will detect the session automatically

    setLoading(false);
  };

  /* ── Resend OTP ── */
  const handleResend = async () => {
    setError('');
    setCanResend(false);
    setResendTimer(60);

    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email,
    });

    if (resendError) {
      const msg = resendError.message;
      if (msg?.toLowerCase().includes('rate') || msg?.toLowerCase().includes('too many')
          || msg?.includes('60 seconds')) {
        setError('لقد تجاوزت عدد المحاولات. يرجى الانتظار قبل إعادة الإرسال.');
      } else {
        setError(msg);
      }
    } else {
      setSuccess('تم إعادة إرسال الرمز بنجاح');
    }

    // Restart countdown
    const interval = setInterval(() => {
      setResendTimer((t) => {
        if (t <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  /* ── Shake animation trigger ── */
  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  /* ── OTP input handler (digits only, max 6) ── */
  const handleOtpChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 8);
    setOtpCode(val);
  };

  return (
    <div className="auth-page">
      <div className="auth-card glass-card">
        {/* ── Step 1: Sign Up Form ── */}
        {!verifying && (
          <div className="auth-step-content auth-slide-in">
            <div className="auth-header">
              <div className="auth-icon-wrap">
                <UserPlus size={28} />
              </div>
              <h2 className="auth-title">إنشاء حساب جديد</h2>
              <p className="auth-subtitle">انضم إلى Cyber Squad وابدأ رحلتك الرياضية</p>
            </div>

            <form onSubmit={handleRegister} className="auth-form">
              <div className="auth-field">
                <label>الاسم الكامل</label>
                <input
                  type="text"
                  placeholder="مثال: أحمد محمد"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="auth-field">
                <label>البريد الإلكتروني</label>
                <input
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  dir="ltr"
                />
              </div>

              <div className="auth-field">
                <label>كلمة المرور</label>
                <input
                  type="password"
                  placeholder="6 أحرف على الأقل"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  dir="ltr"
                />
              </div>

              {error && <p className="auth-error">{error}</p>}
              {success && <p className="auth-success">{success}</p>}

              <button type="submit" className="auth-submit-btn" disabled={loading || signupCooldown > 0}>
                {loading ? 'جارٍ التسجيل...' : signupCooldown > 0 ? `انتظر ${signupCooldown} ثانية` : 'إنشاء الحساب'}
              </button>
            </form>

            <div className="auth-switch">
              <span>لديك حساب بالفعل؟</span>
              <button type="button" onClick={onSwitchToLogin}>
                تسجيل الدخول <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: OTP Verification ── */}
        {verifying && (
          <div className="auth-step-content auth-slide-in">
            <div className="auth-header">
              <div className="auth-icon-wrap otp-icon-wrap">
                <ShieldCheck size={28} />
              </div>
              <h2 className="auth-title">تحقق من بريدك</h2>
              <p className="auth-subtitle">
                أرسلنا رمز تحقق مكوّن من 8 أرقام إلى
                <br />
                <strong className="otp-email-highlight">{email}</strong>
              </p>
            </div>

            <form onSubmit={handleVerifyOtp} className="auth-form">
              <div className="otp-field-wrap">
                <label className="otp-label">رمز التحقق</label>
                <input
                  ref={otpRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="00000000"
                  value={otpCode}
                  onChange={handleOtpChange}
                  className={`otp-input ${shake ? 'otp-shake' : ''}`}
                  maxLength={8}
                  dir="ltr"
                />
              </div>

              {error && <p className="auth-error">{error}</p>}
              {success && <p className="auth-success">{success}</p>}

              <button type="submit" className="auth-submit-btn" disabled={loading || otpCode.length !== 8}>
                {loading ? 'جارٍ التحقق...' : 'تأكيد الرمز'}
              </button>
            </form>

            <div className="otp-resend-row">
              {canResend ? (
                <button type="button" className="otp-resend-btn" onClick={handleResend}>
                  <RotateCcw size={14} /> إعادة إرسال الرمز
                </button>
              ) : (
                <span className="otp-resend-timer">
                  إعادة الإرسال بعد {resendTimer} ثانية
                </span>
              )}
            </div>

            <div className="auth-switch">
              <button type="button" onClick={() => { setVerifying(false); setError(''); setSuccess(''); setOtpCode(''); }}>
                <ChevronRight size={14} /> العودة لتعديل البيانات
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
