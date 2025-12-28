import { MESSAGE_TYPES } from '../shared/constants.js';
import { formatTime, parseTimeToMs, calculatePercentage, isValidDomain } from '../shared/utils.js';

// ========== UI Elements ==========

// Tabs
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

// Domains tab
const addDomainForm = document.getElementById('add-domain-form');
const domainsList = document.getElementById('domains-list');
const addExcludedDomainForm = document.getElementById('add-excluded-domain-form');
const excludedDomainsList = document.getElementById('excluded-domains-list');

// Statistics tab
const totalTimeWeek = document.getElementById('total-time-week');
const domainsCount = document.getElementById('domains-count');
const mostVisited = document.getElementById('most-visited');
const domainStats = document.getElementById('domain-stats');

// Settings tab
const settingsForm = document.getElementById('settings-form');
const exportDataBtn = document.getElementById('export-data-btn');
const importDataBtn = document.getElementById('import-data-btn');
const importFileInput = document.getElementById('import-file-input');
const weeklyResetBtn = document.getElementById('weekly-reset-btn');
const resetAllBtn = document.getElementById('reset-all-btn');

// Modal
const editModal = document.getElementById('edit-modal');
const editDomainForm = document.getElementById('edit-domain-form');
const cancelEditBtn = document.getElementById('cancel-edit-btn');

// Message display
const messageDisplay = document.getElementById('message-display');

// ========== State ==========
let currentDomains = {};
let currentExtensions = {};
let currentSettings = {};
let excludedDomains = [];

// ========== Initialization ==========

async function initialize() {
  setupEventListeners();
  await loadAllData();
}

// ========== Event Listeners ==========

function setupEventListeners() {
  // Tab switching
  tabButtons.forEach(button => {
    button.addEventListener('click', () => switchTab(button.dataset.tab));
  });

  // Add domain form
  addDomainForm.addEventListener('submit', handleAddDomain);

  // Add excluded domain form
  addExcludedDomainForm.addEventListener('submit', handleAddExcludedDomain);

  // Settings form
  settingsForm.addEventListener('submit', handleSaveSettings);

  // Data management buttons
  exportDataBtn.addEventListener('click', handleExportData);
  importDataBtn.addEventListener('click', () => importFileInput.click());
  importFileInput.addEventListener('change', handleImportData);
  weeklyResetBtn.addEventListener('click', handleWeeklyReset);
  resetAllBtn.addEventListener('click', handleResetAll);

  // Edit modal
  editDomainForm.addEventListener('submit', handleEditDomain);
  cancelEditBtn.addEventListener('click', () => closeModal());

  // Listen for storage changes (real-time updates)
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
      loadAllData();
    }
  });

  // Event delegation for dynamically created buttons
  domainsList.addEventListener('click', (e) => {
    // Handle Edit button clicks
    if (e.target.classList.contains('edit-domain-btn')) {
      const domain = e.target.dataset.domain;
      const dailyLimit = e.target.dataset.dailyLimit ? parseFloat(e.target.dataset.dailyLimit) * 60 * 60 * 1000 : null;
      const weeklyLimit = e.target.dataset.weeklyLimit ? parseFloat(e.target.dataset.weeklyLimit) * 60 * 60 * 1000 : null;
      openEditModal(domain, dailyLimit, weeklyLimit);
    }

    // Handle Delete button clicks
    if (e.target.classList.contains('delete-domain-btn')) {
      const domain = e.target.dataset.domain;
      handleDeleteDomain(domain);
    }
  });

  // Event delegation for excluded domains
  excludedDomainsList.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-excluded-btn')) {
      const domain = e.target.dataset.domain;
      handleRemoveExcludedDomain(domain);
    }
  });
}

// ========== Tab Switching ==========

