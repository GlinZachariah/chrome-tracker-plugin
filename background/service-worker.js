import { MESSAGE_TYPES } from '../shared/constants.js';
import { isValidDomain } from '../shared/utils.js';
import storageManager from './storage-manager.js';
import timeTracker from './time-tracker.js';
import limitEnforcer from './limit-enforcer.js';

console.log('Service Worker loading...');

/**
 * Initialize the extension
 */
async function initialize() {
  try {
    console.log('Initializing extension...');

    // Initialize storage
    await storageManager.initialize();

    // Check for weekly reset on startup
    await storageManager.checkAndResetWeek();

    // Initialize time tracker
    await timeTracker.initialize();

    // Initialize limit enforcer
    await limitEnforcer.initialize();

    console.log('Extension initialized successfully');
  } catch (error) {
    console.error('Failed to initialize extension:', error);
  }
}

/**
 * Handle extension installation
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Extension installed:', details.reason);

  if (details.reason === 'install') {
    // First time installation
    await initialize();

    // Show welcome notification
    chrome.notifications.create('welcome', {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('assets/icons/icon128.png'),
      title: 'Time Tracker Installed',
      message: 'Open the options page to set up your website time limits.',
      priority: 1
    });

    // Open options page
    chrome.runtime.openOptionsPage();
  } else if (details.reason === 'update') {
    // Extension updated
    await initialize();
  }
});

/**
 * Initialize on service worker startup
 */
initialize();

/**
 * Handle messages from content scripts and options page
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message.action);

  // Handle async messages
  handleMessage(message, sender)
    .then(sendResponse)
    .catch(error => {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    });

  return true; // Keep channel open for async response
});

/**
 * Handle different message types
 */
async function handleMessage(message, sender) {
  switch (message.action) {
    // ========== Extension Request ==========
    case MESSAGE_TYPES.REQUEST_EXTENSION:
      return await handleExtensionRequest(message.data);

    // ========== Block Status ==========
    case MESSAGE_TYPES.CHECK_BLOCK_STATUS:
      return await handleCheckBlockStatus(message.data);

    // ========== Domain Info ==========
    case MESSAGE_TYPES.GET_DOMAIN_INFO:
      return await handleGetDomainInfo(message.data);

    // ========== Domain Management ==========
    case MESSAGE_TYPES.GET_ALL_DOMAINS:
      return await handleGetAllDomains();

    case MESSAGE_TYPES.ADD_DOMAIN:
      return await handleAddDomain(message.data);

    case MESSAGE_TYPES.UPDATE_DOMAIN:
      return await handleUpdateDomain(message.data);

    case MESSAGE_TYPES.DELETE_DOMAIN:
      return await handleDeleteDomain(message.data);

    // ========== Settings ==========
    case MESSAGE_TYPES.GET_SETTINGS:
      return await handleGetSettings();

    case MESSAGE_TYPES.UPDATE_SETTINGS:
      return await handleUpdateSettings(message.data);

    // ========== Data Management ==========
    case MESSAGE_TYPES.EXPORT_DATA:
      return await handleExportData();

    case MESSAGE_TYPES.IMPORT_DATA:
      return await handleImportData(message.data);

    case MESSAGE_TYPES.RESET_DATA:
      return await handleResetData();

    case MESSAGE_TYPES.MANUAL_WEEKLY_RESET:
      return await handleManualWeeklyReset();

    default:
      throw new Error(`Unknown action: ${message.action}`);
  }
}

/**
 * Handle extension request
 */
