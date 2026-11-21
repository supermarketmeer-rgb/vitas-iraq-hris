import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Camera, LoaderCircle } from 'lucide-react';
import { tr } from '../utils/i18n';

interface OdometerCameraProps {
  onCapture: (photoDataUrl: string) => void | Promise<void>;
  onNativeFallback: () => void;
}

export const OdometerCamera: React.FC<OdometerCameraProps> = ({ onCapture, onNativeFallback }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsLive(false);
  };

  useEffect(() => stopCamera, []);

  const openCamera = async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(tr(
        'المعاينة المباشرة تحتاج متصفحاً حديثاً واتصال HTTPS آمن. استخدم كاميرا الهاتف أدناه.',
        'The live preview requires a modern browser and a secure HTTPS connection. Use the phone camera below.'
      ));
      return;
    }

    setIsStarting(true);
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      streamRef.current = stream;
      if (!videoRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setIsLive(true);
    } catch (cameraError) {
      console.warn('[DTMS Camera] Live camera could not be opened.', cameraError);
      stopCamera();
      setError(tr(
        'تعذر فتح الكاميرا داخل النظام. اسمح باستخدام الكاميرا من إعدادات المتصفح أو استخدم كاميرا الهاتف أدناه.',
        'The in-app camera could not be opened. Allow camera access in the browser settings or use the phone camera below.'
      ));
    } finally {
      setIsStarting(false);
    }
  };

  const capturePhoto = async () => {
    const video = videoRef.current;
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth || !video.videoHeight) return;

    // Match the visible 16:9 preview so the saved photo corresponds to the guide.
    const targetAspect = 16 / 9;
    const sourceAspect = video.videoWidth / video.videoHeight;
    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = video.videoWidth;
    let sourceHeight = video.videoHeight;
    if (sourceAspect > targetAspect) {
      sourceWidth = video.videoHeight * targetAspect;
      sourceX = (video.videoWidth - sourceWidth) / 2;
    } else if (sourceAspect < targetAspect) {
      sourceHeight = video.videoWidth / targetAspect;
      sourceY = (video.videoHeight - sourceHeight) / 2;
    }

    const outputWidth = Math.min(1600, Math.round(sourceWidth));
    const outputHeight = Math.round(outputWidth / targetAspect);
    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, outputWidth, outputHeight);
    const photo = canvas.toDataURL('image/jpeg', 0.9);
    stopCamera();
    await onCapture(photo);
  };

  return (
    <div className="space-y-3 rounded-2xl border-2 border-dashed border-teal-500/50 bg-teal-50/30 p-3 dark:bg-teal-950/20 sm:p-4">
      <div className="relative mx-auto aspect-video w-full max-w-md overflow-hidden rounded-xl bg-slate-950 shadow-inner">
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          className={`h-full w-full object-cover transition-opacity ${isLive ? 'opacity-100' : 'opacity-0'}`}
        />
        {!isLive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400">
            {isStarting ? <LoaderCircle className="h-10 w-10 animate-spin" /> : <Camera className="h-12 w-12" />}
            <span className="px-4 text-center text-xs font-semibold">
              {isStarting ? tr('جاري تشغيل الكاميرا...', 'Starting camera...') : tr('معاينة كاميرا العداد', 'Odometer camera preview')}
            </span>
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-[10%] inset-y-[25%] rounded-md border-2 border-teal-300 shadow-[0_0_0_999px_rgba(15,23,42,0.48)]">
          <span className="absolute -left-0.5 -top-0.5 h-5 w-5 border-l-4 border-t-4 border-white" />
          <span className="absolute -right-0.5 -top-0.5 h-5 w-5 border-r-4 border-t-4 border-white" />
          <span className="absolute -bottom-0.5 -left-0.5 h-5 w-5 border-b-4 border-l-4 border-white" />
          <span className="absolute -bottom-0.5 -right-0.5 h-5 w-5 border-b-4 border-r-4 border-white" />
        </div>
      </div>

      <p className="text-center text-xs text-gray-600 dark:text-gray-300">
        {tr('ضع أرقام العداد داخل المستطيل ثم التقط الصورة.', 'Place the odometer numbers inside the rectangle, then capture the photo.')}
      </p>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-start text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isLive ? (
        <button type="button" onClick={capturePhoto} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-black text-white shadow-md hover:bg-teal-700">
          <Camera className="h-5 w-5" />
          <span>{tr('التقاط صورة العداد', 'Capture odometer photo')}</span>
        </button>
      ) : (
        <button type="button" onClick={openCamera} disabled={isStarting} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-black text-white shadow-md hover:bg-teal-700 disabled:opacity-60">
          {isStarting ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
          <span>{tr('فتح الكاميرا داخل النظام', 'Open in-app camera')}</span>
        </button>
      )}

      {!isLive && (
        <button type="button" onClick={onNativeFallback} className="min-h-11 w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200">
          {tr('استخدام كاميرا الهاتف بدلاً من ذلك', 'Use phone camera instead')}
        </button>
      )}
    </div>
  );
};
