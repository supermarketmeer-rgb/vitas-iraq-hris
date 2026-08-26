import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  MapPin, 
  Users, 
  Filter,
  Search,
  Bell,
  MoreVertical,
  Edit,
  Trash2,
  Check,
  X,
  Calendar,
  CalendarCheck,
  CalendarX,
  CalendarClock
} from 'lucide-react';
import { api } from '../api/client';
import { useApp } from '../context/AppContext';

interface CompanyEvent {
  id: string;
  event_id: string;
  title_ar: string;
  title_en: string;
  description_ar?: string;
  description_en?: string;
  event_type: 'holiday' | 'meeting' | 'training' | 'conference' | 'social' | 'announcement' | 'deadline' | 'other';
  event_date: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  location_ar?: string;
  all_day: boolean;
  is_recurring: boolean;
  recurrence_pattern?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  recurrence_end_date?: string;
  department?: string;
  target_audience: 'all' | 'management' | 'employees' | 'specific_department' | 'specific_employees';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  created_by: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

interface CompanyHoliday {
  id: string;
  holiday_id: string;
  name_ar: string;
  name_en: string;
  description_ar?: string;
  description_en?: string;
  holiday_date: string;
  is_recurring: boolean;
  holiday_type: 'national' | 'religious' | 'company' | 'optional' | 'emergency';
  is_paid: boolean;
  is_emergency?: boolean;
  scope?: 'all_branches' | 'specific_branches';
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface CompanyCalendarProps {
  language?: 'ar' | 'en';
}

const formatDateToYYYYMMDD = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const CompanyCalendar: React.FC<CompanyCalendarProps> = ({ language = 'ar' }) => {
  const { theme } = useApp();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day' | 'list'>('month');
  const [events, setEvents] = useState<CompanyEvent[]>([]);
  const [holidays, setHolidays] = useState<CompanyHoliday[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CompanyEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [showBranchSelectionModal, setShowBranchSelectionModal] = useState(false);
  const [selectedHolidayType, setSelectedHolidayType] = useState<'official' | 'emergency'>('official');
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [holidayFormData, setHolidayFormData] = useState({
    name_ar: '',
    name_en: '',
    description_ar: '',
    description_en: '',
    holiday_date: '',
    is_recurring: true,
    holiday_type: 'national',
    is_paid: true
  });
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingEvent, setEditingEvent] = useState<CompanyEvent | null>(null);
  const [selectedDateForModal, setSelectedDateForModal] = useState<string>('');
  const [appSettings, setAppSettings] = useState<Record<string, string>>({});

  const isDark = theme === 'dark';

  // Theme-based styling helpers
  const getThemeColors = () => {
    if (isDark) {
      return {
        background: 'bg-[#111827]',
        border: 'border-white/10',
        text: 'text-white',
        textSecondary: 'text-slate-400',
        inputBg: 'bg-[#111827]',
        inputBorder: 'border-white/10',
        inputText: 'text-white',
        inputPlaceholder: 'placeholder-slate-400',
        cardBg: 'bg-[#111827]',
        cardBorder: 'border-white/10',
        modalBg: 'bg-[#1a1f2e]',
        modalBorder: 'border-white/10',
        modalOverlay: 'bg-black/70',
        buttonBg: 'bg-white/5',
        buttonHover: 'hover:bg-white/10',
        buttonText: 'text-white',
        activeBg: 'bg-teal-600/20',
        activeBorder: 'border-teal-500/50',
        activeText: 'text-teal-400',
        todayBg: 'bg-teal-600/20',
        calendarDayBg: 'bg-[#111827]',
        calendarDayBorder: 'border-white/5',
        calendarDayHover: 'hover:border-white/10',
        filterBg: 'bg-[#111827]',
        filterBorder: 'border-white/10',
        filterText: 'text-white',
        secondaryText: 'text-slate-400',
        eventColorOpacity: '20',
        eventBorderOpacity: '30',
        borderColor: 'border-gray-200',
        grayBg: 'bg-gray-100',
        grayText: 'text-gray-900',
        grayText2: 'text-gray-700',
        whiteBg: 'bg-white',
        whiteBorder: 'border-gray-300',
        editButtonBg: 'bg-blue-500/20',
        editButtonHover: 'hover:bg-blue-500/30',
        editButtonText: 'text-blue-400',
        deleteButtonBg: 'bg-red-500/20',
        deleteButtonHover: 'hover:bg-red-500/30',
        deleteButtonText: 'text-red-400',
        labelColor: 'text-slate-300',
        checkboxBg: 'bg-[#111827]',
        checkboxBorder: 'border-white/10',
        divider: 'border-white/10'
      };
    } else {
      return {
        background: 'bg-white',
        border: 'border-gray-200',
        text: 'text-gray-900',
        textSecondary: 'text-gray-600',
        inputBg: 'bg-white',
        inputBorder: 'border-gray-300',
        inputText: 'text-gray-900',
        inputPlaceholder: 'placeholder-gray-400',
        cardBg: 'bg-white',
        cardBorder: 'border-gray-200',
        modalBg: 'bg-white',
        modalBorder: 'border-gray-200',
        modalOverlay: 'bg-black/50',
        buttonBg: 'bg-gray-100',
        buttonHover: 'hover:bg-gray-200',
        buttonText: 'text-gray-700',
        activeBg: 'bg-teal-50',
        activeBorder: 'border-teal-300',
        activeText: 'text-teal-600',
        todayBg: 'bg-teal-50',
        calendarDayBg: 'bg-white',
        calendarDayBorder: 'border-gray-200',
        calendarDayHover: 'hover:border-gray-300',
        filterBg: 'bg-white',
        filterBorder: 'border-gray-200',
        filterText: 'text-gray-900',
        secondaryText: 'text-gray-600',
        eventColorOpacity: '100',
        eventBorderOpacity: '200',
        borderColor: 'border-gray-200',
        grayBg: 'bg-gray-100',
        grayText: 'text-gray-900',
        grayText2: 'text-gray-700',
        whiteBg: 'bg-white',
        whiteBorder: 'border-gray-300',
        editButtonBg: 'bg-blue-100',
        editButtonHover: 'hover:bg-blue-200',
        editButtonText: 'text-blue-600',
        deleteButtonBg: 'bg-red-100',
        deleteButtonHover: 'hover:bg-red-200',
        deleteButtonText: 'text-red-600',
        labelColor: 'text-gray-700',
        checkboxBg: 'bg-white',
        checkboxBorder: 'border-gray-300',
        divider: 'border-gray-200'
      };
    }
  };

  const colors = getThemeColors();

  // Load settings from localStorage immediately (fast load)
  useEffect(() => {
    const loadSettings = () => {
      try {
        const localSettings = localStorage.getItem('vitas_app_settings');
        if (localSettings) {
          const parsedSettings = JSON.parse(localSettings);
          console.log('Loaded settings from localStorage (fast load):', parsedSettings);
          setAppSettings(parsedSettings);
        }
      } catch (e) {
        console.error('Error reading from localStorage:', e);
      }
    };

    loadSettings();

    // Listen for storage changes (from other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'vitas_app_settings' && e.newValue) {
        console.log('Settings changed in another tab, reloading...');
        loadSettings();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Load events and holidays from API
  useEffect(() => {
    const loadCalendarData = async () => {
      try {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const startDate = formatDateToYYYYMMDD(new Date(year, month - 1, 20));
        const endDate = formatDateToYYYYMMDD(new Date(year, month + 2, 10));

        const [eventsData, holidaysData, appSettingsData, branchesData] = await Promise.all([
          api.getCalendarEvents({ start_date: startDate, end_date: endDate }).catch(() => []),
          api.getCalendarHolidays({ year: year.toString() }).catch(() => []),
          api.getAppSettings().catch(() => []),
          api.getBranches().catch(() => [])
        ]);

        setEvents(Array.isArray(eventsData) ? eventsData : []);
        setHolidays(Array.isArray(holidaysData) ? holidaysData : []);
        setBranches(Array.isArray(branchesData) ? branchesData : []);

        // Convert app settings array to object
        const settingsObj: Record<string, string> = {};
        if (Array.isArray(appSettingsData)) {
          appSettingsData.forEach((setting: any) => {
            if (setting && setting.setting_key) {
              settingsObj[setting.setting_key] = setting.setting_value;
            }
          });
        }

        // Only update from API if we got data
        if (Object.keys(settingsObj).length > 0) {
          console.log('Loaded app settings from API:', settingsObj);
          setAppSettings(settingsObj);
        }
      } catch (error) {
        console.error('Error loading calendar data:', error);
        // Set empty arrays on error
        setEvents([]);
        setHolidays([]);
        setBranches([]);
        // Keep localStorage settings
      }
    };

    loadCalendarData();
  }, [currentDate]);

  const isRTL = language === 'ar';

  const getMonthName = (date: Date) => {
    const months = language === 'ar' 
      ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
      : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return months[date.getMonth()];
  };

  const getDayName = (date: Date) => {
    const days = language === 'ar'
      ? ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
      : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = formatDateToYYYYMMDD(date);
    return events.filter(event => {
      if (!event.event_date) return false;
      const evtDate = typeof event.event_date === 'string' ? event.event_date.split('T')[0] : formatDateToYYYYMMDD(new Date(event.event_date));
      return evtDate === dateStr;
    });
  };

  const getHolidayForDate = (date: Date) => {
    const dateStr = formatDateToYYYYMMDD(date);
    return holidays.find(holiday => {
      if (!holiday.holiday_date) return false;
      const holDate = typeof holiday.holiday_date === 'string' ? holiday.holiday_date.split('T')[0] : formatDateToYYYYMMDD(new Date(holiday.holiday_date));
      return holDate === dateStr;
    });
  };

  const isWeekendDay = (date: Date) => {
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayKey = dayKeys[dayOfWeek];

    console.log('Current appSettings:', appSettings);
    console.log(`Checking ${dayKey} for date ${date.toDateString()}:`, appSettings[`weekend_${dayKey}`]);

    // Check if settings exist, otherwise default to Friday (5) and Saturday (6)
    if (Object.keys(appSettings).length === 0) {
      console.log('No settings found, using default weekend (Friday, Saturday)');
      // Default: Friday and Saturday are weekend
      return dayOfWeek === 5 || dayOfWeek === 6;
    }

    const isWeekend = appSettings[`weekend_${dayKey}`] === 'true';
    console.log(`Result: ${dayKey} is ${isWeekend ? 'weekend' : 'not weekend'}`);
    return isWeekend;
  };

  const getEventTypeColor = (type: string) => {
    if (isDark) {
      const colorMap = {
        holiday: 'bg-red-500/20 text-red-400 border-red-500/30',
        meeting: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        training: 'bg-green-500/20 text-green-400 border-green-500/30',
        conference: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
        social: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
        announcement: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        deadline: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        other: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
      };
      return colorMap[type as keyof typeof colorMap] || colorMap.other;
    } else {
      const colorMap = {
        holiday: 'bg-red-100 text-red-700 border-red-200',
        meeting: 'bg-blue-100 text-blue-700 border-blue-200',
        training: 'bg-green-100 text-green-700 border-green-200',
        conference: 'bg-purple-100 text-purple-700 border-purple-200',
        social: 'bg-pink-100 text-pink-700 border-pink-200',
        announcement: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        deadline: 'bg-orange-100 text-orange-700 border-orange-200',
        other: 'bg-gray-100 text-gray-700 border-gray-200'
      };
      return colorMap[type as keyof typeof colorMap] || colorMap.other;
    }
  };

  const getPriorityColor = (priority: string) => {
    if (isDark) {
      const colorMap = {
        low: 'bg-slate-500/20 text-slate-400',
        medium: 'bg-blue-500/20 text-blue-400',
        high: 'bg-orange-500/20 text-orange-400',
        urgent: 'bg-red-500/20 text-red-400'
      };
      return colorMap[priority as keyof typeof colorMap] || colorMap.medium;
    } else {
      const colorMap = {
        low: 'bg-gray-100 text-gray-700',
        medium: 'bg-blue-100 text-blue-700',
        high: 'bg-orange-100 text-orange-700',
        urgent: 'bg-red-100 text-red-700'
      };
      return colorMap[priority as keyof typeof colorMap] || colorMap.medium;
    }
  };

  const getStatusColor = (status: string) => {
    if (isDark) {
      const colorMap = {
        draft: 'bg-gray-500/20 text-gray-400',
        published: 'bg-green-500/20 text-green-400',
        cancelled: 'bg-red-500/20 text-red-400',
        completed: 'bg-blue-500/20 text-blue-400'
      };
      return colorMap[status as keyof typeof colorMap] || colorMap.draft;
    } else {
      const colorMap = {
        draft: 'bg-gray-100 text-gray-700',
        published: 'bg-green-100 text-green-700',
        cancelled: 'bg-red-100 text-red-700',
        completed: 'bg-blue-100 text-blue-700'
      };
      return colorMap[status as keyof typeof colorMap] || colorMap.draft;
    }
  };

  const filteredEvents = events.filter(event => {
    const matchesType = filterType === 'all' || event.event_type === filterType;
    const matchesSearch = searchQuery === '' || 
      event.title_ar.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.title_en.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const renderMonthView = () => {
    const days = getDaysInMonth(currentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
      <div className="grid grid-cols-7 gap-1">
        {/* Day headers */}
        {[0, 1, 2, 3, 4, 5, 6].map(dayIndex => {
          const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayIndex + 1);
          return (
            <div key={dayIndex} className={`text-center p-2 text-xs font-semibold ${colors.textSecondary}`}>
              {getDayName(date)}
            </div>
          );
        })}

        {/* Calendar days */}
        {days.map((date, index) => {
          if (!date) {
            return <div key={index} className={`h-24 ${isDark ? 'bg-[#111827]/50' : 'bg-gray-50'}`} />;
          }

          const isToday = date.toDateString() === today.toDateString();
          const isWeekend = isWeekendDay(date);
          const dayEvents = getEventsForDate(date);
          const holiday = getHolidayForDate(date);

          return (
            <motion.div
              key={index}
              whileHover={{ scale: 1.02 }}
              className={`h-24 p-1 rounded-lg border cursor-pointer transition-all ${
                isToday 
                  ? `${colors.todayBg} ${colors.activeBorder}` 
                  : isWeekend
                    ? 'bg-red-50 border-red-200 hover:border-red-300'
                    : `${colors.calendarDayBg} ${colors.calendarDayBorder} ${colors.calendarDayHover}`
              } ${isDark && isWeekend ? 'bg-red-900/20 border-red-500/30 hover:border-red-500/50' : ''}`}
              onClick={() => {
                if (dayEvents.length > 0) {
                  setSelectedEvent(dayEvents[0]);
                  setShowEventDetails(true);
                } else {
                  setEditingEvent(null);
                  setSelectedDateForModal(formatDateToYYYYMMDD(date));
                  setShowEventModal(true);
                }
              }}
            >
              <div className={`text-sm font-semibold mb-1 ${isToday ? colors.activeText : isWeekend ? 'text-red-600' : colors.text}`}>
                {date.getDate()}
              </div>

              {holiday && (
                <div className={`text-xs text-red-600 mb-1 truncate`}>
                  {language === 'ar' ? holiday.name_ar : holiday.name_en}
                  {holiday.is_emergency && (
                    <span className="ml-1 px-1 py-0.5 bg-red-100 dark:bg-red-900/30 rounded text-xs">
                      {language === 'ar' ? 'طارئة' : 'Emergency'}
                    </span>
                  )}
                </div>
              )}

              <div className="space-y-0.5">
                {dayEvents.slice(0, 2).map(event => (
                  <div
                    key={event.id}
                    className={`text-xs px-1 py-0.5 rounded truncate border ${getEventTypeColor(event.event_type)}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEvent(event);
                      setShowEventDetails(true);
                    }}
                  >
                    {language === 'ar' ? event.title_ar : event.title_en}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <div className={`text-xs ${colors.secondaryText}`}>
                    +{dayEvents.length - 2} {language === 'ar' ? 'المزيد' : 'more'}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  };

  const renderListView = () => {
    const sortedEvents = [...filteredEvents].sort((a, b) => 
      new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    );

    return (
      <div className="space-y-3">
        {sortedEvents.map(event => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${colors.cardBg} ${colors.cardBorder} rounded-xl p-4 hover:${colors.borderColor} transition-all cursor-pointer ${isDark ? '' : 'shadow-sm'}`}
            onClick={() => {
              setSelectedEvent(event);
              setShowEventDetails(true);
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getEventTypeColor(event.event_type)}`}>
                    {language === 'ar' ? event.title_ar : event.title_en}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getPriorityColor(event.priority)}`}>
                    {event.priority}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(event.status)}`}>
                    {event.status}
                  </span>
                </div>

                <h3 className={`${colors.text} font-semibold mb-1`}>
                  {language === 'ar' ? event.title_ar : event.title_en}
                </h3>

                <p className={`${colors.textSecondary} text-sm mb-2`}>
                  {language === 'ar' ? event.description_ar : event.description_en}
                </p>

                <div className={`flex flex-wrap items-center gap-4 text-sm ${colors.textSecondary}`}>
                  <div className="flex items-center gap-1">
                    <Calendar size={16} />
                    {new Date(event.event_date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                  </div>
                  {!event.all_day && (
                    <div className="flex items-center gap-1">
                      <Clock size={16} />
                      {event.start_time} - {event.end_time}
                    </div>
                  )}
                  {event.location && (
                    <div className="flex items-center gap-1">
                      <MapPin size={16} />
                      {language === 'ar' ? event.location_ar : event.location}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingEvent(event);
                    setShowEventModal(true);
                  }}
                  className={`p-2 rounded-lg ${colors.editButtonBg} ${colors.editButtonText} ${colors.editButtonHover} transition-all`}
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      await api.deleteCalendarEvent(event.id);
                      
                      // Reload events
                      const year = currentDate.getFullYear();
                      const month = currentDate.getMonth();
                      const startDate = formatDateToYYYYMMDD(new Date(year, month - 1, 20));
                      const endDate = formatDateToYYYYMMDD(new Date(year, month + 2, 10));

                      const eventsData = await api.getCalendarEvents({ start_date: startDate, end_date: endDate });
                      setEvents(Array.isArray(eventsData) ? eventsData : []);
                    } catch (error) {
                      console.error('Error deleting event:', error);
                      alert(language === 'ar' ? 'خطأ في حذف الحدث' : 'Error deleting event');
                    }
                  }}
                  className={`p-2 rounded-lg ${colors.deleteButtonBg} ${colors.deleteButtonText} ${colors.deleteButtonHover} transition-all`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  const renderCalendar = () => {
    switch (view) {
      case 'month':
        return renderMonthView();
      case 'list':
        return renderListView();
      default:
        return renderMonthView();
    }
  };

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h2 className={`text-2xl font-bold ${colors.text}`}>
            {language === 'ar' ? 'تقويم الشركة والأحداث' : 'Company Calendar & Events'}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateMonth('prev')}
            className={`p-2 rounded-lg ${colors.buttonBg} ${colors.buttonHover} transition-all`}
          >
            <ChevronLeft size={20} className={isRTL ? 'rotate-180' : ''} />
          </button>
          <div className={`px-4 py-2 ${colors.buttonBg} rounded-lg`}>
            <span className={`${colors.text} font-semibold`}>
              {getMonthName(currentDate)} {currentDate.getFullYear()}
            </span>
          </div>
          <button
            onClick={() => navigateMonth('next')}
            className={`p-2 rounded-lg ${colors.buttonBg} ${colors.buttonHover} transition-all`}
          >
            <ChevronRight size={20} className={isRTL ? 'rotate-180' : ''} />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold transition-all"
          >
            {language === 'ar' ? 'اليوم' : 'Today'}
          </button>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${colors.textSecondary}`} size={18} />
            <input
              type="text"
              placeholder={language === 'ar' ? 'بحث عن حدث...' : 'Search events...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`pl-10 pr-4 py-2 ${colors.inputBg} ${colors.inputBorder} rounded-lg ${colors.inputText} ${colors.inputPlaceholder} focus:outline-none focus:border-teal-500/50`}
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className={`px-4 py-2 ${colors.filterBg} ${colors.filterBorder} rounded-lg ${colors.filterText} focus:outline-none focus:border-teal-500/50`}
          >
            <option value="all">{language === 'ar' ? 'جميع الأنواع' : 'All Types'}</option>
            <option value="holiday">{language === 'ar' ? 'عطلة' : 'Holiday'}</option>
            <option value="meeting">{language === 'ar' ? 'اجتماع' : 'Meeting'}</option>
            <option value="training">{language === 'ar' ? 'تدريب' : 'Training'}</option>
            <option value="conference">{language === 'ar' ? 'مؤتمر' : 'Conference'}</option>
            <option value="social">{language === 'ar' ? 'اجتماعي' : 'Social'}</option>
            <option value="announcement">{language === 'ar' ? 'إعلان' : 'Announcement'}</option>
            <option value="deadline">{language === 'ar' ? 'موعد نهائي' : 'Deadline'}</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <div className={`flex ${colors.filterBg} rounded-lg ${colors.filterBorder} p-1`}>
            {(['month', 'list'] as const).map(viewOption => (
              <button
                key={viewOption}
                onClick={() => setView(viewOption)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  view === viewOption
                    ? 'bg-teal-600 text-white'
                    : `${colors.secondaryText} hover:${colors.text}`
                }`}
              >
                {viewOption === 'month' 
                  ? (language === 'ar' ? 'شهر' : 'Month')
                  : (language === 'ar' ? 'قائمة' : 'List')
                }
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setEditingEvent(null);
              setSelectedDateForModal(formatDateToYYYYMMDD(currentDate));
              setShowEventModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold transition-all"
          >
            <Plus size={18} />
            {language === 'ar' ? 'إضافة حدث' : 'Add Event'}
          </button>
          <button
            onClick={() => {
              setShowHolidayModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold transition-all"
          >
            <CalendarCheck size={18} />
            {language === 'ar' ? 'تعيين عطل' : 'Set Holidays'}
          </button>
        </div>
      </div>

      {/* Calendar */}
      <div className={`${colors.cardBg} ${colors.cardBorder} rounded-xl p-4 ${isDark ? '' : 'shadow-sm'}`}>
        {renderCalendar()}
      </div>

      {/* Event Modal */}
      <AnimatePresence>
        {showEventModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 ${colors.modalOverlay} flex items-center justify-center z-50 p-4`}
            onClick={() => setShowEventModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`${colors.modalBg} ${colors.modalBorder} rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto ${isDark ? '' : 'shadow-xl'}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className={`text-xl font-bold ${colors.text}`}>
                    {editingEvent 
                      ? (language === 'ar' ? 'تعديل الحدث' : 'Edit Event')
                      : (language === 'ar' ? 'إضافة حدث جديد' : 'Add New Event')
                    }
                  </h3>
                  <button
                    onClick={() => setShowEventModal(false)}
                    className={`p-2 rounded-lg ${colors.buttonBg} ${colors.buttonHover} transition-all`}
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Event Form */}
                <form 
                  className="space-y-4"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      // Collect form data
                      const formData = new FormData(e.currentTarget);
                      const titleAr = (formData.get('title_ar') as string || '').trim();
                      const titleEn = (formData.get('title_en') as string || '').trim();
                      const eventDate = (formData.get('event_date') as string || '').trim();

                      if (!titleAr && !titleEn) {
                        alert(language === 'ar' ? 'يرجى إدخال عنوان الحدث' : 'Please enter event title');
                        return;
                      }
                      if (!eventDate) {
                        alert(language === 'ar' ? 'يرجى تحديد تاريخ الحدث' : 'Please select event date');
                        return;
                      }

                      const eventData = {
                        title_ar: titleAr || titleEn,
                        title_en: titleEn || titleAr,
                        description_ar: formData.get('description_ar') as string || '',
                        description_en: formData.get('description_en') as string || '',
                        event_type: formData.get('event_type') as string || 'other',
                        event_date: eventDate,
                        start_time: formData.get('start_time') as string || null,
                        end_time: formData.get('end_time') as string || null,
                        location: formData.get('location') as string || '',
                        location_ar: formData.get('location_ar') as string || '',
                        all_day: formData.get('all_day') === 'true',
                        is_recurring: formData.get('is_recurring') === 'true',
                        recurrence_pattern: formData.get('recurrence_pattern') as string || null,
                        target_audience: formData.get('target_audience') as string || 'all',
                        priority: formData.get('priority') as string || 'medium',
                        status: formData.get('status') as string || 'published',
                        created_by: 'ADMIN001'
                      };

                      if (editingEvent && editingEvent.id) {
                        await api.updateCalendarEvent(editingEvent.id, { ...eventData, updated_by: 'ADMIN001' });
                      } else {
                        await api.addCalendarEvent(eventData);
                      }

                      // Reload events
                      const year = currentDate.getFullYear();
                      const month = currentDate.getMonth();
                      const startDate = formatDateToYYYYMMDD(new Date(year, month - 1, 20));
                      const endDate = formatDateToYYYYMMDD(new Date(year, month + 2, 10));

                      const eventsData = await api.getCalendarEvents({ start_date: startDate, end_date: endDate });
                      setEvents(Array.isArray(eventsData) ? eventsData : []);

                      setShowEventModal(false);
                    } catch (error) {
                      console.error('Error saving event:', error);
                      alert(language === 'ar' ? 'خطأ في حفظ الحدث' : 'Error saving event');
                    }
                  }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium ${colors.labelColor} mb-2`}>
                        {language === 'ar' ? 'العنوان (عربي)' : 'Title (Arabic)'}
                      </label>
                      <input
                        type="text"
                        name="title_ar"
                        defaultValue={editingEvent?.title_ar || ''}
                        className={`w-full px-4 py-2 ${colors.inputBg} ${colors.inputBorder} rounded-lg ${colors.inputText} focus:outline-none focus:border-teal-500/50`}
                        placeholder={language === 'ar' ? 'عنوان الحدث' : 'Event title'}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${colors.labelColor} mb-2`}>
                        {language === 'ar' ? 'العنوان (إنجليزي)' : 'Title (English)'}
                      </label>
                      <input
                        type="text"
                        name="title_en"
                        defaultValue={editingEvent?.title_en || ''}
                        className={`w-full px-4 py-2 ${colors.inputBg} ${colors.inputBorder} rounded-lg ${colors.inputText} focus:outline-none focus:border-teal-500/50`}
                        placeholder={language === 'ar' ? 'Event title' : 'Event title'}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${colors.labelColor} mb-2`}>
                      {language === 'ar' ? 'الوصف (عربي)' : 'Description (Arabic)'}
                    </label>
                    <textarea
                      name="description_ar"
                      defaultValue={editingEvent?.description_ar || ''}
                      rows={3}
                      className={`w-full px-4 py-2 ${colors.inputBg} ${colors.inputBorder} rounded-lg ${colors.inputText} focus:outline-none focus:border-teal-500/50`}
                      placeholder={language === 'ar' ? 'وصف الحدث' : 'Event description'}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${colors.labelColor} mb-2`}>
                      {language === 'ar' ? 'الوصف (إنجليزي)' : 'Description (English)'}
                    </label>
                    <textarea
                      name="description_en"
                      defaultValue={editingEvent?.description_en || ''}
                      rows={3}
                      className={`w-full px-4 py-2 ${colors.inputBg} ${colors.inputBorder} rounded-lg ${colors.inputText} focus:outline-none focus:border-teal-500/50`}
                      placeholder={language === 'ar' ? 'Event description' : 'Event description'}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium ${colors.labelColor} mb-2`}>
                        {language === 'ar' ? 'نوع الحدث' : 'Event Type'}
                      </label>
                      <select
                        name="event_type"
                        defaultValue={editingEvent?.event_type || 'other'}
                        className={`w-full px-4 py-2 ${colors.inputBg} ${colors.inputBorder} rounded-lg ${colors.inputText} focus:outline-none focus:border-teal-500/50`}
                      >
                        <option value="holiday">{language === 'ar' ? 'عطلة' : 'Holiday'}</option>
                        <option value="meeting">{language === 'ar' ? 'اجتماع' : 'Meeting'}</option>
                        <option value="training">{language === 'ar' ? 'تدريب' : 'Training'}</option>
                        <option value="conference">{language === 'ar' ? 'مؤتمر' : 'Conference'}</option>
                        <option value="social">{language === 'ar' ? 'اجتماعي' : 'Social'}</option>
                        <option value="announcement">{language === 'ar' ? 'إعلان' : 'Announcement'}</option>
                        <option value="deadline">{language === 'ar' ? 'موعد نهائي' : 'Deadline'}</option>
                        <option value="other">{language === 'ar' ? 'أخرى' : 'Other'}</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${colors.labelColor} mb-2`}>
                        {language === 'ar' ? 'الأولوية' : 'Priority'}
                      </label>
                      <select
                        name="priority"
                        defaultValue={editingEvent?.priority || 'medium'}
                        className={`w-full px-4 py-2 ${colors.inputBg} ${colors.inputBorder} rounded-lg ${colors.inputText} focus:outline-none focus:border-teal-500/50`}
                      >
                        <option value="low">{language === 'ar' ? 'منخفضة' : 'Low'}</option>
                        <option value="medium">{language === 'ar' ? 'متوسطة' : 'Medium'}</option>
                        <option value="high">{language === 'ar' ? 'عالية' : 'High'}</option>
                        <option value="urgent">{language === 'ar' ? 'عاجلة' : 'Urgent'}</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium ${colors.labelColor} mb-2`}>
                        {language === 'ar' ? 'التاريخ' : 'Date'}
                      </label>
                      <input
                        type="date"
                        name="event_date"
                        defaultValue={editingEvent?.event_date || selectedDateForModal || formatDateToYYYYMMDD(new Date())}
                        className={`w-full px-4 py-2 ${colors.inputBg} ${colors.inputBorder} rounded-lg ${colors.inputText} focus:outline-none focus:border-teal-500/50`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${colors.labelColor} mb-2`}>
                        {language === 'ar' ? 'اليوم بالكامل' : 'All Day'}
                      </label>
                      <select
                        name="all_day"
                        defaultValue={editingEvent?.all_day ? 'true' : 'false'}
                        className={`w-full px-4 py-2 ${colors.inputBg} ${colors.inputBorder} rounded-lg ${colors.inputText} focus:outline-none focus:border-teal-500/50`}
                      >
                        <option value="true">{language === 'ar' ? 'نعم' : 'Yes'}</option>
                        <option value="false">{language === 'ar' ? 'لا' : 'No'}</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium ${colors.labelColor} mb-2`}>
                        {language === 'ar' ? 'وقت البدء' : 'Start Time'}
                      </label>
                      <input
                        type="time"
                        name="start_time"
                        defaultValue={editingEvent?.start_time || ''}
                        className={`w-full px-4 py-2 ${colors.inputBg} ${colors.inputBorder} rounded-lg ${colors.inputText} focus:outline-none focus:border-teal-500/50`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${colors.labelColor} mb-2`}>
                        {language === 'ar' ? 'وقت الانتهاء' : 'End Time'}
                      </label>
                      <input
                        type="time"
                        name="end_time"
                        defaultValue={editingEvent?.end_time || ''}
                        className={`w-full px-4 py-2 ${colors.inputBg} ${colors.inputBorder} rounded-lg ${colors.inputText} focus:outline-none focus:border-teal-500/50`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium ${colors.labelColor} mb-2`}>
                        {language === 'ar' ? 'الموقع (عربي)' : 'Location (Arabic)'}
                      </label>
                      <input
                        type="text"
                        name="location_ar"
                        defaultValue={editingEvent?.location_ar || ''}
                        className={`w-full px-4 py-2 ${colors.inputBg} ${colors.inputBorder} rounded-lg ${colors.inputText} focus:outline-none focus:border-teal-500/50`}
                        placeholder={language === 'ar' ? 'موقع الحدث' : 'Event location'}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${colors.labelColor} mb-2`}>
                        {language === 'ar' ? 'الموقع (إنجليزي)' : 'Location (English)'}
                      </label>
                      <input
                        type="text"
                        name="location"
                        defaultValue={editingEvent?.location || ''}
                        className={`w-full px-4 py-2 ${colors.inputBg} ${colors.inputBorder} rounded-lg ${colors.inputText} focus:outline-none focus:border-teal-500/50`}
                        placeholder={language === 'ar' ? 'Event location' : 'Event location'}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium ${colors.labelColor} mb-2`}>
                        {language === 'ar' ? 'الفئة المستهدفة' : 'Target Audience'}
                      </label>
                      <select
                        name="target_audience"
                        defaultValue={editingEvent?.target_audience || 'all'}
                        className={`w-full px-4 py-2 ${colors.inputBg} ${colors.inputBorder} rounded-lg ${colors.inputText} focus:outline-none focus:border-teal-500/50`}
                      >
                        <option value="all">{language === 'ar' ? 'الجميع' : 'All'}</option>
                        <option value="management">{language === 'ar' ? 'الإدارة' : 'Management'}</option>
                        <option value="employees">{language === 'ar' ? 'الموظفين' : 'Employees'}</option>
                        <option value="specific_department">{language === 'ar' ? 'قسم محدد' : 'Specific Department'}</option>
                        <option value="specific_employees">{language === 'ar' ? 'موظفين محددين' : 'Specific Employees'}</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${colors.labelColor} mb-2`}>
                        {language === 'ar' ? 'الحالة' : 'Status'}
                      </label>
                      <select
                        name="status"
                        defaultValue={editingEvent?.status || 'published'}
                        className={`w-full px-4 py-2 ${colors.inputBg} ${colors.inputBorder} rounded-lg ${colors.inputText} focus:outline-none focus:border-teal-500/50`}
                      >
                        <option value="draft">{language === 'ar' ? 'مسودة' : 'Draft'}</option>
                        <option value="published">{language === 'ar' ? 'منشور' : 'Published'}</option>
                        <option value="cancelled">{language === 'ar' ? 'ملغي' : 'Cancelled'}</option>
                        <option value="completed">{language === 'ar' ? 'مكتمل' : 'Completed'}</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="is_recurring"
                      id="is_recurring"
                      defaultChecked={editingEvent?.is_recurring || false}
                      className={`w-4 h-4 rounded ${colors.checkboxBg} ${colors.checkboxBorder} text-teal-600 focus:ring-teal-500`}
                    />
                    <label htmlFor="is_recurring" className={`text-sm font-medium ${colors.labelColor}`}>
                      {language === 'ar' ? 'حدث متكرر' : 'Recurring Event'}
                    </label>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${colors.labelColor} mb-2`}>
                      {language === 'ar' ? 'نمط التكرار' : 'Recurrence Pattern'}
                    </label>
                    <select
                      name="recurrence_pattern"
                      defaultValue={editingEvent?.recurrence_pattern || 'monthly'}
                      className={`w-full px-4 py-2 ${colors.inputBg} ${colors.inputBorder} rounded-lg ${colors.inputText} focus:outline-none focus:border-teal-500/50`}
                    >
                      <option value="daily">{language === 'ar' ? 'يومي' : 'Daily'}</option>
                      <option value="weekly">{language === 'ar' ? 'أسبوعي' : 'Weekly'}</option>
                      <option value="monthly">{language === 'ar' ? 'شهري' : 'Monthly'}</option>
                      <option value="yearly">{language === 'ar' ? 'سنوي' : 'Yearly'}</option>
                      <option value="custom">{language === 'ar' ? 'مخصص' : 'Custom'}</option>
                    </select>
                  </div>

                  <div className={`flex justify-end gap-3 pt-4 border-t ${colors.divider}`}>
                    <button
                      type="button"
                      onClick={() => setShowEventModal(false)}
                      className={`px-4 py-2 rounded-lg ${colors.buttonBg} ${colors.buttonText} ${colors.buttonHover} transition-all`}
                    >
                      {language === 'ar' ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-500 transition-all"
                    >
                      {language === 'ar' ? 'حفظ' : 'Save'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Event Details Modal */}
      <AnimatePresence>
        {showEventDetails && selectedEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 ${colors.modalOverlay} flex items-center justify-center z-50 p-4`}
            onClick={() => setShowEventDetails(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`${colors.modalBg} ${colors.modalBorder} rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto ${isDark ? '' : 'shadow-xl'}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getEventTypeColor(selectedEvent.event_type)}`}>
                      {selectedEvent.event_type}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getPriorityColor(selectedEvent.priority)}`}>
                      {selectedEvent.priority}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowEventDetails(false)}
                    className={`p-2 rounded-lg ${colors.buttonBg} ${colors.buttonHover} transition-all`}
                  >
                    <X size={20} />
                  </button>
                </div>

                <h3 className={`text-2xl font-bold ${colors.text} mb-2`}>
                  {language === 'ar' ? selectedEvent.title_ar : selectedEvent.title_en}
                </h3>

                <p className={`${colors.textSecondary} mb-4`}>
                  {language === 'ar' ? selectedEvent.description_ar : selectedEvent.description_en}
                </p>

                <div className="space-y-3 mb-6">
                  <div className={`flex items-center gap-3 ${colors.textSecondary}`}>
                    <Calendar size={20} className="text-teal-600" />
                    <span>{new Date(selectedEvent.event_date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>

                  {!selectedEvent.all_day && (
                    <div className={`flex items-center gap-3 ${colors.textSecondary}`}>
                      <Clock size={20} className="text-teal-600" />
                      <span>{selectedEvent.start_time} - {selectedEvent.end_time}</span>
                    </div>
                  )}

                  {selectedEvent.location && (
                    <div className={`flex items-center gap-3 ${colors.textSecondary}`}>
                      <MapPin size={20} className="text-teal-600" />
                      <span>{language === 'ar' ? selectedEvent.location_ar : selectedEvent.location}</span>
                    </div>
                  )}

                  {selectedEvent.is_recurring && (
                    <div className={`flex items-center gap-3 ${colors.textSecondary}`}>
                      <CalendarClock size={20} className="text-teal-600" />
                      <span>{language === 'ar' ? 'حدث متكرر' : 'Recurring Event'}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowEventDetails(false);
                      setEditingEvent(selectedEvent);
                      setShowEventModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-blue-500 transition-all"
                  >
                    <Edit size={18} />
                    {language === 'ar' ? 'تعديل' : 'Edit'}
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        if (selectedEvent) {
                          await api.deleteCalendarEvent(selectedEvent.id);
                          
                          // Reload events
                          const year = currentDate.getFullYear();
                          const month = currentDate.getMonth();
                          const startDate = formatDateToYYYYMMDD(new Date(year, month - 1, 20));
                          const endDate = formatDateToYYYYMMDD(new Date(year, month + 2, 10));

                          const eventsData = await api.getCalendarEvents({ start_date: startDate, end_date: endDate });
                          setEvents(Array.isArray(eventsData) ? eventsData : []);

                          setShowEventDetails(false);
                        }
                      } catch (error) {
                        console.error('Error deleting event:', error);
                        alert(language === 'ar' ? 'خطأ في حذف الحدث' : 'Error deleting event');
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 transition-all"
                  >
                    <Trash2 size={18} />
                    {language === 'ar' ? 'حذف' : 'Delete'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Holiday Modal */}
        <AnimatePresence>
          {showHolidayModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`fixed inset-0 ${colors.modalOverlay} flex items-center justify-center z-50 p-4`}
              onClick={() => setShowHolidayModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className={`${colors.modalBg} ${colors.modalBorder} rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto ${isDark ? '' : 'shadow-xl'}`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className={`text-xl font-bold ${colors.text}`}>
                      {language === 'ar' ? 'تعيين عطل' : 'Set Holidays'}
                    </h3>
                    <button
                      onClick={() => setShowHolidayModal(false)}
                      className={`p-2 rounded-lg ${colors.buttonBg} ${colors.buttonHover} transition-all`}
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => {
                          setSelectedHolidayType('official');
                          setShowBranchSelectionModal(false);
                        }}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          selectedHolidayType === 'official'
                            ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                            : 'border-gray-200 dark:border-white/10 hover:border-teal-300'
                        }`}
                      >
                        <CalendarCheck className="mx-auto mb-2 text-teal-600" size={32} />
                        <div className={`text-center font-semibold ${colors.text}`}>
                          {language === 'ar' ? 'عطل رسمية' : 'Official Holidays'}
                        </div>
                        <div className={`text-center text-sm ${colors.textSecondary}`}>
                          {language === 'ar' ? 'تطبق على جميع الفروع' : 'Apply to all branches'}
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedHolidayType('emergency');
                          setShowBranchSelectionModal(true);
                        }}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          selectedHolidayType === 'emergency'
                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                            : 'border-gray-200 dark:border-white/10 hover:border-red-300'
                        }`}
                      >
                        <CalendarX className="mx-auto mb-2 text-red-600" size={32} />
                        <div className={`text-center font-semibold ${colors.text}`}>
                          {language === 'ar' ? 'عطل طارئة' : 'Emergency Holidays'}
                        </div>
                        <div className={`text-center text-sm ${colors.textSecondary}`}>
                          {language === 'ar' ? 'اختيار الفروع المتأثرة' : 'Select affected branches'}
                        </div>
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className={`block ${colors.labelColor} mb-1`}>
                          {language === 'ar' ? 'اسم العطلة (عربي)' : 'Holiday Name (Arabic)'}
                        </label>
                        <input
                          type="text"
                          value={holidayFormData.name_ar}
                          onChange={(e) => setHolidayFormData({ ...holidayFormData, name_ar: e.target.value })}
                          className={`w-full px-4 py-2 ${colors.inputBg} ${colors.inputBorder} rounded-lg ${colors.inputText} ${colors.inputPlaceholder} focus:outline-none focus:border-teal-500/50`}
                          placeholder={language === 'ar' ? 'مثال: عيد الفطر' : 'Example: Eid al-Fitr'}
                        />
                      </div>

                      <div>
                        <label className={`block ${colors.labelColor} mb-1`}>
                          {language === 'ar' ? 'اسم العطلة (إنجليزي)' : 'Holiday Name (English)'}
                        </label>
                        <input
                          type="text"
                          value={holidayFormData.name_en}
                          onChange={(e) => setHolidayFormData({ ...holidayFormData, name_en: e.target.value })}
                          className={`w-full px-4 py-2 ${colors.inputBg} ${colors.inputBorder} rounded-lg ${colors.inputText} ${colors.inputPlaceholder} focus:outline-none focus:border-teal-500/50`}
                          placeholder={language === 'ar' ? 'مثال: Eid al-Fitr' : 'Example: Eid al-Fitr'}
                        />
                      </div>

                      <div>
                        <label className={`block ${colors.labelColor} mb-1`}>
                          {language === 'ar' ? 'التاريخ' : 'Date'}
                        </label>
                        <input
                          type="date"
                          value={holidayFormData.holiday_date}
                          onChange={(e) => setHolidayFormData({ ...holidayFormData, holiday_date: e.target.value })}
                          className={`w-full px-4 py-2 ${colors.inputBg} ${colors.inputBorder} rounded-lg ${colors.inputText} focus:outline-none focus:border-teal-500/50`}
                        />
                      </div>

                      <div>
                        <label className={`block ${colors.labelColor} mb-1`}>
                          {language === 'ar' ? 'نوع العطلة' : 'Holiday Type'}
                        </label>
                        <select
                          value={holidayFormData.holiday_type}
                          onChange={(e) => setHolidayFormData({ ...holidayFormData, holiday_type: e.target.value })}
                          className={`w-full px-4 py-2 ${colors.inputBg} ${colors.inputBorder} rounded-lg ${colors.inputText} focus:outline-none focus:border-teal-500/50`}
                        >
                          <option value="national">{language === 'ar' ? 'وطني' : 'National'}</option>
                          <option value="religious">{language === 'ar' ? 'ديني' : 'Religious'}</option>
                          <option value="company">{language === 'ar' ? 'شركة' : 'Company'}</option>
                          <option value="optional">{language === 'ar' ? 'اختياري' : 'Optional'}</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="is_recurring"
                          checked={holidayFormData.is_recurring}
                          onChange={(e) => setHolidayFormData({ ...holidayFormData, is_recurring: e.target.checked })}
                          className={`w-4 h-4 ${colors.checkboxBg} ${colors.checkboxBorder} rounded focus:ring-teal-500`}
                        />
                        <label htmlFor="is_recurring" className={`${colors.labelColor}`}>
                          {language === 'ar' ? 'عطلة متكررة سنوياً' : 'Recurring annual holiday'}
                        </label>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="is_paid"
                          checked={holidayFormData.is_paid}
                          onChange={(e) => setHolidayFormData({ ...holidayFormData, is_paid: e.target.checked })}
                          className={`w-4 h-4 ${colors.checkboxBg} ${colors.checkboxBorder} rounded focus:ring-teal-500`}
                        />
                        <label htmlFor="is_paid" className={`${colors.labelColor}`}>
                          {language === 'ar' ? 'عطلة مدفوعة' : 'Paid holiday'}
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t ${colors.divider}">
                      <button
                        onClick={() => setShowHolidayModal(false)}
                        className={`px-4 py-2 rounded-lg ${colors.buttonBg} ${colors.buttonHover} ${colors.buttonText} transition-all`}
                      >
                        {language === 'ar' ? 'إلغاء' : 'Cancel'}
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const holidayData = {
                              ...holidayFormData,
                              is_emergency: selectedHolidayType === 'emergency',
                              scope: selectedHolidayType === 'emergency' && selectedBranches.length > 0 ? 'specific_branches' : 'all_branches',
                              created_by: 'ADMIN001'
                            };

                            const result: any = await api.addCalendarHoliday(holidayData);

                            // If emergency holiday with specific branches, add branch associations
                            if (selectedHolidayType === 'emergency' && selectedBranches.length > 0 && result?.id) {
                              await api.addHolidayBranches(result.id, selectedBranches);
                            }

                            // Reload holidays
                            const year = currentDate.getFullYear();
                            const holidaysData = await api.getCalendarHolidays({ year: year.toString() });
                            setHolidays(Array.isArray(holidaysData) ? holidaysData : []);

                            setShowHolidayModal(false);
                            setShowBranchSelectionModal(false);
                            setHolidayFormData({
                              name_ar: '',
                              name_en: '',
                              description_ar: '',
                              description_en: '',
                              holiday_date: '',
                              is_recurring: true,
                              holiday_type: 'national',
                              is_paid: true
                            });
                            setSelectedBranches([]);
                          } catch (error: any) {
                            console.error('Error adding holiday:', error);
                            const msg = error?.message ? `: ${error.message}` : '';
                            alert((language === 'ar' ? 'خطأ في إضافة العطلة' : 'Error adding holiday') + msg);
                          }
                        }}
                        className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold transition-all"
                        disabled={!holidayFormData.name_ar || !holidayFormData.name_en || !holidayFormData.holiday_date}
                      >
                        {language === 'ar' ? 'حفظ العطلة' : 'Save Holiday'}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Branch Selection Modal */}
        <AnimatePresence>
          {showBranchSelectionModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`fixed inset-0 ${colors.modalOverlay} flex items-center justify-center z-50 p-4`}
              onClick={() => setShowBranchSelectionModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className={`${colors.modalBg} ${colors.modalBorder} rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto ${isDark ? '' : 'shadow-xl'}`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className={`text-xl font-bold ${colors.text}`}>
                      {language === 'ar' ? 'اختيار الفروع المتأثرة' : 'Select Affected Branches'}
                    </h3>
                    <button
                      onClick={() => setShowBranchSelectionModal(false)}
                      className={`p-2 rounded-lg ${colors.buttonBg} ${colors.buttonHover} transition-all`}
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-500/30">
                      <input
                        type="checkbox"
                        id="select_all_branches"
                        checked={selectedBranches.length === branches.length && branches.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBranches(branches.map(b => b.id));
                          } else {
                            setSelectedBranches([]);
                          }
                        }}
                        className={`w-4 h-4 ${colors.checkboxBg} ${colors.checkboxBorder} rounded focus:ring-teal-500`}
                      />
                      <label htmlFor="select_all_branches" className={`${colors.labelColor} font-semibold`}>
                        {language === 'ar' ? 'اختيار جميع الفروع' : 'Select All Branches'}
                      </label>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {branches.map((branch) => (
                        <div key={branch.id} className={`flex items-center gap-2 p-3 rounded-lg ${colors.buttonBg} border ${colors.border}`}>
                          <input
                            type="checkbox"
                            id={`branch_${branch.id}`}
                            checked={selectedBranches.includes(branch.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedBranches([...selectedBranches, branch.id]);
                              } else {
                                setSelectedBranches(selectedBranches.filter(id => id !== branch.id));
                              }
                            }}
                            className={`w-4 h-4 ${colors.checkboxBg} ${colors.checkboxBorder} rounded focus:ring-teal-500`}
                          />
                          <label htmlFor={`branch_${branch.id}`} className={`${colors.labelColor}`}>
                            {language === 'ar' ? branch.name : branch.name_en || branch.name}
                          </label>
                        </div>
                      ))}
                    </div>

                    {selectedBranches.length > 0 && (
                      <div className={`p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30`}>
                        <p className={`text-sm ${colors.textSecondary}`}>
                          {language === 'ar' 
                            ? `سيتم تطبيق العطلة على ${selectedBranches.length} فرع` 
                            : `Holiday will be applied to ${selectedBranches.length} branch(es)`}
                        </p>
                      </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t ${colors.divider}">
                      <button
                        onClick={() => setShowBranchSelectionModal(false)}
                        className={`px-4 py-2 rounded-lg ${colors.buttonBg} ${colors.buttonHover} ${colors.buttonText} transition-all`}
                      >
                        {language === 'ar' ? 'إلغاء' : 'Cancel'}
                      </button>
                      <button
                        onClick={() => setShowBranchSelectionModal(false)}
                        className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold transition-all"
                      >
                        {language === 'ar' ? 'تأكيد' : 'Confirm'}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </AnimatePresence>
    </div>
  );
};
