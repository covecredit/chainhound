import { useState, useEffect } from 'react';

// Storage keys
const STORAGE_KEYS = {
  ALERTS: 'chainhound-alerts',
  NOTIFICATIONS: 'chainhound-notifications',
  LABELS: 'chainhound-labels',
  SETTINGS: 'chainhound-settings',
  EMAIL: 'chainhound-email'
};

export function useStorage() {
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize storage if needed
  useEffect(() => {
    const initializeStorage = () => {
      Object.values(STORAGE_KEYS).forEach(key => {
        if (localStorage.getItem(key) === null) {
          localStorage.setItem(key, JSON.stringify({}));
        }
      });
      
      // Reset donation banner closed state when data is cleared
      if (localStorage.getItem('donation-banner-closed') === null) {
        localStorage.setItem('donation-banner-closed', 'false');
      }
      
      setIsInitialized(true);
    };

    initializeStorage();
  }, []);

  // Generic get function
  const getFromStorage = <T>(key: string, defaultValue: T): T => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error getting ${key} from storage:`, error);
      return defaultValue;
    }
  };

  // Generic set function
  const setInStorage = <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting ${key} in storage:`, error);
    }
  };

  // Clear all stored data
  const clearAllStoredData = (): void => {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      
      // Reset donation banner when data is cleared
      localStorage.setItem('donation-banner-closed', 'false');
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  };

  // Get email address
  const getEmailAddress = (): string => {
    return getFromStorage<string>(STORAGE_KEYS.EMAIL, '');
  };

  // Set email address
  const setEmailAddress = (email: string): void => {
    setInStorage(STORAGE_KEYS.EMAIL, email);
  };

  // Export all storage data
  const exportStorageData = (): string => {
    try {
      const exportData: Record<string, any> = {};
      
      Object.values(STORAGE_KEYS).forEach(key => {
        const data = localStorage.getItem(key);
        if (data) {
          exportData[key] = JSON.parse(data);
        }
      });
      
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Error exporting storage data:', error);
      return '';
    }
  };

  // Import storage data
  const importStorageData = (data: string): boolean => {
    try {
      const importData = JSON.parse(data);
      
      // Validate data structure
      if (typeof importData !== 'object') {
        throw new Error('Invalid data format');
      }
      
      // Import each key
      Object.entries(importData).forEach(([key, value]) => {
        if (Object.values(STORAGE_KEYS).includes(key)) {
          localStorage.setItem(key, JSON.stringify(value));
        }
      });
      
      // Reset donation banner when data is imported
      localStorage.setItem('donation-banner-closed', 'false');
      
      return true;
    } catch (error) {
      console.error('Error importing storage data:', error);
      return false;
    }
  };

  return {
    isInitialized,
    getFromStorage,
    setInStorage,
    clearAllStoredData,
    getEmailAddress,
    setEmailAddress,
    exportStorageData,
    importStorageData,
    STORAGE_KEYS
  };
}