// Application configuration
export const APP_VERSION = '1.0.1';

// Version management configuration
export const VERSION_CONFIG = {
  // Keys in localStorage that should be cleared on version mismatch
  CLEAR_ON_VERSION_CHANGE: [
    'theme',
    'user_preferences',
    'cached_data',
    'form_drafts',
    'search_history'
  ],
  
  // Whether to force a full page reload on major version changes
  FORCE_RELOAD_ON_MAJOR_VERSION: true,
  
  // Storage key for tracking the last known app version
  VERSION_STORAGE_KEY: 'last_app_version'
};

// Helper function to determine if this is a major version change
export const isMajorVersionChange = (oldVersion: string | null, newVersion: string): boolean => {
  if (!oldVersion) return false;
  
  const oldMajor = oldVersion.split('.')[0];
  const newMajor = newVersion.split('.')[0];
  
  return oldMajor !== newMajor;
};

// Helper function to clear specific localStorage items
export const clearOutdatedClientData = (keys: string[] = VERSION_CONFIG.CLEAR_ON_VERSION_CHANGE): void => {
  keys.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove localStorage key: ${key}`, error);
    }
  });
};