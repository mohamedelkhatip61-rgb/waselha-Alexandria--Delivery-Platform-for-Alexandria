import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api.ts';
import {
  DriverProfile,
  MerchantProfile,
  Order,
  SupportTicket,
  AuditLog,
  SystemSettings,
  DriverStatus,
  LocationCoordinates,
  StaffRecruitmentApplication
} from '../../types/index.ts';
import { LiveDeliveryMap } from '../maps/LiveDeliveryMap.tsx';
import { DriverInspectionModal } from './DriverInspectionModal.tsx';
import {
  LayoutDashboard,
  Map,
  Users,
  Store,
  Truck,
  ShoppingBag,
  Wallet,
  AlertTriangle,
  Receipt,
  Headphones,
  Settings,
  ShieldCheck,
  FileSpreadsheet,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  DollarSign,
  TrendingUp,
  Sliders,
  ChevronRight,
  ExternalLink,
  Download,
  Loader2,
  UserCheck,
  UserPlus,
  IdCard,
  Check,
  X,
  KeyRound,
  Eye,
  EyeOff,
  Sparkles,
  Phone,
  FileText,
  Bike,
  Bell,
  Volume2
} from 'lucide-react';
import { ADMIN_PHONES } from '../../config/adminWhitelist.ts';
import { CustomerApp } from '../customer/CustomerApp.tsx';
import { DriverApp } from '../driver/DriverApp.tsx';
import { SupportCenter } from '../support/SupportCenter.tsx';

