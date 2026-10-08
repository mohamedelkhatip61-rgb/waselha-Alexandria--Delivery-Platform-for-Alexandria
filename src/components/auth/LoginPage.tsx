import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api.ts';
import { User, UserRole } from '../../types/index.ts';
import { ADMIN_PHONES } from '../../config/adminWhitelist.ts';
import {
  Smartphone,
  ShieldCheck,
  CheckCircle,
  ArrowRight,
  Loader2,
  Lock,
  User as UserIcon,
  MapPin,
  Clock,
  RotateCcw,
  Bike,
  Store,
  Upload,
  FileText,
  Camera,
  Check,
  AlertTriangle,
  Sparkles,
  Info,
  Eye,
  EyeOff,
  KeyRound,
  UserPlus,
  IdCard,
  X,
  FileCheck2
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: User, token: string) => void;
  onClose?: () => void;
  initialTab?: 'login' | 'register';
  noticeMessage?: string | null;
}

const ALEXANDRIA_AREAS = [
  'سموحة',
  'سيدي جابر',
  'لوران',
  'ميامي',
  'العجمي',
  'العصافرة',
  'محطة الرمل',
  'بحري والأنفوشي',
  'الإبراهيمية',
  'كليوباترا',
  'محرم بك',
  'المعمورة',
  'المنتزه',
  'سيدي بشر',
  'الدخيلة',
  'العوايد',
  'جناكليس',
  'كفر عبده',
];

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onClose,
  initialTab = 'login',
  noticeMessage,
}) => {
  // Main Tab: 'login' (Phone & OTP / Password) or 'register' (New Account)
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(initialTab);

  // Requirement 1 & 4: Fixed phoneNumber state preserved in localStorage ('lastPhone'), never reset or randomized
  const [phoneNumber, setPhoneNumber] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lastPhone');
      if (saved && saved.trim()) return saved.trim();
    }
    return '01012345678';
  });

  // Role selection state for login and registration
  const [loginRole, setLoginRole] = useState<'Customer' | 'Driver'>('Customer');
  const [accountType, setAccountType] = useState<'Customer' | 'Driver'>('Customer');

  // "تعيين جديد" mode state
  const [showRecruitmentForm, setShowRecruitmentForm] = useState(false);
  const [recruitmentNationalId, setRecruitmentNationalId] = useState('');
  const [recruitmentFullName, setRecruitmentFullName] = useState('');
  const [recruitmentPersonalPhoto, setRecruitmentPersonalPhoto] = useState(
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
  );
  const [recruitmentNationalIdPhoto, setRecruitmentNationalIdPhoto] = useState(
    'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&auto=format&fit=crop&q=80'
  );
  const [recruitmentRole, setRecruitmentRole] = useState<'Staff' | 'Driver'>('Staff');
  const [recruitmentSuccessData, setRecruitmentSuccessData] = useState<any | null>(null);
  const [isSubmittingRecruitment, setIsSubmittingRecruitment] = useState(false);

  // Password field with conditions (1 uppercase + 1 lowercase + 6 digits)
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginWithPasswordMode, setLoginWithPasswordMode] = useState(false);

  // Registration fields
  const [fullName, setFullName] = useState('');
  const [isMerchantAccount, setIsMerchantAccount] = useState(false);
  const [selectedAreas, setSelectedAreas] = useState<string[]>(['سموحة', 'سيدي جابر']);
  const [vehicleType, setVehicleType] = useState<'motorcycle' | 'car' | 'bicycle' | 'van'>('motorcycle');
  const [plateNumber, setPlateNumber] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');

  // Driver documents
  const [documents, setDocuments] = useState<Record<string, string>>({
    national_id_front: '',
    national_id_back: '',
    driver_license: '',
    vehicle_license: '',
    criminal_record: '',
    selfie: '',
  });

  // OTP Verification Flow
  const [otpStep, setOtpStep] = useState<'form' | 'otp'>('form');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [timerSeconds, setTimerSeconds] = useState(30);
  const [isAutoReading, setIsAutoReading] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Auto-OTP loop interval ref
  const timerRef = useRef<any>(null);
  const autoReadTimeoutRef = useRef<any>(null);
  const digitInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Listen to URL query params on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') === 'recruitment' || params.get('tab') === 'apply') {
        setShowRecruitmentForm(true);
      }
      const phoneParam = params.get('phone');
      if (phoneParam) {
        setPhoneNumber(phoneParam);
        localStorage.setItem('lastPhone', phoneParam);
      }
    }
  }, []);

  // Cleanup timers on unmount (No timers touch phoneNumber!)
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoReadTimeoutRef.current) clearTimeout(autoReadTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Egyptian Phone validator: starts with 01 and is 11 digits
  const isValidEgyptianPhone = (num: string) => {
    const cleaned = num.replace(/\s+/g, '').trim();
    return /^01[0125][0-9]{8}$/.test(cleaned);
  };

  // Real-time Password Validation: 1 uppercase + 1 lowercase + exactly 6 digits
  const getPasswordValidationError = (pwd: string): string | null => {
    if (!pwd || !pwd.trim()) {
      return 'يرجى إدخال الرقم السري';
    }
    if (!/[A-Z]/.test(pwd)) {
      return 'لازم حرف كابيتال واحد على الأقل (مثال: A)';
    }
    if (!/[a-z]/.test(pwd)) {
      return 'لازم حرف سمول واحد (مثال: a)';
    }
    const count = (pwd.match(/\d/g) || []).length;
    if (count !== 6) {
      return `لازم 6 أرقام بالظبط (المكتوب حالياً: ${count} أرقام)`;
    }
    return null;
  };

  // Phone Change Handler: Persists immediately to lastPhone in localStorage
  const handlePhoneChange = (val: string) => {
    setPhoneNumber(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastPhone', val);
    }
  };

  // Request OTP & trigger automatic 30s cycle
  const startOtpFlow = async (targetPhone: string, isLoopRenewal = false) => {
    const cleanPhone = targetPhone.replace(/\s+/g, '').trim();
    if (!cleanPhone) {
      setErrorMessage('يرجى كتابة رقم الهاتف أولاً');
      return;
    }

    if (!isValidEgyptianPhone(cleanPhone)) {
      setErrorMessage('يرجى إدخال رقم هاتف مصري صحيح مكون من 11 رقماً يبدأ بـ 01 (مثل: 01012345678)');
      return;
    }

    if (activeTab === 'register') {
      const pwdError = getPasswordValidationError(password);
      if (pwdError) {
        setErrorMessage(pwdError);
        return;
      }
    }

    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await api.requestOtp(cleanPhone);
      setOtpStep('otp');
      setTimerSeconds(30);
      setOtpDigits(['', '', '', '', '', '']);
      setIsAutoReading(true);
      setStatusNotice(
        isLoopRenewal
          ? '🔄 تم تجديد رمز الـ OTP تلقائياً بعد 30 ثانية...'
          : '📲 تم إرسال الرمز بنجاح عبر SMS... جاري القراءة التلقائية...'
      );

      // Start 30-second countdown loop
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleOtpExpiredAutoRenew(cleanPhone);
            return 30;
          }
          return prev - 1;
        });
      }, 1000);

      // Simulated SMS auto-read after 1 second
      if (autoReadTimeoutRef.current) clearTimeout(autoReadTimeoutRef.current);
      autoReadTimeoutRef.current = setTimeout(() => {
        if (res.code && res.code.length === 6) {
          const splitCode = res.code.split('');
          setOtpDigits(splitCode);
          setIsAutoReading(false);
          setStatusNotice('✨ تم استلام الرمز وقراءته تلقائياً');

          setTimeout(() => {
            handleVerifyCode(splitCode.join(''), cleanPhone);
          }, 600);
        }
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل إرسال كود التحقق، يرجى المحاولة مرة أخرى');
      setIsAutoReading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpExpiredAutoRenew = (targetPhone: string) => {
    setStatusNotice('⏳ انتهت صلاحية الكود (30 ثانية). جاري طلب وتعبئة كود جديد تلقائياً...');
    startOtpFlow(targetPhone, true);
  };

  const handleVerifyCode = async (codeToVerify: string, targetPhone?: string) => {
    const cleanPhone = (targetPhone || phoneNumber).replace(/\s+/g, '').trim();
    const cleanCode = codeToVerify.replace(/\s+/g, '').trim();

    if (cleanCode.length !== 6) {
      setErrorMessage('يرجى إدخال كود التحقق المكون من 6 أرقام');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const payload: any = {
        phone: cleanPhone,
        code: cleanCode,
      };

      if (activeTab === 'register') {
        payload.name = fullName.trim() || undefined;
        payload.role = accountType;
        payload.password = password.trim();
        payload.isMerchantAccount = isMerchantAccount;
        if (accountType === 'Driver') {
          payload.alexandriaAreas = selectedAreas;
          payload.vehicleType = vehicleType;
          payload.plateNumber = plateNumber;
          payload.vehicleModel = vehicleModel;
          payload.documents = Object.entries(documents).map(([type, fileUrl]) => ({
            type,
            titleAr:
              type === 'national_id_front'
                ? 'بطاقة الرقم القومي (أمامي)'
                : type === 'national_id_back'
                ? 'بطاقة الرقم القومي (خلفي)'
                : type === 'driver_license'
                ? 'رخصة القيادة'
                : type === 'vehicle_license'
                ? 'رخصة المركبة'
                : type === 'criminal_record'
                ? 'الفيش الجنائي'
                : 'الصورة الشخصية',
            fileUrl: fileUrl || 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80',
            status: 'verified',
          }));
        }
      }

      const res = await api.verifyOtp(payload);

      if (res.success && res.user && res.token) {
        if (timerRef.current) clearInterval(timerRef.current);
        if (autoReadTimeoutRef.current) clearTimeout(autoReadTimeoutRef.current);

        localStorage.setItem('waselha_token', res.token);
        localStorage.setItem('waselha_user', JSON.stringify(res.user));
        localStorage.setItem('lastPhone', cleanPhone);

        onLoginSuccess(res.user, res.token);
      } else {
        throw new Error(res.message || 'رمز التحقق غير صحيح');
      }
    } catch (err: any) {
      setErrorMessage('كود خاطئ، جاري إرسال كود جديد...');
      setOtpDigits(['', '', '', '', '', '']);

      setTimeout(() => {
        startOtpFlow(cleanPhone, true);
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phoneNumber.replace(/\s+/g, '').trim();

    if (!cleanPhone || !isValidEgyptianPhone(cleanPhone)) {
      setErrorMessage('يرجى إدخال رقم هاتف مصري صحيح (11 رقماً يبدأ بـ 01)');
      return;
    }

    if (!password) {
      setErrorMessage('يرجى إدخال الرقم السري');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await api.loginWithPassword({ phone: cleanPhone, password: password.trim() });
      if (res.success && res.user && res.token) {
        localStorage.setItem('waselha_token', res.token);
        localStorage.setItem('waselha_user', JSON.stringify(res.user));
        localStorage.setItem('lastPhone', cleanPhone);
        onLoginSuccess(res.user, res.token);
      } else {
        throw new Error(res.message || 'فشل تسجيل الدخول');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'رقم الهاتف أو الرقم السري غير صحيح');
    } finally {
      setLoading(false);
    }
  };

  // Submit Recruitment Application ("تعيين جديد")
  const handleRecruitmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phoneNumber.replace(/\s+/g, '').trim();
    const cleanId = recruitmentNationalId.replace(/\s+/g, '').trim();
    const cleanName = recruitmentFullName.trim();

    if (!cleanName) {
      setErrorMessage('يرجى إدخال الاسم الكامل بالكامل');
      return;
    }

    if (!cleanPhone || !isValidEgyptianPhone(cleanPhone)) {
      setErrorMessage('يرجى إدخال رقم هاتف مصري صحيح (11 رقماً)');
      return;
    }

    if (cleanId.length !== 14 || !/^\d{14}$/.test(cleanId)) {
      setErrorMessage(`يجب أن يتكون رقم البطاقة القومي من 14 رقماً بالضبط (المكتوب حالياً: ${cleanId.length} رقماً)`);
      return;
    }

    setIsSubmittingRecruitment(true);
    setErrorMessage(null);

    try {
      const res = await api.applyRecruitment({
        fullName: cleanName,
        phone: cleanPhone,
        nationalId: cleanId,
        personalPhoto: recruitmentPersonalPhoto,
        nationalIdCardPhoto: recruitmentNationalIdPhoto,
        roleRequested: recruitmentRole,
      });

      if (res.success) {
        setRecruitmentSuccessData(res.application);
      } else {
        throw new Error(res.message || 'فشل إرسال طلب التعيين');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ أثناء إرسال طلب التعيين، يرجى المحاولة ثانية');
    } finally {
      setIsSubmittingRecruitment(false);
    }
  };

  const handleDigitChange = (index: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const updated = [...otpDigits];
    updated[index] = digit;
    setOtpDigits(updated);

    if (digit && index < 5) {
      digitInputRefs.current[index + 1]?.focus();
    }

    if (digit && index === 5 && updated.every((d) => d !== '')) {
      handleVerifyCode(updated.join(''));
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      digitInputRefs.current[index - 1]?.focus();
    }
  };

  const handleFileUpload = (docKey: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDocuments((prev) => ({
          ...prev,
          [docKey]: (reader.result as string) || 'uploaded_secure_doc',
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleArea = (area: string) => {
    setSelectedAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  };

  // Navigates directly to Central Admin Portal
  const navigateToAdminLogin = () => {
    if (onClose) onClose();
    window.history.pushState(null, '', '/admin/login');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  // Renders the 4 choice buttons: [عميل - كابتن توصيل - الإدارة - تعيين جديد]
  const renderFourChoiceButtons = () => (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-300">
          اختر نوع الحساب أو البوابة:
        </label>
        {showRecruitmentForm && (
          <span className="text-[10px] text-blue-400 font-bold">بوابة التعيين والتوظيف</span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
        {/* 1. عميل (متسوق) */}
        <button
          type="button"
          onClick={() => {
            setShowRecruitmentForm(false);
            setLoginRole('Customer');
            setAccountType('Customer');
            setErrorMessage(null);
          }}
          className={`p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            !showRecruitmentForm && ((activeTab === 'login' && loginRole === 'Customer') || (activeTab === 'register' && accountType === 'Customer'))
              ? 'bg-amber-500 text-slate-950 font-black shadow-md'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <UserIcon className="w-3.5 h-3.5" />
          <span>عميل (متسوق)</span>
        </button>

        {/* 2. كابتن توصيل (مندوب) */}
        <button
          type="button"
          onClick={() => {
            setShowRecruitmentForm(false);
            setLoginRole('Driver');
            setAccountType('Driver');
            setErrorMessage(null);
          }}
          className={`p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            !showRecruitmentForm && ((activeTab === 'login' && loginRole === 'Driver') || (activeTab === 'register' && accountType === 'Driver'))
              ? 'bg-amber-500 text-slate-950 font-black shadow-md'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <Bike className="w-3.5 h-3.5" />
          <span>كابتن توصيل</span>
        </button>

        {/* 3. الإدارة - زرار أحمر غامق يحول مباشرة لـ /admin/login */}
        <button
          type="button"
          onClick={navigateToAdminLogin}
          className="p-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 bg-red-950 hover:bg-red-900 text-red-200 border border-red-700/80 shadow-md shadow-red-950/40 hover:border-red-500 cursor-pointer"
          title="الدخول المباشر إلى بوابة الإدارة المركزية"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-red-400" />
          <span>الإدارة</span>
        </button>

        {/* 4. تعيين جديد - زرار أزرق مميز يفتح فورم التعيين */}
        <button
          type="button"
          onClick={() => {
            setShowRecruitmentForm(true);
            setRecruitmentSuccessData(null);
            setErrorMessage(null);
          }}
          className={`p-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
            showRecruitmentForm
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/40 border border-blue-400'
              : 'bg-blue-950/90 hover:bg-blue-900 text-blue-200 border border-blue-700/80 shadow-md shadow-blue-950/40 hover:border-blue-500'
          }`}
          title="تقديم طلب تعيين موظف أو كابتن جديد"
        >
          <UserPlus className="w-3.5 h-3.5 text-blue-300" />
          <span>تعيين جديد</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn" dir="rtl">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="p-5 bg-slate-950 border-b border-slate-800 text-center relative flex-shrink-0">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 left-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900 hover:bg-slate-800 transition"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 flex items-center justify-center font-black text-2xl mx-auto shadow-lg shadow-amber-500/25">
            و
          </div>
          <h2 className="font-black text-white text-lg mt-2">
            وصلها اسكندرية | منصة التوصيل والخدمات اللوجستية
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 flex items-center justify-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            <span>نظام التحقق الذكي برقم الهاتف المصري ورمز OTP الفوري</span>
          </p>

          {noticeMessage && (
            <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs text-right flex items-center gap-2">
              <Info className="w-4 h-4 flex-shrink-0 text-amber-400" />
              <span>{noticeMessage}</span>
            </div>
          )}
        </div>

        {/* Tab Switcher: Only when not in OTP code mode and not in recruitment success */}
        {otpStep === 'form' && (
          <div className="px-5 pt-3 bg-slate-950/70 border-b border-slate-800/80 flex-shrink-0">
            <div className="grid grid-cols-2 gap-2 bg-slate-900 p-1 rounded-2xl border border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setShowRecruitmentForm(false);
                  setErrorMessage(null);
                }}
                className={`py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'login' && !showRecruitmentForm
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>تسجيل دخول برقم الهاتف</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  setShowRecruitmentForm(false);
                  setErrorMessage(null);
                }}
                className={`py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'register' && !showRecruitmentForm
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserIcon className="w-4 h-4" />
                <span>تسجيل حساب جديد</span>
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Form Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs font-medium text-right flex items-center gap-2.5 animate-shake">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* -------------------------------------------------------------
              VIEW A: FORM (Login / Register / Recruitment)
              ------------------------------------------------------------- */}
          {otpStep === 'form' ? (
            showRecruitmentForm ? (
              /* ============================================================
                 SPECIAL VIEW: "تعيين جديد" RECRUITMENT APPLICATION FORM
                 Fields: رقم الهاتف - رقم البطاقة القومي 14 رقم - الاسم الكامل - صورة شخصية - صورة البطاقة - زرار Confirm
                 ============================================================ */
              recruitmentSuccessData ? (
                /* Success Confirmation Screen */
                <div className="py-6 text-center space-y-4 animate-fadeIn">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/10">
                    <FileCheck2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">
                      تم استلام طلب التعيين بنجاح!
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto leading-relaxed">
                      تم تحويل بيانات طلبك وصورة بطاقتك إلى لوحة الإدارة المركزية لمراجعتها واعتماد حسابك الرسمي.
                    </p>
                  </div>

                  {/* Summary Card */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-right space-y-2 max-w-sm mx-auto">
                    <div className="flex justify-between border-b border-slate-800 pb-2">
                      <span className="text-slate-400">الاسم الكامل:</span>
                      <span className="text-white font-bold">{recruitmentSuccessData.fullName}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800 pb-2">
                      <span className="text-slate-400">رقم الهاتف:</span>
                      <span className="text-amber-400 font-mono font-bold">{recruitmentSuccessData.phone}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800 pb-2">
                      <span className="text-slate-400">الرقم القومي (14 رقم):</span>
                      <span className="text-white font-mono">{recruitmentSuccessData.nationalId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">الحالة:</span>
                      <span className="text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800">
                        قيد المراجعة في لوحة الإدارة ✓
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowRecruitmentForm(false);
                        setRecruitmentSuccessData(null);
                        setActiveTab('login');
                      }}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition"
                    >
                      العودة لتسجيل الدخول
                    </button>
                    {onClose && (
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
                      >
                        إغلاق
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* Recruitment Form */
                <form onSubmit={handleRecruitmentSubmit} className="space-y-4 animate-fadeIn">
                  {/* The 4 Choice Buttons Row */}
                  {renderFourChoiceButtons()}

                  {/* Recruitment Form Header */}
                  <div className="p-3.5 rounded-2xl bg-blue-950/40 border border-blue-700/50 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                      <UserPlus className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white">استمارة التعيين وتوثيق الموظفين والكباتن</h4>
                      <p className="text-[11px] text-blue-200/80">املأ البيانات وصور الأوراق لإرسالها مباشرة للوحة الإدارة</p>
                    </div>
                  </div>

                  {/* Role requested */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300">
                      المسمى الوظيفي المطلوب:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setRecruitmentRole('Staff')}
                        className={`p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border ${
                          recruitmentRole === 'Staff'
                            ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-900/40'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        <UserIcon className="w-4 h-4" />
                        <span>موظف إداري / دعم فني</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRecruitmentRole('Driver')}
                        className={`p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border ${
                          recruitmentRole === 'Driver'
                            ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-900/40'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        <Bike className="w-4 h-4" />
                        <span>كابتن توصيل ميداني</span>
                      </button>
                    </div>
                  </div>

                  {/* 1. Full Name */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-200">
                      الاسم الكامل (رباعي كما في بطاقة الرقم القومي)
                    </label>
                    <input
                      type="text"
                      value={recruitmentFullName}
                      onChange={(e) => setRecruitmentFullName(e.target.value)}
                      required
                      placeholder="مثال: محمود أحمد حسن الشناوي"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-right"
                    />
                  </div>

                  {/* 2. Phone Number (Persisted in state) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-200">
                        رقم الموبايل
                      </label>
                      <span className="text-[11px] text-amber-400 font-mono">01xxxxxxxxx</span>
                    </div>
                    <div className="relative">
                      <Smartphone className="w-4 h-4 text-emerald-400 absolute right-3.5 top-3.5" />
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        required
                        placeholder="01012345678"
                        dir="ltr"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-10 pl-4 py-2.5 text-sm text-white font-mono text-right focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* 3. National ID (14 digits) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-200">
                        رقم البطاقة القومي (14 رقم)
                      </label>
                      <span
                        className={`text-[11px] font-mono ${
                          recruitmentNationalId.replace(/\D/g, '').length === 14
                            ? 'text-emerald-400 font-bold'
                            : 'text-slate-400'
                        }`}
                      >
                        {recruitmentNationalId.replace(/\D/g, '').length}/14 رقم
                      </span>
                    </div>
                    <div className="relative">
                      <IdCard className="w-4 h-4 text-blue-400 absolute right-3.5 top-3.5" />
                      <input
                        type="text"
                        maxLength={14}
                        value={recruitmentNationalId}
                        onChange={(e) => setRecruitmentNationalId(e.target.value.replace(/\D/g, ''))}
                        required
                        placeholder="29501010201234"
                        dir="ltr"
                        className={`w-full bg-slate-950 border rounded-xl pr-10 pl-4 py-2.5 text-sm text-white font-mono text-right focus:outline-none ${
                          recruitmentNationalId.length === 14
                            ? 'border-emerald-500 focus:border-emerald-400'
                            : 'border-slate-800 focus:border-blue-500'
                        }`}
                      />
                    </div>
                  </div>

                  {/* 4. Personal Photo & 5. National ID Photo Uploads */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Personal Photo */}
                    <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-200">الصورة الشخصية</label>
                        <span className="text-[10px] text-blue-400">معاينة مباشرة</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <img
                          src={recruitmentPersonalPhoto}
                          alt="Personal"
                          className="w-14 h-14 rounded-xl object-cover border border-slate-700 bg-slate-900"
                        />
                        <div className="space-y-1 text-[11px]">
                          <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-950 hover:bg-blue-900 text-blue-200 border border-blue-700 font-bold transition">
                            <Upload className="w-3.5 h-3.5" />
                            <span>رفع صورة</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const r = new FileReader();
                                  r.onloadend = () => setRecruitmentPersonalPhoto(r.result as string);
                                  r.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                          <span className="block text-slate-500 text-[10px]">JPG, PNG أو سيلفي</span>
                        </div>
                      </div>
                    </div>

                    {/* National ID Card Photo */}
                    <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-200">صورة البطاقة</label>
                        <span className="text-[10px] text-blue-400">الوجهين</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <img
                          src={recruitmentNationalIdPhoto}
                          alt="National ID"
                          className="w-14 h-14 rounded-xl object-cover border border-slate-700 bg-slate-900"
                        />
                        <div className="space-y-1 text-[11px]">
                          <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-950 hover:bg-blue-900 text-blue-200 border border-blue-700 font-bold transition">
                            <Camera className="w-3.5 h-3.5" />
                            <span>رفع البطاقة</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const r = new FileReader();
                                  r.onloadend = () => setRecruitmentNationalIdPhoto(r.result as string);
                                  r.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                          <span className="block text-slate-500 text-[10px]">واضحة ومقروءة</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Confirm Button */}
                  <button
                    type="submit"
                    disabled={isSubmittingRecruitment}
                    className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black text-sm transition flex items-center justify-center gap-2 shadow-xl shadow-blue-600/30"
                  >
                    {isSubmittingRecruitment ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <span>تأكيد وإرسال طلب التعيين (Confirm)</span>
                        <ArrowRight className="w-4 h-4 rotate-180" />
                      </>
                    )}
                  </button>
                </form>
              )
            ) : activeTab === 'login' ? (
              /* ============================================================
                 TAB 1: LOGIN WITH PHONE & OTP / PASSWORD
                 Contains 4 choice buttons: [عميل - كابتن - الإدارة - تعيين جديد]
                 ============================================================ */
              <div className="space-y-4">
                {/* The 4 Choice Buttons Row */}
                {renderFourChoiceButtons()}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (loginWithPasswordMode) {
                      handlePasswordLogin(e);
                    } else {
                      startOtpFlow(phoneNumber);
                    }
                  }}
                  className="space-y-4"
                >
                  <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-200">
                        رقم الموبايل المصري
                      </label>
                      <span className="text-[11px] text-amber-400 font-mono">01xxxxxxxxx</span>
                    </div>

                    <div className="relative">
                      <Smartphone className="w-4 h-4 text-emerald-400 absolute right-3.5 top-3.5" />
                      <span className="absolute left-3 top-3.5 text-xs text-slate-500 font-mono" dir="ltr">
                        +20
                      </span>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        required
                        placeholder="01012345678"
                        dir="ltr"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pr-10 pl-14 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono text-right"
                      />
                    </div>

                    {loginWithPasswordMode && (
                      <div className="pt-1 space-y-1.5 animate-fadeIn">
                        <label className="block text-xs font-bold text-slate-300">
                          الرقم السري
                        </label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-amber-400 absolute right-3.5 top-3.5" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Aa123456"
                            dir="ltr"
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl pr-10 pl-11 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono text-right"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute left-3 top-3 text-slate-400 hover:text-white"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    )}

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {loginWithPasswordMode
                        ? 'أدخل رقمك المسجل والرقم السري للدخول الفوري.'
                        : 'أدخل رقم هاتفك لتسجيل الدخول الفوري. سيتم إرسال رمز تحقق ذكي وتعبئته تلقائياً.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs px-1">
                    <button
                      type="button"
                      onClick={() => setLoginWithPasswordMode(!loginWithPasswordMode)}
                      className="text-amber-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>{loginWithPasswordMode ? 'التبديل لتسجيل الدخول برمز OTP' : 'الدخول بالرقم السري'}</span>
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-sm transition flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <span>{loginWithPasswordMode ? 'تسجيل الدخول بالرقم السري' : 'أرسل رمز التحقق (OTP)'}</span>
                        <ArrowRight className="w-4 h-4 rotate-180" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              /* ============================================================
                 TAB 2: REGISTER NEW ACCOUNT
                 Contains 4 choice buttons: [عميل - كابتن - الإدارة - تعيين جديد]
                 ============================================================ */
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!fullName.trim()) {
                    setErrorMessage('يرجى كتابة الاسم الكامل');
                    return;
                  }
                  const pwdError = getPasswordValidationError(password);
                  if (pwdError) {
                    setErrorMessage(pwdError);
                    return;
                  }
                  startOtpFlow(phoneNumber);
                }}
                className="space-y-4"
              >
                {/* The 4 Choice Buttons Row */}
                {renderFourChoiceButtons()}

                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    الاسم الكامل
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="مثال: أحمد مصطفى السكندري"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 text-right"
                  />
                </div>

                {/* Egyptian Mobile Phone (Fixed state) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-300">
                      رقم الموبايل المصري
                    </label>
                    <span className="text-[10px] text-amber-400 font-mono">01xxxxxxxxx</span>
                  </div>
                  <div className="relative">
                    <Smartphone className="w-4 h-4 text-emerald-400 absolute right-3.5 top-3.5" />
                    <span className="absolute left-3 top-3 text-xs text-slate-500 font-mono" dir="ltr">
                      +20
                    </span>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      required
                      placeholder="01012345678"
                      dir="ltr"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-10 pl-14 py-2.5 text-sm text-white font-mono text-right focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Password Field with Instant Validation */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-300">
                      الرقم السري (حرف كبير + حرف صغير + 6 أرقام)
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">Aa123456</span>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-amber-400 absolute right-3.5 top-3.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="مثال: Aa123456"
                      dir="ltr"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-10 pl-11 py-2.5 text-sm text-white font-mono text-right focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-3 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Real-time Validation Hints */}
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={/[A-Z]/.test(password) ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                        {/[A-Z]/.test(password) ? '✓' : '○'} حرف كابيتال واحد على الأقل (A-Z)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={/[a-z]/.test(password) ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                        {/[a-z]/.test(password) ? '✓' : '○'} حرف سمول واحد على الأقل (a-z)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          (password.match(/\d/g) || []).length === 6
                            ? 'text-emerald-400 font-bold'
                            : 'text-slate-500'
                        }
                      >
                        {(password.match(/\d/g) || []).length === 6 ? '✓' : '○'} 6 أرقام بالظبط (المكتوب: {(password.match(/\d/g) || []).length})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Driver Additional Fields */}
                {accountType === 'Driver' && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                      <Bike className="w-4 h-4" />
                      <span>بيانات وتغطية كابتن الإسكندرية</span>
                    </div>

                    {/* Alexandria Areas Selector */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1.5">
                        مناطق العمل المفضلة بالإسكندرية:
                      </label>
                      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1">
                        {ALEXANDRIA_AREAS.map((area) => {
                          const isSelected = selectedAreas.includes(area);
                          return (
                            <button
                              key={area}
                              type="button"
                              onClick={() => toggleArea(area)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                                isSelected
                                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                              }`}
                            >
                              {area}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Vehicle Type */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          نوع المركبة
                        </label>
                        <select
                          value={vehicleType}
                          onChange={(e) => setVehicleType(e.target.value as any)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                        >
                          <option value="motorcycle">موتوسيكل / سكوتر</option>
                          <option value="bicycle">عجلة (دراجة)</option>
                          <option value="car">سيارة ملاكي</option>
                          <option value="van">فان بضائع</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          رقم اللوحة
                        </label>
                        <input
                          type="text"
                          value={plateNumber}
                          onChange={(e) => setPlateNumber(e.target.value)}
                          placeholder="س د أ 1234"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white text-right"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Merchant Account Checkbox */}
                {accountType === 'Customer' && (
                  <div className="flex items-center gap-2 p-2 bg-slate-950 rounded-xl border border-slate-800">
                    <input
                      type="checkbox"
                      id="isMerchantAccount"
                      checked={isMerchantAccount}
                      onChange={(e) => setIsMerchantAccount(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-0"
                    />
                    <label htmlFor="isMerchantAccount" className="text-xs text-slate-300 cursor-pointer">
                      أنا تاجر وأريد تفعيل ميزات الحساب التجاري (متجر وصلها)
                    </label>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-sm transition flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span>متابعة والتحقق برمز OTP</span>
                      <ArrowRight className="w-4 h-4 rotate-180" />
                    </>
                  )}
                </button>
              </form>
            )
          ) : (
            /* -------------------------------------------------------------
               VIEW B: OTP CODE INPUT (Auto-fill within 1s + 30s Loop)
               ------------------------------------------------------------- */
            <div className="space-y-5 animate-fadeIn">
              <div className="text-center space-y-1">
                <span className="text-xs text-slate-400">تم إرسال كود التحقق المكون من 6 أرقام إلى:</span>
                <p className="text-base font-black font-mono text-amber-400" dir="ltr">
                  +20 {phoneNumber}
                </p>
                {statusNotice && (
                  <p className="text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 py-1.5 px-3 rounded-xl inline-block mt-1 animate-pulse">
                    {statusNotice}
                  </p>
                )}
              </div>

              {/* 6 Digit Inputs */}
              <div className="flex items-center justify-center gap-2" dir="ltr">
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      digitInputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleDigitKeyDown(index, e)}
                    className={`w-12 h-14 rounded-2xl bg-slate-950 border text-center font-black text-xl text-white transition focus:outline-none ${
                      digit
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-slate-800 focus:border-amber-500'
                    }`}
                  />
                ))}
              </div>

              {/* 30s Countdown timer */}
              <div className="flex items-center justify-center gap-2 text-xs font-mono text-slate-400">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>صلاحية الكود وتجديده التلقائي:</span>
                <span className="font-bold text-amber-400 font-mono text-sm">{timerSeconds} ثانية</span>
              </div>

              {/* Verify & Resend Actions */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => handleVerifyCode(otpDigits.join(''))}
                  disabled={loading || otpDigits.some((d) => !d)}
                  className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-sm transition flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>تأكيد والدخول إلى التطبيق</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between text-xs px-2 pt-1 text-slate-400">
                  <button
                    type="button"
                    onClick={() => startOtpFlow(phoneNumber, true)}
                    className="hover:text-amber-400 flex items-center gap-1 font-bold"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>توليد كود جديد يدوياً</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep('form');
                      setErrorMessage(null);
                    }}
                    className="hover:text-white"
                  >
                    تعديل رقم الهاتف
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-center text-[11px] text-slate-500 flex-shrink-0">
          منصة وصلها اسكندرية • نظام التوثيق المشفر والمحمي
        </div>
      </div>
    </div>
  );
};
