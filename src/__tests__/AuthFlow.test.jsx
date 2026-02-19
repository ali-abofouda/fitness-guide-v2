/**
 * ═══════════════════════════════════════════════════════════════
 *  FITNESS PRO — Auth Flow Integration Tests
 *  Covers: Happy path, Name sync, Security guard, Error states
 * ═══════════════════════════════════════════════════════════════
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/* ─────────────────────────────────────────────────────
   Mock Supabase Client
   ───────────────────────────────────────────────────── */
const mockSignUp = vi.fn();
const mockVerifyOtp = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockResend = vi.fn();
const mockSignOut = vi.fn();
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();

vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      signUp: (...args) => mockSignUp(...args),
      verifyOtp: (...args) => mockVerifyOtp(...args),
      signInWithPassword: (...args) => mockSignInWithPassword(...args),
      resend: (...args) => mockResend(...args),
      signOut: (...args) => mockSignOut(...args),
      getSession: (...args) => mockGetSession(...args),
      onAuthStateChange: (...args) => mockOnAuthStateChange(...args),
    },
  },
}));

/* ─────────────────────────────────────────────────────
   Imports (after mock setup)
   ───────────────────────────────────────────────────── */
import Register from '../components/Register';
import Login from '../components/Login';
import App from '../App';
import { AuthProvider } from '../AuthContext';

/* ─────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────── */
function renderWithAuth(ui) {
  return render(<AuthProvider>{ui}</AuthProvider>);
}

const fakeSession = {
  user: {
    id: '123',
    email: 'test@example.com',
    user_metadata: { full_name: 'أحمد محمد' },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();

  // Default: no session (logged-out state)
  mockGetSession.mockResolvedValue({ data: { session: null } });
  mockOnAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  });
  mockSignOut.mockResolvedValue({ error: null });
});

/* ═══════════════════════════════════════════════════════════════
   TEST 1: HAPPY PATH — SignUp → OTP → Dashboard
   ═══════════════════════════════════════════════════════════════ */
describe('Happy Path: Full Sign-Up Flow', () => {
  it('should go from sign-up form → OTP screen → dashboard on success', async () => {
    const user = userEvent.setup();

    // Step 1: signUp succeeds → moves to OTP screen
    mockSignUp.mockResolvedValue({
      data: { user: { id: '123', email: 'test@example.com' } },
      error: null,
    });

    const switchToLogin = vi.fn();
    render(<Register onSwitchToLogin={switchToLogin} />);

    // Fill in sign-up form
    await user.type(screen.getByPlaceholderText('مثال: أحمد محمد'), 'أحمد محمد');
    await user.type(screen.getByPlaceholderText('example@email.com'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('6 أحرف على الأقل'), 'password123');

    // Submit
    await user.click(screen.getByRole('button', { name: /إنشاء الحساب/ }));

    // Verify signUp was called with correct metadata
    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: { full_name: 'أحمد محمد' },
        },
      });
    });

    // Should now show OTP screen
    await waitFor(() => {
      expect(screen.getByText('تحقق من بريدك')).toBeInTheDocument();
    });

    // The email should be displayed
    expect(screen.getByText('test@example.com')).toBeInTheDocument();

    // Step 2: Enter OTP and verify
    mockVerifyOtp.mockResolvedValue({ data: {}, error: null });

    const otpInput = screen.getByPlaceholderText('000000');
    await user.type(otpInput, '123456');

    await user.click(screen.getByRole('button', { name: /تأكيد الرمز/ }));

    await waitFor(() => {
      expect(mockVerifyOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        token: '123456',
        type: 'signup',
      });
    });
  });
});

/* ═══════════════════════════════════════════════════════════════
   TEST 2: NAME SYNC — Name from auth metadata shows in dashboard
   ═══════════════════════════════════════════════════════════════ */
