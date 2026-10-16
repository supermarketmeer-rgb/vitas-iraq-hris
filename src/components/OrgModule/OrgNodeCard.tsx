import React from 'react';
import { OrgNode } from '../../types/hris';
import { Language } from './translations';
import {
  Building2,
  MapPin,
  Briefcase,
  Users,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Layers,
  Crown,
  Globe2
} from 'lucide-react';

interface OrgNodeCardProps {
  node: OrgNode;
  lang: Language;
  isCollapsed: boolean;
  onToggleCollapse: (nodeId: string) => void;
  isSelected: boolean;
  onSelectNode: (node: OrgNode) => void;
  isInReportingPath: boolean;
  isSearchMatched: boolean;
}

export const OrgNodeCard: React.FC<OrgNodeCardProps> = ({
  node,
  lang,
  isCollapsed,
  onToggleCollapse,
  isSelected,
  onSelectNode,
  isInReportingPath,
  isSearchMatched
}) => {
  const isArabic = lang === 'ar';
  const hasChildren = node.children && node.children.length > 0;
  const displayTitle = isArabic && node.title_ar ? node.title_ar : node.title;

  // Visual styling variants based on node type
  let badgeIcon = <Briefcase className="w-4 h-4 text-indigo-400" />;
  let cardBg = 'bg-[#111827] border-white/10 text-white hover:border-white/20';
  let headerColor = 'text-white';
  let typeTag = isArabic ? 'منصب وظيفي' : 'Position';

  if (node.type === 'top_management') {
    badgeIcon = <Crown className="w-4 h-4 text-amber-400" />;
    cardBg = 'bg-[#111827] border-teal-500/50 text-white hover:border-teal-400/70 shadow-lg ring-1 ring-teal-400/30';
    headerColor = 'text-white';
    typeTag = isArabic ? 'الإدارة العليا' : 'Top Management';
  } else if (node.type === 'department') {
    badgeIcon = <Building2 className="w-4 h-4 text-teal-400" />;
    const isAbroad = node.manager_location_status === 'abroad';
    const borderGlow = isAbroad
      ? 'border-orange-500/80 shadow-[0_0_15px_rgba(249,115,22,0.3)] ring-1 ring-orange-400/50'
      : 'border-emerald-500/80 shadow-[0_0_15px_rgba(16,185,129,0.3)] ring-1 ring-emerald-400/50';

    cardBg = `bg-[#111827] text-white ${borderGlow} hover:border-white/30`;
    headerColor = 'text-white';
    typeTag = isArabic ? 'قسم' : 'Department';
  } else if (node.type === 'offices') {
    badgeIcon = <MapPin className="w-4 h-4 text-cyan-400" />;
    cardBg = 'bg-[#0c1017] border-cyan-500/30 text-white hover:border-cyan-400/50 shadow-md';
    headerColor = 'text-cyan-100';
    typeTag = isArabic ? 'الفروع والمكاتب' : 'Consolidated Offices';
  } else {
    // Position
    badgeIcon = <Briefcase className="w-4 h-4 text-indigo-400" />;
    cardBg = 'bg-[#111827] border-white/10 text-white hover:border-indigo-400/40 shadow-sm';
    headerColor = 'text-slate-100';
    typeTag = isArabic ? 'منصب وظيفي' : 'Position';
  }

  // Ring and highlight logic
  let ringClasses = '';
  if (isSelected) {
    ringClasses = 'ring-2 ring-teal-400 shadow-xl shadow-teal-500/25';
  } else if (isSearchMatched) {
    ringClasses = 'ring-2 ring-amber-400 shadow-lg shadow-amber-500/30 animate-pulse';
  } else if (isInReportingPath) {
    ringClasses = 'ring-2 ring-emerald-400/90 shadow-lg shadow-emerald-500/25';
  }

  const hasWarning = node.metadata?.has_circular_reference || node.metadata?.missing_supervisor;

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelectNode(node);
      }}
      className={`relative w-[280px] rounded-2xl border p-3.5 shadow-lg transition-all duration-200 cursor-pointer ${cardBg} ${ringClasses} select-none backdrop-blur-md`}
    >
      {/* Warning ribbon if integrity issue */}
      {hasWarning && (
        <div
          title={node.metadata?.has_circular_reference ? (isArabic ? 'حلقة إشراف دائرية' : 'Circular loop detected') : (isArabic ? 'مشرف غير موجود' : 'Missing supervisor reference')}
          className="absolute -top-2.5 -right-2.5 bg-rose-500 text-white p-1 rounded-full shadow-lg animate-bounce z-10"
        >
          <AlertTriangle className="w-4 h-4" />
        </div>
      )}

      {/* Header bar: Icon + Type tag */}
      <div className="flex items-center justify-between text-xs mb-2">
        <div className="flex items-center gap-1.5 opacity-90">
          {badgeIcon}
          <span className="font-bold tracking-wide uppercase text-[10px] text-slate-300">{typeTag}</span>
        </div>
        {node.type === 'department' && node.manager_location_status === 'abroad' && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
            <Globe2 className="w-3 h-3" />
            {isArabic ? 'بالخارج' : 'Abroad'}
          </span>
        )}
        {node.type === 'offices' && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-md">
            <Layers className="w-3 h-3" />
            {node.metadata?.offices_count || 1} {isArabic ? 'فروع' : 'Branches'}
          </span>
        )}
      </div>

      {/* Main Title */}
      <h3 className={`text-sm font-bold leading-snug line-clamp-2 ${headerColor}`}>
        {displayTitle}
      </h3>

      {/* Subtitle / Details */}
      {node.type === 'department' && (
        <p className="mt-1 text-[11px] text-slate-400 line-clamp-1">
          {node.metadata?.manager_name ? `${isArabic ? 'المدير: ' : 'Manager: '}${node.metadata.manager_name}` : ''}
        </p>
      )}

      {node.type === 'offices' && (
        <p className="mt-1 text-[11px] text-slate-400 line-clamp-1">
          {isArabic ? 'تجميع لكافة الفروع والمكاتب التابعة للقسم' : 'Aggregating all department physical offices'}
        </p>
      )}

      {/* Direct reporting indicator (e.g. منسق الائتمان يتبع لقسم الائتمان مباشرة) */}
      {node.metadata?.reports_to_ar && (
        <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-medium text-teal-300 bg-teal-950/60 border border-teal-500/30 px-2 py-0.5 rounded-md w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
          <span>{isArabic ? node.metadata.reports_to_ar : (node.metadata.reports_to || 'Direct Reporting')}</span>
        </div>
      )}

      {/* Employee count badge */}
      <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-medium text-slate-300">
          <Users className="w-3.5 h-3.5 text-teal-400" />
          <span className="text-[11px]">{isArabic ? 'الموظفون:' : 'Employees:'}</span>
          <span className="font-bold text-teal-400 bg-[#0a0c10] border border-white/10 px-2 py-0.5 rounded-lg text-xs font-mono">
            {node.employee_count ?? 0}
          </span>
        </div>

        {/* Expand / Collapse toggle if has children */}
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse(node.id);
            }}
            className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-2 py-1 rounded-lg transition-colors cursor-pointer"
            title={isCollapsed ? (isArabic ? 'توسيع التفرع' : 'Expand branch') : (isArabic ? 'طي التفرع' : 'Collapse branch')}
          >
            {isCollapsed ? (
              <>
                <span className="font-mono">+{node.children.length}</span>
                <ChevronRight className={`w-3.5 h-3.5 ${isArabic ? 'rotate-180' : ''}`} />
              </>
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>
    </div>
  );
};
