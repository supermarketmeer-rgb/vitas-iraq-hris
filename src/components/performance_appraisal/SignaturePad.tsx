import React, { useRef, useState } from 'react';

interface SignaturePadProps {
  expectedName: string;
  language: string;
  actionLabel: string;
  onConfirm: (payload: { typedName: string; signatureDrawing?: string }) => void;
  onCancel?: () => void;
  submitting?: boolean;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  expectedName,
  language = 'ar',
  actionLabel,
  onConfirm,
  onCancel,
  submitting = false,
}) => {
  const [typedName, setTypedName] = useState(expectedName);
  const [authConfirmed, setAuthConfirmed] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const getCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authConfirmed || !typedName.trim()) return;
    const signatureDrawing = hasDrawn && canvasRef.current ? canvasRef.current.toDataURL('image/png') : undefined;
    onConfirm({ typedName: typedName.trim(), signatureDrawing });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
      <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/30 text-teal-800 dark:text-teal-300">
        <div className="flex items-center gap-2 font-bold mb-1">
          <span className="material-symbols-outlined text-base">verified_user</span>
          <span>{language === 'ar' ? 'المصادقة والتوقيع الإلكتروني الرسمي' : 'Official Electronic Signature'}</span>
        </div>
        <p className="text-[11px] text-teal-700 dark:text-teal-400">
          {language === 'ar'
            ? 'يعد هذا التوقيع الإلكتروني بمثابة إقرار رسمي ملزم قانونياً وموثق في سجل التدقيق المؤسسي.'
            : 'This electronic signature constitutes a legally binding institutional acknowledgement.'}
        </p>
      </div>

      <div>
        <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
          {language === 'ar' ? 'الاسم الصريح الكامل للموقع:' : 'Full Typed Signatory Name:'}
        </label>
        <input
          type="text"
          value={typedName}
          onChange={(e) => setTypedName(e.target.value)}
          required
          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#06080d] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-bold outline-none focus:border-teal-500"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-slate-700 dark:text-slate-300 font-bold">
            {language === 'ar' ? 'رسم التوقيع اليدوي (اختياري / بالماوس أو اللمس):' : 'Drawn Signature (Optional):'}
          </label>
          {hasDrawn && (
            <button
              type="button"
              onClick={clearCanvas}
              className="text-[11px] text-rose-500 hover:text-rose-600 font-bold cursor-pointer"
            >
              {language === 'ar' ? 'مسح الرسم' : 'Clear'}
            </button>
          )}
        </div>
        <div className="border border-slate-300 dark:border-white/20 rounded-xl bg-white overflow-hidden shadow-inner">
          <canvas
            ref={canvasRef}
            width={400}
            height={110}
            className="w-full h-28 touch-none cursor-crosshair bg-white"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />
        </div>
      </div>

      <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 cursor-pointer">
        <input
          type="checkbox"
          checked={authConfirmed}
          onChange={(e) => setAuthConfirmed(e.target.checked)}
          className="mt-0.5 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
        />
        <span className="text-[11px] text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
          {language === 'ar'
            ? 'أقر بصحة ودقة كافة البيانات والدرجات المدرجة في هذا التقييم، وأوافق على اعتمادها رسمياً.'
            : 'I acknowledge the completeness and accuracy of this appraisal and approve its official record.'}
        </span>
      </label>

      <div className="flex items-center justify-end gap-2.5 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
          >
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </button>
        )}
        <button
          type="submit"
          disabled={!authConfirmed || !typedName.trim() || submitting}
          className={`px-5 py-2 rounded-xl text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer ${
            !authConfirmed || !typedName.trim() || submitting
              ? 'bg-slate-400 opacity-60 cursor-not-allowed'
              : 'bg-teal-600 hover:bg-teal-500 shadow-teal-600/30'
          }`}
        >
          <span className="material-symbols-outlined text-sm">draw</span>
          <span>{actionLabel}</span>
        </button>
      </div>
    </form>
  );
};

