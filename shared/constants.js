// Storage keys
export const STORAGE_KEYS = {
  DOMAINS: 'domains',
  EXTENSIONS: 'extensions',
  SETTINGS: 'settings',
  CURRENT_WEEK: 'currentWeek',
  ACTIVE_SESSION: 'activeSession',
  EXCLUDED_DOMAINS: 'excludedDomains'
};

// Default settings
export const DEFAULT_SETTINGS = {
  maxWeeklyExtensions: 3,
  maxDailyExtensions: 3,
  defaultExtensionDuration: 30 * 60 * 1000, // 30 minutes in ms
  weekStartDay: 1, // Monday (0 = Sunday, 1 = Monday, etc.)
  idleThreshold: 60 * 1000, // 60 seconds in ms
  trackingEnabled: true,
  notificationsEnabled: true
};

// Default domain data structure
export const DEFAULT_DOMAIN_DATA = {
  totalTime: 0,
  weeklyTime: 0,
  dailyTime: 0,
  lastUpdated: 0,
  lastDayReset: 0,
  weeklyLimit: null,
  dailyLimit: null,
  isBlocked: false
};

// Default extension data structure
export const DEFAULT_EXTENSION_DATA = {
  weeklyRequests: [],
  dailyRequests: [],
  currentExtension: null,
  lastDayReset: 0
};

// Time constants
export const TIME_CONSTANTS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  SAVE_INTERVAL: 10 * 1000 // Save every 10 seconds
};

// Extension duration options (in milliseconds)
export const EXTENSION_DURATION_OPTIONS = {
  '15 minutes': 15 * 60 * 1000,
  '30 minutes': 30 * 60 * 1000,
  '1 hour': 60 * 60 * 1000,
  '2 hours': 2 * 60 * 60 * 1000
};

// Message types for communication
export const MESSAGE_TYPES = {
  REQUEST_EXTENSION: 'requestExtension',
  CHECK_BLOCK_STATUS: 'checkBlockStatus',
  GET_DOMAIN_INFO: 'getDomainInfo',
  UPDATE_TIME: 'updateTime',
  GET_ALL_DOMAINS: 'getAllDomains',
  ADD_DOMAIN: 'addDomain',
  UPDATE_DOMAIN: 'updateDomain',
  DELETE_DOMAIN: 'deleteDomain',
  GET_SETTINGS: 'getSettings',
  UPDATE_SETTINGS: 'updateSettings',
  EXPORT_DATA: 'exportData',
  IMPORT_DATA: 'importData',
  RESET_DATA: 'resetData',
  MANUAL_WEEKLY_RESET: 'manualWeeklyReset',
  GET_EXCLUDED_DOMAINS: 'getExcludedDomains',
  ADD_EXCLUDED_DOMAIN: 'addExcludedDomain',
  REMOVE_EXCLUDED_DOMAIN: 'removeExcludedDomain'
};

// Notification IDs
export const NOTIFICATION_IDS = {
  LIMIT_WARNING: 'limitWarning',
  LIMIT_EXCEEDED: 'limitExceeded',
  EXTENSION_GRANTED: 'extensionGranted',
  EXTENSION_DENIED: 'extensionDenied',
  WEEKLY_RESET: 'weeklyReset'
};
