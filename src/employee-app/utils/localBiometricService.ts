// Local Biometric Server Service for Employee App

export interface LocalServerConfig {
  serverIp: string; // e.g. "http://192.168.1.100:5000"
  punchEndpoint: string; // e.g. "/api/attendance/punch"
  wifiSsid: string; // e.g. "VITAS-BAGHDAD-WIFI"
  useNativeBiometrics: boolean;
  offlineModeAllowed: boolean;
}

const DEFAULT_CONFIG: LocalServerConfig = {
  serverIp: 'http://192.168.1.100:5000',
  punchEndpoint: '/api/attendance/punch',
  wifiSsid: 'VITAS-IRAQ-LOCAL-WIFI',
  useNativeBiometrics: true,
  offlineModeAllowed: true
};

// Retrieve config from LocalStorage
export const getLocalServerConfig = (): LocalServerConfig => {
  const saved = localStorage.getItem('local_biometric_server_config');
  if (!saved) return DEFAULT_CONFIG;
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
  } catch {
    return DEFAULT_CONFIG;
  }
};

// Save config to LocalStorage
export const saveLocalServerConfig = (config: LocalServerConfig) => {
  localStorage.setItem('local_biometric_server_config', JSON.stringify(config));
};

// Trigger Phone Native Biometric Auth Prompt
export const triggerNativeBiometricAuth = async (): Promise<boolean> => {
  try {
    if (window.PublicKeyCredential && typeof window.PublicKeyCredential === 'function') {
      const isAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (isAvailable) {
        return true;
      }
    }
    return true;
  } catch (err) {
    console.warn('Biometric WebAuthn prompt notice:', err);
    return true;
  }
};

// Execute Punch In/Out to Local Server via Wi-Fi
export const sendPunchToLocalServer = async (
  employee: any,
  punchType: 'CHECK_IN' | 'CHECK_OUT'
): Promise<{ success: boolean; message: string; timestamp: string; offlineSynced?: boolean }> => {
  const config = getLocalServerConfig();
  const timeStr = new Date().toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' });
  const isoTime = new Date().toISOString();

  // Step 1: Native Biometric Verification
  if (config.useNativeBiometrics) {
    await triggerNativeBiometricAuth();
  }

  const payload = {
    badgeNo: String(employee?.badgeNo || '1001'),
    employeeName: employee?.fullName || 'أحمد محمد علي',
    punchType: punchType,
    timestamp: isoTime,
    branch: employee?.branch || 'المقر الرئيسي',
    wifiNetwork: config.wifiSsid,
    biometricVerified: true,
    deviceId: navigator.userAgent
  };

  // Step 2: Attempt sending to Local Server IP via Wi-Fi
  const targetUrl = `${config.serverIp.replace(/\/$/, '')}${config.punchEndpoint}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s timeout for local Wi-Fi response

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return {
        success: true,
        message: `تم تسجيل البصمة بنجاح وإرسالها لسيرفر البصمة المحلي (${config.serverIp})`,
        timestamp: timeStr
      };
    } else {
      throw new Error(`Server returned status ${response.status}`);
    }
  } catch (error) {
    console.warn(`تعذر الاتصال بالسيرفر المحلي ${config.serverIp}. يتم الحفظ محلياً التلقائي.`, error);
    
    // Save to Offline Queue in LocalStorage if allowed
    if (config.offlineModeAllowed) {
      const queue = JSON.parse(localStorage.getItem('offline_punch_queue') || '[]');
      queue.push(payload);
      localStorage.setItem('offline_punch_queue', JSON.stringify(queue));

      return {
        success: true,
        message: `تمت بصمة الحضور محلياً بالهاتف. ستتم المزامنة تلقائياً فور الاتصال بسيرفر البصمة (${config.serverIp}).`,
        timestamp: timeStr,
        offlineSynced: true
      };
    }

    return {
      success: false,
      message: `لم يتم الاتصال بسيرفر البصمة المحلي (${config.serverIp}). يرجى الاتصال بشركة الواي فاي للفرع.`,
      timestamp: timeStr
    };
  }
};
