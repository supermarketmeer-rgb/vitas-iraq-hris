import React, { useState } from 'react';
import { OrgNode } from '../../types/hris';
import { Language, translations } from './translations';
import {
  X,
  Building2,
  MapPin,
  Briefcase,
  Users,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Layers,
  Search
} from 'lucide-react';

interface NodeDetailsDrawerProps {
  node: OrgNode | null;
  lang: Language;
  onClose: () => void;
  onNavigateToNode?: (nodeId: string) => void;
}

export const NodeDetailsDrawer: React.FC<NodeDetailsDrawerProps> = ({
  node,
  lang,
  onClose,
  onNavigateToNode
}) => {
  const [empSearch, setEmpSearch] = useState('');
  if (!node) return null;

  const t = translations[lang];
  const isArabic = lang === 'ar';
  const displayTitle = isArabic && node.title_ar ? node.title_ar : node.title;

  const filteredEmployees = (node.metadata?.employees || []).filter(e => {
    if (!empSearch) return true;
    const term = empSearch.toLowerCase();
    return (
      e.name.toLowerCase().includes(term) ||
      e.raw_title.toLowerCase().includes(term) ||
      e.employee_number.toLowerCase().includes(term) ||
      e.office_name.toLowerCase().includes(term)
    );
  });

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col transition-transform duration-300">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-white border border-slate-200 text-indigo-600 shadow-xs">
            {node.type === 'department' ? (
              <Building2 className="w-5 h-5" />
            ) : node.type === 'offices' ? (
              <MapPin className="w-5 h-5 text-teal-600" />
            ) : (
              <Briefcase className="w-5 h-5" />
            )}
          </div>
          <div>
            <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
              {node.type === 'department'
                ? t.departmentDetails
                : node.type === 'offices'
                ? t.officeDetails
                : t.positionDetails}
            </span>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">
              {displayTitle}
            </h2>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 text-sm">
        {/* Warning Alert if any */}
        {(node.metadata?.has_circular_reference || node.metadata?.missing_supervisor) && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-900">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-xs uppercase tracking-wide text-rose-700">
                {t.warnings}
              </h4>
              <p className="text-xs mt-1">
                {node.metadata?.has_circular_reference
                  ? 'A circular reporting loop was detected for this position hierarchy. Cycle broken automatically to prevent infinite loop.'
                  : 'Supervisor reference is missing or invalid in database.'}
              </p>
            </div>
          </div>
        )}

        {/* Reporting line callout */}
        {node.metadata?.reports_to_ar && (
          <div className="p-3 bg-teal-50/80 border border-teal-200 rounded-xl flex items-center gap-2.5 text-teal-900 text-xs">
            <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0"></span>
            <div>
              <span className="font-semibold block">
                {isArabic ? `التبعية والاتصال الإداري: ${node.metadata.reports_to_ar}` : `Reporting Line: ${node.metadata.reports_to || 'Credit Department'}`}
              </span>
              {node.metadata.location_context && (
                <span className="text-[11px] text-teal-700 block mt-0.5">
                  {node.metadata.location_context}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Basic Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
            <span className="text-xs text-slate-500 block">{t.employeesLabel}</span>
            <span className="text-xl font-bold text-slate-900 mt-1 block">
              {node.employee_count ?? 0}
            </span>
          </div>

          {node.type === 'offices' && (
            <div className="bg-teal-50/50 border border-teal-100 p-3 rounded-xl">
              <span className="text-xs text-teal-700 block">{t.physicalOfficesLabel}</span>
              <span className="text-xl font-bold text-teal-950 mt-1 block">
                {node.metadata?.offices_count || 1}
              </span>
            </div>
          )}

          {node.type === 'department' && (
            <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-xl">
              <span className="text-xs text-blue-700 block">{t.manager}</span>
              <span className="text-sm font-semibold text-blue-950 mt-1 block truncate">
                {node.metadata?.manager_name || 'N/A'}
              </span>
            </div>
          )}

          {node.type === 'position' && (
            <div className="bg-indigo-50/50 border border-indigo-100 p-3 rounded-xl">
              <span className="text-xs text-indigo-700 block">{t.directSubordinates}</span>
              <span className="text-xl font-bold text-indigo-950 mt-1 block">
                {node.children.length}
              </span>
            </div>
          )}
        </div>

        {/* Breakdown for CONSOLIDATED OFFICES */}
        {node.type === 'offices' && node.metadata?.offices_list && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-slate-900 flex items-center gap-2 text-xs uppercase tracking-wide">
                <Layers className="w-4 h-4 text-teal-600" />
                <span>Physical Offices Consolidated Under This Department</span>
              </h4>
            </div>
            <p className="text-xs text-slate-500">
              In accordance with HRIS requirements, these physical offices are consolidated into this single Offices node in the diagram while remaining individual physical records in the database.
            </p>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
              {node.metadata.offices_list.map((off) => (
                <div key={off.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div>
                    <span className="font-medium text-slate-900 block text-xs">
                      {isArabic && off.name_ar ? off.name_ar : off.name}
                    </span>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {off.city}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                      {off.employee_count} {isArabic ? 'موظف' : 'employees'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Breakdown for NORMALIZED POSITIONS */}
        {node.type === 'position' && node.metadata?.raw_titles_breakdown && (
          <div className="space-y-3">
            <h4 className="font-semibold text-slate-900 flex items-center gap-2 text-xs uppercase tracking-wide">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>{t.originalTitlesBreakdown}</span>
            </h4>
            <p className="text-xs text-slate-500">
              Normalized title: <strong>{node.title}</strong> combines equivalent seniority prefixes and suffixes into this functional position.
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
              {Object.entries(node.metadata.raw_titles_breakdown).map(([rawTitle, count]) => (
                <div key={rawTitle} className="flex items-center justify-between text-xs">
                  <span className="text-slate-700 font-medium">{rawTitle}</span>
                  <span className="font-semibold text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Direct Subordinate Positions */}
        {node.type === 'position' && node.children.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wide">
              {t.directSubordinates} ({node.children.length})
            </h4>
            <div className="space-y-1.5">
              {node.children.map((sub) => (
                <div
                  key={sub.id}
                  onClick={() => onNavigateToNode && onNavigateToNode(sub.id)}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="font-medium text-xs text-slate-900">{sub.title}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span>{sub.employee_count} {t.employeesLabel}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Assigned Employees List */}
        {node.metadata?.employees && node.metadata.employees.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wide">
                {t.assignedEmployees} ({node.metadata.employees.length})
              </h4>
            </div>

            {/* Quick search input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={empSearch}
                onChange={(e) => setEmpSearch(e.target.value)}
                placeholder="Search employees in this node..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white">
              {filteredEmployees.map((emp) => (
                <div key={emp.id} className="p-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-medium text-slate-900 block">
                      {isArabic && emp.name_ar ? emp.name_ar : emp.name}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      {emp.raw_title} · {emp.office_name}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-slate-400 block">{emp.employee_number}</span>
                    <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.2 bg-emerald-50 text-emerald-700 font-medium rounded">
                      {emp.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
