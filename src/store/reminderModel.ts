/**
 * The daily reminder (local notifications only): which ones to schedule.
 * Pure, so it is tested; the platform calls are in reminders.ts.
 */

import { dailyNumber } from './statsModel';

export interface PlannedReminder {
  date: Date;
  /** that day's board number (see `dailyNumber`) */
  n: number;
}

/**
 * One reminder on each of the two days after the last daily board, at the
 * time of day it was finished; any already past `now` is dropped. A player who
 * stops playing gets at most two, then nothing. Local calendar, so a DST
 * change keeps the wall-clock time.
 */
export function reminderPlan(lastDailyAt: number, now: number): PlannedReminder[] {
  const p = new Date(lastDailyAt);
  const out: PlannedReminder[] = [];
  for (const i of [1, 2]) {
    const date = new Date(p.getFullYear(), p.getMonth(), p.getDate() + i, p.getHours(), p.getMinutes());
    if (date.getTime() > now) out.push({ date, n: dailyNumber(date.getTime()) });
  }
  return out;
}
