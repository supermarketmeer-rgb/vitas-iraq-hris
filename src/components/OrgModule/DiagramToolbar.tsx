import React from 'react';
import { Language, translations } from './translations';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  ChevronsDown,
  ChevronsUp,
  Search,
  X,
  Filter,
  Route,
  FileText,
  Image as ImageIcon,
  Loader2,
  Sliders,
  ChevronDown,
  Network,
  TableProperties
} from 'lucide-react';

interface DiagramToolbarProps {
  lang: Language;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onFitScreen: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  onClearSearch: () => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  selectedNodeId: string | null;
  onClearSelection: () => void;
  onDownloadPdf: () => void;
  onDownloadPng: () => void;
  onDownloadVisio: () => void;
  onDownloadVisioVsdx?: () => void;
  onDownloadVisioVdx?: () => void;
  onDownloadVisioCsv?: () => void;
  onOpenExportModal: () => void;
  isExporting?: boolean;
}

export const DiagramToolbar: React.FC<DiagramToolbarProps> = ({
  lang,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetView,
  onFitScreen,
  onExpandAll,
  onCollapseAll,
  searchTerm,
  onSearchChange,
  onClearSearch,
  statusFilter,
  onStatusFilterChange,
  selectedNodeId,
  onClearSelection,
  onDownloadPdf,
  onDownloadPng,
  onDownloadVisio,
  onDownloadVisioVsdx,
  onDownloadVisioVdx,
  onDownloadVisioCsv,
  onOpenExportModal,
  isExporting
}) => {
  const t = translations[lang] || translations.ar;
  const isArabic = lang === 'ar';
  const [isVisioMenuOpen, setIsVisioMenuOpen] = React.useState(false);
  const visioMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (visioMenuRef.current && !visioMenuRef.current.contains(e.target as Node)) {
        setIsVisioMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="bg-[#111827]/95 backdrop-blur-md border border-white/10 shadow-xl rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 select-none text-white">
      {/* Left: Search input */}
      <div className="relative min-w-[220px] flex-1 max-w-xs">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t.searchPlaceholder}
          className="w-full pl-9 pr-8 py-1.5 text-xs bg-[#0a0c10] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
        />
        {searchTerm && (
          <button
            onClick={onClearSearch}
            className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Middle: Filter & Path Highlights */}
      <div className="flex items-center gap-2">
        {selectedNodeId && (
          <button
            onClick={onClearSelection}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-xl hover:bg-emerald-500/30 transition-colors"
          >
            <Route className="w-3.5 h-3.5" />
            <span>{t.reportingPathActive}</span>
            <X className="w-3 h-3 ml-1" />
          </button>
        )}

        {/* Employee Count Status Filter */}
        <div className="flex items-center gap-1 bg-[#0a0c10] border border-white/10 p-0.5 rounded-xl text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
          <button
            onClick={() => onStatusFilterChange('active')}
            className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-colors ${
              statusFilter === 'active' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.statusActiveOnly}
          </button>
          <button
            onClick={() => onStatusFilterChange('all')}
            className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-colors ${
              statusFilter === 'all' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.statusAll}
          </button>
        </div>
      </div>

      {/* Right: Zoom, Expand, and Export buttons */}
      <div className="flex items-center gap-1">
        {/* Tree expand / collapse */}
        <button
          onClick={onExpandAll}
          title={t.expandAll}
          className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
        >
          <ChevronsDown className="w-4 h-4" />
        </button>
        <button
          onClick={onCollapseAll}
          title={t.collapseAll}
          className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
        >
          <ChevronsUp className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-white/10 mx-1" />

        {/* Zoom controls */}
        <button
          onClick={onZoomOut}
          title={t.zoomOut}
          className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-xs font-mono font-bold text-teal-400 w-11 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={onZoomIn}
          title={t.zoomIn}
          className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <button
          onClick={onFitScreen}
          title={t.fitScreen}
          className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={onResetView}
          title={t.resetView}
          className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-white/10 mx-1" />

        {/* Dedicated 'Download as PDF/PNG' Action Group */}
        <div className="flex items-center gap-1 bg-[#0a0c10] p-0.5 rounded-xl border border-white/10">
          {/* A4 Landscape indicator */}
          <div className="hidden md:flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold text-teal-300 bg-teal-950/40 rounded-lg border border-teal-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
            <span>{isArabic ? 'A4 Landscape' : 'A4 Landscape'}</span>
          </div>

          {/* Quick PDF download button */}
          <button
            onClick={onDownloadPdf}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-slate-200 bg-white/5 hover:text-white hover:bg-white/10 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
            title="Download full diagram as A4 Landscape PDF"
          >
            {isExporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-400" />
            ) : (
              <FileText className="w-3.5 h-3.5 text-rose-400" />
            )}
            <span>PDF (A4)</span>
          </button>

          {/* Quick PNG download button */}
          <button
            onClick={onDownloadPng}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-slate-200 bg-white/5 hover:text-white hover:bg-white/10 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
            title="Download current diagram as PNG"
          >
            {isExporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-400" />
            ) : (
              <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
            )}
            <span>PNG</span>
          </button>

          {/* Quick Visio download split button */}
          <div className="relative flex items-center" ref={visioMenuRef}>
            <button
              onClick={() => {
                if (onDownloadVisioVsdx) {
                  onDownloadVisioVsdx();
                } else {
                  onDownloadVisio();
                }
              }}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-slate-200 bg-white/5 hover:text-white hover:bg-white/10 rounded-l-lg border-r border-white/10 transition-all disabled:opacity-50 cursor-pointer"
              title="Export to Microsoft Visio (.vsdx)"
            >
              <Network className="w-3.5 h-3.5 text-teal-400" />
              <span>Visio</span>
            </button>
            <button
              onClick={() => setIsVisioMenuOpen(!isVisioMenuOpen)}
              disabled={isExporting}
              className="px-1.5 py-1 text-slate-400 bg-white/5 hover:text-white hover:bg-white/10 rounded-r-lg transition-all disabled:opacity-50 cursor-pointer"
              title="Select Visio Format (.vsdx / .vdx / .csv)"
            >
              <ChevronDown className="w-3 h-3 text-slate-400 hover:text-white" />
            </button>

            {/* Visio Formats Floating Dropdown */}
            {isVisioMenuOpen && (
              <div className="absolute top-full right-0 mt-1.5 w-64 bg-[#111827] rounded-xl shadow-2xl border border-white/10 py-1.5 z-50 text-xs">
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-white/10 mb-1">
                  Visio Export Formats
                </div>

                <button
                  onClick={() => {
                    setIsVisioMenuOpen(false);
                    if (onDownloadVisioVsdx) onDownloadVisioVsdx();
                    else onDownloadVisio();
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-white/5 flex items-start gap-2.5 transition-colors cursor-pointer"
                >
                  <Network className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block">Visio Drawing (.vsdx)</span>
                    <span className="text-[10px] text-slate-400 block">Modern Visio 2013-2024 &amp; Microsoft 365</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsVisioMenuOpen(false);
                    if (onDownloadVisioVdx) onDownloadVisioVdx();
                    else onDownloadVisio();
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-white/5 flex items-start gap-2.5 transition-colors cursor-pointer"
                >
                  <Network className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block">Visio XML Drawing (.vdx)</span>
                    <span className="text-[10px] text-slate-400 block">Classic Visio XML 2003-2021 compatible</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsVisioMenuOpen(false);
                    if (onDownloadVisioCsv) onDownloadVisioCsv();
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-white/5 flex items-start gap-2.5 transition-colors cursor-pointer"
                >
                  <TableProperties className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block">Visio Wizard Data (.csv)</span>
                    <span className="text-[10px] text-slate-400 block">For Org Chart Wizard (File → New)</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* More export options modal trigger */}
          <button
            onClick={onOpenExportModal}
            disabled={isExporting}
            className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer"
            title="Export Options & Scope Settings"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
