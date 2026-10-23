import React, { useState, useRef, useEffect } from 'react';
import { getBranchName } from '../utils/branchHelper';
import { getDepartmentName, getJobTitleName, DICT_EN, isArabicText } from '../utils/orgDictionary';

interface Option {
  id?: number | string;
  name_ar?: string;
  name_en?: string;
  name?: string;
  title_ar?: string;
  title_en?: string;
  title?: string;
  [key: string]: any;
}

interface SearchableComboBoxProps {
  options: Option[];
  value: string;
  onChange: (value: string, option?: Option) => void;
  placeholder?: string;
  language?: 'ar' | 'en';
  className?: string;
  disabled?: boolean;
}

export const SearchableComboBox: React.FC<SearchableComboBoxProps> = ({
  options = [],
  value,
  onChange,
  placeholder = '',
  language = 'ar',
  className = '',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isRTL = language === 'ar';

  const getArabicName = (option: Option): string => {
    if (!option) return '';
    if (isArabicText(option.name_ar)) return option.name_ar!;
    if (isArabicText(option.title_ar)) return option.title_ar!;
    if (isArabicText(option.name)) return option.name!;
    if (isArabicText(option.title)) return option.title!;

    const raw = option.name_ar || option.name_en || option.name || option.title || '';
    if (raw) {
      const branchAr = getBranchName(raw, null, 'ar');
      if (branchAr && isArabicText(branchAr)) return branchAr;

      const deptAr = getDepartmentName(raw, 'ar');
      if (deptAr && isArabicText(deptAr)) return deptAr;

      const posAr = getJobTitleName(raw, 'ar');
      if (posAr && isArabicText(posAr)) return posAr;
    }
    return option.name_ar || option.title_ar || option.name || option.title || '';
  };

  const getEnglishName = (option: Option): string => {
    if (!option) return '';
    const enProp = option.name_en || option.title_en || option.title;
    if (enProp && !isArabicText(enProp) && enProp !== 'N/A') return enProp;
    if (option.name && !isArabicText(option.name) && option.name !== 'N/A') return option.name;

    const raw = option.name_ar || option.title_ar || option.name || '';
    if (raw) {
      const branchEn = getBranchName(raw, null, 'en');
      if (branchEn && !isArabicText(branchEn) && branchEn !== 'N/A') return branchEn;

      const deptEn = getDepartmentName(raw, 'en');
      if (deptEn && !isArabicText(deptEn) && deptEn !== 'N/A') return deptEn;

      const posEn = getJobTitleName(raw, 'en');
      if (posEn && !isArabicText(posEn) && posEn !== 'N/A') return posEn;

      if (DICT_EN[raw]) return DICT_EN[raw];
    }
    return option.name_en || option.title_en || option.title || option.name || '';
  };

  const getDisplayName = (option: Option): string => {
    return isRTL 
      ? (getArabicName(option) || getEnglishName(option)) 
      : (getEnglishName(option) || getArabicName(option));
  };

  // Safe filter options based on search term
  const filteredOptions = (options || []).filter(option => {
    if (!option) return false;
    const ar = getArabicName(option).toLowerCase();
    const en = getEnglishName(option).toLowerCase();
    const term = (searchTerm || '').toLowerCase();
    return ar.includes(term) || en.includes(term);
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset search term when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setHighlightedIndex(-1);
    }
  }, [isOpen]);

  // Find selected option display name
  const selectedOption = (options || []).find(opt => {
    if (!opt) return false;
    const ar = getArabicName(opt).toLowerCase().trim();
    const en = getEnglishName(opt).toLowerCase().trim();
    const val = (value || '').toLowerCase().trim();
    if (!val) return false;
    return (
      ar === val ||
      en === val ||
      (opt.name && String(opt.name).toLowerCase().trim() === val) ||
      (opt.name_ar && String(opt.name_ar).toLowerCase().trim() === val) ||
      (opt.name_en && String(opt.name_en).toLowerCase().trim() === val) ||
      (opt.title && String(opt.title).toLowerCase().trim() === val) ||
      (opt.title_ar && String(opt.title_ar).toLowerCase().trim() === val)
    );
  });

  let displayValue = '';
  if (selectedOption) {
    displayValue = getDisplayName(selectedOption);
  } else if (value && value.trim() !== '') {
    if (isRTL) {
      if (isArabicText(value)) {
        displayValue = value;
      } else {
        const branchAr = getBranchName(value, null, 'ar');
        const deptAr = getDepartmentName(value, 'ar');
        const posAr = getJobTitleName(value, 'ar', options);
        displayValue = (isArabicText(branchAr) ? branchAr : null) ||
                       (isArabicText(deptAr) ? deptAr : null) ||
                       (isArabicText(posAr) ? posAr : null) ||
                       value;
      }
    } else {
      if (!isArabicText(value)) {
        displayValue = value;
      } else {
        const branchEn = getBranchName(value, null, 'en');
        const deptEn = getDepartmentName(value, 'en');
        const posEn = getJobTitleName(value, 'en', options);
        displayValue = (!isArabicText(branchEn) && branchEn !== 'N/A' ? branchEn : null) ||
                       (!isArabicText(deptEn) && deptEn !== 'N/A' ? deptEn : null) ||
                       (!isArabicText(posEn) && posEn !== 'N/A' ? posEn : null) ||
                       value;
      }
    }
  }

  const handleSelect = (option: Option) => {
    const selectedValue = isRTL 
      ? (getArabicName(option) || getEnglishName(option))
      : (getEnglishName(option) || getArabicName(option));
    onChange(selectedValue, option);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    setHighlightedIndex(-1);
    
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search/Selection Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchTerm : displayValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-teal-500 disabled:opacity-50 placeholder:text-slate-500 ${isRTL ? 'text-right' : 'text-left'}`}
        />
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'left-3' : 'right-3'} text-slate-400 hover:text-white disabled:opacity-50`}
          disabled={disabled}
        >
          <span className="material-symbols-outlined text-lg">
            {isOpen ? 'expand_less' : 'expand_more'}
          </span>
        </button>
      </div>

      {/* Dropdown Options */}
      {isOpen && !disabled && (
        <div className={`absolute z-50 w-full mt-1 bg-[#111827] border border-white/10 rounded-xl shadow-xl max-h-60 overflow-y-auto ${isRTL ? 'text-right' : 'text-left'}`}>
          {filteredOptions.length === 0 ? (
            <div className="px-3.5 py-3 text-slate-400 text-sm">
              {isRTL ? 'لا توجد نتائج' : 'No results found'}
            </div>
          ) : (
            filteredOptions.map((option, index) => {
              const arName = getArabicName(option);
              const enName = getEnglishName(option);
              const primaryName = isRTL ? (arName || enName) : (enName || arName);
              const secondaryName = isRTL ? enName : arName;
              return (
                <div
                  key={option.id || index}
                  onClick={() => handleSelect(option)}
                  className={`px-3.5 py-2.5 cursor-pointer transition-colors ${
                    highlightedIndex === index 
                      ? 'bg-teal-600 text-white shadow-md' 
                      : 'hover:bg-white/5 text-slate-200'
                  }`}
                >
                  <div className="font-medium text-sm">{primaryName}</div>
                  {secondaryName && secondaryName !== primaryName && (
                    <div className="text-xs text-slate-400">{secondaryName}</div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
