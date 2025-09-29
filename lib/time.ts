import { formatInTimeZone } from 'date-fns-tz';

export function formatBangkok(date: string | Date | null, format = 'dd MMM yyyy HH:mm:ss') {
  if (!date) return '-';
  const value = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(value.getTime())) return '-';
  return formatInTimeZone(value, 'Asia/Bangkok', format);
}
