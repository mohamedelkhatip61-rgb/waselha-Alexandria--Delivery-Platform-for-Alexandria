import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api.ts';
import { ChatMessage, UserRole } from '../../types/index.ts';
import { Send, Phone, ShieldCheck, Image as ImageIcon, X, CheckCheck, Loader2 } from 'lucide-react';

interface ChatPanelProps {
  orderId?: string;
  roomId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserRole: UserRole;
  counterpartName: string;
  counterpartRoleTitle: string;
  counterpartPhone?: string;
  onClose: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  orderId,
  roomId,
  currentUserId,
  currentUserName,
  currentUserRole,
  counterpartName,
  counterpartRoleTitle,
  counterpartPhone,
  onClose,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [callingState, setCallingState] = useState<'idle' | 'calling' | 'connected'>('idle');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickReplies = [
    'أنا في طريقي إليك الآن 🛵',
    'وصلت عند مدخل العمارة 🏢',
    'المبلغ جاهز كاش بالظبط 💵',
    'يرجى رن الجرس عند الوصول 🔔',
  ];

  const fetchMessages = async () => {
    try {
      const res = await api.getChatMessages(roomId);
      if (res.data) setMessages(res.data);
    } catch (err) {
      console.error('Failed to load chat messages:', err);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3500);
    return () => clearInterval(interval);
  }, [roomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputVal.trim();
    if (!text) return;

    setInputVal('');
    setLoading(true);

    try {
      await api.sendChatMessage(roomId, {
        senderId: currentUserId,
        senderName: currentUserName,
        senderRole: currentUserRole,
        text,
      });
      await fetchMessages();
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMaskedCall = () => {
    setCallingState('calling');
    setTimeout(() => {
      setCallingState('connected');
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col h-[600px] max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-lg">
              💬
            </div>
            <div>
              <h3 className="font-bold text-white text-base leading-tight flex items-center gap-1.5">
                {counterpartName}
                <span className="text-xs font-normal text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/40">
                  {counterpartRoleTitle}
                </span>
              </h3>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                محادثة مشفرة وآمنة داخل التطبيق
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Safe Call Button */}
            <button
              onClick={handleMaskedCall}
              title="اتصال آمن بدون إظهار الرقم الشخصي"
              className="p-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 transition flex items-center gap-1 text-xs font-medium"
            >
              <Phone className="w-4 h-4" />
              <span className="hidden sm:inline">اتصال آمن</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Masked Call Active Overlay Modal */}
        {callingState !== 'idle' && (
          <div className="absolute inset-x-0 top-0 z-20 bg-slate-950/95 border-b border-emerald-500/40 p-4 text-center animate-slideDown shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2 animate-bounce border border-emerald-500/50">
              <Phone className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-white text-sm">
              {callingState === 'calling' ? 'جاري الاتصال الآمن بالمندوب...' : 'المكالمة جارية الآن'}
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              تم حجب رقم هاتفك لحماية الخصوصية (رقم افتراضي: 02-3301XXXX)
            </p>
            <button
              onClick={() => setCallingState('idle')}
              className="mt-3 px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition"
            >
              إنهاء المكالمة
            </button>
          </div>
        )}

        {/* Message Thread */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-950/40">
          <div className="text-center my-2">
            <span className="text-[11px] text-slate-500 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
              بدأت المحادثة للطلب {orderId ? `#${orderId}` : ''}
            </span>
          </div>

          {messages.map((m) => {
            const isMe = m.senderId === currentUserId;
            return (
              <div
                key={m.id}
                className={`flex flex-col ${isMe ? 'items-start' : 'items-end'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                    isMe
                      ? 'bg-emerald-600 text-white rounded-br-none shadow-md shadow-emerald-900/20'
                      : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700'
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                  {m.imageUrl && (
                    <img
                      src={m.imageUrl}
                      alt="attachment"
                      className="mt-2 rounded-lg max-h-44 object-cover border border-white/20"
                    />
                  )}
                  <div
                    className={`flex items-center gap-1 text-[10px] mt-1 ${
                      isMe ? 'text-emerald-200 justify-start' : 'text-slate-400 justify-end'
                    }`}
                  >
                    <span>{m.timestamp}</span>
                    {isMe && <CheckCheck className="w-3.5 h-3.5" />}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Replies Carousel */}
        <div className="px-3 py-2 bg-slate-900/90 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {quickReplies.map((reply, i) => (
            <button
              key={i}
              onClick={() => handleSend(reply)}
              className="text-xs whitespace-nowrap bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1 rounded-full border border-slate-700/60 transition"
            >
              {reply}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="اكتب رسالتك هنا..."
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
          />

          <button
            onClick={() => handleSend()}
            disabled={!inputVal.trim() || loading}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white p-2.5 rounded-xl transition shadow-lg shadow-emerald-600/30 flex items-center justify-center"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
