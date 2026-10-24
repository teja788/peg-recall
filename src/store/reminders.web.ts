/** The web build has no daily reminder (iOS only): see reminders.ts. */

export const remindersSupported = false;

export async function turnOnReminders(): Promise<boolean> {
  return false;
}

export async function syncReminders(_on: boolean, _lastDailyAt: number): Promise<void> {}
