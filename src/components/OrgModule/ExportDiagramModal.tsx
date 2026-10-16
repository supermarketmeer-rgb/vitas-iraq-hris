import React, { useState } from 'react';
import { Language, translations } from './translations';
import {
  X,
  FileText,
  Image,
  Download,
  Loader2,
  CheckCircle2,
  Sliders,
  Layers,
  FileCode,
  Network,
  TableProperties,
  Info
} from 'lucide-react';

export type ExportFormatType = 'pdf' | 'png' | 'visio_vsdx' | 'visio_vdx' | 'visio_csv' | 'json';

interface ExportDiagramModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  currentZoom: number;
  onExecuteExport: (
    format: ExportFormatType,
    scope: 'current_view' | 'full_diagram',
    pdfPageFormat: 'fit' | 'a4'
  ) => Promise<void>;
}

export const ExportDiagramModal: React.FC<ExportDiagramModalProps> = ({
  isOpen,
  onClose,
  lang,
  currentZoom,
  onExecuteExport
}) => {
  if (!isOpen) return null;

  const t = translations[lang];
  const isArabic = lang === 'ar';

  const [selectedFormat, setSelectedFormat] = useState<ExportFormatType>('visio_vsdx');
  const [scope, setScope] = useState<'current_view' | 'full_diagram'>('current_view');
  const [pdfPageFormat, setPdfPageFormat] = useState<'fit' | 'a4'>('fit');
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  const zoomPercent = Math.round(currentZoom * 100);

  const handleDownload = async () => {
    setIsExporting(true);
    setExportComplete(false);
    try {
      await onExecuteExport(selectedFormat, scope, pdfPageFormat);
      setExportComplete(true);
      setTimeout(() => {
        setExportComplete(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to generate export file. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden text-xs">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">
              {t.exportDiagram}
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Format Selection Cards */}
          <div>
            <label className="block font-semibold text-slate-700 mb-2">
              {t.exportFormat}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {/* Modern Microsoft Visio (.vsdx) */}
              <button
                type="button"
                onClick={() => setSelectedFormat('visio_vsdx')}
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                  selectedFormat === 'visio_vsdx'
                    ? 'border-teal-600 bg-teal-50/70 text-teal-950 font-semibold shadow-xs ring-1 ring-teal-600'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Network className={`w-5 h-5 ${selectedFormat === 'visio_vsdx' ? 'text-teal-600' : 'text-slate-400'}`} />
                <span className="font-medium text-center">Visio (.vsdx)</span>
                <span className="text-[9px] text-teal-700 font-bold uppercase tracking-wider">Modern / 365</span>
              </button>

              {/* Microsoft Visio XML (.vdx) */}
              <button
                type="button"
                onClick={() => setSelectedFormat('visio_vdx')}
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                  selectedFormat === 'visio_vdx'
                    ? 'border-teal-600 bg-teal-50/70 text-teal-950 font-semibold shadow-xs ring-1 ring-teal-600'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Network className={`w-5 h-5 ${selectedFormat === 'visio_vdx' ? 'text-teal-600' : 'text-slate-400'}`} />
                <span className="font-medium text-center">Visio (.vdx)</span>
                <span className="text-[9px] text-slate-500 font-medium">XML Drawing</span>
              </button>

              {/* Visio Org Chart Wizard CSV */}
              <button
                type="button"
                onClick={() => setSelectedFormat('visio_csv')}
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                  selectedFormat === 'visio_csv'
                    ? 'border-teal-600 bg-teal-50/70 text-teal-950 font-semibold shadow-xs ring-1 ring-teal-600'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <TableProperties className={`w-5 h-5 ${selectedFormat === 'visio_csv' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className="font-medium text-center">Visio Wizard</span>
                <span className="text-[9px] text-slate-500 font-medium">CSV Data</span>
              </button>

              {/* PDF */}
              <button
                type="button"
                onClick={() => setSelectedFormat('pdf')}
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                  selectedFormat === 'pdf'
                    ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 font-semibold shadow-xs ring-1 ring-indigo-600'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <FileText className={`w-5 h-5 ${selectedFormat === 'pdf' ? 'text-rose-600' : 'text-slate-400'}`} />
                <span className="font-medium text-center">PDF Document</span>
                <span className="text-[9px] text-slate-500 font-medium">Vector / Print</span>
              </button>

              {/* PNG */}
              <button
                type="button"
                onClick={() => setSelectedFormat('png')}
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                  selectedFormat === 'png'
                    ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 font-semibold shadow-xs ring-1 ring-indigo-600'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Image className={`w-5 h-5 ${selectedFormat === 'png' ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className="font-medium text-center">PNG Image</span>
                <span className="text-[9px] text-slate-500 font-medium">High Resolution</span>
              </button>

              {/* JSON */}
              <button
                type="button"
                onClick={() => setSelectedFormat('json')}
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                  selectedFormat === 'json'
                    ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 font-semibold shadow-xs ring-1 ring-indigo-600'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <FileCode className={`w-5 h-5 ${selectedFormat === 'json' ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span className="font-medium text-center">JSON Data</span>
                <span className="text-[9px] text-slate-500 font-medium">Raw Tree</span>
              </button>
            </div>
          </div>

          {/* Visio format explanations */}
          {selectedFormat === 'visio_vsdx' && (
            <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl flex items-start gap-2.5 text-teal-900">
              <Network className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-teal-950">
                  Microsoft Visio Modern Drawing (.vsdx)
                </p>
                <p className="text-[11px] text-teal-800 leading-relaxed">
                  {isArabic
                    ? 'ينشئ حزمة رسم مايكروسوفت فيزيو الحديثة (.vsdx) المعتمدة في Visio 2013-2024 وMicrosoft 365، مع تعيين عقد الأقسام والمكاتب والمناصب كأشكال فيزيو مترابطة مع خصائص البيانات وأعداد الموظفين.'
                    : 'Generates a modern Microsoft Visio (.vsdx) package file (Visio 2013-2024 / M365). Maps Department, Office, and Position nodes to native Visio shapes with custom properties, employee counts, and dynamic connectors.'}
                </p>
              </div>
            </div>
          )}

          {selectedFormat === 'visio_vdx' && (
            <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl flex items-start gap-2.5 text-teal-900">
              <Network className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-teal-950">
                  Microsoft Visio XML Drawing (.vdx)
                </p>
                <p className="text-[11px] text-teal-800 leading-relaxed">
                  {isArabic
                    ? 'ينشئ ملف رسم فيزيو رسمي بصيغة XML (.vdx) متوافق مع كافة إصدارات فيزيو، يحتوي على الأشكال والمواقع وإحداثيات خطوط الربط القابلة للتعديل.'
                    : 'Generates a native Microsoft Visio XML Drawing (.vdx) compatible with all Visio versions, preserving shape positions, labels, employee counts, and orthogonal connectors.'}
                </p>
              </div>
            </div>
          )}

          {selectedFormat === 'visio_csv' && (
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-emerald-900">
              <TableProperties className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-emerald-950">
                  Visio Organization Chart Wizard (.csv)
                </p>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  {isArabic
                    ? 'ملف جدول بيانات مهيأ خصيصاً لمعالج المخططات التنظيمية التلقائي في فيزيو (File → New → Organization Chart Wizard) لرسم المخطط باستخدام قوالب واستنسلات فيزيو القياسية.'
                    : 'Formatted specifically for Microsoft Visio Organization Chart Wizard (File → New → Organization Chart Wizard) to automatically construct native Visio org chart stencil shapes with reporting relations.'}
                </p>
              </div>
            </div>
          )}

          {/* Scope Options (For visual formats) */}
          {(selectedFormat === 'pdf' || selectedFormat === 'png') && (
            <div>
              <label className="block font-semibold text-slate-700 mb-2">
                {t.exportScope}
              </label>
              <div className="space-y-2">
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    scope === 'current_view'
                      ? 'border-indigo-300 bg-indigo-50/30 text-indigo-950'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="export-scope"
                    checked={scope === 'current_view'}
                    onChange={() => setScope('current_view')}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="font-semibold block">
                      {t.currentViewOption}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Preserves current zoom ({zoomPercent}%), camera framing, and active reporting path.
                    </p>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    scope === 'full_diagram'
                      ? 'border-indigo-300 bg-indigo-50/30 text-indigo-950'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="export-scope"
                    checked={scope === 'full_diagram'}
                    onChange={() => setScope('full_diagram')}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="font-semibold block">
                      {t.fullDiagramOption}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Exports all nodes in the hierarchy tree rendered at {zoomPercent}% zoom scale.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* PDF Page Format options */}
          {selectedFormat === 'pdf' && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                PDF Layout Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPdfPageFormat('fit')}
                  className={`p-2.5 rounded-lg border text-left transition-colors ${
                    pdfPageFormat === 'fit'
                      ? 'border-indigo-600 bg-indigo-50/40 font-semibold text-indigo-900'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="block font-semibold">Exact Fit (Clean Edge)</span>
                  <span className="block text-[10px] text-slate-500 mt-0.5">
                    Matches diagram aspect ratio with zero page margins
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPdfPageFormat('a4')}
                  className={`p-2.5 rounded-lg border text-left transition-colors ${
                    pdfPageFormat === 'a4'
                      ? 'border-indigo-600 bg-indigo-50/40 font-semibold text-indigo-900'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="block font-semibold">A4 Presentation</span>
                  <span className="block text-[10px] text-slate-500 mt-0.5">
                    Includes company header and date banner for print
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Status Message */}
          {exportComplete && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{t.exportSuccess}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 font-medium"
          >
            {t.cancel}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={isExporting}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>
                  {selectedFormat === 'pdf'
                    ? t.downloadPdf
                    : selectedFormat === 'png'
                    ? t.downloadPng
                    : selectedFormat === 'visio_vsdx'
                    ? t.downloadVisioVsdx
                    : selectedFormat === 'visio_vdx'
                    ? t.downloadVisioVdx
                    : selectedFormat === 'visio_csv'
                    ? t.downloadVisioCsv
                    : 'Download JSON'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