export const AdminDashboard: React.FC = () => {
  const [activeSection, setActiveSection] = useState<
    'overview' | 'live_map' | 'recruitment' | 'drivers' | 'orders' | 'merchants' | 'debts' | 'support' | 'settings' | 'audit' | 'reports'
  >('overview');

  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalMerchants: 0,
    totalDrivers: 0,
    onlineDrivers: 0,
    activeOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    totalSales: 0,
    totalCommissions: 0,
    totalDeliveryFees: 0,
    totalDriverDebts: 0,
    totalSupportTicketsOpen: 0,
  });
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [merchants, setMerchants] = useState<MerchantProfile[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [settingsData, setSettingsData] = useState<SystemSettings | null>(null);
  const [recruitments, setRecruitments] = useState<StaffRecruitmentApplication[]>([]);

  // Filters & selection
  const [driverFilter, setDriverFilter] = useState<string>('ALL');
  const [driverSearch, setDriverSearch] = useState<string>('');
  const [selectedDriverForInspect, setSelectedDriverForInspect] = useState<DriverProfile | null>(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Recruitment filters & states
  const [recruitmentFilter, setRecruitmentFilter] = useState<string>('ALL');
  const [recruitmentSearch, setRecruitmentSearch] = useState<string>('');
  const [rejectModalTarget, setRejectModalTarget] = useState<{
    id: string;
    name: string;
    type: 'recruitment' | 'driver';
  } | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState<string>('');
  const [previewIdImage, setPreviewIdImage] = useState<{ title: string; url: string } | null>(null);
  const [actionToast, setActionToast] = useState<string | null>(null);

  // Ticket summarization state for admin
  const [ticketSummaries, setTicketSummaries] = useState<Record<string, string>>({});
  const [summarizingTicketId, setSummarizingTicketId] = useState<string | null>(null);

  const handleSummarizeTicket = async (ticket: SupportTicket) => {
    setSummarizingTicketId(ticket.id);
    try {
      const res = await api.summarizeIssue({
        title: ticket.subject,
        description: ticket.description,
        orderNumber: ticket.ticketNumber,
      });
      if (res.summary) {
        setTicketSummaries((prev) => ({ ...prev, [ticket.id]: res.summary }));
      }
    } catch {
      setTicketSummaries((prev) => ({
        ...prev,
        [ticket.id]: `ملخص محلي: التذكرة ${ticket.ticketNumber} بخصوص "${ticket.subject}" قيد المتابعة من الإدارة.`,
      }));
    } finally {
      setSummarizingTicketId(null);
    }
  };

  // Admin Change Password States (Inside Settings)
  const [oldAdminPass, setOldAdminPass] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [confirmNewAdminPass, setConfirmNewAdminPass] = useState('');
  const [showAdminPassFields, setShowAdminPassFields] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passChangeStatus, setPassChangeStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  // Requirement 3 & 4: Super Admin Identification, Instant Popup, and Quick Switches
  const [currentAdminPhone, setCurrentAdminPhone] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lastAdminPhone') || localStorage.getItem('lastPhone');
      if (saved && saved.trim()) return saved.trim();
      const userStr = localStorage.getItem('waselha_user');
      if (userStr) {
        try {
          const u = JSON.parse(userStr);
          if (u.phone) return u.phone;
        } catch (e) {}
      }
    }
    return '01027760669';
  });

  const isSuperAdmin = ADMIN_PHONES.includes(currentAdminPhone);

  // Exact name requested in prompt: "مدير النظام (669...)"
  const adminDisplayTitle = currentAdminPhone.endsWith('669')
    ? 'مدير النظام (669...)'
    : currentAdminPhone.endsWith('546')
    ? 'مدير النظام (546...)'
    : `مدير النظام (${currentAdminPhone.slice(-3)}...)`;

  // Super Admin Instant Role Switch Sandbox ('customer' | 'driver' | 'support' | null)
  const [superAdminPreviewRole, setSuperAdminPreviewRole] = useState<'customer' | 'driver' | 'support' | null>(null);

  // Instant Alert Popup State & Sound Alert (Requirement 3)
  const [instantAlertPopup, setInstantAlertPopup] = useState<{
    id: string;
    name: string;
    phone: string;
    nationalId?: string;
    role: string;
    photo?: string;
    type: 'recruitment' | 'driver';
  } | null>(null);

  const knownApplicantIdsRef = React.useRef<Set<string>>(new Set());
  const isInitialLoadRef = React.useRef(true);

  // Audio tone generator for real-time notification chime
  const playNotificationSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Two-tone chime: 880Hz (A5) -> 1174.66Hz (D6)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1174.66, now + 0.12);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.55);
    } catch (e) {
      console.warn('Audio tone error:', e);
    }
  };

  const triggerTestNotification = () => {
    playNotificationSound();
    setInstantAlertPopup({
      id: 'test_alert',
      name: 'محمود أحمد الشناوي',
      phone: '01012345678',
      nationalId: '29801010201234',
      role: 'موظف إداري / دعم فني',
      photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      type: 'recruitment',
    });
  };

  const loadAllAdminData = async () => {
    try {
      const [sRes, dRes, mRes, oRes, tRes, aRes, setRes, rRes] = await Promise.all([
        api.getAdminStats(),
        api.getDrivers(),
        api.getMerchants(),
        api.getOrders(),
        api.getSupportTickets(),
        api.getAuditLogs(),
        api.getSettings(),
        api.getRecruitmentApplications(),
      ]);

      if (sRes.data) setStats(sRes.data);
      if (dRes.data) setDrivers(dRes.data);
      if (mRes.data) setMerchants(mRes.data);
      if (oRes.data) setOrders(oRes.data);
      if (tRes.data) setTickets(tRes.data);
      if (aRes.data) setAuditLogs(aRes.data);
      if (setRes.data) setSettingsData(setRes.data);

      if (rRes.data) {
        setRecruitments(rRes.data);

        // Detect new registrations in real time for Super Admin
        if (isInitialLoadRef.current) {
          rRes.data.forEach((r) => knownApplicantIdsRef.current.add(r.id));
          dRes.data?.forEach((d) => knownApplicantIdsRef.current.add(d.id));
          isInitialLoadRef.current = false;
        } else if (isSuperAdmin) {
          // Check for freshly arrived applicants
          const newApplicant = rRes.data.find(
            (r) => !knownApplicantIdsRef.current.has(r.id) && r.status === 'pending'
          );
          if (newApplicant) {
            knownApplicantIdsRef.current.add(newApplicant.id);
            playNotificationSound();
            setInstantAlertPopup({
              id: newApplicant.id,
              name: newApplicant.fullName,
              phone: newApplicant.phone,
              nationalId: newApplicant.nationalId,
              role: newApplicant.roleRequested === 'Driver' ? 'كابتن توصيل ميداني' : 'موظف إداري / دعم',
              photo: newApplicant.personalPhoto,
              type: 'recruitment',
            });
          }
        }
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    }
  };

  useEffect(() => {
    loadAllAdminData();
    const interval = setInterval(loadAllAdminData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Update Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsData) return;
    setIsSavingSettings(true);
    try {
      const res = await api.updateSettings(settingsData);
      setSettingsData(res.data);
      setActionToast('تم حفظ إعدادات التسعير، والمديونيات، وتوزيع الطلبات بنجاح');
      setTimeout(() => setActionToast(null), 4000);
    } catch (err: any) {
      alert(err.message || 'فشل حفظ الإعدادات');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Change Admin Password
  const handleChangeAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassChangeStatus(null);

    const activeAdminPhone =
      (typeof window !== 'undefined' ? localStorage.getItem('lastAdminPhone') || localStorage.getItem('lastPhone') : '') ||
      '01027760669';

    if (!newAdminPass) {
      setPassChangeStatus({ success: false, message: 'يرجى كتابة الرقم السري الجديد' });
      return;
    }

    if (newAdminPass !== confirmNewAdminPass) {
      setPassChangeStatus({ success: false, message: 'الرقم السري الجديد وتأكيده غير متطابقين' });
      return;
    }

    // Validation: 1 upper + 1 lower + 6 digits
    const hasUpper = /[A-Z]/.test(newAdminPass);
    const hasLower = /[a-z]/.test(newAdminPass);
    const digits = (newAdminPass.match(/\d/g) || []).length;
    if (!hasUpper || !hasLower || digits !== 6) {
      setPassChangeStatus({
        success: false,
        message: 'يجب أن يبدأ بحرف كبير (A-Z) وحرف صغير (a-z) يليهما 6 أرقام (مثال: Aa123456)',
      });
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await api.changeAdminPassword({
        phone: activeAdminPhone,
        oldPassword: oldAdminPass,
        newPassword: newAdminPass,
      });

      if (res.success) {
        setPassChangeStatus({ success: true, message: 'تم تحديث الرقم السري بنجاح!' });
        setOldAdminPass('');
        setNewAdminPass('');
        setConfirmNewAdminPass('');
      } else {
        throw new Error(res.message || 'فشل تحديث الرقم السري');
      }
    } catch (err: any) {
      setPassChangeStatus({ success: false, message: err.message || 'حدث خطأ أثناء تغيير الرقم السري' });
    } finally {
      setIsChangingPass(false);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      encodeURIComponent(
        [
          'رقم الطلب,اسم العميل,المتجر,المندوب,الإجمالي,عمولة المنصة,رسوم التوصيل,الحالة,التاريخ',
          ...orders.map(
            (o) =>
              `${o.orderNumber},${o.customerName},${o.merchantName},${o.driverName || 'لم يعين'},${o.total},${o.platformCommission},${o.deliveryFee},${o.status},${o.createdAt.substring(0, 10)}`
          ),
        ].join('\n')
      );
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `waselha_egypt_orders_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // -------------------------------------------------------------
  // RECRUITMENT & VERIFICATION ACTIONS (قبول / رفض)
  // -------------------------------------------------------------
  const handleAcceptItem = async (target: { id: string; name: string; type: 'recruitment' | 'driver' }) => {
    try {
      if (target.type === 'recruitment') {
        const res = await api.updateRecruitmentStatus(target.id, { status: 'approved' });
        if (res.success) {
          setActionToast(`تم قبول واعتماد طلب "${target.name}" بنجاح، أصبح الحساب معتمداً ويمكنه الدخول.`);
          loadAllAdminData();
          setTimeout(() => setActionToast(null), 4500);
        }
      } else {
        const res = await api.updateDriverStatus(target.id, { status: 'Approved' });
        if (res.success) {
          setActionToast(`تم قبول وتوثيق الكابتن "${target.name}" رسمياً، يمكنه الآن دخول التطبيق وتلقي الطلبات.`);
          loadAllAdminData();
          setTimeout(() => setActionToast(null), 4500);
        }
      }
    } catch (err: any) {
      alert(err.message || 'فشل اعتماد الطلب');
    }
  };

  const handleOpenRejectModal = (target: { id: string; name: string; type: 'recruitment' | 'driver' }) => {
    setRejectModalTarget(target);
    setRejectReasonInput('');
  };

  const handleConfirmReject = async () => {
    if (!rejectModalTarget) return;
    try {
      const reason = rejectReasonInput.trim() || 'لم يتم استيفاء شروط التعيين أو وضوح المستندات المطلوبة';
      if (rejectModalTarget.type === 'recruitment') {
        await api.updateRecruitmentStatus(rejectModalTarget.id, {
          status: 'rejected',
          rejectionReason: reason,
        });
        setActionToast(`تم رفض طلب التعيين لـ "${rejectModalTarget.name}" وتسجيل سبب الرفض بنجاح.`);
      } else {
        await api.updateDriverStatus(rejectModalTarget.id, {
          status: 'Rejected',
          rejectionReason: reason,
        });
        setActionToast(`تم رفض طلب توثيق الكابتن "${rejectModalTarget.name}" وتسجيل سبب الرفض.`);
      }
      setRejectModalTarget(null);
      setRejectReasonInput('');
      loadAllAdminData();
      setTimeout(() => setActionToast(null), 4500);
    } catch (err: any) {
      alert(err.message || 'فشل رفض الطلب');
    }
  };

  // Filtered drivers list
  const filteredDrivers = drivers.filter((d) => {
    if (driverFilter !== 'ALL' && d.status !== driverFilter) return false;
    if (driverSearch && !d.name.toLowerCase().includes(driverSearch.toLowerCase()) && !d.phone.includes(driverSearch))
      return false;
    return true;
  });

  // Filtered orders list
  const filteredOrders = orders.filter((o) => {
    if (orderStatusFilter !== 'ALL' && o.status !== orderStatusFilter) return false;
    return true;
  });

  // Unified items for "تعيين جديد" (External applications + Driver verification requests)
  const unifiedRecruitmentList = [
    ...recruitments.map((r) => ({
      id: r.id,
      name: r.fullName,
      phone: r.phone,
      nationalId: r.nationalId,
      personalPhoto: r.personalPhoto,
      idCardPhoto: r.nationalIdCardPhoto,
      roleRequested: r.roleRequested === 'Driver' ? 'كابتن توصيل ميداني' : 'موظف إداري / دعم',
      isDriver: r.roleRequested === 'Driver',
      status: r.status, // 'pending' | 'approved' | 'rejected'
      rejectionReason: r.rejectionReason,
      date: r.submittedAt,
      type: 'recruitment' as const,
    })),
    ...drivers.map((d) => {
      const idDoc = d.documents.find((doc) => doc.type === 'national_id');
      return {
        id: d.id,
        name: d.name,
        phone: d.phone,
        nationalId: '29' + d.phone.slice(-8) + '0000', // Reference
        personalPhoto: d.avatar,
        idCardPhoto: idDoc?.fileUrl || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&auto=format&fit=crop&q=80',
        roleRequested: `كابتن (${d.vehicle?.model || d.vehicle?.type || 'دراجة نارية'})`,
        isDriver: true,
        status: d.status === 'Approved' ? 'approved' : d.status === 'Rejected' ? 'rejected' : 'pending',
        rejectionReason: d.rejectionReason,
        date: d.joinedAt,
        type: 'driver' as const,
      };
    }),
  ];

  const filteredUnifiedRecruitment = unifiedRecruitmentList.filter((item) => {
    if (recruitmentFilter === 'pending' && item.status !== 'pending') return false;
    if (recruitmentFilter === 'approved' && item.status !== 'approved') return false;
    if (recruitmentFilter === 'rejected' && item.status !== 'rejected') return false;
    if (recruitmentFilter === 'Staff' && item.isDriver) return false;
    if (recruitmentFilter === 'Driver' && !item.isDriver) return false;

    if (recruitmentSearch) {
      const q = recruitmentSearch.toLowerCase().trim();
      const matchName = item.name.toLowerCase().includes(q);
      const matchPhone = item.phone.includes(q);
      const matchId = item.nationalId.includes(q);
      if (!matchName && !matchPhone && !matchId) return false;
    }
    return true;
  });

  const pendingRecruitmentCount = unifiedRecruitmentList.filter((i) => i.status === 'pending').length;

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col md:flex-row gap-5 pb-20" dir="rtl">
      {/* Toast Notification */}
      {actionToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-emerald-500/80 text-emerald-300 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-fadeIn">
          <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{actionToast}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl shrink-0 flex flex-col justify-between">
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 flex items-center justify-center font-black text-lg shadow-lg shadow-amber-500/20">
              ⚡
            </div>
            <div>
              <h3 className="font-black text-white text-sm">لوحة الإدارة الفائقة</h3>
              <p className="text-[11px] text-amber-400 font-bold">Waselha Operations Portal</p>
            </div>
          </div>

          <nav className="space-y-1 text-xs font-bold">
            {[
              { id: 'overview', label: 'لوحة المؤشرات العامة', icon: LayoutDashboard },
              { id: 'live_map', label: 'خريطة العمليات الحية (GPS)', icon: Map },
              {
                id: 'recruitment',
                label: 'تعيين جديد',
                icon: UserCheck,
                count: pendingRecruitmentCount,
                highlight: pendingRecruitmentCount > 0,
              },
              {
                id: 'drivers',
                label: 'إدارة وتوثيق المناديب',
                icon: Truck,
                count: drivers.filter((d) => d.status === 'Pending Review').length,
              },
              {
                id: 'orders',
                label: 'متابعة وإسناد الطلبات',
                icon: ShoppingBag,
                count: orders.filter((o) => !['Delivered', 'Cancelled'].includes(o.status)).length,
              },
              { id: 'merchants', label: 'إدارة المتاجر والشركاء', icon: Store },
              {
                id: 'debts',
                label: 'المحافظ والمديونيات',
                icon: Wallet,
                alert: drivers.some((d) => d.debt > d.maxDebtLimit),
              },
              {
                id: 'support',
                label: 'تذاكر الدعم والنزاعات',
                icon: Headphones,
                count: tickets.filter((t) => t.status === 'Open').length,
              },
              { id: 'reports', label: 'التقارير والتصدير (Export)', icon: FileSpreadsheet },
              { id: 'settings', label: 'إعدادات التسعير والتوزيع', icon: Settings },
              { id: 'audit', label: 'سجل التدقيق (Audit Logs)', icon: ShieldCheck },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id as any)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20'
                      : item.id === 'recruitment'
                      ? 'text-blue-300 hover:bg-blue-950/40 hover:text-white'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${!isActive && item.id === 'recruitment' ? 'text-blue-400' : ''}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.count !== undefined && item.count > 0 && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                        isActive
                          ? 'bg-slate-950 text-amber-400'
                          : item.id === 'recruitment'
                          ? 'bg-blue-600 text-white'
                          : 'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}

                  {item.alert && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* System Health Status */}
        <div className="pt-4 border-t border-slate-800/80 mt-6 px-2 text-[11px] text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            النظام يعمل بكفاءة
          </span>
          <span className="font-mono text-slate-500">v1.0.0-EG</span>
        </div>
      </aside>

      {/* Main Administrative Viewport */}
      <main className="flex-1 min-w-0 space-y-6">
        {/* TOP ADMINISTRATIVE HEADER (Requirement 4: فوق على الشمال جنب الاسم) */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          {/* Right side (RTL): Operations Portal Title & Live Badge */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 flex items-center justify-center font-black text-lg shadow-md shadow-amber-500/20 flex-shrink-0">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white">منصة وصلها المركزية | الإسكندرية</h2>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                  متصل ومباشر (Live)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                نظام العمليات والتحكم المركزي المعتمد • إدارة المحافظ، التعيينات، وتتبع الـ GPS
              </p>
            </div>
          </div>

          {/* Left side (فوق على الشمال): Super Admin Name + 3 Quick Switch Buttons (Requirement 4) */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Quick Switch Buttons for Super Admin (01027760669 & 01008100546) */}
            {isSuperAdmin && (
              <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shadow-inner">
                {/* 1. دخول كعميل */}
                <button
                  type="button"
                  onClick={() => setSuperAdminPreviewRole('customer')}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-slate-950 text-xs font-black transition flex items-center gap-1.5 border border-amber-500/30 cursor-pointer shadow-sm"
                  title="تجربة المنصة كعميل متسوق يطلب أوردرات بالإسكندرية"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>دخول كعميل</span>
                </button>

                {/* 2. دخول كمندوب */}
                <button
                  type="button"
                  onClick={() => setSuperAdminPreviewRole('driver')}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 text-xs font-black transition flex items-center gap-1.5 border border-emerald-500/30 cursor-pointer shadow-sm"
                  title="تجربة المنصة كمندوب/كابتن توصيل ميداني وتلقي الطلبات"
                >
                  <Bike className="w-3.5 h-3.5" />
                  <span>دخول كمندوب</span>
                </button>

                {/* 3. دخول كخدمة عملاء/موظف */}
                <button
                  type="button"
                  onClick={() => setSuperAdminPreviewRole('support')}
                  className="px-2.5 py-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-500 text-blue-300 hover:text-slate-950 text-xs font-black transition flex items-center gap-1.5 border border-blue-500/30 cursor-pointer shadow-sm"
                  title="تجربة المنصة كخدمة عملاء أو موظف دعم فني وإداري"
                >
                  <Headphones className="w-3.5 h-3.5" />
                  <span>دخول كخدمة عملاء/موظف</span>
                </button>
              </div>
            )}

            {/* Test alert sound button */}
            {isSuperAdmin && (
              <button
                type="button"
                onClick={triggerTestNotification}
                className="p-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 border border-slate-700 text-xs transition flex items-center gap-1 cursor-pointer"
                title="اختبار صوت تنبيه التعيين الجديد والإشعار الفوري"
              >
                <Bell className="w-4 h-4" />
                <span className="hidden sm:inline text-[11px] font-bold">تجربة التنبيه</span>
              </button>
            )}

            {/* Super Admin Identity Badge: مدير النظام (669...) */}
            <div className="flex items-center gap-2 bg-gradient-to-l from-red-950/80 to-slate-950 px-3.5 py-1.5 rounded-2xl border border-red-700/50 shadow-md">
              <div className="w-7 h-7 rounded-xl bg-red-600 text-white flex items-center justify-center font-black text-xs shadow-md shadow-red-600/30">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="text-right">
                <span className="font-black text-white text-xs block leading-tight">
                  {adminDisplayTitle}
                </span>
                <span className="text-[10px] text-red-300 font-mono font-bold">
                  {currentAdminPhone} • سوبر أدمن
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Popup Alert for Super Admins when someone registers (Requirement 3) */}
        {instantAlertPopup && (
          <div className="bg-slate-900 border-2 border-amber-500 rounded-3xl p-4 shadow-2xl shadow-amber-500/20 text-right space-y-3 relative animate-fadeIn" dir="rtl">
            <button
              onClick={() => setInstantAlertPopup(null)}
              className="absolute top-3 left-3 p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-800 transition"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xl shadow-lg shadow-amber-500/30 flex-shrink-0 animate-pulse">
                🔔
              </div>
              <div>
                <span className="text-[11px] font-black text-amber-400 bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-800">
                  إشعار تعيين جديد فوري! (تنبيه صوتي 🔔)
                </span>
                <h4 className="text-sm font-black text-white mt-1">
                  طلب تسجيل وارد إلى لوحة الإدارة المركزية
                </h4>
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">الاسم الكامل:</span>
                <span className="text-white font-bold">{instantAlertPopup.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">رقم الهاتف:</span>
                <span className="text-amber-400 font-mono font-bold" dir="ltr">{instantAlertPopup.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">المسمى الوظيفي:</span>
                <span className="text-blue-300 font-bold">{instantAlertPopup.role}</span>
              </div>
              {instantAlertPopup.nationalId && (
                <div className="flex justify-between">
                  <span className="text-slate-400">الرقم القومي (14 رقم):</span>
                  <span className="text-slate-300 font-mono">{instantAlertPopup.nationalId}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setActiveSection('recruitment');
                  setRecruitmentSearch(instantAlertPopup.phone);
                  setInstantAlertPopup(null);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/30 cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                <span>معاينة واعتماد الطلب فوراً في "تعيين جديد"</span>
              </button>

              <button
                type="button"
                onClick={() => setInstantAlertPopup(null)}
                className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        )}

        {/* Super Admin Live Preview Sandbox (Allows experiencing as Customer / Driver / Staff without leaving Admin) */}
        {superAdminPreviewRole && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col animate-fadeIn" dir="rtl">
            {/* Top Sticky Controller Bar */}
            <div className="bg-slate-950 border-b border-slate-800 p-3 sm:px-6 flex items-center justify-between gap-3 shadow-2xl flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-white text-sm">
                      وضع تجربة السوبر أدمن ({adminDisplayTitle})
                    </h3>
                    <span className="text-[10px] bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded-full font-bold">
                      معاينة حية بدون تسجيل خروج من الإدارة
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    أنت تتصفح المنصة حالياً كـ:{' '}
                    <strong className="text-amber-400">
                      {superAdminPreviewRole === 'customer'
                        ? 'عميل (متسوق)'
                        : superAdminPreviewRole === 'driver'
                        ? 'كابتن توصيل (مندوب)'
                        : 'خدمة عملاء وموظف دعم'}
                    </strong>
                  </p>
                </div>
              </div>

              {/* Quick Switchers inside Sandbox */}
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setSuperAdminPreviewRole('customer')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      superAdminPreviewRole === 'customer'
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    عميل
                  </button>
                  <button
                    onClick={() => setSuperAdminPreviewRole('driver')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      superAdminPreviewRole === 'driver'
                        ? 'bg-emerald-500 text-slate-950 font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    كابتن (مندوب)
                  </button>
                  <button
                    onClick={() => setSuperAdminPreviewRole('support')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      superAdminPreviewRole === 'support'
                        ? 'bg-blue-600 text-white font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    خدمة عملاء
                  </button>
                </div>

                {/* Exit Sandbox Button */}
                <button
                  onClick={() => setSuperAdminPreviewRole(null)}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs transition flex items-center gap-1.5 shadow-lg shadow-red-600/30 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>العودة للوحة الإدارة</span>
                </button>
              </div>
            </div>

            {/* Sandbox Body */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-950">
              <div className="max-w-6xl mx-auto">
                {superAdminPreviewRole === 'customer' && <CustomerApp />}
                {superAdminPreviewRole === 'driver' && <DriverApp />}
                {superAdminPreviewRole === 'support' && (
                  <SupportCenter
                    currentUserId="admin_preview_user"
                    currentUserName={adminDisplayTitle}
                    currentUserRole="Support"
                    currentUserPhone={currentAdminPhone}
                    onClose={() => setSuperAdminPreviewRole(null)}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* 1. OVERVIEW DASHBOARD */}
        {activeSection === 'overview' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-white">نظرة عامة على أداء منصة وصلها في محافظة الإسكندرية</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  بيانات لحظية للمبيعات، العمولات، المناديب المتصلين، وحالة الطلبات بعروس البحر المتوسط
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCSV}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 border border-slate-700"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>تصدير تقرير المبيعات (CSV)</span>
                </button>
              </div>
            </div>

            {/* KPI Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-lg">
                <span className="text-xs text-slate-400 font-medium">إجمالي المبيعات المحققة</span>
                <p className="text-2xl font-black text-white mt-1">
                  {stats?.totalSales || 0} <span className="text-xs font-normal text-slate-400">ج.م</span>
                </p>
                <span className="text-[11px] text-emerald-400 font-bold mt-1 block">
                  عمولة المنصة: {stats?.totalCommissions || 0} ج.م
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-lg">
                <span className="text-xs text-slate-400 font-medium">المناديب المتصلين الآن (Live)</span>
                <p className="text-2xl font-black text-emerald-400 mt-1">
                  {stats?.onlineDrivers || 0} <span className="text-xs font-normal text-slate-400">مندوب</span>
                </p>
                <span className="text-[11px] text-slate-500 mt-1 block">جاهزون لتلقي الطلبات فوراً</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-lg">
                <span className="text-xs text-slate-400 font-medium">الطلبات الجارية الآن</span>
                <p className="text-2xl font-black text-amber-400 mt-1">
                  {stats?.activeOrders || 0} <span className="text-xs font-normal text-slate-400">طلب</span>
                </p>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  مكتمل: {stats?.completedOrders || 0} • ملغي: {stats?.cancelledOrders || 0}
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-lg">
                <span className="text-xs text-slate-400 font-medium">إجمالي مديونيات المناديب</span>
                <p className="text-2xl font-black text-rose-400 mt-1">
                  {stats?.totalDriverDebts || 0} <span className="text-xs font-normal text-slate-400">ج.م</span>
                </p>
                <span className="text-[11px] text-slate-500 mt-1 block">مبالغ كاش محصلة مستحقة للشركة</span>
              </div>
            </div>

            {/* Quick Live Map Snippet */}
            <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Map className="w-5 h-5 text-amber-400" />
                  <h3 className="font-black text-white text-base">خريطة المراقبة الميدانية الحية (Alexandria Live)</h3>
                </div>
                <button
                  onClick={() => setActiveSection('live_map')}
                  className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                >
                  <span>عرض الخريطة الموسعة</span>
                  <ChevronRight className="w-4 h-4 rotate-180" />
                </button>
              </div>

              <LiveDeliveryMap
                heightClass="h-72"
                showAllDrivers={drivers.map((d) => ({
                  id: d.id,
                  name: d.name,
                  location: d.currentLocation,
                  isOnline: d.isOnline,
                  status: d.status,
                }))}
                onDriverClick={(drvId) => {
                  const target = drivers.find((d) => d.id === drvId);
                  if (target) setSelectedDriverForInspect(target);
                }}
              />
            </div>
          </div>
        )}

        {/* 2. RECRUITMENT PORTAL ("تعيين جديد") */}
        {activeSection === 'recruitment' && (
          <div className="space-y-5 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <h2 className="text-xl font-black text-white">إدارة طلبات التعيين وتوثيق الكباتن</h2>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  طلبات الموظفين المقدمة من بوابة "تعيين جديد" + طلبات توثيق المناديب الجدد بالإسكندرية
                </p>
              </div>

              {/* Status Filters */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                {[
                  { id: 'ALL', label: 'الكل' },
                  { id: 'pending', label: 'قيد المراجعة' },
                  { id: 'approved', label: 'المعتمدة' },
                  { id: 'rejected', label: 'المرفوضة' },
                  { id: 'Staff', label: 'موظفين' },
                  { id: 'Driver', label: 'كباتن توصيل' },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setRecruitmentFilter(st.id)}
                    className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition border ${
                      recruitmentFilter === st.id
                        ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-900/40'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-3 shadow-lg flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <input
                type="text"
                value={recruitmentSearch}
                onChange={(e) => setRecruitmentSearch(e.target.value)}
                placeholder="ابحث بالاسم، رقم الهاتف، أو الرقم القومي (14 رقم)..."
                className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none text-right"
              />
              {recruitmentSearch && (
                <button onClick={() => setRecruitmentSearch('')} className="text-slate-500 hover:text-white text-xs">
                  ✕
                </button>
              )}
            </div>

            {/* Cards Grid: Exactly as requested */}
            {filteredUnifiedRecruitment.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400 space-y-2">
                <UserCheck className="w-10 h-10 mx-auto text-slate-600 opacity-60 mb-2" />
                <h4 className="font-bold text-white text-sm">لا توجد طلبات تعيين مطابقة للبحث أو الفلتر</h4>
                <p className="text-xs text-slate-500">
                  كافة طلبات التعيين الخارجي والتوثيق تظهر هنا فور تسجيلها.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredUnifiedRecruitment.map((item) => {
                  const isPending = item.status === 'pending';
                  const isApproved = item.status === 'approved';
                  const isRejected = item.status === 'rejected';

                  return (
                    <div
                      key={`${item.type}_${item.id}`}
                      className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl flex flex-col justify-between space-y-3 relative overflow-hidden transition hover:border-slate-700"
                    >
                      {/* Top Header Tag */}
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                        <span className="text-[11px] font-black text-blue-400 bg-blue-950/70 border border-blue-800/60 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <UserPlus className="w-3 h-3" />
                          <span>{item.roleRequested}</span>
                        </span>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isApproved
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : isRejected
                              ? 'bg-rose-950 text-rose-400 border border-rose-800'
                              : 'bg-amber-950 text-amber-400 border border-amber-800 animate-pulse'
                          }`}
                        >
                          {isApproved ? 'معتمد رسمي ✓' : isRejected ? 'مرفوض ✗' : 'قيد المراجعة'}
                        </span>
                      </div>

                      {/* Card Core Content */}
                      <div className="flex items-start gap-3">
                        {/* Personal Photo */}
                        <div className="relative group flex-shrink-0">
                          <img
                            src={item.personalPhoto}
                            alt={item.name}
                            className="w-16 h-16 rounded-2xl object-cover border border-slate-700 bg-slate-950 shadow-md"
                          />
                        </div>

                        {/* Text Details */}
                        <div className="space-y-1 min-w-0 flex-1">
                          <h4 className="font-black text-white text-sm truncate" title={item.name}>
                            {item.name}
                          </h4>

                          {/* Phone */}
                          <div className="flex items-center gap-1.5 text-xs text-slate-300">
                            <Phone className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                            <a
                              href={`tel:${item.phone}`}
                              className="font-mono font-bold text-amber-400 hover:underline"
                              dir="ltr"
                            >
                              {item.phone}
                            </a>
                          </div>

                          {/* National ID (14 digits) */}
                          <div className="flex items-center gap-1.5 text-xs text-slate-300">
                            <IdCard className="w-3 h-3 text-blue-400 flex-shrink-0" />
                            <span className="text-slate-400 text-[11px]">الرقم القومي:</span>
                            <span className="font-mono text-white text-[11px] tracking-wide" dir="ltr">
                              {item.nationalId}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* ID Card Photo Preview Thumbnail */}
                      {item.idCardPhoto && (
                        <div className="bg-slate-950/70 p-2 rounded-2xl border border-slate-800/80 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <img
                              src={item.idCardPhoto}
                              alt="بطاقة الرقم القومي"
                              className="w-10 h-7 rounded-lg object-cover border border-slate-700 bg-slate-900 cursor-pointer hover:opacity-80 transition"
                              onClick={() => setPreviewIdImage({ title: item.name, url: item.idCardPhoto })}
                            />
                            <span className="text-[11px] text-slate-400">صورة بطاقة الرقم القومي</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPreviewIdImage({ title: item.name, url: item.idCardPhoto })}
                            className="text-[10px] text-blue-400 hover:text-blue-300 font-bold"
                          >
                            معاينة مكبرة
                          </button>
                        </div>
                      )}

                      {/* Rejection Reason Alert if rejected */}
                      {isRejected && item.rejectionReason && (
                        <div className="p-2 rounded-xl bg-rose-950/60 border border-rose-800/50 text-[11px] text-rose-300 leading-relaxed">
                          <span className="font-bold">سبب الرفض: </span>
                          <span>{item.rejectionReason}</span>
                        </div>
                      )}

                      {/* Requirement 3: Two sleek rectangular buttons [قبول #22c55e] [رفض #ef4444] */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
                        {/* قبول (Green #22c55e) */}
                        <button
                          type="button"
                          onClick={() => handleAcceptItem({ id: item.id, name: item.name, type: item.type })}
                          disabled={isApproved}
                          style={{ backgroundColor: isApproved ? '#15803d' : '#22c55e' }}
                          className={`flex-1 py-2 px-3 rounded-xl text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40 hover:brightness-110 active:scale-95 disabled:opacity-60 cursor-pointer`}
                          title="قبول الطلب واعتماد الحساب رسميًا"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{isApproved ? 'معتمد ✓' : 'قبول'}</span>
                        </button>

                        {/* رفض (Red #ef4444) */}
                        <button
                          type="button"
                          onClick={() => handleOpenRejectModal({ id: item.id, name: item.name, type: item.type })}
                          disabled={isRejected}
                          style={{ backgroundColor: isRejected ? '#991b1b' : '#ef4444' }}
                          className={`flex-1 py-2 px-3 rounded-xl text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-rose-950/40 hover:brightness-110 active:scale-95 disabled:opacity-60 cursor-pointer`}
                          title="رفض الطلب مع ذكر السبب"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>{isRejected ? 'مرفوض' : 'رفض'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 3. FULL LIVE MAP */}
        {activeSection === 'live_map' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white">الخريطة الميدانية التفاعلية</h2>
                <p className="text-xs text-slate-400">
                  عرض مواقع المناديب، المتاجر، والطلبات الجارية لحظياً في مناطق الإسكندرية (سيدي جابر، الكورنيش، سموحة، محطة الرمل، بحري، ميامي)
                </p>
              </div>
            </div>

            <LiveDeliveryMap
              heightClass="h-[600px]"
              showAllDrivers={drivers.map((d) => ({
                id: d.id,
                name: d.name,
                location: d.currentLocation,
                isOnline: d.isOnline,
                status: d.status,
              }))}
              onDriverClick={(drvId) => {
                const target = drivers.find((d) => d.id === drvId);
                if (target) setSelectedDriverForInspect(target);
              }}
            />
          </div>
        )}

        {/* 4. DRIVERS MANAGEMENT & VERIFICATION */}
        {activeSection === 'drivers' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-white">إدارة وتوثيق المناديب (Drivers Center)</h2>
                <p className="text-xs text-slate-400">
                  فحص المستندات الشخصية، اعتمادات المرور، متابعة المديونيات، وتعيين الحالات
                </p>
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                {['ALL', 'Pending Review', 'Approved', 'Suspended', 'Rejected'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setDriverFilter(st)}
                    className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition border ${
                      driverFilter === st
                        ? 'bg-amber-500 text-slate-950 border-amber-500'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {st === 'ALL' ? 'الكل' : st === 'Pending Review' ? 'بانتظار المراجعة' : st === 'Approved' ? 'معتمد' : st === 'Suspended' ? 'موقوف' : 'مرفوض'}
                  </button>
                ))}
              </div>
            </div>

            {/* Drivers Table */}
            <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-800">
                <input
                  type="text"
                  value={driverSearch}
                  onChange={(e) => setDriverSearch(e.target.value)}
                  placeholder="ابحث بالاسم، رقم الهاتف، أو المحافظة..."
                  className="w-full sm:w-80 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold bg-slate-950/40">
                      <th className="py-3 px-4">المندوب</th>
                      <th className="py-3 px-4">المركبة</th>
                      <th className="py-3 px-4">الحالة</th>
                      <th className="py-3 px-4">الاتصال</th>
                      <th className="py-3 px-4">المديونية / السقف</th>
                      <th className="py-3 px-4">الطلبات</th>
                      <th className="py-3 px-4">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredDrivers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          لا يوجد مناديب مطابقين لمعايير البحث
                        </td>
                      </tr>
                    ) : (
                      filteredDrivers.map((driver) => (
                        <tr key={driver.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={driver.avatar}
                                alt={driver.name}
                                className="w-9 h-9 rounded-xl object-cover border border-slate-700 bg-slate-800"
                              />
                              <div>
                                <h4 className="font-bold text-white text-xs">{driver.name}</h4>
                                <span className="text-[11px] text-slate-400 font-mono">{driver.phone}</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <span className="font-medium text-slate-300">{driver.vehicle.type}</span>
                            <span className="block text-[11px] text-slate-500 font-mono">{driver.vehicle.plateNumber}</span>
                          </td>

                          <td className="py-3 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                driver.status === 'Approved'
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                  : driver.status === 'Pending Review'
                                  ? 'bg-amber-950 text-amber-400 border border-amber-800 animate-pulse'
                                  : driver.status === 'Suspended'
                                  ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {driver.status}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${
                                driver.isOnline ? 'text-emerald-400' : 'text-slate-500'
                              }`}
                            >
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  driver.isOnline ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'
                                }`}
                              />
                              {driver.isOnline ? 'متصل' : 'غير متصل'}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <span
                              className={`font-mono font-bold ${
                                driver.debt > driver.maxDebtLimit ? 'text-rose-400' : 'text-slate-200'
                              }`}
                            >
                              {driver.debt} / {driver.maxDebtLimit} ج.م
                            </span>
                          </td>

                          <td className="py-3 px-4 font-mono font-bold text-slate-300">
                            {driver.totalOrdersCompleted}
                          </td>

                          <td className="py-3 px-4">
                            <button
                              onClick={() => setSelectedDriverForInspect(driver)}
                              className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-slate-950 border border-amber-500/30 text-xs font-bold transition flex items-center gap-1"
                            >
                              <span>فحص واعتماد</span>
                              <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 5. ORDERS MANAGEMENT */}
        {activeSection === 'orders' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-white">متابعة وإسناد الطلبات</h2>
                <p className="text-xs text-slate-400">
                  كافة الطلبات الجارية، المعلقة، والمسلمة داخل محافظة الإسكندرية
                </p>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                {['ALL', 'Pending', 'Preparing', 'Searching for Driver', 'On The Way', 'Delivered', 'Cancelled'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setOrderStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition border ${
                      orderStatusFilter === st
                        ? 'bg-amber-500 text-slate-950 border-amber-500'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {st === 'ALL' ? 'الكل' : st}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold bg-slate-950/40">
                      <th className="py-3 px-4">رقم الطلب</th>
                      <th className="py-3 px-4">العميل</th>
                      <th className="py-3 px-4">المتجر</th>
                      <th className="py-3 px-4">المندوب</th>
                      <th className="py-3 px-4">الإجمالي</th>
                      <th className="py-3 px-4">رسوم التوصيل</th>
                      <th className="py-3 px-4">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          لا توجد طلبات مسجلة
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((ord) => (
                        <tr key={ord.id} className="hover:bg-slate-800/40">
                          <td className="py-3 px-4 font-mono font-bold text-amber-400">{ord.orderNumber}</td>
                          <td className="py-3 px-4 text-white font-medium">{ord.customerName}</td>
                          <td className="py-3 px-4 text-slate-300">{ord.merchantName}</td>
                          <td className="py-3 px-4 text-slate-300">{ord.driverName || 'لم يعين بعد'}</td>
                          <td className="py-3 px-4 font-mono font-bold text-white">{ord.total} ج.م</td>
                          <td className="py-3 px-4 font-mono text-emerald-400">{ord.deliveryFee} ج.م</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800">
                              {ord.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 6. SYSTEM SETTINGS & ADMIN PASSWORD MANAGEMENT */}
        {activeSection === 'settings' && settingsData && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-xl font-black text-white">إعدادات التسعير، التوزيع، والأمان</h2>
              <p className="text-xs text-slate-400">
                تعديل تسعيرة التوصيل، الحساب البنكي لشحن المديونيات، وتغيير الرقم السري للإدارة
              </p>
            </div>

            {/* A. ADMIN PASSWORD CHANGE CARD (Requirement 2 & Settings) */}
            <div className="bg-slate-900 rounded-3xl border border-red-900/40 p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-red-950 border border-red-800/80 text-red-400 flex items-center justify-center font-bold">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">تغيير وتعيين الرقم السري للإدارة</h3>
                    <p className="text-[11px] text-slate-400">
                      متاح حصرياً للرقمين المعتمدين: 01027760669 و 01008100546
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAdminPassFields(!showAdminPassFields)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition border border-slate-700"
                >
                  {showAdminPassFields ? 'إغلاق النفاذ' : 'تغيير الرقم السري الآن'}
                </button>
              </div>

              {showAdminPassFields && (
                <form onSubmit={handleChangeAdminPassword} className="space-y-3 pt-3 border-t border-slate-800 animate-fadeIn">
                  {passChangeStatus && (
                    <div
                      className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                        passChangeStatus.success
                          ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300'
                          : 'bg-rose-950/80 border border-rose-500/50 text-rose-300'
                      }`}
                    >
                      {passChangeStatus.success ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                      <span>{passChangeStatus.message}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Old Password */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        الرقم السري الحالي (إن وجد)
                      </label>
                      <input
                        type="password"
                        value={oldAdminPass}
                        onChange={(e) => setOldAdminPass(e.target.value)}
                        placeholder="••••••••"
                        dir="ltr"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono text-right"
                      />
                    </div>

                    {/* New Password */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        الرقم السري الجديد (Aa123456)
                      </label>
                      <input
                        type="password"
                        value={newAdminPass}
                        onChange={(e) => setNewAdminPass(e.target.value)}
                        required
                        placeholder="مثال: Aa123456"
                        dir="ltr"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono text-right focus:border-red-500"
                      />
                    </div>

                    {/* Confirm New Password */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        تأكيد الرقم السري الجديد
                      </label>
                      <input
                        type="password"
                        value={confirmNewAdminPass}
                        onChange={(e) => setConfirmNewAdminPass(e.target.value)}
                        required
                        placeholder="مثال: Aa123456"
                        dir="ltr"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono text-right focus:border-red-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <span className="text-[10px] text-slate-400">
                      الشروط: حرف كابيتال (A-Z) + حرف سمول (a-z) + 6 أرقام.
                    </span>

                    <button
                      type="submit"
                      disabled={isChangingPass}
                      className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-md shadow-red-950/40"
                    >
                      {isChangingPass ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                      <span>تحديث وحفظ الرقم السري للإدارة</span>
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* B. PRICING & OPERATIONS SETTINGS FORM */}
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Delivery Fee Settings */}
                <div className="bg-slate-900 rounded-3xl border border-slate-800 p-5 space-y-4 shadow-xl">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                    <DollarSign className="w-5 h-5 text-amber-400" />
                    <h3 className="font-black text-white text-sm">معادلة تسعير التوصيل (Delivery Pricing)</h3>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">رسوم فتح العداد / البداية (ج.م)</label>
                      <input
                        type="number"
                        value={settingsData.baseDeliveryFee}
                        onChange={(e) => setSettingsData({ ...settingsData, baseDeliveryFee: Number(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold mb-1">تسعيرة الكيلومتر (ج.م / كم)</label>
                      <input
                        type="number"
                        value={settingsData.feePerKm}
                        onChange={(e) => setSettingsData({ ...settingsData, feePerKm: Number(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold mb-1">الحد الأدنى لرسوم التوصيل (ج.م)</label>
                      <input
                        type="number"
                        value={settingsData.minDeliveryFee}
                        onChange={(e) => setSettingsData({ ...settingsData, minDeliveryFee: Number(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold mb-1">نسبة عمولة المنصة (%)</label>
                      <input
                        type="number"
                        value={settingsData.platformCommissionPercent}
                        onChange={(e) => setSettingsData({ ...settingsData, platformCommissionPercent: Number(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* Dispatch & Debt Management */}
                <div className="bg-slate-900 rounded-3xl border border-slate-800 p-5 space-y-4 shadow-xl">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                    <Sliders className="w-5 h-5 text-amber-400" />
                    <h3 className="font-black text-white text-sm">سياسات التحصيل والمديونيات والتوزيع</h3>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">
                        رقم الحساب البنكي لشحن مديونيات المناديب (رسمي)
                      </label>
                      <input
                        type="text"
                        value={settingsData.companyBankAccount || '7071009697713907'}
                        onChange={(e) => setSettingsData({ ...settingsData, companyBankAccount: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-amber-400 font-mono font-bold text-sm tracking-wider"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        يظهر لجميع المناديب في شاشة شحن الرصيد وسداد المديونية
                      </span>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold mb-1">الحد الأقصى الافتراضي لمديونية المندوب (ج.م)</label>
                      <input
                        type="number"
                        value={settingsData.driverMaxDebtLimit}
                        onChange={(e) => setSettingsData({ ...settingsData, driverMaxDebtLimit: Number(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold mb-1">نصف قطر البحث عن أقرب مندوب (كم)</label>
                      <input
                        type="number"
                        value={settingsData.dispatchRadiusKm}
                        onChange={(e) => setSettingsData({ ...settingsData, dispatchRadiusKm: Number(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="autoSuspend"
                        checked={settingsData.autoSuspendOverDebt}
                        onChange={(e) => setSettingsData({ ...settingsData, autoSuspendOverDebt: e.target.checked })}
                        className="w-4 h-4 rounded text-amber-500 focus:ring-0"
                      />
                      <label htmlFor="autoSuspend" className="text-slate-300 font-bold">
                        إيقاف المندوب تلقائياً عن استقبال الطلبات عند تجاوز المديونية
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow-xl shadow-amber-500/20 flex items-center gap-2"
                >
                  {isSavingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  <span>حفظ وتطبيق إعدادات المنصة</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 7. AUDIT LOGS */}
        {activeSection === 'audit' && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <h2 className="text-xl font-black text-white">سجل التدقيق الإداري والمالي (Audit Logs)</h2>
              <p className="text-xs text-slate-400">
                تسجيل كافة التغييرات على الحالات، المدفوعات، واعتمادات المناديب مع توثيق الفاعل والتاريخ
              </p>
            </div>

            <div className="bg-slate-900 rounded-3xl border border-slate-800 p-4 overflow-x-auto shadow-xl">
              <table className="w-full text-xs text-right">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold">
                    <th className="py-2.5 px-3">التاريخ والوقت</th>
                    <th className="py-2.5 px-3">الفاعل (Actor)</th>
                    <th className="py-2.5 px-3">الحدث (Action)</th>
                    <th className="py-2.5 px-3">الجهة المستهدفة</th>
                    <th className="py-2.5 px-3">التفاصيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-mono text-slate-400 whitespace-nowrap">{log.timestamp}</td>
                      <td className="py-2.5 px-3 text-white font-medium">
                        {log.actorName} ({log.actorRole})
                      </td>
                      <td className="py-2.5 px-3 font-mono text-amber-400">{log.action}</td>
                      <td className="py-2.5 px-3 text-slate-300">{log.entityType} #{log.entityId}</td>
                      <td className="py-2.5 px-3 text-slate-200">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 8. OTHER SECTIONS (Support / Debts / Merchants / Reports) */}
        {(activeSection === 'support' || activeSection === 'debts' || activeSection === 'merchants' || activeSection === 'reports') && (
          <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 space-y-4 shadow-xl">
            <h3 className="font-black text-white text-base">
              {activeSection === 'support'
                ? 'تذاكر الدعم الفني المفتوحة'
                : activeSection === 'debts'
                ? 'متابعة مديونيات المناديب والتسويات'
                : activeSection === 'merchants'
                ? 'قائمة المتاجر المعتمدة'
                : 'التقارير المالية المجمعة'}
            </h3>

            {activeSection === 'support' && (
              <div className="space-y-3">
                {tickets.length === 0 ? (
                  <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800 text-slate-400 space-y-1">
                    <Headphones className="w-8 h-8 mx-auto text-slate-600 opacity-50 mb-2" />
                    <p className="font-bold text-white text-sm">لا توجد أي تذاكر دعم فني مفتوحة حالياً (0 تذاكر)</p>
                    <p className="text-xs text-slate-500">كافة العمليات والطلبات تسير بانتظام بدون بلاغات</p>
                  </div>
                ) : (
                  tickets.map((t) => (
                    <div key={t.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-amber-400 font-bold">{t.ticketNumber}</span>
                            <span className="text-white font-bold">{t.userName} ({t.userRole})</span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">{t.subject} - {t.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSummarizeTicket(t)}
                            disabled={summarizingTicketId === t.id}
                            className="px-2.5 py-1 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            title="تلخيص ذكي للمشكلة (لوحة الإدارة فقط)"
                          >
                            {summarizingTicketId === t.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                            )}
                            <span>تلخيص المشكلة</span>
                          </button>
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-950 text-amber-400 border border-amber-800">
                            {t.status}
                          </span>
                        </div>
                      </div>

                      {ticketSummaries[t.id] && (
                        <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-800/40 text-xs text-purple-200 leading-relaxed flex items-start gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-white block mb-0.5">الملخص الإداري للمشكلة:</span>
                            <span>{ticketSummaries[t.id]}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {activeSection === 'debts' && (
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-200">
                  المناديب الذين تجاوزوا حد المديونية يتم إيقافهم تلقائياً ولا يمكنهم استقبال طلبات حتى سداد المبلغ عبر الحساب البنكي 7071009697713907 أو InstaPay.
                </div>
                {drivers.map((d) => (
                  <div key={d.id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <h4 className="font-bold text-white">{d.name}</h4>
                      <span className="text-slate-400">الحد المصرح: {d.maxDebtLimit} ج.م</span>
                    </div>
                    <div className="text-left">
                      <span className={`text-base font-black ${d.debt > d.maxDebtLimit ? 'text-rose-400' : 'text-amber-400'}`}>
                        {d.debt} ج.م
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeSection === 'merchants' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {merchants.map((m) => (
                  <div key={m.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                    <img src={m.logo} alt={m.name} className="w-12 h-12 rounded-xl object-cover" />
                    <div>
                      <h4 className="font-bold text-white text-xs">{m.name}</h4>
                      <span className="text-slate-400 text-[11px]">{m.category} • عمولة {m.commissionRate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeSection === 'reports' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">
                  يمكنك تصدير تقارير المبيعات، عمولات المنصة، وأرباح المناديب بصيغة CSV جاهزة للتحليل المالي.
                </p>
                <button
                  onClick={handleExportCSV}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition flex items-center gap-2 shadow-lg shadow-amber-500/20"
                >
                  <Download className="w-4 h-4" />
                  <span>تصدير ملف Excel / CSV بالكامل</span>
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* REJECTION REASON MODAL DIALOG */}
      {rejectModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-rose-900/60 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-950 border border-rose-700 flex items-center justify-center font-bold">
                <X className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="font-black text-white text-sm">رفض طلب: {rejectModalTarget.name}</h3>
                <p className="text-[11px] text-slate-400">يرجى كتابة سبب الرفض لإبلاغ المتقدم وتوثيقه في السجل</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">سبب الرفض:</label>
              <textarea
                value={rejectReasonInput}
                onChange={(e) => setRejectReasonInput(e.target.value)}
                rows={3}
                placeholder="مثال: صورة بطاقة الرقم القومي غير واضحة، أو البيانات غير متطابقة..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500 text-right leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                style={{ backgroundColor: '#ef4444' }}
                className="px-5 py-2 rounded-xl text-white text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-rose-950/40 hover:brightness-110 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>تأكيد الرفض</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NATIONAL ID PREVIEW MODAL */}
      {previewIdImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">بطاقة الرقم القومي: {previewIdImage.title}</h3>
              <button
                onClick={() => setPreviewIdImage(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <img
              src={previewIdImage.url}
              alt="National ID"
              className="w-full rounded-2xl object-contain max-h-[60vh] bg-slate-950 border border-slate-800"
            />
            <div className="text-center">
              <button
                onClick={() => setPreviewIdImage(null)}
                className="px-6 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-white font-bold transition"
              >
                إغلاق المعاينة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRIVER INSPECTION & APPROVAL MODAL */}
      {selectedDriverForInspect && (
        <DriverInspectionModal
          driver={selectedDriverForInspect}
          onClose={() => setSelectedDriverForInspect(null)}
          onRefresh={loadAllAdminData}
        />
      )}
    </div>
  );
};