function switchTab(tabName) {
  // Update tab buttons
  tabButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  // Update tab contents
  tabContents.forEach(content => {
    content.classList.toggle('active', content.id === `${tabName}-tab`);
  });

  // Refresh data for the active tab
  if (tabName === 'statistics') {
    renderStatistics();
  }
}

// ========== Data Loading ==========

async function loadAllData() {
  await Promise.all([
    loadDomains(),
    loadSettings(),
    loadExcludedDomains()
  ]);
}

async function loadDomains() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: MESSAGE_TYPES.GET_ALL_DOMAINS
    });

    if (response.success) {
      currentDomains = response.domains;
      currentExtensions = response.extensions;
      renderDomains();
      renderStatistics();
    }
  } catch (error) {
    console.error('Error loading domains:', error);
    showMessage('Failed to load domains', 'error');
  }
}

async function loadSettings() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: MESSAGE_TYPES.GET_SETTINGS
    });

    if (response.success) {
      currentSettings = response.settings;
      populateSettingsForm();
    }
  } catch (error) {
    console.error('Error loading settings:', error);
    showMessage('Failed to load settings', 'error');
  }
}

async function loadExcludedDomains() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: MESSAGE_TYPES.GET_EXCLUDED_DOMAINS
    });

    if (response.success) {
      excludedDomains = response.excludedDomains;
      renderExcludedDomains();
    }
  } catch (error) {
    console.error('Error loading excluded domains:', error);
    showMessage('Failed to load excluded domains', 'error');
  }
}

// ========== Domain Management ==========

async function handleAddDomain(e) {
  e.preventDefault();

  const domainName = document.getElementById('domain-name').value.trim().toLowerCase();
  const dailyLimitInput = document.getElementById('daily-limit').value;
  const weeklyLimitInput = document.getElementById('weekly-limit').value;

  if (!isValidDomain(domainName)) {
    showMessage('Please enter a valid domain name (e.g., example.com)', 'error');
    return;
  }

  // Parse limits (empty values become null for no limit)
  const dailyLimitHours = dailyLimitInput ? parseFloat(dailyLimitInput) : null;
  const weeklyLimitHours = weeklyLimitInput ? parseFloat(weeklyLimitInput) : null;

  // Validate: if both are set, weekly must be >= daily
  if (dailyLimitHours !== null && weeklyLimitHours !== null && weeklyLimitHours < dailyLimitHours) {
    showMessage('Weekly limit must be greater than or equal to daily limit', 'error');
    return;
  }

  // Require at least one limit to be set
  if (dailyLimitHours === null && weeklyLimitHours === null) {
    showMessage('Please set at least one limit (daily or weekly)', 'error');
    return;
  }

  const dailyLimit = dailyLimitHours !== null ? parseTimeToMs(dailyLimitHours, 'hours') : null;
  const weeklyLimit = weeklyLimitHours !== null ? parseTimeToMs(weeklyLimitHours, 'hours') : null;

  try {
    const response = await chrome.runtime.sendMessage({
      action: MESSAGE_TYPES.ADD_DOMAIN,
      data: { domain: domainName, dailyLimit, weeklyLimit }
    });

    if (response.success) {
      showMessage(`Added ${domainName} successfully!`, 'success');
      addDomainForm.reset();
      await loadDomains();
    } else {
      showMessage(response.error || 'Failed to add domain', 'error');
    }
  } catch (error) {
    console.error('Error adding domain:', error);
    showMessage('Failed to add domain', 'error');
  }
}

async function handleDeleteDomain(domain) {
  if (!confirm(`Are you sure you want to delete ${domain}? All tracking data for this domain will be lost.`)) {
    return;
  }

  try {
    const response = await chrome.runtime.sendMessage({
      action: MESSAGE_TYPES.DELETE_DOMAIN,
      data: { domain }
    });

    if (response.success) {
      showMessage(`Deleted ${domain}`, 'success');
      await loadDomains();
    } else {
      showMessage('Failed to delete domain', 'error');
    }
  } catch (error) {
    console.error('Error deleting domain:', error);
    showMessage('Failed to delete domain', 'error');
  }
}

