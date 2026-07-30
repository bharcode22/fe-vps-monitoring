/**
 * Helper to get progress bar gradient color based on usage percentage
 */
export function getProgressColor(percent) {
  if (percent >= 85) return 'linear-gradient(90deg, #ef4444, #dc2626)';
  if (percent >= 70) return 'linear-gradient(90deg, #f59e0b, #d97706)';
  return 'linear-gradient(90deg, #00f2fe, #4facfe)';
}

/**
 * Format MB capacity into clean GB or MB string
 */
export function formatMbToGb(mb) {
  if (!mb || isNaN(mb)) return '0 MB';
  if (mb >= 1024) {
    const gb = Math.round((mb / 1024) * 100) / 100;
    return `${gb} GB`;
  }
  return `${mb} MB`;
}

/**
 * Format KB/s bandwidth speed
 */
export function formatSpeed(speedKb) {
  if (!speedKb || isNaN(speedKb)) return '0 KB/s';
  const val = Math.round(speedKb * 10) / 10;
  return `${val} KB/s`;
}
