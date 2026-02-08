/**
 * @param {Date} date
 * @returns {string} HH:MM formatted time string
 */
export function formatDate(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}