function openEditModal(domain, currentDailyLimitMs, currentWeeklyLimitMs) {
  document.getElementById('edit-domain-name').value = domain;
  document.getElementById('edit-daily-limit').value = currentDailyLimitMs ? (currentDailyLimitMs / (60 * 60 * 1000)).toFixed(1) : '';
  document.getElementById('edit-weekly-limit').value = currentWeeklyLimitMs ? (currentWeeklyLimitMs / (60 * 60 * 1000)).toFixed(1) : '';
  editModal.style.display = 'flex';
}

function closeModal() {
  editModal.style.display = 'none';
}

async function handleEditDomain(e) {
  e.preventDefault();

  const domain = document.getElementById('edit-domain-name').value;
  const dailyLimitInput = document.getElementById('edit-daily-limit').value;
  const weeklyLimitInput = document.getElementById('edit-weekly-limit').value;

  // Parse limits (empty values become null for no limit)
  const dailyLimitHours = dailyLimitInput ? parseFloat(dailyLimitInput) : null;
  const weeklyLimitHours = weeklyLimitInput ? parseFloat(weeklyLimitInput) : null;

  // Validate: if both are set, weekly must be >= daily
  if (dailyLimitHours !== null && weeklyLimitHours !== null && weeklyLimitHours < dailyLimitHours) {
    showMessage('Weekly limit must be greater than or equal to daily limit', 'error');
    return;
  }

  // Require at least one limit to be set
  if (dailyLimitHours === null && weeklyLimitHours === null) {
    showMessage('Please set at least one limit (daily or weekly)', 'error');
    return;
  }

  const dailyLimit = dailyLimitHours !== null ? parseTimeToMs(dailyLimitHours, 'hours') : null;
  const weeklyLimit = weeklyLimitHours !== null ? parseTimeToMs(weeklyLimitHours, 'hours') : null;

  try {
    const response = await chrome.runtime.sendMessage({
      action: MESSAGE_TYPES.UPDATE_DOMAIN,
      data: { domain, updates: { dailyLimit, weeklyLimit } }
    });

    if (response.success) {
      showMessage(`Updated ${domain}`, 'success');
      closeModal();
      await loadDomains();
    } else {
      showMessage('Failed to update domain', 'error');
    }
  } catch (error) {
    console.error('Error updating domain:', error);
    showMessage('Failed to update domain', 'error');
  }
}

// ========== Excluded Domains Management ==========

async function handleAddExcludedDomain(e) {
  e.preventDefault();

  const domainName = document.getElementById('excluded-domain-name').value.trim().toLowerCase();

  if (!isValidDomain(domainName)) {
    showMessage('Please enter a valid domain name (e.g., example.com)', 'error');
    return;
  }

  try {
    const response = await chrome.runtime.sendMessage({
      action: MESSAGE_TYPES.ADD_EXCLUDED_DOMAIN,
      data: { domain: domainName }
    });

    if (response.success) {
      showMessage(`Added ${domainName} to exclusion list!`, 'success');
      addExcludedDomainForm.reset();
      excludedDomains = response.excludedDomains;
      renderExcludedDomains();
    } else {
      showMessage(response.error || 'Failed to add excluded domain', 'error');
    }
  } catch (error) {
    console.error('Error adding excluded domain:', error);
    showMessage('Failed to add excluded domain', 'error');
  }
}

async function handleRemoveExcludedDomain(domain) {
  if (!confirm(`Are you sure you want to remove ${domain} from the exclusion list? It will be tracked again.`)) {
    return;
  }

  try {
    const response = await chrome.runtime.sendMessage({
      action: MESSAGE_TYPES.REMOVE_EXCLUDED_DOMAIN,
      data: { domain }
    });

    if (response.success) {
      showMessage(`Removed ${domain} from exclusion list`, 'success');
      excludedDomains = response.excludedDomains;
      renderExcludedDomains();
    } else {
      showMessage('Failed to remove excluded domain', 'error');
    }
  } catch (error) {
    console.error('Error removing excluded domain:', error);
    showMessage('Failed to remove excluded domain', 'error');
  }
}

