/**
 * Format a timestamp into a human-readable string
 * @param timestamp Unix timestamp in seconds
 * @returns Formatted date string
 */
export function formatTimestamp(
  timestamp: number | string | bigint | undefined | null
): string {
  if (timestamp === undefined || timestamp === null) return "";
  // Convert BigInt and string to number safely
  let ts: number;
  if (typeof timestamp === "bigint") {
    ts = Number(timestamp);
  } else if (typeof timestamp === "string") {
    ts = Number(timestamp);
  } else {
    ts = timestamp;
  }
  if (isNaN(ts)) return "";
  const date = new Date(ts * 1000);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  // If less than a minute ago
  if (diffSec < 60) {
    return "Just now";
  }

  // If less than an hour ago
  if (diffMin < 60) {
    return `${diffMin} minute${diffMin !== 1 ? "s" : ""} ago`;
  }

  // If less than a day ago
  if (diffHour < 24) {
    return `${diffHour} hour${diffHour !== 1 ? "s" : ""} ago`;
  }

  // If less than a week ago
  if (diffDay < 7) {
    return `${diffDay} day${diffDay !== 1 ? "s" : ""} ago`;
  }

  // Otherwise, return the full date
  return date.toLocaleString();
}

/**
 * Format a date object to a string in the format YYYY-MM-DD
 * @param date Date object
 * @returns Formatted date string
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Format a date object to a string in the format YYYY-MM-DD HH:MM:SS
 * @param date Date object
 * @returns Formatted date and time string
 */
export function formatDateTime(date: Date): string {
  const dateStr = formatDate(date);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${dateStr} ${hours}:${minutes}:${seconds}`;
}

/**
 * Get a relative time string (e.g., "2 hours ago", "yesterday")
 * @param date Date object or timestamp
 * @returns Relative time string
 */
export function getRelativeTimeString(date: Date | number): string {
  const now = new Date();
  const targetDate = date instanceof Date ? date : new Date(date);
  const diffMs = now.getTime() - targetDate.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffSec < 60) {
    return "just now";
  } else if (diffMin < 60) {
    return `${diffMin} minute${diffMin !== 1 ? "s" : ""} ago`;
  } else if (diffHour < 24) {
    return `${diffHour} hour${diffHour !== 1 ? "s" : ""} ago`;
  } else if (diffDay < 7) {
    return `${diffDay} day${diffDay !== 1 ? "s" : ""} ago`;
  } else if (diffDay < 30) {
    const weeks = Math.floor(diffDay / 7);
    return `${weeks} week${weeks !== 1 ? "s" : ""} ago`;
  } else if (diffMonth < 12) {
    return `${diffMonth} month${diffMonth !== 1 ? "s" : ""} ago`;
  } else {
    return `${diffYear} year${diffYear !== 1 ? "s" : ""} ago`;
  }
}
