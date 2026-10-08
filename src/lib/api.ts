import {
  DriverProfile,
  MerchantProfile,
  MerchantProduct,
  Order,
  ChatMessage,
  SupportTicket,
  AuditLog,
  SystemSettings,
  User,
  DriverLedgerTransaction,
  StaffRecruitmentApplication,
} from '../types/index.ts';

const API_BASE = '/api';

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('waselha_token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json();
  if (!res.ok || data.success === false) {
    if ((res.status === 401 || res.status === 403) && data.redirect) {
      if (typeof window !== 'undefined' && window.location.pathname.includes('admin')) {
        window.history.pushState(null, '', data.redirect);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    }
    throw new Error(data.message || 'حدث خطأ في الاتصال بالنظام');
  }
  return data;
}

export const api = {
  // Settings
  getSettings: () => fetchApi<{ success: boolean; data: SystemSettings }>('/settings'),
  updateSettings: (updates: Partial<SystemSettings>) =>
    fetchApi<{ success: boolean; data: SystemSettings }>('/settings', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  // Auth & OTP (Egyptian Phone & 30s Auto-OTP Only)
  requestOtp: (phone: string) =>
    fetchApi<{
      success: boolean;
      message: string;
      code: string;
      expiresInSeconds: number;
      devMode?: boolean;
      smsFailed?: boolean;
    }>('/auth/otp-request', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),
  verifyOtp: (payload: {
    phone: string;
    code: string;
    password?: string;
    role?: string;
    name?: string;
    isMerchantAccount?: boolean;
    alexandriaAreas?: string[];
    vehicleType?: string;
    plateNumber?: string;
    vehicleModel?: string;
    documents?: any[];
  }) =>
    fetchApi<{
      success: boolean;
      user: User;
      token: string;
      regenerate?: boolean;
      newCode?: string;
      expiresInSeconds?: number;
      message?: string;
    }>('/auth/otp-verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  loginWithPassword: (payload: { phone: string; password: string }) =>
    fetchApi<{ success: boolean; user: User; token: string; message?: string }>('/auth/login-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  adminLogin: (payload: { username?: string; phone?: string; password: string }) =>
    fetchApi<{ success: boolean; user: User; token: string; message?: string }>('/admin/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getMe: () => fetchApi<{ success: boolean; user: User; isAdmin: boolean }>('/auth/me'),
  registerMerchant: (merchantData: any) =>
    fetchApi<{ success: boolean; data: MerchantProfile }>('/merchants/register', {
      method: 'POST',
      body: JSON.stringify(merchantData),
    }),

  // Merchants & Products
  getMerchants: (params?: { category?: string; search?: string; lat?: number; lng?: number }) => {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.search) query.append('search', params.search);
    if (params?.lat) query.append('lat', String(params.lat));
    if (params?.lng) query.append('lng', String(params.lng));
    return fetchApi<{ success: boolean; data: (MerchantProfile & { distanceKm?: number })[] }>(
      `/merchants?${query.toString()}`
    );
  },
  getMerchantDetails: (id: string) =>
    fetchApi<{ success: boolean; merchant: MerchantProfile; products: MerchantProduct[] }>(
      `/merchants/${id}`
    ),
  addProduct: (merchantId: string, productData: Partial<MerchantProduct>) =>
    fetchApi<{ success: boolean; data: MerchantProduct }>(`/merchants/${merchantId}/products`, {
      method: 'POST',
      body: JSON.stringify(productData),
    }),
  updateProduct: (id: string, updates: Partial<MerchantProduct>) =>
    fetchApi<{ success: boolean; data: MerchantProduct }>(`/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  // Orders
  getOrders: (params?: { customerId?: string; driverId?: string; merchantId?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.customerId) query.append('customerId', params.customerId);
    if (params?.driverId) query.append('driverId', params.driverId);
    if (params?.merchantId) query.append('merchantId', params.merchantId);
    if (params?.status) query.append('status', params.status);
    return fetchApi<{ success: boolean; data: Order[] }>(`/orders?${query.toString()}`);
  },
  getOrder: (id: string) => fetchApi<{ success: boolean; data: Order }>(`/orders/${id}`),
  createOrder: (payload: any) =>
    fetchApi<{ success: boolean; data: Order }>('/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateOrderStatus: (id: string, payload: { status: string; driverId?: string; note?: string; proofUrl?: string }) =>
    fetchApi<{ success: boolean; data: Order }>(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  rateOrder: (id: string, payload: { driverScore: number; merchantScore: number; comment?: string }) =>
    fetchApi<{ success: boolean; data: Order }>(`/orders/${id}/rate`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Drivers
  getDrivers: (params?: { status?: string; isOnline?: boolean; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.isOnline !== undefined) query.append('isOnline', String(params.isOnline));
    if (params?.search) query.append('search', params.search);
    return fetchApi<{ success: boolean; data: DriverProfile[] }>(`/drivers?${query.toString()}`);
  },
  getDriverDetails: (id: string) =>
    fetchApi<{ success: boolean; driver: DriverProfile; ledger: DriverLedgerTransaction[] }>(`/drivers/${id}`),
  registerDriver: (driverData: any) =>
    fetchApi<{ success: boolean; data: DriverProfile }>('/drivers/register', {
      method: 'POST',
      body: JSON.stringify(driverData),
    }),
  toggleDriverOnline: (id: string) =>
    fetchApi<{ success: boolean; isOnline: boolean; driver: DriverProfile }>(`/drivers/${id}/toggle-online`, {
      method: 'POST',
    }),
  updateDriverLocation: (id: string, loc: { lat: number; lng: number; addressName?: string; heading?: number; speed?: number }) =>
    fetchApi<{ success: boolean; coordinates: any }>(`/drivers/${id}/location`, {
      method: 'PATCH',
      body: JSON.stringify(loc),
    }),
  topupDriverWallet: (id: string, payload: { amount: number; method: string; gatewayRef?: string }) =>
    fetchApi<{ success: boolean; message: string; driver: DriverProfile; transaction: DriverLedgerTransaction }>(
      `/drivers/${id}/wallet/topup`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),
  updateDriverStatus: (id: string, payload: { status?: string; rejectionReason?: string; maxDebtLimit?: number }) =>
    fetchApi<{ success: boolean; driver: DriverProfile }>(`/drivers/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  // Chats
  getChatMessages: (roomId: string) =>
    fetchApi<{ success: boolean; data: ChatMessage[] }>(`/chats/${roomId}`),
  sendChatMessage: (roomId: string, message: { senderId: string; senderName: string; senderRole: string; text: string; imageUrl?: string }) =>
    fetchApi<{ success: boolean; data: ChatMessage }>(`/chats/${roomId}`, {
      method: 'POST',
      body: JSON.stringify(message),
    }),

  // Support
  getSupportTickets: (params?: { userId?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.userId) query.append('userId', params.userId);
    if (params?.status) query.append('status', params.status);
    return fetchApi<{ success: boolean; data: SupportTicket[] }>(`/support/tickets?${query.toString()}`);
  },
  createSupportTicket: (ticket: Partial<SupportTicket>) =>
    fetchApi<{ success: boolean; data: SupportTicket }>('/support/tickets', {
      method: 'POST',
      body: JSON.stringify(ticket),
    }),
  updateSupportTicket: (id: string, updates: Partial<SupportTicket>) =>
    fetchApi<{ success: boolean; data: SupportTicket }>(`/support/tickets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  // Admin KPIs & Audits
  getAdminStats: () =>
    fetchApi<{
      success: boolean;
      data: {
        totalCustomers: number;
        totalMerchants: number;
        totalDrivers: number;
        onlineDrivers: number;
        activeOrders: number;
        completedOrders: number;
        cancelledOrders: number;
        totalSales: number;
        totalCommissions: number;
        totalDeliveryFees: number;
        totalDriverDebts: number;
        totalSupportTicketsOpen: number;
      };
    }>('/admin/stats'),
  getAuditLogs: () => fetchApi<{ success: boolean; data: AuditLog[] }>('/admin/audit-logs'),

  // Recruitment ("تعيين جديد") APIs
  applyRecruitment: (payload: {
    fullName: string;
    phone: string;
    nationalId: string;
    personalPhoto?: string;
    nationalIdCardPhoto?: string;
    roleRequested?: 'Staff' | 'Driver';
  }) =>
    fetchApi<{ success: boolean; application: StaffRecruitmentApplication; message?: string }>('/recruitment/apply', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getRecruitmentApplications: () =>
    fetchApi<{ success: boolean; data: StaffRecruitmentApplication[] }>('/recruitment/applications'),
  updateRecruitmentStatus: (id: string, payload: { status: 'approved' | 'rejected'; rejectionReason?: string }) =>
    fetchApi<{ success: boolean; application: StaffRecruitmentApplication; message?: string }>(`/recruitment/applications/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  // Admin whitelist & password setup/change APIs
  checkAdminPhone: (phone: string) =>
    fetchApi<{ success: boolean; isWhitelisted: boolean; hasPassword: boolean; message?: string }>(`/admin/check-phone?phone=${encodeURIComponent(phone)}`),
  setupAdminPassword: (payload: { phone: string; password: string }) =>
    fetchApi<{ success: boolean; user: User; token: string; message?: string }>('/admin/setup-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  changeAdminPassword: (payload: { phone: string; oldPassword?: string; newPassword: string }) =>
    fetchApi<{ success: boolean; message?: string }>('/admin/change-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  summarizeIssue: (payload: { title: string; description: string; orderNumber?: string }) =>
    fetchApi<{ success: boolean; summary: string }>('/admin/summarize-issue', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
