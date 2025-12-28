import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueuedEntry, LocationType } from '@remotedays/types';
import api from './api';
import { logger } from './logger';
import { ApiError } from './errors';

const TAG = 'OfflineService';
const OFFLINE_QUEUE_KEY = 'offline_entry_queue';

// Mutex to prevent concurrent syncs
let isSyncing = false;

export const offlineService = {
  /**
   * Get all queued entries from local storage
   */
  getQueue: async (): Promise<QueuedEntry[]> => {
    try {
      const data = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      logger.error(TAG, 'Error reading offline queue:', error);
      return [];
    }
  },

  /**
   * Add an entry to the offline queue
   */
  addToQueue: async (date: string, location: LocationType): Promise<QueuedEntry> => {
    const queue = await offlineService.getQueue();

    // Check if entry for this date already exists
    const existingIndex = queue.findIndex((e) => e.date === date);

    const newEntry: QueuedEntry = {
      id: `offline_${Date.now()}`,
      date,
      location,
      createdAt: new Date().toISOString(),
      synced: false,
    };

    if (existingIndex >= 0) {
      // Update existing entry
      queue[existingIndex] = newEntry;
      logger.debug(TAG, 'Updated existing queue entry:', { date, location });
    } else {
      // Add new entry
      queue.push(newEntry);
      logger.debug(TAG, 'Added new queue entry:', { date, location });
    }

    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    return newEntry;
  },

  /**
   * Mark an entry as synced
   */
  markAsSynced: async (id: string): Promise<void> => {
    const queue = await offlineService.getQueue();
    const updatedQueue = queue.map((entry) =>
      entry.id === id ? { ...entry, synced: true } : entry
    );
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(updatedQueue));
  },

  /**
   * Remove synced entries from the queue
   */
  clearSyncedEntries: async (): Promise<void> => {
    const queue = await offlineService.getQueue();
    const unsyncedEntries = queue.filter((entry) => !entry.synced);
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(unsyncedEntries));
  },

  /**
   * Sync all pending entries with the server
   * Uses mutex to prevent concurrent sync operations
   */
  syncQueue: async (): Promise<{ success: number; failed: number }> => {
    // Prevent concurrent syncs
    if (isSyncing) {
      logger.warn(TAG, 'Sync already in progress, skipping');
      return { success: 0, failed: 0 };
    }

    isSyncing = true;
    logger.info(TAG, 'Starting queue sync');

    try {
      const queue = await offlineService.getQueue();
      const unsyncedEntries = queue.filter((entry) => !entry.synced);

      if (unsyncedEntries.length === 0) {
        logger.debug(TAG, 'No entries to sync');
        return { success: 0, failed: 0 };
      }

      logger.info(TAG, `Syncing ${unsyncedEntries.length} entries`);

      let success = 0;
      let failed = 0;

      for (const entry of unsyncedEntries) {
        try {
          // Use correct field name 'status' instead of 'location'
          await api.post('/entries', {
            date: entry.date,
            status: entry.location,
          });
          await offlineService.markAsSynced(entry.id);
          success++;
          logger.debug(TAG, `Synced entry ${entry.id}:`, { date: entry.date, status: entry.location });
        } catch (error) {
          // Check if it's a 409 conflict (entry already exists)
          if (ApiError.isApiError(error) && error.status === 409) {
            // Mark as synced since entry exists on server
            await offlineService.markAsSynced(entry.id);
            success++;
            logger.debug(TAG, `Entry ${entry.id} already exists on server, marking as synced`);
          } else {
            logger.error(TAG, `Failed to sync entry ${entry.id}:`, error);
            failed++;
          }
        }
      }

      // Clear synced entries
      if (success > 0) {
        await offlineService.clearSyncedEntries();
      }

      logger.info(TAG, `Sync complete: ${success} succeeded, ${failed} failed`);
      return { success, failed };
    } finally {
      isSyncing = false;
    }
  },

  /**
   * Get count of pending entries
   */
  getPendingCount: async (): Promise<number> => {
    const queue = await offlineService.getQueue();
    return queue.filter((entry) => !entry.synced).length;
  },

  /**
   * Clear all offline data
   */
  clearAll: async (): Promise<void> => {
    await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
    logger.info(TAG, 'Cleared all offline data');
  },

  /**
   * Check if sync is currently in progress
   */
  isSyncInProgress: (): boolean => {
    return isSyncing;
  },
};
