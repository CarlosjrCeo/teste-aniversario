/**
 * Normalizes text for accent-insensitive and case-insensitive matching
 */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Formats a date string (YYYY-MM-DD) into Portuguese friendly date
 */
export function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));

  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Formats a short date (DD/MM/AAAA)
 */
export function formatShortDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/**
 * Creates Google Calendar URL
 */
export function createGoogleCalendarUrl(
  title: string,
  description: string,
  location: string,
  dateStr: string,
  timeStr: string
): string {
  if (!dateStr) return '#';
  const cleanDate = dateStr.replace(/-/g, '');
  const cleanTime = (timeStr || '19:00').replace(':', '') + '00';
  const startIso = `${cleanDate}T${cleanTime}`;

  // Default duration 5 hours
  const endHour = (parseInt(timeStr.split(':')[0] || '19', 10) + 5) % 24;
  const endHourStr = endHour.toString().padStart(2, '0');
  const endIso = `${cleanDate}T${endHourStr}${cleanTime.substring(2)}`;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${startIso}/${endIso}`,
    details: description,
    location: location,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
