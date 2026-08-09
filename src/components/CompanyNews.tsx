import React, { useState, useEffect } from 'react';
import { CompanyNewsItem } from '../types';
import { api } from '../api/client';
import { EmptyState } from './EmptyState';
import { useApp } from '../context/AppContext';
import { useEmployeeContext } from '../employee-app/context/EmployeeContext';

interface CompanyNewsProps {
  language: 'ar' | 'en';
  isReadOnly?: boolean;
}

export const CompanyNews: React.FC<CompanyNewsProps> = ({ language, isReadOnly }) => {
  const { currentUserRole, currentUser, theme: appTheme } = useApp();
  const isEmployee = currentUserRole === 'Employee' || currentUser?.role === 'Employee' || isReadOnly;

  let isDark = appTheme === 'dark';
  try {
    const empCtx = useEmployeeContext();
    if (empCtx?.theme) {
      isDark = empCtx.theme === 'dark';
    }
  } catch {
    // ignore if outside EmployeeContextProvider
  }

  const [news, setNews] = useState<CompanyNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingNews, setEditingNews] = useState<CompanyNewsItem | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft' | 'archived'>('published');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Form state
  const [formData, setFormData] = useState({
    title_ar: '',
    title_en: '',
    content_ar: '',
    content_en: '',
    category: 'general',
    target_audience: 'all',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    publish_date: '',
    expiry_date: '',
    status: 'draft' as 'draft' | 'published' | 'archived',
    attachment_url: ''
  });

  useEffect(() => {
    loadNews();
  }, [filterStatus, filterCategory]);

  const loadNews = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterStatus !== 'all') params.status = filterStatus;
      if (filterCategory !== 'all') params.category = filterCategory;
      
      const data = await api.getNews(params);
      setNews(data);
    } catch (error) {
      console.error('Error loading news:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNews = async () => {
    try {
      await api.addNews({
        ...formData,
        published_by: 'HR Admin',
        publish_date: formData.publish_date || new Date().toISOString()
      });
      setShowAddModal(false);
      resetForm();
      loadNews();
    } catch (error) {
      console.error('Error adding news:', error);
    }
  };

  const handleUpdateNews = async () => {
    if (!editingNews) return;
    try {
      await api.updateNews(editingNews.id.toString(), formData);
      setEditingNews(null);
      setShowAddModal(false);
      resetForm();
      loadNews();
    } catch (error) {
      console.error('Error updating news:', error);
    }
  };

  const handleDeleteNews = async (id: number) => {
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا الخبر؟' : 'Are you sure you want to delete this news?')) return;
    
    try {
      await api.deleteNews(id.toString());
      loadNews();
    } catch (error) {
      console.error('Error deleting news:', error);
    }
  };

  const handleStatusChange = async (id: number, newStatus: 'draft' | 'published' | 'archived') => {
    try {
      await api.updateNewsStatus(id.toString(), newStatus);
      loadNews();
    } catch (error) {
      console.error('Error updating news status:', error);
    }
  };

  const openEditModal = (newsItem: CompanyNewsItem) => {
    setEditingNews(newsItem);
    setFormData({
      title_ar: newsItem.title_ar,
      title_en: newsItem.title_en,
      content_ar: newsItem.content_ar,
      content_en: newsItem.content_en,
      category: newsItem.category,
      target_audience: newsItem.target_audience,
      priority: newsItem.priority,
      publish_date: newsItem.publish_date ? newsItem.publish_date.split('T')[0] : '',
      expiry_date: newsItem.expiry_date ? newsItem.expiry_date.split('T')[0] : '',
      status: newsItem.status,
      attachment_url: newsItem.attachment_url
    });
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormData({
      title_ar: '',
      title_en: '',
      content_ar: '',
      content_en: '',
      category: 'general',
      target_audience: 'all',
      priority: 'normal',
      publish_date: '',
      expiry_date: '',
      status: 'draft',
      attachment_url: ''
    });
    setEditingNews(null);
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      general: { ar: 'عام', en: 'General' },
      policy: { ar: 'سياسات', en: 'Policy' },
      holiday: { ar: 'عطلات', en: 'Holiday' },
      announcement: { ar: 'إعلانات', en: 'Announcement' },
      event: { ar: 'فعاليات', en: 'Events' }
    };
    return labels[category]?.[language] || category;
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-slate-500',
      normal: 'bg-blue-500',
      high: 'bg-orange-500',
      urgent: 'bg-red-500'
    };
    return colors[priority] || 'bg-slate-500';
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-slate-500',
      published: 'bg-green-500',
      archived: 'bg-gray-500'
    };
    const labels: Record<string, { ar: string; en: string }> = {
      draft: { ar: 'مسودة', en: 'Draft' },
      published: { ar: 'منشور', en: 'Published' },
      archived: { ar: 'أرشيف', en: 'Archived' }
    };
    return {
      color: colors[status] || 'bg-slate-500',
      label: labels[status]?.[language] || status
    };
  };

  if (loading) {
    return (
      <div className={`p-6 rounded-3xl border shadow-xl ${
        isDark ? 'bg-[#111827] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-md'
      }`}>
        <div className={`text-center ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 rounded-3xl border shadow-xl space-y-6 transition-colors ${
      isDark ? 'bg-[#111827] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-md'
    }`}>
      {/* Header */}
      <div className={`flex items-center justify-between border-b pb-4 ${
        isDark ? 'border-white/10' : 'border-slate-200'
      }`}>
        <h2 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span className="material-symbols-outlined text-blue-500">newspaper</span>
          {language === 'ar' ? 'أخبار المؤسسة' : 'Company News'}
        </h2>
        {!isEmployee && (
          <button
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm flex items-center gap-2 shadow-md shadow-blue-600/20"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            {language === 'ar' ? 'إضافة خبر' : 'Add News'}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600 font-semibold'}`}>{language === 'ar' ? 'الحالة:' : 'Status:'}</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className={`px-3 py-1.5 rounded-xl border text-xs focus:outline-none ${
              isDark ? 'bg-slate-800 border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            <option value="all">{language === 'ar' ? 'الكل' : 'All'}</option>
            <option value="published">{language === 'ar' ? 'منشور' : 'Published'}</option>
            <option value="draft">{language === 'ar' ? 'مسودة' : 'Draft'}</option>
            <option value="archived">{language === 'ar' ? 'أرشيف' : 'Archived'}</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600 font-semibold'}`}>{language === 'ar' ? 'الفئة:' : 'Category:'}</label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className={`px-3 py-1.5 rounded-xl border text-xs focus:outline-none ${
              isDark ? 'bg-slate-800 border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            <option value="all">{language === 'ar' ? 'الكل' : 'All'}</option>
            <option value="general">{language === 'ar' ? 'عام' : 'General'}</option>
            <option value="policy">{language === 'ar' ? 'سياسات' : 'Policy'}</option>
            <option value="holiday">{language === 'ar' ? 'عطلات' : 'Holiday'}</option>
            <option value="announcement">{language === 'ar' ? 'إعلانات' : 'Announcement'}</option>
            <option value="event">{language === 'ar' ? 'فعاليات' : 'Events'}</option>
          </select>
        </div>
      </div>

      {/* News List */}
      {news.length === 0 ? (
        <EmptyState
          icon="feed"
          title={language === 'ar' ? 'لا توجد أخبار' : 'No News'}
          description={language === 'ar' ? 'لم يتم نشر أي أخبار بعد' : 'No news has been published yet'}
        />
      ) : (
        <div className="space-y-4">
          {news.map((item) => {
            const statusBadge = getStatusBadge(item.status);
            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isDark ? 'bg-slate-800/60 border-white/10 hover:border-white/20' : 'bg-white border-slate-200 shadow-xs hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs text-white ${getPriorityBadge(item.priority)}`}>
                        {item.priority}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs text-white ${statusBadge.color}`}>
                        {statusBadge.label}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        isDark ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700 font-semibold'
                      }`}>
                        {getCategoryLabel(item.category)}
                      </span>
                    </div>
                    <h3 className={`text-base font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {language === 'ar' ? item.title_ar : item.title_en}
                    </h3>
                    <p className={`text-sm mb-2 line-clamp-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {language === 'ar' ? item.content_ar : item.content_en}
                    </p>
                    <div className={`flex items-center gap-4 text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                      <span>{language === 'ar' ? 'النشر:' : 'Published:'} {item.publish_date ? item.publish_date.split('T')[0] : '-'}</span>
                      <span>{language === 'ar' ? 'المشاهدات:' : 'Views:'} {item.views_count}</span>
                      <span>{language === 'ar' ? 'بواسطة:' : 'By:'} {item.published_by}</span>
                    </div>
                  </div>
                  {!isEmployee && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(item)}
                        className={`p-2 rounded-lg transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                        title={language === 'ar' ? 'تعديل' : 'Edit'}
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                      {item.status === 'draft' && (
                        <button
                          onClick={() => handleStatusChange(item.id, 'published')}
                          className="p-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 transition-colors"
                          title={language === 'ar' ? 'نشر' : 'Publish'}
                        >
                          <span className="material-symbols-outlined text-sm">publish</span>
                        </button>
                      )}
                      {item.status === 'published' && (
                        <button
                          onClick={() => handleStatusChange(item.id, 'archived')}
                          className="p-2 rounded-lg bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 transition-colors"
                          title={language === 'ar' ? 'أرشفة' : 'Archive'}
                        >
                          <span className="material-symbols-outlined text-sm">archive</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteNews(item.id)}
                        className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
                        title={language === 'ar' ? 'حذف' : 'Delete'}
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-white/10 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/10">
              <h3 className="text-lg font-bold text-white">
                {editingNews ? (language === 'ar' ? 'تعديل الخبر' : 'Edit News') : (language === 'ar' ? 'إضافة خبر جديد' : 'Add New News')}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{language === 'ar' ? 'العنوان (عربي)' : 'Title (Arabic)'}</label>
                  <input
                    type="text"
                    value={formData.title_ar}
                    onChange={(e) => setFormData({ ...formData, title_ar: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{language === 'ar' ? 'العنوان (إنجليزي)' : 'Title (English)'}</label>
                  <input
                    type="text"
                    value={formData.title_en}
                    onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">{language === 'ar' ? 'المحتوى (عربي)' : 'Content (Arabic)'}</label>
                <textarea
                  value={formData.content_ar}
                  onChange={(e) => setFormData({ ...formData, content_ar: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm h-24"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">{language === 'ar' ? 'المحتوى (إنجليزي)' : 'Content (English)'}</label>
                <textarea
                  value={formData.content_en}
                  onChange={(e) => setFormData({ ...formData, content_en: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm h-24"
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{language === 'ar' ? 'الفئة' : 'Category'}</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                  >
                    <option value="general">{language === 'ar' ? 'عام' : 'General'}</option>
                    <option value="policy">{language === 'ar' ? 'سياسات' : 'Policy'}</option>
                    <option value="holiday">{language === 'ar' ? 'عطلات' : 'Holiday'}</option>
                    <option value="announcement">{language === 'ar' ? 'إعلانات' : 'Announcement'}</option>
                    <option value="event">{language === 'ar' ? 'فعاليات' : 'Events'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{language === 'ar' ? 'الأولوية' : 'Priority'}</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                  >
                    <option value="low">{language === 'ar' ? 'منخفضة' : 'Low'}</option>
                    <option value="normal">{language === 'ar' ? 'عادية' : 'Normal'}</option>
                    <option value="high">{language === 'ar' ? 'عالية' : 'High'}</option>
                    <option value="urgent">{language === 'ar' ? 'عاجلة' : 'Urgent'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{language === 'ar' ? 'الحالة' : 'Status'}</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                  >
                    <option value="draft">{language === 'ar' ? 'مسودة' : 'Draft'}</option>
                    <option value="published">{language === 'ar' ? 'منشور' : 'Published'}</option>
                    <option value="archived">{language === 'ar' ? 'أرشيف' : 'Archived'}</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{language === 'ar' ? 'تاريخ النشر' : 'Publish Date'}</label>
                  <input
                    type="date"
                    value={formData.publish_date}
                    onChange={(e) => setFormData({ ...formData, publish_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{language === 'ar' ? 'تاريخ الانتهاء' : 'Expiry Date'}</label>
                  <input
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">{language === 'ar' ? 'رابط المرفق' : 'Attachment URL'}</label>
                <input
                  type="text"
                  value={formData.attachment_url}
                  onChange={(e) => setFormData({ ...formData, attachment_url: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="p-6 border-t border-white/10 flex items-center justify-end gap-3">
              <button
                onClick={() => { setShowAddModal(false); resetForm(); }}
                className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 font-bold hover:bg-white/10 border border-white/10 text-sm"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={editingNews ? handleUpdateNews : handleAddNews}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm"
              >
                {editingNews ? (language === 'ar' ? 'تحديث' : 'Update') : (language === 'ar' ? 'إضافة' : 'Add')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};