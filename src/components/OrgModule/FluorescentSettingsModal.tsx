import React from 'react';
import { Language, translations } from './translations';
import { Department } from '../../types/hris';
import {
  X,
  Palette,
  Sparkles,
  MapPin,
  Globe2,
  Printer,
  FileText,
  Check,
  RotateCcw,
  Sliders,
  HelpCircle
} from 'lucide-react';

export interface FluorescentConfig {
  enabled: boolean;
  inCountryColor: string;
  abroadColor: string;
  topManagementColor: string;
  glowIntensity: 'subtle' | 'vibrant' | 'high';
}

export const DEFAULT_FLUORESCENT_CONFIG: FluorescentConfig = {
  enabled: true,
  inCountryColor: '#10b981', // Neon Emerald
  abroadColor: '#f97316', // Neon Electric Orange
  topManagementColor: '#06b6d4', // Neon Cyan
  glowIntensity: 'vibrant'
};

const IN_COUNTRY_PRESETS = [
  { name: 'Neon Emerald', color: '#10b981' },
  { name: 'Electric Lime', color: '#84cc16' },
  { name: 'Vivid Cyan', color: '#06b6d4' },
  { name: 'Bright Green', color: '#22c55e' },
  { name: 'Highlighter Yellow', color: '#eab308' }
];

const ABROAD_PRESETS = [
  { name: 'Electric Orange', color: '#f97316' },
  { name: 'Neon Coral', color: '#f43f5e' },
  { name: 'Neon Magenta', color: '#d946ef' },
  { name: 'Electric Violet', color: '#8b5cf6' },
  { name: 'Hot Amber', color: '#fbbf24' }
];

interface FluorescentSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  config: FluorescentConfig;
  onChangeConfig: (newConfig: FluorescentConfig) => void;
  departments: Department[];
  onToggleDeptLocation: (deptId: number, newStatus: 'in_country' | 'abroad') => Promise<void>;
  onTriggerA4Print: () => void;
}

