import {
  STORAGE_KEYS,
  DEFAULT_SETTINGS,
  DEFAULT_DOMAIN_DATA,
  DEFAULT_EXTENSION_DATA
} from '../shared/constants.js';
import { deepClone, getCurrentWeekInfo, isNewWeek, isNewDay, getTodayStart } from '../shared/utils.js';

/**
 * Storage Manager - Handles all chrome.storage.local operations
 */
class StorageManager {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize storage with default values if needed
   */
  async initialize() {
    try {
      const data = await chrome.storage.local.get(null);

      // Initialize settings if not exists
      if (!data[STORAGE_KEYS.SETTINGS]) {
        await this.setSettings(DEFAULT_SETTINGS);
      }

      // Initialize domains if not exists
      if (!data[STORAGE_KEYS.DOMAINS]) {
        await chrome.storage.local.set({ [STORAGE_KEYS.DOMAINS]: {} });
      }

      // Initialize extensions if not exists
      if (!data[STORAGE_KEYS.EXTENSIONS]) {
        await chrome.storage.local.set({ [STORAGE_KEYS.EXTENSIONS]: {} });
      }

      // Initialize current week if not exists
      if (!data[STORAGE_KEYS.CURRENT_WEEK]) {
        const settings = await this.getSettings();
        const weekInfo = getCurrentWeekInfo(settings.weekStartDay);
        await chrome.storage.local.set({ [STORAGE_KEYS.CURRENT_WEEK]: weekInfo });
      }

      // Initialize active session if not exists
      if (!data[STORAGE_KEYS.ACTIVE_SESSION]) {
        await chrome.storage.local.set({ [STORAGE_KEYS.ACTIVE_SESSION]: null });
      }

      this.initialized = true;
      console.log('Storage initialized successfully');
    } catch (error) {
      console.error('Failed to initialize storage:', error);
      throw error;
    }
  }

  // ========== Settings Methods ==========

  async getSettings() {
    const data = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    return data[STORAGE_KEYS.SETTINGS] || DEFAULT_SETTINGS;
  }

