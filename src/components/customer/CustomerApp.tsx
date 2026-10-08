import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api.ts';
import {
  MerchantProfile,
  MerchantProduct,
  Order,
  CustomerAddress,
  LocationCoordinates,
  OrderStatus,
} from '../../types/index.ts';
import { LiveDeliveryMap } from '../maps/LiveDeliveryMap.tsx';
import { ChatPanel } from '../chat/ChatPanel.tsx';
import { SupportCenter } from '../support/SupportCenter.tsx';
import {
  Search,
  MapPin,
  ShoppingBag,
  Star,
  Clock,
  ShieldCheck,
  Phone,
  MessageCircle,
  ChevronLeft,
  X,
  CreditCard,
  Banknote,
  CheckCircle2,
  RefreshCw,
  Plus,
  Minus,
  Sparkles,
  AlertCircle,
  Store
} from 'lucide-react';

export const CustomerApp: React.FC = () => {
  // Current user state (pre-authenticated or OTP logged in)
  const [customer, setCustomer] = useState({
    id: 'u_cust_1',
    name: 'عميل الإسكندرية',
    phone: '01067891234',
    address: {
      id: 'addr_alex_1',
      title: 'المنزل - لوران على الكورنيش',
      address: 'عمارة 24 طريق الجيش، كورنيش لوران، الإسكندرية',
      building: '24',
      floor: '5',
      apartment: '15',
      coordinates: { lat: 31.2425, lng: 29.9710 },
    } as CustomerAddress,
  });

  const alexandriaAddresses = [
    { title: 'المنزل - لوران الكورنيش', address: 'طريق الجيش، لوران، الإسكندرية', lat: 31.2425, lng: 29.9710 },
    { title: 'العمل - سموحة', address: 'ميدان فيكتور عمانويل، سموحة، الإسكندرية', lat: 31.2162, lng: 29.9540 },
    { title: 'سيدي جابر', address: 'شارع المشير، سيدي جابر، الإسكندرية', lat: 31.2178, lng: 29.9475 },
    { title: 'محطة الرمل', address: 'ميدان سعد زغلول، محطة الرمل، الإسكندرية', lat: 31.2005, lng: 29.8992 },
  ];

  const [merchants, setMerchants] = useState<MerchantProfile[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMerchant, setSelectedMerchant] = useState<MerchantProfile | null>(null);
  const [storeProducts, setStoreProducts] = useState<MerchantProduct[]>([]);
  const [cart, setCart] = useState<{ product: MerchantProduct; quantity: number; notes?: string }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash_on_delivery' | 'online_card'>('cash_on_delivery');
  
  // Orders & Live Tracking
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [activeChatRoom, setActiveChatRoom] = useState<string | null>(null);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [driverScore, setDriverScore] = useState(5);
  const [merchantScore, setMerchantScore] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // Categories
  const categories = ['الكل', 'مطاعم', 'حلويات ومخابز', 'صيدليات', 'سوبرماركت'];

  // Load merchants & orders
  const loadData = async () => {
    try {
      const resM = await api.getMerchants({
        category: selectedCategory,
        search: searchQuery,
        lat: customer.address.coordinates.lat,
        lng: customer.address.coordinates.lng,
      });
      if (resM.data) setMerchants(resM.data);

      const resO = await api.getOrders({ customerId: customer.id });
      if (resO.data) {
        setOrders(resO.data);
        const live = resO.data.find((o) => !['Delivered', 'Cancelled'].includes(o.status));
        setActiveOrder(live || null);
      }
    } catch (err) {
      console.error('Error loading customer data:', err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4500);
    return () => clearInterval(interval);
  }, [selectedCategory, searchQuery]);

  // Select store & fetch products
  const handleOpenMerchant = async (merchant: MerchantProfile) => {
    setSelectedMerchant(merchant);
    try {
      const res = await api.getMerchantDetails(merchant.id);
      if (res.products) setStoreProducts(res.products);
    } catch (err) {
      console.error('Error loading store products:', err);
    }
  };

  // Cart operations
  const addToCart = (product: MerchantProduct) => {
    // If cart has items from another merchant, reset cart
    if (cart.length > 0 && cart[0].product.merchantId !== product.merchantId) {
      if (!confirm('سلتك تحتوي على منتجات من متجر آخر. هل تريد بدء سلة جديدة من هذا المتجر؟')) {
        return;
      }
      setCart([{ product, quantity: 1 }]);
      return;
    }

    const existing = cart.find((item) => item.product.id === product.id);
    if (existing) {
      setCart(cart.map((item) => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    const updated = cart.map((item) => {
      if (item.product.id === productId) {
        return { ...item, quantity: Math.max(0, item.quantity + delta) };
      }
      return item;
    }).filter((item) => item.quantity > 0);
    setCart(updated);
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const merchantDist = selectedMerchant?.coordinates
    ? Math.round(
        6371 *
          2 *
          Math.atan2(
            Math.sqrt(
              Math.sin(((selectedMerchant.coordinates.lat - customer.address.coordinates.lat) * Math.PI) / 360) ** 2 +
                Math.cos((customer.address.coordinates.lat * Math.PI) / 180) *
                  Math.cos((selectedMerchant.coordinates.lat * Math.PI) / 180) *
                  Math.sin(((selectedMerchant.coordinates.lng - customer.address.coordinates.lng) * Math.PI) / 360) ** 2
            ),
            Math.sqrt(
              1 -
                (Math.sin(((selectedMerchant.coordinates.lat - customer.address.coordinates.lat) * Math.PI) / 360) ** 2 +
                  Math.cos((customer.address.coordinates.lat * Math.PI) / 180) *
                    Math.cos((selectedMerchant.coordinates.lat * Math.PI) / 180) *
                    Math.sin(((selectedMerchant.coordinates.lng - customer.address.coordinates.lng) * Math.PI) / 360) ** 2)
            )
          ) *
          10
      ) / 10
    : 3.5;

  // Constant fixed equation: 15 EGP Base + (Distance Km * 3 EGP)
  const estimatedDeliveryFee = Math.round((15 + merchantDist * 3) * 10) / 10;
  const serviceFee = 5; // EGP
  const cartTotal = cartSubtotal > 0 ? Math.round((cartSubtotal + estimatedDeliveryFee + serviceFee) * 10) / 10 : 0;

  // Checkout create order
  const handleCheckout = async () => {
    if (cart.length === 0 || !selectedMerchant) return;
    setIsPlacingOrder(true);
    try {
      const payload = {
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        deliveryAddress: customer.address,
        merchantId: selectedMerchant.id,
        items: cart.map((c) => ({
          productId: c.product.id,
          name: c.product.name,
          price: c.product.price,
          quantity: c.quantity,
          notes: c.notes,
        })),
        paymentMethod,
        notes: 'يرجى الاتصال عند الوصول للبوابة',
      };

      const res = await api.createOrder(payload);
      setCart([]);
      setIsCartOpen(false);
      setSelectedMerchant(null);
      await loadData();
      setActiveOrder(res.data);
    } catch (err: any) {
      alert(err.message || 'فشل إنشاء الطلب');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // Submit Rating
  const handleSubmitRating = async () => {
    if (!activeOrder) return;
    try {
      await api.rateOrder(activeOrder.id, {
        driverScore,
        merchantScore,
        comment: ratingComment,
      });
      setShowRatingModal(false);
      await loadData();
    } catch (err) {
      console.error('Error submitting rating:', err);
    }
  };

  // Step Status Labels & Colors
  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'Pending':
        return { text: 'بانتظار موافقة المتجر', color: 'bg-amber-950 text-amber-400 border-amber-800' };
      case 'Accepted':
      case 'Preparing':
        return { text: 'جاري تحضير الوجبة بالمطعم', color: 'bg-blue-950 text-blue-400 border-blue-800' };
      case 'Ready':
      case 'Searching for Driver':
        return { text: 'جاري البحث عن كابتن التوصيل', color: 'bg-purple-950 text-purple-400 border-purple-800' };
      case 'Driver Assigned':
        return { text: 'تم تعيين الكابتن ويتجه للمتجر', color: 'bg-indigo-950 text-indigo-400 border-indigo-800' };
      case 'Driver Arrived':
        return { text: 'وصل الكابتن إلى المتجر', color: 'bg-teal-950 text-teal-400 border-teal-800' };
      case 'Picked Up':
      case 'On The Way':
        return { text: 'الكابتن في الطريق إليك الآن 🛵', color: 'bg-emerald-950 text-emerald-400 border-emerald-800 animate-pulse' };
      case 'Delivered':
        return { text: 'تم التوصيل بنجاح ✓', color: 'bg-emerald-950 text-emerald-400 border-emerald-800' };
      default:
        return { text: status, color: 'bg-slate-800 text-slate-300 border-slate-700' };
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-20">
      {/* Top Location Bar & Header */}
      <div className="bg-slate-900/90 backdrop-blur-md rounded-3xl p-4 sm:p-5 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 flex items-center justify-center font-black text-xl shadow-lg shadow-amber-500/20">
            و
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold">
              <MapPin className="w-3.5 h-3.5" />
              <span>موقع التوصيل المحدد:</span>
            </div>
            <h2 className="font-black text-white text-base leading-tight">
              {customer.address.title}
            </h2>
            <p className="text-xs text-slate-400 truncate max-w-xs">{customer.address.address}</p>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن مطعم، بلبع، كبدة الفلاح، جيلاتي عزة..."
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl pr-10 pl-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
          />
        </div>

        {/* Cart & Support Buttons */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            onClick={() => setShowSupportModal(true)}
            className="p-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition flex items-center gap-1.5 text-xs font-bold"
          >
            <span>الدعم</span>
          </button>

          <button
            onClick={() => setIsCartOpen(true)}
            className="relative px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition flex items-center gap-2 shadow-lg shadow-emerald-700/20"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>السلة ({cart.reduce((s, i) => s + i.quantity, 0)})</span>
            {cartSubtotal > 0 && (
              <span className="bg-emerald-800/80 px-2 py-0.5 rounded-lg text-[11px]">
                {cartSubtotal} ج.م
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ACTIVE ORDER LIVE TRACKER CARD (When an order is in progress) */}
      {activeOrder && (
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-3xl p-5 border-2 border-emerald-500/40 shadow-2xl space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg border border-emerald-500/40">
                🛵
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-white text-base">
                    متابعة الطلب الحي #{activeOrder.orderNumber}
                  </h3>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${getStatusBadge(activeOrder.status).color}`}>
                    {getStatusBadge(activeOrder.status).text}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {activeOrder.merchantName} • الوقت المتوقع للوصول: {activeOrder.etaMinutes} دقيقة
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeOrder.driverId && (
                <button
                  onClick={() => setActiveChatRoom(`chat_${activeOrder.id}`)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>محادثة الكابتن</span>
                </button>
              )}

              {activeOrder.status === 'Delivered' && (
                <button
                  onClick={() => setShowRatingModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition flex items-center gap-1.5"
                >
                  <Star className="w-4 h-4" />
                  <span>تقييم الكابتن والمتجر</span>
                </button>
              )}
            </div>
          </div>

          {/* Interactive Live Map with Driver and Route */}
          <LiveDeliveryMap
            heightClass="h-72"
            driverLocation={activeOrder.driverCoordinates}
            storeLocation={activeOrder.merchantAddress.coordinates}
            customerLocation={activeOrder.deliveryAddress.coordinates}
            driverName={activeOrder.driverName || 'الكابتن'}
            storeName={activeOrder.merchantName}
            customerAddress={activeOrder.deliveryAddress.address}
            driverSpeed={activeOrder.driverCoordinates ? 32 : 0}
          />

          {/* Driver & Order Details Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 font-medium">بيانات المندوب:</span>
              <p className="font-bold text-white mt-0.5">
                {activeOrder.driverName ? `كابتن ${activeOrder.driverName}` : 'جاري البحث عن كابتن قريب...'}
              </p>
              {activeOrder.driverVehicle && (
                <span className="text-slate-500 text-[11px] block">{activeOrder.driverVehicle}</span>
              )}
            </div>

            <div>
              <span className="text-slate-400 font-medium">طريقة الدفع:</span>
              <p className="font-bold text-amber-400 mt-0.5">
                {activeOrder.paymentMethod === 'cash_on_delivery' ? 'الدفع نقداً عند الاستلام (كاش)' : 'مدفوع إلكترونياً بالبطاقة'}
              </p>
              <span className="text-slate-400 text-[11px] block">المبلغ المطلوب: {activeOrder.total} ج.م</span>
            </div>

            <div>
              <span className="text-slate-400 font-medium">محتويات الوجبة:</span>
              <p className="text-slate-200 mt-0.5 font-medium truncate">
                {activeOrder.items.map((i) => `${i.quantity}x ${i.name}`).join('، ')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-2xl text-xs font-black whitespace-nowrap transition border ${
              selectedCategory === cat
                ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-lg shadow-amber-500/20'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* VIEW 1: MERCHANT STORE DETAILS & MENU */}
      {selectedMerchant ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Store Banner */}
          <div className="relative rounded-3xl overflow-hidden border border-slate-800 bg-slate-900 shadow-xl">
            <div className="h-44 sm:h-56 w-full relative">
              <img
                src={selectedMerchant.coverImage}
                alt={selectedMerchant.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
            </div>

            <button
              onClick={() => setSelectedMerchant(null)}
              className="absolute top-4 right-4 bg-slate-900/80 hover:bg-slate-900 text-white px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition"
            >
              <ChevronLeft className="w-4 h-4 rotate-180" />
              <span>العودة لكافة المتاجر</span>
            </button>

            <div className="p-5 sm:p-6 -mt-14 relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="flex items-center gap-4">
                <img
                  src={selectedMerchant.logo}
                  alt={selectedMerchant.name}
                  className="w-20 h-20 rounded-2xl object-cover border-4 border-slate-900 shadow-xl"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-black text-white">
                      {selectedMerchant.name}
                    </h2>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 font-bold border border-emerald-800">
                      مفتوح الآن
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 flex items-center gap-3">
                    <span className="flex items-center gap-1 text-amber-400 font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      {selectedMerchant.rating}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      {selectedMerchant.openingHours}
                    </span>
                    <span>•</span>
                    <span>{selectedMerchant.address}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Menu Items Grid */}
          <div className="space-y-3">
            <h3 className="font-black text-white text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              قائمة الأصناف والمنتجات المتاحة
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {storeProducts.map((prod) => (
                <div
                  key={prod.id}
                  className="bg-slate-900/90 hover:bg-slate-900 border border-slate-800 rounded-2xl p-4 transition flex gap-4 shadow-lg group"
                >
                  <img
                    src={prod.image}
                    alt={prod.name}
                    className="w-24 h-24 rounded-2xl object-cover shrink-0 border border-slate-800 group-hover:scale-102 transition duration-300"
                  />
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-white text-sm leading-snug">{prod.name}</h4>
                        <span className="font-black text-amber-400 text-sm whitespace-nowrap">
                          {prod.price} ج.م
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {prod.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[11px] text-slate-500 font-medium">
                        المتبقي: {prod.stock} قطع
                      </span>
                      <button
                        onClick={() => addToCart(prod)}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition flex items-center gap-1 shadow-md shadow-amber-500/20"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>إضافة للسلة</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* VIEW 2: ALL MERCHANTS DIRECTORY */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-white text-lg">
              المتاجر والمطاعم القريبة منك ({merchants.length})
            </h3>
            <span className="text-xs text-slate-400">توصيل سريع لكافة أحياء محافظة الإسكندرية (15 ج.م فتح عداد + 3 ج.م لكل كم)</span>
          </div>

          {merchants.length === 0 ? (
            <div className="p-12 text-center bg-slate-900 rounded-3xl border border-slate-800 space-y-3">
              <Store className="w-12 h-12 text-slate-600 mx-auto opacity-50" />
              <h4 className="font-bold text-white text-base">لا يوجد متاجر مسجلة حالياً في الإسكندرية</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                قاعدة البيانات نظيفة. سيتم إدراج المتاجر المعتمدة هنا فور تسجيلها واعتمادها من الإدارة لتتمكن من تصفح قوائمها والطلب فوراً.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {merchants.map((m) => (
              <div
                key={m.id}
                onClick={() => handleOpenMerchant(m)}
                className="bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-3xl overflow-hidden cursor-pointer transition duration-200 group shadow-lg flex flex-col justify-between"
              >
                <div className="relative h-40 w-full overflow-hidden">
                  <img
                    src={m.coverImage}
                    alt={m.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
                  <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-xl text-xs font-bold text-amber-400 flex items-center gap-1 border border-slate-800">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    {m.rating}
                  </div>
                  <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-xl text-xs font-bold text-slate-300 border border-slate-800">
                    {m.category}
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  <div className="flex items-center gap-3">
                    <img
                      src={m.logo}
                      alt={m.name}
                      className="w-10 h-10 rounded-xl object-cover border border-slate-700 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-white text-base leading-tight truncate">
                        {m.name}
                      </h4>
                      <p className="text-xs text-slate-400 truncate mt-0.5">{m.address}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      25 - 35 دقيقة
                    </span>
                    <span className="text-amber-400 font-bold">
                      رسوم التوصيل: ~25 ج.م
                    </span>
                  </div>
                </div>
              </div>
            ))}
            </div>
          )}
        </div>
      )}

      {/* CART DRAWER MODAL */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border-r border-slate-800 h-full flex flex-col p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-white text-base">سلة المشتريات</h3>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {cart.length === 0 ? (
                <div className="py-20 text-center text-slate-500">
                  <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>سلتك فارغة حالياً</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-white text-xs leading-tight truncate">
                        {item.product.name}
                      </h4>
                      <span className="text-xs text-amber-400 font-bold block mt-0.5">
                        {item.product.price} ج.م
                      </span>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-2 py-1 rounded-xl">
                      <button
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="text-slate-400 hover:text-white p-0.5"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-bold text-white w-4 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="text-slate-400 hover:text-white p-0.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Payment Method Selector */}
            {cart.length > 0 && (
              <div className="border-t border-slate-800 pt-3 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2">
                    طريقة الدفع
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cash_on_delivery')}
                      className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition ${
                        paymentMethod === 'cash_on_delivery'
                          ? 'bg-amber-500 text-slate-950 border-amber-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      <Banknote className="w-4 h-4" />
                      <span>كاش عند الاستلام</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('online_card')}
                      className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition ${
                        paymentMethod === 'online_card'
                          ? 'bg-amber-500 text-slate-950 border-amber-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>بطاقة بنكية / Paymob</span>
                    </button>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-400">
                    <span>مجموع الأصناف:</span>
                    <span className="text-white font-bold">{cartSubtotal} ج.م</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>أجر التوصيل التقديري:</span>
                    <span className="text-white font-bold">{estimatedDeliveryFee} ج.م</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>رسوم الخدمة الثابتة:</span>
                    <span className="text-white font-bold">{serviceFee} ج.م</span>
                  </div>
                  <div className="flex justify-between text-sm font-black pt-2 border-t border-slate-800 text-amber-400">
                    <span>الإجمالي الكلي:</span>
                    <span>{cartTotal} ج.م</span>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={isPlacingOrder}
                  className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-sm transition shadow-xl shadow-emerald-700/25 flex items-center justify-center gap-2"
                >
                  {isPlacingOrder ? (
                    <span>جاري إرسال الطلب...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>تأكيد الطلب الآن ({cartTotal} ج.م)</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RATING MODAL */}
      {showRatingModal && activeOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="font-black text-white text-lg text-center">تقييم تجربة التوصيل</h3>
            
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                تقييم الكابتن ({activeOrder.driverName || 'المندوب'})
              </label>
              <div className="flex justify-center gap-2 py-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setDriverScore(s)}
                    className="text-2xl transition hover:scale-125"
                  >
                    <span className={s <= driverScore ? 'text-amber-400' : 'text-slate-700'}>★</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                تقييم المتجر والوجبة ({activeOrder.merchantName})
              </label>
              <div className="flex justify-center gap-2 py-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setMerchantScore(s)}
                    className="text-2xl transition hover:scale-125"
                  >
                    <span className={s <= merchantScore ? 'text-amber-400' : 'text-slate-700'}>★</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">تعليقك (اختياري)</label>
              <textarea
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                placeholder="اكتب ملاحظاتك لمساعدتنا في تحسين الجودة..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white"
                rows={2}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRatingModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                تخطي
              </button>
              <button
                type="button"
                onClick={handleSubmitRating}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20"
              >
                إرسال التقييم
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHAT MODAL IF OPEN */}
      {activeChatRoom && activeOrder && (
        <ChatPanel
          orderId={activeOrder.orderNumber}
          roomId={activeChatRoom}
          currentUserId={customer.id}
          currentUserName={customer.name}
          currentUserRole="Customer"
          counterpartName={activeOrder.driverName || 'كابتن التوصيل'}
          counterpartRoleTitle="مندوب التوصيل"
          counterpartPhone={activeOrder.driverPhone}
          onClose={() => setActiveChatRoom(null)}
        />
      )}

      {/* SUPPORT MODAL */}
      {showSupportModal && (
        <SupportCenter
          currentUserId={customer.id}
          currentUserName={customer.name}
          currentUserRole="Customer"
          currentUserPhone={customer.phone}
          onClose={() => setShowSupportModal(false)}
        />
      )}
    </div>
  );
};
