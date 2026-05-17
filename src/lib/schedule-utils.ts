export interface ScheduledScan {
  id: string;
  target: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  lastRun?: string;
  nextRun: string;
  enabled: boolean;
}

export function getSchedules(): ScheduledScan[] {
  try {
    const data = localStorage.getItem('vulnradar_schedules');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveSchedule(schedule: ScheduledScan) {
  const schedules = getSchedules();
  const existing = schedules.findIndex(s => s.id === schedule.id);
  if (existing >= 0) schedules[existing] = schedule;
  else schedules.push(schedule);
  localStorage.setItem('vulnradar_schedules', JSON.stringify(schedules));
}

export function deleteSchedule(id: string) {
  const schedules = getSchedules().filter(s => s.id !== id);
  localStorage.setItem('vulnradar_schedules', JSON.stringify(schedules));
}

export function calculateNextRun(frequency: 'daily' | 'weekly' | 'monthly', fromDate: Date = new Date()): string {
  const date = new Date(fromDate);
  if (frequency === 'daily') date.setDate(date.getDate() + 1);
  if (frequency === 'weekly') date.setDate(date.getDate() + 7);
  if (frequency === 'monthly') date.setMonth(date.getMonth() + 1);
  return date.toISOString();
}