// ========== Rendering ==========

function renderDomains() {
  const domainsArray = Object.entries(currentDomains);

  if (domainsArray.length === 0) {
    domainsList.innerHTML = '<p class="empty-state">No domains tracked yet. Add one above!</p>';
    return;
  }

  // Separate domains with limits from unlimited domains
  const limitedDomains = domainsArray.filter(([, data]) => data.dailyLimit || data.weeklyLimit);
  const unlimitedDomains = domainsArray.filter(([, data]) => !data.dailyLimit && !data.weeklyLimit);

  // Sort by weekly time (descending)
  limitedDomains.sort((a, b) => b[1].weeklyTime - a[1].weeklyTime);
  unlimitedDomains.sort((a, b) => b[1].weeklyTime - a[1].weeklyTime);

  let html = '';

  // Render limited domains section
  if (limitedDomains.length > 0) {
    html += '<h3 class="section-header">Domains with Limits</h3>';
    html += limitedDomains.map(([domain, data]) => {
      const extensionData = currentExtensions[domain] || { weeklyRequests: [], dailyRequests: [], currentExtension: null };
      const dailyPercentage = data.dailyLimit ? calculatePercentage(data.dailyTime, data.dailyLimit) : 0;
      const weeklyPercentage = data.weeklyLimit ? calculatePercentage(data.weeklyTime, data.weeklyLimit) : 0;
      const isBlocked = data.isBlocked;

      return `
        <div class="domain-card ${isBlocked ? 'blocked' : ''}">
          <div class="domain-header">
            <h3>${domain}</h3>
            ${isBlocked ? '<span class="blocked-badge">BLOCKED</span>' : ''}
          </div>

          <div class="domain-info">
            ${data.dailyLimit ? `
              <div class="info-row">
                <span>Today:</span>
                <strong>${formatTime(data.dailyTime)} / ${formatTime(data.dailyLimit)}</strong>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${dailyPercentage}%"></div>
              </div>
              <div class="info-row">
                <span>Daily usage:</span>
                <strong>${dailyPercentage}%</strong>
              </div>
            ` : ''}

            ${data.weeklyLimit ? `
              <div class="info-row">
                <span>This week:</span>
                <strong>${formatTime(data.weeklyTime)} / ${formatTime(data.weeklyLimit)}</strong>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${weeklyPercentage}%"></div>
              </div>
              <div class="info-row">
                <span>Weekly usage:</span>
                <strong>${weeklyPercentage}%</strong>
              </div>
            ` : ''}

            <div class="info-row">
              <span>Total time:</span>
              <strong>${formatTime(data.totalTime)}</strong>
            </div>
            <div class="info-row">
              <span>Extensions used:</span>
              <strong>${extensionData.dailyRequests.length} / ${currentSettings.maxDailyExtensions || 3} daily, ${extensionData.weeklyRequests.length} / ${currentSettings.maxWeeklyExtensions || 3} weekly</strong>
            </div>
          </div>

          <div class="domain-actions">
            <button class="btn-small btn-secondary edit-domain-btn"
              data-domain="${domain}"
              data-daily-limit="${data.dailyLimit ? (data.dailyLimit / (60 * 60 * 1000)).toFixed(1) : ''}"
              data-weekly-limit="${data.weeklyLimit ? (data.weeklyLimit / (60 * 60 * 1000)).toFixed(1) : ''}">Edit</button>
            <button class="btn-small btn-danger delete-domain-btn" data-domain="${domain}">Delete</button>
          </div>
        </div>
      `;
    }).join('');
  }

  // Render unlimited domains section
  if (unlimitedDomains.length > 0) {
    html += '<h3 class="section-header">Domains without Limits</h3>';
    html += unlimitedDomains.map(([domain, data]) => {
      return `
        <div class="domain-card unlimited">
          <div class="domain-header">
            <h3>${domain}</h3>
            <span class="unlimited-badge">UNLIMITED</span>
          </div>

          <div class="domain-info">
            <div class="info-row">
              <span>Today:</span>
              <strong>${formatTime(data.dailyTime)}</strong>
            </div>
            <div class="info-row">
              <span>This week:</span>
              <strong>${formatTime(data.weeklyTime)}</strong>
            </div>
            <div class="info-row">
              <span>Total time:</span>
              <strong>${formatTime(data.totalTime)}</strong>
            </div>
          </div>

          <div class="domain-actions">
            <button class="btn-small btn-secondary edit-domain-btn"
              data-domain="${domain}"
              data-daily-limit=""
              data-weekly-limit="">Edit</button>
            <button class="btn-small btn-danger delete-domain-btn" data-domain="${domain}">Delete</button>
          </div>
        </div>
      `;
    }).join('');
  }

  domainsList.innerHTML = html;
}