async function handleExtensionRequest(data) {
  const { domain, reason, duration } = data;

  // Validate input
  if (!domain || !duration) {
    return { success: false, error: 'Missing required fields' };
  }

  // Check weekly extension count
  const settings = await storageManager.getSettings();
  const weeklyCount = await storageManager.getWeeklyExtensionCount(domain);

  if (weeklyCount >= settings.maxWeeklyExtensions) {
    return {
      success: false,
      error: 'weekly_limit_reached',
      message: `You've used all ${settings.maxWeeklyExtensions} extensions for this week.`
    };
  }

  // Check if already has active extension
  const activeExtension = await storageManager.getActiveExtension(domain);
  if (activeExtension) {
    return {
      success: false,
      error: 'active_extension_exists',
      message: 'You already have an active extension for this domain.'
    };
  }

  // Create extension
  const extension = await storageManager.addExtensionRequest(domain, {
    duration,
    reason: reason || 'No reason provided'
  });

  // Unblock domain
  await limitEnforcer.unblockDomain(domain);

  // Show notification
  if (settings.notificationsEnabled) {
    chrome.notifications.create(`extension-granted-${domain}`, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('assets/icons/icon128.png'),
      title: 'Extension Granted',
      message: `You have ${Math.round(duration / 60000)} more minutes on ${domain}.`,
      priority: 1
    });
  }

  return {
    success: true,
    extension,
    remainingExtensions: settings.maxWeeklyExtensions - weeklyCount - 1
  };
}

/**
 * Check if domain is blocked
 */
async function handleCheckBlockStatus(data) {
  const { domain } = data;
  const result = await limitEnforcer.checkLimit(domain);

  return {
    success: true,
    ...result
  };
}

/**
 * Get domain info with extensions
 */
async function handleGetDomainInfo(data) {
  const { domain } = data;

  const domainData = await storageManager.getDomain(domain);
  const extensionData = await storageManager.getDomainExtensions(domain);
  const activeExtension = await storageManager.getActiveExtension(domain);
  const settings = await storageManager.getSettings();

  return {
    success: true,
    domain: domainData,
    extensions: extensionData,
    activeExtension,
    remainingExtensions: settings.maxWeeklyExtensions - extensionData.weeklyRequests.length
  };
}

/**
 * Get all domains
 */
async function handleGetAllDomains() {
  const domains = await storageManager.getAllDomains();
  const extensions = await storageManager.getAllExtensions();

  return {
    success: true,
    domains,
    extensions
  };
}

/**
 * Add new domain
 */
async function handleAddDomain(data) {
  const { domain, weeklyLimit } = data;

  if (!isValidDomain(domain)) {
    return { success: false, error: 'Invalid domain name' };
  }

  try {
    const domainData = await storageManager.addDomain(domain, weeklyLimit);
    return { success: true, domain: domainData };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Update domain
 */
async function handleUpdateDomain(data) {
  const { domain, updates } = data;

  const domainData = await storageManager.updateDomain(domain, updates);
  return { success: true, domain: domainData };
}

/**
 * Delete domain
 */
async function handleDeleteDomain(data) {
  const { domain } = data;

  await storageManager.deleteDomain(domain);
  return { success: true };
}

/**
 * Get settings
 */
async function handleGetSettings() {
  const settings = await storageManager.getSettings();
  return { success: true, settings };
}

/**
 * Update settings
 */
async function handleUpdateSettings(data) {
  const { settings } = data;

  const newSettings = await storageManager.updateSettings(settings);

  // Update idle threshold if changed
  if (settings.idleThreshold) {
    chrome.idle.setDetectionInterval(Math.floor(settings.idleThreshold / 1000));
  }

  return { success: true, settings: newSettings };
}

/**
 * Export data
 */
async function handleExportData() {
  const data = await storageManager.exportData();
  return { success: true, data };
}

/**
 * Import data
 */
async function handleImportData(data) {
  const { importData } = data;

  await storageManager.importData(importData);

  // Reinitialize after import
  await initialize();

  return { success: true };
}

/**
 * Reset all data
 */
async function handleResetData() {
  await storageManager.resetAllData();
  await initialize();

  return { success: true };
}

/**
 * Manual weekly reset
 */
async function handleManualWeeklyReset() {
  const settings = await storageManager.getSettings();
  const weekInfo = await storageManager.getCurrentWeekInfo(settings.weekStartDay);

  await storageManager.performWeeklyReset(weekInfo);

  return { success: true };
}

/**
 * Listen for notification clicks
 */
chrome.notifications.onClicked.addListener((notificationId) => {
  // Open options page on notification click
  if (notificationId.startsWith('limit-') || notificationId.startsWith('approaching-')) {
    chrome.runtime.openOptionsPage();
  }
});

console.log('Service Worker loaded');
