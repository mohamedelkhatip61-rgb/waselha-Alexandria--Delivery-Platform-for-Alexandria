import {
  DriverProfile,
  MerchantProfile,
  MerchantProduct,
  Order,
  ChatMessage,
  SupportTicket,
  AuditLog,
  SystemSettings,
  DriverLedgerTransaction,
  User,
  StaffRecruitmentApplication
} from '../src/types/index.ts';

// Initial System Settings for Waselha Alexandria
export let settings: SystemSettings = {
  appName: 'Waselha Alexandria',
  appNameAr: 'وصلها اسكندرية',
  currency: 'EGP',
  currencyAr: 'ج.م',
  logo: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=128&auto=format&fit=crop&q=80',
  
  // Delivery Fee Equation: Constant 15 EGP Base + 3 EGP per Km (السعر = 15 + المسافة * 3)
  baseDeliveryFee: 15,
  feePerKm: 3,        // 3 جنيهات لكل كيلومتر
  feePerMinute: 0,
  minDeliveryFee: 15,  // سعر البداية الثابت 15 جنيهاً
  areaRushMultiplier: 1.0,
  
  platformCommissionPercent: 12,
  driverCommissionPercent: 88,
  
  driverMaxDebtLimit: 500, // EGP
  autoSuspendOverDebt: true,
  dispatchRadiusKm: 10,    // Alexandria Coastal Belt Radius
  driverAcceptTimeoutSec: 45,
  dispatchMode: 'nearest_auto',
  
  // Driver Debt Repayment Bank Account
  companyBankAccount: '7071009697713907',
  companyBankName: 'البنك الأهلي المصري / انستاباي InstaPay الإسكندرية',
  companyInstaPayHandle: 'waselha.alex@instapay',
  
  paymobEnabled: true,
  paymobApiKeyMasked: 'pk_live_sec_alex_paymob_****9821',
  fawryEnabled: true,
  cashOnDeliveryEnabled: true,
  walletPaymentEnabled: true,
  paymentTestMode: true,
  
  mapProvider: 'leaflet_osm',
  googleMapsApiKeyMasked: 'AIzaSyA_ALEX_MAPS_KEY_****3811',
};

// Dynamic OTP store per phone number (maps phone -> { code, expiresAt })
export const phoneOtpStore = new Map<string, { code: string; expiresAt: number }>();

// Clean Database - Completely Zero Mock Data
export let users: User[] = [];
export let drivers: DriverProfile[] = [];
export let merchants: MerchantProfile[] = [];
export let products: MerchantProduct[] = [];
export let orders: Order[] = [];
export let chatMessages: ChatMessage[] = [];
export let supportTickets: SupportTicket[] = [];
export let auditLogs: AuditLog[] = [];
export let ledgerTransactions: DriverLedgerTransaction[] = [];
export let recruitmentApplications: StaffRecruitmentApplication[] = [];
