import React, { useState, useEffect } from 'react';
import { CustomerApp } from './components/customer/CustomerApp.tsx';
import { DriverApp } from './components/driver/DriverApp.tsx';
import { MerchantDashboard } from './components/merchant/MerchantDashboard.tsx';
import { AdminDashboard } from './components/admin/AdminDashboard.tsx';
import { AdminLoginPage } from './components/admin/AdminLoginPage.tsx';
import { LoginPage } from './components/auth/LoginPage.tsx';
import { ADMIN_PHONES } from './config/adminWhitelist.ts';
import { User } from './types/index.ts';
import {
  Smartphone,
  Bike,
  Store,
  ShieldCheck,
  Building,
  User as UserIcon,
  LogIn,
  LogOut,
  MapPin,
  Lock,
  ExternalLink,
  X,
  UserPlus,
  Home,
  CheckCircle,
  HelpCircle,
  Settings
} from 'lucide-react';

export default function App() {
  // Current route pathname based on window.location.pathname
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname || '/';
    }
    return '/';
  });

  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [loginInitialTab, setLoginInitialTab] = useState<'login' | 'register'>('login');
  const [loginNotice, setLoginNotice] = useState<string | null>(null);

  // Hamburger Side Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Stored authenticated user
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('waselha_user');
        return saved ? JSON.parse(saved) : null;
      } catch {
        return null;
      }
    }
    return null;
  });

  // Navigate helper with history pushState
  const navigateTo = (path: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', path);
      setCurrentPath(path);
    }
  };

  // Sync state on popstate (browser back/forward)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Route Guard / Protection Middleware for Admin & Secret URLs
  useEffect(() => {
    const isAdminRoute = currentPath === '/admin' || currentPath === '/waselha-admin-2026' || currentPath === '/waselha-admin-xyz';
    
    if (isAdminRoute) {
      const isSuperOrAdmin =
        currentUser &&
        (currentUser.role === 'Super Admin' || currentUser.role === 'Admin' || currentUser.role === 'Finance');

      if (!isSuperOrAdmin) {
        // Enforce protection: redirect to /login and open login prompt with clear notice
        setLoginNotice('لوحة الإدارة محمية ومخصصة لمديري النظام فقط. يرجى تسجيل الدخول بحساب مسؤول.');
        setLoginInitialTab('login');
        setShowLoginModal(true);
        navigateTo('/login');
      }
    }
  }, [currentPath, currentUser]);

  const handleLoginSuccess = (user: User, token: string) => {
    setCurrentUser(user);
    setShowLoginModal(false);
    setLoginNotice(null);

    // Automatically navigate to relevant application based on user role
    if (user.role === 'Driver') {
      navigateTo('/driver');
    } else if (user.role === 'Merchant') {
      navigateTo('/merchant');
    } else if (user.role === 'Super Admin' || user.role === 'Admin' || user.role === 'Finance') {
      navigateTo('/waselha-admin-xyz');
    } else {
      navigateTo('/');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('waselha_user');
    localStorage.removeItem('waselha_token');
    setCurrentUser(null);
    setIsDrawerOpen(false);
    navigateTo('/login');
    setLoginNotice('تم تسجيل الخروج بنجاح.');
    setLoginInitialTab('login');
    setShowLoginModal(true);
  };

  // Determine current active application view
  const isDriverRoute = currentPath === '/driver' || currentPath === '/captain';
  const isMerchantRoute = currentPath === '/merchant' || currentPath === '/store';
  const isAdminRoute = currentPath === '/admin' || currentPath === '/waselha-admin-2026' || currentPath === '/waselha-admin-xyz';
  const isAdminLoginRoute = currentPath === '/admin/login';
  const isLoginRoute = currentPath === '/login';

  const isUserAdmin =
    currentUser &&
    (currentUser.role === 'Super Admin' || currentUser.role === 'Admin' || currentUser.role === 'Finance');

  // Requirement 3: Only whitelisted phones ("01027760669", "01008100546") see the Admin button
  const activePhone =
    currentUser?.phone ||
    (typeof window !== 'undefined' ? localStorage.getItem('lastPhone') || localStorage.getItem('lastAdminPhone') || '' : '');
  const isWhitelistedAdmin = Boolean(activePhone && ADMIN_PHONES.includes(activePhone)) || Boolean(isUserAdmin);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950" dir="rtl">
      {/* Global Waselha Alexandria Ecosystem Header */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/80 shadow-2xl">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-3">
          
          {/* Right Section: Brand Identity */}
          <div
            onClick={() => {
              if (isUserAdmin) navigateTo('/waselha-admin-xyz');
              else if (currentUser?.role === 'Driver') navigateTo('/driver');
              else navigateTo('/');
            }}
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer select-none"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 flex items-center justify-center font-black text-xl shadow-lg shadow-amber-500/25 flex-shrink-0">
              و
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="font-black text-white text-base tracking-tight leading-none">
                  وصلها اسكندرية
                </h1>
                <span className="text-[10px] bg-amber-500/20 text-amber-400 font-bold px-1.5 py-0.5 rounded border border-amber-500/30">
                  ALEXANDRIA
                </span>

                {/* Badge for dedicated app context */}
                {isDriverRoute && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 mr-1 flex items-center gap-1">
                    <Bike className="w-3 h-3" />
                    <span>تطبيق الكابتن</span>
                  </span>
                )}

                {isAdminRoute && isUserAdmin && (
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 font-bold px-2 py-0.5 rounded-full border border-purple-500/30 mr-1 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>لوحة الإدارة</span>
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-400 block leading-tight mt-0.5 hidden xs:block">
                تسعيرة ثابتة: 15 ج.م + (المسافة × 3 ج.م/كم)
              </span>
            </div>
          </div>

          {/* Left Section: User Status + Auth Buttons + Hamburger 4-bar Menu Button */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* If user is admin, provide secure button to their secret admin console */}
            {isUserAdmin && !isAdminRoute && (
              <button
                onClick={() => navigateTo('/waselha-admin-xyz')}
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-200 text-xs font-bold transition"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                <span>لوحة الإدارة</span>
              </button>
            )}

            {currentUser ? (
              <div className="flex items-center gap-1.5">
                <div className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center gap-2 text-xs font-bold">
                  {currentUser.avatar ? (
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.name}
                      className="w-5 h-5 rounded-full object-cover border border-amber-500/50"
                    />
                  ) : (
                    <UserIcon className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  <span className="max-w-[100px] truncate hidden sm:inline text-white">{currentUser.name}</span>
                  <span className="text-[10px] bg-slate-800 text-amber-400 px-1.5 py-0.5 rounded border border-slate-700 font-mono">
                    {currentUser.role === 'Customer'
                      ? 'عميل'
                      : currentUser.role === 'Driver'
                      ? 'كابتن'
                      : currentUser.role === 'Merchant'
                      ? 'تاجر'
                      : 'إدارة'}
                  </span>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setLoginNotice(null);
                  setLoginInitialTab('login');
                  setShowLoginModal(true);
                }}
                className="px-3 sm:px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black transition flex items-center gap-1.5 text-xs shadow-md shadow-amber-500/20"
                title="دخول برقم الهاتف"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>دخول برقم الهاتف</span>
              </button>
            )}

            {/* REQUIREMENT 2: 4-bar Hamburger Button (4 شرط فوق بعض ☰) */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="flex flex-col justify-center items-center gap-[3px] w-10 h-10 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700/90 text-amber-400 hover:text-amber-300 transition shadow-lg cursor-pointer flex-shrink-0 group"
              title="القائمة الرئيسية"
              aria-label="القائمة الجانبية"
            >
              <span className="w-5 h-[2.5px] bg-amber-400 rounded-full group-hover:bg-amber-300 transition"></span>
              <span className="w-5 h-[2.5px] bg-amber-400 rounded-full group-hover:bg-amber-300 transition"></span>
              <span className="w-5 h-[2.5px] bg-amber-400 rounded-full group-hover:bg-amber-300 transition"></span>
              <span className="w-5 h-[2.5px] bg-amber-400 rounded-full group-hover:bg-amber-300 transition"></span>
            </button>
          </div>
        </div>
      </header>

      {/* REQUIREMENT 2: SIDE DRAWER COMPONENT */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex animate-fadeIn" dir="rtl">
          {/* Backdrop Overlay */}
          <div
            onClick={() => setIsDrawerOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
          />

          {/* Drawer Slide-in Panel (From Right in RTL) */}
          <div className="relative w-80 max-w-[85vw] h-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col z-10 animate-slideRight">
            
            {/* Drawer Header */}
            <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 flex items-center justify-center font-black text-lg shadow-md">
                  و
                </div>
                <div>
                  <h3 className="font-black text-white text-sm">وصلها اسكندرية</h3>
                  <p className="text-[11px] text-slate-400">القائمة الرئيسية</p>
                </div>
              </div>

              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title="إغلاق القائمة"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Profile Card (if logged in) */}
            {currentUser && (
              <div className="p-4 bg-slate-950/60 border-b border-slate-800/80">
                <div className="flex items-center gap-3">
                  {currentUser.avatar ? (
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.name}
                      className="w-12 h-12 rounded-2xl object-cover border-2 border-amber-500/40"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold text-lg">
                      {currentUser.name.charAt(0)}
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <h4 className="font-bold text-white text-sm truncate">{currentUser.name}</h4>
                    <span className="text-[11px] text-slate-400 font-mono block" dir="ltr">
                      {currentUser.phone}
                    </span>
                    <span className="inline-block mt-1 text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                      {currentUser.role === 'Customer'
                        ? 'عميل وصلها'
                        : currentUser.role === 'Driver'
                        ? 'كابتن معتمد'
                        : currentUser.role === 'Merchant'
                        ? 'حساب تاجر'
                        : 'مدير نظام'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Drawer Navigation List */}
            <div className="p-4 space-y-2 flex-1 overflow-y-auto">
              {/* REQUIREMENT 2 ACTION 1: تسجيل دخول */}
              <button
                type="button"
                onClick={() => {
                  setIsDrawerOpen(false);
                  setLoginNotice(null);
                  setLoginInitialTab('login');
                  setShowLoginModal(true);
                }}
                className="w-full p-3.5 rounded-2xl bg-slate-950 hover:bg-amber-500/10 border border-slate-800 hover:border-amber-500/40 text-slate-200 hover:text-amber-400 font-bold text-sm transition flex items-center gap-3 text-right group"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition">
                  <LogIn className="w-4.5 h-4.5" />
                </div>
                <div>
                  <span className="block text-white group-hover:text-amber-300 font-bold">تسجيل دخول</span>
                  <span className="block text-[11px] text-slate-400">برقم الهاتف ورمز التحقق (OTP)</span>
                </div>
              </button>

              {/* REQUIREMENT 2 ACTION 2: تسجيل حساب جديد */}
              <button
                type="button"
                onClick={() => {
                  setIsDrawerOpen(false);
                  setLoginNotice(null);
                  setLoginInitialTab('register');
                  setShowLoginModal(true);
                }}
                className="w-full p-3.5 rounded-2xl bg-slate-950 hover:bg-amber-500/10 border border-slate-800 hover:border-amber-500/40 text-slate-200 hover:text-amber-400 font-bold text-sm transition flex items-center gap-3 text-right group"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition">
                  <UserPlus className="w-4.5 h-4.5" />
                </div>
                <div>
                  <span className="block text-white group-hover:text-emerald-300 font-bold">تسجيل حساب جديد</span>
                  <span className="block text-[11px] text-slate-400">انضم كعميل أو كابتن توصيل في الإسكندرية</span>
                </div>
              </button>

              {/* Navigation Shortcuts for Apps */}
              <div className="pt-3 pb-1 border-t border-slate-800/80">
                <span className="text-[11px] font-bold text-slate-500 px-2 block mb-2">أقسام المنصة:</span>
                
                <button
                  type="button"
                  onClick={() => {
                    setIsDrawerOpen(false);
                    navigateTo('/');
                  }}
                  className={`w-full p-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2.5 text-right ${
                    currentPath === '/' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Home className="w-4 h-4" />
                  <span>الرئيسية (تطبيق العميل)</span>
                </button>

                {(!currentUser || currentUser.role === 'Driver') && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsDrawerOpen(false);
                      navigateTo('/driver');
                    }}
                    className={`w-full p-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2.5 text-right mt-1 ${
                      isDriverRoute ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Bike className="w-4 h-4" />
                    <span>تطبيق الكابتن (المناديب)</span>
                  </button>
                )}

                {/* Requirement 3: إظهار اختيار "دخول لوحة الإدارة" فقط إذا كان الرقم من القائمة البيضاء */}
                {isWhitelistedAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsDrawerOpen(false);
                      if (isUserAdmin) {
                        navigateTo('/waselha-admin-xyz');
                      } else {
                        navigateTo('/admin/login');
                      }
                    }}
                    className={`w-full p-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2.5 text-right mt-1 ${
                      isAdminRoute || isAdminLoginRoute
                        ? 'bg-red-900/90 text-white font-black border border-red-600'
                        : 'bg-red-950/60 text-red-200 hover:bg-red-900 border border-red-800/60'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-red-400" />
                    <span>دخول لوحة الإدارة</span>
                  </button>
                )}
              </div>

              {/* REQUIREMENT 2 ACTION 3: تسجيل خروج من الابليكشن */}
              <div className="pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full p-3.5 rounded-2xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 hover:border-rose-500/60 text-rose-300 font-bold text-sm transition flex items-center gap-3 text-right group"
                >
                  <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition">
                    <LogOut className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <span className="block text-rose-200 font-bold">تسجيل خروج من التطبيق</span>
                    <span className="block text-[11px] text-rose-400/80">مسح التوكن والكاش والتحويل للدخول</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 text-center">
              <span className="text-[11px] text-slate-500 block">وصلها اسكندرية الإصدار 2026.4</span>
              <span className="text-[10px] text-amber-500/80 block mt-0.5">تسعيرة ثابتة: 15 ج.م + (3 ج.م لكل كم)</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Isolated Application View */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6">
        {/* 1. Admin Portal - Protected by Role Guard (Admin Only) */}
        {isAdminRoute ? (
          isUserAdmin ? (
            <AdminDashboard />
          ) : (
            <div className="py-20 text-center space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
                <Lock className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black text-white">منطقة إدارية محمية</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                لوحة الإدارة على الرابط السري متاحة فقط لمسؤولي المنظمة. تم منع الوصول وسيتم تحويلك لصفحة تسجيل الدخول.
              </p>
              <button
                onClick={() => {
                  navigateTo('/admin/login');
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-black text-sm"
              >
                تسجيل الدخول كمسؤول
              </button>
            </div>
          )
        ) : isAdminLoginRoute ? (
          /* Dedicated Admin Login Portal */
          <AdminLoginPage
            onLoginSuccess={handleLoginSuccess}
            onNavigateHome={() => navigateTo('/')}
            onNavigateToRecruitment={(phone) => {
              if (phone) {
                localStorage.setItem('lastPhone', phone);
              }
              navigateTo(`/login?tab=recruitment${phone ? '&phone=' + encodeURIComponent(phone) : ''}`);
              setShowLoginModal(true);
            }}
          />
        ) : isDriverRoute ? (
          /* 2. Isolated Driver Application */
          <DriverApp />
        ) : isMerchantRoute ? (
          /* 3. Isolated Merchant Dashboard */
          <MerchantDashboard />
        ) : isLoginRoute ? (
          /* 4. Standalone Login Page */
          <div className="py-8 max-w-md mx-auto">
            <LoginPage
              onLoginSuccess={handleLoginSuccess}
              initialTab={loginInitialTab}
              noticeMessage={loginNotice}
            />
          </div>
        ) : (
          /* 5. Default Standalone Customer Application (Clean, No Switcher, No Admin/Merchant buttons) */
          <CustomerApp />
        )}
      </main>

      {/* LOGIN & SIGN UP MODAL (100% Phone Number + 30s Auto-OTP) */}
      {showLoginModal && (
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          onClose={() => setShowLoginModal(false)}
          initialTab={loginInitialTab}
          noticeMessage={loginNotice}
        />
      )}

      {/* Bottom Footer Note with Official Bank Account & Alexandria Policies */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 px-6 text-center text-xs text-slate-500 space-y-1">
        <p className="font-medium text-slate-400">
          وصلها اسكندرية (Waselha Alexandria) • نظام تتبع GPS حي لمحافظة الإسكندرية • تسعيرة التوصيل: <strong className="text-amber-400">15 ج.م فتح عداد + 3 ج.م لكل كيلومتر</strong>.
        </p>
        <p className="text-[11px] text-slate-400 flex items-center justify-center gap-2">
          <Building className="w-3.5 h-3.5 text-amber-400 inline" />
          <span>الحساب البنكي المعتمد لشحن مديونيات المناديب:</span>
          <strong className="font-mono text-amber-400 text-xs tracking-wider" dir="ltr">7071009697713907</strong>
          <span className="text-slate-600">|</span>
          <span>InstaPay: <strong className="text-emerald-400 font-mono">waselha.alex@instapay</strong></span>
        </p>
      </footer>
    </div>
  );
}
