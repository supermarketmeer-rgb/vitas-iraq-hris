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

/**
 * Utility to exit application (close window in Electron) or exit FullScreen in browser
 */
export const exitAppOrFullscreen = () => {
  try {
    // 1. Electron Desktop - Close window / Exit application
    if (typeof window !== 'undefined' && (window as any).electronAPI?.closeApp) {
      (window as any).electronAPI.closeApp().catch(() => {});
      return;
    }

    // 2. In browser: Exit Fullscreen if active
    const doc = document as any;
    const isFullscreen =
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement;

    if (isFullscreen) {
      if (doc.exitFullscreen) {
        doc.exitFullscreen().catch(() => {});
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen();
      }
    }

    // Attempt closing window/tab if permitted
    try {
      window.close();
    } catch {}
  } catch (err) {
    console.error('Failed to exit application:', err);
  }
};
