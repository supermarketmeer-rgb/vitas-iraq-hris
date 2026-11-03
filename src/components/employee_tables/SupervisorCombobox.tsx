import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ChevronDown, Check, X, UserCheck, Shield, Sparkles } from 'lucide-react';

export interface DirectSupervisor {
  id?: number | string;
  badge_no: string;
  supervisor_name: string;
  supervisor_position: string;
}

interface SupervisorComboboxProps {
  value: string;
  onChange: (val: string, supervisor?: DirectSupervisor | null) => void;
  placeholder?: string;
  isDark?: boolean;
  disabled?: boolean;
  language?: 'ar' | 'en';
  employeesList?: any[];
}

export const SupervisorCombobox: React.FC<SupervisorComboboxProps> = ({
  value,
  onChange,
  placeholder,
  isDark = true,
  disabled = false,
  language = 'ar',
  employeesList = []
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [supervisors, setSupervisors] = useState<DirectSupervisor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const t = (ar: string, en: string) => (language === 'ar' ? ar : en);

  // Load supervisors from API with fallback
  const loadSupervisors = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/direct-supervisors');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setSupervisors(data);
          return;
        }
      }
    } catch (e) {
      console.warn('Could not load supervisors from API, using fallback:', e);
    } finally {
      setIsLoading(false);
    }

    // Fallback: extract managers/supervisors from employees list if database table is currently empty
    if (employeesList && employeesList.length > 0) {
      const fallbackList: DirectSupervisor[] = employeesList
        .filter(e => {
          const title = (e.jobTitle || e.job_title || e.position || e.position_ar || '').toLowerCase();
          return title.includes('مدير') || title.includes('مشرف') || title.includes('manager') || title.includes('supervisor') || title.includes('lead');
        })
        .map(e => ({
          id: e.id,
          badge_no: e.badgeNo || e.badge_no || e.employeeId || e.employee_id || 'N/A',
          supervisor_name: e.name || e.full_name_ar || e.full_name_en || '',
          supervisor_position: e.jobTitle || e.job_title || e.position_ar || e.position || ''
        }));
      setSupervisors(fallbackList);
    }
  };

  useEffect(() => {
    loadSupervisors();
  }, [employeesList.length]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered list
  const filteredSupervisors = useMemo(() => {
    if (!searchTerm.trim()) return supervisors;
    const q = searchTerm.toLowerCase().trim();
    return supervisors.filter(s =>
      (s.supervisor_name || '').toLowerCase().includes(q) ||
      (s.supervisor_position || '').toLowerCase().includes(q) ||
      (s.badge_no || '').toLowerCase().includes(q)
    );
  }, [supervisors, searchTerm]);

  const handleSelect = (sup: DirectSupervisor) => {
    onChange(sup.supervisor_name, sup);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', null);
    setSearchTerm('');
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Combobox Trigger / Input */}
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-200 cursor-pointer ${
          isDark
            ? 'bg-[#0f172a]/90 border-slate-700/80 hover:border-teal-500/60 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20 text-slate-100'
            : 'bg-white border-slate-300 hover:border-teal-500 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20 text-slate-900 shadow-sm'
        } ${disabled ? 'opacity-60 pointer-events-none' : ''}`}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            if (!isOpen && inputRef.current) {
              setTimeout(() => inputRef.current?.focus(), 50);
            }
          }
        }}
      >
        <UserCheck className={`w-4 h-4 shrink-0 ${value ? 'text-teal-500' : 'text-slate-400'}`} />

        <div className="flex-1 min-w-0">
          {value ? (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs sm:text-sm truncate">{value}</span>
              {/* Show matching supervisor badge if found */}
              {(() => {
                const matched = supervisors.find(s => s.supervisor_name.trim() === value.trim());
                if (matched?.badge_no) {
                  return (
                    <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-teal-500/15 text-teal-400 border border-teal-500/30">
                      {matched.badge_no}
                    </span>
                  );
                }
                return null;
              })()}
            </div>
          ) : (
            <span className="text-xs sm:text-sm text-slate-400">
              {placeholder || t('اختر أو ابحث عن المشرف المباشر من الجدول...', 'Select or search direct supervisor from table...')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-slate-700/30 rounded-full transition-colors text-slate-400 hover:text-rose-400"
              title={t('مسح الاختيار', 'Clear selection')}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute z-50 mt-1.5 w-full rounded-xl shadow-2xl border backdrop-blur-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
            isDark
              ? 'bg-[#0f172a]/95 border-slate-700 text-slate-200 shadow-teal-950/30'
              : 'bg-white border-slate-200 text-slate-800 shadow-slate-300/50'
          }`}
          style={{ maxHeight: '340px' }}
        >
          {/* Search Box */}
          <div className="p-2 border-b border-slate-700/50 flex items-center gap-2 bg-slate-800/40">
            <Search className="w-4 h-4 text-teal-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={t('ابحث بالاسم، المنصب، أو رقم الباج (Badge No)...', 'Search by name, position or Badge No...')}
              className={`w-full bg-transparent text-xs sm:text-sm outline-none placeholder:text-slate-500 ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
              onClick={e => e.stopPropagation()}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* List of Supervisors */}
          <div className="overflow-y-auto max-h-[260px] divide-y divide-slate-800/40">
            {isLoading ? (
              <div className="py-6 text-center text-xs text-slate-400">
                {t('جاري تحميل قائمة المشرفين...', 'Loading supervisors...')}
              </div>
            ) : filteredSupervisors.length === 0 ? (
              <div className="py-6 px-4 text-center">
                <p className="text-xs text-slate-400 mb-2">
                  {searchTerm
                    ? t('لا توجد نتائج مطابقة لبحثك', 'No matching supervisors found')
                    : t('لم يتم العثور على مشرفين مسجلين في الجدول بعد', 'No supervisors registered in the table yet')}
                </p>
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange(searchTerm.trim(), null);
                      setIsOpen(false);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg bg-teal-500/20 text-teal-400 hover:bg-teal-500/30 border border-teal-500/30"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{t(`استخدام "${searchTerm}" كمشرف يدوي`, `Use "${searchTerm}" manually`)}</span>
                  </button>
                )}
              </div>
            ) : (
              filteredSupervisors.map(sup => {
                const isSelected = value?.trim().toLowerCase() === sup.supervisor_name.trim().toLowerCase();
                return (
                  <div
                    key={sup.id || sup.badge_no + sup.supervisor_name}
                    onClick={() => handleSelect(sup)}
                    className={`px-3 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                      isSelected
                        ? isDark
                          ? 'bg-teal-500/20 text-teal-300'
                          : 'bg-teal-50 text-teal-800 font-semibold'
                        : isDark
                        ? 'hover:bg-slate-800/60'
                        : 'hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
                        <UserCheck className="w-4 h-4 text-teal-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs sm:text-sm font-semibold truncate">
                            {sup.supervisor_name}
                          </p>
                          <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-slate-800 text-teal-400 border border-slate-700">
                            {sup.badge_no}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {sup.supervisor_position || t('غير محدد', 'Not specified')}
                        </p>
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-teal-400 shrink-0" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Info Footer */}
          <div className="p-2 bg-slate-900/80 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 px-3">
            <span>{t(`إجمالي المشرفين: ${supervisors.length}`, `Total Supervisors: ${supervisors.length}`)}</span>
            <span className="text-teal-400 font-medium">
              {t('مرتبط بجدول المشرفين المباشرين', 'Linked to Direct Supervisors Table')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