describe('Name Sync: Auth metadata → Wizard', () => {
  it('should auto-fill userName from session metadata and show the synced badge', async () => {
    // Simulate a logged-in user with a name
    mockGetSession.mockResolvedValue({ data: { session: fakeSession } });

    let authCallback;
    mockOnAuthStateChange.mockImplementation((cb) => {
      authCallback = cb;
      // Fire immediately with the session
      cb('SIGNED_IN', fakeSession);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    await act(async () => {
      renderWithAuth(<App />);
    });

    // The wizard Step 0 should show the auto-filled name badge, not the input
    await waitFor(() => {
      expect(screen.getByText(/أحمد محمد/)).toBeInTheDocument();
    });

    // The badge should indicate the name was fetched automatically
    await waitFor(() => {
      expect(screen.getByText(/تم جلب اسمك تلقائياً/)).toBeInTheDocument();
    });
  });
});

/* ═══════════════════════════════════════════════════════════════
   TEST 3: SECURITY — No session → Cannot see Dashboard
   ═══════════════════════════════════════════════════════════════ */
describe('Security: Protected Dashboard', () => {
  it('should show the landing page (not dashboard) when no session exists', async () => {
    // No session
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockOnAuthStateChange.mockImplementation((cb) => {
      cb('SIGNED_OUT', null);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    await act(async () => {
      renderWithAuth(<App />);
    });

    // Should show landing page CTA, not the dashboard
    await waitFor(() => {
      expect(screen.getByText(/انضم إلى Cyber Squad/)).toBeInTheDocument();
    });

    // Should NOT show dashboard elements
    expect(screen.queryByText('الجدول الأسبوعي')).not.toBeInTheDocument();
    expect(screen.queryByText('خطة جديدة')).not.toBeInTheDocument();
  });

  it('should show the wizard/hero when a session exists', async () => {
    mockGetSession.mockResolvedValue({ data: { session: fakeSession } });
    mockOnAuthStateChange.mockImplementation((cb) => {
      cb('SIGNED_IN', fakeSession);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    await act(async () => {
      renderWithAuth(<App />);
    });

    // Should see the wizard hero, not the landing page
    await waitFor(() => {
      expect(screen.getByText('جسمك، بياناتك، خطتك المثالية')).toBeInTheDocument();
    });

    // Should NOT show landing CTA
    expect(screen.queryByText(/انضم إلى Cyber Squad/)).not.toBeInTheDocument();
  });
});

/* ═══════════════════════════════════════════════════════════════
   TEST 4: ERROR STATES — Wrong OTP, Already Registered
   ═══════════════════════════════════════════════════════════════ */
describe('Error States', () => {
  it('should display an error when entering a wrong OTP code', async () => {
    const user = userEvent.setup();

    // First, get to the OTP screen
    mockSignUp.mockResolvedValue({
      data: { user: { id: '123', email: 'test@example.com' } },
      error: null,
    });

    render(<Register onSwitchToLogin={vi.fn()} />);

    await user.type(screen.getByPlaceholderText('مثال: أحمد محمد'), 'Test');
    await user.type(screen.getByPlaceholderText('example@email.com'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('6 أحرف على الأقل'), 'password123');
    await user.click(screen.getByRole('button', { name: /إنشاء الحساب/ }));

    await waitFor(() => {
      expect(screen.getByText('تحقق من بريدك')).toBeInTheDocument();
    });

    // Enter wrong OTP
    mockVerifyOtp.mockResolvedValue({
      data: {},
      error: { message: 'Token has expired or is invalid' },
    });

    const otpInput = screen.getByPlaceholderText('000000');
    await user.type(otpInput, '999999');
    await user.click(screen.getByRole('button', { name: /تأكيد الرمز/ }));

    // Should show the Arabic error message
    await waitFor(() => {
      expect(screen.getByText('الكود غير صحيح، حاول مرة أخرى')).toBeInTheDocument();
    });
  });

  it('should redirect to login when user is already registered', async () => {
    const user = userEvent.setup();
    const switchToLogin = vi.fn();

    // signUp returns "User already registered"
    mockSignUp.mockResolvedValue({
      data: { user: null },
      error: { message: 'User already registered' },
    });

    render(<Register onSwitchToLogin={switchToLogin} />);

    await user.type(screen.getByPlaceholderText('مثال: أحمد محمد'), 'Test');
    await user.type(screen.getByPlaceholderText('example@email.com'), 'existing@example.com');
    await user.type(screen.getByPlaceholderText('6 أحرف على الأقل'), 'password123');
    await user.click(screen.getByRole('button', { name: /إنشاء الحساب/ }));

    // Should show "already registered" message with redirect notice
    await waitFor(() => {
      expect(screen.getByText(/هذا البريد مسجّل بالفعل/)).toBeInTheDocument();
    });

    // Should redirect to login after 2 seconds
    await waitFor(
      () => {
        expect(switchToLogin).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );
  });

  it('should show rate-limit error on Login when too many attempts', async () => {
    const user = userEvent.setup();

    mockSignInWithPassword.mockResolvedValue({
      data: {},
      error: { message: 'For security purposes, you can only request this after 60 seconds' },
    });

    render(<Login onSwitchToRegister={vi.fn()} />);

    await user.type(screen.getByPlaceholderText('example@email.com'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /تسجيل الدخول/ }));

    await waitFor(() => {
      expect(screen.getByText(/يرجى الانتظار 60 ثانية/)).toBeInTheDocument();
    });
  });

  it('should show rate-limit error on Register when too many signup attempts', async () => {
    const user = userEvent.setup();

    mockSignUp.mockResolvedValue({
      data: { user: null },
      error: { message: 'rate limit exceeded' },
    });

    render(<Register onSwitchToLogin={vi.fn()} />);

    await user.type(screen.getByPlaceholderText('مثال: أحمد محمد'), 'Test');
    await user.type(screen.getByPlaceholderText('example@email.com'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('6 أحرف على الأقل'), 'password123');
    await user.click(screen.getByRole('button', { name: /إنشاء الحساب/ }));

    await waitFor(() => {
      expect(screen.getByText(/تجاوزت عدد المحاولات/)).toBeInTheDocument();
    });
  });
});
