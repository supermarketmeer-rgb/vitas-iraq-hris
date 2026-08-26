import { connectionManager } from './connectionManager';
import { offlineQueue } from './offlineQueue';
import { logger } from '../utils/logger';

export type SyncScheduleOption = '1min' | '5min' | '10min' | '15min' | '30min' | '1hr' | 'daily' | 'manual';

const SCHEDULE_KEY = 'vitas_hris_sync_schedule';
const LAST_PULL_TIMESTAMP_KEY = 'vitas_hris_last_pull_timestamp';

class SyncEngineService {
  private syncTimer: any = null;
  private isSyncing: boolean = false;
  private schedule: SyncScheduleOption = '5min';

  constructor() {
    this.schedule = (localStorage.getItem(SCHEDULE_KEY) as SyncScheduleOption) || '5min';
    this.restartScheduleTimer();
  }

  public getSchedule(): SyncScheduleOption {
    return this.schedule;
  }

  public setSchedule(newSchedule: SyncScheduleOption) {
    this.schedule = newSchedule;
    localStorage.setItem(SCHEDULE_KEY, newSchedule);
    logger.info('SYNC_ENGINE', `Sync schedule updated to ${newSchedule}`);
    this.restartScheduleTimer();
  }

  public restartScheduleTimer() {
    if (this.syncTimer) clearInterval(this.syncTimer);
    if (this.schedule === 'manual') return;

    let intervalMs = 5 * 60 * 1000;
    switch (this.schedule) {
      case '1min': intervalMs = 60 * 1000; break;
      case '5min': intervalMs = 5 * 60 * 1000; break;
      case '10min': intervalMs = 10 * 60 * 1000; break;
      case '15min': intervalMs = 15 * 60 * 1000; break;
      case '30min': intervalMs = 30 * 60 * 1000; break;
      case '1hr': intervalMs = 60 * 60 * 1000; break;
      case 'daily': intervalMs = 24 * 60 * 60 * 1000; break;
    }

    this.syncTimer = setInterval(() => {
      this.triggerSync();
    }, intervalMs);
  }

  public async triggerSync(): Promise<{ success: boolean; pushedCount: number; pulledCount: number; error?: string }> {
    if (this.isSyncing) {
      return { success: false, pushedCount: 0, pulledCount: 0, error: 'Sync already in progress' };
    }

    const connState = connectionManager.getState();
    if (connState.mode === 'OFFLINE') {
      logger.info('SYNC_ENGINE', 'Sync skipped: Device is currently OFFLINE');
      return { success: false, pushedCount: 0, pulledCount: 0, error: 'Device is offline' };
    }

    this.isSyncing = true;
    connectionManager.setMode('SYNCHRONIZING');

    let pushedCount = 0;
    let pulledCount = 0;

    try {
      const activeUrl = connState.activeBaseUrl;
      const deviceId = connState.deviceId;
      const pendingQueue = offlineQueue.getQueue();

      // 1. PUSH local offline queue changes to server
      if (pendingQueue.length > 0) {
        logger.info('SYNC_ENGINE', `Pushing ${pendingQueue.length} pending changes to ${activeUrl}...`);

        const pushRes = await fetch(`${activeUrl}/api/sync/push`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceId,
            changes: pendingQueue
          })
        });

        if (pushRes.ok) {
          const pushData = await pushRes.json();
          if (pushData.success) {
            pushedCount = pushData.processedCount || pendingQueue.length;
            // Clear successfully synced items from queue
            for (const item of pendingQueue) {
              offlineQueue.removeFromQueue(item.change_id);
            }
            logger.info('SYNC_ENGINE', `Successfully pushed ${pushedCount} changes.`);
          }
        } else {
          logger.warn('SYNC_ENGINE', `Push failed with HTTP status ${pushRes.status}`);
        }
      }

      // 2. PULL remote changes from server
      const lastPullTime = parseInt(localStorage.getItem(LAST_PULL_TIMESTAMP_KEY) || '0');
      const pullRes = await fetch(`${activeUrl}/api/sync/pull?sinceTimestamp=${lastPullTime}&deviceId=${deviceId}`);

      if (pullRes.ok) {
        const pullData = await pullRes.json();
        if (pullData.success && Array.isArray(pullData.changes)) {
          pulledCount = pullData.changes.length;
          if (pulledCount > 0) {
            logger.info('SYNC_ENGINE', `Received ${pulledCount} remote delta changes from server.`);
          }
          localStorage.setItem(LAST_PULL_TIMESTAMP_KEY, String(Date.now()));
        }
      }

      // Update sync timestamps and status
      const nowIso = new Date().toISOString();
      connectionManager.setLastSyncTime(nowIso);
      connectionManager.setPendingCount(offlineQueue.getQueueLength());
      connectionManager.setMode(connState.mode === 'SYNCHRONIZING' ? 'LOCAL_CONNECTED' : connState.mode);

      this.isSyncing = false;
      return { success: true, pushedCount, pulledCount };
    } catch (err: any) {
      this.isSyncing = false;
      connectionManager.setMode('SYNC_ERROR', err.message);
      logger.error('SYNC_ENGINE', 'Sync cycle encountered error:', err.message);
      return { success: false, pushedCount: 0, pulledCount: 0, error: err.message };
    }
  }
}

export const syncEngine = new SyncEngineService();