function renderStatistics() {
  const domainsArray = Object.entries(currentDomains);

  if (domainsArray.length === 0) {
    domainStats.innerHTML = '<p class="empty-state">No data available yet.</p>';
    totalTimeWeek.textContent = '0h 0m';
    domainsCount.textContent = '0';
    mostVisited.textContent = 'None';
    return;
  }

  // Calculate total weekly time
  const totalWeeklyTime = domainsArray.reduce((sum, [, data]) => sum + data.weeklyTime, 0);
  totalTimeWeek.textContent = formatTime(totalWeeklyTime);

  // Domains count
  domainsCount.textContent = domainsArray.length;

  // Most visited
  const sortedByTime = [...domainsArray].sort((a, b) => b[1].weeklyTime - a[1].weeklyTime);
  if (sortedByTime.length > 0 && sortedByTime[0][1].weeklyTime > 0) {
    mostVisited.textContent = sortedByTime[0][0];
  } else {
    mostVisited.textContent = 'None';
  }

  // Render domain stats list
  domainStats.innerHTML = sortedByTime
    .filter(([, data]) => data.weeklyTime > 0)
    .map(([domain, data]) => {
      const percentage = totalWeeklyTime > 0 ? calculatePercentage(data.weeklyTime, totalWeeklyTime) : 0;

      return `
        <div class="stat-row">
          <div class="stat-row-header">
            <span class="stat-domain">${domain}</span>
            <span class="stat-time">${formatTime(data.weeklyTime)}</span>
          </div>
          <div class="stat-bar">
            <div class="stat-bar-fill" style="width: ${percentage}%"></div>
          </div>
          <div class="stat-percentage">${percentage}% of total time</div>
        </div>
      `;
    })
    .join('');
}

function renderExcludedDomains() {
  if (excludedDomains.length === 0) {
    excludedDomainsList.innerHTML = '<p class="empty-state">No excluded domains yet.</p>';
    return;
  }

  excludedDomainsList.innerHTML = excludedDomains
    .sort()
    .map(domain => `
      <div class="excluded-domain-item">
        <span class="excluded-domain-name">${domain}</span>
        <button class="btn-small btn-danger remove-excluded-btn" data-domain="${domain}">Remove</button>
      </div>
    `)
    .join('');
}

// ========== Settings ==========

function populateSettingsForm() {
  document.getElementById('max-daily-extensions').value = currentSettings.maxDailyExtensions || 3;
  document.getElementById('max-extensions').value = currentSettings.maxWeeklyExtensions || 3;
  document.getElementById('default-extension-duration').value = (currentSettings.defaultExtensionDuration / 60000) || 30;
  document.getElementById('week-start-day').value = currentSettings.weekStartDay || 1;
  document.getElementById('idle-threshold').value = (currentSettings.idleThreshold / 1000) || 60;
  document.getElementById('tracking-enabled').checked = currentSettings.trackingEnabled !== false;
  document.getElementById('notifications-enabled').checked = currentSettings.notificationsEnabled !== false;
}

