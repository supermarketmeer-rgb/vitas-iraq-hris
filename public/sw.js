/**
 * VITAS IRAQ HRMS – Service Worker (PWA)
 * Cloud-based: NO sensitive employee data is cached. Only app shell & static assets.
 */

const APP_VERSION = '__VITAS_SW_VERSION__';
const CACHE_NAME = `vitas-hrms-shell-v${APP_VERSION}`;
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Routes that must NEVER be cached (sensitive cloud data)
const NO_CACHE_PATTERNS = [
  /\/api\//,
  /\/hr_drivers\//,
  /\/uploads\//,
  /\/auth\//,
  /login/,
  /payroll/,
  /salary/,
  /employee/,
  /leaves/,
  /attendance/,
  /recruit/,
  /performance/,
  /financial/
];

function shouldSkipCache(url) {
  return NO_CACHE_PATTERNS.some(p => p.test(url));
}

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = request.url;

  // Always bypass cache for non-GET and sensitive/API routes
  if (request.method !== 'GET' || shouldSkipCache(url)) {
    return; // Let browser handle normally (network only)
  }

  // For navigation requests (HTML pages): Network-first, fallback to shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() =>
          caches.match('/').then(cached => {
            if (cached) return cached;
            // Offline fallback page
            return new Response(
              getOfflinePage(),
              { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
            );
          })
        )
    );
    return;
  }

  // For static assets: Cache-first (icons, fonts already bundled by vite)
  if (
    url.includes('/icons/') ||
    url.includes('/manifest.json')
  ) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // For everything else (vite bundle JS/CSS): Network-first
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// ─── Update Detection ─────────────────────────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CHECK_VERSION') {
    event.ports[0]?.postMessage({ version: APP_VERSION });
  }
});

// ─── Offline Fallback Page ────────────────────────────────────────────────────
function getOfflinePage() {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VITAS IRAQ HRMS – غير متصل</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Cairo', 'Segoe UI', system-ui, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
    }
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 24px;
      padding: 48px 40px;
      max-width: 440px;
      width: 100%;
      text-align: center;
      box-shadow: 0 25px 50px rgba(0,0,0,0.5);
    }
    .icon {
      width: 72px; height: 72px;
      background: rgba(239,68,68,0.15);
      border: 2px solid rgba(239,68,68,0.4);
      border-radius: 20px;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 24px;
      font-size: 32px;
    }
    h1 { font-size: 20px; font-weight: 700; margin-bottom: 8px; color: #f1f5f9; }
    p { font-size: 14px; color: #94a3b8; line-height: 1.6; margin-bottom: 24px; }
    .badge {
      display: inline-block;
      background: rgba(13,122,110,0.2);
      border: 1px solid rgba(13,122,110,0.4);
      color: #2dd4bf;
      padding: 4px 14px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 20px;
    }
    button {
      background: #0d7a6e;
      color: white;
      border: none;
      padding: 12px 28px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      font-family: inherit;
      transition: background 0.2s;
    }
    button:hover { background: #0f8f82; }
    .security-note {
      margin-top: 20px;
      font-size: 11px;
      color: #475569;
      border-top: 1px solid #334155;
      padding-top: 16px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">📡</div>
    <div class="badge">Cloud-Based System</div>
    <h1>لا يوجد اتصال بالإنترنت</h1>
    <p>
      VITAS IRAQ HRMS نظام سحابي مؤسسي ويتطلب اتصالاً بالإنترنت للوصول إلى
      بيانات الموظفين وقاعدة البيانات المركزية.
      يرجى التحقق من اتصالك بالإنترنت والمحاولة مجدداً.
    </p>
    <button onclick="location.reload()">إعادة المحاولة</button>
    <div class="security-note">
      🔒 لا يتم تخزين بيانات الموظفين أو المرتبات محلياً لضمان الأمان والخصوصية.
    </div>
  </div>
</body>
</html>`;
}
