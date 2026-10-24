/**
 * The daily reminder's platform calls (iOS local notifications). Never asks
 * for a push token: nothing leaves the device. The web build gets
 * reminders.web.ts, where the feature does not exist.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { tr } from '../i18n';
import { reminderPlan } from './reminderModel';
import { useSettings } from './settings';

export const remindersSupported = Platform.OS === 'ios';

/** From a tap only: ask iOS, and turn reminders on if it says yes. */
export async function turnOnReminders(): Promise<boolean> {
  let ok = false;
  try {
    ok = (await Notifications.getPermissionsAsync()).granted;
    if (!ok) {
      ok = (
        await Notifications.requestPermissionsAsync({
          ios: { allowAlert: true, allowSound: true, allowBadge: false },
        })
      ).granted;
    }
  } catch {
    /* no answer counts as no */
  }
  const s = useSettings.getState();
  s.set('reminderAsked', true);
  if (ok) s.set('reminder', true);
  return ok;
}

/** Drop this app's scheduled reminders and, if on, schedule the next ones. */
export async function syncReminders(on: boolean, lastDailyAt: number): Promise<void> {
  if (!remindersSupported) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!on) return;
    const now = Date.now();
    for (const r of reminderPlan(lastDailyAt || now, now)) {
      await Notifications.scheduleNotificationAsync({
        content: { body: tr('reminder.body', { n: r.n }) },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.date },
      });
    }
  } catch {
    /* a reminder must never break the game */
  }
}
