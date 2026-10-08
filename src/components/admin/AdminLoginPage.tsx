import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api.ts';
import { User } from '../../types/index.ts';
import { ADMIN_PHONES } from '../../config/adminWhitelist.ts';
import {
  ShieldCheck,
  Lock,
  Smartphone,
  Eye,
  EyeOff,
  Loader2,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  UserPlus,
  KeyRound,
  Sparkles
} from 'lucide-react';

interface AdminLoginPageProps {
  onLoginSuccess: (user: User, token: string) => void;
  onNavigateHome: () => void;
  onNavigateToRecruitment?: (phone?: string) => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onLoginSuccess,
  onNavigateHome,
  onNavigateToRecruitment,
}) => {
  // Requirement 2 & 5: Stable state, preserved in localStorage, placeholder completely empty
  const [adminPhone, setAdminPhone] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lastAdminPhone');
      if (saved && saved.trim()) return saved.trim();
    }
    return '';
  });

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(false);
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);

  const cleanPhone = adminPhone.replace(/\s+/g, '').trim();
  const isWhitelisted = ADMIN_PHONES.includes(cleanPhone);

  // Check phone status when whitelisted phone changes
  useEffect(() => {
    let isCancelled = false;

    if (cleanPhone.length === 11) {
      if (ADMIN_PHONES.includes(cleanPhone)) {
        setIsCheckingPhone(true);
        setErrorMessage(null);
        setRedirectCountdown(null);
        api
          .checkAdminPhone(cleanPhone)
          .then((res) => {
            if (!isCancelled && res.success) {
              setIsFirstTimeSetup(!res.hasPassword);
            }
          })
          .catch(() => {
            if (!isCancelled) setIsFirstTimeSetup(false);
          })
          .finally(() => {
            if (!isCancelled) setIsCheckingPhone(false);
          });
      } else {
        // Non-whitelisted number: auto-redirect countdown to "تعيين جديد"
        setErrorMessage('هذا الرقم غير مصرح له بدخول الإدارة - جاري تحويلك تلقائياً لصفحة تعيين جديد...');
        setRedirectCountdown(3);
      }
    } else {
      setIsFirstTimeSetup(false);
      setRedirectCountdown(null);
    }

    return () => {
      isCancelled = true;
    };
  }, [cleanPhone]);

  // Countdown timer for automatic redirection to recruitment
  useEffect(() => {
    if (redirectCountdown === null) return;
    if (redirectCountdown <= 0) {
      redirectToRecruitment();
      return;
    }

    const timer = setTimeout(() => {
      setRedirectCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [redirectCountdown]);

  const redirectToRecruitment = () => {
    if (onNavigateToRecruitment) {
      onNavigateToRecruitment(cleanPhone);
    } else {
      if (typeof window !== 'undefined') {
        localStorage.setItem('lastPhone', cleanPhone);
        window.history.pushState(null, '', `/login?tab=recruitment&phone=${encodeURIComponent(cleanPhone)}`);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    }
  };

  const handlePhoneChange = (val: string) => {
    setAdminPhone(val);
    setPassword('');
    setConfirmPassword('');
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastAdminPhone', val);
      localStorage.setItem('lastPhone', val);
    }

    const cleaned = val.replace(/\s+/g, '').trim();
    if (cleaned.length === 11 && !ADMIN_PHONES.includes(cleaned)) {
      setErrorMessage('هذا الرقم غير مصرح له بدخول الإدارة - جاري تحويلك لصفحة تعيين جديد...');
      setRedirectCountdown(3);
    } else {
      setErrorMessage(null);
      setRedirectCountdown(null);
    }
  };

  // Password validation: 1 uppercase + 1 lowercase + 6 digits
  const validateAdminPassword = (pwd: string): string | null => {
    if (!pwd || !pwd.trim()) {
      return 'يرجى إدخال الرقم السري';
    }
    if (!/[A-Z]/.test(pwd)) {
      return 'يجب أن يحتوي الرقم السري على حرف كابيتال واحد على الأقل (مثال: A)';
    }
    if (!/[a-z]/.test(pwd)) {
      return 'يجب أن يحتوي الرقم السري على حرف سمول واحد (مثال: a)';
    }
    const digits = (pwd.match(/\d/g) || []).length;
    if (digits !== 6) {
      return `يجب أن يتكون الرقم السري من 6 أرقام بالضبط (المكتوب: ${digits})`;
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTarget = adminPhone.replace(/\s+/g, '').trim();

    if (!cleanTarget) {
      setErrorMessage('يرجى إدخال رقم الهاتف المصرح به للإدارة');
      return;
    }

    // Strict whitelist check
    if (!ADMIN_PHONES.includes(cleanTarget)) {
      setErrorMessage('هذا الرقم غير مصرح له بدخول الإدارة - جاري تحويلك لصفحة تعيين جديد...');
      redirectToRecruitment();
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      if (isFirstTimeSetup) {
        // First time creating admin password
        const valError = validateAdminPassword(password);
        if (valError) {
          throw new Error(valError);
        }
        if (password !== confirmPassword) {
          throw new Error('الرقم السري وتأكيد الرقم السري غير متطابقين');
        }

        const setupRes = await api.setupAdminPassword({
          phone: cleanTarget,
          password: password.trim(),
        });

        if (setupRes.success && setupRes.user && setupRes.token) {
          localStorage.setItem('waselha_token', setupRes.token);
          localStorage.setItem('waselha_user', JSON.stringify(setupRes.user));
          localStorage.setItem('lastAdminPhone', cleanTarget);
          localStorage.setItem('lastPhone', cleanTarget);
          onLoginSuccess(setupRes.user, setupRes.token);
          return;
        } else {
          throw new Error(setupRes.message || 'فشل إنشاء الرقم السري');
        }
      }

      // Regular Login
      if (!password.trim()) {
        throw new Error('يرجى إدخال الرقم السري');
      }

      const res = await api.adminLogin({
        phone: cleanTarget,
        username: cleanTarget,
        password: password.trim(),
      });

      if (res.success && res.user && res.token) {
        localStorage.setItem('waselha_token', res.token);
        localStorage.setItem('waselha_user', JSON.stringify(res.user));
        localStorage.setItem('lastAdminPhone', cleanTarget);
        localStorage.setItem('lastPhone', cleanTarget);
        onLoginSuccess(res.user, res.token);
      } else {
        throw new Error(res.message || 'فشل تسجيل الدخول للإدارة');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'كلمة المرور غير صحيحة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md bg-slate-900 border border-red-900/50 rounded-3xl shadow-2xl overflow-hidden animate-fadeIn">
        {/* Header - No static password labels */}
        <div className="p-6 bg-gradient-to-b from-red-950/80 to-slate-950 border-b border-red-900/30 text-center relative">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-700 text-white flex items-center justify-center font-black text-2xl mx-auto shadow-lg shadow-red-900/40 mb-3 border border-red-500/30">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-white">
            بوابة الإدارة المركزية
          </h2>
          <p className="text-xs text-red-300/80 mt-1">
            دخول معتمد للإدارة المشرفة على منصة وصلها اسكندرية
          </p>

          <div className="mt-3 py-1.5 px-3 rounded-xl bg-red-950/60 border border-red-800/40 text-[11px] text-red-200/90 flex items-center justify-center gap-1.5 font-medium">
            <Lock className="w-3.5 h-3.5 text-red-400" />
            <span>نظام الحماية الصارم (Strict Admin Whitelist)</span>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Prominent Red Error Alert with Auto-Redirect */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-950/90 border border-rose-500/60 text-rose-200 text-xs font-bold text-right flex flex-col gap-2 animate-shake">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
              {redirectCountdown !== null && (
                <div className="flex items-center justify-between pt-1 border-t border-rose-900/60 text-[11px]">
                  <span>تحويل خلال {redirectCountdown} ثوانٍ...</span>
                  <button
                    type="button"
                    onClick={redirectToRecruitment}
                    className="underline text-rose-300 hover:text-white font-black"
                  >
                    الانتقال لصفحة تعيين جديد الآن ←
                  </button>
                </div>
              )}
            </div>
          )}

          {isWhitelisted && !errorMessage && (
            <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>✓ رقم هاتف معتمد في القائمة البيضاء للإدارة</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Admin Phone Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  رقم هاتف الإدارة المعتمد
                </label>
                {isWhitelisted && (
                  <span className="text-[10px] text-emerald-400 font-mono">مصرح له ✓</span>
                )}
              </div>
              <div className="relative">
                <Smartphone className="w-4 h-4 text-red-400 absolute right-3.5 top-3.5" />
                <input
                  type="tel"
                  value={adminPhone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  required
                  placeholder=""
                  dir="ltr"
                  className={`w-full bg-slate-950 border rounded-xl pr-10 pl-4 py-2.5 text-sm text-white font-mono text-right transition focus:outline-none ${
                    isWhitelisted
                      ? 'border-emerald-500/60 focus:border-emerald-500'
                      : errorMessage
                      ? 'border-rose-500/80 focus:border-rose-500'
                      : 'border-slate-800 focus:border-red-500'
                  }`}
                />
              </div>
            </div>

            {/* Mode 1: First time Password Creation */}
            {isWhitelisted && isFirstTimeSetup && (
              <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-700/60 space-y-3 animate-fadeIn">
                <div className="flex items-center gap-2 text-xs font-black text-red-200">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>إنشاء الرقم السري للإدارة للمرة الأولى</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  يجب أن يتكون الرقم السري من حرف كابيتال (A-Z) وحرف سمول (a-z) يليهما 6 أرقام (مثال: Aa123456).
                </p>

                {/* New Password */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    الرقم السري الجديد
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-red-400 absolute right-3.5 top-3.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      dir="ltr"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-red-500 rounded-xl pr-10 pl-11 py-2 text-sm text-white font-mono text-right transition focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-2.5 p-0.5 text-slate-400 hover:text-white transition"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    تأكيد الرقم السري
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-red-400 absolute right-3.5 top-3.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      dir="ltr"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-red-500 rounded-xl pr-10 pl-11 py-2 text-sm text-white font-mono text-right transition focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Mode 2: Standard Login with Password */}
            {isWhitelisted && !isFirstTimeSetup && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    الرقم السري
                  </label>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-red-400 absolute right-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    dir="ltr"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-red-500 rounded-xl pr-10 pl-11 py-2.5 text-sm text-white font-mono text-right transition focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-3 p-0.5 text-slate-400 hover:text-white transition"
                    title={showPassword ? 'إخفاء الرقم السري' : 'إظهار الرقم السري'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Quick Whitelist Selector */}
            <div className="pt-1 space-y-1.5">
              <span className="text-[11px] text-slate-400 block font-bold">
                الأرقام المصرح لها بالدخول:
              </span>
              <div className="grid grid-cols-2 gap-2">
                {ADMIN_PHONES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handlePhoneChange(p)}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-mono font-bold transition flex items-center justify-center gap-1.5 ${
                      cleanPhone === p
                        ? 'bg-red-950/80 border-red-500 text-white shadow-md shadow-red-950/40'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-red-400" />
                    <span dir="ltr">{p}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || isCheckingPhone}
              className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black text-sm transition flex items-center justify-center gap-2 shadow-xl shadow-red-950/40"
            >
              {loading || isCheckingPhone ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isFirstTimeSetup ? (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>إنشاء الرقم السري ودخول الإدارة</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>دخول لوحة الإدارة</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Recruitment Redirection Link */}
          <div className="pt-1 text-center">
            <button
              type="button"
              onClick={redirectToRecruitment}
              className="text-xs text-blue-400 hover:text-blue-300 transition flex items-center justify-center gap-1 mx-auto font-bold"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>لست مديراً وتريد الانضمام؟ تقديم طلب تعيين جديد</span>
            </button>
          </div>

          {/* Back to Client App */}
          <div className="pt-1 text-center">
            <button
              type="button"
              onClick={onNavigateHome}
              className="text-xs text-slate-400 hover:text-white transition flex items-center justify-center gap-1 mx-auto"
            >
              <ChevronRight className="w-3.5 h-3.5 rotate-180" />
              <span>العودة لواجهة العملاء الرئيسية</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950/90 border-t border-slate-800 text-center text-[10px] text-slate-500">
          منصة وصلها اسكندرية • نظام الحماية الصارم برقمين معتمدين فقط
        </div>
      </div>
    </div>
  );
};
