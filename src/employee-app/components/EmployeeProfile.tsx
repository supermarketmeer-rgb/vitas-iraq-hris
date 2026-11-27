import React, { useState, useRef } from 'react';
import { Camera, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useEmployeeContext } from '../context/EmployeeContext';
import { api } from '../../api/client';

interface EmployeeProfileProps {
  employee: any;
  onLogout?: () => void;
}

export const EmployeeProfile: React.FC<EmployeeProfileProps> = ({ employee }) => {
  const { theme, toggleTheme, language, setEmployee, employee: contextEmployee, refreshEmployee } = useEmployeeContext();
  const currentEmp = contextEmployee || employee;
  const isDark = theme === 'dark';
  const isEn = language === 'en';

  const [isEditing, setIsEditing] = useState(false);
  const [editedEmployee, setEditedEmployee] = useState(currentEmp);
  const [activeTab, setActiveTab] = useState<'personal' | 'professional' | 'contact' | 'security'>('personal');
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Secure self-service profile photo upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoLoadError, setPhotoLoadError] = useState(false);
  const [photoStatus, setPhotoStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  React.useEffect(() => {
    if (refreshEmployee) refreshEmployee();
  }, []);

  React.useEffect(() => {
    if (currentEmp) {
      setEditedEmployee(currentEmp);
    }
  }, [currentEmp]);

  const employeePhoto = editedEmployee?.photoUrl || 
                        editedEmployee?.photo_url || 
                        editedEmployee?.avatar || 
                        editedEmployee?.photo || 
                        null;

  React.useEffect(() => {
    setPhotoLoadError(false);
  }, [employeePhoto]);

  const reencodeImageToJpeg = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error(isEn ? 'Failed to read image file' : 'فشل قراءة ملف الصورة'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error(isEn ? 'Invalid or corrupted image file' : 'ملف الصورة غير صالح أو تالف'));
        img.onload = () => {
          const maxDim = 512;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width >= height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error(isEn ? 'Image processor unavailable' : 'معالج الصور غير متاح'));
            return;
          }
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve(dataUrl);
        };
        img.src = String(reader.result || '');
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setPhotoStatus(null);

    const allowedTypes = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
    if (!allowedTypes.has((file.type || '').toLowerCase())) {
      setPhotoStatus({
        type: 'error',
        text: isEn ? 'Only JPG, PNG, or WEBP images are allowed.' : 'يُسمح فقط بصور JPG أو PNG أو WEBP.'
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoStatus({
        type: 'error',
        text: isEn ? 'Image must be smaller than 5MB.' : 'يجب أن يكون حجم الصورة أقل من 5 ميجابايت.'
      });
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const cleanDataUrl = await reencodeImageToJpeg(file);
      const res = await fetch('/api/employee/self-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentEmp?.id,
          employeeId: currentEmp?.employeeId || currentEmp?.employee_id,
          badgeNo: currentEmp?.badgeNo || currentEmp?.badge_no,
          photoDataUrl: cleanDataUrl
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || (isEn ? 'Failed to upload photo' : 'فشل تحديث الصورة الشخصية'));
      }

      const finalPhoto = data.photoUrl || cleanDataUrl;
      const updatedEmp = {
        ...editedEmployee,
        photoUrl: finalPhoto,
        photo_url: finalPhoto,
        avatar: finalPhoto,
        photo: finalPhoto
      };

      setEditedEmployee(updatedEmp);
      setPhotoLoadError(false);
      if (setEmployee) setEmployee(updatedEmp);

      try {
        const savedAuth = localStorage.getItem('employee_auth');
        if (savedAuth) {
          const authData = JSON.parse(savedAuth);
          authData.employee = { ...(authData.employee || {}), ...updatedEmp };
          localStorage.setItem('employee_auth', JSON.stringify(authData));
        }
      } catch {}

      setPhotoStatus({
        type: 'success',
        text: isEn ? 'Profile photo updated successfully!' : 'تم تحديث الصورة الشخصية بنجاح!'
      });
      setTimeout(() => setPhotoStatus(null), 3500);
    } catch (err: any) {
      setPhotoStatus({
        type: 'error',
        text: err?.message || (isEn ? 'Could not update profile photo' : 'تعذر تحديث الصورة الشخصية')
      });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const displayJoinDate = editedEmployee?.joinDate || 
                          editedEmployee?.originalStartDate || 
                          editedEmployee?.contractStartDate || 
                          editedEmployee?.original_start_date || 
                          editedEmployee?.contract_start_date || 
                          '-';



  const displayName = isEn 
    ? (editedEmployee?.fullNameEn || editedEmployee?.full_name_en || editedEmployee?.fullName || editedEmployee?.full_name_ar || 'Employee') 
    : (editedEmployee?.fullName || editedEmployee?.full_name_ar || editedEmployee?.name || 'الموظف');
  const displayPosition = isEn 
    ? (editedEmployee?.positionEn || editedEmployee?.jobTitleEn || editedEmployee?.position_en || editedEmployee?.position || 'Employee') 
    : (editedEmployee?.position || editedEmployee?.position_ar || editedEmployee?.jobTitle || 'موظف');
  const displayDept = isEn 
    ? (editedEmployee?.departmentEn || editedEmployee?.department_en || editedEmployee?.department || 'Department') 
    : (editedEmployee?.department || 'القسم');
  const displayBranch = isEn 
    ? (editedEmployee?.branchEn || editedEmployee?.branch_en || editedEmployee?.branch || editedEmployee?.location_ar || 'Branch') 
    : (editedEmployee?.branch || editedEmployee?.location_ar || 'الفرع');
  const displayNationality = isEn 
    ? (editedEmployee?.nationality || 'Iraqi') 
    : (editedEmployee?.nationality || 'عراقي');

  const handleSave = () => {
    console.log('Saving employee data:', editedEmployee);
    if (setEmployee) setEmployee(editedEmployee);
    try {
      const savedAuth = localStorage.getItem('employee_auth');
      if (savedAuth) {
        const authData = JSON.parse(savedAuth);
        authData.employee = editedEmployee;
        localStorage.setItem('employee_auth', JSON.stringify(authData));
      }
    } catch {}
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedEmployee(employee);
    setIsEditing(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError(isEn ? 'All fields are required' : 'جميع الحقول مطلوبة');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError(isEn ? 'New passwords do not match' : 'كلمة المرور الجديدة غير متطابقة');
      return;
    }

    if (passwordData.newPassword.length < 4) {
      setPasswordError(isEn ? 'Password must be at least 4 characters' : 'كلمة المرور يجب أن تكون 4 أحرف على الأقل');
      return;
    }

    setIsChangingPassword(true);
    try {
      const empBadge = currentEmp?.badgeNo || currentEmp?.badge_no || '';
      const empId = currentEmp?.employeeId || currentEmp?.employee_id || currentEmp?.id || '';

      await api.changePassword({
        employeeId: empId,
        username: empBadge || empId,
        currentPassword: passwordData.currentPassword.trim(),
        newPassword: passwordData.newPassword.trim()
      });

      // Update in localStorage employee_auth
      const storedAuth = localStorage.getItem('employee_auth');
      if (storedAuth) {
        try {
          const authData = JSON.parse(storedAuth);
          if (authData.employee) {
            authData.employee.password = passwordData.newPassword.trim();
            localStorage.setItem('employee_auth', JSON.stringify(authData));
          }
        } catch {}
      }

      setPasswordSuccess(isEn ? 'Password changed successfully in the database!' : 'تم تغيير كلمة المرور بنجاح في قاعدة البيانات!');
      setTimeout(() => {
        setShowPasswordChange(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setPasswordSuccess('');
      }, 2000);
    } catch (err: any) {
      setPasswordError(err.message || (isEn ? 'Current password is incorrect or failed to update' : 'كلمة المرور الحالية غير صحيحة أو فشل التحديث'));
    } finally {
      setIsChangingPassword(false);
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
      {/* Mobile Top Section Title */}
      <div className="pt-0.5 px-0.5">
        <h1 className={`text-base font-black leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
          {isEn ? 'Profile & Account' : 'الملف الشخصي والحساب'}
        </h1>
      </div>

      {/* Mobile Profile Card */}
      <div className={`p-4 rounded-3xl border shadow-lg relative overflow-hidden ${
        isDark ? 'bg-[#131b2e] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
      }`}>
        <div className="flex items-center gap-3.5">
          <div className="relative shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotoSelect}
            />
            {employeePhoto && !photoLoadError ? (
              <div
                onClick={() => !isUploadingPhoto && fileInputRef.current?.click()}
                className="w-20 h-26 rounded-2xl bg-white dark:bg-slate-800 border-2 border-teal-500/60 shadow-lg p-0.5 overflow-hidden flex items-center justify-center cursor-pointer"
                title={isEn ? 'Change profile photo' : 'تغيير الصورة الشخصية'}
              >
                <img 
                  key={employeePhoto}
                  src={employeePhoto} 
                  alt={displayName} 
                  className="w-full h-full object-contain rounded-xl"
                  onError={() => setPhotoLoadError(true)}
                />
              </div>
            ) : (
              <div
                onClick={() => !isUploadingPhoto && fileInputRef.current?.click()}
                className="w-20 h-26 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-white font-black text-2xl flex items-center justify-center shadow-md cursor-pointer"
                title={isEn ? 'Upload profile photo' : 'رفع صورة شخصية'}
              >
                {displayName.charAt(0)}
              </div>
            )}

            {/* Self-Service Photo Upload Icon Button */}
            <button
              type="button"
              disabled={isUploadingPhoto}
              onClick={() => fileInputRef.current?.click()}
              title={isEn ? 'Update Profile Photo' : 'تحديث الصورة الشخصية'}
              aria-label={isEn ? 'Update Profile Photo' : 'تحديث الصورة الشخصية'}
              className={`absolute -bottom-1.5 -end-1.5 w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 transition-all active:scale-95 cursor-pointer ${
                isDark
                  ? 'bg-teal-600 hover:bg-teal-500 text-white border-[#131b2e]'
                  : 'bg-teal-600 hover:bg-teal-700 text-white border-white'
              } ${isUploadingPhoto ? 'opacity-80 cursor-wait' : ''}`}
            >
              {isUploadingPhoto ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Camera className="w-4 h-4 text-white" />
              )}
            </button>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full">
                {editedEmployee?.employeeId || editedEmployee?.badgeNo || 'V167'}
              </span>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                {isEn ? 'Active' : 'نشط'}
              </span>
            </div>
            <h2 className="text-base font-black truncate">{displayName}</h2>
            <p className={`text-[11px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {displayPosition} • {displayDept}
            </p>
          </div>
        </div>

        {photoStatus && (
          <div className={`mt-3 px-3 py-2 rounded-xl text-[11px] font-bold flex items-center gap-2 ${
            photoStatus.type === 'success'
              ? (isDark ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border border-emerald-200')
              : (isDark ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30' : 'bg-rose-50 text-rose-700 border border-rose-200')
          }`}>
            {photoStatus.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{photoStatus.text}</span>
          </div>
        )}

        {/* Quick Stats Grid */}
        <div className={`grid grid-cols-3 gap-2 mt-4 pt-3 border-t text-center text-xs ${
          isDark ? 'border-slate-800 text-slate-300' : 'border-slate-200 text-slate-800'
        }`}>
          <div>
            <span className={`block text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>{isEn ? 'Branch' : 'الفرع'}</span>
            <span className={`font-bold text-[11px] ${isDark ? 'text-white' : 'text-slate-900'}`}>{displayBranch}</span>
          </div>
          <div>
            <span className={`block text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>{isEn ? 'Hire Date' : 'تاريخ التعيين'}</span>
            <span className={`font-bold text-[11px] ${isDark ? 'text-white' : 'text-slate-900'}`}>{displayJoinDate}</span>
          </div>
          <div>
            <span className={`block text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>{isEn ? 'Basic Salary' : 'الراتب الأساسي'}</span>
            <span className={`font-bold text-[11px] ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
              {(editedEmployee?.salary || 950000).toLocaleString()} {isEn ? 'IQD' : 'د.ع'}
            </span>
          </div>
        </div>
      </div>

      {/* Mobile Scrollable Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setActiveTab('personal')}
          className={`px-3 py-1.5 rounded-full font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'personal'
              ? 'bg-teal-600 text-white shadow-xs'
              : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
          }`}
        >
          {isEn ? 'Personal' : 'الشخصية'}
        </button>
        <button
          onClick={() => setActiveTab('professional')}
          className={`px-3 py-1.5 rounded-full font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'professional'
              ? 'bg-teal-600 text-white shadow-xs'
              : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
          }`}
        >
          {isEn ? 'Professional' : 'المهنية'}
        </button>
        <button
          onClick={() => setActiveTab('contact')}
          className={`px-3 py-1.5 rounded-full font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'contact'
              ? 'bg-teal-600 text-white shadow-xs'
              : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
          }`}
        >
          {isEn ? 'Contact' : 'الاتصال'}
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`px-3 py-1.5 rounded-full font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'security'
              ? 'bg-teal-600 text-white shadow-xs'
              : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
          }`}
        >
          {isEn ? 'Security' : 'الأمان'}
        </button>
      </div>

      {/* Tab Form Box */}
      <div className={`p-4 rounded-3xl border shadow-md ${
        isDark ? 'bg-[#131b2e] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {activeTab === 'personal' && (
          <div className="space-y-3">
            <div>
              <label className={`block text-[11px] font-bold mb-1 ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
                {isEn ? 'Full Name' : 'الاسم الكامل'}
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => handleChange(isEn ? 'fullNameEn' : 'fullName', e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-bold ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              ) : (
                <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{displayName}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`block text-[11px] font-bold mb-1 ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
                  {isEn ? 'Date of Birth' : 'تاريخ الميلاد'}
                </label>
                <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{editedEmployee?.dob || editedEmployee?.dateOfBirth || '-'}</p>
              </div>
              <div>
                <label className={`block text-[11px] font-bold mb-1 ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
                  {isEn ? 'Nationality' : 'الجنسية'}
                </label>
                <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{displayNationality}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'professional' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`block text-[11px] font-bold mb-1 ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
                  {isEn ? 'Badge Number' : 'رقم البادج'}
                </label>
                <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{editedEmployee?.badgeNo || 'V167'}</p>
              </div>
              <div>
                <label className={`block text-[11px] font-bold mb-1 ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
                  {isEn ? 'Employee ID' : 'معرف الموظف'}
                </label>
                <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{editedEmployee?.employeeId || 'VIT-0037'}</p>
              </div>
            </div>

            <div>
              <label className={`block text-[11px] font-bold mb-1 ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
                {isEn ? 'Job Position' : 'المسمى الوظيفي'}
              </label>
              <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{displayPosition}</p>
            </div>

            <div>
              <label className={`block text-[11px] font-bold mb-1 ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
                {isEn ? 'Department' : 'القسم الإداري'}
              </label>
              <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{displayDept}</p>
            </div>

            <div>
              <label className={`block text-[11px] font-bold mb-1 ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
                {isEn ? 'Hire Date' : 'تاريخ التعيين'}
              </label>
              <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'} font-mono`}>{displayJoinDate}</p>
            </div>
          </div>
        )}

        {activeTab === 'contact' && (
          <div className="space-y-3">
            <div>
              <label className={`block text-[11px] font-bold mb-1 ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
                {isEn ? 'Email Address' : 'البريد الإلكتروني'}
              </label>
              <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{editedEmployee?.email || 'dina.haider@vitasiraq.com'}</p>
            </div>
            <div>
              <label className={`block text-[11px] font-bold mb-1 ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
                {isEn ? 'Mobile Phone' : 'رقم الهاتف المحمول'}
              </label>
              <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{editedEmployee?.phone || '+964 780 123 4567'}</p>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-3">
            {!showPasswordChange ? (
              <div className="text-center py-3">
                <span className="material-symbols-outlined text-3xl text-teal-500 mb-1">lock</span>
                <h3 className={`text-xs font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {isEn ? 'Change Account Password' : 'تغيير كلمة المرور الخاصة بك'}
                </h3>
                <button
                  onClick={() => setShowPasswordChange(true)}
                  className="px-4 py-2 rounded-xl bg-teal-600 text-white font-bold text-xs shadow-md mt-2 cursor-pointer active:scale-95 transition-all"
                >
                  {isEn ? 'Change Password' : 'تغيير كلمة المرور'}
                </button>
              </div>
            ) : (
              <form onSubmit={handlePasswordChange} className="space-y-3">
                <div>
                  <label className={`block text-[11px] font-bold mb-1 ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
                    {isEn ? 'Current Password' : 'كلمة المرور الحالية'}
                  </label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                    placeholder={isEn ? 'Enter current password' : 'أدخل كلمة المرور الحالية'}
                    style={{
                      backgroundColor: isDark ? '#0f172a' : '#ffffff',
                      color: isDark ? '#ffffff' : '#0f172a',
                      borderColor: isDark ? '#334155' : '#cbd5e1'
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      isDark ? 'bg-[#0f172a] border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className={`block text-[11px] font-bold mb-1 ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
                    {isEn ? 'New Password' : 'كلمة المرور الجديدة'}
                  </label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                    placeholder={isEn ? 'Enter new password' : 'أدخل كلمة المرور الجديدة'}
                    style={{
                      backgroundColor: isDark ? '#0f172a' : '#ffffff',
                      color: isDark ? '#ffffff' : '#0f172a',
                      borderColor: isDark ? '#334155' : '#cbd5e1'
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      isDark ? 'bg-[#0f172a] border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className={`block text-[11px] font-bold mb-1 ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
                    {isEn ? 'Confirm New Password' : 'تأكيد كلمة المرور الجديدة'}
                  </label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                    placeholder={isEn ? 'Re-enter new password' : 'أعد إدخال كلمة المرور الجديدة'}
                    style={{
                      backgroundColor: isDark ? '#0f172a' : '#ffffff',
                      color: isDark ? '#ffffff' : '#0f172a',
                      borderColor: isDark ? '#334155' : '#cbd5e1'
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      isDark ? 'bg-[#0f172a] border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                    required
                  />
                </div>

                {passwordError && (
                  <p className="text-rose-500 text-[11px] font-bold">{passwordError}</p>
                )}

                {passwordSuccess && (
                  <p className="text-emerald-500 text-[11px] font-bold">{passwordSuccess}</p>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold text-xs shadow-md cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {isChangingPassword ? (
                      <>
                        <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full"></span>
                        <span>{isEn ? 'Saving...' : 'جاري الحفظ...'}</span>
                      </>
                    ) : (
                      <span>{isEn ? 'Save Password' : 'حفظ كلمة المرور'}</span>
                    )}
                  </button>
                  <button type="button" onClick={() => setShowPasswordChange(false)} className={`px-3 py-2.5 rounded-xl border text-xs font-bold cursor-pointer ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700'
                  }`}>
                    {isEn ? 'Cancel' : 'إلغاء'}
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