async function handleSaveSettings(e) {
  e.preventDefault();

  const settings = {
    maxDailyExtensions: parseInt(document.getElementById('max-daily-extensions').value),
    maxWeeklyExtensions: parseInt(document.getElementById('max-extensions').value),
    defaultExtensionDuration: parseInt(document.getElementById('default-extension-duration').value) * 60000,
    weekStartDay: parseInt(document.getElementById('week-start-day').value),
    idleThreshold: parseInt(document.getElementById('idle-threshold').value) * 1000,
    trackingEnabled: document.getElementById('tracking-enabled').checked,
    notificationsEnabled: document.getElementById('notifications-enabled').checked
  };

  try {
    const response = await chrome.runtime.sendMessage({
      action: MESSAGE_TYPES.UPDATE_SETTINGS,
      data: { settings }
    });

    if (response.success) {
      showMessage('Settings saved successfully!', 'success');
      currentSettings = response.settings;
    } else {
      showMessage('Failed to save settings', 'error');
    }
  } catch (error) {
    console.error('Error saving settings:', error);
    showMessage('Failed to save settings', 'error');
  }
}

// ========== Data Management ==========

async function handleExportData() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: MESSAGE_TYPES.EXPORT_DATA
    });

    if (response.success) {
      const dataStr = JSON.stringify(response.data, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `time-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();

      URL.revokeObjectURL(url);
      showMessage('Data exported successfully!', 'success');
    }
  } catch (error) {
    console.error('Error exporting data:', error);
    showMessage('Failed to export data', 'error');
  }
}

async function handleImportData(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const importData = JSON.parse(event.target.result);

      const response = await chrome.runtime.sendMessage({
        action: MESSAGE_TYPES.IMPORT_DATA,
        data: { importData }
      });

      if (response.success) {
        showMessage('Data imported successfully!', 'success');
        await loadAllData();
      } else {
        showMessage('Failed to import data', 'error');
      }
    } catch (error) {
      console.error('Error importing data:', error);
      showMessage('Invalid import file', 'error');
    }
  };

  reader.readAsText(file);
  importFileInput.value = ''; // Reset input
}

async function handleWeeklyReset() {
  if (!confirm('This will reset all weekly times and extensions. Are you sure?')) {
    return;
  }

  try {
    const response = await chrome.runtime.sendMessage({
      action: MESSAGE_TYPES.MANUAL_WEEKLY_RESET
    });

    if (response.success) {
      showMessage('Weekly reset completed!', 'success');
      await loadAllData();
    }
  } catch (error) {
    console.error('Error resetting week:', error);
    showMessage('Failed to reset week', 'error');
  }
}

async function handleResetAll() {
  if (!confirm('This will delete ALL your tracking data and settings. This cannot be undone. Are you sure?')) {
    return;
  }

  if (!confirm('Really delete everything? This is your last chance!')) {
    return;
  }

  try {
    const response = await chrome.runtime.sendMessage({
      action: MESSAGE_TYPES.RESET_DATA
    });

    if (response.success) {
      showMessage('All data reset successfully!', 'success');
      await loadAllData();
    }
  } catch (error) {
    console.error('Error resetting data:', error);
    showMessage('Failed to reset data', 'error');
  }
}

// ========== Message Display ==========

function showMessage(message, type = 'info') {
  messageDisplay.textContent = message;
  messageDisplay.className = `message-display ${type}`;
  messageDisplay.style.display = 'block';

  setTimeout(() => {
    messageDisplay.style.display = 'none';
  }, 5000);
}

// ========== Initialize on Load ==========

initialize();
