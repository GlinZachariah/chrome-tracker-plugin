import storageManager from './storage-manager.js';
import { extractDomain } from '../shared/utils.js';

/**
 * Limit Enforcer - Handles limit checking and blocking
 */
class LimitEnforcer {
  constructor() {
    this.checkInterval = null;
  }

  /**
   * Initialize the limit enforcer
   */
  async initialize() {
    console.log('Initializing LimitEnforcer...');

    // Start periodic limit checking
    this.startPeriodicCheck();

    console.log('LimitEnforcer initialized');
  }

  /**
   * Check if a domain should be blocked
   */
  async checkLimit(domain) {
    try {
      const domainData = await storageManager.getDomain(domain);

      // If domain not tracked or no limits set, not blocked
      if (!domainData || (!domainData.weeklyLimit && !domainData.dailyLimit)) {
        return {
          blocked: false,
          reason: null,
          domainData: domainData
        };
      }

      // Check if has active extension
      const extension = await storageManager.getActiveExtension(domain);
      if (extension && extension.endTime > Date.now()) {
        return {
          blocked: false,
          reason: 'has_active_extension',
          extension: extension,
          domainData: domainData
        };
      }

      // Clear expired extension
      if (extension && extension.endTime <= Date.now()) {
        await storageManager.clearCurrentExtension(domain);
      }

      // Check daily limit first (more restrictive)
      if (domainData.dailyLimit && domainData.dailyTime >= domainData.dailyLimit) {
        return {
          blocked: true,
          reason: 'daily_limit_exceeded',
          limitType: 'daily',
          domainData: domainData
        };
      }

      // Check weekly limit
      if (domainData.weeklyLimit && domainData.weeklyTime >= domainData.weeklyLimit) {
        return {
          blocked: true,
          reason: 'weekly_limit_exceeded',
          limitType: 'weekly',
          domainData: domainData
        };
      }

      // Check if approaching daily limit (90%)
      if (domainData.dailyLimit) {
        const dailyPercentage = (domainData.dailyTime / domainData.dailyLimit) * 100;
        if (dailyPercentage >= 90 && dailyPercentage < 100) {
          return {
            blocked: false,
            reason: 'approaching_daily_limit',
            limitType: 'daily',
            percentage: dailyPercentage,
            domainData: domainData
          };
        }
      }

      // Check if approaching weekly limit (90%)
      if (domainData.weeklyLimit) {
        const weeklyPercentage = (domainData.weeklyTime / domainData.weeklyLimit) * 100;
        if (weeklyPercentage >= 90 && weeklyPercentage < 100) {
          return {
            blocked: false,
            reason: 'approaching_weekly_limit',
            limitType: 'weekly',
            percentage: weeklyPercentage,
            domainData: domainData
          };
        }
      }

      return {
        blocked: false,
        reason: null,
        domainData: domainData
      };
    } catch (error) {
      console.error('Error checking limit:', error);
      return { blocked: false, reason: 'error', error };
    }
  }

  /**
   * Block a domain
   */
  async blockDomain(domain) {
    try {
      console.log('Blocking domain:', domain);

      // Set domain as blocked
      await storageManager.setDomainBlocked(domain, true);

      // Find all tabs with this domain and inject blocker
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (tab.url) {
          const tabDomain = extractDomain(tab.url);
          if (tabDomain === domain) {
            // Send message to content script to show blocker
            try {
              await chrome.tabs.sendMessage(tab.id, {
                action: 'showBlocker',
                domain: domain
              });
            } catch (error) {
              // Tab might not be ready for messages, reload it
              await chrome.tabs.reload(tab.id);
            }
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Error blocking domain:', error);
      return false;
    }
  }

  /**
   * Unblock a domain
   */
  async unblockDomain(domain) {
    try {
      console.log('Unblocking domain:', domain);

      // Set domain as not blocked
      await storageManager.setDomainBlocked(domain, false);

      // Find all tabs with this domain and hide blocker
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (tab.url) {
          const tabDomain = extractDomain(tab.url);
          if (tabDomain === domain) {
            // Send message to content script to hide blocker
            try {
              await chrome.tabs.sendMessage(tab.id, {
                action: 'hideBlocker'
              });
            } catch (error) {
              // Content script might not be loaded, reload tab
              await chrome.tabs.reload(tab.id);
            }
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Error unblocking domain:', error);
      return false;
    }
  }

  /**
   * Check and enforce limit after time update
   */
  async checkAndEnforce(domain) {
    const result = await this.checkLimit(domain);

    if (result.blocked && !result.domainData.isBlocked) {
      // Domain exceeded limit but not yet blocked
      await this.blockDomain(domain);

      // Show notification
      await this.showLimitExceededNotification(domain, result.domainData);
    } else if (!result.blocked && result.domainData.isBlocked) {
      // Domain is within limits but currently blocked - unblock it
      await this.unblockDomain(domain);
    } else if (result.reason === 'approaching_limit') {
      // Show warning notification
      await this.showApproachingLimitNotification(domain, result.domainData, result.percentage);
    }

    return result;
  }

  /**
   * Start periodic limit checking
   */
  startPeriodicCheck() {
    // Check every minute for expired extensions
    this.checkInterval = setInterval(async () => {
      await this.checkAllDomainsForExpiredExtensions();
    }, 60000); // 1 minute
  }

  /**
   * Check all domains for expired extensions
   */
  async checkAllDomainsForExpiredExtensions() {
    try {
      const domains = await storageManager.getAllDomains();
      const extensions = await storageManager.getAllExtensions();

      for (const domain in extensions) {
        const ext = extensions[domain].currentExtension;

        if (ext && ext.endTime <= Date.now()) {
          console.log(`Extension expired for ${domain}`);

          // Clear expired extension
          await storageManager.clearCurrentExtension(domain);

          // Re-check limit and block if needed
          const domainData = domains[domain];
          if (domainData && domainData.weeklyLimit && domainData.weeklyTime >= domainData.weeklyLimit) {
            await this.blockDomain(domain);
          }
        }
      }
    } catch (error) {
      console.error('Error checking expired extensions:', error);
    }
  }

  /**
   * Show notification when limit exceeded
   */
  async showLimitExceededNotification(domain, domainData) {
    const settings = await storageManager.getSettings();
    if (!settings.notificationsEnabled) return;

    try {
      await chrome.notifications.create(`limit-exceeded-${domain}`, {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('assets/icons/icon128.png'),
        title: 'Time Limit Exceeded',
        message: `You've reached your weekly limit for ${domain}. The site is now blocked.`,
        priority: 2
      });
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  /**
   * Show notification when approaching limit
   */
  async showApproachingLimitNotification(domain, domainData, percentage) {
    const settings = await storageManager.getSettings();
    if (!settings.notificationsEnabled) return;

    try {
      // Only show once when reaching 90%
      if (Math.floor(percentage) === 90) {
        await chrome.notifications.create(`approaching-limit-${domain}`, {
          type: 'basic',
          iconUrl: chrome.runtime.getURL('assets/icons/icon128.png'),
          title: 'Time Limit Warning',
          message: `You've used ${Math.floor(percentage)}% of your weekly limit for ${domain}.`,
          priority: 1
        });
      }
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }
}

// Create singleton instance
const limitEnforcer = new LimitEnforcer();

export default limitEnforcer;
