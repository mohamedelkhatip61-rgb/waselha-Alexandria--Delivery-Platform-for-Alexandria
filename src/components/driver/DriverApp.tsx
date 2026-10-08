import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api.ts';
import {
  DriverProfile,
  Order,
  DriverLedgerTransaction,
  DriverStatus,
  LocationCoordinates
} from '../../types/index.ts';
import { LiveDeliveryMap } from '../maps/LiveDeliveryMap.tsx';
import { DriverWalletModal } from './DriverWalletModal.tsx';
import { ChatPanel } from '../chat/ChatPanel.tsx';
import { SupportCenter } from '../support/SupportCenter.tsx';
import {
  Power,
  Navigation,
  Phone,
  MessageSquare,
  AlertTriangle,
  Wallet,
  CheckCircle2,
  Camera,
  MapPin,
  Clock,
  ShieldCheck,
  Send,
  Loader2,
  Upload,
  UserCheck,
  CreditCard,
  XCircle,
  FileText,
  Truck,
  Plus
} from 'lucide-react';

export const DriverApp: React.FC = () => {
  const [allDrivers, setAllDrivers] = useState<DriverProfile[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [incomingOffer, setIncomingOffer] = useState<Order | null>(null);
  const [countdown, setCountdown] = useState<number>(45);
  const [ledgerTransactions, setLedgerTransactions] = useState<DriverLedgerTransaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Modals
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Registration Form State
  const [regForm, setRegForm] = useState({
    name: '',
    phone: '',
    governorate: 'الإسكندرية',
    area: 'سيدي جابر وسموحة',
    vehicleType: 'motorcycle' as any,
    plateNumber: '',
    model: '',
    color: '',
    nationalIdPhoto: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80',
    licensePhoto: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80',
    vehicleLicensePhoto: 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600&auto=format&fit=crop&q=80',
    selfiePhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80',
  });

  // Load Driver profile and list of drivers
  const fetchDriverData = async () => {
    try {
      const driversRes = await api.getDrivers();
      const driverList = driversRes.data || [];
      setAllDrivers(driverList);

      let targetId = selectedDriverId;
      if (!targetId && driverList.length > 0) {
        targetId = driverList[0].id;
        setSelectedDriverId(targetId);
      }

      if (targetId) {
        const res = await api.getDriverDetails(targetId);
        if (res.driver) {
          setDriver(res.driver);
          setLedgerTransactions(res.ledger || []);

          // Fetch active order
          if (res.driver.activeOrderId) {
            const ordRes = await api.getOrder(res.driver.activeOrderId);
            if (ordRes.data && !['Delivered', 'Cancelled'].includes(ordRes.data.status)) {
              setActiveOrder(ordRes.data);
            } else {
              setActiveOrder(null);
            }
          } else {
            setActiveOrder(null);
          }

          // Check for incoming orders waiting for driver
          if (res.driver.isOnline && res.driver.status === 'Approved' && !res.driver.activeOrderId) {
            const waitingOrders = await api.getOrders({ status: 'Searching for Driver' });
            if (waitingOrders.data && waitingOrders.data.length > 0 && !incomingOffer) {
              setIncomingOffer(waitingOrders.data[0]);
              setCountdown(45);
            }
          }
        } else {
          setDriver(null);
        }
      } else {
        setDriver(null);
        setActiveOrder(null);
      }
    } catch (err) {
      console.error('Error fetching driver:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDriverData();
    const interval = setInterval(fetchDriverData, 4000);
    return () => clearInterval(interval);
  }, [selectedDriverId]);

  // Countdown timer for incoming order offer
  useEffect(() => {
    if (!incomingOffer) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setIncomingOffer(null);
          return 45;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [incomingOffer]);

  // Driver Online Toggle
  const handleToggleOnline = async () => {
    if (!driver) return;
    try {
      const res = await api.toggleDriverOnline(driver.id);
      if (res.success) {
        setDriver({ ...driver, isOnline: res.isOnline });
      }
    } catch (err: any) {
      alert(err.message || 'فشل تغيير حالة الاتصال');
    }
  };

  // Accept incoming offer
  const handleAcceptOrder = async () => {
    if (!driver || !incomingOffer) return;
    try {
      const res = await api.updateOrderStatus(incomingOffer.id, {
        status: 'Driver Assigned',
        driverId: driver.id,
        note: `تم قبول الطلب بواسطة الكابتن ${driver.name}`,
      });
      if (res.data) {
        setActiveOrder(res.data);
        setIncomingOffer(null);
        await fetchDriverData();
      }
    } catch (err: any) {
      alert(err.message || 'فشل قبول الطلب');
      setIncomingOffer(null);
    }
  };

  // Reject incoming offer
  const handleRejectOffer = () => {
    setIncomingOffer(null);
  };

  // Advance Order Lifecycle Step
  const handleStepOrder = async (nextStatus: any, proofUrl?: string) => {
    if (!activeOrder) return;
    setIsUpdatingStatus(true);
    try {
      const res = await api.updateOrderStatus(activeOrder.id, {
        status: nextStatus,
        driverId: driver?.id,
        proofUrl: proofUrl,
        note: `تم تحديث الحالة بواسطة المندوب: ${nextStatus}`,
      });

      if (res.data) {
        if (nextStatus === 'Delivered') {
          alert(`تم تسليم الطلب بنجاح! تم قيد أجر التوصيل لحسابك.`);
          setActiveOrder(null);
        } else {
          setActiveOrder(res.data);
        }
        await fetchDriverData();
      }
    } catch (err: any) {
      alert(err.message || 'فشل تحديث حالة الطلب');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Simulate Real-time GPS movement in Alexandria
  const handleSimulateGPSMove = async () => {
    if (!driver) return;
    const alexSpots = [
      { lat: 31.2178, lng: 29.9475, addressName: 'سيدي جابر - شارع المشير' },
      { lat: 31.2162, lng: 29.9540, addressName: 'سموحة - ميدان فيكتور عمانويل' },
      { lat: 31.2425, lng: 29.9710, addressName: 'لوران - طريق الكورنيش' },
      { lat: 31.2005, lng: 29.8992, addressName: 'محطة الرمل - ميدان سعد زغلول' },
      { lat: 31.2588, lng: 29.9984, addressName: 'ميامي - شارع خالد بن الوليد' },
    ];
    const nextSpot = alexSpots[Math.floor(Math.random() * alexSpots.length)];
    const newCoords: LocationCoordinates = {
      lat: nextSpot.lat + (Math.random() - 0.5) * 0.003,
      lng: nextSpot.lng + (Math.random() - 0.5) * 0.003,
      addressName: nextSpot.addressName,
    };
    await api.updateDriverLocation(driver.id, newCoords);
    await fetchDriverData();
  };

  // Handle Driver Registration Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regForm.name || !regForm.phone) {
      alert('يرجى إدخال الاسم ورقم الهاتف');
      return;
    }
    try {
      const res = await api.registerDriver(regForm);
      alert('تم إرسال طلب الانضمام والمستندات بنجاح! حسابك الآن بانتظار مراجعة واعتماد الإدارة.');
      setSelectedDriverId(res.data.id);
      setShowRegisterForm(false);
      setRegForm({
        name: '',
        phone: '',
        governorate: 'الإسكندرية',
        area: 'سيدي جابر وسموحة',
        vehicleType: 'motorcycle' as any,
        plateNumber: '',
        model: '',
        color: '',
        nationalIdPhoto: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80',
        licensePhoto: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80',
        vehicleLicensePhoto: 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600&auto=format&fit=crop&q=80',
        selfiePhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80',
      });
      await fetchDriverData();
    } catch (err: any) {
      alert(err.message || 'فشل التسجيل');
    }
  };

  // Registration Modal JSX
  const renderRegisterModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[90vh] space-y-4 text-right" dir="rtl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-black text-white text-lg">تسجيل مندوب جديد (كابتن توصيل الإسكندرية)</h3>
            <p className="text-xs text-slate-400">يلزم رفع المستندات الرسمية للاعتماد من إدارة وصلها اسكندرية</p>
          </div>
          <button onClick={() => setShowRegisterForm(false)} className="text-slate-400 hover:text-white p-2">
            ✕
          </button>
        </div>

        <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1">الاسم بالكامل</label>
              <input
                type="text"
                placeholder="أدخل اسمك بالكامل"
                value={regForm.name}
                onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1">رقم الهاتف (مصر)</label>
              <input
                type="tel"
                placeholder="010xxxxxxxx"
                value={regForm.phone}
                onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1">المحافظة</label>
              <input
                type="text"
                value="الإسكندرية"
                readOnly
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-amber-400 font-bold cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1">منطقة العمل المعتادة</label>
              <input
                type="text"
                placeholder="مثال: سموحة، سيدي جابر، الكورنيش، محطة الرمل"
                value={regForm.area}
                onChange={(e) => setRegForm({ ...regForm, area: e.target.value })}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1">نوع المركبة</label>
              <select
                value={regForm.vehicleType}
                onChange={(e) => setRegForm({ ...regForm, vehicleType: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              >
                <option value="motorcycle">دراجة نارية / بايك</option>
                <option value="car">سيارة</option>
                <option value="bicycle">عجلة / دراجة هوائية</option>
                <option value="van">فان بضائع</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1">رقم اللوحة المعدنية</label>
              <input
                type="text"
                placeholder="مثال: س ك ن 1928"
                value={regForm.plateNumber}
                onChange={(e) => setRegForm({ ...regForm, plateNumber: e.target.value })}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1">موديل المركبة</label>
              <input
                type="text"
                placeholder="مثال: Haojue 150 / Dayun / فيات"
                value={regForm.model}
                onChange={(e) => setRegForm({ ...regForm, model: e.target.value })}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1">لون المركبة</label>
              <input
                type="text"
                placeholder="مثال: أسود / أحمر / أبيض"
                value={regForm.color}
                onChange={(e) => setRegForm({ ...regForm, color: e.target.value })}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>
          </div>

          {/* Upload Previews */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <span className="font-bold text-slate-200 block">المستندات الرسمية المرفقة (جاهزة للإرسال):</span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>صورة بطاقة الرقم القومي</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>رخصة القيادة سارية</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>رخصة المركبة وتصريح المرور</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>صورة شخصية حديثة للكابتن</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition shadow-lg shadow-amber-500/20"
          >
            إرسال المستندات وطلب الانضمام للاعتماد من الإدارة
          </button>
        </form>
      </div>
    </div>
  );

  // EMPTY STATE 1: No drivers registered yet
  if (!isLoading && allDrivers.length === 0) {
    return (
      <div className="w-full max-w-2xl mx-auto py-16 px-6 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-slate-900 border border-slate-800 text-amber-400 flex items-center justify-center mx-auto shadow-2xl">
          <Truck className="w-10 h-10 opacity-70" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white">لم يتم تسجيل أي مندوب بعد</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            قاعدة بيانات المناديب نظيفة وجاهزة. يمكنك الآن تسجيل أول كابتن توصيل في محافظة الإسكندرية ورفع مستنداته ليتم مراجعته واعتماده من لوحة الإدارة.
          </p>
        </div>

        <button
          onClick={() => setShowRegisterForm(true)}
          className="px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition shadow-xl shadow-amber-500/20 inline-flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          <span>تسجيل مندوب جديد ورفع المستندات</span>
        </button>

        {showRegisterForm && renderRegisterModal()}
      </div>
    );
  }

  // Loading state
  if (isLoading || !driver) {
    return (
      <div className="py-20 text-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-amber-500" />
        <p>جاري تحميل تطبيق المندوب...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5 pb-20">
      {/* Driver Identity Switcher & Top Bar */}
      <div className="bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5 w-full sm:w-auto">
          <div className="relative">
            <img
              src={driver.avatar}
              alt={driver.name}
              className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-700 shadow-md"
            />
            <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 ${
              driver.isOnline ? 'bg-emerald-500 animate-ping' : 'bg-slate-600'
            }`} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-black text-white text-base">كابتن {driver.name}</h2>
              <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                driver.status === 'Approved'
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                  : driver.status === 'Pending Review'
                  ? 'bg-amber-950 text-amber-400 border-amber-800'
                  : 'bg-rose-950 text-rose-400 border-rose-800'
              }`}>
                {driver.status === 'Approved' ? 'معتمد' : driver.status === 'Pending Review' ? 'قيد المراجعة' : driver.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {driver.vehicle.model} • <span className="font-mono text-amber-400">{driver.vehicle.plateNumber}</span> • ★ {driver.rating}
            </p>
          </div>
        </div>

        {/* Real Driver Switcher & Register Button */}
        <div className="flex items-center gap-2 text-xs w-full sm:w-auto justify-end">
          {allDrivers.length > 1 && (
            <select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-slate-200 text-xs font-bold focus:outline-none focus:border-amber-500"
            >
              {allDrivers.map((d) => (
                <option key={d.id} value={d.id}>
                  كابتن {d.name} ({d.status})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => setShowRegisterForm(true)}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold transition flex items-center gap-1.5"
            title="تسجيل مندوب جديد بمستندات"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>تسجيل مندوب جديد</span>
          </button>
        </div>
      </div>

      {/* CASE 1: PENDING REVIEW OR REJECTED BANNER */}
      {driver.status === 'Pending Review' && (
        <div className="p-5 rounded-3xl bg-amber-950/70 border border-amber-500/50 text-amber-200 space-y-2">
          <div className="flex items-center gap-2.5 font-bold text-white text-base">
            <Clock className="w-5 h-5 text-amber-400" />
            <span>حسابك قيد المراجعة والتدقيق من إدارة وصلها اسكندرية</span>
          </div>
          <p className="text-xs leading-relaxed text-amber-200/90">
            تم استلام المستندات وصورة البطاقة والرخص بنجاح. تقوم الإدارة بمراجعة المستندات وتفعيل الحساب من لوحة الإدارة لتبدأ استقبال طلبات التوصيل.
          </p>
        </div>
      )}

      {/* CASE 2: SUSPENDED / OVER DEBT LIMIT BANNER */}
      {driver.status === 'Suspended' && (
        <div className="p-5 rounded-3xl bg-rose-950/80 border-2 border-rose-500/60 text-rose-200 space-y-3 shadow-xl">
          <div className="flex items-center gap-2.5 font-black text-white text-base">
            <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0" />
            <span>حسابك موقوف: تجاوز الحد الأقصى للمديونية!</span>
          </div>
          <p className="text-xs leading-relaxed text-rose-200">
            مديونيتك الحالية هي <strong className="text-white text-sm">{driver.debt} ج.م</strong>، بينما الحد الأقصى المصرح به هو <strong className="text-white text-sm">{driver.maxDebtLimit} ج.م</strong>.
            تم إيقاف استقبال الطلبات آلياً. يرجى سداد المديونية بالتحويل على الحساب البنكي <strong>7071009697713907</strong> لإعادة تفعيل الحساب فوراً.
          </p>
          <button
            onClick={() => setShowWalletModal(true)}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black transition flex items-center gap-2 shadow-lg shadow-rose-900/40"
          >
            <Wallet className="w-4 h-4" />
            <span>سداد المديونية على الحساب 7071009697713907 / فيزا</span>
          </button>
        </div>
      )}

      {/* STATUS TOGGLE & METRICS BAR (If Approved) */}
      {driver.status === 'Approved' && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Online Toggle */}
          <div className={`p-4 rounded-3xl border flex items-center justify-between transition ${
            driver.isOnline
              ? 'bg-emerald-950/50 border-emerald-500/50 text-white shadow-lg shadow-emerald-950/30'
              : 'bg-slate-900 border-slate-800 text-slate-400'
          }`}>
            <div>
              <span className="text-xs font-medium block">حالة العمل</span>
              <span className={`text-base font-black ${driver.isOnline ? 'text-emerald-400' : 'text-slate-400'}`}>
                {driver.isOnline ? 'متاح للطلبات (Online)' : 'غير متصل (Offline)'}
              </span>
            </div>
            <button
              onClick={handleToggleOnline}
              className={`p-3 rounded-2xl transition shadow-md ${
                driver.isOnline
                  ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Power className="w-5 h-5" />
            </button>
          </div>

          {/* Wallet Card */}
          <div
            onClick={() => setShowWalletModal(true)}
            className="p-4 rounded-3xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 cursor-pointer transition flex items-center justify-between group shadow-lg"
          >
            <div>
              <span className="text-xs text-slate-400 font-medium">المديونية / المحفظة</span>
              <p className={`text-xl font-black mt-0.5 ${driver.debt > 0 ? 'text-amber-400' : 'text-white'}`}>
                {driver.debt} <span className="text-xs font-normal text-slate-400">ج.م مديونية</span>
              </p>
              <span className="text-[11px] text-slate-500 block">سقف المديونية: {driver.maxDebtLimit} ج.م</span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition">
              <Wallet className="w-5 h-5" />
            </div>
          </div>

          {/* Earnings Card */}
          <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-lg">
            <div>
              <span className="text-xs text-slate-400 font-medium">أرباح اليوم</span>
              <p className="text-xl font-black text-emerald-400 mt-0.5">
                {driver.totalEarnings} <span className="text-xs font-normal text-slate-400">ج.م</span>
              </p>
              <span className="text-[11px] text-slate-500 block">{driver.totalOrdersCompleted} طلب مكتمل</span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          {/* GPS Broadcast Simulation */}
          <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">بث GPS الإسكندرية</span>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800">
                مباشر
              </span>
            </div>
            <button
              onClick={handleSimulateGPSMove}
              className="mt-2 py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-700"
            >
              <Navigation className="w-3.5 h-3.5 text-amber-400" />
              <span>محاكاة تحرك بالمركبة</span>
            </button>
          </div>
        </div>
      )}

      {/* POPUP: INCOMING DISPATCH ORDER OFFER WITH COUNTDOWN */}
      {incomingOffer && (
        <div className="bg-gradient-to-br from-amber-950/90 to-slate-950 rounded-3xl p-6 border-2 border-amber-500 shadow-2xl space-y-4 animate-bounce-short">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xl shadow-lg shadow-amber-500/30">
                ⚡
              </div>
              <div>
                <h3 className="font-black text-white text-lg">
                  طلب توصيل جديد في منطقتك!
                </h3>
                <p className="text-xs text-amber-200">
                  {incomingOffer.merchantName} ➔ {incomingOffer.deliveryAddress.address}
                </p>
              </div>
            </div>

            {/* Countdown Badge */}
            <div className="w-14 h-14 rounded-2xl bg-slate-950 border-2 border-amber-500 text-amber-400 flex flex-col items-center justify-center">
              <span className="text-lg font-black leading-none">{countdown}</span>
              <span className="text-[9px] font-bold">ثانية</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 bg-slate-950/80 p-3.5 rounded-2xl text-xs border border-amber-500/30">
            <div>
              <span className="text-slate-400">أجرك الصافي:</span>
              <p className="font-black text-emerald-400 text-base">{incomingOffer.driverEarnings} ج.م</p>
            </div>
            <div>
              <span className="text-slate-400">المسافة الكلية:</span>
              <p className="font-bold text-white text-sm">{incomingOffer.distanceKm} كم</p>
            </div>
            <div>
              <span className="text-slate-400">طريقة التحصيل:</span>
              <p className="font-bold text-amber-400 text-sm">
                {incomingOffer.paymentMethod === 'cash_on_delivery' ? 'كاش من العميل' : 'مدفوع إلكترونياً'}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleRejectOffer}
              className="flex-1 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-sm border border-slate-700 transition"
            >
              رفض وتمرير للمندوب التالي
            </button>
            <button
              onClick={handleAcceptOrder}
              className="flex-1 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/30 transition flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>قبول الطلب فوراً</span>
            </button>
          </div>
        </div>
      )}

      {/* ACTIVE ORDER EXECUTION WORKBENCH */}
      {activeOrder ? (
        <div className="bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-2xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                  {activeOrder.orderNumber}
                </span>
                <h3 className="font-black text-white text-base">مهمة توصيل جارية</h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                المتجر: <strong className="text-white">{activeOrder.merchantName}</strong> ➔ العميل: <strong className="text-white">{activeOrder.customerName}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowChatModal(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition flex items-center gap-1.5 border border-slate-700"
              >
                <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                <span>شات العميل</span>
              </button>
              <button
                onClick={() => setShowSupportModal(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition border border-slate-700"
              >
                الدعم الفني
              </button>
            </div>
          </div>

          {/* Interactive Delivery GPS Map */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1 font-bold text-white">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>المسار الحي على خريطة الإسكندرية (المتجر ➔ العميل)</span>
              </span>
              <span className="font-mono text-amber-400 font-bold">{activeOrder.distanceKm} كم • تسعيرة: 15 ج.م + (3 ج.م/كم)</span>
            </div>
            <LiveDeliveryMap
              heightClass="h-72"
              driverLocation={driver.currentLocation}
              storeLocation={activeOrder.merchantAddress?.coordinates}
              customerLocation={activeOrder.deliveryAddress?.coordinates}
              driverName={driver.name}
              storeName={activeOrder.merchantName}
              customerAddress={activeOrder.deliveryAddress?.address}
            />
          </div>

          {/* Action Workflow Buttons */}
          <div className="pt-2 border-t border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-300">
              تحديث مسار الطلب وإثبات التسليم:
            </h4>

            <div className="flex flex-wrap gap-2.5">
              {activeOrder.status === 'Driver Assigned' && (
                <button
                  onClick={() => handleStepOrder('Driver Arrived')}
                  disabled={isUpdatingStatus}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition flex items-center gap-2 shadow-lg"
                >
                  <MapPin className="w-4 h-4" />
                  <span>وصلت إلى المتجر (Driver Arrived)</span>
                </button>
              )}

              {activeOrder.status === 'Driver Arrived' && (
                <button
                  onClick={() => handleStepOrder('Picked Up', 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600&auto=format&fit=crop&q=80')}
                  disabled={isUpdatingStatus}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition flex items-center gap-2 shadow-lg"
                >
                  <Camera className="w-4 h-4" />
                  <span>إثبات استلام الطلب من المتجر (Picked Up)</span>
                </button>
              )}

              {activeOrder.status === 'Picked Up' && (
                <button
                  onClick={() => handleStepOrder('On The Way')}
                  disabled={isUpdatingStatus}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition flex items-center gap-2 shadow-lg shadow-amber-500/20"
                >
                  <Navigation className="w-4 h-4" />
                  <span>بدء التحرك للعميل (On The Way)</span>
                </button>
              )}

              {activeOrder.status === 'On The Way' && (
                <button
                  onClick={() => handleStepOrder('Delivered', 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600&auto=format&fit=crop&q=80')}
                  disabled={isUpdatingStatus}
                  className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm transition flex items-center gap-2 shadow-xl shadow-emerald-700/30"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>
                    إثبات تسليم الطلب وتحصيل {activeOrder.paymentMethod === 'cash_on_delivery' ? `${activeOrder.total} ج.م كاش` : 'إلكتروني'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Standby Radar when no active order */
        <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto animate-pulse">
            <Clock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="font-black text-white text-xl">
              لا يوجد طلبات حالياً في انتظار أول طلب
            </h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
              {driver.isOnline
                ? 'رادار التوصيل متصل بمحافظة الإسكندرية وجاهز لاستقبال أول طلب حقيقي وتوجيهه إليك فوراً بحساب: 15 ج.م فتح عداد + 3 ج.م لكل كيلومتر.'
                : 'أنت غير متصل حالياً (Offline). قم بتشغيل زر الاتصال أعلاه لتلقي أول طلب فور إنشائه من العميل.'}
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-950 border border-slate-800 text-xs text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>نظام الإسناد الفوري لمحافظة الإسكندرية قيد الانتظار</span>
          </div>
        </div>
      )}

      {/* REGISTRATION MODAL */}
      {showRegisterForm && renderRegisterModal()}

      {/* WALLET & DEBT MODAL */}
      {showWalletModal && driver && (
        <DriverWalletModal
          driver={driver}
          ledgerTransactions={ledgerTransactions}
          onClose={() => setShowWalletModal(false)}
          onRefresh={fetchDriverData}
        />
      )}

      {/* CHAT MODAL */}
      {showChatModal && activeOrder && driver && (
        <ChatPanel
          orderId={activeOrder.orderNumber}
          roomId={`chat_${activeOrder.id}`}
          currentUserId={driver.id}
          currentUserName={driver.name}
          currentUserRole="Driver"
          counterpartName={activeOrder.customerName}
          counterpartRoleTitle="العميل"
          counterpartPhone={activeOrder.customerPhone}
          onClose={() => setShowChatModal(false)}
        />
      )}

      {/* SUPPORT MODAL */}
      {showSupportModal && driver && (
        <SupportCenter
          currentUserId={driver.id}
          currentUserName={driver.name}
          currentUserRole="Driver"
          currentUserPhone={driver.phone}
          onClose={() => setShowSupportModal(false)}
        />
      )}
    </div>
  );
};
