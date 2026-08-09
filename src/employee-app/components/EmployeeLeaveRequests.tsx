import React, { useState } from 'react';
import { useEmployeeContext } from '../context/EmployeeContext';

interface EmployeeLeaveRequestsProps {
  employee: any;
  onLogout: () => void;
}

export const EmployeeLeaveRequests: React.FC<EmployeeLeaveRequestsProps> = ({ employee, onLogout }) => {
  const { theme, toggleTheme } = useEmployeeContext();
  const isDark = theme === 'dark';

  const [showForm, setShowForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  // بيانات الإجازات التجريبية
  const leaveTypes = [
    { id: 1, name: 'إجازة سنوية', nameEn: 'Annual Leave', daysAvailable: 18 },
    { id: 2, name: 'إجازة مرضية', nameEn: 'Sick Leave', daysAvailable: 10 },
    { id: 3, name: 'إجازة طارئة', nameEn: 'Emergency Leave', daysAvailable: 3 },
    { id: 4, name: 'إجازة بدون راتب', nameEn: 'Unpaid Leave', daysAvailable: 30 }
  ];

  const mockRequests = [
    {
      id: '1',
      leaveType: 'إجازة سنوية',
      startDate: '2026-08-15',
      endDate: '2026-08-20',
      totalDays: 5,
      reason: 'قضاء عطلة عائلية',
      status: 'pending',
      appliedDate: '2026-08-08',
      approvedBy: null,
      approvedDate: null
    },
    {
      id: '2',
      leaveType: 'إجازة مرضية',
      startDate: '2026-07-10',
      endDate: '2026-07-12',
      totalDays: 2,
      reason: 'مرض طارئ',
      status: 'approved',
      appliedDate: '2026-07-09',
      approvedBy: 'مدير الموارد البشرية',
      approvedDate: '2026-07-09'
    },
    {
      id: '3',
      leaveType: 'إجازة سنوية',
      startDate: '2026-06-01',
      endDate: '2026-06-05',
      totalDays: 4,
      reason: 'قضاء عطلة الصيف',
      status: 'approved',
      appliedDate: '2026-05-25',
      approvedBy: 'المدير المباشر',
      approvedDate: '2026-05-28'
    },
    {
      id: '4',
      leaveType: 'إجازة طارئة',
      startDate: '2026-05-15',
      endDate: '2026-05-15',
      totalDays: 1,
      reason: 'حالة عائلية طارئة',
      status: 'rejected',
      appliedDate: '2026-05-15',
      approvedBy: 'المدير المباشر',
      approvedDate: '2026-05-15',
      rejectionReason: 'يجب تقديم طلب الإجازة مسبقاً إلا في حالات الطوارئ القصوى'
    }
  ];

  const [newRequest, setNewRequest] = useState({
    leaveTypeId: leaveTypes[0].id,
    startDate: '',
    endDate: '',
    reason: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // محاكاة إرسال الطلب
      await new Promise(resolve => setTimeout(resolve, 1500));

      // في الإنتاج، هذا سيكون استدعاء API حقيقي
      console.log('Submitting leave request:', newRequest);

      setShowForm(false);
      setNewRequest({
        leaveTypeId: leaveTypes[0].id,
        startDate: '',
        endDate: '',
        reason: ''
      });
    } catch (error) {
      console.error('Error submitting request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return isDark ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-amber-100 text-amber-700 border-amber-300';
      case 'approved':
        return isDark ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-green-100 text-green-700 border-green-300';
      case 'rejected':
        return isDark ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-rose-100 text-rose-700 border-rose-300';
      default:
        return isDark ? 'bg-slate-700 text-slate-300 border-slate-600' : 'bg-slate-200 text-slate-700 border-slate-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'قيد الانتظار';
      case 'approved':
        return 'مقبول';
      case 'rejected':
        return 'مرفوض';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-IQ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateDays = () => {
    if (!newRequest.startDate || !newRequest.endDate) return 0;
    const start = new Date(newRequest.startDate);
    const end = new Date(newRequest.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 space-y-5">
      {/* Mobile Top Bar */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">event_available</span>
          </div>
          <div>
            <h1 className={`text-base font-black leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              طلبات ورصيد الإجازات
            </h1>
            <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              تابع رصيدك وقدم طلبات إجازة جديدة
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-teal-500/20 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-base">add</span>
          <span>طلب جديد</span>
        </button>
      </div>

      {/* Leave Balance Grid 2x2 */}
      <div>
        <h2 className={`text-xs font-bold mb-2.5 px-1 uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          رصيد الإجازات المتاحة
        </h2>
        <div className="grid grid-cols-2 gap-2.5">
          {leaveTypes.map(type => (
            <div key={type.id} className={`p-3.5 rounded-2xl border transition-all ${
              isDark ? 'bg-[#131b2e] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="material-symbols-outlined text-teal-500 text-lg">event</span>
                <span className="text-[10px] font-bold text-teal-500 bg-teal-500/10 px-2 py-0.5 rounded-full">
                  {type.nameEn}
                </span>
              </div>
              <p className="text-xl font-black text-teal-500">{type.daysAvailable} يوم</p>
              <p className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{type.name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Leave Request Form Modal (Bottom Sheet / Overlay) */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center p-0 md:p-4">
          <div className={`w-full max-w-md rounded-t-3xl md:rounded-3xl p-5 border shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto ${
            isDark ? 'bg-[#0f172a] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-700/40">
              <h2 className="text-base font-black flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-400">add_circle</span>
                <span>تقديم طلب إجازة جديدة</span>
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className={`p-1.5 rounded-full ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'}`}
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1.5 text-teal-400">نوع الإجازة المطلوبة *</label>
                <select
                  value={newRequest.leaveTypeId}
                  onChange={(e) => setNewRequest({...newRequest, leaveTypeId: parseInt(e.target.value)})}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                  required
                >
                  {leaveTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name} (رصيد متاح: {type.daysAvailable} يوم)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-teal-400">تاريخ البداية *</label>
                  <input
                    type="date"
                    value={newRequest.startDate}
                    onChange={(e) => setNewRequest({...newRequest, startDate: e.target.value})}
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-teal-400">تاريخ النهاية *</label>
                  <input
                    type="date"
                    value={newRequest.endDate}
                    onChange={(e) => setNewRequest({...newRequest, endDate: e.target.value})}
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    required
                  />
                </div>
              </div>

              {newRequest.startDate && newRequest.endDate && (
                <div className={`p-3 rounded-xl border text-xs flex justify-between items-center ${
                  isDark ? 'bg-teal-500/10 border-teal-500/20 text-teal-300' : 'bg-teal-50 border-teal-200 text-teal-900 font-bold'
                }`}>
                  <span>عدد أيام الإجازة المحسوبة:</span>
                  <span className="font-black text-sm">{calculateDays()} أيام</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold mb-1.5 text-teal-400">سبب طلب الإجازة *</label>
                <textarea
                  value={newRequest.reason}
                  onChange={(e) => setNewRequest({...newRequest, reason: e.target.value})}
                  placeholder="يرجى كتابة سبب تقديم طلب الإجازة باختصار..."
                  rows={3}
                  className={`w-full px-3 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold text-xs shadow-md shadow-teal-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'جاري إرسال الطلب...' : 'إرسال طلب الإجازة'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className={`px-4 py-3 rounded-2xl border font-bold text-xs ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700'
                  }`}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leave Requests History List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            سجل طلبات الإجازة السابقة
          </h3>
          <span className="text-[11px] text-teal-500 font-bold">{mockRequests.length} طلبات</span>
        </div>

        <div className="space-y-2.5">
          {mockRequests.map((request) => (
            <div
              key={request.id}
              className={`p-3.5 rounded-2xl border transition-all ${
                isDark ? 'bg-[#131b2e] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold">{request.leaveType}</span>
                  <span className="text-[10px] font-mono text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full">
                    {request.totalDays} أيام
                  </span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(request.status)}`}>
                  {getStatusText(request.status)}
                </span>
              </div>

              <div className={`text-[11px] grid grid-cols-2 gap-1 p-2 rounded-xl my-2 ${
                isDark ? 'bg-slate-900/50' : 'bg-slate-50'
              }`}>
                <div>
                  <span className="text-slate-400 block text-[10px]">تاريخ البداية</span>
                  <span className="font-bold">{formatDate(request.startDate)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">تاريخ النهاية</span>
                  <span className="font-bold">{formatDate(request.endDate)}</span>
                </div>
              </div>

              <p className={`text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                <span className="font-bold">السبب:</span> {request.reason}
              </p>

              {request.status === 'approved' && request.approvedBy && (
                <p className="text-[10px] text-emerald-400 font-bold mt-1.5 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">check_circle</span>
                  تمت الموافقة بواسطة {request.approvedBy}
                </p>
              )}

              {request.status === 'rejected' && request.rejectionReason && (
                <p className="text-[10px] text-rose-400 font-bold mt-1.5 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">cancel</span>
                  سبب الرفض: {request.rejectionReason}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};