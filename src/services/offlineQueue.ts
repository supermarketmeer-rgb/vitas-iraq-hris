import { logger } from '../utils/logger';

export interface PendingChange {
  change_id: string;
  table_name: string;
  record_id: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: any;
  timestamp: number;
  retry_count: number;
}

const QUEUE_STORAGE_KEY = 'vitas_hris_offline_sync_queue';

class OfflineQueueService {
  private queue: PendingChange[] = [];

  constructor() {
    this.loadQueue();
  }

  private loadQueue() {
    try {
      const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (e) {
      this.queue = [];
    }
  }

  private saveQueue() {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
    } catch (e) {}
  }

  public enqueueChange(tableName: string, recordId: string, operation: 'CREATE' | 'UPDATE' | 'DELETE', payload: any): PendingChange {
    const change: PendingChange = {
      change_id: `CHG-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      table_name: tableName,
      record_id: String(recordId),
      operation,
      payload,
      timestamp: Date.now(),
      retry_count: 0
    };

    // If an UPDATE already exists for this exact record in the queue, merge payload
    const existingIndex = this.queue.findIndex(q => q.table_name === tableName && q.record_id === String(recordId) && q.operation === 'UPDATE' && operation === 'UPDATE');
    if (existingIndex >= 0) {
      this.queue[existingIndex].payload = { ...this.queue[existingIndex].payload, ...payload };
      this.queue[existingIndex].timestamp = Date.now();
      logger.info('OFFLINE_QUEUE', `Merged pending UPDATE for ${tableName}:${recordId}`);
    } else {
      this.queue.push(change);
      logger.info('OFFLINE_QUEUE', `Enqueued change for ${tableName}:${recordId} [${operation}]`);
    }

    this.saveQueue();
    return change;
  }

  public getQueue(): PendingChange[] {
    return [...this.queue];
  }

  public getQueueLength(): number {
    return this.queue.length;
  }

  public removeFromQueue(changeId: string) {
    this.queue = this.queue.filter(q => q.change_id !== changeId);
    this.saveQueue();
  }

  public incrementRetry(changeId: string) {
    const item = this.queue.find(q => q.change_id === changeId);
    if (item) {
      item.retry_count = (item.retry_count || 0) + 1;
      this.saveQueue();
    }
  }

  public clearQueue() {
    this.queue = [];
    localStorage.removeItem(QUEUE_STORAGE_KEY);
    logger.info('OFFLINE_QUEUE', 'Offline queue cleared manually');
  }
}

export const offlineQueue = new OfflineQueueService();
