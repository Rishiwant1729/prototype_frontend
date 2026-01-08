/**
 * Format a date as a relative time string (e.g., "2 minutes ago")
 * @param {Date|string|number} date - The date to format
 * @returns {string} - Relative time string
 */
export function formatDistanceToNow(date) {
  if (!date) return "";

  const now = new Date();
  const past = new Date(date);
  const diffMs = now - past;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 10) {
    return "just now";
  } else if (diffSec < 60) {
    return `${diffSec}s ago`;
  } else if (diffMin < 60) {
    return `${diffMin}m ago`;
  } else if (diffHr < 24) {
    return `${diffHr}h ago`;
  } else if (diffDays === 1) {
    return "yesterday";
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return past.toLocaleDateString();
  }
}

/**
 * Format a date as a time string (e.g., "2:30 PM")
 * @param {Date|string|number} date - The date to format
 * @returns {string} - Time string
 */
export function formatTime(date) {
  if (!date) return "";
  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

/**
 * Format a date as a full date/time string
 * @param {Date|string|number} date - The date to format
 * @returns {string} - Date/time string
 */
export function formatDateTime(date) {
  if (!date) return "";
  return new Date(date).toLocaleString();
}

/**
 * Format duration in minutes to a readable string
 * @param {number} minutes - Duration in minutes
 * @returns {string} - Formatted duration
 */
export function formatDuration(minutes) {
  if (!minutes || minutes < 0) return "0m";
  
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  
  if (mins === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${mins}m`;
}
