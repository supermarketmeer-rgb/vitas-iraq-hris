import React, { useState } from 'react';
import {
  Users,
  Search,
  ShieldCheck,
  CheckCircle2,
  X,
  Edit,
  Trash2,
  AlertTriangle,
  Power,
  ToggleLeft,
  ToggleRight,
  UserCheck,
  UserX,
  Building2,
  Mail,
  Phone,
  Filter,
  AtSign,
} from 'lucide-react';
import { User, Role, DriverMode } from '../types';
import { DtmsStorage } from '../utils/storage';
import { ModernToast, ToastState } from './ModernToast';
import { t, getLang } from '../utils/i18n';

interface UsersManagerProps {
  onRefreshData?: () => void;
}

export const UsersManager: React.FC<UsersManagerProps> = ({ onRefreshData }) => {
  const isEn = getLang() === 'en';
  const tr = (ar: string, en: string) => (isEn ? en : ar);
  const [users, setUsers] = useState<User[]>(DtmsStorage.getUsers());
  const offices = DtmsStorage.getOffices();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | Role>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterOffice, setFilterOffice] = useState<string>('all');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Role>('supervisor');
  const [officeId, setOfficeId] = useState(offices[0]?.id || '');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [preferredLanguage, setPreferredLanguage] = useState<'ar' | 'en'>('ar');
  const [canViewReports, setCanViewReports] = useState(false);
  const [driverMode, setDriverMode] = useState<DriverMode>('simple');
  const [formError, setFormError] = useState<string | null>(null);

  const refreshList = () => {
    setUsers(DtmsStorage.getUsers());
    if (onRefreshData) onRefreshData();
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setFormError(null);
    setName(user.name);
    setUsername(user.username || (user.email ? user.email.split('@')[0] : ''));
    setPhone(user.phone || '');
    setRole(user.role);
    setOfficeId(user.office_id);
    setStatus(user.status || 'active');
    setPreferredLanguage(user.preferred_language || 'ar');
    setCanViewReports(user.role === 'admin' || Boolean(user.can_view_reports));
    setDriverMode(user.driver_mode === 'complex' ? 'complex' : 'simple');
    setShowModal(true);
  };

  // Direct toggle status handler with modern notification
  const handleToggleStatus = (targetUser: User) => {
    const currentStatus = targetUser.status || 'active';
    const newStatus: 'active' | 'inactive' = currentStatus === 'active' ? 'inactive' : 'active';
    const statusLabel = newStatus === 'active' ? 'نشط ومفعل' : 'معطل ومجمد';
    const statusLabelUi = newStatus === 'active' ? tr('نشط ومفعل', 'Active') : tr('معطل ومجمد', 'Inactive');

    setToast({
      type: 'loading',
      title: newStatus === 'active'
        ? tr('جاري تفعيل حساب المستخدم...', 'Activating user account...')
        : tr('جاري تجميد وتعطيل الحساب...', 'Disabling account...'),
      message: `${tr('المستخدم', 'User')}: ${targetUser.name}`,
      timestamp: Date.now(),
    });

    setTimeout(() => {
      const updatedUser: User = {
        ...targetUser,
        status: newStatus,
      };

      DtmsStorage.saveUser(updatedUser);
      DtmsStorage.logAction(
        'إدارة المستخدمين',
        `تم تغيير حالة المستخدم "${targetUser.name}" إلى: ${statusLabel}`,
        'users',
        targetUser.id
      );

      refreshList();

      setToast({
        type: 'success',
        title: newStatus === 'active'
          ? tr('تم تفعيل الحساب بنجاح', 'Account activated successfully')
          : tr('تم تعطيل الحساب بنجاح', 'Account disabled successfully'),
        message: tr(
          `تم تحويل حالة حساب "${targetUser.name}" إلى (${statusLabelUi}) بنجاح.`,
          `"${targetUser.name}" account status changed to (${statusLabelUi}).`
        ),
        timestamp: Date.now(),
      });
    }, 350);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const isEdit = !!editingUser;
    const targetName = name.trim();
    const targetUsername = username.trim().toLowerCase();

    if (!targetUsername) {
      setFormError(tr('يرجى تحديد اسم المستخدم للدخول!', 'Please enter a login username!'));
      return;
    }

    // Validate username uniqueness (excluding the currently edited user)
    const usernameConflict = users.some(
      (u) =>
        (!editingUser || u.id !== editingUser.id) &&
        ((u.username && u.username.trim().toLowerCase() === targetUsername) ||
          (u.email && u.email.trim().toLowerCase() === targetUsername))
    );
    if (usernameConflict) {
      setFormError(tr('قاعدة العمل: اسم المستخدم مسجل بالفعل لمستخدم آخر!', 'This username is already taken by another user!'));
      return;
    }

    setToast({
      type: 'loading',
      title: isEdit
        ? tr('جاري حفظ تعديلات المستخدم...', 'Saving user changes...')
        : tr('جاري تسجيل المستخدم الجديد...', 'Registering new user...'),
      message: `${tr('المستخدم', 'User')}: ${targetName}`,
      timestamp: Date.now(),
    });

    const userData: User = {
      id: editingUser!.id,
      portal_user_id: editingUser?.portal_user_id || editingUser?.id,
      name: targetName,
      username: targetUsername,
      email: editingUser!.email,
      phone: phone.trim() || undefined,
      role,
      office_id: officeId,
      status,
      preferred_language: preferredLanguage,
      can_view_reports: role === 'admin' || canViewReports,
      driver_mode: role === 'driver' ? driverMode : 'simple',
      created_at: editingUser ? editingUser.created_at : new Date().toISOString(),
    };

    DtmsStorage.saveUser(userData);
    refreshList();
    setShowModal(false);

    const stLbl = status === 'active' ? tr('نشط', 'Active') : tr('معطل', 'Inactive');
    setToast({
      type: 'success',
      title: isEdit
        ? tr('تم تحديث بيانات المستخدم بنجاح', 'User updated successfully')
        : tr('تم تسجيل المستخدم بنجاح', 'User registered successfully'),
      message: isEdit
        ? tr(`تم تحديث بيانات "${targetName}" وحالته (${stLbl}).`, `"${targetName}" updated (${stLbl}).`)
        : tr(`تم إنشاء حساب "${targetName}" بحالة (${stLbl}).`, `Account "${targetName}" created (${stLbl}).`),
      timestamp: Date.now(),
    });
  };

  const handleConfirmDelete = () => {
    if (!deletingUser) return;

    const targetUser = deletingUser;
    DtmsStorage.deleteUser(targetUser.id);
    refreshList();
    setDeletingUser(null);

    setToast({
      type: 'success',
      title: tr('تم حذف المستخدم بنجاح', 'User deleted successfully'),
      message: tr(
        `تم حذف حساب المستخدم "${targetUser.name}" من النظام بنجاح.`,
        `User account "${targetUser.name}" was deleted from the system.`
      ),
      timestamp: Date.now(),
    });
  };

  const getRoleBadge = (r: Role) => {
    switch (r) {
      case 'admin':
        return { label: tr('مدير النظام (Admin)', 'System Admin'), style: 'bg-teal-900 text-white' };
      case 'supervisor':
        return { label: tr('مسؤول سائقين (Supervisor)', 'Drivers Supervisor'), style: 'bg-teal-600 text-white' };
      case 'security':
        return { label: tr('الأمن (Security)', 'Security'), style: 'bg-amber-700 text-white' };
      case 'viewer':
        return { label: tr('مشاهد - قراءة فقط', 'Viewer - Read Only'), style: 'bg-slate-600 text-white' };
      case 'driver':
        return { label: tr('السائق (Driver)', 'Driver'), style: 'bg-teal-800 text-white' };
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.phone || '').includes(searchQuery);
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    const matchesStatus = filterStatus === 'all' || (u.status || 'active') === filterStatus;
    const matchesOffice = filterOffice === 'all' || u.office_id === filterOffice;
    return matchesSearch && matchesRole && matchesStatus && matchesOffice;
  });

  const totalUsers = users.length;
  const activeUsersCount = users.filter((u) => (u.status || 'active') === 'active').length;
  const inactiveUsersCount = users.filter((u) => u.status === 'inactive').length;
  const adminSupervisorsCount = users.filter((u) => u.role === 'admin' || u.role === 'supervisor' || u.role === 'security').length;

  return (
    <div className="space-y-5 pb-16">
      {/* Modern Operation Toast */}
      <ModernToast toast={toast} onClose={() => setToast(null)} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-600" />
            <span>{t('users_manager_title')}</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {t('users_manager_desc')}
          </p>
        </div>

      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-gray-400 block">{t('total_users')}</span>
            <span className="text-xl font-bold text-gray-900 dark:text-white font-mono mt-0.5 block">
              {totalUsers}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-gray-400 block">{t('active_accounts')}</span>
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 block">
              {activeUsersCount}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-gray-400 block">{t('inactive_accounts')}</span>
            <span className="text-xl font-bold text-rose-600 dark:text-rose-400 font-mono mt-0.5 block">
              {inactiveUsersCount}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
            <UserX className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-gray-400 block">{t('admins_supervisors')}</span>
            <span className="text-xl font-bold text-teal-900 dark:text-teal-200 font-mono mt-0.5 block">
              {adminSupervisorsCount}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:max-w-xs">
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t('search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-hidden focus:border-teal-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
            className="text-xs px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-hidden focus:border-teal-500"
          >
            <option value="all">{t('all_statuses_filter')}</option>
            <option value="active">{t('active_only_filter')} ({activeUsersCount})</option>
            <option value="inactive">{t('inactive_only_filter')} ({inactiveUsersCount})</option>
          </select>

          {/* Role Filter */}
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as 'all' | Role)}
            className="text-xs px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-hidden focus:border-teal-500"
          >
            <option value="all">{t('all_roles_filter')}</option>
            <option value="admin">{t('admin_plural_filter')}</option>
            <option value="supervisor">{t('supervisor_plural_filter')}</option>
            <option value="security">{tr('الأمن', 'Security')}</option>
            <option value="viewer">{tr('المشاهدون', 'Viewers')}</option>
            <option value="driver">{t('driver_plural_filter')}</option>
          </select>

          {/* Office Filter */}
          <select
            value={filterOffice}
            onChange={(e) => setFilterOffice(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-hidden focus:border-teal-500"
          >
            <option value="all">{t('all_offices_filter')} ({offices.length})</option>
            {offices.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-teal-50/70 dark:bg-teal-950/30 text-teal-900 dark:text-teal-200 border-b border-gray-200 dark:border-slate-800 font-bold">
              <tr>
                <th className="p-3.5">{t('table_name_info')}</th>
                <th className="p-3.5">{t('table_role_access')}</th>
                <th className="p-3.5">{t('table_office_branch')}</th>
                <th className="p-3.5">{t('table_account_status')}</th>
                <th className="p-3.5 text-center">{t('table_quick_toggle')}</th>
                <th className="p-3.5">{t('table_reg_date')}</th>
                <th className="p-3.5 text-center">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500 dark:text-gray-400">
                    {t('no_users_found')}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const off = offices.find((o) => o.id === u.office_id);
                  const roleBadge = getRoleBadge(u.role);
                  const isActive = (u.status || 'active') === 'active';

                  return (
                    <tr
                      key={u.id}
                      className={`transition-colors ${
                        isActive
                          ? 'hover:bg-gray-50/80 dark:hover:bg-slate-800/50'
                          : 'bg-gray-50/50 dark:bg-slate-900/40 hover:bg-gray-100/50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      {/* Name & Contact */}
                      <td className="p-3.5">
                        <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                          <span>{u.name}</span>
                          {!isActive && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300">
                              {t('account_frozen')}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-[11px] font-mono mt-0.5">
                          <span
                            className="flex items-center gap-1 font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-1.5 py-0.5 rounded border border-teal-200/60 dark:border-teal-800/40"
                            title={tr('اسم المستخدم للدخول', 'Login username')}
                          >
                            <AtSign className="w-3 h-3 text-teal-500" />
                            {u.username || (u.email ? u.email.split('@')[0] : 'user')}
                          </span>
                          {u.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {u.phone}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Role */}
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${roleBadge.style}`}>
                          {roleBadge.label}
                        </span>
                      </td>

                      {/* Office */}
                      <td className="p-3.5 text-gray-600 dark:text-gray-300 font-medium">
                        {off?.name || t('main_office')}
                      </td>

                      {/* Current Status Badge */}
                      <td className="p-3.5">
                        <div className="inline-flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                            }`}
                          />
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              isActive
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            {isActive ? t('status_active_full') : t('status_inactive_full')}
                          </span>
                        </div>
                      </td>

                      {/* Account access is managed by Central Portal. */}
                      <td className="p-3.5 text-center">
                        <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                          {tr('تتم إدارته من البوابة المركزية', 'Managed in Central Portal')}
                        </span>
                      </td>

                      {/* Created date */}
                      <td className="p-3.5 font-mono text-gray-500 text-[11px]">
                        {u.created_at ? u.created_at.split('T')[0] : '2026-01-10'}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(u)}
                            title={tr('تعديل بيانات وصلاحية المستخدم', 'Edit user details & permission')}
                            className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 hover:border-teal-500 hover:text-teal-600 dark:hover:text-teal-400 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User assignment is managed in Central Portal; this modal only edits DTMS settings. */}
      {showModal && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div dir={isEn ? 'ltr' : 'rtl'} className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-teal-900 text-white">
              <div className="flex items-center gap-2">
                <Edit className="w-4 h-4 text-teal-300" />
                <h3 className="font-bold text-sm">
                  {`${tr('تعديل بيانات وصلاحيات', 'Edit User & Permissions')}: ${editingUser.name}`}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-teal-300 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-5 space-y-3.5 text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">{tr('الاسم الثلاثي واللقب:', 'Full Name:')}</label>
                <input
                  type="text"
                  required
                  placeholder={tr('مثال: أحمد عبد الله الكعبي...', 'e.g. Ahmed Abdullah Al-Kaabi...')}
                  value={name}
                  readOnly
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">
                    {tr('اسم المستخدم للدخول:', 'Login Username:')}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={tr('مثال: admin أو ahmed', 'e.g. admin or ahmed')}
                    value={username}
                    readOnly
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">{tr('رقم الهاتف:', 'Phone Number:')}</label>
                  <input
                    type="text"
                    placeholder="07700000000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-hidden focus:border-teal-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">{tr('الدور والصلاحية:', 'Role & Permission:')}</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-hidden focus:border-teal-500"
                  >
                    <option value="admin">{tr('1- مدير النظام (Admin)', '1- System Admin')}</option>
                    <option value="supervisor">{tr('2- مسؤول سائقين (Supervisor)', '2- Drivers Supervisor')}</option>
                    <option value="security">{tr('3- الأمن (Security)', '3- Security')}</option>
                    <option value="viewer">{tr('4- مشاهد - قراءة فقط', '4- Viewer - Read Only')}</option>
                    <option value="driver">{tr('5- سائق (Driver)', '5- Driver')}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">{tr('المكتب التابع له:', 'Office / Branch:')}</label>
                  <select
                    value={officeId}
                    onChange={(e) => setOfficeId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-hidden focus:border-teal-500"
                  >
                    {offices.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Password field removed as SSO handles it */}

              {role === 'driver' && (
                <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 space-y-2">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="block font-bold text-gray-800 dark:text-gray-200">
                        {tr('واجهة عمل السائق:', 'Driver work interface:')}
                      </label>
                      <select
                        value={driverMode}
                        onChange={(e) => setDriverMode(e.target.value as DriverMode)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                      >
                        <option value="simple">{tr('الوضع المبسط - بدء وإنهاء العمل', 'Simple mode - Start and end work')}</option>
                        <option value="complex">{tr('الوضع التفصيلي - الرحلات المنفصلة', 'Complex mode - Individual trips')}</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block font-bold text-gray-800 dark:text-gray-200">
                        {tr('لغة حساب السائق:', 'Driver account language:')}
                      </label>
                      <select
                        value={preferredLanguage}
                        onChange={(e) => setPreferredLanguage(e.target.value as 'ar' | 'en')}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-semibold"
                      >
                        <option value="ar">العربية</option>
                        <option value="en">English</option>
                      </select>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    {tr('الوضع المبسط هو الافتراضي، وتُطبق اللغة المحددة عند دخول السائق من أي جهاز.', 'Simple mode is the default. The selected language is applied when the driver signs in on any device.')}
                  </p>
                </div>
              )}

              {/* Language Select Field in Modal */}
              {role !== 'driver' && <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800 space-y-1.5 mb-2">
                <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">
                  {tr('اللغة الافتراضية للمنظومة:', 'Default Language:')}
                </label>
                <select
                  value={preferredLanguage}
                  onChange={(e) => setPreferredLanguage(e.target.value as 'ar' | 'en')}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-hidden focus:border-teal-500 font-semibold"
                >
                  <option value="ar">{tr('العربية', 'Arabic (العربية)')}</option>
                  <option value="en">{tr('الإنجليزية (English)', 'English')}</option>
                </select>
              </div>}

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={role === 'admin' || canViewReports}
                    disabled={role === 'admin'}
                    onChange={(e) => setCanViewReports(e.target.checked)}
                    className="mt-0.5 accent-teal-600"
                  />
                  <span>
                    <span className="block font-bold text-gray-800 dark:text-gray-200">
                      {tr('الوصول إلى التقارير الشاملة والتشغيلية', 'Access Comprehensive & Operational Reports')}
                    </span>
                    <span className="block text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      {role === 'admin'
                        ? tr('هذا الوصول متاح دائماً لمدير النظام.', 'This access is always enabled for administrators.')
                        : tr('عند التحديد، يمكن للمستخدم فتح صفحة التقارير.', 'When selected, the user can open the Reports page.')}
                    </span>
                  </span>
                </label>
              </div>

              {/* Status Select Field in Modal */}
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800 space-y-1.5">
                <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1 flex items-center justify-between">
                  <span>{tr('حالة الحساب التشغيلية:', 'Account Status:')}</span>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      status === 'active'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }`}
                  >
                    {status === 'active'
                      ? tr('مفعل ويملك حق الدخول', 'Enabled – can log in')
                      : tr('معطل وممنوع من الدخول', 'Disabled – login blocked')}
                  </span>
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-hidden focus:border-teal-500 font-semibold"
                >
                  <option value="active">{tr('نشط ومفعل - يملك صلاحية الوصول للنظام', 'Active – has system access')}</option>
                  <option value="inactive">{tr('معطل ومجمد - تعليق صلاحيات الحساب', 'Inactive – account permissions suspended')}</option>
                </select>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {tr(
                    'ملاحظة: الحساب المعطل لا يتمكن من تسجيل الدخول أو تأكيد الرحلات أو تنفيذ المهام.',
                    'Note: A disabled account cannot log in, confirm trips, or perform tasks.'
                  )}
                </p>
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {tr('إلغاء', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{tr('حفظ التعديلات', 'Save Changes')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div dir={isEn ? 'ltr' : 'rtl'} className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-2xl overflow-hidden p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  {tr('تأكيد حذف حساب المستخدم', 'Confirm User Account Deletion')}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {tr(
                    'هل أنت متأكد من رغبتك في حذف هذا الحساب نهائياً من سجلات النظام؟',
                    'Are you sure you want to permanently delete this account from the system?'
                  )}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">{tr('الاسم:', 'Name:')}</span>
                <span className="font-bold text-gray-900 dark:text-white">{deletingUser.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">{tr('البريد الإلكتروني:', 'Email:')}</span>
                <span className="font-mono text-gray-700 dark:text-gray-300">{deletingUser.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">{tr('الدور:', 'Role:')}</span>
                <span className="font-bold text-teal-700 dark:text-teal-300">{getRoleBadge(deletingUser.role).label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">{tr('الحالة الحالية:', 'Current Status:')}</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  {(deletingUser.status || 'active') === 'active' ? tr('نشط', 'Active') : tr('معطل', 'Inactive')}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer"
              >
                {tr('إلغاء الأمر', 'Cancel')}
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{tr('تأكيد الحذف', 'Confirm Delete')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
