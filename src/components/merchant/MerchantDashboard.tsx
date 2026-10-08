import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api.ts';
import {
  MerchantProfile,
  MerchantProduct,
  Order,
  OrderStatus
} from '../../types/index.ts';
import { SupportCenter } from '../support/SupportCenter.tsx';
import {
  Store,
  Clock,
  PlusCircle,
  Package,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertCircle,
  DollarSign,
  UtensilsCrossed,
  Sliders,
  Power,
  Loader2,
  Edit,
  Plus
} from 'lucide-react';

export const MerchantDashboard: React.FC = () => {
  const [allMerchants, setAllMerchants] = useState<MerchantProfile[]>([]);
  const [selectedMerchantId, setSelectedMerchantId] = useState<string>('');
  const [merchant, setMerchant] = useState<MerchantProfile | null>(null);
  const [products, setProducts] = useState<MerchantProduct[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'analytics'>('orders');
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showAddStoreModal, setShowAddStoreModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // New store registration form
  const [newStore, setNewStore] = useState({
    name: '',
    category: 'مطاعم',
    phone: '',
    address: '',
  });

  // New product form
  const [newProd, setNewProd] = useState({
    name: '',
    description: '',
    price: 50,
    category: 'أطباق رئيسية',
    stock: 50,
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80',
  });

  const loadMerchantData = async () => {
    try {
      const merchantsRes = await api.getMerchants();
      const mList = merchantsRes.data || [];
      setAllMerchants(mList);

      let targetId = selectedMerchantId;
      if (!targetId && mList.length > 0) {
        targetId = mList[0].id;
        setSelectedMerchantId(targetId);
      }

      if (targetId) {
        const res = await api.getMerchantDetails(targetId);
        if (res.merchant) setMerchant(res.merchant);
        if (res.products) setProducts(res.products);

        const resO = await api.getOrders({ merchantId: targetId });
        if (resO.data) setOrders(resO.data);
      } else {
        setMerchant(null);
        setProducts([]);
        setOrders([]);
      }
    } catch (err) {
      console.error('Error loading merchant:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMerchantData();
    const interval = setInterval(loadMerchantData, 4000);
    return () => clearInterval(interval);
  }, [selectedMerchantId]);

  // Handle Order Status advancement by Merchant
  const handleUpdateOrderStatus = async (orderId: string, nextStatus: OrderStatus) => {
    try {
      await api.updateOrderStatus(orderId, {
        status: nextStatus,
        note: `تم تحديث حالة الطلب من قبل المتجر إلى: ${nextStatus}`,
      });
      await loadMerchantData();
    } catch (err: any) {
      alert(err.message || 'فشل تحديث حالة الطلب');
    }
  };

  // Toggle Product Availability
  const handleToggleProduct = async (prodId: string, currentStatus: boolean) => {
    try {
      await api.updateProduct(prodId, { isAvailable: !currentStatus });
      await loadMerchantData();
    } catch (err) {
      console.error('Error toggling product:', err);
    }
  };

  // Add Product
  const handleAddProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProd.name || !newProd.price || !selectedMerchantId) return;
    try {
      await api.addProduct(selectedMerchantId, newProd);
      setShowAddProductModal(false);
      setNewProd({
        name: '',
        description: '',
        price: 50,
        category: 'أطباق رئيسية',
        stock: 50,
        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80',
      });
      await loadMerchantData();
    } catch (err: any) {
      alert(err.message || 'فشل إضافة الصنف');
    }
  };

  // Add Store Submit
  const handleAddStoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStore.name) {
      alert('يرجى إدخال اسم المتجر');
      return;
    }
    try {
      const res = await api.registerMerchant(newStore);
      if (res.data) {
        alert('تم تسجيل المتجر بنجاح!');
        setSelectedMerchantId(res.data.id);
        setShowAddStoreModal(false);
        setNewStore({ name: '', category: 'مطاعم', phone: '', address: '' });
        await loadMerchantData();
      }
    } catch (err: any) {
      alert(err.message || 'فشل تسجيل المتجر');
    }
  };

  // EMPTY STATE: No merchants registered
  if (!isLoading && allMerchants.length === 0) {
    return (
      <div className="w-full max-w-2xl mx-auto py-16 px-6 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-slate-900 border border-slate-800 text-amber-400 flex items-center justify-center mx-auto shadow-2xl">
          <Store className="w-10 h-10 opacity-70" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white">لم يتم تسجيل أي متجر أو تاجر بعد</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            قاعدة البيانات نظيفة. يمكنك تسجيل أول متجر أو مطعم في محافظة الإسكندرية لإدارة المنتجات واستقبال الطلبات فوراً.
          </p>
        </div>

        <button
          onClick={() => setShowAddStoreModal(true)}
          className="px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition shadow-xl shadow-amber-500/20 inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>تسجيل متجر جديد الآن</span>
        </button>

        {showAddStoreModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn text-right" dir="rtl">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-black text-white text-base">تسجيل متجر / مطعم بالإسكندرية</h3>
                <button onClick={() => setShowAddStoreModal(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>
              <form onSubmit={handleAddStoreSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">اسم المتجر / المطعم</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: مطعم بلبع / صيدلية خليل"
                    value={newStore.name}
                    onChange={(e) => setNewStore({ ...newStore, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">التصنيف</label>
                  <select
                    value={newStore.category}
                    onChange={(e) => setNewStore({ ...newStore, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  >
                    <option value="مطاعم">مطاعم</option>
                    <option value="حلويات ومخابز">حلويات ومخابز</option>
                    <option value="صيدليات">صيدليات</option>
                    <option value="سوبرماركت">سوبرماركت</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">العنوان بالإسكندرية</label>
                  <input
                    type="text"
                    placeholder="مثال: طريق الجيش، كورنيش سيدي جابر"
                    value={newStore.address}
                    onChange={(e) => setNewStore({ ...newStore, address: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">رقم الهاتف للتواصل</label>
                  <input
                    type="tel"
                    placeholder="010xxxxxxxx"
                    value={newStore.phone}
                    onChange={(e) => setNewStore({ ...newStore, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow-lg shadow-amber-500/20"
                >
                  تأكيد تسجيل المتجر
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (isLoading || !merchant) {
    return (
      <div className="py-20 text-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-amber-500" />
        <p>جاري تحميل لوحة تحكم المتجر...</p>
      </div>
    );
  }

  const liveOrders = orders.filter((o) => !['Delivered', 'Cancelled'].includes(o.status));
  const pastOrders = orders.filter((o) => ['Delivered', 'Cancelled'].includes(o.status));
  const totalMerchantRevenue = orders
    .filter((o) => o.status === 'Delivered')
    .reduce((sum, o) => sum + (o.subtotal - o.platformCommission), 0);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-20 text-right" dir="rtl">
      {/* Top Banner & Store Selector */}
      <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <img
            src={merchant.logo}
            alt={merchant.name}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-700 shadow-md"
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-black text-white text-lg">{merchant.name}</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                {merchant.isOpen ? 'مستعد لاستقبال الطلبات' : 'مغلق مؤقتاً'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {merchant.category} • {merchant.address} • نسبة عمولة المنصة: {merchant.commissionRate}%
            </p>
          </div>
        </div>

        {/* Real Store Switcher & New Store Button */}
        <div className="flex items-center gap-2 text-xs w-full sm:w-auto justify-end">
          {allMerchants.length > 1 && (
            <select
              value={selectedMerchantId}
              onChange={(e) => setSelectedMerchantId(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
            >
              {allMerchants.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.category})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => setShowAddStoreModal(true)}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold transition flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>تسجيل متجر آخر</span>
          </button>

          <button
            onClick={() => setShowSupportModal(true)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
          >
            دعم التجار
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-lg">
          <span className="text-xs text-slate-400 font-medium">الطلبات الجارية الآن</span>
          <p className="text-2xl font-black text-amber-400 mt-1">{liveOrders.length} طلبات</p>
          <span className="text-[11px] text-slate-500 mt-1 block">تتطلب متابعة وتحضير</span>
        </div>

        <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-lg">
          <span className="text-xs text-slate-400 font-medium">صافي المبيعات المحققة</span>
          <p className="text-2xl font-black text-emerald-400 mt-1">{totalMerchantRevenue} ج.م</p>
          <span className="text-[11px] text-slate-500 mt-1 block">بعد خصم عمولة المنصة</span>
        </div>

        <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-lg">
          <span className="text-xs text-slate-400 font-medium">إجمالي عدد المنتجات</span>
          <p className="text-2xl font-black text-white mt-1">{products.length} أصناف</p>
          <span className="text-[11px] text-slate-500 mt-1 block">بقائمة المتجر</span>
        </div>

        <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-lg">
          <span className="text-xs text-slate-400 font-medium">حالة الاستقبال</span>
          <p className="text-2xl font-black text-teal-400 mt-1">نشط</p>
          <span className="text-[11px] text-slate-500 mt-1 block">ساعات العمل: {merchant.openingHours}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition ${
            activeTab === 'orders'
              ? 'bg-amber-500 text-slate-950 font-black shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          الطلبات الواردة وتحضير الوجبات ({liveOrders.length})
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition ${
            activeTab === 'products'
              ? 'bg-amber-500 text-slate-950 font-black shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          قائمة المنتجات والأسعار ({products.length})
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition ${
            activeTab === 'analytics'
              ? 'bg-amber-500 text-slate-950 font-black shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          الطلبات السابقة والسجل ({pastOrders.length})
        </button>
      </div>

      {/* TAB 1: LIVE ORDERS */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {liveOrders.length === 0 ? (
            <div className="p-12 text-center bg-slate-900 rounded-3xl border border-slate-800 space-y-2">
              <Package className="w-12 h-12 text-slate-600 mx-auto opacity-50" />
              <h3 className="font-bold text-white text-base">لا توجد طلبات واردة حالياً</h3>
              <p className="text-xs text-slate-400">ستصل إشعارات الطلبات الجديدة هنا فور قيام أي عميل بطلب من متجرك.</p>
            </div>
          ) : (
            liveOrders.map((ord) => (
              <div
                key={ord.id}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-black text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/20">
                        {ord.orderNumber}
                      </span>
                      <h4 className="font-black text-white text-base">{ord.customerName}</h4>
                      <span className="text-xs text-slate-400 font-mono" dir="ltr">
                        {ord.customerPhone}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      عنوان التوصيل: {ord.deliveryAddress.address}
                    </p>
                  </div>

                  <div className="text-left">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-950 text-amber-400 border border-amber-800">
                      الحالة: {ord.status}
                    </span>
                    <span className="block text-[11px] text-slate-500 mt-1 font-mono">
                      {ord.createdAt.replace('T', ' ').substring(0, 16)}
                    </span>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-300 block">الأصناف المطلوبة:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ord.items.map((it) => (
                      <div
                        key={it.productId}
                        className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between"
                      >
                        <span className="text-white font-medium">
                          {it.name} <strong className="text-amber-400">×{it.quantity}</strong>
                        </span>
                        <span className="text-slate-400 font-bold">{it.price * it.quantity} ج.م</span>
                      </div>
                    ))}
                  </div>
                  {ord.notes && (
                    <p className="text-xs text-amber-300/80 bg-amber-950/30 p-2.5 rounded-xl border border-amber-900/40">
                      ملاحظة العميل: {ord.notes}
                    </p>
                  )}
                </div>

                {/* Totals & Merchant Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-800">
                  <div className="text-xs space-y-0.5">
                    <p className="text-slate-400">
                      إجمالي الطلب: <strong className="text-white text-sm">{ord.total} ج.م</strong>
                    </p>
                    <p className="text-slate-400">
                      حصة المتجر بعد العمولة: <strong className="text-emerald-400 text-sm">{ord.subtotal - ord.platformCommission} ج.م</strong>
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {ord.status === 'Pending' && (
                      <button
                        onClick={() => handleUpdateOrderStatus(ord.id, 'Accepted')}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-lg shadow-emerald-900/30"
                      >
                        قبول الطلب (Accept)
                      </button>
                    )}

                    {ord.status === 'Accepted' && (
                      <button
                        onClick={() => handleUpdateOrderStatus(ord.id, 'Preparing')}
                        className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow-lg shadow-amber-500/20"
                      >
                        بدء التحضير بالمطبخ (Preparing)
                      </button>
                    )}

                    {ord.status === 'Preparing' && (
                      <button
                        onClick={() => handleUpdateOrderStatus(ord.id, 'Ready')}
                        className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition shadow-lg shadow-teal-900/30"
                      >
                        جاهز للاستلام والتوصيل (Ready)
                      </button>
                    )}

                    {ord.status === 'Ready' && (
                      <button
                        onClick={() => handleUpdateOrderStatus(ord.id, 'Searching for Driver')}
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow-lg shadow-indigo-900/30"
                      >
                        طلب كابتن توصيل أقرب مندوب
                      </button>
                    )}

                    {['Driver Assigned', 'Driver Arrived', 'Picked Up', 'On The Way'].includes(ord.status) && (
                      <span className="text-xs text-amber-400 font-bold bg-amber-950/50 px-3 py-2 rounded-xl border border-amber-800/60">
                        الطلب في عهدة الكابتن: {ord.driverName || 'كابتن الإسكندرية'} ({ord.status})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: PRODUCTS CATALOG */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-white text-base">كتالوج وقائمة أصناف المتجر</h3>
              <p className="text-xs text-slate-400">إضافة أصناف جديدة والتحكم في الأسعار وتوفر المخزون</p>
            </div>
            <button
              onClick={() => setShowAddProductModal(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
            >
              <PlusCircle className="w-4 h-4" />
              <span>إضافة صنف جديد</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p) => (
              <div
                key={p.id}
                className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden p-4 flex flex-col justify-between space-y-3"
              >
                <div className="flex gap-3">
                  <div className="relative w-20 h-20 rounded-2xl overflow-hidden shrink-0">
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                    <span className="absolute top-1 right-1 bg-slate-950/80 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] text-amber-400 font-bold border border-slate-800">
                      {p.category}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-white text-sm leading-tight truncate">{p.name}</h4>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1">{p.description}</p>
                    <p className="text-amber-400 font-black text-sm mt-1">{p.price} ج.م</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
                  <span className={`px-2 py-0.5 rounded-full font-bold ${
                    p.isAvailable
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-rose-950 text-rose-400 border border-rose-800'
                  }`}>
                    {p.isAvailable ? 'متاح للطلب' : 'غير متوفر'}
                  </span>

                  <button
                    onClick={() => handleToggleProduct(p.id, p.isAvailable)}
                    className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition text-xs font-bold"
                  >
                    {p.isAvailable ? 'إيقاف الصنف' : 'تفعيل الصنف'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: PAST ORDERS */}
      {activeTab === 'analytics' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-x-auto shadow-xl">
          <table className="w-full text-xs text-right">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold bg-slate-950/40">
                <th className="py-3 px-4">رقم الطلب</th>
                <th className="py-3 px-4">العميل</th>
                <th className="py-3 px-4">الإجمالي</th>
                <th className="py-3 px-4">صافي المتجر</th>
                <th className="py-3 px-4">الحالة</th>
                <th className="py-3 px-4">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {pastOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    لا توجد طلبات سابقة حتى الآن.
                  </td>
                </tr>
              ) : (
                pastOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-mono text-amber-400 font-bold">{o.orderNumber}</td>
                    <td className="py-3 px-4 text-white font-medium">{o.customerName}</td>
                    <td className="py-3 px-4 text-slate-200 font-bold">{o.total} ج.م</td>
                    <td className="py-3 px-4 text-emerald-400 font-black">{o.subtotal - o.platformCommission} ج.م</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        o.status === 'Delivered' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                      }`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono">{o.createdAt.substring(0, 10)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ADD PRODUCT MODAL */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn text-right" dir="rtl">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-black text-white text-base">إضافة صنف جديد لقائمة المتجر</h3>
              <button onClick={() => setShowAddProductModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleAddProductSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">اسم الصنف</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: ساندوتش كبدة إسكندراني"
                  value={newProd.name}
                  onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-bold mb-1">السعر (ج.م)</label>
                <input
                  type="number"
                  required
                  value={newProd.price}
                  onChange={(e) => setNewProd({ ...newProd, price: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-bold mb-1">الوصف والمكونات</label>
                <textarea
                  rows={2}
                  value={newProd.description}
                  onChange={(e) => setNewProd({ ...newProd, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/20"
                >
                  حفظ الصنف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD STORE MODAL */}
      {showAddStoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn text-right" dir="rtl">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-black text-white text-base">تسجيل متجر جديد بالإسكندرية</h3>
              <button onClick={() => setShowAddStoreModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleAddStoreSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">اسم المتجر / المطعم</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: مطعم بلبع / صيدلية خليل"
                  value={newStore.name}
                  onChange={(e) => setNewStore({ ...newStore, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-bold mb-1">التصنيف</label>
                <select
                  value={newStore.category}
                  onChange={(e) => setNewStore({ ...newStore, category: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                >
                  <option value="مطاعم">مطاعم</option>
                  <option value="حلويات ومخابز">حلويات ومخابز</option>
                  <option value="صيدليات">صيدليات</option>
                  <option value="سوبرماركت">سوبرماركت</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-300 font-bold mb-1">العنوان بالإسكندرية</label>
                <input
                  type="text"
                  placeholder="مثال: طريق الجيش، كورنيش سيدي جابر"
                  value={newStore.address}
                  onChange={(e) => setNewStore({ ...newStore, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-bold mb-1">رقم الهاتف للتواصل</label>
                <input
                  type="tel"
                  placeholder="010xxxxxxxx"
                  value={newStore.phone}
                  onChange={(e) => setNewStore({ ...newStore, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow-lg shadow-amber-500/20"
              >
                تأكيد تسجيل المتجر
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SUPPORT MODAL */}
      {showSupportModal && (
        <SupportCenter
          currentUserId={merchant.id}
          currentUserName={merchant.name}
          currentUserRole="Merchant"
          currentUserPhone={merchant.phone}
          onClose={() => setShowSupportModal(false)}
        />
      )}
    </div>
  );
};
