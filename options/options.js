import { MESSAGE_TYPES } from '../shared/constants.js';
import { formatTime, parseTimeToMs, calculatePercentage, isValidDomain } from '../shared/utils.js';

// ========== UI Elements ==========

// Tabs
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

// Domains tab
const addDomainForm = document.getElementById('add-domain-form');
const domainsList = document.getElementById('domains-list');

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
    loadSettings()
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

// ========== Domain Management ==========

async function handleAddDomain(e) {
  e.preventDefault();

  const domainName = document.getElementById('domain-name').value.trim().toLowerCase();
  const weeklyLimitHours = parseFloat(document.getElementById('weekly-limit').value);

  if (!isValidDomain(domainName)) {
    showMessage('Please enter a valid domain name (e.g., example.com)', 'error');
    return;
  }

  const weeklyLimit = parseTimeToMs(weeklyLimitHours, 'hours');

  try {
    const response = await chrome.runtime.sendMessage({
      action: MESSAGE_TYPES.ADD_DOMAIN,
      data: { domain: domainName, weeklyLimit }
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

function openEditModal(domain, currentLimitMs) {
  document.getElementById('edit-domain-name').value = domain;
  document.getElementById('edit-weekly-limit').value = currentLimitMs ? (currentLimitMs / (60 * 60 * 1000)).toFixed(1) : 0;
  editModal.style.display = 'flex';
}

function closeModal() {
  editModal.style.display = 'none';
}

async function handleEditDomain(e) {
  e.preventDefault();

  const domain = document.getElementById('edit-domain-name').value;
  const weeklyLimitHours = parseFloat(document.getElementById('edit-weekly-limit').value);
  const weeklyLimit = parseTimeToMs(weeklyLimitHours, 'hours');

  try {
    const response = await chrome.runtime.sendMessage({
      action: MESSAGE_TYPES.UPDATE_DOMAIN,
      data: { domain, updates: { weeklyLimit } }
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

// ========== Rendering ==========

function renderDomains() {
  const domainsArray = Object.entries(currentDomains);

  if (domainsArray.length === 0) {
    domainsList.innerHTML = '<p class="empty-state">No domains tracked yet. Add one above!</p>';
    return;
  }

  // Sort by weekly time (descending)
  domainsArray.sort((a, b) => b[1].weeklyTime - a[1].weeklyTime);

  domainsList.innerHTML = domainsArray.map(([domain, data]) => {
    const extensionData = currentExtensions[domain] || { weeklyRequests: [], currentExtension: null };
    const percentage = data.weeklyLimit ? calculatePercentage(data.weeklyTime, data.weeklyLimit) : 0;
    const isBlocked = data.isBlocked;

    return `
      <div class="domain-card ${isBlocked ? 'blocked' : ''}">
        <div class="domain-header">
          <h3>${domain}</h3>
          ${isBlocked ? '<span class="blocked-badge">BLOCKED</span>' : ''}
        </div>

        <div class="domain-info">
          <div class="info-row">
            <span>This week:</span>
            <strong>${formatTime(data.weeklyTime)} / ${data.weeklyLimit ? formatTime(data.weeklyLimit) : 'No limit'}</strong>
          </div>
          ${data.weeklyLimit ? `
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${percentage}%"></div>
            </div>
            <div class="info-row">
              <span>Usage:</span>
              <strong>${percentage}%</strong>
            </div>
          ` : ''}
          <div class="info-row">
            <span>Total time:</span>
            <strong>${formatTime(data.totalTime)}</strong>
          </div>
          <div class="info-row">
            <span>Extensions used:</span>
            <strong>${extensionData.weeklyRequests.length} / ${currentSettings.maxWeeklyExtensions || 3}</strong>
          </div>
        </div>

        <div class="domain-actions">
          <button class="btn-small btn-secondary" onclick="window.editDomain('${domain}', ${data.weeklyLimit})">Edit</button>
          <button class="btn-small btn-danger" onclick="window.deleteDomain('${domain}')">Delete</button>
        </div>
      </div>
    `;
  }).join('');
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

// ========== Settings ==========

function populateSettingsForm() {
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

// ========== Global Functions (for inline onclick) ==========

window.editDomain = openEditModal;
window.deleteDomain = handleDeleteDomain;

// ========== Initialize on Load ==========

initialize();