export const FluorescentSettingsModal: React.FC<FluorescentSettingsModalProps> = ({
  isOpen,
  onClose,
  lang,
  config,
  onChangeConfig,
  departments,
  onToggleDeptLocation,
  onTriggerA4Print
}) => {
  if (!isOpen) return null;

  const t = translations[lang];
  const isArabic = lang === 'ar';

  const handleResetDefaults = () => {
    onChangeConfig({ ...DEFAULT_FLUORESCENT_CONFIG });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] text-xs">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-indigo-50/20 to-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                {t.borderSettings}
              </h3>
              <p className="text-[11px] text-slate-500">
                {t.borderColorsByLocation}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Main Switch: Enable Fluorescent Borders */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
            <div>
              <span className="font-semibold text-slate-900 block text-xs">
                {t.fluorescentBorders}
              </span>
              <span className="text-[11px] text-slate-500">
                {isArabic
                  ? 'إحاطة بطاقات المخطط بإطار فسفوري مشرق وتوهج واضح لتمييز مواقع المديرين'
                  : 'Highlight diagram cards with luminous neon glow according to manager country'}
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => onChangeConfig({ ...config, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {config.enabled && (
            <>
              {/* Color Customization Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* In-Country Color (Domestic) */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-3.5 h-3.5 rounded-full shadow-xs"
                        style={{ backgroundColor: config.inCountryColor }}
                      />
                      <span className="font-bold text-slate-800">
                        {t.inCountryManager}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      {t.inCountry}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    {isArabic
                      ? 'اللون الفسفوري للبطاقات التابعة لمدير متواجد داخل البلد'
                      : 'Fluorescent border for departments with domestic manager presence'}
                  </p>

                  {/* Swatches */}
                  <div className="flex items-center gap-1.5 pt-1">
                    {IN_COUNTRY_PRESETS.map((p) => (
                      <button
                        key={p.color}
                        type="button"
                        onClick={() => onChangeConfig({ ...config, inCountryColor: p.color })}
                        title={p.name}
                        className={`w-6 h-6 rounded-lg transition-transform flex items-center justify-center ${
                          config.inCountryColor.toLowerCase() === p.color.toLowerCase()
                            ? 'ring-2 ring-offset-1 ring-slate-800 scale-110 shadow-xs'
                            : 'hover:scale-105 opacity-85 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: p.color }}
                      >
                        {config.inCountryColor.toLowerCase() === p.color.toLowerCase() && (
                          <Check className="w-3.5 h-3.5 text-white drop-shadow" />
                        )}
                      </button>
                    ))}
                    <div className="relative ml-auto">
                      <input
                        type="color"
                        value={config.inCountryColor}
                        onChange={(e) => onChangeConfig({ ...config, inCountryColor: e.target.value })}
                        className="w-6 h-6 p-0 border-0 rounded cursor-pointer opacity-0 absolute inset-0"
                      />
                      <div
                        className="w-6 h-6 rounded-lg border border-slate-300 flex items-center justify-center cursor-pointer hover:border-slate-400"
                        title="Custom Color"
                      >
                        <Palette className="w-3 h-3 text-slate-600" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Abroad Color (International) */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-3.5 h-3.5 rounded-full shadow-xs"
                        style={{ backgroundColor: config.abroadColor }}
                      />
                      <span className="font-bold text-slate-800">
                        {t.abroadManager}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      {t.abroad}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    {isArabic
                      ? 'اللون الفسفوري للبطاقات التابعة لمدير متواجد خارج البلد'
                      : 'Fluorescent border for departments with international manager presence'}
                  </p>

                  {/* Swatches */}
                  <div className="flex items-center gap-1.5 pt-1">
                    {ABROAD_PRESETS.map((p) => (
                      <button
                        key={p.color}
                        type="button"
                        onClick={() => onChangeConfig({ ...config, abroadColor: p.color })}
                        title={p.name}
                        className={`w-6 h-6 rounded-lg transition-transform flex items-center justify-center ${
                          config.abroadColor.toLowerCase() === p.color.toLowerCase()
                            ? 'ring-2 ring-offset-1 ring-slate-800 scale-110 shadow-xs'
                            : 'hover:scale-105 opacity-85 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: p.color }}
                      >
                        {config.abroadColor.toLowerCase() === p.color.toLowerCase() && (
                          <Check className="w-3.5 h-3.5 text-white drop-shadow" />
                        )}
                      </button>
                    ))}
                    <div className="relative ml-auto">
                      <input
                        type="color"
                        value={config.abroadColor}
                        onChange={(e) => onChangeConfig({ ...config, abroadColor: e.target.value })}
                        className="w-6 h-6 p-0 border-0 rounded cursor-pointer opacity-0 absolute inset-0"
                      />
                      <div
                        className="w-6 h-6 rounded-lg border border-slate-300 flex items-center justify-center cursor-pointer hover:border-slate-400"
                        title="Custom Color"
                      >
                        <Palette className="w-3 h-3 text-slate-600" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Glow Intensity Selection */}
              <div>
                <label className="block font-semibold text-slate-700 mb-2">
                  {t.glowIntensity}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'subtle', label: t.subtleGlow, desc: '6px glow' },
                    { id: 'vibrant', label: t.vibrantGlow, desc: '14px neon' },
                    { id: 'high', label: t.highGlow, desc: '22px ultra' }
                  ].map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => onChangeConfig({ ...config, glowIntensity: lvl.id as any })}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        config.glowIntensity === lvl.id
                          ? 'border-indigo-600 bg-indigo-50/60 font-semibold text-indigo-950 shadow-xs ring-1 ring-indigo-600'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="block font-semibold">{lvl.label}</span>
                      <span className="block text-[10px] text-slate-500 mt-0.5">{lvl.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Department Manager Presence Management Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-slate-800">
                    {isArabic ? 'حالة تواجد مديري الأقسام' : 'Department Managers Location Status'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {isArabic ? 'اضغط لتغيير الحالة مباشرة' : 'Click badge to toggle status'}
                  </span>
                </div>

                <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto">
                  {departments.map((dept) => {
                    const isAbroad = dept.manager_location_status === 'abroad';
                    return (
                      <div
                        key={dept.id}
                        className="p-3 flex items-center justify-between hover:bg-slate-50/80 transition-colors"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">
                            {isArabic && dept.name_ar ? dept.name_ar : dept.name}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {dept.manager_name} ({dept.code})
                          </p>
                        </div>

                        {/* Interactive Location Toggle Button */}
                        <button
                          type="button"
                          onClick={() => onToggleDeptLocation(dept.id, isAbroad ? 'in_country' : 'abroad')}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border transition-all shadow-xs ${
                            isAbroad
                              ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                              : 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                          }`}
                          style={{
                            boxShadow: isAbroad
                              ? `0 0 8px ${config.abroadColor}40`
                              : `0 0 8px ${config.inCountryColor}40`
                          }}
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{
                              backgroundColor: isAbroad ? config.abroadColor : config.inCountryColor
                            }}
                          />
                          <span>
                            {isAbroad
                              ? isArabic ? '✈️ خارج البلد (دولي)' : '✈️ Abroad (Global)'
                              : isArabic ? '🟢 داخل البلد (محلي)' : '🟢 In-Country (Local)'}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* A4 Landscape Print Quick Banner */}
          <div className="p-3.5 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="font-bold text-indigo-950 text-xs block">
                {t.a4LandscapePrint}
              </span>
              <p className="text-[11px] text-indigo-700">
                {t.a4PrintDescription}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onTriggerA4Print();
              }}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold flex items-center gap-1.5 text-xs shadow-xs transition-colors shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t.printDiagram}</span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-[11px] font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>{isArabic ? 'استعادة الألوان الافتراضية' : 'Reset Colors'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold transition-colors shadow-xs"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
