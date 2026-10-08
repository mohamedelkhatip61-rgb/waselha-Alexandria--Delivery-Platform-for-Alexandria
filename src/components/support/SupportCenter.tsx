import React, { useState, useEffect } from 'react';
import { SupportTicket, UserRole } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import {
  LifeBuoy,
  PlusCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
  MessageSquare,
  Send,
  Loader2,
  Tag
} from 'lucide-react';

interface SupportCenterProps {
  currentUserId: string;
  currentUserName: string;
  currentUserRole: UserRole;
  currentUserPhone: string;
  onClose: () => void;
}

export const SupportCenter: React.FC<SupportCenterProps> = ({
  currentUserId,
  currentUserName,
  currentUserRole,
  currentUserPhone,
  onClose,
}) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [activeTab, setActiveTab] = useState<'my_tickets' | 'new_ticket'>('my_tickets');
  const [issueType, setIssueType] = useState<any>('مشكلة في الطلب');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(true);

  const fetchTickets = async () => {
    try {
      setLoadingTickets(true);
      const res = await api.getSupportTickets({ userId: currentUserId });
      if (res.data) setTickets(res.data);
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;

    setIsSubmitting(true);
    try {
      await api.createSupportTicket({
        userId: currentUserId,
        userName: currentUserName,
        userRole: currentUserRole,
        userPhone: currentUserPhone,
        issueType,
        subject,
        description,
        priority,
      });

      setSubject('');
      setDescription('');
      await fetchTickets();
      setActiveTab('my_tickets');
    } catch (err: any) {
      alert(err.message || 'فشل إرسال التذكرة');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-white text-base">مركز الدعم والمساعدة | وصلها مصر</h3>
              <p className="text-xs text-slate-400">خدمة دعم فني 24/7 لجميع المشكلات والطلبات</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-6 pt-2 gap-3 text-sm">
          <button
            onClick={() => setActiveTab('my_tickets')}
            className={`pb-3 px-3 font-bold border-b-2 transition ${
              activeTab === 'my_tickets'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            تذاكري المفتوحة ({tickets.length})
          </button>
          <button
            onClick={() => setActiveTab('new_ticket')}
            className={`pb-3 px-3 font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'new_ticket'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            فتح تذكرة دعم جديدة
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'my_tickets' ? (
            loadingTickets ? (
              <div className="py-12 text-center text-slate-500 flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                <span>جاري تحميل التذاكر...</span>
              </div>
            ) : tickets.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  ✓
                </div>
                <h4 className="font-bold text-white text-base">لا توجد لديك تذاكر دعم حالياً</h4>
                <p className="text-xs text-slate-500">
                  إذا واجهتك أي مشكلة في توصيل، دفع، أو إعدادات الحساب يمكنك فتح تذكرة وسنرد فوراً.
                </p>
                <button
                  onClick={() => setActiveTab('new_ticket')}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition"
                >
                  فتح تذكرة جديدة
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map((tkt) => (
                  <div
                    key={tkt.id}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-amber-400 font-bold">
                          {tkt.ticketNumber}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium border border-slate-700">
                          {tkt.issueType}
                        </span>
                      </div>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                        tkt.status === 'Resolved'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : tkt.status === 'Open'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800'
                          : 'bg-blue-950 text-blue-400 border border-blue-800'
                      }`}>
                        {tkt.status === 'Open' ? 'مفتوحة' : tkt.status === 'Resolved' ? 'تم الحل' : tkt.status}
                      </span>
                    </div>

                    <h4 className="font-bold text-white text-sm">{tkt.subject}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">{tkt.description}</p>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-[11px] text-slate-500">
                      <span>فريق المتابعة: {tkt.assignedTo || 'خدمة العملاء'}</span>
                      <span>{new Date(tkt.createdAt).toLocaleDateString('ar-EG')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  نوع المشكلة أو الاستفسار
                </label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="مشكلة في الطلب">مشكلة في الطلب وتأخر الوجبة</option>
                  <option value="مشكلة في التوصيل">مشكلة في التوصيل وموقع المندوب</option>
                  <option value="مدفوعات ومحفظة">مدفوعات ومحفظة وفوري / Paymob</option>
                  <option value="حساب ومستندات">حساب ومستندات المندوب أو التاجر</option>
                  <option value="شكوى أخرى">شكوى أخرى أو مقترح</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  عنوان المشكلة باختصار
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="مثال: لم يتم تحديث رصيد الشحن في المحفظة"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  تفاصيل الشكوى
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="اشرح المشكلة بدقة مع ذكر رقم الطلب إن وجد..."
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('my_tickets')}
                  className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-emerald-700/30"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>إرسال التذكرة لفريق الدعم</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