  async setSettings(settings) {
    await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings });
  }

  async updateSettings(updates) {
    const settings = await this.getSettings();
    const newSettings = { ...settings, ...updates };
    await this.setSettings(newSettings);
    return newSettings;
  }

  // ========== Domain Methods ==========

  async getAllDomains() {
    const data = await chrome.storage.local.get(STORAGE_KEYS.DOMAINS);
    return data[STORAGE_KEYS.DOMAINS] || {};
  }

  async getDomain(domain) {
    const domains = await this.getAllDomains();
    return domains[domain] || null;
  }

  async addDomain(domain, dailyLimit = null, weeklyLimit = null) {
    const domains = await this.getAllDomains();

    if (domains[domain]) {
      throw new Error('Domain already exists');
    }

    domains[domain] = {
      ...deepClone(DEFAULT_DOMAIN_DATA),
      dailyLimit: dailyLimit,
      weeklyLimit: weeklyLimit,
      lastUpdated: Date.now()
    };

    await chrome.storage.local.set({ [STORAGE_KEYS.DOMAINS]: domains });
    return domains[domain];
  }

  async updateDomain(domain, updates) {
    const domains = await this.getAllDomains();

    if (!domains[domain]) {
      // Create domain if it doesn't exist
      domains[domain] = deepClone(DEFAULT_DOMAIN_DATA);
    }

    domains[domain] = {
      ...domains[domain],
      ...updates,
      lastUpdated: Date.now()
    };

    await chrome.storage.local.set({ [STORAGE_KEYS.DOMAINS]: domains });
    return domains[domain];
  }

  async deleteDomain(domain) {
    const domains = await this.getAllDomains();
    delete domains[domain];
    await chrome.storage.local.set({ [STORAGE_KEYS.DOMAINS]: domains });

    // Also delete extension data for this domain
    const extensions = await this.getAllExtensions();
    delete extensions[domain];
    await chrome.storage.local.set({ [STORAGE_KEYS.EXTENSIONS]: extensions });
  }

  async addDomainTime(domain, milliseconds) {
    const domains = await this.getAllDomains();

    if (!domains[domain]) {
      domains[domain] = deepClone(DEFAULT_DOMAIN_DATA);
    }

    // Check for daily reset
    if (isNewDay(domains[domain].lastDayReset)) {
      domains[domain].dailyTime = 0;
      domains[domain].lastDayReset = getTodayStart();
    }

    domains[domain].totalTime += milliseconds;
    domains[domain].weeklyTime += milliseconds;
    domains[domain].dailyTime += milliseconds;
    domains[domain].lastUpdated = Date.now();

    await chrome.storage.local.set({ [STORAGE_KEYS.DOMAINS]: domains });
    return domains[domain];
  }

  async setDomainBlocked(domain, isBlocked) {
    return await this.updateDomain(domain, { isBlocked });
  }

  // ========== Extension Methods ==========

  async getAllExtensions() {
    const data = await chrome.storage.local.get(STORAGE_KEYS.EXTENSIONS);
    return data[STORAGE_KEYS.EXTENSIONS] || {};
  }

  async getDomainExtensions(domain) {
    const extensions = await this.getAllExtensions();
    return extensions[domain] || deepClone(DEFAULT_EXTENSION_DATA);
  }

  async addExtensionRequest(domain, request) {
    const extensions = await this.getAllExtensions();

    if (!extensions[domain]) {
      extensions[domain] = deepClone(DEFAULT_EXTENSION_DATA);
    }

    // Check for daily reset
    if (isNewDay(extensions[domain].lastDayReset)) {
      extensions[domain].dailyRequests = [];
      extensions[domain].lastDayReset = getTodayStart();
    }

    const requestData = {
      timestamp: Date.now(),
      duration: request.duration,
      reason: request.reason
    };

    // Add to both weekly and daily requests
    extensions[domain].weeklyRequests.push(requestData);
    extensions[domain].dailyRequests.push(requestData);

    // Set as current extension
    extensions[domain].currentExtension = {
      startTime: Date.now(),
      endTime: Date.now() + request.duration,
      duration: request.duration,
      reason: request.reason
    };

    await chrome.storage.local.set({ [STORAGE_KEYS.EXTENSIONS]: extensions });
    return extensions[domain].currentExtension;
  }

  async clearCurrentExtension(domain) {
    const extensions = await this.getAllExtensions();

    if (extensions[domain]) {
      extensions[domain].currentExtension = null;
      await chrome.storage.local.set({ [STORAGE_KEYS.EXTENSIONS]: extensions });
    }
  }

  async getActiveExtension(domain) {
    const extensions = await this.getDomainExtensions(domain);
    const ext = extensions.currentExtension;

    if (ext && ext.endTime > Date.now()) {
      return ext;
    }

    return null;
  }

  async getWeeklyExtensionCount(domain) {
    const extensions = await this.getDomainExtensions(domain);
    return extensions.weeklyRequests.length;
  }

  async getDailyExtensionCount(domain) {
    const extensions = await this.getDomainExtensions(domain);

    // Check for daily reset
    if (isNewDay(extensions.lastDayReset)) {
      return 0;
    }

    return extensions.dailyRequests.length;
  }

  // ========== Week Management ==========

  async getCurrentWeek() {
    const data = await chrome.storage.local.get(STORAGE_KEYS.CURRENT_WEEK);
    return data[STORAGE_KEYS.CURRENT_WEEK] || null;
  }

  async setCurrentWeek(weekInfo) {
    await chrome.storage.local.set({ [STORAGE_KEYS.CURRENT_WEEK]: weekInfo });
  }

  async checkAndResetWeek() {
    const settings = await this.getSettings();
    const storedWeek = await this.getCurrentWeek();
    const currentWeek = getCurrentWeekInfo(settings.weekStartDay);

    if (isNewWeek(currentWeek, storedWeek)) {
      await this.performWeeklyReset(currentWeek);
      return true;
    }

    return false;
  }

  async performWeeklyReset(newWeek) {
    console.log('Performing weekly reset...');

    // Reset all domains
    const domains = await this.getAllDomains();
    const todayStart = getTodayStart();
    for (const domain in domains) {
      domains[domain].weeklyTime = 0;
      domains[domain].dailyTime = 0;
      domains[domain].lastDayReset = todayStart;
      domains[domain].isBlocked = false;
    }
    await chrome.storage.local.set({ [STORAGE_KEYS.DOMAINS]: domains });

    // Clear all extensions
    await chrome.storage.local.set({ [STORAGE_KEYS.EXTENSIONS]: {} });

    // Update current week
    await this.setCurrentWeek(newWeek);

    console.log('Weekly reset completed');
  }

  // ========== Active Session Methods ==========

  async getActiveSession() {
    const data = await chrome.storage.local.get(STORAGE_KEYS.ACTIVE_SESSION);
    return data[STORAGE_KEYS.ACTIVE_SESSION] || null;
  }

  async setActiveSession(session) {
    await chrome.storage.local.set({ [STORAGE_KEYS.ACTIVE_SESSION]: session });
  }

  async clearActiveSession() {
    await chrome.storage.local.set({ [STORAGE_KEYS.ACTIVE_SESSION]: null });
  }

  // ========== Data Export/Import ==========

  async exportData() {
    const data = await chrome.storage.local.get(null);
    return data;
  }

  async importData(data) {
    // Validate data structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data format');
    }

    await chrome.storage.local.set(data);
  }

  async resetAllData() {
    await chrome.storage.local.clear();
    await this.initialize();
  }
}

// Create singleton instance
const storageManager = new StorageManager();

export default storageManager;
