import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueuedEntry, LocationType } from '@remotedays/types';
import api from './api';

const OFFLINE_QUEUE_KEY = 'offline_entry_queue';

export const offlineService = {
  /**
   * Get all queued entries from local storage
   */
  getQueue: async (): Promise<QueuedEntry[]> => {
    try {
      const data = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading offline queue:', error);
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
    } else {
      // Add new entry
      queue.push(newEntry);
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
   */
  syncQueue: async (): Promise<{ success: number; failed: number }> => {
    const queue = await offlineService.getQueue();
    const unsyncedEntries = queue.filter((entry) => !entry.synced);

    let success = 0;
    let failed = 0;

    for (const entry of unsyncedEntries) {
      try {
        await api.post('/entries', {
          date: entry.date,
          location: entry.location,
        });
        await offlineService.markAsSynced(entry.id);
        success++;
      } catch (error) {
        console.error(`Failed to sync entry ${entry.id}:`, error);
        failed++;
      }
    }

    // Clear synced entries
    if (success > 0) {
      await offlineService.clearSyncedEntries();
    }

    return { success, failed };
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
  },
};
