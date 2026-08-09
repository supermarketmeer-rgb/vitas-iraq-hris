import React, { useState, useRef, useEffect } from 'react';

interface Option {
  id?: number | string;
  name_ar?: string;
  name_en?: string;
  name?: string;
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

  const getArabicName = (option: Option) => option?.name_ar || option?.name || '';
  const getEnglishName = (option: Option) => option?.name_en || option?.name || '';
  const getDisplayName = (option: Option) => isRTL 
    ? (getArabicName(option) || getEnglishName(option)) 
    : (getEnglishName(option) || getArabicName(option));

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
    const ar = getArabicName(opt);
    const en = getEnglishName(opt);
    return ar === value || en === value || opt.name === value;
  });

  const displayValue = selectedOption 
    ? getDisplayName(selectedOption)
    : value;

  const handleSelect = (option: Option) => {
    const selectedValue = language === 'en'
      ? (option?.name_en || option?.name || getDisplayName(option))
      : (option?.name_ar || option?.name || getDisplayName(option));
    onChange(selectedValue, option);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    setHighlightedIndex(-1);
    
    // Clear selection if user types
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
              return (
                <div
                  key={option.id || index}
                  onClick={() => handleSelect(option)}
                  className={`px-3.5 py-2.5 cursor-pointer transition-colors ${
                    highlightedIndex === index 
                      ? 'bg-teal-500/20 text-teal-400' 
                      : 'hover:bg-white/5 text-slate-200'
                  }`}
                >
                  <div className="font-medium text-sm">{arName || enName}</div>
                  {enName && arName && enName !== arName && (
                    <div className="text-xs text-slate-400">{enName}</div>
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
