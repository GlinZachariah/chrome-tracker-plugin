// Content script for blocking functionality
(async function() {
  'use strict';

  // Extract current domain
  function getCurrentDomain() {
    try {
      const hostname = window.location.hostname.replace(/^www\./, '');
      return hostname;
    } catch (error) {
      return null;
    }
  }

  // Format time function (simplified version)
  function formatTime(milliseconds) {
    if (!milliseconds || milliseconds < 0) return '0m';

    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return `${seconds}s`;
    }
  }

  // Check if current domain is blocked
  async function checkBlockStatus() {
    const domain = getCurrentDomain();
    if (!domain) return { blocked: false };

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'checkBlockStatus',
        data: { domain }
      });

      return response;
    } catch (error) {
      console.error('Error checking block status:', error);
      return { blocked: false };
    }
  }

  // Get domain info
  async function getDomainInfo() {
    const domain = getCurrentDomain();
    if (!domain) return null;

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getDomainInfo',
        data: { domain }
      });

      return response;
    } catch (error) {
      console.error('Error getting domain info:', error);
      return null;
    }
  }

  // Create blocker overlay
  function createBlockerOverlay(domainInfo) {
    const overlay = document.createElement('div');
    overlay.id = 'time-tracker-blocker';
    overlay.className = 'time-tracker-blocker-overlay';

    const domain = getCurrentDomain();
    const dailyTime = domainInfo.domain?.dailyTime || 0;
    const dailyLimit = domainInfo.domain?.dailyLimit || 0;
    const weeklyTime = domainInfo.domain?.weeklyTime || 0;
    const weeklyLimit = domainInfo.domain?.weeklyLimit || 0;
    const remainingDailyExtensions = domainInfo.remainingDailyExtensions || 0;
    const remainingWeeklyExtensions = domainInfo.remainingWeeklyExtensions || 0;

    // Determine which limit was exceeded
    let limitType = 'weekly';
    let limitMessage = `You've reached your weekly time limit for <strong>${domain}</strong>`;

    if (dailyLimit && dailyTime >= dailyLimit) {
      limitType = 'daily';
      limitMessage = `You've reached your daily time limit for <strong>${domain}</strong>`;
    }

    overlay.innerHTML = `
      <div class="time-tracker-blocker-content">
        <div class="time-tracker-blocker-icon">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="40" cy="40" r="38" stroke="#e74c3c" stroke-width="4"/>
            <line x1="15" y1="40" x2="65" y2="40" stroke="#e74c3c" stroke-width="4"/>
          </svg>
        </div>

        <h1 class="time-tracker-blocker-title">${limitType === 'daily' ? 'Daily' : 'Weekly'} Limit Reached</h1>

        <p class="time-tracker-blocker-message">
          ${limitMessage}
        </p>

        <div class="time-tracker-blocker-stats">
          ${dailyLimit ? `
          <div class="stat-item">
            <div class="stat-label">Today</div>
            <div class="stat-value">${formatTime(dailyTime)} / ${formatTime(dailyLimit)}</div>
          </div>
          ` : ''}
          ${weeklyLimit ? `
          <div class="stat-item">
            <div class="stat-label">This Week</div>
            <div class="stat-value">${formatTime(weeklyTime)} / ${formatTime(weeklyLimit)}</div>
          </div>
          ` : ''}
          <div class="stat-item">
            <div class="stat-label">Extensions Left</div>
            <div class="stat-value">${remainingDailyExtensions} today / ${remainingWeeklyExtensions} week</div>
          </div>
        </div>

        <div class="time-tracker-blocker-extension">
          <h2>Request Extension</h2>
          <p>You have <strong>${remainingDailyExtensions}</strong> extension${remainingDailyExtensions !== 1 ? 's' : ''} left today and <strong>${remainingWeeklyExtensions}</strong> left this week.</p>

          <form id="extension-request-form" ${(remainingDailyExtensions === 0 || remainingWeeklyExtensions === 0) ? 'style="display:none;"' : ''}>
            <div class="form-group">
              <label for="extension-duration">Duration:</label>
              <select id="extension-duration" required>
                <option value="${15 * 60 * 1000}">15 minutes</option>
                <option value="${30 * 60 * 1000}" selected>30 minutes</option>
                <option value="${60 * 60 * 1000}">1 hour</option>
                <option value="${2 * 60 * 60 * 1000}">2 hours</option>
              </select>
            </div>

            <div class="form-group">
              <label for="extension-reason">Reason (optional):</label>
              <textarea id="extension-reason" rows="3" placeholder="Why do you need more time?"></textarea>
            </div>

            <button type="submit" class="btn-primary">Request Extension</button>
          </form>

          <div id="extension-message" class="extension-message" style="display:none;"></div>

          ${(remainingDailyExtensions === 0 || remainingWeeklyExtensions === 0) ? `<p class="no-extensions-message">${remainingDailyExtensions === 0 && remainingWeeklyExtensions === 0 ? 'You\'ve used all your extensions for today and this week.' : remainingDailyExtensions === 0 ? 'You\'ve used all your daily extensions. Try again tomorrow!' : 'You\'ve used all your weekly extensions. Try again next week!'}</p>` : ''}
        </div>

        <div class="time-tracker-blocker-footer">
          <p>Time limits reset every week on Monday</p>
          <button id="open-options-btn" class="btn-secondary">Open Settings</button>
        </div>
      </div>
    `;

    return overlay;
  }

  // Show blocker overlay
  function showBlocker(domainInfo) {
    // Remove existing overlay if present
    hideBlocker();

    const overlay = createBlockerOverlay(domainInfo);
    document.documentElement.appendChild(overlay);

    // Set up event listeners
    setupEventListeners();

    // Prevent scrolling on body
    document.documentElement.style.overflow = 'hidden';
  }

  // Hide blocker overlay
  function hideBlocker() {
    const existing = document.getElementById('time-tracker-blocker');
    if (existing) {
      existing.remove();
      document.documentElement.style.overflow = '';
    }
  }

  // Set up event listeners for the blocker
  function setupEventListeners() {
    const form = document.getElementById('extension-request-form');
    const openOptionsBtn = document.getElementById('open-options-btn');

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const duration = parseInt(document.getElementById('extension-duration').value);
        const reason = document.getElementById('extension-reason').value;

        await requestExtension(duration, reason);
      });
    }

    if (openOptionsBtn) {
      openOptionsBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'openOptions' });
      });
    }
  }

  // Request extension
  async function requestExtension(duration, reason) {
    const domain = getCurrentDomain();
    const messageDiv = document.getElementById('extension-message');
    const form = document.getElementById('extension-request-form');

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'requestExtension',
        data: { domain, duration, reason }
      });

      if (response.success) {
        // Show success message
        messageDiv.textContent = `Extension granted! You have ${Math.round(duration / 60000)} more minutes. Reloading...`;
        messageDiv.className = 'extension-message success';
        messageDiv.style.display = 'block';

        // Hide form
        if (form) form.style.display = 'none';

        // Wait a moment then reload
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        // Show error message
        let errorMessage = 'Failed to grant extension. ';

        if (response.error === 'weekly_limit_reached') {
          errorMessage = 'You\'ve used all your extensions for this week.';
        } else if (response.error === 'active_extension_exists') {
          errorMessage = 'You already have an active extension.';
        } else {
          errorMessage += response.message || response.error;
        }

        messageDiv.textContent = errorMessage;
        messageDiv.className = 'extension-message error';
        messageDiv.style.display = 'block';
      }
    } catch (error) {
      console.error('Error requesting extension:', error);
      messageDiv.textContent = 'An error occurred. Please try again.';
      messageDiv.className = 'extension-message error';
      messageDiv.style.display = 'block';
    }
  }

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'showBlocker') {
      getDomainInfo().then(domainInfo => {
        if (domainInfo && domainInfo.success) {
          showBlocker(domainInfo);
        }
      });
    } else if (message.action === 'hideBlocker') {
      hideBlocker();
    }
  });

  // Check block status on page load
  checkBlockStatus().then(async result => {
    if (result.success && result.blocked) {
      const domainInfo = await getDomainInfo();
      if (domainInfo && domainInfo.success) {
        showBlocker(domainInfo);
      }
    }
  });
})();
