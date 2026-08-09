import React, { useState } from 'react';
import { useEmployeeContext } from '../context/EmployeeContext';

interface EmployeeProfileProps {
  employee: any;
  onLogout: () => void;
}

export const EmployeeProfile: React.FC<EmployeeProfileProps> = ({ employee, onLogout }) => {
  const { theme, toggleTheme } = useEmployeeContext();
  const isDark = theme === 'dark';

  const [isEditing, setIsEditing] = useState(false);
  const [editedEmployee, setEditedEmployee] = useState(employee);
  const [activeTab, setActiveTab] = useState<'personal' | 'professional' | 'contact' | 'security'>('personal');
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const handleSave = () => {
    console.log('Saving employee data:', editedEmployee);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedEmployee(employee);
    setIsEditing(false);
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError('جميع الحقول مطلوبة');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('كلمة المرور الجديدة غير متطابقة');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    const storedAuth = localStorage.getItem('employee_auth');
    if (storedAuth) {
      try {
        const authData = JSON.parse(storedAuth);
        if (passwordData.currentPassword === (authData.employee?.password || '123456')) {
          authData.employee.password = passwordData.newPassword;
          localStorage.setItem('employee_auth', JSON.stringify(authData));
          setPasswordSuccess('تم تغيير كلمة المرور بنجاح');
          setShowPasswordChange(false);
          setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } else {
          setPasswordError('كلمة المرور الحالية غير صحيحة');
        }
      } catch (error) {
        setPasswordError('حدث خطأ أثناء تغيير كلمة المرور');
      }
    }
  };

  const handleChange = (field: string, value: any) => {
    setEditedEmployee({
      ...editedEmployee,
      [field]: value
    });
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 space-y-4">
      {/* Mobile Top Header */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">person</span>
          </div>
          <div>
            <h1 className={`text-base font-black leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              الملف الشخصي والحساب
            </h1>
            <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              بيانات الموظف والراتب والإعدادات
            </p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs border border-rose-500/20 transition-all"
        >
          خروج
        </button>
      </div>

      {/* Mobile Profile Card */}
      <div className={`p-4 rounded-3xl border shadow-lg relative overflow-hidden ${
        isDark ? 'bg-[#131b2e] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
      }`}>
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-white font-black text-2xl flex items-center justify-center shadow-md">
              {editedEmployee?.fullName ? editedEmployee.fullName.charAt(0) : 'م'}
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center shadow-sm text-xs border border-white"
            >
              <span className="material-symbols-outlined text-xs">{isEditing ? 'check' : 'edit'}</span>
            </button>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full">
                {editedEmployee?.employeeId || 'VIT-2023-001'}
              </span>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                نشط
              </span>
            </div>
            <h2 className="text-base font-black truncate">{editedEmployee?.fullName}</h2>
            <p className={`text-[11px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {editedEmployee?.position} • {editedEmployee?.department}
            </p>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className={`grid grid-cols-3 gap-2 mt-4 pt-3 border-t text-center text-xs ${
          isDark ? 'border-slate-800 text-slate-300' : 'border-slate-100 text-slate-700'
        }`}>
          <div>
            <span className="text-[10px] text-slate-400 block">الفرع</span>
            <span className="font-bold text-[11px]">{editedEmployee?.branch || 'المقر'}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">تاريخ التعيين</span>
            <span className="font-bold text-[11px]">{editedEmployee?.joinDate}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">الراتب الأساسي</span>
            <span className="font-bold text-[11px] text-teal-400">{editedEmployee?.salary?.toLocaleString()} د.ع</span>
          </div>
        </div>
      </div>

      {/* Payslip Quick Card */}
      <div className={`p-4 rounded-3xl border flex items-center justify-between ${
        isDark ? 'bg-gradient-to-r from-emerald-950/40 via-teal-900/30 to-slate-900 border-emerald-500/30' : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 shadow-xs'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">payments</span>
          </div>
          <div>
            <h3 className="text-xs font-black">كشف الراتب لشهر أغسطس 2026</h3>
            <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>الراتب صافي: {editedEmployee?.salary?.toLocaleString()} د.ع</p>
          </div>
        </div>
        <button
          onClick={() => alert(`كشف الراتب للموظف ${editedEmployee?.fullName}:\nالراتب الأساسي: ${editedEmployee?.salary?.toLocaleString()} د.ع\nالمستقطعات: 0 د.ع\nالصافي المستلم: ${editedEmployee?.salary?.toLocaleString()} د.ع`)}
          className="px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs shadow-xs"
        >
          استعراض
        </button>
      </div>

      {/* Mobile Scrollable Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setActiveTab('personal')}
          className={`px-3 py-1.5 rounded-full font-bold text-xs whitespace-nowrap transition-all ${
            activeTab === 'personal'
              ? 'bg-teal-500 text-slate-950 font-black'
              : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-700'
          }`}
        >
          الشخصية
        </button>
        <button
          onClick={() => setActiveTab('professional')}
          className={`px-3 py-1.5 rounded-full font-bold text-xs whitespace-nowrap transition-all ${
            activeTab === 'professional'
              ? 'bg-teal-500 text-slate-950 font-black'
              : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-700'
          }`}
        >
          المهنية
        </button>
        <button
          onClick={() => setActiveTab('contact')}
          className={`px-3 py-1.5 rounded-full font-bold text-xs whitespace-nowrap transition-all ${
            activeTab === 'contact'
              ? 'bg-teal-500 text-slate-950 font-black'
              : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-700'
          }`}
        >
          الاتصال
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`px-3 py-1.5 rounded-full font-bold text-xs whitespace-nowrap transition-all ${
            activeTab === 'security'
              ? 'bg-teal-500 text-slate-950 font-black'
              : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-700'
          }`}
        >
          الأمان
        </button>
      </div>

      {/* Tab Form Box */}
      <div className={`p-4 rounded-3xl border shadow-md ${
        isDark ? 'bg-[#131b2e] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {activeTab === 'personal' && (
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold mb-1 text-teal-400">الاسم الكامل (عربي)</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedEmployee?.fullName || ''}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-bold ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              ) : (
                <p className="text-xs font-bold">{editedEmployee?.fullName}</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold mb-1 text-teal-400">الاسم الكامل (إنجليزي)</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedEmployee?.fullNameEn || ''}
                  onChange={(e) => handleChange('fullNameEn', e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-bold ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              ) : (
                <p className="text-xs font-bold">{editedEmployee?.fullNameEn}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold mb-1 text-teal-400">تاريخ الميلاد</label>
                <p className="text-xs font-bold">{editedEmployee?.dateOfBirth || '1992-05-14'}</p>
              </div>
              <div>
                <label className="block text-[11px] font-bold mb-1 text-teal-400">الجنسية</label>
                <p className="text-xs font-bold">{editedEmployee?.nationality || 'عراقي'}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'professional' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold mb-1 text-teal-400">رقم البادج</label>
                <p className="text-xs font-bold">{editedEmployee?.badgeNo || '1001'}</p>
              </div>
              <div>
                <label className="block text-[11px] font-bold mb-1 text-teal-400">معرف الموظف</label>
                <p className="text-xs font-bold">{editedEmployee?.employeeId || 'VIT-2023-001'}</p>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold mb-1 text-teal-400">المسمى الوظيفي</label>
              <p className="text-xs font-bold">{editedEmployee?.position}</p>
            </div>

            <div>
              <label className="block text-[11px] font-bold mb-1 text-teal-400">القسم الإداري</label>
              <p className="text-xs font-bold">{editedEmployee?.department}</p>
            </div>
          </div>
        )}

        {activeTab === 'contact' && (
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold mb-1 text-teal-400">البريد الإلكتروني</label>
              <p className="text-xs font-bold">{editedEmployee?.email}</p>
            </div>
            <div>
              <label className="block text-[11px] font-bold mb-1 text-teal-400">رقم الهاتف المحمول</label>
              <p className="text-xs font-bold">{editedEmployee?.phone}</p>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-3">
            {!showPasswordChange ? (
              <div className="text-center py-3">
                <span className="material-symbols-outlined text-3xl text-teal-400 mb-1">lock</span>
                <h3 className="text-xs font-bold mb-1">تغيير كلمة المرور الخاصة بك</h3>
                <button
                  onClick={() => setShowPasswordChange(true)}
                  className="px-4 py-2 rounded-xl bg-teal-600 text-white font-bold text-xs shadow-md mt-2"
                >
                  تغيير كلمة المرور
                </button>
              </div>
            ) : (
              <form onSubmit={handlePasswordChange} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold mb-1 text-teal-400">كلمة المرور الحالية</label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                    placeholder="أدخل كلمة المرور الحالية"
                    style={{
                      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                      color: isDark ? '#ffffff' : '#0f172a',
                      borderColor: isDark ? '#334155' : '#cbd5e1'
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      isDark ? 'bg-[#0f172a] border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold mb-1 text-teal-400">كلمة المرور الجديدة</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                    placeholder="أدخل كلمة المرور الجديدة"
                    style={{
                      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                      color: isDark ? '#ffffff' : '#0f172a',
                      borderColor: isDark ? '#334155' : '#cbd5e1'
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      isDark ? 'bg-[#0f172a] border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold mb-1 text-teal-400">تأكيد كلمة المرور الجديدة</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                    placeholder="أعد إدخال كلمة المرور الجديدة"
                    style={{
                      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                      color: isDark ? '#ffffff' : '#0f172a',
                      borderColor: isDark ? '#334155' : '#cbd5e1'
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      isDark ? 'bg-[#0f172a] border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                    required
                  />
                </div>

                {passwordError && (
                  <p className="text-rose-400 text-[11px] font-bold">{passwordError}</p>
                )}

                {passwordSuccess && (
                  <p className="text-emerald-400 text-[11px] font-bold">{passwordSuccess}</p>
                )}

                <div className="flex gap-2 pt-1">
                  <button type="submit" className="flex-1 py-2.5 rounded-xl bg-teal-600 text-white font-bold text-xs shadow-md">
                    حفظ كلمة المرور
                  </button>
                  <button type="button" onClick={() => setShowPasswordChange(false)} className="px-3 py-2.5 rounded-xl border text-xs">
                    إلغاء
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};