import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Cropper, { Area, Point } from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import { Check, Crop, Image as ImageIcon, X } from 'lucide-react';
import { tr } from '../utils/i18n';

interface OdometerPhotoCropperProps {
  image: string;
  onConfirm: (croppedImage: string) => void | Promise<void>;
  onUseFullImage: () => void | Promise<void>;
  onCancel: () => void;
}

const loadImage = (source: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('Unable to load captured image.'));
  image.src = source;
});

const cropImage = async (source: string, crop: Area): Promise<string> => {
  const image = await loadImage(source);
  const canvas = document.createElement('canvas');
  const maxWidth = 1600;
  const scale = Math.min(1, maxWidth / crop.width);
  canvas.width = Math.max(1, Math.round(crop.width * scale));
  canvas.height = Math.max(1, Math.round(crop.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable.');
  context.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.92);
};

export const OdometerPhotoCropper: React.FC<OdometerPhotoCropperProps> = ({
  image,
  onConfirm,
  onUseFullImage,
  onCancel,
}) => {
  const [position, setPosition] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pixels, setPixels] = useState<Area | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const handleCropComplete = useCallback((_area: Area, croppedPixels: Area) => {
    setPixels(croppedPixels);
  }, []);

  const applyCrop = async () => {
    if (isApplying) return;
    if (!pixels) {
      setError(tr('انتظر حتى تظهر الصورة، ثم حاول مرة أخرى.', 'Wait for the photo to appear, then try again.'));
      return;
    }
    setIsApplying(true);
    setError(null);
    try {
      await onConfirm(await cropImage(image, pixels));
    } catch (cropError) {
      console.error('[DTMS Crop] Unable to crop odometer photo.', cropError);
      setError(tr('تعذر قص الصورة. يمكنك استخدام الصورة كاملة أو المحاولة مرة أخرى.', 'Unable to crop the photo. Use the full photo or try again.'));
    } finally {
      setIsApplying(false);
    }
  };

  const content = (
    <div
      className="fixed inset-0 z-[100] flex h-[100dvh] w-screen flex-col overflow-hidden bg-slate-950 text-white"
      style={{ touchAction: 'none', overscrollBehavior: 'none' }}
      role="dialog"
      aria-modal="true"
      dir="ltr"
    >
      <div className="flex min-h-16 shrink-0 items-center justify-between border-b border-white/15 px-4">
        <div className="flex items-center gap-2">
          <Crop className="h-5 w-5 text-teal-300" />
          <div>
            <h3 className="text-sm font-black">{tr('قص صورة العداد', 'Crop odometer photo')}</h3>
            <p className="text-[11px] text-slate-300">{tr('ضع أرقام العداد داخل الإطار', 'Keep the odometer numbers inside the frame')}</p>
          </div>
        </div>
        <button type="button" onClick={onCancel} aria-label={tr('إلغاء', 'Cancel')} className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-white/10">
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="relative min-h-0 flex-1 touch-none overflow-hidden">
        <Cropper
          image={image}
          crop={position}
          zoom={zoom}
          aspect={3}
          cropShape="rect"
          showGrid
          objectFit="contain"
          onCropChange={setPosition}
          onZoomChange={setZoom}
          onCropComplete={handleCropComplete}
          onCropAreaChange={handleCropComplete}
        />
      </div>

      <div className="shrink-0 space-y-3 border-t border-white/15 bg-slate-900 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]" dir={document.documentElement.dir || 'ltr'}>
        <label className="block space-y-1 text-xs font-bold">
          <span>{tr('التكبير والتصغير', 'Zoom')}</span>
          <input
            type="range"
            min="1"
            max="4"
            step="0.05"
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="w-full accent-teal-500"
          />
        </label>
        <p className="text-center text-[11px] text-slate-300">
          {tr('اسحب الصورة بإصبعك واستخدم القرص للتكبير.', 'Drag the image and pinch to zoom.')}
        </p>
        {error && (
          <p className="rounded-lg border border-rose-400/60 bg-rose-950/70 px-3 py-2 text-center text-xs text-rose-100">
            {error}
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onUseFullImage} disabled={isApplying} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-3 text-xs font-bold disabled:opacity-50">
            <ImageIcon className="h-4 w-4" />
            <span>{tr('استخدام الصورة كاملة', 'Use full photo')}</span>
          </button>
          <button type="button" onClick={applyCrop} disabled={isApplying} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-teal-600 px-3 text-xs font-black hover:bg-teal-700 disabled:opacity-50">
            <Check className="h-4 w-4" />
            <span>{isApplying ? tr('جاري التطبيق...', 'Applying...') : tr('تأكيد القص', 'Confirm crop')}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};
