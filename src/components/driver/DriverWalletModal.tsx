import React, { useState } from 'react';
import { DriverProfile, DriverLedgerTransaction } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import {
  Wallet,
  AlertTriangle,
  CreditCard,
  CheckCircle2,
  X,
  History,
  ShieldCheck,
  TrendingUp,
  Receipt,
  Loader2,
  Building,
  Copy,
  Check,
  Send,
  Smartphone
} from 'lucide-react';

interface DriverWalletModalProps {
  driver: DriverProfile;
  ledgerTransactions: DriverLedgerTransaction[];
  onClose: () => void;
  onRefresh: () => void;
}

export const DriverWalletModal: React.FC<DriverWalletModalProps> = ({
  driver,
  ledgerTransactions,
  onClose,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'topup' | 'ledger'>('overview');
  const [topupAmount, setTopupAmount] = useState<number>(driver.debt > 0 ? driver.debt : 200);
  const [paymentGateway, setPaymentGateway] = useState<'bank_transfer' | 'paymob_card' | 'fawry'>('bank_transfer');
  const [bankTransferRef, setBankTransferRef] = useState('');
  const [copiedBankAcc, setCopiedBankAcc] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Bank account specifically requested by user:
  const OFFICIAL_BANK_ACCOUNT = '7071009697713907';

  // Debt ratio
  const debtPercentage = Math.min(100, Math.round((driver.debt / driver.maxDebtLimit) * 100));
  const isOverLimit = driver.debt > driver.maxDebtLimit;
  const isNearLimit = driver.debt >= driver.maxDebtLimit * 0.8;

  const handleCopyAccount = () => {
    navigator.clipboard.writeText(OFFICIAL_BANK_ACCOUNT);
    setCopiedBankAcc(true);
    setTimeout(() => setCopiedBankAcc(false), 2500);
  };

  const handleExecuteTopup = async () => {
    if (!topupAmount || topupAmount <= 0) return;
    setIsProcessing(true);
    setSuccessMessage(null);

    const ref = bankTransferRef.trim() || `INSTA-${Math.floor(100000 + Math.random() * 900000)}`;

    try {
      const res = await api.topupDriverWallet(driver.id, {
        amount: topupAmount,
        method: paymentGateway,
        gatewayRef: ref,
      });

      setSuccessMessage(
        paymentGateway === 'bank_transfer'
          ? `تم تأكيد سداد ${topupAmount} ج.م على الحساب البنكي ${OFFICIAL_BANK_ACCOUNT} وتصفية المديونية بنجاح!`
          : res.message
      );

      setTimeout(() => {
        onRefresh();
        setActiveTab('overview');
      }, 1800);
    } catch (err: any) {
      alert(err.message || 'فشلت عملية الدفع');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-white text-lg">المحفظة وسجل المديونية - وصلها اسكندرية</h3>
              <p className="text-xs text-slate-400">
                كابتن {driver.name} • {driver.vehicle.plateNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-6 pt-2 gap-2 text-sm">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 px-3 font-bold border-b-2 transition ${
              activeTab === 'overview'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            نظرة عامة والمديونية
          </button>
          <button
            onClick={() => setActiveTab('topup')}
            className={`pb-3 px-3 font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'topup'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>شحن المديونية (الحساب البنكي)</span>
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`pb-3 px-3 font-bold border-b-2 transition ${
              activeTab === 'ledger'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            سجل القيود المالية (Ledger)
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Debt Alert Banner if near or over limit */}
              {isOverLimit ? (
                <div className="p-4 rounded-2xl bg-rose-950/70 border border-rose-500/50 text-rose-200 flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-bold text-sm text-white">
                      تم تعليق استقبال الطلبات آلياً لتجاوز حد المديونية!
                    </h4>
                    <p className="text-xs text-rose-200 mt-1 leading-relaxed">
                      مديونيتك الحالية ({driver.debt} ج.م) تجاوزت الحد الأقصى المصرح به ({driver.maxDebtLimit} ج.م).
                      يرجى سداد المديونية بالتحويل إلى الحساب البنكي الرسمي لإعادة تفعيل الحساب فوراً.
                    </p>
                    <button
                      onClick={() => setActiveTab('topup')}
                      className="mt-3 px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-rose-900/40 flex items-center gap-1.5"
                    >
                      <Building className="w-4 h-4" />
                      <span>سداد المديونية على الحساب 7071009697713907</span>
                    </button>
                  </div>
                </div>
              ) : isNearLimit ? (
                <div className="p-4 rounded-2xl bg-amber-950/60 border border-amber-500/40 text-amber-200 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm text-amber-300">
                      تنبيه: اقتراب المديونية من الحد الأقصى ({driver.maxDebtLimit} ج.م)
                    </h4>
                    <p className="text-xs text-amber-200/90 mt-0.5 leading-relaxed">
                      وصلت مديونيتك إلى {driver.debt} ج.م. يُفضل سدادها على الحساب البنكي الرسمي لتجنب التعليق التلقائي.
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Balances Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-xs text-slate-400 font-medium">الرصيد الصافي</span>
                  <div className="text-2xl font-black text-white mt-1">
                    {driver.currentBalance.toFixed(1)} <span className="text-xs font-normal text-slate-400">ج.م</span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">رصيد المحفظة الفعلي</span>
                </div>

                <div className={`p-4 rounded-2xl border ${
                  isOverLimit
                    ? 'bg-rose-950/40 border-rose-600/60'
                    : 'bg-slate-950 border-slate-800'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-medium">المديونية الحالية</span>
                    <span className="text-[11px] font-bold text-amber-400">الحد: {driver.maxDebtLimit} ج.م</span>
                  </div>
                  <div className={`text-2xl font-black mt-1 ${isOverLimit ? 'text-rose-400' : 'text-amber-400'}`}>
                    {driver.debt.toFixed(1)} <span className="text-xs font-normal text-slate-400">ج.م</span>
                  </div>
                  
                  {/* Progress Bar for Debt */}
                  <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isOverLimit ? 'bg-rose-500' : isNearLimit ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${debtPercentage}%` }}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-xs text-slate-400 font-medium">أرباح التوصيل بالإسكندرية</span>
                  <div className="text-2xl font-black text-emerald-400 mt-1">
                    {driver.totalEarnings.toFixed(1)} <span className="text-xs font-normal text-slate-400">ج.م</span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">{driver.totalOrdersCompleted} طلب مكتمل</span>
                </div>
              </div>

              {/* Official Bank Account Quick Box */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/50 via-slate-950 to-slate-950 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                    🏛️
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">الحساب البنكي المعتمد لشحن مديونيات المناديب</h4>
                    <p className="text-xs text-slate-300 font-mono mt-0.5">
                      رقم الحساب: <strong className="text-amber-400 text-sm tracking-wider">{OFFICIAL_BANK_ACCOUNT}</strong>
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleCopyAccount}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 border border-slate-700 whitespace-nowrap"
                >
                  {copiedBankAcc ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-400" />}
                  <span>{copiedBankAcc ? 'تم النسخ بنجاح' : 'نسخ رقم الحساب'}</span>
                </button>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setActiveTab('topup')}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition flex items-center gap-2 shadow-lg shadow-amber-500/20"
                >
                  <Building className="w-4 h-4" />
                  <span>سداد المديونية وشحن الرصيد الآن</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: TOP-UP & SETTLE DEBT VIA BANK ACCOUNT */}
          {activeTab === 'topup' && (
            <div className="space-y-6">
              {successMessage ? (
                <div className="p-6 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-center space-y-2">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                  <h4 className="font-bold text-white text-base">تمت العملية بنجاح!</h4>
                  <p className="text-sm text-emerald-300">{successMessage}</p>
                </div>
              ) : (
                <>
                  {/* Bank Account Highlights Card */}
                  <div className="p-5 rounded-2xl bg-slate-950 border-2 border-amber-500/50 space-y-3 shadow-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building className="w-5 h-5 text-amber-400" />
                        <h4 className="font-black text-white text-sm">
                          بيانات الحساب البنكي الرسمي (شحن المديونية)
                        </h4>
                      </div>
                      <span className="text-[11px] bg-amber-500/20 text-amber-400 font-bold px-2 py-0.5 rounded-lg border border-amber-500/30">
                        معتمد رسمياً
                      </span>
                    </div>

                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">رقم الحساب البنكي:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-base font-black text-amber-400 tracking-wider">
                            {OFFICIAL_BANK_ACCOUNT}
                          </span>
                          <button
                            type="button"
                            onClick={handleCopyAccount}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                            title="نسخ رقم الحساب"
                          >
                            {copiedBankAcc ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">البنك / الخدمة:</span>
                        <span className="font-bold text-white">البنك الأهلي المصري / انستاباي InstaPay</span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">عنوان انستاباي:</span>
                        <span className="font-mono text-emerald-400 font-bold">waselha.alex@instapay</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      💡 يمكنك التحويل مباشرة عبر تطبيق <strong>انستاباي (InstaPay)</strong> أو من خلال أي تطبيق بنكي مصري أو إيداع فوري ماكينة الصراف ATM.
                    </p>
                  </div>

                  {/* Payment Gateway Options Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-2">
                      طريقة السداد والشحن
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div
                        onClick={() => setPaymentGateway('bank_transfer')}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-center gap-2.5 ${
                          paymentGateway === 'bank_transfer'
                            ? 'bg-amber-500/10 border-amber-500 text-white shadow-lg'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <Building className="w-5 h-5 text-amber-400 shrink-0" />
                        <div>
                          <h5 className="font-bold text-xs text-white">حساب بنكي / InstaPay</h5>
                          <p className="text-[10px] text-slate-400">الحساب 7071009697713907</p>
                        </div>
                      </div>

                      <div
                        onClick={() => setPaymentGateway('paymob_card')}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-center gap-2.5 ${
                          paymentGateway === 'paymob_card'
                            ? 'bg-amber-500/10 border-amber-500 text-white shadow-lg'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <CreditCard className="w-5 h-5 text-blue-400 shrink-0" />
                        <div>
                          <h5 className="font-bold text-xs text-white">بطاقة بنكية / فيزا</h5>
                          <p className="text-[10px] text-slate-400">بوابة Paymob مصر</p>
                        </div>
                      </div>

                      <div
                        onClick={() => setPaymentGateway('fawry')}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-center gap-2.5 ${
                          paymentGateway === 'fawry'
                            ? 'bg-amber-500/10 border-amber-500 text-white shadow-lg'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <Smartphone className="w-5 h-5 text-amber-400 shrink-0" />
                        <div>
                          <h5 className="font-bold text-xs text-white">فوري Fawry Pay</h5>
                          <p className="text-[10px] text-slate-400">كود دفع فوري</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Amount Selectors */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold text-slate-300">
                        مبلغ الشحن / السداد (ج.م)
                      </label>
                      {driver.debt > 0 && (
                        <button
                          type="button"
                          onClick={() => setTopupAmount(driver.debt)}
                          className="text-[11px] text-amber-400 hover:underline font-bold"
                        >
                          سداد كامل المديونية ({driver.debt} ج.م)
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {[100, 200, 500, 1000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setTopupAmount(amt)}
                          className={`py-2 px-3 rounded-xl border text-sm font-bold transition ${
                            topupAmount === amt
                              ? 'bg-amber-500 text-slate-950 border-amber-500'
                              : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          {amt} ج.م
                        </button>
                      ))}
                    </div>

                    <input
                      type="number"
                      min="10"
                      value={topupAmount}
                      onChange={(e) => setTopupAmount(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-lg font-black text-white focus:outline-none focus:border-amber-500"
                      placeholder="أدخل مبلغ السداد"
                    />
                  </div>

                  {/* Transfer Reference / Note Input */}
                  {paymentGateway === 'bank_transfer' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        رقم الإيصال / الرقم المرجعي للتحويل البنكي (اختياري)
                      </label>
                      <input
                        type="text"
                        value={bankTransferRef}
                        onChange={(e) => setBankTransferRef(e.target.value)}
                        placeholder="مثال: رفعت التحويل من انستاباي / مرجع البنك #89210"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  )}

                  <button
                    onClick={handleExecuteTopup}
                    disabled={isProcessing || topupAmount <= 0}
                    className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-base transition flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>جاري تسجيل وتأكيد السداد...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        <span>تأكيد سداد {topupAmount} ج.م وتسوية المديونية فوراً</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          )}

          {/* TAB 3: LEDGER TRANSACTIONS */}
          {activeTab === 'ledger' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-amber-400" />
                  سجل القيود المالية الثابتة (Ledger Audit Log)
                </h4>
                <span className="text-xs text-slate-500">لا يمكن تعديل العمليات السابقة</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold bg-slate-950/60">
                      <th className="py-2.5 px-3">رقم العملية</th>
                      <th className="py-2.5 px-3">التاريخ</th>
                      <th className="py-2.5 px-3">الوصف</th>
                      <th className="py-2.5 px-3">المبلغ</th>
                      <th className="py-2.5 px-3">المديونية بعدها</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {ledgerTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-2.5 px-3 font-mono text-slate-300 font-medium">
                          {tx.transactionNumber}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">{tx.date}</td>
                        <td className="py-2.5 px-3 text-slate-200">{tx.description}</td>
                        <td className={`py-2.5 px-3 font-bold whitespace-nowrap ${
                          tx.amount > 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {tx.amount > 0 ? `+${tx.amount}` : tx.amount} ج.م
                        </td>
                        <td className="py-2.5 px-3 font-bold text-amber-400 whitespace-nowrap">
                          {tx.debtAfter} ج.م
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
