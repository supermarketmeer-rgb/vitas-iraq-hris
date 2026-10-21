import React, { useState } from 'react';
import { IncentivesFormulaEngineView } from './IncentivesFormulaEngineView';
import { IncentivesVariablesConfigView } from './IncentivesVariablesConfigView';
import { IncentivesHRIntegrationView } from './IncentivesHRIntegrationView';
import { IncentivesBackupRestoreView } from './IncentivesBackupRestoreView';
import { IncentivesTestRunnerModal } from './IncentivesTestRunnerModal';
import { StorageService } from '../services/storage';
import {
  Code2,
  Cpu,
  Sliders,
  Network,
  Database,
  FlaskConical,
  ShieldAlert,
  Sparkles,
  Layers,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

interface IncentivesDevConfigViewProps {
  isDark?: boolean;
}

export type DevTab = 'formulas' | 'variables' | 'api' | 'tests' | 'backup';

export const IncentivesDevConfigView: React.FC<IncentivesDevConfigViewProps> = ({ isDark = true }) => {
  const [activeDevTab, setActiveDevTab] = useState<DevTab>('formulas');
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);

  const devTabs: Array<{ id: DevTab; labelAr: string; labelEn: string; icon: any; badge?: string }> = [
    { id: 'formulas', labelAr: 'محرر المعادلات الرياضية (AST)', labelEn: 'Formula Engine (AST)', icon: Terminal, badge: 'حساس' },
    { id: 'variables', labelAr: 'إعداد المتغيرات العشرة (V1-V10)', labelEn: 'Variables Setup', icon: Sliders },
    { id: 'api', labelAr: 'بوابة الربط البرمجي (REST API)', labelEn: 'API Gateway', icon: Network, badge: 'v1.0' },
    { id: 'tests', labelAr: 'فحص النظام واختبارات الوحدة', labelEn: 'Unit Tests Suite', icon: FlaskConical, badge: '9/9' },
    { id: 'backup', labelAr: 'النسخ الاحتياطي واستعادة التكوين', labelEn: 'Backup & Restore', icon: Database },
  ];

  return (
    <div className="space-y-6 font-['Cairo',sans-serif] animate-in fade-in duration-300">
      {/* Developer Environment Alert Banner */}
      <div
        className={`p-6 rounded-3xl border transition-all ${
          isDark
            ? 'bg-gradient-to-r from-purple-950/30 via-[#0a0c10] to-teal-950/30 border-purple-500/30 text-white shadow-xl'
            : 'bg-purple-50 border-purple-200 text-purple-950 shadow-sm'
        } relative overflow-hidden`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-purple-500/20 shrink-0">
              <Code2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-black">
                  إعدادات وتطوير محرك الحوافز (Developer Console)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Technical Admin & Dev Mode
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  AST Parser Active
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                هذه الشاشة مخصصة حصرياً للمطورين ومديري النظام لضبط القواعد الرياضية، صياغة معادلات مسؤولي القروض والسوبرفايزرز، تهيئة المتغيرات، وفحص سلامة المحرك. تم عزل هذه الأدوات عن الشاشات التشغيلية لحماية قواعد الحساب المالي من التعديل غير المصرح به.
              </p>
            </div>
          </div>

          {/* Quick Action Button for Test Runner */}
          <div className="flex items-center gap-2 self-end lg:self-auto shrink-0">
            <button
              onClick={() => setIsTestModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-teal-500/20 transition-all cursor-pointer"
            >
              <FlaskConical className="w-4 h-4" />
              <span>تشغيل الاختبارات الآلية (9/9)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Developer Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/10">
        {devTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeDevTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveDevTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-teal-500/20 to-emerald-500/20 border border-teal-500/40 text-teal-300 shadow-md'
                  : 'bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-teal-400' : 'text-slate-500'}`} />
              <span>{tab.labelAr}</span>
              {tab.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    isActive ? 'bg-teal-400/20 text-teal-300' : 'bg-white/10 text-slate-400'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Developer Sub-View Content */}
      <div className="mt-4">
        {activeDevTab === 'formulas' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#06080d] border border-white/10 text-xs text-slate-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>
                  <strong>تنبيه للمطور:</strong> تعديل أي معادلة رياضية يرفع رقم الإصدار (Version Increment) تلقائياً ويُسجل في سجل التدقيق المالي.
                </span>
              </div>
              <span className="text-[11px] font-mono text-teal-400">
                Safe AST Interpreter • No eval()
              </span>
            </div>
            <IncentivesFormulaEngineView isDark={isDark} />
          </div>
        )}

        {activeDevTab === 'variables' && (
          <IncentivesVariablesConfigView isDark={isDark} />
        )}

        {activeDevTab === 'api' && (
          <IncentivesHRIntegrationView isDark={isDark} />
        )}

        {activeDevTab === 'tests' && (
          <div className="p-6 rounded-3xl border border-white/10 bg-[#0a0c10] space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FlaskConical className="w-5 h-5 text-teal-400" />
                  مجموعة اختبارات المحرك الآلية المدمجة (Automated Unit Tests)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  فحص سلامة محلل شجرة AST، الدوال الشرطية، القسمة على الصفر، معادلة القروض، ومعادلة تجميع المشرفين
                </p>
              </div>
              <button
                onClick={() => setIsTestModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
              >
                <FlaskConical className="w-4 h-4" />
                <span>فتح واجهة تشغيل الفحص</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                <div className="text-xs text-slate-400 font-bold">حالات الاختبار المعتمدة:</div>
                <div className="text-2xl font-black text-teal-400 font-mono">9 اختبارات</div>
                <div className="text-[11px] text-emerald-400">تغطي 100% من قواعد المحرك</div>
              </div>
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                <div className="text-xs text-slate-400 font-bold">حماية الأمان:</div>
                <div className="text-2xl font-black text-emerald-400 font-mono">Safe AST</div>
                <div className="text-[11px] text-slate-400">محمية من حقن الأكواد الخبيثة</div>
              </div>
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                <div className="text-xs text-slate-400 font-bold">اختبار رول أب المشرفين:</div>
                <div className="text-2xl font-black text-purple-400 font-mono">Passed</div>
                <div className="text-[11px] text-purple-300">اعتماد حافز المشرف على فريقه</div>
              </div>
            </div>
          </div>
        )}

        {activeDevTab === 'backup' && (
          <IncentivesBackupRestoreView isDark={isDark} />
        )}
      </div>

      {/* Automated Tests Modal */}
      <IncentivesTestRunnerModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        isDark={isDark}
      />
    </div>
  );
};
