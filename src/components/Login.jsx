import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { ChevronRight, LogIn } from 'lucide-react';

export default function Login({ onSwitchToRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      const msg = authError.message;
      const messages = {
        'Invalid login credentials': 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
        'Email not confirmed': 'لم يتم تأكيد البريد الإلكتروني بعد. أكمل التحقق من بريدك أولاً.',
        'For security purposes, you can only request this after 60 seconds':
          'لأسباب أمنية، يرجى الانتظار 60 ثانية قبل المحاولة مرة أخرى',
      };

      if (msg?.toLowerCase().includes('rate') || msg?.toLowerCase().includes('too many')) {
        setError('لقد تجاوزت عدد المحاولات المسموح. يرجى الانتظار قبل المحاولة مرة أخرى.');
      } else {
        setError(messages[msg] || msg);
      }
    }

    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-card glass-card">
        <div className="auth-step-content auth-slide-in">
          <div className="auth-header">
            <div className="auth-icon-wrap">
              <LogIn size={28} />
            </div>
            <h2 className="auth-title">تسجيل الدخول</h2>
            <p className="auth-subtitle">أدخل بياناتك للوصول إلى لوحة التحكم الرياضية</p>
          </div>

          <form onSubmit={handleLogin} className="auth-form">
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
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                dir="ltr"
              />
            </div>

            {error && <p className="auth-error">{error}</p>}

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? 'جارٍ الدخول...' : 'تسجيل الدخول'}
            </button>
          </form>

          <div className="auth-switch">
            <span>ليس لديك حساب؟</span>
            <button type="button" onClick={onSwitchToRegister}>
              إنشاء حساب <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
