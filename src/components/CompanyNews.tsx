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
    attachment_url: '',
    image_url: ''
  });

  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [showAttachmentUrlInput, setShowAttachmentUrlInput] = useState(false);

  // Translation states
  const [isTranslatingTitle, setIsTranslatingTitle] = useState(false);
  const [isTranslatingContent, setIsTranslatingContent] = useState(false);
  const [hasUserModifiedTitleEn, setHasUserModifiedTitleEn] = useState(false);
  const [hasUserModifiedContentEn, setHasUserModifiedContentEn] = useState(false);
  const [autoTranslateEnabled, setAutoTranslateEnabled] = useState(true);

  // Debounced Auto-Translate Title from Arabic to English
  useEffect(() => {
    if (!showAddModal || !autoTranslateEnabled || hasUserModifiedTitleEn) return;
    const textToTranslate = formData.title_ar.trim();
    if (!textToTranslate) {
      if (!hasUserModifiedTitleEn) {
        setFormData(prev => ({ ...prev, title_en: '' }));
      }
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsTranslatingTitle(true);
        const res = await api.translate(textToTranslate, 'ar', 'en');
        if (res && res.translatedText && !hasUserModifiedTitleEn) {
          setFormData(prev => ({ ...prev, title_en: res.translatedText }));
        }
      } catch (err) {
        console.warn('Auto translation of title failed:', err);
      } finally {
        setIsTranslatingTitle(false);
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [formData.title_ar, showAddModal, autoTranslateEnabled, hasUserModifiedTitleEn]);

  // Debounced Auto-Translate Content from Arabic to English
  useEffect(() => {
    if (!showAddModal || !autoTranslateEnabled || hasUserModifiedContentEn) return;
    const textToTranslate = formData.content_ar.trim();
    if (!textToTranslate) {
      if (!hasUserModifiedContentEn) {
        setFormData(prev => ({ ...prev, content_en: '' }));
      }
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsTranslatingContent(true);
        const res = await api.translate(textToTranslate, 'ar', 'en');
        if (res && res.translatedText && !hasUserModifiedContentEn) {
          setFormData(prev => ({ ...prev, content_en: res.translatedText }));
        }
      } catch (err) {
        console.warn('Auto translation of content failed:', err);
      } finally {
        setIsTranslatingContent(false);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [formData.content_ar, showAddModal, autoTranslateEnabled, hasUserModifiedContentEn]);

  const handleManualTranslateTitle = async () => {
    const text = formData.title_ar.trim();
    if (!text) return;
    try {
      setIsTranslatingTitle(true);
      const res = await api.translate(text, 'ar', 'en');
      if (res && res.translatedText) {
        setFormData(prev => ({ ...prev, title_en: res.translatedText }));
      }
    } catch (err) {
      console.error('Failed to translate title:', err);
    } finally {
      setIsTranslatingTitle(false);
    }
  };

  const handleManualTranslateContent = async () => {
    const text = formData.content_ar.trim();
    if (!text) return;
    try {
      setIsTranslatingContent(true);
      const res = await api.translate(text, 'ar', 'en');
      if (res && res.translatedText) {
        setFormData(prev => ({ ...prev, content_en: res.translatedText }));
      }
    } catch (err) {
      console.error('Failed to translate content:', err);
    } finally {
      setIsTranslatingContent(false);
    }
  };

  const handleTranslateAll = async () => {
    await Promise.all([
      handleManualTranslateTitle(),
      handleManualTranslateContent()
    ]);
  };

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

  const handleImageFileSelect = async (file: File) => {
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setUploadError(language === 'ar' ? 'حجم الصورة يجب ألا يتجاوز 10 ميغابايت' : 'Image size must be less than 10MB');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setUploadError(language === 'ar' ? 'يرجى اختيار ملف صورة صالح (JPG, PNG, WebP)' : 'Please select a valid image file (JPG, PNG, WebP)');
      return;
    }

    try {
      setUploadingImage(true);
      setUploadError(null);
      const res = await api.uploadNewsImage(file);
      if (res && res.url) {
        setFormData(prev => ({ ...prev, image_url: res.url }));
      }
    } catch (err: any) {
      console.error('Failed to upload news image:', err);
      setUploadError(err.message || (language === 'ar' ? 'فشل رفع الصورة، يرجى المحاولة ثانية' : 'Failed to upload image'));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveNews = async (publishImmediately: boolean = false) => {
    if (!formData.title_ar.trim()) {
      alert(language === 'ar' ? 'يرجى إدخال العنوان بالعربية' : 'Please enter Arabic title');
      return;
    }
    if (!formData.content_ar.trim()) {
      alert(language === 'ar' ? 'يرجى إدخال المحتوى بالعربية' : 'Please enter Arabic content');
      return;
    }

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const payload: any = {
        ...formData,
        published_by: currentUser?.name || 'HR Admin'
      };

      if (publishImmediately) {
        payload.status = 'published';
        payload.publish_date = todayStr;
      } else {
        // If scheduled for future, mark as draft so it auto-publishes on the exact date
        if (formData.publish_date && formData.publish_date > todayStr) {
          payload.status = 'draft';
        }
      }

      if (editingNews) {
        await api.updateNews(editingNews.id.toString(), payload);
      } else {
        await api.addNews(payload);
      }

      setShowAddModal(false);
      resetForm();
      loadNews();
    } catch (error) {
      console.error('Error saving news:', error);
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
    const existingImg = newsItem.image_url || (newsItem.attachment_url && newsItem.attachment_url.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i) ? newsItem.attachment_url : '');
    const isDoc = !!newsItem.attachment_url && !newsItem.attachment_url.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i);
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
      attachment_url: isDoc ? newsItem.attachment_url : '',
      image_url: existingImg
    });
    setUploadError(null);
    setShowAttachmentUrlInput(isDoc);
    setHasUserModifiedTitleEn(true);
    setHasUserModifiedContentEn(true);
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
      attachment_url: '',
      image_url: ''
    });
    setUploadError(null);
    setUploadingImage(false);
    setShowAttachmentUrlInput(false);
    setHasUserModifiedTitleEn(false);
    setHasUserModifiedContentEn(false);
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
    if (!isDark) {
      const lightColors: Record<string, string> = {
        low: 'bg-white text-slate-700 border border-slate-300 font-bold',
        normal: 'bg-white text-blue-700 border border-slate-300 font-bold',
        high: 'bg-white text-amber-700 border border-slate-300 font-bold',
        urgent: 'bg-white text-rose-700 border border-slate-300 font-bold'
      };
      return lightColors[priority] || 'bg-white text-slate-700 border border-slate-300 font-bold';
    }

    const darkColors: Record<string, string> = {
      low: 'bg-slate-700 text-slate-200 border border-slate-600',
      normal: 'bg-blue-500/20 text-blue-300 border border-blue-500/40',
      high: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
      urgent: 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
    };
    return darkColors[priority] || 'bg-slate-700 text-slate-200 border border-slate-600';
  };

  const getStatusBadge = (item: CompanyNewsItem) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const pubDate = item.publish_date ? item.publish_date.split('T')[0] : '';
    const expDate = item.expiry_date ? item.expiry_date.split('T')[0] : '';
    
    const isExpired = !!expDate && expDate < todayStr;
    const isScheduledFuture = (item.status === 'draft') && !!pubDate && pubDate > todayStr;

    if (isExpired || item.status === 'archived') {
      return {
        color: !isDark 
          ? 'bg-white text-purple-800 border-2 border-[#a855f7] shadow-[0_0_10px_rgba(168,85,247,0.4)] ring-2 ring-purple-400/30 font-extrabold'
          : 'bg-purple-500/20 text-purple-300 border-2 border-[#a855f7] shadow-[0_0_10px_rgba(168,85,247,0.6)] font-bold',
        label: isExpired 
          ? (language === 'ar' ? 'منتهي الصلاحية' : 'Expired')
          : (language === 'ar' ? 'أرشيف' : 'Archived'),
        icon: 'history'
      };
    }

    if (isScheduledFuture) {
      return {
        color: !isDark
          ? 'bg-white text-sky-800 border-2 border-sky-500 shadow-[0_0_10px_rgba(14,165,233,0.4)] ring-2 ring-sky-400/30 font-extrabold'
          : 'bg-sky-500/20 text-sky-300 border-2 border-sky-500 shadow-[0_0_10px_rgba(14,165,233,0.6)] font-bold',
        label: language === 'ar' ? `مجدول تلقائياً (${pubDate})` : `Scheduled (${pubDate})`,
        icon: 'schedule'
      };
    }

    if (item.status === 'published') {
      return {
        color: !isDark
          ? 'bg-white text-emerald-800 border-2 border-[#10b981] shadow-[0_0_12px_rgba(16,185,129,0.5)] ring-2 ring-emerald-400/40 font-extrabold'
          : 'bg-emerald-500/20 text-emerald-300 border-2 border-[#10b981] shadow-[0_0_12px_rgba(16,185,129,0.6)] font-bold',
        label: language === 'ar' ? 'منشور نشط' : 'Published Active',
        icon: 'check_circle'
      };
    }

    return {
      color: !isDark
        ? 'bg-white text-amber-800 border-2 border-[#f59e0b] shadow-[0_0_10px_rgba(245,158,11,0.4)] ring-2 ring-amber-400/30 font-extrabold'
        : 'bg-amber-500/20 text-amber-300 border-2 border-[#f59e0b] shadow-[0_0_10px_rgba(245,158,11,0.6)] font-bold',
      label: language === 'ar' ? 'مسودة' : 'Draft',
      icon: 'draft'
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
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm flex items-center gap-2 shadow-md shadow-teal-600/20"
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
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold focus:outline-none transition-all cursor-pointer ${
              filterStatus === 'published'
                ? 'bg-white text-emerald-800 border-2 border-[#10b981] shadow-[0_0_10px_rgba(16,185,129,0.5)] ring-2 ring-emerald-400/30'
                : filterStatus === 'draft'
                ? 'bg-white text-amber-800 border-2 border-[#f59e0b] shadow-[0_0_10px_rgba(245,158,11,0.5)] ring-2 ring-amber-400/30'
                : filterStatus === 'archived'
                ? 'bg-white text-purple-800 border-2 border-[#a855f7] shadow-[0_0_10px_rgba(168,85,247,0.5)] ring-2 ring-purple-400/30'
                : isDark ? 'bg-slate-800 border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            <option value="all">{language === 'ar' ? 'الكل' : 'All'}</option>
            <option value="published">{language === 'ar' ? 'منشور نشط' : 'Published'}</option>
            <option value="draft">{language === 'ar' ? 'مسودة ومجدول' : 'Draft & Scheduled'}</option>
            <option value="archived">{language === 'ar' ? 'أرشيف ومنتهي' : 'Archived & Expired'}</option>
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
            const statusBadge = getStatusBadge(item);
            const itemImage = item.image_url || (item.attachment_url && item.attachment_url.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i) ? item.attachment_url : null);
            const hasExternalDoc = item.attachment_url && !item.attachment_url.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i);

            return (
              <div
                key={item.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  isDark ? 'bg-slate-800/60 border-white/10 hover:border-white/20' : 'bg-white border-slate-200 shadow-xs hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                  {/* Thumbnail Image if available */}
                  {itemImage && (
                    <div 
                      onClick={() => setLightboxImage(itemImage)}
                      className="relative group cursor-pointer overflow-hidden rounded-xl border border-slate-200 dark:border-white/10 w-full md:w-48 h-40 md:h-32 flex-shrink-0 bg-slate-900/10 shadow-xs"
                      title={language === 'ar' ? 'اضغط لتكبير الصورة' : 'Click to enlarge image'}
                    >
                      <img
                        src={itemImage}
                        alt={language === 'ar' ? item.title_ar : item.title_en}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1 text-xs font-bold">
                        <span className="material-symbols-outlined text-base">zoom_in</span>
                        {language === 'ar' ? 'عرض الصورة' : 'View Image'}
                      </div>
                    </div>
                  )}

                  <div className="flex-1 min-w-0 w-full">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs ${getPriorityBadge(item.priority)}`}>
                        {item.priority}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs flex items-center gap-1 ${statusBadge.color}`}>
                        <span className="material-symbols-outlined text-[13px]">{statusBadge.icon}</span>
                        <span>{statusBadge.label}</span>
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs ${
                        isDark ? 'bg-white/10 text-white border border-white/10' : 'bg-white text-slate-700 border border-slate-300 font-bold shadow-2xs'
                      }`}>
                        {getCategoryLabel(item.category)}
                      </span>
                    </div>

                    <h3 className={`text-base font-bold mb-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {language === 'ar' ? item.title_ar : item.title_en}
                    </h3>

                    <p className={`text-sm mb-3 whitespace-pre-line line-clamp-3 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      {language === 'ar' ? item.content_ar : item.content_en}
                    </p>

                    {/* External Document / Link Attachment Badge */}
                    {hasExternalDoc && (
                      <div className="mb-3">
                        <a
                          href={item.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all border ${
                            isDark 
                              ? 'bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border-teal-500/30' 
                              : 'bg-teal-50 hover:bg-teal-100 text-teal-800 border-teal-200 shadow-2xs'
                          }`}
                        >
                          <span className="material-symbols-outlined text-xs">attach_file</span>
                          <span>{language === 'ar' ? 'فتح المرفق / المستند' : 'Open Attachment / Document'}</span>
                          <span className="material-symbols-outlined text-[10px]">open_in_new</span>
                        </a>
                      </div>
                    )}

                    <div className={`flex items-center gap-4 text-xs flex-wrap ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                      <span>{language === 'ar' ? 'النشر:' : 'Published:'} {item.publish_date ? item.publish_date.split('T')[0] : '-'}</span>
                      <span>{language === 'ar' ? 'المشاهدات:' : 'Views:'} {item.views_count}</span>
                      <span>{language === 'ar' ? 'بواسطة:' : 'By:'} {item.published_by}</span>
                    </div>
                  </div>

                  {!isEmployee && (
                    <div className="flex items-center gap-2 self-start flex-wrap">
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
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
                          title={language === 'ar' ? 'إطلاق الإعلان ونشره الآن فوراً' : 'Publish announcement now'}
                        >
                          <span className="material-symbols-outlined text-xs">rocket_launch</span>
                          <span>{language === 'ar' ? 'نشر الآن' : 'Publish'}</span>
                        </button>
                      )}
                      {item.status === 'published' && (
                        <button
                          onClick={() => handleStatusChange(item.id, 'archived')}
                          className={`p-2 rounded-lg transition-colors ${
                            isDark ? 'bg-gray-500/20 hover:bg-gray-500/30 text-gray-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                          }`}
                          title={language === 'ar' ? 'أرشفة' : 'Archive'}
                        >
                          <span className="material-symbols-outlined text-sm">archive</span>
                        </button>
                      )}
                      {item.status === 'archived' && (
                        <button
                          onClick={() => handleStatusChange(item.id, 'published')}
                          className={`px-2.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1 transition-all cursor-pointer ${
                            isDark ? 'bg-teal-500/20 hover:bg-teal-500/30 text-teal-300' : 'bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200'
                          }`}
                          title={language === 'ar' ? 'إعادة نشر الإعلان' : 'Republish announcement'}
                        >
                          <span className="material-symbols-outlined text-xs">replay</span>
                          <span>{language === 'ar' ? 'إعادة نشر' : 'Republish'}</span>
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`border rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto ${
            isDark ? 'bg-[#0f172a] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            {/* Top Modal Header with Add / Cancel Actions & Close */}
            <div className={`p-4 sm:p-5 border-b flex items-center justify-between gap-3 sticky top-0 z-10 ${
              isDark ? 'border-slate-800 bg-[#0f172a]' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-600 dark:text-teal-400 text-2xl">newspaper</span>
                <h3 className="text-base sm:text-lg font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                  {editingNews ? (language === 'ar' ? 'تعديل الخبر' : 'Edit News') : (language === 'ar' ? 'إضافة خبر جديد' : 'Add New News')}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); resetForm(); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    isDark 
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' 
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-sm'
                  }`}
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>

                {/* Save / Schedule Button */}
                <button
                  type="button"
                  onClick={() => handleSaveNews(false)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                    isDark 
                      ? 'bg-sky-950/40 hover:bg-sky-900/60 text-sky-300 border-sky-500/40' 
                      : 'bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-300 shadow-sm'
                  }`}
                  title={language === 'ar' ? 'حفظ مسودة أو جدولة للنشر التلقائي في التاريخ المحدد' : 'Save draft or schedule for auto-launch on date'}
                >
                  <span className="material-symbols-outlined text-xs">schedule_send</span>
                  <span>{language === 'ar' ? 'حفظ / جدولة' : 'Save / Schedule'}</span>
                </button>

                {/* Immediate Manual Publish Button */}
                <button
                  type="button"
                  onClick={() => handleSaveNews(true)}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition-all flex items-center gap-1.5 cursor-pointer ring-2 ring-emerald-400/30"
                  title={language === 'ar' ? 'إطلاق ونشر الإعلان فوراً لجميع الموظفين' : 'Publish announcement now'}
                >
                  <span className="material-symbols-outlined text-sm">rocket_launch</span>
                  <span>{language === 'ar' ? 'نشر الآن' : 'Publish Now'}</span>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Auto Translation Banner & Quick Controls */}
              <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                isDark ? 'bg-teal-950/40 border-teal-500/30 text-teal-300' : 'bg-teal-50 border-teal-200 text-teal-900 shadow-2xs'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-teal-600 dark:text-teal-400 text-lg">g_translate</span>
                  <span className="font-bold">
                    {language === 'ar'
                      ? 'الترجمة التلقائية إلى الإنجليزية مفعّلة فورياً، ويمكنك تعديل النص الإنجليزي بحرية تامة'
                      : 'Real-time English auto-translation active, with full manual editing capability'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTranslateAll}
                    disabled={isTranslatingTitle || isTranslatingContent || (!formData.title_ar.trim() && !formData.content_ar.trim())}
                    className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white font-bold text-[11px] flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    title={language === 'ar' ? 'ترجمة العنوان والمحتوى الآن' : 'Translate all fields now'}
                  >
                    <span className={`material-symbols-outlined text-xs ${(isTranslatingTitle || isTranslatingContent) ? 'animate-spin' : ''}`}>
                      {(isTranslatingTitle || isTranslatingContent) ? 'refresh' : 'sync'}
                    </span>
                    <span>
                      {(isTranslatingTitle || isTranslatingContent)
                        ? (language === 'ar' ? 'جاري الترجمة...' : 'Translating...')
                        : (language === 'ar' ? 'ترجمة الكل الآن' : 'Translate All')}
                    </span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                    {language === 'ar' ? 'العنوان (عربي)' : 'Title (Arabic)'}
                  </label>
                  <input
                    type="text"
                    value={formData.title_ar}
                    onChange={(e) => setFormData({ ...formData, title_ar: e.target.value })}
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    className={`w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all ${
                      isDark ? 'bg-[#1e293b] border-slate-700 focus:border-teal-400' : 'bg-slate-50 border-slate-300 focus:border-teal-600'
                    }`}
                    placeholder={language === 'ar' ? 'اكتب العنوان بالعربية...' : 'Enter Arabic title...'}
                    required
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                      {language === 'ar' ? 'العنوان (إنجليزي)' : 'Title (English)'}
                    </label>
                    {isTranslatingTitle ? (
                      <span className="text-[11px] text-teal-600 dark:text-teal-400 flex items-center gap-1 font-semibold animate-pulse">
                        <span className="material-symbols-outlined text-xs animate-spin">refresh</span>
                        {language === 'ar' ? 'جاري الترجمة...' : 'Translating...'}
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {hasUserModifiedTitleEn && formData.title_en && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium">
                            {language === 'ar' ? 'معدل يدوياً' : 'Edited'}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={handleManualTranslateTitle}
                          disabled={!formData.title_ar.trim()}
                          className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-0.5 font-semibold cursor-pointer disabled:opacity-40"
                          title={language === 'ar' ? 'إعادة ترجمة العنوان' : 'Re-translate title'}
                        >
                          <span className="material-symbols-outlined text-xs">translate</span>
                          <span>{language === 'ar' ? 'إعادة الترجمة' : 'Re-translate'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    value={formData.title_en}
                    onChange={(e) => {
                      setHasUserModifiedTitleEn(true);
                      setFormData({ ...formData, title_en: e.target.value });
                    }}
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    className={`w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all ${
                      isDark ? 'bg-[#1e293b] border-slate-700 focus:border-teal-400' : 'bg-slate-50 border-slate-300 focus:border-teal-600'
                    }`}
                    placeholder={language === 'ar' ? 'يُترجم تلقائياً من العربية، ويمكنك تعديله...' : 'Auto-translates from Arabic, editable...'}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                  {language === 'ar' ? 'المحتوى (عربي)' : 'Content (Arabic)'}
                </label>
                <textarea
                  value={formData.content_ar}
                  onChange={(e) => setFormData({ ...formData, content_ar: e.target.value })}
                  style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                  className={`w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all h-24 ${
                    isDark ? 'bg-[#1e293b] border-slate-700 focus:border-teal-400' : 'bg-slate-50 border-slate-300 focus:border-teal-600'
                  }`}
                  placeholder={language === 'ar' ? 'اكتب محتوى الخبر أو الإعلان بالعربية...' : 'Enter Arabic content...'}
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                    {language === 'ar' ? 'المحتوى (إنجليزي)' : 'Content (English)'}
                  </label>
                  {isTranslatingContent ? (
                    <span className="text-[11px] text-teal-600 dark:text-teal-400 flex items-center gap-1 font-semibold animate-pulse">
                      <span className="material-symbols-outlined text-xs animate-spin">refresh</span>
                      {language === 'ar' ? 'جاري الترجمة...' : 'Translating...'}
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      {hasUserModifiedContentEn && formData.content_en && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium">
                          {language === 'ar' ? 'معدل يدوياً' : 'Edited'}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={handleManualTranslateContent}
                        disabled={!formData.content_ar.trim()}
                        className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-0.5 font-semibold cursor-pointer disabled:opacity-40"
                        title={language === 'ar' ? 'إعادة ترجمة المحتوى' : 'Re-translate content'}
                      >
                        <span className="material-symbols-outlined text-xs">translate</span>
                        <span>{language === 'ar' ? 'إعادة الترجمة' : 'Re-translate'}</span>
                      </button>
                    </div>
                  )}
                </div>
                <textarea
                  value={formData.content_en}
                  onChange={(e) => {
                    setHasUserModifiedContentEn(true);
                    setFormData({ ...formData, content_en: e.target.value });
                  }}
                  style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                  className={`w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all h-24 ${
                    isDark ? 'bg-[#1e293b] border-slate-700 focus:border-teal-400' : 'bg-slate-50 border-slate-300 focus:border-teal-600'
                  }`}
                  placeholder={language === 'ar' ? 'يُترجم المحتوى تلقائياً من العربية، ويمكنك تعديله بحرية...' : 'Content translates automatically from Arabic, editable...'}
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                    {language === 'ar' ? 'الفئة' : 'Category'}
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    className={`w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all ${
                      isDark ? 'bg-[#1e293b] border-slate-700 focus:border-teal-400' : 'bg-slate-50 border-slate-300 focus:border-teal-600'
                    }`}
                  >
                    <option value="general">{language === 'ar' ? 'عام' : 'General'}</option>
                    <option value="policy">{language === 'ar' ? 'سياسات' : 'Policy'}</option>
                    <option value="holiday">{language === 'ar' ? 'عطلات' : 'Holiday'}</option>
                    <option value="announcement">{language === 'ar' ? 'إعلانات' : 'Announcement'}</option>
                    <option value="event">{language === 'ar' ? 'فعاليات' : 'Events'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                    {language === 'ar' ? 'الأولوية' : 'Priority'}
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    className={`w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all ${
                      isDark ? 'bg-[#1e293b] border-slate-700 focus:border-teal-400' : 'bg-slate-50 border-slate-300 focus:border-teal-600'
                    }`}
                  >
                    <option value="low">{language === 'ar' ? 'منخفضة' : 'Low'}</option>
                    <option value="normal">{language === 'ar' ? 'عادية' : 'Normal'}</option>
                    <option value="high">{language === 'ar' ? 'عالية' : 'High'}</option>
                    <option value="urgent">{language === 'ar' ? 'عاجلة' : 'Urgent'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                    {language === 'ar' ? 'الحالة' : 'Status'}
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    className={`w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all ${
                      isDark ? 'bg-[#1e293b] border-slate-700 focus:border-teal-400' : 'bg-slate-50 border-slate-300 focus:border-teal-600'
                    }`}
                  >
                    <option value="draft">{language === 'ar' ? 'مسودة (أو جدولة للنشر التلقائي)' : 'Draft (Auto-publishes on date)'}</option>
                    <option value="published">{language === 'ar' ? 'منشور نشط' : 'Published'}</option>
                    <option value="archived">{language === 'ar' ? 'أرشيف' : 'Archived'}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                    {language === 'ar' ? 'تاريخ النشر' : 'Publish Date'}
                  </label>
                  <input
                    type="date"
                    value={formData.publish_date}
                    onChange={(e) => setFormData({ ...formData, publish_date: e.target.value })}
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    className={`w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all ${
                      isDark ? 'bg-[#1e293b] border-slate-700 focus:border-teal-400' : 'bg-slate-50 border-slate-300 focus:border-teal-600'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                    {language === 'ar' ? 'تاريخ الانتهاء' : 'Expiry Date'}
                  </label>
                  <input
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    className={`w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all ${
                      isDark ? 'bg-[#1e293b] border-slate-700 focus:border-teal-400' : 'bg-slate-50 border-slate-300 focus:border-teal-600'
                    }`}
                  />
                </div>
              </div>

              {/* Scheduling & Manual Publishing Notice */}
              <div className={`p-3.5 rounded-2xl border text-xs flex items-start gap-3 transition-all ${
                isDark ? 'bg-sky-950/40 border-sky-500/30 text-sky-200' : 'bg-sky-50 border-sky-200 text-sky-900 shadow-2xs'
              }`}>
                <span className="material-symbols-outlined text-sky-500 text-xl flex-shrink-0 mt-0.5">schedule_send</span>
                <div className="space-y-1 w-full">
                  <span className="font-bold flex items-center gap-1.5 text-xs sm:text-sm">
                    {language === 'ar' ? 'الجدولة التلقائية والنشر اليدوي:' : 'Automatic Scheduling & Manual Publishing:'}
                  </span>
                  <div className="text-[11px] leading-relaxed space-y-1 opacity-90">
                    <p>
                      <strong>{language === 'ar' ? '• إطلاق تلقائي حسب التاريخ:' : '• Auto-launch by Date:'}</strong>{' '}
                      {language === 'ar'
                        ? 'عند تحديد تاريخ نشر مستقبلي والضغط على "حفظ / جدولة"، سيبقى الإعلان محفوظاً ويُنشر تلقائياً لجميع الموظفين فور حلول التاريخ، وتتم أرشفته تلقائياً عند انتهاء تاريخ الصلاحية.'
                        : 'Set a future publish date and click "Save / Schedule" to auto-release the news on that date, with auto-expiry.'}
                    </p>
                    <p>
                      <strong>{language === 'ar' ? '• إطلاق ونشر يدوي فوراً:' : '• Instant Manual Publish:'}</strong>{' '}
                      {language === 'ar'
                        ? 'يمكنك الضغط على زر "نشر الآن" في أي وقت لإطلاق الإعلان فوراً دون انتظار موعد الجدولة.'
                        : 'Click "Publish Now" at any time to launch immediately regardless of scheduled dates.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* News / Announcement Image Upload Section */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-teal-600 dark:text-teal-400 text-sm">photo_library</span>
                      {language === 'ar' ? 'صورة الخبر أو الإعلان' : 'News & Announcement Image'}
                    </span>
                  </label>
                  {formData.image_url && (
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">check_circle</span>
                      {language === 'ar' ? 'تم اختيار الصورة بنجاح' : 'Image ready'}
                    </span>
                  )}
                </div>

                {formData.image_url ? (
                  /* Image Preview Card */
                  <div className={`relative p-3.5 rounded-2xl border transition-all ${
                    isDark ? 'bg-slate-800/80 border-teal-500/30' : 'bg-slate-50 border-teal-500/40 shadow-xs'
                  }`}>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div 
                        onClick={() => setLightboxImage(formData.image_url)}
                        className="relative group cursor-pointer overflow-hidden rounded-xl border border-teal-500/30 w-full sm:w-44 h-28 flex-shrink-0 bg-black/20 shadow-xs"
                        title={language === 'ar' ? 'معاينة الصورة بالحجم الكامل' : 'Preview full size'}
                      >
                        <img
                          src={formData.image_url}
                          alt="Preview"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1 text-xs font-bold">
                          <span className="material-symbols-outlined text-base">zoom_in</span>
                          {language === 'ar' ? 'معاينة' : 'Zoom'}
                        </div>
                      </div>

                      <div className="flex-1 w-full space-y-2">
                        <p className={`text-xs break-all font-mono font-bold line-clamp-1 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                          {formData.image_url.split('/').pop()}
                        </p>
                        <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {language === 'ar' 
                            ? 'ستظهر هذه الصورة في كارت الخبر وداخل إعلانات الموظفين وبشكل مميز.' 
                            : 'This image will be displayed on the news card and inside employee feeds.'}
                        </p>
                        
                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                          <label className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer inline-flex items-center gap-1.5 ${
                            isDark 
                              ? 'bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600' 
                              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-2xs'
                          }`}>
                            <span className="material-symbols-outlined text-xs text-teal-500">change_circle</span>
                            {language === 'ar' ? 'تغيير الصورة' : 'Change Image'}
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp,image/gif"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageFileSelect(file);
                              }}
                              className="hidden"
                            />
                          </label>

                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-500 hover:text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-xs">delete</span>
                            {language === 'ar' ? 'إزالة الصورة' : 'Remove Image'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Modern Dropzone */
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragOver(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleImageFileSelect(file);
                    }}
                    className={`relative border-2 border-dashed rounded-2xl p-5 text-center transition-all cursor-pointer ${
                      isDragOver
                        ? 'border-teal-500 bg-teal-500/10 scale-[1.01]'
                        : isDark 
                        ? 'border-slate-700 bg-slate-800/40 hover:bg-slate-800/70 hover:border-teal-500/50' 
                        : 'border-slate-300 bg-slate-50/70 hover:bg-slate-100/70 hover:border-teal-500'
                    }`}
                  >
                    <input
                      type="file"
                      id="news-image-input"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      disabled={uploadingImage}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageFileSelect(file);
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    />

                    {uploadingImage ? (
                      <div className="py-3 flex flex-col items-center justify-center gap-2">
                        <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-xs font-bold text-teal-600 dark:text-teal-400">
                          {language === 'ar' ? 'جاري رفع وحفظ الصورة...' : 'Uploading image...'}
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-11 h-11 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                          <span className="material-symbols-outlined text-2xl">add_photo_alternate</span>
                        </div>
                        <div>
                          <p className={`text-xs sm:text-sm font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                            {language === 'ar' ? 'اضغط لاختيار صورة من جهازك أو اسحبها هنا' : 'Click to choose image or drag & drop here'}
                          </p>
                          <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {language === 'ar' ? 'صيغ الصور المدعومة: PNG, JPG, JPEG, WebP (بحد أقصى 10 ميغابايت)' : 'Supported: PNG, JPG, JPEG, WebP (Max 10MB)'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {uploadError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">error</span>
                    <span>{uploadError}</span>
                  </div>
                )}

                {/* Optional External Document / Link Attachment */}
                <div className="pt-1">
                  {!showAttachmentUrlInput && !formData.attachment_url ? (
                    <button
                      type="button"
                      onClick={() => setShowAttachmentUrlInput(true)}
                      className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-xs">link</span>
                      {language === 'ar' ? '+ إضافة رابط مرفق أو ملف خارجي (PDF / رابط ويب)' : '+ Add external attachment or document link (PDF / Web)'}
                    </button>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                          {language === 'ar' ? 'رابط المرفق أو المستند الإضافي' : 'Attachment or Document URL'}
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAttachmentUrlInput(false);
                            setFormData(prev => ({ ...prev, attachment_url: '' }));
                          }}
                          className="text-[11px] text-slate-400 hover:text-rose-500 cursor-pointer"
                        >
                          {language === 'ar' ? 'إلغاء المرفق' : 'Cancel attachment'}
                        </button>
                      </div>
                      <input
                        type="text"
                        value={formData.attachment_url}
                        onChange={(e) => setFormData({ ...formData, attachment_url: e.target.value })}
                        style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                        className={`w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all ${
                          isDark ? 'bg-[#1e293b] border-slate-700 focus:border-teal-400' : 'bg-slate-50 border-slate-300 focus:border-teal-600'
                        }`}
                        placeholder="https://... (مثال: رابط ملف PDF أو إعلان خارجي)"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Lightbox Modal for Enlarged Image Preview */}
      {lightboxImage && (
        <div 
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
          >
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all cursor-pointer"
              title={language === 'ar' ? 'إغلاق' : 'Close'}
            >
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>
            <img
              src={lightboxImage}
              alt="Enlarged"
              className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-white/10"
            />
            <div className="mt-3 flex items-center gap-3">
              <a
                href={lightboxImage}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">open_in_new</span>
                {language === 'ar' ? 'فتح الصورة بالكامل' : 'Open Full Image'}
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};