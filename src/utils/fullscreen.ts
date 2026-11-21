/**
 * Utility to request Fullscreen (F11) cross-browser and in Electron desktop
 */
export const requestFullScreenF11 = () => {
  try {
    // Electron desktop support
    if (typeof window !== 'undefined' && (window as any).electronAPI?.enterFullscreen) {
      (window as any).electronAPI.enterFullscreen().catch(() => {});
    }

    // Standard DOM fullscreen API
    const doc = document as any;
    const elem = document.documentElement as any;
    const isFullscreen =
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement;

    if (!isFullscreen && elem) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(() => {});
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      } else if (elem.mozRequestFullScreen) {
        elem.mozRequestFullScreen();
      } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
      }
    }
  } catch {
    // Silently handle browser user-gesture restrictions
  }
};
