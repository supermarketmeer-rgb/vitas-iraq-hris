/**
 * Utility to maximize the desktop window (Electron or supported desktop shell)
 * without entering restrictive F11 FullScreen mode.
 */
export const maximizeAppWindow = () => {
  try {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.maximizeApp) {
      (window as any).electronAPI.maximizeApp().catch(() => {});
    }
  } catch {}
};

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
    // 1. In Electron Desktop: invoke closeApp
    if (typeof window !== 'undefined' && (window as any).electronAPI?.closeApp) {
      (window as any).electronAPI.closeApp().catch(() => {});
    }

    // 2. In browser: Exit FullScreen unconditionally
    const doc = document as any;
    try {
      if (
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      ) {
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
    } catch {}

    // 3. Attempt multiple techniques to close the window
    try {
      window.close();
    } catch {}

    try {
      window.open('', '_self', '');
      window.close();
    } catch {}

    // 4. For browsers (like Chrome) that block window.close() on user-opened tabs:
    // Inform the user and offer a clean close option
    setTimeout(() => {
      // Check if window is still open (which means browser blocked window.close)
      const existingToast = document.getElementById('vitas-close-app-toast');
      if (existingToast) return;

      const toast = document.createElement('div');
      toast.id = 'vitas-close-app-toast';
      toast.style.position = 'fixed';
      toast.style.top = '24px';
      toast.style.left = '50%';
      toast.style.transform = 'translateX(-50%)';
      toast.style.zIndex = '999999';
      toast.style.backgroundColor = '#1e293b';
      toast.style.color = '#ffffff';
      toast.style.padding = '12px 20px';
      toast.style.borderRadius = '14px';
      toast.style.boxShadow = '0 20px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)';
      toast.style.display = 'flex';
      toast.style.alignItems = 'center';
      toast.style.gap = '12px';
      toast.style.fontFamily = 'system-ui, -apple-system, sans-serif';
      toast.style.fontSize = '13px';
      toast.style.direction = 'rtl';

      toast.innerHTML = `
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#ef4444;flex-shrink:0;"></span>
        <span>تم إنهاء وضع ملء الشاشة. لإغلاق علامة تبويب المتصفح اضغط <b>Ctrl + W</b> أو أغلق التبويب من المتصفح.</span>
        <button id="vitas-close-toast-btn" style="background:#ef4444;color:#fff;border:none;padding:4px 10px;border-radius:8px;cursor:pointer;font-weight:bold;font-size:11px;">إغلاق التبويب</button>
        <button id="vitas-dismiss-toast-btn" style="background:transparent;color:#94a3b8;border:none;cursor:pointer;font-size:16px;padding:0 4px;">✕</button>
      `;

      document.body.appendChild(toast);

      const closeBtn = document.getElementById('vitas-close-toast-btn');
      if (closeBtn) {
        closeBtn.onclick = () => {
          try {
            window.location.href = 'about:blank';
            window.close();
          } catch {}
        };
      }

      const dismissBtn = document.getElementById('vitas-dismiss-toast-btn');
      if (dismissBtn) {
        dismissBtn.onclick = () => {
          toast.remove();
        };
      }

      setTimeout(() => {
        try { toast.remove(); } catch {}
      }, 7000);
    }, 250);
  } catch (err) {
    console.error('Failed to exit application:', err);
  }
};
