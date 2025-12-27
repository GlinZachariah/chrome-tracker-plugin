/**
 * Extract domain from a URL
 * @param {string} url - The URL to extract domain from
 * @returns {string|null} - The domain or null if invalid
 */
export function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    // Remove www. prefix for consistency
    let hostname = urlObj.hostname.replace(/^www\./, '');
    return hostname;
  } catch (e) {
    return null;
  }
}

/**
 * Format milliseconds to human-readable time
 * @param {number} milliseconds - Time in milliseconds
 * @param {boolean} short - Use short format (e.g., "2h 30m" vs "2 hours 30 minutes")
 * @returns {string} - Formatted time string
 */
export function formatTime(milliseconds, short = true) {
  if (!milliseconds || milliseconds < 0) return short ? '0m' : '0 minutes';

  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (short) {
    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return `${seconds}s`;
    }
  } else {
    const parts = [];
    if (days > 0) parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
    if (hours % 24 > 0) parts.push(`${hours % 24} ${hours % 24 === 1 ? 'hour' : 'hours'}`);
    if (minutes % 60 > 0) parts.push(`${minutes % 60} ${minutes % 60 === 1 ? 'minute' : 'minutes'}`);

    return parts.length > 0 ? parts.join(' ') : `${seconds} seconds`;
  }
}

/**
 * Parse time string to milliseconds
 * @param {number} value - Numeric value
 * @param {string} unit - Time unit ('hours', 'minutes', 'seconds')
 * @returns {number} - Time in milliseconds
 */
export function parseTimeToMs(value, unit = 'hours') {
  const numValue = parseFloat(value);
  if (isNaN(numValue) || numValue < 0) return 0;

  switch (unit) {
    case 'hours':
      return numValue * 60 * 60 * 1000;
    case 'minutes':
      return numValue * 60 * 1000;
    case 'seconds':
      return numValue * 1000;
    default:
      return 0;
  }
}

/**
 * Get ISO week number for a date
 * @param {Date} date - The date to get week number for
 * @returns {number} - ISO week number (1-53)
 */
export function getISOWeek(date) {
  const target = new Date(date.valueOf());
  const dayNum = (date.getDay() + 6) % 7; // Make Monday = 0
  target.setDate(target.getDate() - dayNum + 3); // Get Thursday of this week
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const diff = target - firstThursday;
  return 1 + Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
}

/**
 * Get the start date of the week for a given date
 * @param {Date} date - The date to get week start for
 * @param {number} weekStartDay - Day of week that starts the week (0 = Sunday, 1 = Monday, etc.)
 * @returns {Date} - Start of the week (at midnight)
 */
export function getWeekStartDate(date, weekStartDay = 1) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day < weekStartDay ? 7 : 0) + day - weekStartDay;

  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);

  return d;
}

/**
 * Get current week info
 * @param {number} weekStartDay - Day of week that starts the week
 * @returns {Object} - Week info {weekNumber, year, startDate}
 */
export function getCurrentWeekInfo(weekStartDay = 1) {
  const now = new Date();
  return {
    weekNumber: getISOWeek(now),
    year: now.getFullYear(),
    startDate: getWeekStartDate(now, weekStartDay).getTime()
  };
}

/**
 * Check if two week info objects represent different weeks
 * @param {Object} week1 - First week info
 * @param {Object} week2 - Second week info
 * @returns {boolean} - True if different weeks
 */
export function isNewWeek(week1, week2) {
  if (!week1 || !week2) return true;
  return week1.weekNumber !== week2.weekNumber || week1.year !== week2.year;
}

/**
 * Calculate percentage
 * @param {number} value - Current value
 * @param {number} total - Total value
 * @returns {number} - Percentage (0-100)
 */
export function calculatePercentage(value, total) {
  if (!total || total === 0) return 0;
  return Math.min(100, Math.round((value / total) * 100));
}

/**
 * Validate domain name
 * @param {string} domain - Domain to validate
 * @returns {boolean} - True if valid domain
 */
export function isValidDomain(domain) {
  if (!domain || typeof domain !== 'string') return false;

  // Basic domain validation regex
  const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;
  return domainRegex.test(domain);
}

/**
 * Deep clone an object
 * @param {Object} obj - Object to clone
 * @returns {Object} - Cloned object
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Generate a unique ID
 * @returns {string} - Unique ID
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
