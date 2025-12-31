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
let currentPage = 1;
let itemsPerPage = 20;
let searchQuery = '';

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

  // Domain filter dropdown
  const domainFilter = document.getElementById('domain-filter');
  domainFilter.addEventListener('change', () => {
    currentPage = 1;
    renderDomains();
  });

  // Domain search
  const domainSearch = document.getElementById('domain-search');
  domainSearch.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase();
    currentPage = 1;
    renderDomains();
  });

  // Pagination controls
  document.getElementById('prev-page').addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderDomains();
    }
  });

  document.getElementById('next-page').addEventListener('click', () => {
    const totalPages = getTotalPages();
    if (currentPage < totalPages) {
      currentPage++;
      renderDomains();
    }
  });

  document.getElementById('per-page').addEventListener('change', (e) => {
    itemsPerPage = parseInt(e.target.value);
    currentPage = 1;
    renderDomains();
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

  // Parse limits (empty or 0 values become null for no limit)
  const dailyLimitHours = dailyLimitInput && parseFloat(dailyLimitInput) > 0 ? parseFloat(dailyLimitInput) : null;
  const weeklyLimitHours = weeklyLimitInput && parseFloat(weeklyLimitInput) > 0 ? parseFloat(weeklyLimitInput) : null;

  // Validate: if both are set, weekly must be >= daily
  if (dailyLimitHours !== null && weeklyLimitHours !== null && weeklyLimitHours < dailyLimitHours) {
    showMessage('Weekly limit must be greater than or equal to daily limit', 'error');
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

  // Parse limits (empty or 0 values become null for no limit)
  const dailyLimitHours = dailyLimitInput && parseFloat(dailyLimitInput) > 0 ? parseFloat(dailyLimitInput) : null;
  const weeklyLimitHours = weeklyLimitInput && parseFloat(weeklyLimitInput) > 0 ? parseFloat(weeklyLimitInput) : null;

  // Validate: if both are set, weekly must be >= daily
  if (dailyLimitHours !== null && weeklyLimitHours !== null && weeklyLimitHours < dailyLimitHours) {
    showMessage('Weekly limit must be greater than or equal to daily limit', 'error');
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
      // Check if domain is tracked and remove it
      if (currentDomains[domainName]) {
        await chrome.runtime.sendMessage({
          action: MESSAGE_TYPES.DELETE_DOMAIN,
          data: { domain: domainName }
        });
        // Reload domains to reflect the deletion
        await loadDomains();
      }

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

function getTotalPages() {
  const domainsArray = Object.entries(currentDomains);
  const filter = document.getElementById('domain-filter').value;

  let filteredDomains = domainsArray;

  // Apply limit filter
  if (filter === 'limited') {
    filteredDomains = filteredDomains.filter(([, data]) => data.dailyLimit || data.weeklyLimit);
  } else if (filter === 'unlimited') {
    filteredDomains = filteredDomains.filter(([, data]) => !data.dailyLimit && !data.weeklyLimit);
  }

  // Apply search filter
  if (searchQuery) {
    filteredDomains = filteredDomains.filter(([domain]) =>
      domain.toLowerCase().includes(searchQuery)
    );
  }

  return Math.ceil(filteredDomains.length / itemsPerPage) || 1;
}

function renderDomains() {
  const domainsArray = Object.entries(currentDomains);

  if (domainsArray.length === 0) {
    domainsList.innerHTML = '<p class="empty-state">No domains tracked yet. Add one above!</p>';
    document.getElementById('pagination-controls').style.display = 'none';
    return;
  }

  // Filter domains based on selected filter
  const filter = document.getElementById('domain-filter').value;
  let filteredDomains = domainsArray;

  if (filter === 'limited') {
    filteredDomains = domainsArray.filter(([, data]) => data.dailyLimit || data.weeklyLimit);
  } else if (filter === 'unlimited') {
    filteredDomains = domainsArray.filter(([, data]) => !data.dailyLimit && !data.weeklyLimit);
  }

  // Apply search filter
  if (searchQuery) {
    filteredDomains = filteredDomains.filter(([domain]) =>
      domain.toLowerCase().includes(searchQuery)
    );
  }

  // Sort by weekly time (descending)
  filteredDomains.sort((a, b) => b[1].weeklyTime - a[1].weeklyTime);

  if (filteredDomains.length === 0) {
    const emptyMessage = searchQuery
      ? `No domains found matching "${searchQuery}"`
      : filter === 'limited'
      ? 'No domains with limits yet. Add one above!'
      : filter === 'unlimited'
      ? 'No unlimited domains yet. All tracked domains have limits!'
      : 'No domains tracked yet. Add one above!';
    domainsList.innerHTML = `<p class="empty-state">${emptyMessage}</p>`;
    document.getElementById('pagination-controls').style.display = 'none';
    return;
  }

  // Pagination
  const totalDomains = filteredDomains.length;
  const totalPages = Math.ceil(totalDomains / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalDomains);
  const paginatedDomains = filteredDomains.slice(startIndex, endIndex);

  // Build table
  let html = `
    <table class="domains-table">
      <thead>
        <tr>
          <th>Domain</th>
          <th>Daily Usage</th>
          <th>Daily Limit</th>
          <th>Daily %</th>
          <th>Weekly Usage</th>
          <th>Weekly Limit</th>
          <th>Weekly %</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
  `;

  html += paginatedDomains.map(([domain, data]) => {
    const dailyPercentage = data.dailyLimit ? calculatePercentage(data.dailyTime, data.dailyLimit) : 0;
    const weeklyPercentage = data.weeklyLimit ? calculatePercentage(data.weeklyTime, data.weeklyLimit) : 0;
    const isBlocked = data.isBlocked;

    const statusBadge = isBlocked
      ? '<span class="blocked-badge">BLOCKED</span>'
      : (!data.dailyLimit && !data.weeklyLimit)
      ? '<span class="unlimited-badge">UNLIMITED</span>'
      : '<span class="active-badge">ACTIVE</span>';

    return `
      <tr class="${isBlocked ? 'blocked-row' : ''}">
        <td class="domain-name">${domain}</td>
        <td>${formatTime(data.dailyTime)}</td>
        <td>${data.dailyLimit ? formatTime(data.dailyLimit) : '-'}</td>
        <td class="${dailyPercentage >= 90 ? 'warning-text' : ''}">${data.dailyLimit ? dailyPercentage.toFixed(1) + '%' : '-'}</td>
        <td>${formatTime(data.weeklyTime)}</td>
        <td>${data.weeklyLimit ? formatTime(data.weeklyLimit) : '-'}</td>
        <td class="${weeklyPercentage >= 90 ? 'warning-text' : ''}">${data.weeklyLimit ? weeklyPercentage.toFixed(1) + '%' : '-'}</td>
        <td>${statusBadge}</td>
        <td class="actions-cell">
          <button class="btn-small btn-secondary edit-domain-btn"
            data-domain="${domain}"
            data-daily-limit="${data.dailyLimit ? (data.dailyLimit / (60 * 60 * 1000)).toFixed(2) : ''}"
            data-weekly-limit="${data.weeklyLimit ? (data.weeklyLimit / (60 * 60 * 1000)).toFixed(2) : ''}">Edit</button>
          <button class="btn-small btn-danger delete-domain-btn" data-domain="${domain}">Delete</button>
        </td>
      </tr>
    `;
  }).join('');

  html += `
      </tbody>
    </table>
  `;

  domainsList.innerHTML = html;

  // Update pagination controls
  document.getElementById('pagination-controls').style.display = 'flex';
  document.getElementById('showing-start').textContent = startIndex + 1;
  document.getElementById('showing-end').textContent = endIndex;
  document.getElementById('total-domains').textContent = totalDomains;

  // Enable/disable pagination buttons
  document.getElementById('prev-page').disabled = currentPage === 1;
  document.getElementById('next-page').disabled = currentPage === totalPages;

  // Render page numbers
  renderPageNumbers(totalPages);
}

function renderPageNumbers(totalPages) {
  const pageNumbers = document.getElementById('page-numbers');
  let html = '';

  // Show exactly 5 consecutive page numbers
  let startPage = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  let endPage = Math.min(totalPages, startPage + 4);

  // Adjust startPage if we're near the end
  if (endPage - startPage < 4) {
    startPage = Math.max(1, endPage - 4);
  }

  // Render page numbers
  for (let i = startPage; i <= endPage; i++) {
    html += `<button class="page-number ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
  }

  pageNumbers.innerHTML = html;

  // Add click handlers to page numbers
  document.querySelectorAll('.page-number').forEach(button => {
    button.addEventListener('click', () => {
      currentPage = parseInt(button.dataset.page);
      renderDomains();
    });
  });
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
