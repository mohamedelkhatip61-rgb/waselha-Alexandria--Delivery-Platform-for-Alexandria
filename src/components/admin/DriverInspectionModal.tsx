import React, { useState } from 'react';
import { DriverProfile, DriverStatus } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import {
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  X,
  Shield,
  Truck,
  Phone,
  MapPin,
  Calendar,
  Lock,
  Unlock,
  Sliders,
  ExternalLink
} from 'lucide-react';

interface DriverInspectionModalProps {
  driver: DriverProfile;
  onClose: () => void;
  onRefresh: () => void;
}

export const DriverInspectionModal: React.FC<DriverInspectionModalProps> = ({
  driver,
  onClose,
  onRefresh,
}) => {
  const [status, setStatus] = useState<DriverStatus>(driver.status);
  const [rejectionReason, setRejectionReason] = useState(driver.rejectionReason || '');
  const [customDebtLimit, setCustomDebtLimit] = useState(driver.maxDebtLimit);
  const [selectedDocPreview, setSelectedDocPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUpdateStatus = async (newStatus: DriverStatus) => {
    setIsSubmitting(true);
    try {
      await api.updateDriverStatus(driver.id, {
        status: newStatus,
        rejectionReason: newStatus === 'Rejected' || newStatus === 'Suspended' ? rejectionReason : undefined,
        maxDebtLimit: customDebtLimit,
      });
      onRefresh();
      onClose();
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء تحديث حالة المندوب');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDebtLimit = async () => {
    setIsSubmitting(true);
    try {
      await api.updateDriverStatus(driver.id, {
        maxDebtLimit: customDebtLimit,
      });
      alert('تم تحديث سقف المديونية بنجاح');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'خطأ أثناء الحفظ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={driver.avatar}
              alt={driver.name}
              className="w-12 h-12 rounded-2xl object-cover border-2 border-slate-700"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-white text-lg">{driver.name}</h3>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                  driver.status === 'Approved'
                    ? 'bg-emerald-950/70 text-emerald-400 border-emerald-800'
                    : driver.status === 'Pending Review'
                    ? 'bg-amber-950/70 text-amber-400 border-amber-800 animate-pulse'
                    : 'bg-rose-950/70 text-rose-400 border-rose-800'
                }`}>
                  {driver.status === 'Approved' ? 'معتمد' : driver.status === 'Pending Review' ? 'بانتظار المراجعة' : driver.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <span dir="ltr">{driver.phone}</span>
                <span>•</span>
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <span>{driver.governorate} ({driver.area})</span>
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

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 font-medium">المركبة واللوحة</span>
              <p className="font-bold text-white text-sm mt-0.5">
                {driver.vehicle.model}
              </p>
              <span className="text-xs font-mono text-amber-400 mt-0.5 block">{driver.vehicle.plateNumber}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 font-medium">المديونية / السقف</span>
              <p className={`font-bold text-sm mt-0.5 ${driver.debt > driver.maxDebtLimit ? 'text-rose-400' : 'text-slate-200'}`}>
                {driver.debt} / {driver.maxDebtLimit} ج.م
              </p>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                {driver.debt > driver.maxDebtLimit ? 'متجاوز الحد ⚠️' : 'ضمن الحد الآمن'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 font-medium">الطلبات المكتملة</span>
              <p className="font-bold text-emerald-400 text-sm mt-0.5">
                {driver.totalOrdersCompleted} طلب
              </p>
              <span className="text-[11px] text-slate-500 mt-0.5 block">التقييم: ★ {driver.rating}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 font-medium">حالة الاتصال</span>
              <p className="font-bold text-sm mt-0.5 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${driver.isOnline ? 'bg-emerald-500 animate-ping' : 'bg-slate-600'}`} />
                <span className={driver.isOnline ? 'text-emerald-400' : 'text-slate-400'}>
                  {driver.isOnline ? 'متصل (Online)' : 'غير متصل (Offline)'}
                </span>
              </p>
              <span className="text-[11px] text-slate-500 mt-0.5 block truncate">
                {driver.currentLocation.addressName || 'القاهرة'}
              </span>
            </div>
          </div>

          {/* Section: Documents Verification */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              مستندات المندوب المرفوعة للمراجعة والتدقيق
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {driver.documents.map((doc, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-bold text-slate-200">{doc.titleAr}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      doc.status === 'verified'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-amber-950 text-amber-400 border border-amber-800'
                    }`}>
                      {doc.status === 'verified' ? 'موثق' : 'قيد الفحص'}
                    </span>
                  </div>

                  <div
                    onClick={() => setSelectedDocPreview(doc.fileUrl)}
                    className="relative h-28 w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-800 cursor-pointer group"
                  >
                    <img
                      src={doc.fileUrl}
                      alt={doc.titleAr}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white text-xs font-bold gap-1">
                      <ExternalLink className="w-4 h-4" />
                      تكبير المستند
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Document Preview Lightbox Modal */}
          {selectedDocPreview && (
            <div
              onClick={() => setSelectedDocPreview(null)}
              className="fixed inset-0 z-50 bg-black/90 p-4 flex items-center justify-center cursor-pointer animate-fadeIn"
            >
              <div className="relative max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl border border-slate-700 bg-slate-950">
                <img src={selectedDocPreview} alt="doc preview" className="w-full h-auto object-contain max-h-[80vh]" />
                <button
                  onClick={() => setSelectedDocPreview(null)}
                  className="absolute top-3 right-3 bg-black/70 text-white p-2 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Section: Custom Debt Limit Adjuster */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h5 className="font-bold text-white text-sm flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-amber-400" />
                تحديد سقف المديونية الخاص بهذا المندوب (EGP Max Debt Limit)
              </h5>
              <p className="text-xs text-slate-400 mt-0.5">
                إذا تجاوز المندوب هذا المبلغ سيتم إيقاف حسابه آلياً عن استقبال طلبات كاش جديدة.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                value={customDebtLimit}
                onChange={(e) => setCustomDebtLimit(Number(e.target.value))}
                className="w-28 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-white text-center focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={handleSaveDebtLimit}
                disabled={isSubmitting}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition border border-slate-700"
              >
                تحديث السقف
              </button>
            </div>
          </div>

          {/* Section: Reason for Rejection / Suspension if any */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              ملاحظات أو سبب الرفض / التعليق (تظهر للمندوب في التطبيق)
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="اكتب ملاحظة واضحة أو سبب الرفض إن وجد..."
              rows={2}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Admin Decision Actions */}
          <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              onClick={() => handleUpdateStatus('Approved')}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-lg shadow-emerald-700/20"
            >
              <CheckCircle className="w-4 h-4" />
              <span>اعتماد وتفعيل المندوب (Approve)</span>
            </button>

            <button
              onClick={() => handleUpdateStatus('Suspended')}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition flex items-center gap-1.5"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>إيقاف مؤقت (Suspend)</span>
            </button>

            <button
              onClick={() => handleUpdateStatus('Rejected')}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition flex items-center gap-1.5"
            >
              <XCircle className="w-4 h-4" />
              <span>رفض المستندات (Reject)</span>
            </button>

            <button
              onClick={() => handleUpdateStatus('Blocked')}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 font-bold text-xs transition flex items-center gap-1.5 border border-rose-900/50"
            >
              <Lock className="w-4 h-4" />
              <span>حظر نهائي (Block)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
