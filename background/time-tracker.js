import { TIME_CONSTANTS } from '../shared/constants.js';
import { extractDomain } from '../shared/utils.js';
import storageManager from './storage-manager.js';
import limitEnforcer from './limit-enforcer.js';

/**
 * Time Tracker - Handles active time tracking for websites
 */
class TimeTracker {
  constructor() {
    this.activeSession = null;
    this.saveInterval = null;
    this.keepAliveInterval = null;
    this.settings = null;
  }

  /**
   * Initialize the time tracker
   */
  async initialize() {
    console.log('Initializing TimeTracker...');

    // Load settings
    this.settings = await storageManager.getSettings();

    // Restore active session if exists
    const savedSession = await storageManager.getActiveSession();
    if (savedSession) {
      // Clear old session on startup (don't restore time from before browser was closed)
      await storageManager.clearActiveSession();
    }

    // Set up event listeners
    this.setupEventListeners();

    // Start tracking current active tab
    await this.startTrackingCurrentTab();

    // Set up idle detection
    chrome.idle.setDetectionInterval(Math.floor(this.settings.idleThreshold / 1000));

    console.log('TimeTracker initialized');
  }

  /**
   * Set up Chrome event listeners
   */
  setupEventListeners() {
    // Tab activation (user switches tabs)
    chrome.tabs.onActivated.addListener(async (activeInfo) => {
      await this.handleTabActivated(activeInfo.tabId);
    });

    // Tab update (URL changes, page loads)
    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.active) {
        await this.handleTabUpdated(tabId, tab);
      }
    });

    // Window focus changes
    chrome.windows.onFocusChanged.addListener(async (windowId) => {
      await this.handleWindowFocusChanged(windowId);
    });

    // Tab removed (closed)
    chrome.tabs.onRemoved.addListener(async (tabId) => {
      if (this.activeSession && this.activeSession.tabId === tabId) {
        await this.stopTracking();
      }
    });

    // Idle state changes
    chrome.idle.onStateChanged.addListener(async (newState) => {
      await this.handleIdleStateChanged(newState);
    });
  }

  /**
   * Start tracking the current active tab
   */
  async startTrackingCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (tab && tab.url) {
        const domain = extractDomain(tab.url);
        if (domain) {
          await this.startTracking(tab.id, domain);
        }
      }
    } catch (error) {
      console.error('Error starting tracking for current tab:', error);
    }
  }

  /**
   * Handle tab activation
   */
  async handleTabActivated(tabId) {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab.url) {
        const domain = extractDomain(tab.url);
        if (domain) {
          await this.startTracking(tabId, domain);
        } else {
          await this.stopTracking();
        }
      }
    } catch (error) {
      console.error('Error handling tab activation:', error);
    }
  }

  /**
   * Handle tab update (URL change)
   */
  async handleTabUpdated(tabId, tab) {
    try {
      // Only track if this is the active tab
      if (!tab.active) return;

      const domain = extractDomain(tab.url);
      if (domain) {
        // Check if domain changed
        if (!this.activeSession || this.activeSession.domain !== domain) {
          await this.startTracking(tabId, domain);
        }
      } else {
        await this.stopTracking();
      }
    } catch (error) {
      console.error('Error handling tab update:', error);
    }
  }

  /**
   * Handle window focus change
   */
  async handleWindowFocusChanged(windowId) {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
      // Browser lost focus
      await this.stopTracking();
    } else {
      // Browser gained focus, start tracking current tab
      await this.startTrackingCurrentTab();
    }
  }

  /**
   * Handle idle state change
   */
  async handleIdleStateChanged(newState) {
    console.log('Idle state changed:', newState);

    if (newState === 'idle' || newState === 'locked') {
      await this.stopTracking();
    } else if (newState === 'active') {
      await this.startTrackingCurrentTab();
    }
  }

  /**
   * Start tracking a domain
   */
  async startTracking(tabId, domain) {
    // Stop current session if exists
    if (this.activeSession) {
      await this.stopTracking();
    }

    // Check if tracking is enabled
    const settings = await storageManager.getSettings();
    if (!settings.trackingEnabled) {
      return;
    }

    // Check if domain is excluded from tracking
    const isExcluded = await storageManager.isExcluded(domain);
    if (isExcluded) {
      console.log('Domain is excluded from tracking:', domain);
      return;
    }

    console.log('Starting tracking for:', domain);

    // Create new session
    this.activeSession = {
      domain: domain,
      tabId: tabId,
      startTime: Date.now(),
      accumulatedTime: 0
    };

    // Save to storage
    await storageManager.setActiveSession(this.activeSession);

    // Update badge for this domain
    await this.updateBadge(domain);

    // Start periodic save
    this.startPeriodicSave();

    // Start keep-alive to prevent service worker termination
    this.startKeepAlive();
  }

  /**
   * Stop tracking current session
   */
  async stopTracking() {
    if (!this.activeSession) return;

    console.log('Stopping tracking for:', this.activeSession.domain);

    // Calculate elapsed time
    const elapsed = Date.now() - this.activeSession.startTime + this.activeSession.accumulatedTime;

    // Save time to storage
    if (elapsed > 0) {
      await this.saveTime(this.activeSession.domain, elapsed);
    }

    // Clear badge
    await this.clearBadge();

    // Clear session
    this.activeSession = null;
    await storageManager.clearActiveSession();

    // Stop periodic save
    this.stopPeriodicSave();

    // Stop keep-alive
    this.stopKeepAlive();
  }

  /**
   * Start periodic save interval
   */
  startPeriodicSave() {
    this.stopPeriodicSave(); // Clear existing interval

    this.saveInterval = setInterval(async () => {
      if (this.activeSession) {
        const elapsed = Date.now() - this.activeSession.startTime + this.activeSession.accumulatedTime;

        // Save to storage
        await this.saveTime(this.activeSession.domain, elapsed);

        // Reset start time and accumulator
        this.activeSession.startTime = Date.now();
        this.activeSession.accumulatedTime = 0;
        await storageManager.setActiveSession(this.activeSession);
      }
    }, TIME_CONSTANTS.SAVE_INTERVAL);
  }

  /**
   * Stop periodic save interval
   */
  stopPeriodicSave() {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
      this.saveInterval = null;
    }
  }

  /**
   * Start keep-alive interval to prevent service worker termination
   */
  startKeepAlive() {
    this.stopKeepAlive(); // Clear existing interval

    this.keepAliveInterval = setInterval(() => {
      // Simple call to keep service worker alive
      chrome.runtime.getPlatformInfo(() => {});
    }, 20000); // Every 20 seconds
  }

  /**
   * Stop keep-alive interval
   */
  stopKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  /**
   * Save time for a domain
   */
  async saveTime(domain, milliseconds) {
    try {
      // Check for weekly reset before saving
      await storageManager.checkAndResetWeek();

      // Add time to domain
      const domainData = await storageManager.addDomainTime(domain, milliseconds);

      console.log(`Saved ${Math.round(milliseconds / 1000)}s for ${domain}. Total this week: ${Math.round(domainData.weeklyTime / 1000)}s`);

      // Update badge if this is the active domain
      if (this.activeSession && this.activeSession.domain === domain) {
        await this.updateBadge(domain);
      }

      // Check and enforce limits
      await limitEnforcer.checkAndEnforce(domain);

      // Return updated domain data for limit checking
      return domainData;
    } catch (error) {
      console.error('Error saving time:', error);
      throw error;
    }
  }

  /**
   * Get current session info
   */
  getCurrentSession() {
    if (!this.activeSession) return null;

    const elapsed = Date.now() - this.activeSession.startTime + this.activeSession.accumulatedTime;

    return {
      ...this.activeSession,
      elapsedTime: elapsed
    };
  }

  /**
   * Manually pause tracking (for testing or user control)
   */
  async pauseTracking() {
    if (this.activeSession) {
      // Save accumulated time
      this.activeSession.accumulatedTime += Date.now() - this.activeSession.startTime;
      this.activeSession.startTime = Date.now();

      await storageManager.setActiveSession(this.activeSession);
      this.stopPeriodicSave();
    }
  }

  /**
   * Manually resume tracking
   */
  async resumeTracking() {
    if (this.activeSession) {
      this.activeSession.startTime = Date.now();
      await storageManager.setActiveSession(this.activeSession);
      this.startPeriodicSave();
    }
  }

  /**
   * Update badge to show current domain time
   */
  async updateBadge(domain) {
    try {
      const domainData = await storageManager.getDomain(domain);

      if (domainData) {
        const hours = Math.floor(domainData.weeklyTime / (60 * 60 * 1000));
        const minutes = Math.floor((domainData.weeklyTime % (60 * 60 * 1000)) / (60 * 1000));

        let badgeText = '';
        if (hours > 0) {
          badgeText = `${hours}h`;
        } else if (minutes > 0) {
          badgeText = `${minutes}m`;
        } else {
          badgeText = '<1m';
        }

        // Set badge text
        await chrome.action.setBadgeText({ text: badgeText });

        // Set badge color based on limit usage
        if (domainData.weeklyLimit) {
          const percentage = (domainData.weeklyTime / domainData.weeklyLimit) * 100;
          if (percentage >= 100) {
            await chrome.action.setBadgeBackgroundColor({ color: '#e74c3c' }); // Red
          } else if (percentage >= 90) {
            await chrome.action.setBadgeBackgroundColor({ color: '#f39c12' }); // Orange
          } else {
            await chrome.action.setBadgeBackgroundColor({ color: '#667eea' }); // Purple
          }
        } else {
          await chrome.action.setBadgeBackgroundColor({ color: '#667eea' }); // Purple
        }
      } else {
        await this.clearBadge();
      }
    } catch (error) {
      console.error('Error updating badge:', error);
    }
  }

  /**
   * Clear badge
   */
  async clearBadge() {
    try {
      await chrome.action.setBadgeText({ text: '' });
    } catch (error) {
      console.error('Error clearing badge:', error);
    }
  }
}

// Create singleton instance
const timeTracker = new TimeTracker();

export default timeTracker;
