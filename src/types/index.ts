export type UserRole = 
  | 'Super Admin'
  | 'Admin'
  | 'Finance'
  | 'Support'
  | 'Merchant'
  | 'Driver'
  | 'Customer';

export type DriverStatus = 'Pending Review' | 'Approved' | 'Rejected' | 'Suspended' | 'Blocked';
export type MerchantStatus = 'Pending' | 'Active' | 'Suspended' | 'Closed';

export type OrderStatus = 
  | 'Pending'
  | 'Accepted'
  | 'Preparing'
  | 'Ready'
  | 'Searching for Driver'
  | 'Driver Assigned'
  | 'Driver Arrived'
  | 'Picked Up'
  | 'On The Way'
  | 'Delivered'
  | 'Cancelled';

export interface LocationCoordinates {
  lat: number;
  lng: number;
  addressName?: string;
  city?: string;
  governorate?: string;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: UserRole;
  avatar?: string;
  createdAt: string;
  passwordHash?: string;
}

export interface StaffRecruitmentApplication {
  id: string;
  fullName: string;
  phone: string;
  nationalId: string; // 14 digits
  personalPhoto: string; // base64 or URL
  nationalIdCardPhoto: string; // base64 or URL
  roleRequested: 'Staff' | 'Driver';
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface CustomerAddress {
  id: string;
  title: string; // e.g. "المنزل - المعادي", "العمل - التجمع"
  address: string;
  building?: string;
  floor?: string;
  apartment?: string;
  coordinates: LocationCoordinates;
  isDefault?: boolean;
}

export interface DriverDocument {
  type: 'national_id' | 'driver_license' | 'vehicle_license' | 'selfie' | 'criminal_record';
  titleAr: string;
  fileUrl: string;
  status: 'pending' | 'verified' | 'rejected';
  verifiedAt?: string;
}

export interface VehicleInfo {
  type: 'motorcycle' | 'car' | 'bicycle' | 'van';
  plateNumber: string;
  model: string;
  color: string;
  year?: string;
}

export interface DriverLedgerTransaction {
  id: string;
  transactionNumber: string;
  date: string;
  amount: number;
  type: 'delivery_fee' | 'commission_deduction' | 'cash_collected' | 'topup_payment' | 'adjustment' | 'refund' | 'payout';
  status: 'completed' | 'pending' | 'failed';
  description: string;
  relatedOrderId?: string;
  balanceAfter: number;
  debtAfter: number;
  auditLogId?: string;
}

export interface DriverProfile {
  id: string;
  userId: string;
  name: string;
  phone: string;
  avatar: string;
  governorate: string;
  area: string;
  vehicle: VehicleInfo;
  documents: DriverDocument[];
  status: DriverStatus;
  rejectionReason?: string;
  isOnline: boolean;
  currentLocation: LocationCoordinates;
  heading?: number;
  speed?: number;
  rating: number;
  totalRatingsCount: number;
  totalOrdersCompleted: number;
  
  // Ledger & Financials
  currentBalance: number;     // Net wallet balance
  availableBalance: number;   // Withdrawable
  debt: number;               // Current debt owed to platform (e.g. from cash deliveries)
  maxDebtLimit: number;       // Max debt allowed before auto-freeze (e.g. 500 EGP)
  totalEarnings: number;      // Lifetime earnings
  totalDeliveryFees: number;  // Lifetime delivery fees earned
  totalPlatformCommission: number; // Commission paid to platform
  
  activeOrderId?: string;
  joinedAt: string;
}

export interface MerchantProduct {
  id: string;
  merchantId: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  isAvailable: boolean;
  stock: number;
}

export interface MerchantProfile {
  id: string;
  userId: string;
  name: string;
  brandNameAr: string;
  category: 'مطاعم' | 'سوبرماركت' | 'صيدليات' | 'حلويات ومخابز' | 'مشروبات وكافيهات' | 'زهور وهدايا';
  logo: string;
  coverImage: string;
  phone: string;
  address: string;
  coordinates: LocationCoordinates;
  openingHours: string;
  isOpen: boolean;
  status: MerchantStatus;
  commissionRate: number; // e.g. 10%
  rating: number;
  totalOrders: number;
  totalSales: number;
  joinedAt: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. "WAS-2489"
  customerId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: CustomerAddress;
  
  merchantId: string;
  merchantName: string;
  merchantPhone: string;
  merchantAddress: {
    address: string;
    coordinates: LocationCoordinates;
  };
  
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  driverVehicle?: string;
  driverCoordinates?: LocationCoordinates;
  
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  discount: number;
  total: number;
  platformCommission: number;
  driverEarnings: number;
  
  paymentMethod: 'cash_on_delivery' | 'online_card' | 'wallet' | 'fawry';
  paymentStatus: 'paid' | 'pending' | 'failed' | 'refunded';
  
  status: OrderStatus;
  statusHistory: {
    status: OrderStatus;
    timestamp: string;
    note?: string;
  }[];
  
  etaMinutes: number;
  distanceKm: number;
  
  proofOfPickupUrl?: string;
  proofOfDeliveryUrl?: string;
  
  customerRating?: {
    driverScore: number;
    merchantScore: number;
    comment?: string;
  };
  
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  imageUrl?: string;
  timestamp: string;
  isRead: boolean;
}

export interface ChatRoom {
  id: string;
  orderId?: string;
  type: 'customer_driver' | 'customer_support' | 'driver_support' | 'merchant_support';
  participantIds: string[];
  participantNames: string[];
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  userPhone: string;
  issueType: 'مشكلة في الطلب' | 'مشكلة في التوصيل' | 'مدفوعات ومحفظة' | 'حساب ومستندات' | 'شكوى أخرى';
  subject: string;
  description: string;
  attachmentUrl?: string;
  status: 'Open' | 'Assigned' | 'In Progress' | 'Resolved' | 'Closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  entityType: 'driver' | 'order' | 'merchant' | 'financial' | 'settings' | 'ticket' | 'recruitment';
  entityId: string;
  details: string;
  ipAddress?: string;
}

export interface SystemSettings {
  appName: string;
  appNameAr: string;
  currency: string;
  currencyAr: string;
  logo: string;
  
  // Delivery Fee Calculation Formulas
  baseDeliveryFee: number;     // e.g. 15 EGP
  feePerKm: number;            // e.g. 4 EGP
  feePerMinute: number;        // e.g. 0.5 EGP
  minDeliveryFee: number;      // e.g. 20 EGP
  areaRushMultiplier: number;  // 1.0 - 2.0
  
  // Commissions
  platformCommissionPercent: number; // e.g. 12%
  driverCommissionPercent: number;   // e.g. 88%
  
  // Driver Management & Debt Rules
  driverMaxDebtLimit: number;       // e.g. 500 EGP
  autoSuspendOverDebt: boolean;     // auto block when debt > maxDebtLimit
  dispatchRadiusKm: number;         // e.g. 7 km
  driverAcceptTimeoutSec: number;   // e.g. 45 seconds
  dispatchMode: 'nearest_auto' | 'broadcast_all' | 'manual_admin';
  
  // Payment Gateways & Driver Debt Bank Account
  companyBankAccount: string; // e.g. 7071009697713907
  companyBankName: string;
  companyInstaPayHandle?: string;
  paymobEnabled: boolean;
  paymobApiKeyMasked: string;
  fawryEnabled: boolean;
  cashOnDeliveryEnabled: boolean;
  walletPaymentEnabled: boolean;
  paymentTestMode: boolean;
  
  // Map Config
  mapProvider: 'leaflet_osm' | 'google_maps';
  googleMapsApiKeyMasked: string;
}
