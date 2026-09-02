import { logger } from '../utils/logger';

export type ConnectionMode = 'LOCAL_CONNECTED' | 'CLOUD_CONNECTED' | 'OFFLINE' | 'SYNCHRONIZING' | 'SYNC_ERROR';

export interface ConnectionState {
  mode: ConnectionMode;
  activeBaseUrl: string;
  localServerUrl: string;
  cloudServerUrl: string;
  lastSuccessfulCheck: string | null;
  lastSyncTime: string | null;
  pendingChangesCount: number;
  unresolvedConflictsCount: number;
  serverRole: 'LOCAL_SERVER' | 'CLIENT';
  deviceId: string;
  errorMessage?: string;
}

type Listener = (state: ConnectionState) => void;

const DEVICE_ID_KEY = 'vitas_hris_device_id';
const LOCAL_SERVER_URL_KEY = 'vitas_hris_local_server_url';
const CLOUD_SERVER_URL_KEY = 'vitas_hris_cloud_server_url';

function getOrCreateDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = `DEV-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

class ConnectionManagerService {
  private state: ConnectionState;
  private listeners: Set<Listener> = new Set();
  private checkTimer: any = null;

  constructor() {
    const savedLocalUrl = localStorage.getItem(LOCAL_SERVER_URL_KEY) || 'http://localhost:5000';
    const savedCloudUrl = localStorage.getItem(CLOUD_SERVER_URL_KEY) || 'https://vitas-iraq-hris-production.up.railway.app';

    this.state = {
      mode: 'OFFLINE',
      activeBaseUrl: savedLocalUrl,
      localServerUrl: savedLocalUrl,
      cloudServerUrl: savedCloudUrl,
      lastSuccessfulCheck: null,
      lastSyncTime: localStorage.getItem('vitas_hris_last_sync_time'),
      pendingChangesCount: 0,
      unresolvedConflictsCount: 0,
      serverRole: 'CLIENT',
      deviceId: getOrCreateDeviceId()
    };

    this.startConnectionCheckLoop();
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach(fn => fn({ ...this.state }));
  }

  public getState(): ConnectionState {
    return { ...this.state };
  }

  public updateConfig(localUrl?: string, cloudUrl?: string) {
    if (localUrl) {
      this.state.localServerUrl = localUrl;
      localStorage.setItem(LOCAL_SERVER_URL_KEY, localUrl);
    }
    if (cloudUrl) {
      this.state.cloudServerUrl = cloudUrl;
      localStorage.setItem(CLOUD_SERVER_URL_KEY, cloudUrl);
    }
    this.checkConnectionNow();
  }

  public setMode(mode: ConnectionMode, errorMessage?: string) {
    this.state.mode = mode;
    if (errorMessage !== undefined) {
      this.state.errorMessage = errorMessage;
    }
    this.notify();
  }

  public setPendingCount(cnt: number) {
    this.state.pendingChangesCount = cnt;
    this.notify();
  }

  public setLastSyncTime(isoTime: string) {
    this.state.lastSyncTime = isoTime;
    localStorage.setItem('vitas_hris_last_sync_time', isoTime);
    this.notify();
  }

  public async checkConnectionNow(): Promise<ConnectionMode> {
    const isCloudDomain = typeof window !== 'undefined' && 
      (window.location.hostname.includes('railway.app') || 
       window.location.hostname.includes('.up.railway.app') || 
       (!window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')));

    if (isCloudDomain) {
      // Running directly on Cloud Railway
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const res = await fetch('/api/health', { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          this.state.mode = 'CLOUD_CONNECTED';
          this.state.activeBaseUrl = window.location.origin;
          this.state.lastSuccessfulCheck = new Date().toISOString();
          this.state.errorMessage = undefined;
          this.notify();
          logger.info('CONN_MGR', `Cloud API active at ${window.location.origin}`);
          return 'CLOUD_CONNECTED';
        }
      } catch (e) {}
    }

    // Otherwise running locally (localhost / Electron app)
    // 1. Test Local Server
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${this.state.localServerUrl}/api/health`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        this.state.mode = 'LOCAL_CONNECTED';
        this.state.activeBaseUrl = this.state.localServerUrl;
        this.state.lastSuccessfulCheck = new Date().toISOString();
        this.state.serverRole = data.role || 'LOCAL_SERVER';
        this.state.errorMessage = undefined;
        this.notify();
        logger.info('CONN_MGR', `Local server reachable at ${this.state.localServerUrl}`);
        return 'LOCAL_CONNECTED';
      }
    } catch (e) {}

    // 2. Test Cloud Server if Local fails
    try {
      if (this.state.cloudServerUrl) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(`${this.state.cloudServerUrl}/api/health`, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          this.state.mode = 'CLOUD_CONNECTED';
          this.state.activeBaseUrl = this.state.cloudServerUrl;
          this.state.lastSuccessfulCheck = new Date().toISOString();
          this.state.errorMessage = undefined;
          this.notify();
          logger.info('CONN_MGR', `Cloud API reachable at ${this.state.cloudServerUrl}`);
          return 'CLOUD_CONNECTED';
        }
      }
    } catch (e) {}

    // 3. Fallback to OFFLINE
    this.state.mode = 'OFFLINE';
    this.state.activeBaseUrl = this.state.localServerUrl;
    this.notify();
    logger.warn('CONN_MGR', 'Both Local Server and Cloud API unreachable. Fallback to OFFLINE Mode.');
    return 'OFFLINE';
  }

  private startConnectionCheckLoop() {
    this.checkConnectionNow();
    if (this.checkTimer) clearInterval(this.checkTimer);
    this.checkTimer = setInterval(() => {
      this.checkConnectionNow();
    }, 15000); // Check every 15 seconds in background
  }
}

export const connectionManager = new ConnectionManagerService();
